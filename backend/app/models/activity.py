from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database.engine import Base

class ActivityTemplate(Base):
    __tablename__ = "activity_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)  # mind, body, career, money, life, discipline
    kind = Column(String, nullable=False)      # block, checkpoint
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=True)   # HH:MM (null for checkpoint)
    days_of_week = Column(String, nullable=False)  # e.g. "0,1,2,3,4,5,6" (Mon=0..Sun=6)
    active_from = Column(String, nullable=False)   # YYYY-MM-DD
    active_until = Column(String, nullable=True)   # YYYY-MM-DD
    is_paused = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    metric_name = Column(String, nullable=True)
    metric_unit = Column(String, nullable=True)
    counts_as = Column(String, default="none", nullable=False)      # none, focus, exercise
    special_role = Column(String, default="none", nullable=False)   # none, wake, bedtime
    notify = Column(Boolean, default=True, nullable=False)
    ask_on_end = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    instances = relationship("ActivityInstance", back_populates="template")


class ActivityInstance(Base):
    __tablename__ = "activity_instances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("activity_templates.id", ondelete="SET NULL"), nullable=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD

    # Snapshot fields
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    planned_start = Column(String, nullable=False)
    planned_end = Column(String, nullable=True)
    metric_name = Column(String, nullable=True)
    metric_unit = Column(String, nullable=True)
    counts_as = Column(String, default="none", nullable=False)
    special_role = Column(String, default="none", nullable=False)
    notify = Column(Boolean, default=True, nullable=False)
    ask_on_end = Column(Boolean, default=False, nullable=False)

    overridden = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="pending", nullable=False, index=True) # pending, completed, partial, missed, skipped

    actual_start = Column(String, nullable=True)
    actual_end = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    rating = Column(Integer, nullable=True) # 1-5
    notes = Column(Text, nullable=True)
    metric_value = Column(Float, nullable=True)
    logged_at = Column(String, nullable=True)

    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    template = relationship("ActivityTemplate", back_populates="instances")

    __table_args__ = (
        UniqueConstraint("template_id", "date", name="uq_template_date"),
        Index("ix_activity_instance_date_status", "date", "status"),
    )
