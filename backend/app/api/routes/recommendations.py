from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.api.utils import raise_bad_request
from app.core.database import get_db_session
from app.models import RecommendationResult, RecommendationRun, ScenarioInput
from app.schemas.api import RecommendationRequest, RecommendationResultRead, RecommendationRunRead, RunSummaryRead, ScenarioRead
from app.services.recommendations import rank_recommendations

router = APIRouter()


def _build_run_response(
    run: RecommendationRun,
    scenario: ScenarioInput,
    results: list[RecommendationResult],
) -> RecommendationRunRead:
    return RecommendationRunRead(
        run_id=run.id,
        scenario_id=run.scenario_id,
        dataset_version_id=run.dataset_version_id,
        algorithm_name=run.algorithm_name,
        execution_ms=run.execution_ms,
        candidate_count=run.candidate_count,
        created_at=run.created_at,
        scenario=ScenarioRead.model_validate(scenario),
        results=[RecommendationResultRead.model_validate(result) for result in results],
    )


@router.post("/recommendations", response_model=RecommendationRunRead)
def create_recommendation(payload: RecommendationRequest, session: Session = Depends(get_db_session)) -> RecommendationRunRead:
    try:
        scenario, run, results = rank_recommendations(session, payload)
    except Exception as exc:
        raise_bad_request(session, exc)

    return _build_run_response(run, scenario, results)


@router.get("/runs", response_model=list[RunSummaryRead])
def list_runs(session: Session = Depends(get_db_session)) -> list[RunSummaryRead]:
    rows = session.scalars(select(RecommendationRun).order_by(desc(RecommendationRun.created_at), desc(RecommendationRun.id))).all()
    return [RunSummaryRead.model_validate(row) for row in rows]


@router.get("/runs/{run_id}", response_model=RecommendationRunRead)
def get_run(run_id: int, session: Session = Depends(get_db_session)) -> RecommendationRunRead:
    run = session.scalar(
        select(RecommendationRun)
        .where(RecommendationRun.id == run_id)
        .options(selectinload(RecommendationRun.scenario), selectinload(RecommendationRun.results))
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Recommendation run not found")

    return _build_run_response(run, run.scenario, list(run.results))
