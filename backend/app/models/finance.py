from sqlalchemy import Column, Integer, String, Text
from app.database.engine import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False) # income, expense
    amount_paise = Column(Integer, nullable=False) # int > 0
    category = Column(String, nullable=False)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    note = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
