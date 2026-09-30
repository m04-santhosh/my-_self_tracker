from app.routers.templates import router as templates_router
from app.routers.instances import router as instances_router
from app.routers.days import router as days_router
from app.routers.analytics import router as analytics_router
from app.routers.compare import router as compare_router
from app.routers.goals import router as goals_router
from app.routers.finance import router as finance_router
from app.routers.settings import router as settings_router
from app.routers.notifications import router as notifications_router
from app.routers.system import router as system_router

__all__ = [
    "templates_router",
    "instances_router",
    "days_router",
    "analytics_router",
    "compare_router",
    "goals_router",
    "finance_router",
    "settings_router",
    "notifications_router",
    "system_router",
]
