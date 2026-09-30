import json
from fastapi.testclient import TestClient
from app.models.activity import ActivityTemplate, ActivityInstance
from app.models.finance import Transaction
from app.models.goal import Goal
from app.services.compare import calculate_sleep_hours_for_date

def test_goals_computed_progress(client: TestClient, db_session):
    # Retrieve DSA goal
    goals_res = client.get("/api/goals")
    assert goals_res.status_code == 200
    goals = goals_res.json()
    dsa_goal = next(g for g in goals if "DSA" in g["title"])
    assert dsa_goal["current_value"] == 0.0

    # Ensure instances on Oct 1
    client.get("/api/days/2026-10-01")

    # Find DSA instance on Oct 1
    day_res = client.get("/api/days/2026-10-01").json()
    dsa_inst = next(i for i in day_res["instances"] if i["title"] == "DSA")

    # Log 3 problems solved on DSA instance
    log_res = client.post(
        f"/api/instances/{dsa_inst['id']}/log",
        json={
            "status": "completed",
            "metric_value": 3.0,
            "duration_minutes": 60
        }
    )
    assert log_res.status_code == 200

    # Verify DSA goal progress updated automatically
    dsa_goal_after = client.get(f"/api/goals/{dsa_goal['id']}").json()
    assert dsa_goal_after["current_value"] == 3.0
    assert dsa_goal_after["progress_percent"] == 2.0  # 3 / 150 = 2%

    # Add income transaction and check income goal
    income_goal = next(g for g in goals if "Earn" in g["title"])
    assert income_goal["current_value"] == 0.0

    tx_res = client.post(
        "/api/transactions",
        json={
            "type": "income",
            "amount_paise": 250000, # Rs 2,500
            "category": "freelancing",
            "date": "2026-10-01",
            "note": "Client project milestone"
        }
    )
    assert tx_res.status_code == 201

    income_goal_after = client.get(f"/api/goals/{income_goal['id']}").json()
    assert income_goal_after["current_value"] == 250000.0
    assert income_goal_after["progress_percent"] == 25.0  # 2500 / 10000 = 25%

def test_sleep_duration_calculation(client: TestClient, db_session):
    client.get("/api/days/2026-10-01")
    client.get("/api/days/2026-10-02")

    # Oct 1 Sleep checkpoint: bedtime actual_start = 23:00
    day1 = client.get("/api/days/2026-10-01").json()
    sleep_inst = next(i for i in day1["instances"] if i["special_role"] == "bedtime")
    client.post(
        f"/api/instances/{sleep_inst['id']}/log",
        json={"status": "completed", "actual_start": "23:00"}
    )

    # Oct 2 Wake checkpoint: wake actual_start = 06:30
    day2 = client.get("/api/days/2026-10-02").json()
    wake_inst = next(i for i in day2["instances"] if i["special_role"] == "wake")
    client.post(
        f"/api/instances/{wake_inst['id']}/log",
        json={"status": "completed", "actual_start": "06:30"}
    )

    # Sleep hours on Oct 2 = wake(Oct 2) minus bedtime(Oct 1)
    # 23:00 to 06:30 = 7.5 hours
    sleep_hours = calculate_sleep_hours_for_date(db_session, "2026-10-02")
    assert sleep_hours == 7.5

    # If bedtime missing on Oct 2, Oct 3 sleep should be null
    sleep_hours_oct3 = calculate_sleep_hours_for_date(db_session, "2026-10-03")
    assert sleep_hours_oct3 is None

def test_compare_engine(client: TestClient):
    # Compare 3 days vs 7 days
    res = client.get("/api/compare?a_from=2026-10-01&a_to=2026-10-03&b_from=2026-10-01&b_to=2026-10-07")
    assert res.status_code == 200
    comp = res.json()
    assert comp["a"]["days_in_range"] == 3
    assert comp["b"]["days_in_range"] == 7
    # Should flag warning that ranges differ in length
    assert len(comp["warnings"]) > 0
    assert any("differ in length" in w for w in comp["warnings"])
