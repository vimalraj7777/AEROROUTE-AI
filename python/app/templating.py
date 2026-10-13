"""Shared Jinja2 template environment."""
from __future__ import annotations

from fastapi.templating import Jinja2Templates

from app import config

templates = Jinja2Templates(directory=str(config.TEMPLATES_DIR))
