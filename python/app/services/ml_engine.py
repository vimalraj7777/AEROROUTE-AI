"""Deterministic delay-risk scoring engine (port of backend/mlEngine.ts)."""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from app import config
from app.services.data_service import data_service
from app.services.logger import add_log


def _js_round(value: float, decimals: int = 0) -> float:
    factor = 10 ** decimals
    return math.floor(value * factor + 0.5) / factor


class MLEngine:
    def __init__(self) -> None:
        self.classes = [
            {"id": 0, "label": "On-Time / Early (<= 0m)", "code": "ON_TIME"},
            {"id": 1, "label": "Minor Delay (1-15m)", "code": "MINOR_DELAY"},
            {"id": 2, "label": "Moderate Delay (16-45m)", "code": "MODERATE_DELAY"},
            {"id": 3, "label": "Severe Delay (> 45m)", "code": "SEVERE_DELAY"},
            {"id": 4, "label": "Cancelled / Diverted", "code": "CANCELLED_DIVERTED"},
        ]

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        origin = (payload.get("origin") or "").upper()
        dest = (payload.get("dest") or "").upper()
        carrier = (payload.get("carrier") or "").upper()

        origin_ap = data_service.get_airport_by_iata(origin)
        dest_ap = data_service.get_airport_by_iata(dest)

        origin_weather = payload.get("origin_weather_risk")
        if origin_weather is None:
            origin_weather = (origin_ap or {}).get("weather_risk", 15.0)
        dest_weather = payload.get("dest_weather_risk")
        if dest_weather is None:
            dest_weather = (dest_ap or {}).get("weather_risk", 15.0)
        origin_cong = payload.get("origin_congestion_index")
        if origin_cong is None:
            origin_cong = (origin_ap or {}).get("congestion_index", 45.0)
        dest_cong = payload.get("dest_congestion_index")
        if dest_cong is None:
            dest_cong = (dest_ap or {}).get("congestion_index", 45.0)

        distance = payload.get("scheduled_distance_nm")
        if distance is None:
            distance = 850 if (origin_ap and dest_ap) else 750
        dep_hour = payload.get("departure_hour_utc")
        if dep_hour is None:
            dep_hour = 14
        day_of_week = payload.get("day_of_week")
        if day_of_week is None:
            day_of_week = 3

        carrier_rate = config.CARRIER_BASE_RATES.get(carrier, 13.0)

        weather_factor = (origin_weather * 0.6 + dest_weather * 0.4) / 100.0
        congestion_factor = (origin_cong * 0.6 + dest_cong * 0.4) / 100.0
        temporal_factor = 0.35 if 16 <= dep_hour <= 21 else 0.08
        carrier_factor = carrier_rate / 30.0

        logits = [
            2.4 - 2.8 * weather_factor - 2.2 * congestion_factor - 1.2 * temporal_factor,
            0.8 + 0.9 * weather_factor + 1.2 * congestion_factor + 0.4 * carrier_factor,
            -0.2 + 1.8 * weather_factor + 1.6 * congestion_factor + 0.8 * temporal_factor,
            -1.4 + 2.7 * weather_factor + 2.1 * congestion_factor + 1.1 * temporal_factor,
            -2.8 + 3.2 * weather_factor + 0.8 * congestion_factor,
        ]

        exp_scores = [math.exp(v) for v in logits]
        sum_exp = sum(exp_scores)
        probs = [_js_round(v / sum_exp, 3) for v in exp_scores]

        max_prob = -1.0
        best_index = 0
        for idx, prob in enumerate(probs):
            if prob > max_prob:
                max_prob = prob
                best_index = idx

        chosen = self.classes[best_index]

        contributions = [
            {
                "feature": "origin_weather_risk",
                "displayName": f"{origin} Weather Severity",
                "impact": "increases_delay" if origin_weather > 40 else "reduces_delay",
                "weight": _js_round(origin_weather * 0.32, 1),
                "value": f"{origin_weather:.1f}/100",
            },
            {
                "feature": "origin_congestion_index",
                "displayName": f"{origin} Terminal Congestion",
                "impact": "increases_delay" if origin_cong > 60 else "neutral",
                "weight": _js_round(origin_cong * 0.28, 1),
                "value": f"{origin_cong:.1f}% load",
            },
            {
                "feature": "departure_hour_utc",
                "displayName": f"Departure Time ({dep_hour}:00 UTC)",
                "impact": "increases_delay" if dep_hour >= 16 else "reduces_delay",
                "weight": 18.5 if dep_hour >= 16 else -10.2,
                "value": f"{dep_hour}:00 UTC",
            },
            {
                "feature": "dest_weather_risk",
                "displayName": f"{dest} Arrival Meteorology",
                "impact": "increases_delay" if dest_weather > 40 else "neutral",
                "weight": _js_round(dest_weather * 0.22, 1),
                "value": f"{dest_weather:.1f}/100",
            },
            {
                "feature": "carrier_rate",
                "displayName": f"{carrier} Carrier Punctuality Rate",
                "impact": "increases_delay" if carrier_rate > 15 else "reduces_delay",
                "weight": _js_round((carrier_rate - 12) * 2.5, 1),
                "value": f"{carrier_rate:.1f}m avg",
            },
        ]

        add_log(
            "INFO",
            "ML",
            f"Predicted {chosen['code']} ({_js_round(max_prob * 100)}% conf) for {carrier} {origin}->{dest}",
        )

        return {
            "predictedClassId": chosen["id"],
            "predictedLabel": chosen["label"],
            "statusCode": chosen["code"],
            "confidence": _js_round(max_prob * 100) / 100,
            "classProbabilities": [
                {
                    "classId": c["id"],
                    "label": c["label"],
                    "code": c["code"],
                    "probability": probs[i],
                }
                for i, c in enumerate(self.classes)
            ],
            "contributingFeatures": contributions,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }


ml_engine = MLEngine()
