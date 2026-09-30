import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.settings import Setting
from app.schemas.settings import SettingsSchema, SettingsUpdateSchema
from app.config import DEFAULT_SETTINGS

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings_records = db.query(Setting).all()
    data = dict(DEFAULT_SETTINGS)
    for s in settings_records:
        try:
            data[s.key] = json.loads(s.value)
        except Exception:
            data[s.key] = s.value
    return SettingsSchema(**data)

@router.put("", response_model=SettingsSchema)
def update_settings(update_in: SettingsUpdateSchema, db: Session = Depends(get_db)):
    update_data = update_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        record = db.query(Setting).filter(Setting.key == k).first()
        json_val = json.dumps(v)
        if not record:
            db.add(Setting(key=k, value=json_val))
        else:
            record.value = json_val
    db.commit()

    # Re-fetch complete settings
    return get_settings(db)
