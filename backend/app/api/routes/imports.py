from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.utils import raise_bad_request
from app.core.database import get_db_session
from app.schemas.api import DatasetImportRequest, DatasetImportResponse
from app.services.ingestion import import_pricing_csv, import_workload_csv

router = APIRouter(prefix="/import")


@router.post("/workload-csv", response_model=DatasetImportResponse, status_code=status.HTTP_201_CREATED)
def import_workload(payload: DatasetImportRequest, session: Session = Depends(get_db_session)) -> DatasetImportResponse:
    try:
        dataset = import_workload_csv(session, payload)
    except Exception as exc:
        raise_bad_request(session, exc)

    return DatasetImportResponse(
        dataset_version_id=dataset.id,
        dataset_kind=dataset.dataset_kind,
        source_row_count=dataset.source_row_count,
        imported_row_count=dataset.imported_row_count,
        rejected_row_count=dataset.rejected_row_count,
    )


@router.post("/pricing-csv", response_model=DatasetImportResponse, status_code=status.HTTP_201_CREATED)
def import_pricing(payload: DatasetImportRequest, session: Session = Depends(get_db_session)) -> DatasetImportResponse:
    try:
        dataset = import_pricing_csv(session, payload)
    except Exception as exc:
        raise_bad_request(session, exc)

    return DatasetImportResponse(
        dataset_version_id=dataset.id,
        dataset_kind=dataset.dataset_kind,
        source_row_count=dataset.source_row_count,
        imported_row_count=dataset.imported_row_count,
        rejected_row_count=dataset.rejected_row_count,
    )
