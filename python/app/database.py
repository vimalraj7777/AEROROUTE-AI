"""SQLite access helpers. The FastAPI app reads all data from ``aeroroute.db``."""
from __future__ import annotations

import sqlite3
from typing import Any

from app import config


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def query_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def query_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_artifact(key: str) -> Any | None:
    import json

    row = query_one("SELECT json FROM artifacts WHERE key = ?", (key,))
    if not row:
        return None
    return json.loads(row["json"])


def ensure_database() -> None:
    """Build the SQLite database from JSON snapshots if it does not exist."""
    if not config.DB_PATH.exists():
        from build_database import build_database

        build_database()
