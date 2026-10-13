#!/usr/bin/env python3
"""
AeroRoute AI - Airport Data Acquisition Script
Phase 3: Validates and loads FAA / OurAirports NAS reference table.
"""
import os
import json
import sys

RAW_AIRPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "airports")
TARGET_FILE = os.path.join(RAW_AIRPORTS_DIR, "airports.json")

def verify_airports():
    os.makedirs(RAW_AIRPORTS_DIR, exist_ok=True)
    if os.path.exists(TARGET_FILE):
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"[OK] Airport dataset verified at {TARGET_FILE} ({len(data)} hubs mapped)")
        return True
    else:
        print(f"[ERROR] Target airport data not found at {TARGET_FILE}")
        return False

if __name__ == "__main__":
    success = verify_airports()
    sys.exit(0 if success else 1)
