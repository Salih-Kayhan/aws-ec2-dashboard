from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.models import TestLog
from app.schemas.api import TestLogRead

router = APIRouter()


@router.get("/tests", response_model=list[TestLogRead])
def list_test_logs(session: Session = Depends(get_db_session)) -> list[TestLogRead]:
    rows = session.scalars(select(TestLog).order_by(desc(TestLog.executed_at), desc(TestLog.id))).all()
    return [TestLogRead.model_validate(row) for row in rows]
