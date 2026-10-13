"""Integration tests for the REST API and server-rendered pages."""


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "operational"
    assert body["application"] == "AeroRoute AI"


def test_airports(client):
    body = client.get("/api/airports").json()
    assert body["count"] == len(body["airports"]) > 0


def test_weather_summary_and_station(client):
    summary = client.get("/api/weather/summary").json()
    assert summary["total_stations"] > 0
    station = client.get(f"/api/weather/{summary['observations'][0]['station']}").json()
    assert "composite_risk_score" in station


def test_weather_specific_routes_do_not_shadow(client):
    risk = client.get("/api/weather/risk/KJFK")
    assert risk.status_code == 200
    assert "breakdown" in risk.json()


def test_congestion_summary_and_detail(client):
    summary = client.get("/api/congestion/summary").json()
    assert summary["total_monitored_hubs"] > 0
    assert client.get("/api/congestion/ORD").status_code == 200


def test_flights_filters_and_detail(client):
    all_f = client.get("/api/flights").json()
    assert all_f["total_count"] >= 1
    record_id = all_f["flights"][0]["record_id"]
    detail = client.get(f"/api/flights/detail?record_id={record_id}").json()
    assert detail["flight"]["record_id"] == record_id


def test_network_graph(client):
    graph = client.get("/api/network/graph").json()
    assert graph["node_count"] == 21
    assert graph["edge_count"] == 60


def test_analytics_summary(client):
    body = client.get("/api/analytics/summary").json()
    assert len(body["delay_buckets"]) == 5
    assert body["airports_monitored"] > 0


def test_model_metrics_and_schema(client):
    assert client.get("/api/model/metrics").status_code == 200
    assert client.get("/api/model/schema").status_code == 200


def test_system_health_and_logs(client):
    health = client.get("/api/system/health").json()
    assert health["system_status"] in {"OPERATIONAL", "DEGRADED"}
    logs = client.get("/api/system/logs").json()
    assert "logs" in logs


def test_optimize_route_post(client):
    resp = client.post(
        "/api/routes/optimize",
        json={"origin": "JFK", "destination": "LAX", "algorithm": "astar"},
    )
    assert resp.status_code == 200
    rec = resp.json()["recommended"]
    assert rec["path"][0] == "JFK" and rec["path"][-1] == "LAX"


def test_optimize_route_requires_codes(client):
    assert client.post("/api/routes/optimize", json={}).status_code == 400


def test_predict_post(client):
    resp = client.post("/api/model/predict", json={"origin": "JFK", "dest": "LAX", "carrier": "DL"})
    assert resp.status_code == 200
    assert resp.json()["statusCode"]


def test_public_pages_render(client):
    for path in ["/", "/features", "/docs", "/about"]:
        resp = client.get(path)
        assert resp.status_code == 200
        assert "AeroRoute" in resp.text


def test_console_pages_render(client):
    for slug in [
        "dashboard", "network", "flights", "weather",
        "congestion", "analytics", "routes", "model", "system",
    ]:
        resp = client.get(f"/app/{slug}")
        assert resp.status_code == 200, slug
        assert "Modules" in resp.text


def test_unknown_api_returns_404(client):
    assert client.get("/api/does-not-exist").status_code == 404
