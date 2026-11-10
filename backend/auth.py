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
# 직원용 비밀번호(선택). 없으면 직원 로그인은 비활성화된다. 관리자 비밀번호와 같으면 안 된다.
STAFF_PASSWORD = os.environ.get("STAFF_PASSWORD") or None
if STAFF_PASSWORD and STAFF_PASSWORD == ADMIN_PASSWORD:
    raise RuntimeError("STAFF_PASSWORD must be different from ADMIN_PASSWORD")
# 세션 서명 키: 별도 SESSION_SECRET 이 있으면 사용, 없으면 비밀번호에서 파생
SESSION_SECRET = (os.environ.get("SESSION_SECRET") or ADMIN_PASSWORD).encode()
SESSION_MAX_AGE = 60 * 60 * 24 * 7
COOKIE_NAME = "auth-token"
PUBLIC_PATHS = {"/", "/login", "/logout", "/api", "/api/", "/api/login", "/api/logout"}

# 직원(staff) 권한으로 접근 가능한 경로 (그 외는 모두 admin 전용)
STAFF_EXACT_PATHS = {"/me"}
STAFF_PATH_PREFIXES = ("/purchasing/staff/",)

def _sign(payload: str) -> str:
    return hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()

def make_session_token(role: str = "admin") -> str:
    """토큰 형식: <만료>.<역할>.<서명>"""
    payload = f"{int(time.time()) + SESSION_MAX_AGE}.{role}"
    return f"{payload}.{_sign(payload)}"

def token_role(token: Optional[str]) -> Optional[str]:
    """유효한 토큰이면 역할('admin'|'staff'), 아니면 None.
    역할 없는 구형 토큰(<만료>.<서명>)은 관리자로 인정해 배포 직후 로그아웃되지 않게 한다."""
    if not token:
        return None
    parts = token.split(".")
    if len(parts) == 2:
        expires, sig = parts
        payload, role = expires, "admin"
    elif len(parts) == 3:
        expires, role, sig = parts
        payload = f"{expires}.{role}"
    else:
        return None
    if role not in ("admin", "staff") or not hmac.compare_digest(sig, _sign(payload)):
        return None
    try:
        return role if int(expires) > time.time() else None
    except ValueError:
        return None

def verify_session_token(token: Optional[str]) -> bool:
    return token_role(token) is not None

def _is_staff_path(path: str) -> bool:
    if path.startswith("/api/"):          # Vercel 에서는 /api 접두사가 붙어 들어온다
        path = path[4:]
    return path in STAFF_EXACT_PATHS or path.startswith(STAFF_PATH_PREFIXES)

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)
        role = token_role(request.cookies.get(COOKIE_NAME))
        if role is None:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        if role != "admin" and not _is_staff_path(request.url.path):
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})
        request.state.role = role
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
    supplied = req.password.encode()
    role = None
    if hmac.compare_digest(supplied, ADMIN_PASSWORD.encode()):
        role = "admin"
    elif STAFF_PASSWORD and hmac.compare_digest(supplied, STAFF_PASSWORD.encode()):
        role = "staff"
    if role:
        _login_attempts.pop(ip, None)
        response.set_cookie(
            key=COOKIE_NAME,
            value=make_session_token(role),
            httponly=True,
            max_age=SESSION_MAX_AGE,
            samesite="lax",
            secure=True,
        )
        return {"status": "success", "role": role}
    attempts.append(now)
    _login_attempts[ip] = attempts
    raise HTTPException(status_code=401, detail="Invalid password")

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"status": "success"}

@router.get("/me")
def me(request: Request):
    """현재 로그인한 사용자의 역할 (프론트 화면 분기용)."""
    return {"role": getattr(request.state, "role", None)}
