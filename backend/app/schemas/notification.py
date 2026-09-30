from pydantic import BaseModel

class NotificationItem(BaseModel):
    instance_id: int
    reminder_type: str  # "before", "start", "end"
    fire_at: str        # HH:MM
    title: str
    body: str
