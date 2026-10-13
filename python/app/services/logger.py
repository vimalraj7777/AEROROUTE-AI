"""In-memory structured logger (port of backend/logger.ts)."""
from __future__ import annotations

import random
import time
from datetime import datetime, timezone
from typing import Any

SUBSYSTEMS = ("API", "ML", "ROUTING", "WEATHER", "CONGESTION", "DATABASE")
_LOGS: list[dict[str, Any]] = []
_MAX_LOGS = 200


def _uuid_fragment() -> str:
    import uuid

    return uuid.uuid4().hex[:5]


def add_log(
    level: str,
    subsystem: str,
    message: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    entry = {
        "id": f"log-{int(time.time() * 1000)}-{_uuid_fragment()}",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "level": level,
        "subsystem": subsystem,
        "message": message,
    }
    if metadata is not None:
        entry["metadata"] = metadata

    _LOGS.insert(0, entry)
    if len(_LOGS) > _MAX_LOGS:
        _LOGS.pop()

    print(f"[{entry['timestamp']}] [{level}] [{subsystem}] {message}")
    return entry


def get_logs(limit: int = 50, level: str | None = None) -> list[dict[str, Any]]:
    filtered = _LOGS
    if level and level != "ALL":
        filtered = [entry for entry in _LOGS if entry["level"] == level]
    return filtered[:limit]


def bootstrap() -> None:
    _LOGS.clear()
    add_log("INFO", "API", "AeroRoute AI backend initialized in academic research mode")
    add_log("INFO", "ROUTING", "Graph routing engine initialized")
    add_log("INFO", "ML", "Deterministic delay-scoring demonstration initialized")
    add_log("INFO", "WEATHER", "Bundled METAR observation snapshot loaded")
