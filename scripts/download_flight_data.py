#!/usr/bin/env python3
"""
AeroRoute AI - Flight Data Acquisition Script
Phase 3: Downloads or validates historical BTS TranStats Airline On-Time Performance data.
"""
import os
import json
import sys

RAW_FLIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "flights")
TARGET_FILE = os.path.join(RAW_FLIGHTS_DIR, "bts_historical_flights.json")

def verify_or_acquire():
    os.makedirs(RAW_FLIGHTS_DIR, exist_ok=True)
    if os.path.exists(TARGET_FILE):
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"[OK] Flight dataset found at {TARGET_FILE} ({len(data)} records)")
        return True
    else:
        print(f"[WARN] No local flight dataset found at {TARGET_FILE}")
        print("Note: In accordance with BTS instructions, manual download may be obtained from:")
        print("https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FGJ")
        return False

if __name__ == "__main__":
    success = verify_or_acquire()
    sys.exit(0 if success else 1)
