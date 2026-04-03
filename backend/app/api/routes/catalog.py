from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.models import InstanceCatalog, RegionCatalog
from app.schemas.api import ConfigResponse, InstanceRead, RegionRead, StorageTypeRead
from app.services.catalog import build_config_response

router = APIRouter()

@router.get("/regions", response_model=list[RegionRead])
def list_regions(session: Session = Depends(get_db_session)) -> list[RegionRead]:
    rows = session.scalars(select(RegionCatalog).order_by(RegionCatalog.region_name.asc())).all()
    return [RegionRead.model_validate(row) for row in rows]


@router.get("/instances", response_model=list[InstanceRead])
def list_instances(session: Session = Depends(get_db_session)) -> list[InstanceRead]:
    rows = session.scalars(select(InstanceCatalog).order_by(InstanceCatalog.instance_type.asc())).all()
    return [InstanceRead.model_validate(row) for row in rows]


@router.get("/config", response_model=ConfigResponse)
def get_config(session: Session = Depends(get_db_session)) -> ConfigResponse:
    return build_config_response(session)
