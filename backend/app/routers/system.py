import shutil
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config import DB_PATH, BACKUP_DIR
from app.models.settings import Setting
from app.models.activity import ActivityTemplate, ActivityInstance
from app.models.review import DailyReview
from app.models.goal import Goal, GoalEntry
from app.models.finance import Transaction

router = APIRouter(prefix="/system", tags=["system"])

@router.post("/backup")
def create_backup():
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_filename = f"lifeos-{timestamp}.db"
    backup_file_path = BACKUP_DIR / backup_filename

    try:
        shutil.copy2(DB_PATH, backup_file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")

    return {
        "status": "success",
        "backup_path": str(backup_file_path),
        "backup_filename": backup_filename,
        "created_at": datetime.now().isoformat(),
    }

@router.get("/export")
def export_database_json(db: Session = Depends(get_db)) -> Dict[str, Any]:
    def to_dict(model_instance):
        return {col.name: getattr(model_instance, col.name) for col in model_instance.__table__.columns}

    settings = [to_dict(s) for s in db.query(Setting).all()]
    templates = [to_dict(t) for t in db.query(ActivityTemplate).all()]
    instances = [to_dict(i) for i in db.query(ActivityInstance).all()]
    reviews = [to_dict(r) for r in db.query(DailyReview).all()]
    goals = [to_dict(g) for g in db.query(Goal).all()]
    goal_entries = [to_dict(ge) for ge in db.query(GoalEntry).all()]
    transactions = [to_dict(tx) for tx in db.query(Transaction).all()]

    return {
        "exported_at": datetime.now().isoformat(),
        "tables": {
            "settings": settings,
            "activity_templates": templates,
            "activity_instances": instances,
            "daily_reviews": reviews,
            "goals": goals,
            "goal_entries": goal_entries,
            "transactions": transactions,
        }
    }
