# AeroRoute AI — Data Quality Report

## Executive Summary
This document reports the integrity, missingness, consistency, and cleaning results across all ingested data streams in AeroRoute AI (Flights, Airports, METAR Weather, and Derived Congestion).

---

## 1. Flight Dataset (U.S. DOT BTS TranStats)
- **Source**: Bureau of Transportation Statistics Airline On-Time Performance Data (2024 Reference Slice).
- **Inspection Summary**:
  - Sample Records Inspected: 20 hub flights across 6 major carriers (DL, AA, UA, WN, AS, B6).
  - Missing Values: 0% in primary tracking identifiers (`fl_date`, `carrier`, `origin`, `dest`, `crs_dep_time`).
  - Cancelled Flight Policy: Cancelled flights (`cancelled == 1`) have actual times recorded as `0000` and are categorized under the distinct target tier `CANCELLED_DIVERTED` (Class 4), preventing skew in delay duration regressions.
  - Delay Outliers: Arrival delays bounded to valid physical limits (-30m early to +360m late).

---

## 2. Airport Reference Dataset (FAA NAS)
- **Source**: Federal Aviation Administration (FAA) / OurAirports Open Reference.
- **Record Count**: 25 major U.S. commercial hub airports.
- **Geospatial Integrity**: 100% valid latitude and longitude coordinates in WGS84 coordinates.
- **IATA/ICAO Cross-Resolution**: All airports mapped to both 3-letter IATA codes and 4-letter ICAO station identifiers.

---

## 3. METAR Weather Dataset (NOAA)
- **Source**: National Oceanic and Atmospheric Administration (NOAA) Aviation Weather Center.
- **Station Count**: 16 active hub reporting stations.
- **Category Coverage**:
  - VFR (Visual Flight Rules): 11 stations (e.g. KATL, KDFW, KLAX, KMIA)
  - MVFR (Marginal VFR): 3 stations (e.g. KJFK, KBOS, KEWR)
  - IFR (Instrument Flight Rules): 2 stations (e.g. KORD, KDTW)
- **Parsed Metrics**: Continuous wind vector (direction + speed + gusts), visibility (statute miles), cloud ceiling (feet AGL), altimeter setting.

---

## 4. Congestion Proxy Index
- **Source**: AeroRoute AI Derived Airspace Load Index.
- **Formula**:
  $$\text{Index} = 0.50 \cdot \left(\frac{\text{Ops}}{\text{Capacity}} \times 100\right) + 0.30 \cdot \min(100, \text{TaxiTime} \times 3.5) + 0.20 \cdot \text{QueueImbalance}$$
- **Integrity Boundary**: Explicitly labeled as a derived mathematical proxy; never falsely claimed as live radar gate telemetry.
