#!/usr/bin/env python3
"""AeroRoute AI - Delay-severity model training pipeline (XGBoost + Random Forest).

Trains real tree-ensemble classifiers on the bundled/downloaded flight and weather
data and exports:

  * models/xgboost_model.json        portable gradient-boosted trees (Node inference)
  * models/random_forest_model.json  portable random-forest trees (Node inference)
  * models/feature_lookup.json       historical-rate lookups used by the Node engine
  * models/model_registry.json       model selection + comparison metadata
  * models/model_metrics.json        real held-out evaluation metrics
  * models/feature_schema.json       real feature statistics
  * models/*.joblib                  native scikit-learn / xgboost artifacts
  * data/processed/training_data_summary.json  dataset shape + class balance

Usage (from the project root):

    python scripts/train_delay_model.py
    python scripts/train_delay_model.py --sample-rows 120000 \
        --flights data/raw/flights/On_Time_Reporting_Carrier_On_Time_Performance_\(1987_present\)_2024_1.csv \
        --weather data/raw/weather/metar_asos_2024_01.csv
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FLIGHTS = PROJECT_ROOT / "data" / "raw" / "flights"
DEFAULT_WEATHER = PROJECT_ROOT / "data" / "raw" / "weather" / "metar_asos_2024_01.csv"
DEFAULT_AIRPORTS = PROJECT_ROOT / "data" / "raw" / "airports" / "airports.json"
DEFAULT_ACTIVITY = PROJECT_ROOT / "data" / "processed" / "airport_activity.json"
DEFAULT_MODELS_DIR = PROJECT_ROOT / "models"
DEFAULT_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

CLASSES = [
    {"class_id": 0, "label": "On-Time / Early (<= 0 min)", "code": "ON_TIME"},
    {"class_id": 1, "label": "Minor Delay (1-15 min)", "code": "MINOR_DELAY"},
    {"class_id": 2, "label": "Moderate Delay (16-45 min)", "code": "MODERATE_DELAY"},
    {"class_id": 3, "label": "Severe Delay (> 45 min)", "code": "SEVERE_DELAY"},
    {"class_id": 4, "label": "Cancelled / Diverted", "code": "CANCELLED_DIVERTED"},
]
CLASS_LABELS = ["On-Time", "Minor", "Moderate", "Severe", "Cancelled"]

FEATURES = [
    "origin_delay_rate",
    "dest_delay_rate",
    "carrier_delay_rate",
    "carrier_weather_rate",
    "carrier_nas_rate",
    "carrier_late_aircraft_rate",
    "route_delay_rate",
    "departure_hour_utc",
    "day_of_week",
    "scheduled_distance_nm",
    "origin_weather_risk",
    "dest_weather_risk",
    "origin_congestion_index",
    "dest_congestion_index",
    "origin_ifr_rate",
    "dest_ifr_rate",
]

CARRIER_NAMES = {
    "AA": "American Airlines", "AS": "Alaska Airlines", "B6": "JetBlue Airways",
    "DL": "Delta Air Lines", "F9": "Frontier Airlines", "G4": "Allegiant Air",
    "HA": "Hawaiian Airlines", "NK": "Spirit Airlines", "UA": "United Airlines",
    "WN": "Southwest Airlines", "OO": "SkyWest Airlines", "9E": "Endeavor Air",
    "YX": "Republic Airways", "MQ": "Envoy Air", "OH": "PSA Airlines",
}


def log(message: str) -> None:
    print(f"[train] {message}", flush=True)


def _find_flight_csv(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    if DEFAULT_FLIGHTS.is_dir():
        csvs = sorted(DEFAULT_FLIGHTS.glob("On_Time_Reporting_Carrier_*.csv"))
        if csvs:
            return csvs[-1]
    raise SystemExit("No flight CSV found. Pass --flights <path/to/on_time.csv>")


def normalize_station(station: str) -> str:
    station = str(station).strip().upper()
    if len(station) == 4 and station.startswith("K"):
        return station[1:]
    return station


def weather_risk_from_metar(metar: str) -> int:
    text = (metar or "").upper()
    if re.search(r"\b(RA|SN|TS|FG|BR|DZ|GR|FZ|SH|HZ|FU|BLSN|VCTS)\b", text):
        return 25
    return 0


def build_weather_frame(weather_path: Path) -> pd.DataFrame:
    w = pd.read_csv(weather_path)
    w["iata"] = w["station"].map(normalize_station)
    w["valid_utc"] = pd.to_datetime(w["valid"], utc=True, errors="coerce")
    for col in ("tmpf", "dwpf", "sknt", "gust", "vsby", "drct", "alti", "skyl1"):
        w[col] = pd.to_numeric(w[col], errors="coerce")

    wind_risk = np.minimum(100, w["sknt"].fillna(0) * 2.5 + w["gust"].fillna(0) * 1.5)
    vis_risk = np.where(w["vsby"].fillna(10) < 3, 80, np.where(w["vsby"].fillna(10) < 5, 45, 10))
    ceiling_risk = np.where(w["skyl1"].fillna(25000) < 1000, 90, np.where(w["skyl1"].fillna(25000) < 3000, 50, 15))
    phenomena = w["metar"].fillna("").map(weather_risk_from_metar).to_numpy()
    w["composite_risk"] = (
        0.35 * wind_risk + 0.25 * vis_risk + 0.25 * ceiling_risk + 0.15 * phenomena
    ).clip(0, 100).round(2)
    w["ifr_flag"] = (w["composite_risk"] >= 50).astype(int)
    w = w.dropna(subset=["valid_utc"])
    return w[["iata", "valid_utc", "composite_risk", "ifr_flag"]].sort_values("valid_utc").reset_index(drop=True)


def load_flights(csv_path: Path, sample_rows: int) -> pd.DataFrame:
    usecols = [
        "FlightDate", "DayOfWeek", "Reporting_Airline", "IATA_CODE_Reporting_Airline",
        "Flight_Number_Reporting_Airline", "Origin", "OriginCityName", "Dest", "DestCityName",
        "CRSDepTime", "CRSArrTime", "DepDelay", "ArrDelay", "ArrDelayMinutes",
        "Cancelled", "Diverted", "AirTime", "Distance",
        "CarrierDelay", "WeatherDelay", "NASDelay", "SecurityDelay", "LateAircraftDelay",
    ]
    log(f"Reading flights: {csv_path.name}")
    df = pd.read_csv(csv_path, usecols=lambda c: c in usecols, low_memory=False)
    log(f"Loaded {len(df):,} raw flight rows x {df.shape[1]} columns")
    if sample_rows and len(df) > sample_rows:
        df = df.sample(n=sample_rows, random_state=42).reset_index(drop=True)
        log(f"Sampled {len(df):,} rows for a faster training run")
    return df


def compute_utc(
    base_dates: pd.Series, hours: pd.Series, minutes: pd.Series, tz: pd.Series
) -> pd.Series:
    out = pd.Series(pd.NaT, index=base_dates.index, dtype="datetime64[ns, UTC]")
    offset = pd.to_timedelta(hours.astype(float), unit="h") + pd.to_timedelta(minutes.astype(float), unit="m")
    naive = pd.to_datetime(base_dates, errors="coerce") + offset
    for zone in tz.dropna().unique():
        mask = tz == zone
        try:
            localized = naive[mask].dt.tz_localize(
                ZoneInfo(zone), ambiguous="NaT", nonexistent="shift_forward"
            )
            out.loc[mask] = localized.dt.tz_convert("UTC")
        except Exception:  # noqa: BLE001
            continue
    return out


def enrich_flights(df: pd.DataFrame, airports: list[dict], weather: pd.DataFrame) -> pd.DataFrame:
    tz_map = {a["iata"]: a.get("timezone", "UTC") for a in airports}
    df = df.copy()
    df["carrier"] = df["IATA_CODE_Reporting_Airline"].fillna(df["Reporting_Airline"])
    df["origin"] = df["Origin"].astype(str).str.upper().str.strip()
    df["dest"] = df["Dest"].astype(str).str.upper().str.strip()
    df = df[df["origin"].str.len() == 3]
    df = df[df["dest"].str.len() == 3]

    dep_time = pd.to_numeric(df["CRSDepTime"], errors="coerce").fillna(0).astype(int) % 2400
    arr_time = pd.to_numeric(df["CRSArrTime"], errors="coerce").fillna(0).astype(int) % 2400
    dep_hour = (dep_time // 100).clip(0, 23)
    dep_min = dep_time % 100
    arr_hour = (arr_time // 100).clip(0, 23)
    arr_min = arr_time % 100

    origin_tz = df["origin"].map(tz_map).fillna("UTC")
    dest_tz = df["dest"].map(tz_map).fillna("UTC")
    df["dep_utc"] = compute_utc(df["FlightDate"], dep_hour, dep_min, origin_tz)
    arr_utc = compute_utc(df["FlightDate"], arr_hour, arr_min, dest_tz)
    # Overnight arrivals: if scheduled arrival precedes departure, roll to next day.
    roll = arr_utc < df["dep_utc"]
    arr_utc = arr_utc.where(~roll, arr_utc + pd.Timedelta(days=1))
    df["arr_utc"] = arr_utc

    # Per-flight nearest METAR match on departure (origin).
    origin_weather = weather.rename(columns={"iata": "origin", "composite_risk": "origin_weather_risk"})
    left = df[["origin", "dep_utc"]].reset_index().rename(columns={"index": "_idx"}).sort_values("dep_utc")
    matched = pd.merge_asof(
        left, origin_weather, left_on="dep_utc", right_on="valid_utc", by="origin",
        direction="nearest", tolerance=pd.Timedelta(hours=3),
    ).set_index("_idx")
    df["origin_weather_risk"] = matched["origin_weather_risk"]

    dest_weather = weather.rename(columns={"iata": "dest", "composite_risk": "dest_weather_risk"})
    left_d = df[["dest", "arr_utc"]].reset_index().rename(columns={"index": "_idx"}).sort_values("arr_utc")
    matched_d = pd.merge_asof(
        left_d, dest_weather, left_on="arr_utc", right_on="valid_utc", by="dest",
        direction="nearest", tolerance=pd.Timedelta(hours=3),
    ).set_index("_idx")
    df["dest_weather_risk"] = matched_d["dest_weather_risk"]

    # Fallbacks: monthly station mean, then global mean.
    station_mean = weather.groupby("iata")["composite_risk"].mean()
    global_weather = float(weather["composite_risk"].mean()) if len(weather) else 20.0
    df["origin_weather_risk"] = df["origin_weather_risk"].fillna(df["origin"].map(station_mean)).fillna(global_weather)
    df["dest_weather_risk"] = df["dest_weather_risk"].fillna(df["dest"].map(station_mean)).fillna(global_weather)

    df["departure_hour_utc"] = df["dep_utc"].dt.hour.fillna(dep_hour).astype(int)
    df["day_of_week"] = pd.to_numeric(df["DayOfWeek"], errors="coerce").fillna(1).astype(int)
    df["scheduled_distance_nm"] = pd.to_numeric(df["Distance"], errors="coerce").fillna(0.0)

    arr_delay = pd.to_numeric(df["ArrDelay"], errors="coerce")
    cancelled = pd.to_numeric(df["Cancelled"], errors="coerce").fillna(0).astype(int)
    diverted = pd.to_numeric(df["Diverted"], errors="coerce").fillna(0).astype(int)
    df["arr_delay"] = arr_delay.fillna(0)
    df["cancelled"] = cancelled
    df["diverted"] = diverted

    never_arrived = (cancelled == 1) | (diverted == 1)
    severity = np.select(
        [never_arrived, df["arr_delay"] <= 0, df["arr_delay"] <= 15, df["arr_delay"] <= 45],
        [4, 0, 1, 2],
        default=3,
    )
    df["delay_severity_class"] = severity.astype(int)
    df = df.dropna(subset=["dep_utc"])
    return df.reset_index(drop=True)


def build_rate_features(train: pd.DataFrame, full: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    global_rate = float(round(train["arr_delay"].clip(lower=0).mean(), 3))

    def mean_by(column: str) -> dict[str, float]:
        return (
            train.groupby(column)["arr_delay"].apply(lambda s: s.clip(lower=0).mean()).round(3).to_dict()
        )

    def mean_cause(column: str) -> dict[str, float]:
        return train.groupby("carrier")[column].mean().round(3).to_dict()

    origin_rate = mean_by("origin")
    dest_rate = mean_by("dest")
    carrier_rate = mean_by("carrier")
    carrier_weather = mean_cause("WeatherDelay")
    carrier_nas = mean_cause("NASDelay")
    carrier_late = mean_cause("LateAircraftDelay")

    train_pair = train.assign(_pair=train["origin"] + "|" + train["dest"])
    full_pair = full.assign(_pair=full["origin"] + "|" + full["dest"])
    pair_rate = (
        train_pair.groupby("_pair")["arr_delay"].apply(lambda s: s.clip(lower=0).mean()).round(3).to_dict()
    )

    out = full.copy()
    out["origin_delay_rate"] = out["origin"].map(origin_rate).fillna(global_rate)
    out["dest_delay_rate"] = out["dest"].map(dest_rate).fillna(global_rate)
    out["carrier_delay_rate"] = out["carrier"].map(carrier_rate).fillna(global_rate)
    out["carrier_weather_rate"] = out["carrier"].map(carrier_weather).fillna(0.0)
    out["carrier_nas_rate"] = out["carrier"].map(carrier_nas).fillna(0.0)
    out["carrier_late_aircraft_rate"] = out["carrier"].map(carrier_late).fillna(0.0)
    out["route_delay_rate"] = full_pair["_pair"].map(pair_rate).fillna(global_rate)
    lookup = {
        "global_delay_rate": global_rate,
        "origin_delay_rate": {k: float(v) for k, v in origin_rate.items()},
        "dest_delay_rate": {k: float(v) for k, v in dest_rate.items()},
        "carrier_delay_rate": {k: float(v) for k, v in carrier_rate.items()},
        "carrier_weather_rate": {k: float(v) for k, v in carrier_weather.items()},
        "carrier_nas_rate": {k: float(v) for k, v in carrier_nas.items()},
        "carrier_late_aircraft_rate": {k: float(v) for k, v in carrier_late.items()},
        "route_delay_rate": {k: float(v) for k, v in pair_rate.items()},
    }
    return out, lookup


def export_xgb_json(model: Any, path: Path) -> dict:
    """Export the booster using XGBoost's native layout so Node inference is exact.

    The native JSON stores each node's split index, split condition and leaf
    weight at full float32 precision together with ``tree_info`` (the class each
    tree contributes to), which avoids the precision loss of ``get_dump``.
    """
    booster = model.get_booster()
    native_tmp = path.parent / f"{path.stem}.native.json"
    booster.save_model(str(native_tmp))
    try:
        native = json.loads(native_tmp.read_text(encoding="utf-8"))
    finally:
        native_tmp.unlink(missing_ok=True)

    learner = native["learner"]
    gbtree = learner["gradient_booster"]["model"]
    base_raw = learner["learner_model_param"]["base_score"]
    try:
        base_scores = [float(x) for x in base_raw.strip("[]").split(",")]
    except ValueError:
        base_scores = [0.5]

    trees: list[list[dict]] = []
    tree_class: list[int] = []
    for raw_tree, cls in zip(gbtree["trees"], gbtree["tree_info"]):
        left = raw_tree["left_children"]
        right = raw_tree["right_children"]
        split_index = raw_tree["split_indices"]
        split_cond = raw_tree["split_conditions"]
        weights = raw_tree["base_weights"]
        nodes: list[dict] = []
        for node in range(len(left)):
            if left[node] == -1:
                nodes.append({"leaf": float(weights[node])})
            else:
                nodes.append({
                    "f": int(split_index[node]),
                    "t": float(split_cond[node]),
                    "l": int(left[node]),
                    "r": int(right[node]),
                })
        trees.append(nodes)
        tree_class.append(int(cls))

    num_class = len(CLASSES)
    payload = {
        "format": "xgboost",
        "objective": "multi:softprob",
        "num_class": num_class,
        "num_rounds": len(trees) // num_class,
        "learning_rate": float(model.get_params().get("learning_rate", 0.1)),
        "base_score": base_scores[0] if len(base_scores) == 1 else base_scores,
        "feature_names": FEATURES,
        "classes": [c["code"] for c in CLASSES],
        "tree_class": tree_class,
        "trees": trees,
    }
    _write_json(path, payload)
    return {"num_trees": len(trees), "bytes": path.stat().st_size, "base_score": payload["base_score"]}


def export_rf_json(model: Any, path: Path) -> dict:
    trees = []
    for estimator in model.estimators_:
        tree = estimator.tree_
        n_nodes = tree.node_count
        f = tree.feature.astype(int).tolist()
        t = [round(float(x), 6) for x in tree.threshold]
        left = tree.children_left.astype(int).tolist()
        right = tree.children_right.astype(int).tolist()
        values = [0.0] * n_nodes
        for node in range(n_nodes):
            if left[node] == -1:
                counts = tree.value[node][0]
                total = float(counts.sum()) or 1.0
                # Leaf scores are stored as class index for a single argmax value;
                # store the full normalized distribution encoded compactly.
                values[node] = (counts / total).tolist()  # type: ignore[assignment]
        trees.append({"f": f, "t": t, "l": left, "r": right, "v": values})
    payload = {
        "format": "random_forest",
        "num_class": len(CLASSES),
        "n_estimators": len(trees),
        "feature_names": FEATURES,
        "classes": [c["code"] for c in CLASSES],
        "trees": trees,
    }
    _write_json(path, payload)
    return {"num_trees": len(trees), "bytes": path.stat().st_size}


def _write_json(path: Path, value: Any, indent: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, indent=indent, separators=None if indent else (",", ":"), ensure_ascii=False)
        handle.write("\n")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train XGBoost + Random Forest delay models.")
    parser.add_argument("--flights", default=None, help="Path to the BTS on-time CSV")
    parser.add_argument("--weather", default=str(DEFAULT_WEATHER), help="Path to the METAR CSV/JSON")
    parser.add_argument("--sample-rows", type=int, default=0, help="Random row cap (0 = all)")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--models-dir", default=str(DEFAULT_MODELS_DIR))
    parser.add_argument("--all-airports", action="store_true", help="Train on all US airports instead of only network hubs")
    args = parser.parse_args()

    models_dir = Path(args.models_dir)
    flights_csv = _find_flight_csv(args.flights)
    weather_json = Path(args.weather)
    if weather_json.suffix.lower() == ".json":
        weather = pd.read_json(weather_json)
        weather = pd.DataFrame({
            "iata": weather["station"].map(normalize_station),
            "valid_utc": pd.to_datetime(weather["timestamp_utc"], utc=True, errors="coerce"),
            "composite_risk": weather["composite_risk_score"].astype(float),
        })
        weather["ifr_flag"] = (weather["composite_risk"] >= 50).astype(int)
    else:
        weather = build_weather_frame(weather_json)
    log(f"Weather observations: {len(weather):,} rows across {weather['iata'].nunique()} stations")

    airports = json.loads(DEFAULT_AIRPORTS.read_text(encoding="utf-8"))
    network_iata = {a["iata"] for a in airports}
    activity = json.loads(DEFAULT_ACTIVITY.read_text(encoding="utf-8")) if DEFAULT_ACTIVITY.exists() else []
    congestion_map = {a["airport"]: float(a["derived_congestion_index"]) for a in activity}
    global_congestion = float(np.mean(list(congestion_map.values()))) if congestion_map else 50.0

    raw = load_flights(flights_csv, args.sample_rows)
    data = enrich_flights(raw, airports, weather)
    if not args.all_airports:
        before = len(data)
        data = data[data["origin"].isin(network_iata) & data["dest"].isin(network_iata)]
        data = data.reset_index(drop=True)
        log(f"Restricted to network hubs: {before:,} -> {len(data):,} rows")
    data["origin_congestion_index"] = data["origin"].map(congestion_map).fillna(global_congestion)
    data["dest_congestion_index"] = data["dest"].map(congestion_map).fillna(global_congestion)
    ifr_by_airport = weather.groupby("iata")["ifr_flag"].mean().round(4).to_dict()
    global_ifr = float(weather["ifr_flag"].mean()) if len(weather) else 0.1
    data["origin_ifr_rate"] = data["origin"].map(ifr_by_airport).fillna(global_ifr)
    data["dest_ifr_rate"] = data["dest"].map(ifr_by_airport).fillna(global_ifr)
    log(f"Feature-ready rows: {len(data):,}")

    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import label_binarize
    from sklearn.utils.class_weight import compute_sample_weight
    from sklearn.metrics import (
        accuracy_score, balanced_accuracy_score, f1_score, log_loss,
        precision_score, recall_score, confusion_matrix, classification_report,
    )
    from xgboost import XGBClassifier

    labels = data["delay_severity_class"].to_numpy()
    strat = labels if np.bincount(labels, minlength=len(CLASSES)).min() >= 2 else None
    train_df, test_df = train_test_split(
        data, test_size=args.test_size, random_state=42, stratify=strat
    )
    train_df = train_df.reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)

    train_df, lookup = build_rate_features(train_df, train_df)
    test_df, _ = build_rate_features(train_df, test_df)

    X_train = train_df[FEATURES].astype(float).to_numpy()
    y_train = train_df["delay_severity_class"].to_numpy()
    X_test = test_df[FEATURES].astype(float).to_numpy()
    y_test = test_df["delay_severity_class"].to_numpy()
    log(f"Train: {X_train.shape[0]:,} rows | Test: {X_test.shape[0]:,} rows | Features: {len(FEATURES)}")

    log("Training XGBoost (gradient-boosted trees)...")
    xgb = XGBClassifier(
        n_estimators=300, max_depth=7, learning_rate=0.08, subsample=0.85,
        colsample_bytree=0.85, min_child_weight=4, reg_lambda=1.5,
        objective="multi:softprob", num_class=len(CLASSES),
        tree_method="hist", eval_metric="mlogloss", n_jobs=-1, random_state=42,
    )
    # Mild (square-root) class weighting: improves minority-class recall without
    # sacrificing too much overall accuracy on the dominant on-time class.
    class_weights = compute_sample_weight("balanced", y_train) ** 0.5
    xgb.fit(X_train, y_train, sample_weight=class_weights)

    log("Training Random Forest (bagged decision trees)...")
    rf = RandomForestClassifier(
        n_estimators=110, max_depth=11, min_samples_leaf=15,
        n_jobs=-1, random_state=42,
    )
    rf.fit(X_train, y_train, sample_weight=class_weights)

    def metrics_for(model: Any, name: str) -> dict:
        proba = model.predict_proba(X_test)
        pred = model.predict(X_test)
        cm = confusion_matrix(y_test, pred, labels=list(range(len(CLASSES)))).tolist()
        report = classification_report(
            y_test, pred, labels=list(range(len(CLASSES))), output_dict=True, zero_division=0
        )
        per_class = []
        for c in CLASSES:
            row = report.get(str(c["class_id"]), {})
            per_class.append({
                "class_id": c["class_id"], "label": c["label"],
                "precision": round(row.get("precision", 0.0), 3),
                "recall": round(row.get("recall", 0.0), 3),
                "f1": round(row.get("f1-score", 0.0), 3),
                "support": int(row.get("support", 0)),
            })
        y_bin = label_binarize(y_test, classes=list(range(len(CLASSES))))
        return {
            "model_name": name,
            "accuracy": round(float(accuracy_score(y_test, pred)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(y_test, pred)), 4),
            "macro_precision": round(float(precision_score(y_test, pred, average="macro", zero_division=0)), 4),
            "macro_recall": round(float(recall_score(y_test, pred, average="macro", zero_division=0)), 4),
            "macro_f1": round(float(f1_score(y_test, pred, average="macro", zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y_test, pred, average="weighted", zero_division=0)), 4),
            "log_loss": round(float(log_loss(y_test, proba, labels=list(range(len(CLASSES))))), 4),
            "confusion_matrix": cm,
            "per_class_metrics": per_class,
        }

    xgb_metrics = metrics_for(xgb, "XGBoost Gradient-Boosted Trees")
    rf_metrics = metrics_for(rf, "Random Forest (Bagged Trees)")
    log(f"XGBoost accuracy={xgb_metrics['accuracy']} macroF1={xgb_metrics['macro_f1']}")
    log(f"RandomForest accuracy={rf_metrics['accuracy']} macroF1={rf_metrics['macro_f1']}")

    gain = xgb.get_booster().get_score(importance_type="gain")
    xgb_importance = []
    total_gain = sum(gain.values()) or 1.0
    for i, feature in enumerate(FEATURES):
        value = gain.get(f"f{i}", 0.0) / total_gain
        xgb_importance.append({"feature": feature, "importance": round(float(value), 4)})
    xgb_importance.sort(key=lambda item: item["importance"], reverse=True)

    rf_importance = sorted(
        ({"feature": f, "importance": round(float(v), 4)} for f, v in zip(FEATURES, rf.feature_importances_)),
        key=lambda item: item["importance"], reverse=True,
    )

    active = "xgboost" if xgb_metrics["macro_f1"] >= rf_metrics["macro_f1"] else "random_forest"
    trained_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    registry = {
        "active_model": active,
        "trained_timestamp": trained_at,
        "trained_on_files": [flights_csv.name, Path(args.weather).name],
        "feature_names": FEATURES,
        "classes": [{"id": c["class_id"], "code": c["code"], "label": c["label"]} for c in CLASSES],
        "models": {
            "xgboost": {
                "display_name": "XGBoost Gradient-Boosted Trees",
                "file": "xgboost_model.json",
                "joblib": "xgboost_model.joblib",
                "metrics": xgb_metrics,
                "feature_importance": xgb_importance,
            },
            "random_forest": {
                "display_name": "Random Forest (Bagged Trees)",
                "file": "random_forest_model.json",
                "joblib": "random_forest_model.joblib",
                "metrics": rf_metrics,
                "feature_importance": rf_importance,
            },
        },
    }

    log("Exporting portable models...")
    xgb_info = export_xgb_json(xgb, models_dir / "xgboost_model.json")
    rf_info = export_rf_json(rf, models_dir / "random_forest_model.json")

    # Historical lookups consumed by the Node inference engine.
    station_mean = weather.groupby("iata")["composite_risk"].mean().round(3).to_dict()
    lookup.update({
        "weather_risk_by_airport": {k: float(v) for k, v in station_mean.items()},
        "ifr_rate_by_airport": {k: float(v) for k, v in ifr_by_airport.items()},
        "congestion_by_airport": congestion_map,
        "global_weather_risk": round(float(weather["composite_risk"].mean()), 3),
        "global_ifr_rate": round(global_ifr, 4),
        "global_congestion_index": round(global_congestion, 3),
        "feature_means": {f: round(float(train_df[f].mean()), 4) for f in FEATURES},
        "feature_mins": {f: round(float(train_df[f].min()), 4) for f in FEATURES},
        "feature_maxs": {f: round(float(train_df[f].max()), 4) for f in FEATURES},
        "feature_medians": {f: round(float(train_df[f].median()), 4) for f in FEATURES},
    })
    _write_json(models_dir / "feature_lookup.json", lookup)
    _write_json(models_dir / "model_registry.json", registry, indent=2)

    class_distribution = [
        {
            "class_id": c["class_id"], "name": CLASS_LABELS[c["class_id"]],
            "count": int((labels == c["class_id"]).sum()),
            "percentage": round(float((labels == c["class_id"]).mean() * 100), 1),
        }
        for c in CLASSES
    ]
    active_metrics = xgb_metrics if active == "xgboost" else rf_metrics
    model_metrics = {
        "model_name": registry["models"][active]["display_name"],
        "active_model": active,
        "version": "2.0.0",
        "trained_timestamp": trained_at,
        "training_sample_count": int(X_train.shape[0]),
        "validation_sample_count": int(X_test.shape[0]),
        "test_sample_count": int(X_test.shape[0]),
        "feature_count": len(FEATURES),
        "training_period": str(flights_csv.name),
        "split_strategy": f"Stratified random split ({int((1 - args.test_size) * 100)}/{int(args.test_size * 100)})",
        "overall_metrics": {
            "accuracy": active_metrics["accuracy"],
            "macro_precision": active_metrics["macro_precision"],
            "macro_recall": active_metrics["macro_recall"],
            "macro_f1": active_metrics["macro_f1"],
            "weighted_f1": active_metrics["weighted_f1"],
            "log_loss": active_metrics["log_loss"],
        },
        "class_distribution": class_distribution,
        "per_class_metrics": active_metrics["per_class_metrics"],
        "confusion_matrix": active_metrics["confusion_matrix"],
        "confusion_matrix_labels": CLASS_LABELS,
        "feature_importance": [
            {"feature": item["feature"], "importance": item["importance"]} for item in registry["models"][active]["feature_importance"]
        ],
        "model_comparison": {
            "xgboost": {
                "accuracy": xgb_metrics["accuracy"], "macro_f1": xgb_metrics["macro_f1"],
                "log_loss": xgb_metrics["log_loss"],
            },
            "random_forest": {
                "accuracy": rf_metrics["accuracy"], "macro_f1": rf_metrics["macro_f1"],
                "log_loss": rf_metrics["log_loss"],
            },
            "selected": active,
        },
        "baseline_comparison": {
            "baseline_majority_accuracy": round(float(max(class_distribution, key=lambda d: d["count"])["percentage"]) / 100, 4),
        },
    }
    _write_json(models_dir / "model_metrics.json", model_metrics, indent=2)

    schema_features = []
    descriptions = {
        "origin_delay_rate": "Historical mean departure delay (min) at origin hub, learned on the training split",
        "dest_delay_rate": "Historical mean arrival delay (min) at destination hub, learned on the training split",
        "carrier_delay_rate": "Historical mean arrival delay (min) for the operating carrier, learned on the training split",
        "carrier_weather_rate": "Carrier historical mean weather-attributed delay (min)",
        "carrier_nas_rate": "Carrier historical mean NAS/airspace-attributed delay (min)",
        "carrier_late_aircraft_rate": "Carrier historical mean late-aircraft (propagated) delay (min)",
        "route_delay_rate": "Historical mean arrival delay (min) for this specific origin-destination pair",
        "departure_hour_utc": "Scheduled departure hour in Coordinated Universal Time (0-23)",
        "day_of_week": "Day of week (1=Monday, 7=Sunday)",
        "scheduled_distance_nm": "Great-circle nautical miles between origin and destination",
        "origin_weather_risk": "Origin composite METAR severity index (0-100) matched to departure time",
        "dest_weather_risk": "Destination composite METAR severity index (0-100) matched to arrival time",
        "origin_congestion_index": "Origin hourly operations-to-capacity load factor (0-100)",
        "dest_congestion_index": "Destination hourly operations-to-capacity load factor (0-100)",
        "origin_ifr_rate": "Share of origin observations in degraded IMC/IFR conditions (0-1)",
        "dest_ifr_rate": "Share of destination observations in degraded IMC/IFR conditions (0-1)",
    }
    for f in FEATURES:
        schema_features.append({
            "name": f,
            "type": "float" if f not in ("departure_hour_utc", "day_of_week") else "int",
            "description": descriptions.get(f, f),
            "min": lookup["feature_mins"][f], "max": lookup["feature_maxs"][f], "mean": lookup["feature_means"][f],
        })
    schema = {
        "target": "delay_severity_class",
        "classes": CLASSES,
        "features": schema_features,
        "categorical_mappings": {"carrier": lookup["carrier_delay_rate"]},
        "data_source_files": [flights_csv.name, Path(args.weather).name],
    }
    _write_json(models_dir / "feature_schema.json", schema, indent=2)

    # Native artifacts for the Python FastAPI app.
    import joblib
    joblib.dump(xgb, models_dir / "xgboost_model.joblib")
    joblib.dump(rf, models_dir / "random_forest_model.joblib")

    summary = {
        "flight_file": flights_csv.name,
        "flight_rows": int(len(raw)),
        "flight_columns": int(raw.shape[1]),
        "weather_file": Path(args.weather).name,
        "weather_rows": int(len(weather)),
        "weather_columns": 12 if Path(args.weather).suffix.lower() == ".csv" else 5,
        "feature_ready_rows": int(len(data)),
        "feature_count": len(FEATURES),
        "train_rows": int(X_train.shape[0]),
        "test_rows": int(X_test.shape[0]),
        "carriers": int(data["carrier"].nunique()),
        "origin_airports": int(data["origin"].nunique()),
        "destination_airports": int(data["dest"].nunique()),
        "class_distribution": class_distribution,
    }
    _write_json(DEFAULT_PROCESSED_DIR / "training_data_summary.json", summary, indent=2)

    print("\n=== TRAINING COMPLETE ===")
    print(f"  Active model : {active} ({registry['models'][active]['display_name']})")
    print(f"  XGBoost      : acc={xgb_metrics['accuracy']} macroF1={xgb_metrics['macro_f1']} logloss={xgb_metrics['log_loss']}")
    print(f"  RandomForest : acc={rf_metrics['accuracy']} macroF1={rf_metrics['macro_f1']} logloss={rf_metrics['log_loss']}")
    print(f"  XGB trees    : {xgb_info['num_trees']} ({xgb_info['bytes']/1e6:.1f} MB)")
    print(f"  RF trees     : {rf_info['num_trees']} ({rf_info['bytes']/1e6:.1f} MB)")
    print(f"  Models dir   : {models_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
