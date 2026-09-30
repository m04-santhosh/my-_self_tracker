from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.activity import ActivityTemplate
from app.schemas.activity import (
    ActivityTemplateCreate,
    ActivityTemplateUpdate,
    ActivityTemplateResponse
)
from app.services.scheduler import (
    ensure_instances,
    sync_future_instances_on_template_edit,
    prune_future_pending_instances,
    format_date
)

router = APIRouter(prefix="/templates", tags=["templates"])

@router.get("", response_model=List[ActivityTemplateResponse])
def get_templates(include_archived: bool = False, db: Session = Depends(get_db)):
    query = db.query(ActivityTemplate)
    if not include_archived:
        query = query.filter(ActivityTemplate.is_archived == False)
    return query.order_by(ActivityTemplate.sort_order, ActivityTemplate.start_time).all()

@router.post("", response_model=ActivityTemplateResponse, status_code=201)
def create_template(tmpl_in: ActivityTemplateCreate, db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    now_iso = datetime.now().isoformat()
    active_from = tmpl_in.active_from or today_str

    template = ActivityTemplate(
        title=tmpl_in.title,
        description=tmpl_in.description,
        category=tmpl_in.category.value,
        kind=tmpl_in.kind.value,
        start_time=tmpl_in.start_time,
        end_time=tmpl_in.end_time,
        days_of_week=tmpl_in.days_of_week,
        active_from=active_from,
        active_until=tmpl_in.active_until,
        is_paused=False,
        is_archived=False,
        metric_name=tmpl_in.metric_name,
        metric_unit=tmpl_in.metric_unit,
        counts_as=tmpl_in.counts_as.value,
        special_role=tmpl_in.special_role.value,
        notify=tmpl_in.notify,
        ask_on_end=tmpl_in.ask_on_end,
        sort_order=tmpl_in.sort_order,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    # Immediately ensure instances up to today + 7
    from datetime import timedelta
    horizon_str = format_date(date.today() + timedelta(days=7))
    ensure_instances(db, active_from, horizon_str)

    return template

@router.get("/{id}", response_model=ActivityTemplateResponse)
def get_template(id: int, db: Session = Depends(get_db)):
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch("/{id}", response_model=ActivityTemplateResponse)
def update_template(id: int, update_in: ActivityTemplateUpdate, db: Session = Depends(get_db)):
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    today_str = format_date(date.today())
    apply_from = update_in.apply_from or today_str
    now_iso = datetime.now().isoformat()

    # Update template attributes
    update_data = update_in.model_dump(exclude_unset=True, exclude={"apply_from"})
    for key, value in update_data.items():
        if hasattr(template, key):
            # Convert enum to value if needed
            val_to_set = value.value if hasattr(value, "value") else value
            setattr(template, key, val_to_set)

    template.updated_at = now_iso
    db.commit()
    db.refresh(template)

    # Domain rule: PATCH applies ONLY to FUTURE instances (date >= apply_from, status pending, overridden=False)
    sync_future_instances_on_template_edit(db, template, apply_from)

    return template

@router.delete("/{id}", response_model=ActivityTemplateResponse)
def delete_template(id: int, db: Session = Depends(get_db)):
    """Delete on template = archive (soft delete)"""
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    today_str = format_date(date.today())
    now_iso = datetime.now().isoformat()

    template.is_archived = True
    template.updated_at = now_iso
    db.commit()
    db.refresh(template)

    # Prune future pending non-overridden instances
    prune_future_pending_instances(db, template.id, today_str)

    return template

@router.post("/{id}/duplicate", response_model=ActivityTemplateResponse, status_code=201)
def duplicate_template(id: int, db: Session = Depends(get_db)):
    source = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Template not found")

    today_str = format_date(date.today())
    now_iso = datetime.now().isoformat()

    clone = ActivityTemplate(
        title=f"{source.title} (Copy)",
        description=source.description,
        category=source.category,
        kind=source.kind,
        start_time=source.start_time,
        end_time=source.end_time,
        days_of_week=source.days_of_week,
        active_from=today_str,
        active_until=source.active_until,
        is_paused=False,
        is_archived=False,
        metric_name=source.metric_name,
        metric_unit=source.metric_unit,
        counts_as=source.counts_as,
        special_role=source.special_role,
        notify=source.notify,
        ask_on_end=source.ask_on_end,
        sort_order=source.sort_order + 1,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)

    from datetime import timedelta
    horizon_str = format_date(date.today() + timedelta(days=7))
    ensure_instances(db, today_str, horizon_str)

    return clone

@router.post("/{id}/pause", response_model=ActivityTemplateResponse)
def pause_template(id: int, db: Session = Depends(get_db)):
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    today_str = format_date(date.today())
    now_iso = datetime.now().isoformat()

    template.is_paused = True
    template.updated_at = now_iso
    db.commit()
    db.refresh(template)

    # Pausing deletes future pending non-overridden instances
    prune_future_pending_instances(db, template.id, today_str)

    return template

@router.post("/{id}/resume", response_model=ActivityTemplateResponse)
def resume_template(id: int, db: Session = Depends(get_db)):
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    today_str = format_date(date.today())
    now_iso = datetime.now().isoformat()

    template.is_paused = False
    template.updated_at = now_iso
    db.commit()
    db.refresh(template)

    # Resuming regenerates future instances
    from datetime import timedelta
    horizon_str = format_date(date.today() + timedelta(days=7))
    ensure_instances(db, today_str, horizon_str)

    return template
