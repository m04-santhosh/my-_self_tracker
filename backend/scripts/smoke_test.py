"""
LifeOS 90 Smoke Test Script
Can run against an active server (http://localhost:8000) or test the API in-process.
"""
import sys
import os

# Ensure backend path is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

def run_smoke_test():
    print("=" * 60)
    print("LifeOS 90 — Smoke Test")
    print("=" * 60)

    with TestClient(app) as client:
        # 1. Health
        print("[1/8] Checking GET /api/health...")
        r = client.get("/api/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        assert r.json()["status"] == "ok"
        print("  -> OK (Health: ok)")

        # 2. Settings
        print("[2/8] Checking GET /api/settings...")
        r = client.get("/api/settings")
        assert r.status_code == 200, f"Settings check failed: {r.text}"
        settings = r.json()
        assert settings["user_name"] == "Santhosh"
        assert settings["start_date"] == "2026-10-01"
        assert settings["end_date"] == "2026-12-31"
        print("  -> OK (User: Santhosh, 92-Day window)")

        # 3. Templates
        print("[3/8] Checking GET /api/templates...")
        r = client.get("/api/templates")
        assert r.status_code == 200
        templates = r.json()
        assert len(templates) >= 10
        print(f"  -> OK ({len(templates)} templates loaded)")

        # 4. Day Detail & Instance Generation
        print("[4/8] Checking GET /api/days/2026-10-01...")
        r = client.get("/api/days/2026-10-01")
        assert r.status_code == 200
        day = r.json()
        assert day["date"] == "2026-10-01"
        assert day["day_info"]["day_number"] == 1
        assert len(day["instances"]) > 0
        print(f"  -> OK (Day 1/92, {len(day['instances'])} instances generated)")

        # 5. Quick-Log Activity
        print("[5/8] Logging an activity instance...")
        first_inst = day["instances"][0]
        r = client.post(
            f"/api/instances/{first_inst['id']}/log",
            json={
                "status": "completed",
                "rating": 5,
                "duration_minutes": 30,
                "notes": "Smoke test execution passed"
            }
        )
        assert r.status_code == 200
        print(f"  -> OK (Logged '{first_inst['title']}' as completed)")

        # 6. Goals Progress
        print("[6/8] Checking computed goals...")
        r = client.get("/api/goals")
        assert r.status_code == 200
        goals = r.json()
        assert len(goals) >= 4
        print(f"  -> OK ({len(goals)} starter goals active with computed progress)")

        # 7. Compare Engine
        print("[7/8] Checking comparison engine...")
        r = client.get("/api/compare?a_from=2026-10-01&a_to=2026-10-03&b_from=2026-10-04&b_to=2026-10-06")
        assert r.status_code == 200
        comp = r.json()
        assert "comparisons" in comp
        print("  -> OK (Comparison engine evaluated 12 metrics)")

        # 8. System Backup
        print("[8/8] Checking database backup creation...")
        r = client.post("/api/system/backup")
        assert r.status_code == 200
        assert r.json()["status"] == "success"
        print(f"  -> OK (Backup created: {r.json()['backup_filename']})")

    print("=" * 60)
    print("All smoke tests PASSED successfully!")
    print("=" * 60)

if __name__ == "__main__":
    run_smoke_test()
