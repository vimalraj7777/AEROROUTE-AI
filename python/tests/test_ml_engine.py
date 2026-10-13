"""Unit tests for the deterministic delay-risk scoring engine."""
from app.services.ml_engine import MLEngine, ml_engine


def test_predict_returns_five_class_probabilities():
    result = ml_engine.predict({"origin": "JFK", "dest": "LAX", "carrier": "DL"})
    probs = result["classProbabilities"]
    assert len(probs) == 5
    assert abs(sum(p["probability"] for p in probs) - 1.0) < 0.05


def test_prediction_fields():
    result = ml_engine.predict({"origin": "JFK", "dest": "LAX", "carrier": "DL"})
    assert 0 <= result["predictedClassId"] <= 4
    assert 0 <= result["confidence"] <= 1
    assert result["statusCode"] in {
        "ON_TIME",
        "MINOR_DELAY",
        "MODERATE_DELAY",
        "SEVERE_DELAY",
        "CANCELLED_DIVERTED",
    }
    assert len(result["contributingFeatures"]) == 5


def test_defaults_when_optional_fields_missing():
    result = ml_engine.predict({"origin": "ORD", "dest": "DFW"})
    assert result["predictedLabel"]


def test_adverse_weather_raises_delay_probability():
    calm = ml_engine.predict(
        {"origin": "JFK", "dest": "LAX", "carrier": "DL",
         "origin_weather_risk": 5, "dest_weather_risk": 5,
         "origin_congestion_index": 20, "dest_congestion_index": 20}
    )
    severe = ml_engine.predict(
        {"origin": "JFK", "dest": "LAX", "carrier": "DL",
         "origin_weather_risk": 95, "dest_weather_risk": 95,
         "origin_congestion_index": 95, "dest_congestion_index": 95}
    )
    calm_ontime = calm["classProbabilities"][0]["probability"]
    severe_ontime = severe["classProbabilities"][0]["probability"]
    assert severe_ontime < calm_ontime


def test_engine_is_singleton_instance():
    assert isinstance(ml_engine, MLEngine)
