from app.database.engine import engine, Base
import app.models # Ensure all models are registered
from app.database.session import SessionLocal
from app.database.seed import seed_database

def init_db(seed_date_str: str = "2026-10-01"):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, current_date_str=seed_date_str)
    finally:
        db.close()
