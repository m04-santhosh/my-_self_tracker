from datetime import date, timedelta
from app.models.activity import ActivityTemplate, ActivityInstance
from app.services.scheduler import (
    ensure_instances,
    sync_future_instances_on_template_edit,
    prune_future_pending_instances,
    format_date
)

def test_ensure_instances_idempotent(db_session):
    # Seeded templates exist from 2026-10-01
    created_first = ensure_instances(db_session, "2026-10-01", "2026-10-07")
    assert created_first > 0

    # Second run should insert 0 new instances
    created_second = ensure_instances(db_session, "2026-10-01", "2026-10-07")
    assert created_second == 0

def test_ensure_instances_respects_active_from_and_days(db_session):
    # 2026-10-01 is a Thursday (weekday 3)
    # 2026-10-03 is Saturday (weekday 5), 2026-10-04 is Sunday (weekday 6)
    ensure_instances(db_session, "2026-10-01", "2026-10-07")

    # DSA is Mon-Fri ("0,1,2,3,4")
    dsa_tmpl = db_session.query(ActivityTemplate).filter(ActivityTemplate.title == "DSA").first()
    assert dsa_tmpl is not None

    # DSA should exist on Oct 1 (Thu), Oct 2 (Fri), Oct 5 (Mon), Oct 6 (Tue), Oct 7 (Wed)
    dsa_oct1 = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-01"
    ).first()
    assert dsa_oct1 is not None

    # DSA should NOT exist on Oct 3 (Saturday) or Oct 4 (Sunday)
    dsa_oct3 = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-03"
    ).first()
    assert dsa_oct3 is None

    # Before active_from: Oct 1 active_from -> should not generate for 2026-09-30
    ensure_instances(db_session, "2026-09-20", "2026-09-30")
    pre_inst = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-09-30"
    ).first()
    assert pre_inst is None

def test_template_edit_applies_only_to_future_pending_non_overridden(db_session):
    # Setup instances from Oct 1 to Oct 7
    ensure_instances(db_session, "2026-10-01", "2026-10-07")

    dsa_tmpl = db_session.query(ActivityTemplate).filter(ActivityTemplate.title == "DSA").first()

    # Simulate:
    # 1. Past instance on Oct 1: logged as completed
    inst_past = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-01"
    ).first()
    inst_past.status = "completed"
    inst_past.actual_start = "18:00"
    inst_past.duration_minutes = 60

    # 2. Future instance on Oct 5 (Monday): overridden by user to 20:00 - 21:00
    inst_oct5 = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-05"
    ).first()
    inst_oct5.planned_start = "20:00"
    inst_oct5.planned_end = "21:00"
    inst_oct5.overridden = True

    # 3. Future instance on Oct 6 (Tuesday): pending, not overridden
    inst_oct6 = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-06"
    ).first()
    assert inst_oct6.planned_start == "18:00"
    assert inst_oct6.overridden == False

    db_session.commit()

    # Now edit DSA template: change time to 17:00 - 18:00, title to "DSA Advanced", apply_from="2026-10-02"
    dsa_tmpl.title = "DSA Advanced"
    dsa_tmpl.start_time = "17:00"
    dsa_tmpl.end_time = "18:00"
    db_session.commit()

    sync_future_instances_on_template_edit(db_session, dsa_tmpl, apply_from_str="2026-10-02")

    # Verify:
    # Past instance on Oct 1 should NOT be touched
    db_session.refresh(inst_past)
    assert inst_past.title == "DSA"
    assert inst_past.planned_start == "18:00"
    assert inst_past.status == "completed"

    # Overridden instance on Oct 5 should NOT be touched
    db_session.refresh(inst_oct5)
    assert inst_oct5.title == "DSA"
    assert inst_oct5.planned_start == "20:00"
    assert inst_oct5.overridden == True

    # Future pending non-overridden on Oct 6 SHOULD be updated
    db_session.refresh(inst_oct6)
    assert inst_oct6.title == "DSA Advanced"
    assert inst_oct6.planned_start == "17:00"
    assert inst_oct6.planned_end == "18:00"

def test_template_pause_prunes_future_pending_only(db_session):
    ensure_instances(db_session, "2026-10-01", "2026-10-07")
    dsa_tmpl = db_session.query(ActivityTemplate).filter(ActivityTemplate.title == "DSA").first()

    # Mark Oct 1 as completed
    inst_oct1 = db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-01"
    ).first()
    inst_oct1.status = "completed"
    db_session.commit()

    # Pause template from Oct 2
    dsa_tmpl.is_paused = True
    db_session.commit()
    prune_future_pending_instances(db_session, dsa_tmpl.id, from_date_str="2026-10-02")

    # Completed Oct 1 should remain
    assert db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date == "2026-10-01"
    ).first() is not None

    # Future pending on Oct 2, Oct 5, etc. should be deleted
    assert db_session.query(ActivityInstance).filter(
        ActivityInstance.template_id == dsa_tmpl.id,
        ActivityInstance.date >= "2026-10-02"
    ).count() == 0
