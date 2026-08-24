from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.core.config import settings
from app.db.database import Base, engine, ensure_db_schema
from app.routers import auth as auth_router
from app.routers import content as content_router
from app.routers import audience as audience_router
from app.routers import trends as trends_router
from app.routers import reports as reports_router

logger = logging.getLogger("creatoriq")

# --------------------------------------------------
# Create all database tables on startup & ensure schema
# --------------------------------------------------
Base.metadata.create_all(bind=engine)
ensure_db_schema()


# --------------------------------------------------
# FastAPI application instance
# --------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    """Application lifecycle — no external connections are required at startup."""
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="CreatorIQ — Creator Analytics & Content Performance Dashboard API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# --------------------------------------------------
# CORS — allow the React frontend origin(s)
# --------------------------------------------------
# Origins come from: FRONTEND_URL env + CORS_ALLOW_ORIGINS env (comma-separated).
# In development every localhost / 127.0.0.1 origin is accepted via regex so any
# Vite dev port (5173, 5174, 5175, ...) works without editing backend code.
local_dev_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

extra_origins = [
    o.strip()
    for o in settings.CORS_ALLOW_ORIGINS.split(",")
    if o.strip()
]
allow_origins = list(dict.fromkeys([settings.FRONTEND_URL] + extra_origins))

if settings.APP_ENV == "development":
    allow_origins = list(dict.fromkeys(allow_origins + local_dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Routers
# --------------------------------------------------
app.include_router(auth_router.router)
app.include_router(content_router.router)
app.include_router(audience_router.router)
app.include_router(trends_router.router)
app.include_router(reports_router.router)




# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/api/health", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


# --------------------------------------------------
# Global exception handler — log the real exception and
# surface it in development instead of a generic 500.
# --------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception on %s %s: %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
    )
    if settings.APP_ENV == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(exc).__name__}: {exc}"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# --------------------------------------------------
# Swagger /docs alias — the app exposes docs at /api/docs.
# This route makes GET /docs work too (redirects).
# --------------------------------------------------
@app.get("/docs", include_in_schema=False, tags=["Docs"])
async def docs_redirect():
    return RedirectResponse(url="/api/docs")
