import secrets
from concurrent.futures import ThreadPoolExecutor

import pytest
from cryptography.fernet import Fernet, InvalidToken
from fastapi.testclient import TestClient

from access_api.main import app
from access_api.security import COOKIE
from access_api.security_store import SecurityError, SecurityStore


BASE = "/api/v1/security"
ORIGIN = "https://security.example"


@pytest.fixture
def security(tmp_path, monkeypatch):
    now = [1000000.0]
    database = SecurityStore(tmp_path / "security.sqlite", Fernet.generate_key(), clock=lambda: now[0])
    password = secrets.token_urlsafe(24)
    database.create_account("test-learner", password)
    database.create_account("other-learner", password)
    monkeypatch.setenv("ACCESS_SECURITY_ORIGIN", ORIGIN)
    monkeypatch.setitem(app.state._state, "security_store", database)
    with TestClient(app, base_url=ORIGIN) as client:
        yield client, database, now, password


def login(client, password, alias="test-learner"):
    response = client.post(BASE + "/login", json={"alias": alias, "password": password}, headers={"Origin": ORIGIN})
    assert response.status_code == 200
    return response


def headers(client):
    return {"Origin": ORIGIN, "X-CSRF-Token": client.get(BASE + "/session").json()["csrf_token"]}


def test_cookie_storage_and_security_headers(security):
    client, database, _, password = security
    response = login(client, password)
    cookie = response.headers["set-cookie"].lower()
    assert "secure" in cookie and "httponly" in cookie and "samesite=lax" in cookie and "path=/" in cookie
    assert "domain=" not in cookie
    token = client.cookies[COOKIE]
    raw = database.path.read_bytes()
    assert token.encode() not in raw and password.encode() not in raw
    assert b"test-learner" not in raw
    result = client.get(BASE + "/privacy")
    assert result.headers["cache-control"] == "no-store"
    assert result.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in result.headers["content-security-policy"]


def test_csrf_origin_extra_claims_and_body_limits(security):
    client, _, _, password = security
    login(client, password)
    body = {"remember": True, "language": "am", "caption_size": "large"}
    assert client.put(BASE + "/privacy", json=body).status_code == 403
    bad = headers(client) | {"Origin": "https://attacker.example"}
    assert client.put(BASE + "/privacy", json=body, headers=bad).status_code == 403
    assert client.put(BASE + "/privacy", json=body | {"role": "publisher"}, headers=headers(client)).status_code == 422
    assert client.post(BASE + "/login", content=b"x" * 4097, headers={"Origin": ORIGIN}).status_code == 413
    assert client.post(BASE + "/login", content=iter([b"x" * 3000, b"x" * 3000]), headers={"Origin": ORIGIN}).status_code == 413
    assert client.get(BASE + "/session", headers={"Host": "attacker.example"}).status_code == 403


def test_encrypted_preferences_opt_out_and_no_browser_trust(security):
    client, database, _, password = security
    login(client, password)
    body = {"remember": True, "language": "am", "caption_size": "extra-large"}
    assert client.put(BASE + "/privacy", json=body, headers=headers(client)).status_code == 200
    account_id = database.session(client.cookies[COOKIE]).account_id
    with database.connection() as db:
        ciphertext = db.execute("SELECT preferences FROM accounts WHERE id=?", (account_id,)).fetchone()[0]
    assert b"extra-large" not in ciphertext
    assert b"extra-large" in database.cipher.decrypt(ciphertext)
    damaged = bytearray(ciphertext)
    damaged[20] ^= 1
    with pytest.raises(InvalidToken):
        database.cipher.decrypt(bytes(damaged))
    assert client.get(BASE + "/privacy").json()["preferences"] == body
    assert client.put(BASE + "/privacy", json=body | {"remember": False}, headers=headers(client)).status_code == 200
    assert client.get(BASE + "/privacy").json()["preferences"] == {}


def test_expiry_extension_absolute_cap_and_recent_authentication(security):
    client, database, now, password = security
    login(client, password)
    now[0] += 301
    assert client.get(BASE + "/privacy/export").json()["error"]["code"] == "reauthentication_required"
    old_token = client.cookies[COOKIE]
    old_csrf = headers(client)
    response = client.post(BASE + "/reauthenticate", json={"password": password}, headers=old_csrf)
    assert response.status_code == 200
    assert client.cookies[COOKIE] != old_token
    with pytest.raises(SecurityError):
        database.session(old_token)
    assert client.put(BASE + "/privacy", json={"remember": False}, headers=old_csrf).status_code == 403
    now[0] += 1000
    before = client.get(BASE + "/session").json()
    assert client.post(BASE + "/extend", headers=headers(client)).json()["expires_at"] > before["expires_at"]
    now[0] = before["absolute_expires_at"]
    assert client.get(BASE + "/privacy").status_code == 401


def test_logout_and_revoke_all_invalidate_replayed_cookies(security):
    client, database, _, password = security
    login(client, password)
    first = client.cookies[COOKIE]
    login(client, password)
    second = client.cookies[COOKIE]
    assert client.post(BASE + "/sessions/revoke", json={}, headers=headers(client)).status_code == 200
    for value in [first, second]:
        with pytest.raises(SecurityError):
            database.session(value)
    login(client, password)
    value = client.cookies[COOKIE]
    assert client.post(BASE + "/logout", headers=headers(client)).status_code == 200
    with pytest.raises(SecurityError):
        database.session(value)


def test_foreign_session_cannot_be_revoked(security):
    client, database, _, password = security
    login(client, password, "other-learner")
    foreign_token = client.cookies[COOKIE]
    foreign_id = database.sessions(foreign_token)[0]["id"]
    login(client, password)
    result = client.post(BASE + "/sessions/revoke", json={"id": foreign_id}, headers=headers(client))
    assert result.status_code == 404
    assert database.session(foreign_token)


def test_failed_login_limits_are_bounded_and_recover(security):
    client, _, now, password = security
    for _ in range(5):
        assert client.post(BASE + "/login", json={"alias": "unknown", "password": password}, headers={"Origin": ORIGIN}).status_code == 401
    result = client.post(BASE + "/login", json={"alias": "unknown", "password": password}, headers={"Origin": ORIGIN})
    assert result.status_code == 429
    assert 1 <= int(result.headers["retry-after"]) <= 60
    login(client, password)
    now[0] += 61
    assert client.post(BASE + "/login", json={"alias": "unknown", "password": password}, headers={"Origin": ORIGIN}).status_code == 401


def test_concurrent_rate_limit_does_not_lose_updates(security):
    _, database, _, _ = security
    def attempt(_):
        try:
            database.throttle("parallel", "one-subject", 5)
            return True
        except SecurityError:
            return False
    with ThreadPoolExecutor(max_workers=8) as executor:
        assert sum(executor.map(attempt, range(12))) == 5


def test_delete_erases_account_and_revokes_every_session(security):
    client, database, _, password = security
    login(client, password)
    first = client.cookies[COOKIE]
    login(client, password)
    assert client.delete(BASE + "/privacy", headers=headers(client)).status_code == 200
    assert client.get(BASE + "/session").status_code == 401
    with pytest.raises(SecurityError):
        database.session(first)
    assert client.post(BASE + "/login", json={"alias": "test-learner", "password": password}, headers={"Origin": ORIGIN}).status_code == 401


def test_security_logs_omit_credentials_and_preference_content(security, caplog):
    client, _, _, password = security
    with caplog.at_level("INFO", logger="access.security"):
        login(client, password)
        client.get(BASE + "/privacy")
    assert "test-learner" not in caplog.text and password not in caplog.text
    assert client.cookies[COOKIE] not in caplog.text
    assert '"role": "learner"' in caplog.text


def test_setup_unavailable_is_explicit_and_https_is_enforced(security, monkeypatch):
    client, _, _, _ = security
    monkeypatch.setitem(app.state._state, "security_store", None)
    result = client.get(BASE + "/session")
    assert result.status_code == 503 and result.json()["error"]["code"] == "setup_required"
    with TestClient(app, base_url="http://security.example") as insecure:
        assert insecure.get(BASE + "/session").status_code == 400
