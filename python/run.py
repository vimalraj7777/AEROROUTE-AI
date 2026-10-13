"""Development entry point: python run.py"""
from __future__ import annotations

import uvicorn

from app import config

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.ENVIRONMENT == "development",
    )
