import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_DIR = BASE_DIR / "database"
DB_PATH = DB_DIR / "lifeos.db"
BACKUP_DIR = DB_DIR / "backups"

# Ensure directories exist
DB_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

SQLITE_URL = f"sqlite:///{DB_PATH}"

# Default App Settings
DEFAULT_SETTINGS = {
    "start_date": "2026-10-01",
    "end_date": "2026-12-31",
    "timezone": "Asia/Kolkata",
    "user_name": "Santhosh",
    "notifications_enabled": True,
    "reminder_minutes_before": 5,
    "end_reminder_enabled": True,
    "quiet_hours_start": "23:30",
    "quiet_hours_end": "06:00",
    "sound_enabled": False,
    "success_threshold": 70,
    "fi_target_monthly_income_paise": None,
    "schema_version": 1,
}
