from contextlib import asynccontextmanager
from datetime import date, timedelta
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.init_db import init_db
from app.database.session import SessionLocal
from app.models.activity import ActivityTemplate
from app.services.scheduler import ensure_instances, format_date, parse_date
from app.routers import (
    templates_router,
    instances_router,
    days_router,
    analytics_router,
    compare_router,
    goals_router,
    finance_router,
    settings_router,
    notifications_router,
    system_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize tables and seed default settings, templates, goals if needed
    today_str = format_date(date.today())
    init_db(seed_date_str=today_str)

    # 2. Run ensure_instances for [earliest active_from .. today+7]
    db: Session = SessionLocal()
    try:
        earliest_from = db.query(func.min(ActivityTemplate.active_from)).filter(
            ActivityTemplate.is_archived == False,
            ActivityTemplate.is_paused == False
        ).scalar()
        start_from = earliest_from or today_str
        horizon_str = format_date(date.today() + timedelta(days=7))
        ensure_instances(db, start_from, horizon_str)
    finally:
        db.close()

    yield

app = FastAPI(
    title="LifeOS 90 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers for consistent error JSON
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_ERROR",
    }
    error_code = code_map.get(exc.status_code, "ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": exc.detail if isinstance(exc.detail, str) else "An error occurred",
                "details": exc.detail if not isinstance(exc.detail, str) else None,
            }
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload",
                "details": exc.errors(),
            }
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "details": None,
            }
        },
    )

# Health endpoint
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "LifeOS 90"}

# Register routers under /api
app.include_router(templates_router, prefix="/api")
app.include_router(instances_router, prefix="/api")
app.include_router(days_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(goals_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(system_router, prefix="/api")
