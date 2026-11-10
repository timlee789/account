import time

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client():
    return TestClient(main._core_app)


def test_session_token_roundtrip_and_tamper_detection():
    token = main.make_session_token()
    assert main.verify_session_token(token)
    expires, role, sig = token.split(".")
    assert not main.verify_session_token(f"{int(expires) + 1000}.{role}.{sig}")   # 만료시각 위조
    assert not main.verify_session_token("1.abc")
    assert not main.verify_session_token(None)


def test_expired_token_rejected():
    payload = f"{int(time.time()) - 1}.admin"
    assert not main.verify_session_token(f"{payload}.{main._sign(payload)}")


def test_protected_endpoint_requires_cookie(client):
    assert client.get("/transactions").status_code == 401
    assert client.get("/dashboard-summary", cookies={"auth-token": main.ADMIN_PASSWORD}).status_code == 401  # 비밀번호 자체는 토큰 아님


def test_login_wrong_and_right_password(client):
    assert client.post("/login", json={"password": "wrong"}).status_code == 401
    r = client.post("/login", json={"password": main.ADMIN_PASSWORD})
    assert r.status_code == 200 and "httponly" in r.headers["set-cookie"].lower()
