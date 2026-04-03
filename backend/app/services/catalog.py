from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import DatasetVersion, InstanceCatalog, RegionCatalog, StoragePricing
from app.schemas.api import ConfigResponse, InstanceRead, RegionRead, StorageTypeRead


OBJECTIVES = ["cost", "balanced", "performance"]


def get_latest_pricing_dataset_id(session: Session) -> int | None:
    return session.scalar(
        select(DatasetVersion.id)
        .where(DatasetVersion.dataset_kind == "pricing")
        .order_by(desc(DatasetVersion.imported_at), desc(DatasetVersion.id))
        .limit(1)
    )


def build_config_response(session: Session) -> ConfigResponse:
    dataset_version_id = get_latest_pricing_dataset_id(session)
    storage_rows: list[StorageTypeRead] = []

    if dataset_version_id is not None:
        storage_rows = [
            StorageTypeRead(storage_type=storage_type, price_per_gb_month=price_per_gb_month, region_code=region_code)
            for storage_type, price_per_gb_month, region_code in session.execute(
                select(
                    StoragePricing.storage_type,
                    StoragePricing.price_per_gb_month,
                    StoragePricing.region_code,
                )
                .where(StoragePricing.dataset_version_id == dataset_version_id)
                .order_by(StoragePricing.region_code.asc(), StoragePricing.storage_type.asc())
            ).all()
        ]

    region_rows = session.scalars(select(RegionCatalog).order_by(RegionCatalog.region_name.asc())).all()
    instance_rows = session.scalars(select(InstanceCatalog).order_by(InstanceCatalog.instance_type.asc())).all()

    return ConfigResponse(
        regions=[RegionRead.model_validate(row) for row in region_rows],
        instances=[InstanceRead.model_validate(row) for row in instance_rows],
        storage_types=storage_rows,
        objectives=OBJECTIVES,
    )
