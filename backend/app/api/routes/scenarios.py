from fastapi import APIRouter, Depends, status
from sqlalchemy import delete
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.utils import raise_bad_request
from app.core.database import get_db_session
from app.models import RecommendationResult, RecommendationRun, ScenarioInput
from app.schemas.api import MutationResponse, ScenarioCreate, ScenarioRead
from app.services.recommendations import create_scenario

router = APIRouter()


@router.get("/scenarios", response_model=list[ScenarioRead])
def list_scenarios(session: Session = Depends(get_db_session)) -> list[ScenarioRead]:
    rows = session.scalars(
        select(ScenarioInput)
        .where(~ScenarioInput.recommendation_runs.any())
        .order_by(desc(ScenarioInput.created_at), desc(ScenarioInput.id))
    ).all()
    return [ScenarioRead.model_validate(row) for row in rows]


@router.post("/scenarios", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario_endpoint(payload: ScenarioCreate, session: Session = Depends(get_db_session)) -> ScenarioRead:
    try:
        scenario = create_scenario(session, payload)
        session.commit()
        session.refresh(scenario)
        return ScenarioRead.model_validate(scenario)
    except Exception as exc:
        raise_bad_request(session, exc)


@router.delete("/scenarios/{scenario_id}", response_model=MutationResponse)
def delete_scenario_endpoint(scenario_id: int, session: Session = Depends(get_db_session)) -> MutationResponse:
    scenario = session.get(ScenarioInput, scenario_id)
    if scenario is None:
        return MutationResponse(message="Scenario was already removed")

    try:
        run_ids = session.scalars(
            select(RecommendationRun.id).where(RecommendationRun.scenario_id == scenario_id)
        ).all()
        if run_ids:
            session.execute(delete(RecommendationResult).where(RecommendationResult.run_id.in_(run_ids)))
            session.execute(delete(RecommendationRun).where(RecommendationRun.id.in_(run_ids)))
        session.delete(scenario)
        session.commit()
        return MutationResponse(message="Scenario and related recommendation history deleted")
    except Exception as exc:
        raise_bad_request(session, exc)
