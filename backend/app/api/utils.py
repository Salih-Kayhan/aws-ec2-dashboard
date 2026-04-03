from fastapi import HTTPException
from sqlalchemy.orm import Session


def raise_bad_request(session: Session, exc: Exception) -> None:
    session.rollback()
    raise HTTPException(status_code=400, detail=str(exc)) from exc
