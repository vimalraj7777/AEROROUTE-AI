"""Central configuration and filesystem paths for AeroRoute AI (Python)."""
from __future__ import annotations

import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent

DATA_DIR = PROJECT_DIR / "data"
MODELS_DIR = PROJECT_DIR / "models"
DB_PATH = PROJECT_DIR / "aeroroute.db"

TEMPLATES_DIR = APP_DIR / "templates"
STATIC_DIR = APP_DIR / "static"

APP_NAME = "AeroRoute AI"
APP_VERSION = "1.4.0"
ACADEMIC_DISCLAIMER = (
    "Academic aviation operations-intelligence decision-support prototype. "
    "Not certified aviation software."
)

PORT = int(os.environ.get("PORT", "3000"))
HOST = os.environ.get("HOST", "0.0.0.0")
ENVIRONMENT = os.environ.get("NODE_ENV", os.environ.get("ENVIRONMENT", "development"))

USE_KAGGLE_DATA = os.environ.get("AEROROUTE_USE_KAGGLE_DATA", "false").lower() == "true"

# Delay-risk class taxonomy (shared by the ML engine and templates)
DELAY_CLASSES = [
    {"id": 0, "label": "On-Time / Early (<= 0m)", "code": "ON_TIME"},
    {"id": 1, "label": "Minor Delay (1-15m)", "code": "MINOR_DELAY"},
    {"id": 2, "label": "Moderate Delay (16-45m)", "code": "MODERATE_DELAY"},
    {"id": 3, "label": "Severe Delay (> 45m)", "code": "SEVERE_DELAY"},
    {"id": 4, "label": "Cancelled / Diverted", "code": "CANCELLED_DIVERTED"},
]

CARRIER_BASE_RATES = {
    "DL": 10.2,
    "AA": 14.8,
    "UA": 15.6,
    "WN": 12.8,
    "AS": 9.4,
    "B6": 19.5,
}

CARRIER_NAMES = {
    "DL": "Delta Air Lines",
    "AA": "American Airlines",
    "UA": "United Airlines",
    "WN": "Southwest Airlines",
    "AS": "Alaska Airlines",
    "B6": "JetBlue Airways",
}

DEFAULT_ROUTE_WEIGHTS = {
    "distance": 0.3,
    "time": 0.2,
    "weather": 0.25,
    "congestion": 0.15,
    "delayRisk": 0.1,
}

ROUTE_PRESETS = {
    "balanced": {
        "label": "Balanced",
        "weights": {"distance": 0.3, "time": 0.2, "weather": 0.25, "congestion": 0.15, "delayRisk": 0.1},
    },
    "fuel": {
        "label": "Min Fuel",
        "weights": {"distance": 0.55, "time": 0.25, "weather": 0.1, "congestion": 0.05, "delayRisk": 0.05},
    },
    "weather": {
        "label": "Avoid Weather",
        "weights": {"distance": 0.15, "time": 0.1, "weather": 0.55, "congestion": 0.1, "delayRisk": 0.1},
    },
    "congestion": {
        "label": "Low Congestion",
        "weights": {"distance": 0.2, "time": 0.15, "weather": 0.15, "congestion": 0.4, "delayRisk": 0.1},
    },
    "punctuality": {
        "label": "Punctuality",
        "weights": {"distance": 0.15, "time": 0.15, "weather": 0.2, "congestion": 0.1, "delayRisk": 0.4},
    },
}
