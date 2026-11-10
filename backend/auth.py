import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

load_dotenv()  # ADMIN_PASSWORD 등 .env 값을 import 시점에 읽기 위해 필요

router = APIRouter()

# --- 인증 설정 ---
# ADMIN_PASSWORD 가 없으면 기본값 없이 서버 시작을 거부한다.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD environment variable is required")
# 세션 서명 키: 별도 SESSION_SECRET 이 있으면 사용, 없으면 비밀번호에서 파생
SESSION_SECRET = (os.environ.get("SESSION_SECRET") or ADMIN_PASSWORD).encode()
SESSION_MAX_AGE = 60 * 60 * 24 * 7
COOKIE_NAME = "auth-token"
PUBLIC_PATHS = {"/", "/login", "/logout", "/api", "/api/", "/api/login", "/api/logout"}

def _sign(payload: str) -> str:
    return hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()

def make_session_token() -> str:
    expires = str(int(time.time()) + SESSION_MAX_AGE)
    return f"{expires}.{_sign(expires)}"

def verify_session_token(token: Optional[str]) -> bool:
    if not token or "." not in token:
        return False
    expires, sig = token.split(".", 1)
    if not hmac.compare_digest(sig, _sign(expires)):
        return False
    try:
        return int(expires) > time.time()
    except ValueError:
        return False

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)
        if not verify_session_token(request.cookies.get(COOKIE_NAME)):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        return await call_next(request)

class LoginRequest(BaseModel):
    password: str

# 간단한 로그인 시도 제한 (프로세스 메모리 기반, IP당 5분에 10회)
_login_attempts: dict[str, list[float]] = {}
LOGIN_WINDOW = 300
LOGIN_MAX_ATTEMPTS = 10

@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = [t for t in _login_attempts.get(ip, []) if now - t < LOGIN_WINDOW]
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    if hmac.compare_digest(req.password.encode(), ADMIN_PASSWORD.encode()):
        _login_attempts.pop(ip, None)
        response.set_cookie(
            key=COOKIE_NAME,
            value=make_session_token(),
            httponly=True,
            max_age=SESSION_MAX_AGE,
            samesite="lax",
            secure=True,
        )
        return {"status": "success"}
    attempts.append(now)
    _login_attempts[ip] = attempts
    raise HTTPException(status_code=401, detail="Invalid admin password")

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"status": "success"}
