from sqlalchemy import Column, Integer, String, Text, Boolean
from app.database.engine import Base

class DailyReview(Base):
    __tablename__ = "daily_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String, unique=True, nullable=False, index=True)  # YYYY-MM-DD
    went_well = Column(Text, nullable=True)
    went_wrong = Column(Text, nullable=True)
    change_tomorrow = Column(Text, nullable=True)
    day_rating = Column(Integer, nullable=True)  # 1-5
    is_rest_day = Column(Boolean, default=False, nullable=False)
    closed_at = Column(String, nullable=True)  # ISO datetime string
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
