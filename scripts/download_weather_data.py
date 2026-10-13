#!/usr/bin/env python3
"""
AeroRoute AI - Weather Data Ingestion Script
Phase 3: Validates and parses NOAA METAR aviation weather observations.
"""
import os
import json
import sys

RAW_WEATHER_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "weather")
TARGET_FILE = os.path.join(RAW_WEATHER_DIR, "metar_observations.json")

def verify_weather():
    os.makedirs(RAW_WEATHER_DIR, exist_ok=True)
    if os.path.exists(TARGET_FILE):
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"[OK] METAR weather observations loaded ({len(data)} stations)")
        return True
    else:
        print(f"[ERROR] METAR observation file missing at {TARGET_FILE}")
        return False

if __name__ == "__main__":
    success = verify_weather()
    sys.exit(0 if success else 1)
