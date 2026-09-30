from datetime import datetime, date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.activity import ActivityTemplate, ActivityInstance

def parse_date(date_str: str) -> date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()

def format_date(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def ensure_instances(db: Session, from_date_str: str, to_date_str: str) -> int:
    """
    Idempotently ensures instances exist for all active templates in [from_date, to_date].
    Respects active_from, active_until, is_paused, is_archived, days_of_week.
    Returns count of newly created instances.
    """
    from_date = parse_date(from_date_str)
    to_date = parse_date(to_date_str)
    if from_date > to_date:
        return 0

    templates = db.query(ActivityTemplate).filter(
        ActivityTemplate.is_archived == False,
        ActivityTemplate.is_paused == False
    ).all()

    created_count = 0
    now_iso = datetime.now().isoformat()

    # Pre-fetch existing (template_id, date) tuples for the range to avoid N*M queries
    existing_tuples = set(
        db.query(ActivityInstance.template_id, ActivityInstance.date)
        .filter(
            ActivityInstance.template_id.isnot(None),
            ActivityInstance.date >= from_date_str,
            ActivityInstance.date <= to_date_str
        ).all()
    )

    curr = from_date
    delta = timedelta(days=1)

    while curr <= to_date:
        curr_str = format_date(curr)
        weekday = curr.weekday() # 0 = Monday, 6 = Sunday

        for tmpl in templates:
            tmpl_active_from = parse_date(tmpl.active_from)
            if curr < tmpl_active_from:
                continue
            if tmpl.active_until:
                tmpl_active_until = parse_date(tmpl.active_until)
                if curr > tmpl_active_until:
                    continue

            allowed_days = [int(d.strip()) for d in tmpl.days_of_week.split(",") if d.strip()]
            if weekday not in allowed_days:
                continue

            if (tmpl.id, curr_str) in existing_tuples:
                continue

            # Create snapshot instance
            inst = ActivityInstance(
                template_id=tmpl.id,
                date=curr_str,
                title=tmpl.title,
                description=tmpl.description,
                category=tmpl.category,
                kind=tmpl.kind,
                planned_start=tmpl.start_time,
                planned_end=tmpl.end_time,
                metric_name=tmpl.metric_name,
                metric_unit=tmpl.metric_unit,
                counts_as=tmpl.counts_as,
                special_role=tmpl.special_role,
                notify=tmpl.notify,
                ask_on_end=tmpl.ask_on_end,
                overridden=False,
                status="pending",
                created_at=now_iso,
                updated_at=now_iso,
            )
            db.add(inst)
            existing_tuples.add((tmpl.id, curr_str))
            created_count += 1

        curr += delta

    if created_count > 0:
        db.commit()

    return created_count

def sync_future_instances_on_template_edit(
    db: Session,
    template: ActivityTemplate,
    apply_from_str: str,
    horizon_days: int = 7
):
    """
    Applies template edits ONLY to future pending non-overridden instances (date >= apply_from_str).
    Past instances and overridden/logged instances are NEVER modified.
    Mismatched days are pruned, updated fields are synced, and newly eligible days are generated.
    """
    apply_from = parse_date(apply_from_str)
    horizon_date = apply_from + timedelta(days=horizon_days)
    horizon_str = format_date(horizon_date)

    now_iso = datetime.now().isoformat()
    allowed_weekdays = {int(d.strip()) for d in template.days_of_week.split(",") if d.strip()}

    # Find future pending non-overridden instances
    future_instances = db.query(ActivityInstance).filter(
        ActivityInstance.template_id == template.id,
        ActivityInstance.date >= apply_from_str,
        ActivityInstance.status == "pending",
        ActivityInstance.overridden == False
    ).all()

    for inst in future_instances:
        inst_date = parse_date(inst.date)
        # Check active_until
        if template.active_until and inst_date > parse_date(template.active_until):
            db.delete(inst)
            continue
        # Check active_from
        if inst_date < parse_date(template.active_from):
            db.delete(inst)
            continue
        # Check weekday mismatch
        if inst_date.weekday() not in allowed_weekdays:
            db.delete(inst)
            continue

        # Update snapshot values
        inst.title = template.title
        inst.description = template.description
        inst.category = template.category
        inst.kind = template.kind
        inst.planned_start = template.start_time
        inst.planned_end = template.end_time
        inst.metric_name = template.metric_name
        inst.metric_unit = template.metric_unit
        inst.counts_as = template.counts_as
        inst.special_role = template.special_role
        inst.notify = template.notify
        inst.ask_on_end = template.ask_on_end
        inst.updated_at = now_iso

    db.commit()

    # Re-run ensure_instances up to horizon to generate newly matched weekdays
    if not template.is_paused and not template.is_archived:
        ensure_instances(db, apply_from_str, horizon_str)

def prune_future_pending_instances(db: Session, template_id: int, from_date_str: str):
    """
    Used when pausing or archiving a template:
    Deletes future pending non-overridden instances.
    Logged or overridden instances are preserved.
    """
    db.query(ActivityInstance).filter(
        ActivityInstance.template_id == template_id,
        ActivityInstance.date >= from_date_str,
        ActivityInstance.status == "pending",
        ActivityInstance.overridden == False
    ).delete(synchronize_session=False)
    db.commit()
