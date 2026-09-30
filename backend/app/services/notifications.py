from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.models.activity import ActivityInstance
from app.schemas.notification import NotificationItem
from app.services.scoring import get_setting_value

def calculate_time_minus_minutes(time_str: str, minutes: int) -> str:
    parts = time_str.split(":")
    dt = datetime(2000, 1, 1, int(parts[0]), int(parts[1]))
    dt_minus = dt - timedelta(minutes=minutes)
    return dt_minus.strftime("%H:%M")

def get_upcoming_notifications(db: Session, date_str: str) -> List[NotificationItem]:
    reminder_minutes_before = get_setting_value(db, "reminder_minutes_before", 5)
    end_reminder_enabled = get_setting_value(db, "end_reminder_enabled", True)
    notifications_enabled = get_setting_value(db, "notifications_enabled", True)

    if not notifications_enabled:
        return []

    pending_instances = db.query(ActivityInstance).filter(
        ActivityInstance.date == date_str,
        ActivityInstance.status == "pending",
        ActivityInstance.notify == True
    ).order_by(ActivityInstance.planned_start).all()

    items: List[NotificationItem] = []

    for inst in pending_instances:
        # 1. Before reminder
        if reminder_minutes_before > 0:
            fire_before = calculate_time_minus_minutes(inst.planned_start, reminder_minutes_before)
            items.append(
                NotificationItem(
                    instance_id=inst.id,
                    reminder_type="before",
                    fire_at=fire_before,
                    title=f"{inst.title} starting soon",
                    body=f"{inst.title} starts in {reminder_minutes_before} minutes.",
                )
            )

        # 2. Start reminder
        items.append(
            NotificationItem(
                instance_id=inst.id,
                reminder_type="start",
                fire_at=inst.planned_start,
                title=f"{inst.title} time",
                body=f"It's {inst.title} time. Start your planned session.",
            )
        )

        # 3. End reminder (if block with planned_end, ask_on_end=True, and end_reminder_enabled)
        if inst.ask_on_end and end_reminder_enabled and inst.planned_end:
            items.append(
                NotificationItem(
                    instance_id=inst.id,
                    reminder_type="end",
                    fire_at=inst.planned_end,
                    title=f"{inst.title} finished",
                    body=f"Your {inst.title} session is finished. How did it go?",
                )
            )

    # Sort items by fire_at
    items.sort(key=lambda x: x.fire_at)
    return items
