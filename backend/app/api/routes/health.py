from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.schemas.api import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(session: Session = Depends(get_db_session)) -> HealthResponse:
    database_connected = False
    try:
        session.execute(text("SELECT 1"))
        database_connected = True
    except Exception:
        database_connected = False

    return HealthResponse(
        status="ok" if database_connected else "degraded",
        database_connected=database_connected,
        timestamp=datetime.now(timezone.utc),
    )
