"""Single-host demo identity store with revocable opaque sessions."""

import hashlib
import hmac
import json
import math
import os
import secrets
import sqlite3
import time
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from cryptography.fernet import Fernet


class SecurityError(Exception):
    def __init__(self, status: int, code: str, message: str, retry_after: int = 0):
        self.status = status
        self.code = code
        self.message = message
        self.retry_after = retry_after


@dataclass(frozen=True)
class Session:
    token_hash: str
    account_id: str
    created: float
    expires: float
    absolute_expires: float
    authenticated: float


class SecurityStore:
    def __init__(self, path: Path, key: bytes, *, clock=time.time, idle_seconds=1800, absolute_seconds=43200):
        self.path = path
        self.cipher = Fernet(key)
        self.key = key
        self.clock = clock
        self.idle_seconds = idle_seconds
        self.absolute_seconds = absolute_seconds
        self.password_slots = threading.BoundedSemaphore(1)
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(descriptor)
        os.chmod(path, 0o600)
        with self.connection() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY, lookup TEXT UNIQUE NOT NULL,
                    salt BLOB NOT NULL, password_hash BLOB NOT NULL,
                    preferences BLOB NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL
                        REFERENCES accounts(id) ON DELETE CASCADE,
                    created REAL NOT NULL, expires REAL NOT NULL,
                    absolute_expires REAL NOT NULL, authenticated REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS session_owner ON sessions(account_id);
                CREATE TABLE IF NOT EXISTS limits (
                    bucket TEXT PRIMARY KEY, start REAL NOT NULL, count INTEGER NOT NULL
                );
            """)

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA secure_delete=ON")
        try:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def digest(self, value: str) -> str:
        return hmac.new(self.key, value.encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def password_hash(self, password: str, salt: bytes) -> bytes:
        if not self.password_slots.acquire(blocking=False):
            raise SecurityError(429, "authentication_busy", "Sign-in is busy. Please try again in a few seconds.", 3)
        try:
            return hashlib.scrypt(password.encode(), salt=salt, n=2**17, r=8, p=1, maxmem=256 * 1024 * 1024)
        finally:
            self.password_slots.release()

    def create_account(self, alias: str, password: str):
        if not 1 <= len(alias.strip()) <= 80 or not 15 <= len(password) <= 256:
            raise ValueError("Use an alias and a passphrase of 15 to 256 characters.")
        salt = secrets.token_bytes(16)
        credential = self.password_hash(password, salt)
        with self.connection() as db:
            db.execute("INSERT INTO accounts VALUES (?, ?, ?, ?, ?)", (
                secrets.token_hex(16), self.digest("alias:" + alias.strip().casefold()),
                salt, credential, self.cipher.encrypt(b"{}"),
            ))

    def throttle(self, category: str, subject: str, limit: int, window: int = 60):
        now = self.clock()
        bucket = self.digest(category + ":" + subject)
        blocked = False
        retry = window
        with self.connection() as db:
            db.execute("DELETE FROM limits WHERE start <= ?", (now - window,))
            row = db.execute("SELECT * FROM limits WHERE bucket=?", (bucket,)).fetchone()
            if row:
                retry = max(1, math.ceil(row["start"] + window - now))
                blocked = row["count"] >= limit
                if not blocked:
                    db.execute("UPDATE limits SET count=count+1 WHERE bucket=?", (bucket,))
            elif db.execute("SELECT count(*) FROM limits").fetchone()[0] >= 10000:
                blocked = True
            else:
                db.execute("INSERT INTO limits VALUES (?, ?, 1)", (bucket, now))
        if blocked:
            raise SecurityError(429, "rate_limited", f"Please wait {retry} seconds, then try again. Your current entries remain available.", retry)

    def csrf(self, token: str) -> str:
        return self.digest("csrf:" + token)

    def _insert_session(self, db, account_id: str, *, created=None, absolute_expires=None) -> str:
        now = self.clock()
        token = secrets.token_urlsafe(32)
        absolute = absolute_expires if absolute_expires is not None else now + self.absolute_seconds
        db.execute("DELETE FROM sessions WHERE expires <= ? OR absolute_expires <= ?", (now, now))
        # Bound each account's device sessions. Rotate the oldest session out.
        rows = db.execute("SELECT token_hash FROM sessions WHERE account_id=? ORDER BY created DESC", (account_id,)).fetchall()
        for row in rows[9:]:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (row[0],))
        db.execute("INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)", (
            self.token_hash(token), account_id, now if created is None else created,
            min(now + self.idle_seconds, absolute), absolute, now,
        ))
        return token

    def login(self, alias: str, password: str) -> str:
        lookup = self.digest("alias:" + alias.strip().casefold())
        with self.connection() as db:
            row = db.execute("SELECT * FROM accounts WHERE lookup=?", (lookup,)).fetchone()
        salt = row["salt"] if row else bytes(16)
        candidate = self.password_hash(password, salt)
        expected = row["password_hash"] if row else bytes(len(candidate))
        if not hmac.compare_digest(candidate, expected) or row is None:
            raise SecurityError(401, "sign_in_failed", "Sign-in did not work. Check your alias and passphrase, then try again.")
        with self.connection() as db:
            # A concurrently deleted account cannot receive a new session.
            if not db.execute("SELECT 1 FROM accounts WHERE id=?", (row["id"],)).fetchone():
                raise SecurityError(401, "sign_in_required", "Please sign in to continue.")
            return self._insert_session(db, row["id"])

    def session_in(self, db, token: str) -> Session:
        row = db.execute("SELECT * FROM sessions WHERE token_hash=?", (self.token_hash(token),)).fetchone()
        now = self.clock()
        if row is None or min(row["expires"], row["absolute_expires"]) <= now:
            raise SecurityError(401, "sign_in_required", "Your session ended. Sign in again to continue. Your page entries are still available.")
        return Session(**dict(row))

    def session(self, token: str) -> Session:
        with self.connection() as db:
            return self.session_in(db, token)

    def reauthenticate(self, token: str, password: str) -> str:
        session = self.session(token)
        with self.connection() as db:
            row = db.execute("SELECT * FROM accounts WHERE id=?", (session.account_id,)).fetchone()
        if row is None or not hmac.compare_digest(self.password_hash(password, row["salt"]), row["password_hash"]):
            raise SecurityError(401, "reauthentication_failed", "The passphrase did not match. Try again or sign out.")
        with self.connection() as db:
            session = self.session_in(db, token)
            db.execute("DELETE FROM sessions WHERE token_hash=?", (session.token_hash,))
            return self._insert_session(db, session.account_id, created=session.created, absolute_expires=session.absolute_expires)

    def extend(self, token: str):
        with self.connection() as db:
            session = self.session_in(db, token)
            db.execute("UPDATE sessions SET expires=? WHERE token_hash=?", (
                min(self.clock() + self.idle_seconds, session.absolute_expires), session.token_hash,
            ))

    def sessions(self, token: str) -> list[dict]:
        with self.connection() as db:
            session = self.session_in(db, token)
            rows = db.execute("SELECT token_hash, created, expires FROM sessions WHERE account_id=? AND expires>? AND absolute_expires>? ORDER BY created DESC", (
                session.account_id, self.clock(), self.clock(),
            )).fetchall()
        return [{"id": self.digest("device:" + row["token_hash"]), "current": row["token_hash"] == session.token_hash, "created": row["created"], "expires": row["expires"]} for row in rows]

    def revoke(self, token: str, identifier: str | None = None):
        with self.connection() as db:
            session = self.session_in(db, token)
            if identifier is None:
                db.execute("DELETE FROM sessions WHERE account_id=?", (session.account_id,))
                return
            rows = db.execute("SELECT token_hash FROM sessions WHERE account_id=?", (session.account_id,)).fetchall()
            for row in rows:
                if hmac.compare_digest(self.digest("device:" + row[0]), identifier):
                    db.execute("DELETE FROM sessions WHERE token_hash=?", (row[0],))
                    return
            raise SecurityError(404, "not_found", "This browser session is unavailable.")

    def logout(self, token: str):
        with self.connection() as db:
            db.execute("DELETE FROM sessions WHERE token_hash=?", (self.token_hash(token),))

    def privacy(self, token: str, preferences: dict | None = None) -> dict:
        with self.connection() as db:
            session = self.session_in(db, token)
            if preferences is not None:
                saved = preferences if preferences["remember"] else {}
                db.execute("UPDATE accounts SET preferences=? WHERE id=?", (self.cipher.encrypt(json.dumps(saved).encode()), session.account_id))
            row = db.execute("SELECT preferences FROM accounts WHERE id=?", (session.account_id,)).fetchone()
        return json.loads(self.cipher.decrypt(row[0]))

    def delete_account(self, token: str):
        with self.connection() as db:
            session = self.session_in(db, token)
            self.require_recent(session)
            db.execute("DELETE FROM accounts WHERE id=?", (session.account_id,))

    def require_recent(self, session: Session):
        if self.clock() - session.authenticated > 300:
            raise SecurityError(403, "reauthentication_required", "Confirm your passphrase to complete this action. Your entries will stay available.")
