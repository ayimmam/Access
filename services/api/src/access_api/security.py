"""First-party demo security routes. Production host identity needs an adapter."""

import os
import secrets
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from access_api.security_store import SecurityError, SecurityStore, Session


COOKIE = "__Host-access_session"
PREFIX = "/api/v1/security"
router = APIRouter(prefix=PREFIX, tags=["Demo security and privacy"])


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(Payload):
    alias: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class Password(Payload):
    password: str = Field(min_length=1, max_length=256)


class Preferences(Payload):
    remember: bool
    language: Literal["en", "am"] = "en"
    caption_size: Literal["standard", "large", "extra-large"] = "standard"


class Revoke(Payload):
    id: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


def configured_store(root: Path) -> SecurityStore | None:
    key_path = Path(os.environ.get("ACCESS_SECURITY_KEY_FILE", str(root / "artifacts/security/demo.key")))
    key = os.environ.get("ACCESS_SECURITY_KEY")
    if key is None:
        if not key_path.exists():
            return None
        key = key_path.read_text().strip()
    return SecurityStore(Path(os.environ.get("ACCESS_SECURITY_DB", str(root / "artifacts/security/demo.sqlite"))), key.encode())


def origin(request: Request) -> str:
    configured = os.environ.get("ACCESS_SECURITY_ORIGIN", "http://127.0.0.1:8000")
    parts = urlsplit(configured)
    if parts.path not in ("", "/") or parts.query or parts.fragment or parts.username or parts.password:
        raise RuntimeError("ACCESS_SECURITY_ORIGIN must be an origin")
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in {"127.0.0.1", "localhost"}):
        raise RuntimeError("Security requires HTTPS or a loopback development origin")
    return configured.rstrip("/")


def store(request: Request) -> SecurityStore:
    value = request.app.state.security_store
    if value is None:
        raise SecurityError(503, "setup_required", "The security demo needs setup. Ask the facilitator to run scripts/setup_security_demo.py.")
    return value


def token(request: Request) -> str:
    value = request.cookies.get(COOKIE, "")
    if len(value) > 100:
        raise SecurityError(401, "sign_in_required", "Please sign in to continue.")
    return value


def same_origin(request: Request):
    if request.headers.get("origin") != origin(request) or request.headers.get("sec-fetch-site") == "cross-site":
        raise SecurityError(403, "origin_rejected", "Open the privacy console on its original site, then try again.")


def signed_in(request: Request, database: SecurityStore = Depends(store)) -> Session:
    session = database.session(token(request))
    request.state.user_role = "learner"
    database.throttle("account", session.account_id, 120)
    return session


def mutation(request: Request, session: Session = Depends(signed_in), database: SecurityStore = Depends(store)) -> Session:
    same_origin(request)
    if not secrets.compare_digest(request.headers.get("x-csrf-token", ""), database.csrf(token(request))):
        raise SecurityError(403, "csrf_rejected", "Refresh your session details, then try again. Your entries remain available.")
    return session


def set_cookie(response: Response, value: str, seconds: int):
    response.set_cookie(COOKIE, value, max_age=seconds, secure=True, httponly=True, samesite="lax", path="/")


def clear_cookie(response: Response):
    response.delete_cookie(COOKIE, secure=True, httponly=True, samesite="lax", path="/")


def session_view(database: SecurityStore, value: str):
    session = database.session(value)
    return {"csrf_token": database.csrf(value), "expires_at": session.expires,
            "account_reference": database.digest("console:" + session.account_id),
            "absolute_expires_at": session.absolute_expires, "server_time": database.clock(),
            "recent_authentication": database.clock() - session.authenticated <= 300}


@router.post("/login")
def login(body: Login, request: Request, response: Response, database: SecurityStore = Depends(store)):
    same_origin(request)
    # Ignore client-supplied forwarded-address headers. Trusted proxy configuration
    # belongs to the deployment, before Request.client is established.
    database.throttle("login-network", request.client.host if request.client else "unknown", 100)
    database.throttle("login-alias", body.alias.strip().casefold(), 5)
    value = database.login(body.alias, body.password)
    set_cookie(response, value, database.absolute_seconds)
    return session_view(database, value)


@router.get("/session")
def current(request: Request, session: Session = Depends(signed_in), database: SecurityStore = Depends(store)):
    return session_view(database, token(request))


@router.post("/extend")
def extend(request: Request, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    database.extend(token(request))
    return session_view(database, token(request))


@router.post("/reauthenticate")
def reauthenticate(body: Password, request: Request, response: Response, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    database.throttle("reauthenticate", session.account_id, 5)
    value = database.reauthenticate(token(request), body.password)
    set_cookie(response, value, max(1, int(session.absolute_expires - database.clock())))
    return session_view(database, value)


@router.post("/logout")
def logout(request: Request, response: Response, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    database.logout(token(request))
    clear_cookie(response)
    return {"message": "Signed out. This browser session has ended."}


@router.get("/sessions")
def sessions(request: Request, session: Session = Depends(signed_in), database: SecurityStore = Depends(store)):
    return {"sessions": database.sessions(token(request))}


@router.post("/sessions/revoke")
def revoke(body: Revoke, request: Request, response: Response, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    database.require_recent(session)
    database.revoke(token(request), body.id)
    current_id = database.digest("device:" + session.token_hash)
    if body.id is None or body.id == current_id:
        clear_cookie(response)
    return {"message": "Selected sessions have ended."}


@router.get("/privacy")
def privacy(request: Request, session: Session = Depends(signed_in), database: SecurityStore = Depends(store)):
    return {"preferences": database.privacy(token(request)), "stored_data": [
        "Pseudonymous account reference and salted passphrase hash",
        "Hashed session references and session expiry times",
        "Encrypted preferences you choose to save",
        "Short-lived hashed rate-limit counters",
    ]}


@router.put("/privacy")
def save_privacy(body: Preferences, request: Request, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    return {"preferences": database.privacy(token(request), body.model_dump()), "message": "Your privacy choice was saved."}


@router.get("/privacy/export")
def export_privacy(request: Request, session: Session = Depends(signed_in), database: SecurityStore = Depends(store)):
    database.require_recent(session)
    return JSONResponse({"account_type": "local-demo", "preferences": database.privacy(token(request)),
                         "active_sessions": len(database.sessions(token(request)))},
                        headers={"Content-Disposition": 'attachment; filename="access-demo-data.json"'})


@router.delete("/privacy")
def delete_privacy(request: Request, response: Response, session: Session = Depends(mutation), database: SecurityStore = Depends(store)):
    database.delete_account(token(request))
    clear_cookie(response)
    return {"message": "Your demo account, saved preferences and sessions have been deleted."}
