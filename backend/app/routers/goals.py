import json
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.goal import Goal, GoalEntry
from app.schemas.goal import (
    GoalCreate, GoalUpdate, GoalResponse,
    GoalEntryCreate, GoalEntryResponse
)
from app.services.goals import compute_goal_progress
from app.services.scheduler import format_date

router = APIRouter(prefix="/goals", tags=["goals"])

@router.get("", response_model=List[GoalResponse])
def get_goals(db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    goals = db.query(Goal).order_by(Goal.deadline).all()
    return [GoalResponse(**compute_goal_progress(db, g, today_str)) for g in goals]

@router.post("", response_model=GoalResponse, status_code=201)
def create_goal(goal_in: GoalCreate, db: Session = Depends(get_db)):
    now_iso = datetime.now().isoformat()
    today_str = format_date(date.today())

    income_cats_json = json.dumps(goal_in.income_categories) if goal_in.income_categories else None

    goal = Goal(
        title=goal_in.title,
        description=goal_in.description,
        category=goal_in.category.value,
        goal_type=goal_in.goal_type.value,
        linked_template_id=goal_in.linked_template_id,
        income_categories=income_cats_json,
        target_value=goal_in.target_value,
        unit=goal_in.unit,
        start_date=goal_in.start_date,
        deadline=goal_in.deadline,
        status=goal_in.status.value,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return GoalResponse(**compute_goal_progress(db, goal, today_str))

@router.get("/{id}", response_model=GoalResponse)
def get_goal(id: int, db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    goal = db.query(Goal).filter(Goal.id == id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return GoalResponse(**compute_goal_progress(db, goal, today_str))

@router.patch("/{id}", response_model=GoalResponse)
def update_goal(id: int, update_in: GoalUpdate, db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    goal = db.query(Goal).filter(Goal.id == id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    now_iso = datetime.now().isoformat()
    data = update_in.model_dump(exclude_unset=True)

    if "income_categories" in data:
        data["income_categories"] = json.dumps(data["income_categories"]) if data["income_categories"] else None

    for k, v in data.items():
        if hasattr(goal, k):
            val = v.value if hasattr(v, "value") else v
            setattr(goal, k, val)

    goal.updated_at = now_iso
    db.commit()
    db.refresh(goal)

    return GoalResponse(**compute_goal_progress(db, goal, today_str))

@router.delete("/{id}", status_code=204)
def delete_goal(id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return None

@router.post("/{id}/entries", response_model=GoalEntryResponse, status_code=201)
def add_goal_entry(id: int, entry_in: GoalEntryCreate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    now_iso = datetime.now().isoformat()
    entry = GoalEntry(
        goal_id=goal.id,
        date=entry_in.date,
        value=entry_in.value,
        note=entry_in.note,
        created_at=now_iso,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{id}/entries/{entry_id}", status_code=204)
def delete_goal_entry(id: int, entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(GoalEntry).filter(
        GoalEntry.id == entry_id,
        GoalEntry.goal_id == id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Goal entry not found")
    db.delete(entry)
    db.commit()
    return None
