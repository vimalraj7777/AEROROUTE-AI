"""AeroRoute AI — FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app import config
from app.routers import api, pages
from app.services.data_service import data_service
from app.services.logger import bootstrap


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap()
    data_service.load_all()
    yield


app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description="Aviation operations & route intelligence — academic decision-support prototype.",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=str(config.STATIC_DIR)), name="static")

app.include_router(api.router)
app.include_router(pages.router)


@app.exception_handler(404)
async def not_found(request: Request, exc):  # noqa: ANN001
    if request.url.path.startswith("/api"):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return RedirectResponse(url="/")
