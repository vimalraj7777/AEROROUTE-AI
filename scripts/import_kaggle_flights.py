import argparse
import csv
import json
import random
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "processed"
BUCKETS = [
    {"label": "On-Time (<=0m)", "count": 0, "color": "#10b981"},
    {"label": "Minor (1-15m)", "count": 0, "color": "#38bdf8"},
    {"label": "Moderate (16-45m)", "count": 0, "color": "#f59e0b"},
    {"label": "Severe (>45m)", "count": 0, "color": "#ef4444"},
    {"label": "Cancelled", "count": 0, "color": "#64748b"},
]
CARRIER_NAMES = {
    "AA": "American Airlines",
    "AS": "Alaska Airlines",
    "B6": "JetBlue Airways",
    "DL": "Delta Air Lines",
    "F9": "Frontier Airlines",
    "G4": "Allegiant Air",
    "HA": "Hawaiian Airlines",
    "NK": "Spirit Airlines",
    "UA": "United Airlines",
    "WN": "Southwest Airlines",
}
ALIASES = {
    "date": ("fl_date", "flight_date", "date"),
    "year": ("year",),
    "month": ("month",),
    "day": ("dayofmonth", "day_of_month", "day"),
    "carrier": ("op_unique_carrier", "unique_carrier", "op_carrier", "carrier", "airline"),
    "flight_num": ("op_carrier_fl_num", "flight_num", "flightnumber"),
    "origin": ("origin", "origin_airport"),
    "dest": ("dest", "destination", "dest_airport"),
    "crs_dep_time": ("crsdeptime", "crs_dep_time", "scheduled_departure"),
    "dep_time": ("deptime", "dep_time", "actual_departure"),
    "dep_delay": ("depdelay", "dep_delay", "departure_delay"),
    "crs_arr_time": ("crsarrtime", "crs_arr_time", "scheduled_arrival"),
    "arr_time": ("arrtime", "arr_time", "actual_arrival"),
    "arr_delay": ("arrdelay", "arr_delay", "arr_delay_minutes", "arrival_delay"),
    "cancelled": ("cancelled", "canceled", "cancelled_flag"),
    "diverted": ("diverted", "diverted_flag"),
    "air_time": ("airtime", "air_time"),
    "distance": ("distance", "distance_miles"),
    "carrier_delay": ("carrierdelay", "carrier_delay"),
    "weather_delay": ("weatherdelay", "weather_delay"),
    "nas_delay": ("nasdelay", "nas_delay"),
    "late_aircraft_delay": ("lateaircraftdelay", "late_aircraft_delay"),
}


def normalized_headers(headers: list[str]) -> dict[str, str]:
    return {re.sub(r"[^a-z0-9]", "", header.lower()): header for header in headers if header}


def find_column(headers: dict[str, str], field: str) -> str | None:
    for alias in ALIASES[field]:
        key = re.sub(r"[^a-z0-9]", "", alias.lower())
        if key in headers:
            return headers[key]
    return None


def field_value(row: dict[str, str | None], columns: dict[str, str | None], field: str) -> str:
    column = columns.get(field)
    value = row.get(column, "") if column else ""
    return (value or "").strip()


def number(value: str, default: float = 0) -> float:
    if not value or value.upper() in {"NA", "N/A", "NULL", "NONE", "NAN"}:
        return default
    try:
        result = float(value)
    except ValueError:
        return default
    return result if result == result and abs(result) != float("inf") else default


def integer(value: str, default: int = 0) -> int:
    return int(number(value, default))


def flight_date(row: dict[str, str | None], columns: dict[str, str | None]) -> str:
    date = field_value(row, columns, "date")
    if date:
        return date[:10].replace("/", "-")
    year = integer(field_value(row, columns, "year"))
    month = integer(field_value(row, columns, "month"))
    day = integer(field_value(row, columns, "day"))
    if year and month and day:
        return f"{year:04d}-{month:02d}-{day:02d}"
    return ""


def normalized_flight(
    row: dict[str, str | None], columns: dict[str, str | None], record_id: str
) -> dict[str, Any] | None:
    carrier = field_value(row, columns, "carrier").upper()
    origin = field_value(row, columns, "origin").upper()
    dest = field_value(row, columns, "dest").upper()
    date = flight_date(row, columns)
    if not carrier or not origin or not dest or not date:
        return None

    cancelled = int(number(field_value(row, columns, "cancelled"))) != 0
    diverted = int(number(field_value(row, columns, "diverted"))) != 0
    arr_delay = number(field_value(row, columns, "arr_delay"))
    if cancelled:
        severity = 4
        status = "CANCELLED"
    elif diverted:
        severity = 4
        status = "DIVERTED"
    elif arr_delay <= 0:
        severity = 0
        status = "ON_TIME"
    elif arr_delay <= 15:
        severity = 1
        status = "MINOR_DELAY"
    elif arr_delay <= 45:
        severity = 2
        status = "MODERATE_DELAY"
    else:
        severity = 3
        status = "SEVERE_DELAY"

    def optional_int(field: str) -> int:
        return integer(field_value(row, columns, field))

    return {
        "record_id": record_id,
        "fl_date": date,
        "carrier": carrier,
        "carrier_name": CARRIER_NAMES.get(carrier, carrier),
        "flight_num": optional_int("flight_num"),
        "origin": origin,
        "dest": dest,
        "crs_dep_time": optional_int("crs_dep_time"),
        "dep_time": optional_int("dep_time"),
        "dep_delay": round(number(field_value(row, columns, "dep_delay"))),
        "crs_arr_time": optional_int("crs_arr_time"),
        "arr_time": optional_int("arr_time"),
        "arr_delay": round(arr_delay),
        "cancelled": int(cancelled),
        "diverted": int(diverted),
        "air_time": round(number(field_value(row, columns, "air_time"))),
        "distance": round(number(field_value(row, columns, "distance"))),
        "carrier_delay": round(number(field_value(row, columns, "carrier_delay"))),
        "weather_delay": round(number(field_value(row, columns, "weather_delay"))),
        "nas_delay": round(number(field_value(row, columns, "nas_delay"))),
        "late_aircraft_delay": round(number(field_value(row, columns, "late_aircraft_delay"))),
        "delay_severity_class": severity,
        "status": status,
    }


def process_file(
    source: Path,
    sample: list[dict[str, Any]],
    sample_limit: int,
    rng: random.Random,
    counts: Counter[str],
    bucket_counts: list[int],
    carrier_stats: dict[str, list[int]],
    row_number: int,
) -> int:
    with source.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if not reader.fieldnames:
            raise ValueError(f"No CSV header found in {source}")
        headers = normalized_headers(reader.fieldnames)
        columns = {field: find_column(headers, field) for field in ALIASES}
        required = ["carrier", "flight_num", "origin", "dest", "arr_delay"]
        missing = [field for field in required if columns[field] is None]
        has_date_parts = all(columns[field] is not None for field in ("year", "month", "day"))
        if columns["date"] is None and not has_date_parts:
            missing.append("date or year/month/day")
        if missing:
            raise ValueError(f"{source.name} is missing required columns: {', '.join(missing)}")

        for row in reader:
            row_number += 1
            flight = normalized_flight(row, columns, f"kaggle-{row_number}")
            if flight is None:
                counts["invalid_rows"] += 1
                continue
            counts["flights"] += 1
            bucket_counts[flight["delay_severity_class"] if flight["delay_severity_class"] < 4 else 4] += 1
            carrier = flight["carrier"]
            if carrier not in carrier_stats:
                carrier_stats[carrier] = [0, 0, 0]
            carrier_stats[carrier][0] += 1
            carrier_stats[carrier][1] += int(flight["arr_delay"] <= 0 and not flight["cancelled"])
            carrier_stats[carrier][2] += flight["arr_delay"]

            if len(sample) < sample_limit:
                sample.append(flight)
            elif sample_limit:
                index = rng.randrange(counts["flights"])
                if index < sample_limit:
                    sample[index] = flight
    return row_number


def write_json(path: Path, value: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, separators=(",", ":"), ensure_ascii=False)
        output.write("\n")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Stream Kaggle BTS airline-delay CSV files into a compact sample and full-dataset analytics."
    )
    parser.add_argument("source", type=Path, help="Extracted directory containing yearly CSV files")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sample-size", type=int, default=20000)
    args = parser.parse_args()

    if args.sample_size < 1:
        parser.error("--sample-size must be greater than zero")
    source_dir = args.source.resolve()
    if not source_dir.is_dir():
        parser.error(f"Source directory does not exist: {source_dir}")
    files = sorted(
        path
        for path in source_dir.rglob("*.csv")
        if path.is_file()
    )
    if not files:
        parser.error(f"No CSV files found under {source_dir}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    sample: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    bucket_counts = [0] * len(BUCKETS)
    carrier_stats: dict[str, list[int]] = {}
    row_number = 0
    rng = random.Random(20261008)

    try:
        for index, source in enumerate(files, start=1):
            print(f"[{index}/{len(files)}] Reading {source.name}", flush=True)
            row_number = process_file(
                source,
                sample,
                args.sample_size,
                rng,
                counts,
                bucket_counts,
                carrier_stats,
                row_number,
            )
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        return 1

    if not counts["flights"]:
        print("Import failed: no valid flight records were found.", file=sys.stderr)
        return 1

    for index, count in enumerate(bucket_counts):
        BUCKETS[index]["count"] = count
    carriers = []
    for carrier, (total, on_time, delay_sum) in carrier_stats.items():
        carriers.append(
            {
                "carrier": carrier,
                "total": total,
                "onTimePct": round(on_time / total * 100) if total else 0,
                "avgDelayMin": round(delay_sum / total) if total else 0,
            }
        )
    carriers.sort(key=lambda item: item["total"], reverse=True)
    summary = {
        "source": "Kaggle Airline Delay Analysis (Sherry)",
        "source_files": [file.name for file in files],
        "total_flights": counts["flights"],
        "invalid_rows": counts["invalid_rows"],
        "sampled_flights": len(sample),
        "delay_buckets": BUCKETS,
        "carrier_performance": carriers,
    }

    write_json(args.output_dir / "kaggle_flight_sample.json", sample)
    write_json(args.output_dir / "kaggle_flight_summary.json", summary)
    print(
        f"Imported {counts['flights']:,} flights from {len(files)} files; "
        f"saved {len(sample):,} searchable sample rows and full-dataset analytics."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
