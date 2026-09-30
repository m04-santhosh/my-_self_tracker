from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.engine import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)  # mind, body, career, money, life, discipline
    goal_type = Column(String, nullable=False) # activity_metric_sum, activity_completion_count, income_sum, days_logged, successful_days, manual
    linked_template_id = Column(Integer, ForeignKey("activity_templates.id", ondelete="SET NULL"), nullable=True)
    income_categories = Column(Text, nullable=True) # JSON list e.g. ["freelancing", "business"]
    target_value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    start_date = Column(String, nullable=False) # YYYY-MM-DD
    deadline = Column(String, nullable=False)   # YYYY-MM-DD
    status = Column(String, default="active", nullable=False) # active, completed, paused, abandoned
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    entries = relationship("GoalEntry", back_populates="goal", cascade="all, delete-orphan")


class GoalEntry(Base):
    __tablename__ = "goal_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False) # YYYY-MM-DD
    value = Column(Float, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)

    goal = relationship("Goal", back_populates="entries")
