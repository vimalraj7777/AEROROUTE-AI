"""Shared pytest fixtures for the AeroRoute AI Python test suite.

Run from the `python/` directory:

    python -m pip install -r requirements-dev.txt
    python -m pytest -q
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.data_service import data_service
from app.services.logger import bootstrap


@pytest.fixture(scope="session", autouse=True)
def _load_data():
    bootstrap()
    data_service.load_all()
    assert data_service.is_ready(), "Dataset failed to load into SQLite"


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
