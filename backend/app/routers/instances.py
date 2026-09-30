from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.activity import ActivityInstance
from app.schemas.activity import (
    ActivityInstanceCreateOneOff,
    ActivityInstanceUpdatePlan,
    ActivityInstanceLog,
    ActivityInstanceResponse
)
from app.services.scheduler import ensure_instances, format_date

router = APIRouter(prefix="/instances", tags=["instances"])

@router.get("", response_model=List[ActivityInstanceResponse])
def get_instances(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    f_date = from_date or today_str
    t_date = to_date or today_str

    # Ensure instances are generated for this range
    ensure_instances(db, f_date, t_date)

    query = db.query(ActivityInstance).filter(
        ActivityInstance.date >= f_date,
        ActivityInstance.date <= t_date
    )
    return query.order_by(ActivityInstance.date, ActivityInstance.planned_start).all()

@router.post("", response_model=ActivityInstanceResponse, status_code=201)
def create_one_off_instance(
    inst_in: ActivityInstanceCreateOneOff,
    db: Session = Depends(get_db)
):
    now_iso = datetime.now().isoformat()
    inst = ActivityInstance(
        template_id=None,
        date=inst_in.date,
        title=inst_in.title,
        description=inst_in.description,
        category=inst_in.category.value,
        kind=inst_in.kind.value,
        planned_start=inst_in.planned_start,
        planned_end=inst_in.planned_end,
        metric_name=inst_in.metric_name,
        metric_unit=inst_in.metric_unit,
        counts_as=inst_in.counts_as.value,
        special_role=inst_in.special_role.value,
        notify=inst_in.notify,
        ask_on_end=inst_in.ask_on_end,
        overridden=False,
        status="pending",
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst

@router.patch("/{id}", response_model=ActivityInstanceResponse)
def update_instance_plan(
    id: int,
    update_in: ActivityInstanceUpdatePlan,
    db: Session = Depends(get_db)
):
    inst = db.query(ActivityInstance).filter(ActivityInstance.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Activity instance not found")

    now_iso = datetime.now().isoformat()
    update_data = update_in.model_dump(exclude_unset=True)

    for k, v in update_data.items():
        if hasattr(inst, k):
            val_to_set = v.value if hasattr(v, "value") else v
            setattr(inst, k, val_to_set)

    # Editing a single instance's planned attributes sets overridden=True
    inst.overridden = True
    inst.updated_at = now_iso

    db.commit()
    db.refresh(inst)
    return inst

@router.post("/{id}/log", response_model=ActivityInstanceResponse)
def log_instance(
    id: int,
    log_in: ActivityInstanceLog,
    db: Session = Depends(get_db)
):
    inst = db.query(ActivityInstance).filter(ActivityInstance.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Activity instance not found")

    now_iso = datetime.now().isoformat()

    # Calculate default duration if not provided and actuals or planned available
    duration = log_in.duration_minutes
    if duration is None:
        if log_in.actual_start and log_in.actual_end:
            try:
                def to_minutes(t_str: str) -> int:
                    parts = t_str.split(":")
                    return int(parts[0]) * 60 + int(parts[1])
                duration = max(0, to_minutes(log_in.actual_end) - to_minutes(log_in.actual_start))
            except Exception:
                duration = None
        elif inst.planned_start and inst.planned_end:
            try:
                def to_minutes(t_str: str) -> int:
                    parts = t_str.split(":")
                    return int(parts[0]) * 60 + int(parts[1])
                duration = max(0, to_minutes(inst.planned_end) - to_minutes(inst.planned_start))
            except Exception:
                duration = None

    inst.status = log_in.status.value
    inst.rating = log_in.rating
    inst.notes = log_in.notes
    inst.actual_start = log_in.actual_start
    inst.actual_end = log_in.actual_end
    inst.duration_minutes = duration
    inst.metric_value = log_in.metric_value
    inst.logged_at = now_iso
    inst.updated_at = now_iso

    db.commit()
    db.refresh(inst)
    return inst

@router.delete("/{id}", status_code=204)
def delete_instance(id: int, db: Session = Depends(get_db)):
    inst = db.query(ActivityInstance).filter(ActivityInstance.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Activity instance not found")

    # Only one-offs or unlogged (pending) instances can be deleted
    if inst.template_id is not None and inst.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a logged instance of a recurring template. You can set status to skipped or unlog it."
        )

    db.delete(inst)
    db.commit()
    return None
