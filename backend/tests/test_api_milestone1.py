from fastapi.testclient import TestClient

def test_health(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_templates_api(client: TestClient):
    res = client.get("/api/templates")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 10
    titles = [t["title"] for t in templates]
    assert "Wake Up" in titles
    assert "DSA" in titles
    assert "Walking" in titles

def test_days_and_logging_flow(client: TestClient):
    # 1. Fetch Oct 1 day detail (should generate instances)
    res = client.get("/api/days/2026-10-01")
    assert res.status_code == 200
    day = res.json()
    assert day["date"] == "2026-10-01"
    assert day["day_info"]["day_number"] == 1
    assert len(day["instances"]) > 0

    first_inst = day["instances"][0]
    inst_id = first_inst["id"]

    # 2. Log first activity as completed
    log_res = client.post(
        f"/api/instances/{inst_id}/log",
        json={
            "status": "completed",
            "rating": 5,
            "notes": "Felt great!",
            "actual_start": "06:30",
            "actual_end": "07:00",
            "duration_minutes": 30
        }
    )
    assert log_res.status_code == 200
    assert log_res.json()["status"] == "completed"
    assert log_res.json()["rating"] == 5

    # 3. Resolve remaining pending items as skipped
    resolve_res = client.post(
        "/api/days/2026-10-01/resolve-pending",
        json={"status": "skipped"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["new_status"] == "skipped"

    # 4. Check day score again: since only 1 completed and rest skipped, score should be 100%!
    day_again = client.get("/api/days/2026-10-01").json()
    assert day_again["score"] == 100
    assert day_again["counts"]["completed"] == 1
    assert day_again["counts"]["skipped"] >= 1

    # 5. Save daily review
    review_res = client.put(
        "/api/days/2026-10-01/review",
        json={
            "went_well": "Started strong on Day 1",
            "went_wrong": "Nothing",
            "change_tomorrow": "Keep pace",
            "day_rating": 5,
            "is_rest_day": False,
            "close_day": True
        }
    )
    assert review_res.status_code == 200
    assert review_res.json()["day_rating"] == 5
    assert review_res.json()["closed_at"] is not None

def test_settings_api(client: TestClient):
    res = client.get("/api/settings")
    assert res.status_code == 200
    settings = res.json()
    assert settings["user_name"] == "Santhosh"
    assert settings["success_threshold"] == 70

    # Update settings
    update_res = client.put(
        "/api/settings",
        json={"success_threshold": 75, "reminder_minutes_before": 10}
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["success_threshold"] == 75
    assert updated["reminder_minutes_before"] == 10

def test_notifications_upcoming(client: TestClient):
    # Ensure instances for Oct 1
    client.get("/api/days/2026-10-01")

    res = client.get("/api/notifications/upcoming?date=2026-10-01")
    assert res.status_code == 200
    notifications = res.json()
    assert len(notifications) > 0
    # Notification items should have fire_at, reminder_type, title, body
    types = [n["reminder_type"] for n in notifications]
    assert "start" in types
