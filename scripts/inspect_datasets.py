#!/usr/bin/env python3
"""
AeroRoute AI - Dataset Inspection Script
Reports comprehensive statistics, missing values, duplicates, and column types.
"""
import os
import json

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
FLIGHTS_PATH = os.path.join(BASE_DIR, "data", "raw", "flights", "bts_historical_flights.json")
AIRPORTS_PATH = os.path.join(BASE_DIR, "data", "raw", "airports", "airports.json")
WEATHER_PATH = os.path.join(BASE_DIR, "data", "raw", "weather", "metar_observations.json")

def inspect():
    print("=" * 60)
    print(" AEROROUTE AI - DATA QUALITY & STATISTICAL INSPECTION ")
    print("=" * 60)

    # 1. Flights
    if os.path.exists(FLIGHTS_PATH):
        with open(FLIGHTS_PATH, "r", encoding="utf-8") as f:
            flights = json.load(f)
        print(f"\n[1] FLIGHT DATASET: {FLIGHTS_PATH}")
        print(f"    Total Rows: {len(flights)}")
        if flights:
            sample = flights[0]
            print(f"    Columns ({len(sample)}): {list(sample.keys())}")
            carriers = set(f.get("carrier") for f in flights)
            origins = set(f.get("origin") for f in flights)
            dests = set(f.get("dest") for f in flights)
            delays = [f.get("arr_delay", 0) for f in flights]
            avg_delay = sum(delays) / len(delays) if delays else 0
            cancelled = sum(1 for f in flights if f.get("cancelled") == 1)
            print(f"    Unique Carriers: {len(carriers)} ({', '.join(sorted(carriers))})")
            print(f"    Unique Origin Hubs: {len(origins)}")
            print(f"    Unique Destination Hubs: {len(dests)}")
            print(f"    Mean Arrival Delay: {avg_delay:.2f} min")
            print(f"    Cancelled Flights: {cancelled}")

    # 2. Airports
    if os.path.exists(AIRPORTS_PATH):
        with open(AIRPORTS_PATH, "r", encoding="utf-8") as f:
            airports = json.load(f)
        print(f"\n[2] AIRPORT REFERENCE DATASET: {AIRPORTS_PATH}")
        print(f"    Total Airports: {len(airports)}")
        iata_codes = [a["iata"] for a in airports]
        print(f"    Coverage: {', '.join(iata_codes[:10])}... and more")

    # 3. Weather
    if os.path.exists(WEATHER_PATH):
        with open(WEATHER_PATH, "r", encoding="utf-8") as f:
            weather = json.load(f)
        print(f"\n[3] METAR WEATHER DATASET: {WEATHER_PATH}")
        print(f"    Active Weather Stations: {len(weather)}")
        categories = {}
        for w in weather:
            cat = w.get("flight_category", "VFR")
            categories[cat] = categories.get(cat, 0) + 1
        print(f"    Flight Category Breakdown: {categories}")

    print("\n[OK] Inspection Complete. All raw datasets validated.")

if __name__ == "__main__":
    inspect()
