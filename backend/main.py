# backend/main.py — 앱 조립(미들웨어, 라우터 등록). 엔드포인트는 routers/ 에 있다.
import logging
import os
import sys

import pandas as pd
import psycopg2
import uvicorn

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import auth
from auth import (  # noqa: F401  (테스트/스크립트 호환용 re-export)
    ADMIN_PASSWORD, AuthMiddleware, _sign, make_session_token, verify_session_token,
)
from deps import engine  # noqa: F401
from routers import cash, dashboard, ledger, options, purchasing, sales

app = FastAPI()
logger = logging.getLogger("uvicorn.error")


# DB 오류를 빈 데이터(0원 대시보드)로 숨기지 않고 503 으로 명확히 알린다.
@app.exception_handler(psycopg2.Error)
@app.exception_handler(pd.errors.DatabaseError)
async def db_error_handler(request: Request, exc: Exception):
    logger.error("Database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable. Please try again."})


# CORS: 허용 origin 은 환경변수(쉼표 구분)로 지정. 기본은 로컬 개발 주소만.
# 프론트가 Next rewrites(/api)로 same-origin 호출하므로 운영에서는 보통 불필요.
_cors_origins = [o.strip() for o in os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
app.add_middleware(AuthMiddleware)

for module in (auth, dashboard, ledger, options, sales, cash, purchasing):
    app.include_router(module.router)


@app.get("/")
def read_root():
    return {"message": "Collegiate Grill ERP System Online"}


# --- Vercel Serverless specific routing ---
# Since Vercel passes the raw "/api/..." path to the ASGI application,
# we need to mount our main API to "/api" so it correctly responds to Next.js routes.
_core_app = app
app = FastAPI()
app.mount("/api", _core_app)

if __name__ == "__main__":
    uvicorn.run("main:_core_app", host="0.0.0.0", port=8000, reload=True)
