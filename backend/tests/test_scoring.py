from app.models.activity import ActivityInstance
from app.services.scoring import (
    compute_day_scores,
    compute_day_info,
)

def test_day_score_calculation():
    # 4 completed, 2 partial, 2 missed, 1 skipped, 2 pending
    instances = [
        ActivityInstance(status="completed"),
        ActivityInstance(status="completed"),
        ActivityInstance(status="completed"),
        ActivityInstance(status="completed"),
        ActivityInstance(status="partial"),
        ActivityInstance(status="partial"),
        ActivityInstance(status="missed"),
        ActivityInstance(status="missed"),
        ActivityInstance(status="skipped"),
        ActivityInstance(status="pending"),
        ActivityInstance(status="pending"),
    ]

    # For closed day:
    # completed=4, partial=2, missed=2
    # scored_denominator = 4 + 2 + 2 = 8
    # points = 4 + 0.5*2 = 5
    # score = (5 / 8) * 100 = 62.5 -> 62% or 63%
    score, live_progress, is_succ, counts = compute_day_scores(
        instances, is_closed=True, is_rest_day=False, success_threshold=70
    )

    assert counts["total"] == 11
    assert counts["completed"] == 4
    assert counts["partial"] == 2
    assert counts["missed"] == 2
    assert counts["skipped"] == 1
    assert counts["pending"] == 2
    assert score == 62 or score == 63
    assert is_succ is False

    # Live progress: denominator = non-skipped = 4 + 2 + 2 + 2 = 10
    # points = 5
    # live_progress = 5 / 10 = 50%
    assert live_progress == 50

def test_day_number_info():
    # Oct 1 2026 is Day 1 / 92
    d1 = compute_day_info("2026-10-01", "2026-10-01", "2026-12-31")
    assert d1["day_number"] == 1
    assert d1["total_days"] == 92
    assert d1["state"] == "active"
    assert d1["days_remaining"] == 91

    # Dec 31 2026 is Day 92 / 92
    d92 = compute_day_info("2026-12-31", "2026-10-01", "2026-12-31")
    assert d92["day_number"] == 92
    assert d92["state"] == "active"
    assert d92["days_remaining"] == 0

    # Before start date (Sep 30 2026)
    d_before = compute_day_info("2026-09-30", "2026-10-01", "2026-12-31")
    assert d_before["day_number"] is None
    assert d_before["state"] == "before"
    assert d_before["days_until_start"] == 1

    # After end date (Jan 1 2027)
    d_after = compute_day_info("2027-01-01", "2026-10-01", "2026-12-31")
    assert d_after["day_number"] is None
    assert d_after["state"] == "finished"

def test_rest_day_is_neutral():
    instances = [
        ActivityInstance(status="completed"),
        ActivityInstance(status="completed"),
    ]
    # Rest day: is_rest_day=True -> is_successful must be False (not counted as success or failure)
    score, live, is_succ, counts = compute_day_scores(
        instances, is_closed=True, is_rest_day=True, success_threshold=70
    )
    assert is_succ is False
