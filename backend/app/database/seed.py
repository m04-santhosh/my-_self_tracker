import json
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.config import DEFAULT_SETTINGS
from app.models.settings import Setting
from app.models.activity import ActivityTemplate
from app.models.goal import Goal

def seed_database(db: Session, current_date_str: str = "2026-10-01"):
    now_iso = datetime.now().isoformat()
    today_str = current_date_str

    # 1. Seed Settings if not present
    for k, v in DEFAULT_SETTINGS.items():
        existing = db.query(Setting).filter(Setting.key == k).first()
        if not existing:
            db.add(Setting(key=k, value=json.dumps(v)))
    db.commit()

    # 2. Seed Default Templates if none exist
    template_count = db.query(ActivityTemplate).count()
    created_templates = {}

    if template_count == 0:
        default_templates = [
            {
                "title": "Wake Up",
                "description": "Start the day fresh",
                "category": "discipline",
                "kind": "checkpoint",
                "start_time": "06:30",
                "end_time": None,
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "wake",
                "notify": True,
                "ask_on_end": False,
                "sort_order": 1,
            },
            {
                "title": "Walking",
                "description": "Morning brisk walk or light movement",
                "category": "body",
                "kind": "block",
                "start_time": "07:00",
                "end_time": "07:45",
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "exercise",
                "special_role": "none",
                "notify": True,
                "ask_on_end": True,
                "sort_order": 2,
            },
            {
                "title": "Breakfast",
                "description": "Nutritious breakfast",
                "category": "body",
                "kind": "block",
                "start_time": "08:00",
                "end_time": "08:30",
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "none",
                "notify": False,
                "ask_on_end": False,
                "sort_order": 3,
            },
            {
                "title": "College",
                "description": "Lectures & academic sessions",
                "category": "career",
                "kind": "block",
                "start_time": "09:00",
                "end_time": "16:00",
                "days_of_week": "0,1,2,3,4",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "none",
                "notify": False,
                "ask_on_end": False,
                "sort_order": 4,
            },
            {
                "title": "DSA",
                "description": "Data Structures & Algorithms problem solving",
                "category": "career",
                "kind": "block",
                "start_time": "18:00",
                "end_time": "19:00",
                "days_of_week": "0,1,2,3,4",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": "problems",
                "metric_unit": "problems",
                "counts_as": "focus",
                "special_role": "none",
                "notify": True,
                "ask_on_end": True,
                "sort_order": 5,
            },
            {
                "title": "Project Work",
                "description": "Personal development projects",
                "category": "career",
                "kind": "block",
                "start_time": "19:30",
                "end_time": "20:45",
                "days_of_week": "0,1,2,3,4",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "focus",
                "special_role": "none",
                "notify": True,
                "ask_on_end": True,
                "sort_order": 6,
            },
            {
                "title": "Dinner",
                "description": "Healthy evening meal",
                "category": "body",
                "kind": "block",
                "start_time": "21:00",
                "end_time": "21:30",
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "none",
                "notify": False,
                "ask_on_end": False,
                "sort_order": 7,
            },
            {
                "title": "Log Expenses",
                "description": "Record daily finances in LifeOS",
                "category": "money",
                "kind": "block",
                "start_time": "21:30",
                "end_time": "21:40",
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "none",
                "notify": True,
                "ask_on_end": False,
                "sort_order": 8,
            },
            {
                "title": "Daily Review",
                "description": "Reflect on today and prepare tomorrow",
                "category": "discipline",
                "kind": "block",
                "start_time": "22:00",
                "end_time": "22:15",
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "none",
                "notify": True,
                "ask_on_end": False,
                "sort_order": 9,
            },
            {
                "title": "Sleep",
                "description": "Wind down and rest",
                "category": "discipline",
                "kind": "checkpoint",
                "start_time": "23:00",
                "end_time": None,
                "days_of_week": "0,1,2,3,4,5,6",
                "active_from": today_str,
                "active_until": None,
                "is_paused": False,
                "is_archived": False,
                "metric_name": None,
                "metric_unit": None,
                "counts_as": "none",
                "special_role": "bedtime",
                "notify": True,
                "ask_on_end": False,
                "sort_order": 10,
            },
        ]

        for item in default_templates:
            tmpl = ActivityTemplate(
                **item,
                created_at=now_iso,
                updated_at=now_iso,
            )
            db.add(tmpl)
            db.flush()
            created_templates[tmpl.title] = tmpl.id
        db.commit()

    # 3. Seed 4 starter goals if no goals exist
    goal_count = db.query(Goal).count()
    if goal_count == 0:
        # Retrieve template IDs for DSA and Walking
        dsa_tmpl = db.query(ActivityTemplate).filter(ActivityTemplate.title == "DSA").first()
        walking_tmpl = db.query(ActivityTemplate).filter(ActivityTemplate.title == "Walking").first()

        default_goals = [
            Goal(
                title="Complete 150 DSA problems",
                description="Consistently solve algorithm and data structures challenges",
                category="career",
                goal_type="activity_metric_sum",
                linked_template_id=dsa_tmpl.id if dsa_tmpl else None,
                income_categories=None,
                target_value=150.0,
                unit="problems",
                start_date="2026-10-01",
                deadline="2026-12-31",
                status="active",
                created_at=now_iso,
                updated_at=now_iso,
            ),
            Goal(
                title="90 days of movement",
                description="Build a continuous physical habit of daily walking",
                category="body",
                goal_type="activity_completion_count",
                linked_template_id=walking_tmpl.id if walking_tmpl else None,
                income_categories=None,
                target_value=90.0,
                unit="days",
                start_date="2026-10-01",
                deadline="2026-12-31",
                status="active",
                created_at=now_iso,
                updated_at=now_iso,
            ),
            Goal(
                title="Earn Rs 10,000 independently",
                description="Freelancing and independent business revenue",
                category="money",
                goal_type="income_sum",
                linked_template_id=None,
                income_categories=json.dumps(["freelancing", "business"]),
                target_value=1000000.0, # 10,000 Rs in paise
                unit="paise",
                start_date="2026-10-01",
                deadline="2026-12-31",
                status="active",
                created_at=now_iso,
                updated_at=now_iso,
            ),
            Goal(
                title="Show up for the 92-day challenge",
                description="Log activity or review every single day",
                category="discipline",
                goal_type="days_logged",
                linked_template_id=None,
                income_categories=None,
                target_value=92.0,
                unit="days",
                start_date="2026-10-01",
                deadline="2026-12-31",
                status="active",
                created_at=now_iso,
                updated_at=now_iso,
            ),
        ]
        for g in default_goals:
            db.add(g)
        db.commit()
