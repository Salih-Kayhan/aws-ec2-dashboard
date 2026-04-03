from __future__ import annotations

import re

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DatasetVersion, EC2Pricing, InstanceCatalog, RegionCatalog, StoragePricing, WorkloadRecord
from app.schemas.api import DatasetImportRequest


WORKLOAD_DEFAULT_HEADERS = [
    "start_timestamp",
    "end_timestamp",
    "job_id",
    "task_id",
    "machine_id",
    "status",
    "sequence_number",
    "total_sequence_number",
    "maximum_real_cpu_number",
    "average_real_cpu_number",
    "maximum_normalized_memory_usage",
    "average_normalized_memory_usage",
]

STORAGE_TYPE_MAP = {
    "VolumeUsage.gp3": "gp3",
    "VolumeUsage.io2": "io2",
    "VolumeUsage.st1": "st1",
}


def _normalise_schema_name(value: str) -> str:
    value = value.strip().lower().replace(" ", "_")
    return re.sub(r"[^a-z0-9_]", "", value)


def _load_workload_headers(schema_path: str | None) -> list[str]:
    if not schema_path:
        return WORKLOAD_DEFAULT_HEADERS

    schema_df = pd.read_csv(schema_path)
    batch_rows = schema_df[schema_df["file name"].str.strip() == "batch_instance.csv"]
    if batch_rows.empty:
        return WORKLOAD_DEFAULT_HEADERS

    headers = [_normalise_schema_name(value) for value in batch_rows["content"].tolist()]
    return headers or WORKLOAD_DEFAULT_HEADERS


def _parse_memory_gib(value: str | None) -> float | None:
    if not value or value == "NA":
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", value)
    return float(match.group(1)) if match else None


def _parse_int(value: str | None) -> int | None:
    if not value or value == "NA":
        return None
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


def _resolve_storage_type(usage_type: str | None) -> str | None:
    if not usage_type:
        return None
    for suffix, storage_type in STORAGE_TYPE_MAP.items():
        if usage_type.endswith(suffix):
            return storage_type
    return None


def import_workload_csv(session: Session, payload: DatasetImportRequest) -> DatasetVersion:
    headers = _load_workload_headers(payload.schema_path)
    dataset = DatasetVersion(
        source_name=payload.source_name,
        dataset_kind="workload",
        version_label=payload.version_label,
        notes=payload.notes,
    )
    session.add(dataset)
    session.flush()

    objects: list[WorkloadRecord] = []
    for file_path in payload.file_paths:
        frame = pd.read_csv(file_path, names=headers, header=None)
        dataset.source_row_count += len(frame.index)

        numeric_columns = [
            "start_timestamp",
            "end_timestamp",
            "job_id",
            "task_id",
            "machine_id",
            "maximum_real_cpu_number",
            "average_real_cpu_number",
            "maximum_normalized_memory_usage",
            "average_normalized_memory_usage",
        ]
        for column in numeric_columns:
            if column in frame.columns:
                frame[column] = pd.to_numeric(frame[column], errors="coerce")

        valid = frame.dropna(subset=["start_timestamp", "end_timestamp", "maximum_real_cpu_number", "average_real_cpu_number"]).copy()
        valid["runtime_hours"] = ((valid["end_timestamp"] - valid["start_timestamp"]).clip(lower=0)) / 3600
        valid = valid[valid["maximum_real_cpu_number"] >= valid["average_real_cpu_number"]]

        dataset.imported_row_count += len(valid.index)
        dataset.rejected_row_count += len(frame.index) - len(valid.index)

        for row_number, row in enumerate(valid.to_dict(orient="records"), start=1):
            objects.append(
                WorkloadRecord(
                    dataset_version_id=dataset.id,
                    source_row_id=row_number,
                    job_id=int(row["job_id"]) if pd.notna(row.get("job_id")) else None,
                    task_id=int(row["task_id"]) if pd.notna(row.get("task_id")) else None,
                    machine_id=int(row["machine_id"]) if pd.notna(row.get("machine_id")) else None,
                    status=str(row.get("status")) if pd.notna(row.get("status")) else None,
                    avg_cpu_usage=float(row["average_real_cpu_number"]),
                    peak_cpu_usage=float(row["maximum_real_cpu_number"]),
                    runtime_hours=float(row["runtime_hours"]),
                    start_timestamp=int(row["start_timestamp"]),
                    end_timestamp=int(row["end_timestamp"]),
                    avg_memory_usage=float(row["average_normalized_memory_usage"])
                    if pd.notna(row.get("average_normalized_memory_usage"))
                    else None,
                    peak_memory_usage=float(row["maximum_normalized_memory_usage"])
                    if pd.notna(row.get("maximum_normalized_memory_usage"))
                    else None,
                )
            )

    if objects:
        session.bulk_save_objects(objects)
    session.commit()
    session.refresh(dataset)
    return dataset


def import_pricing_csv(session: Session, payload: DatasetImportRequest) -> DatasetVersion:
    dataset = DatasetVersion(
        source_name=payload.source_name,
        dataset_kind="pricing",
        version_label=payload.version_label,
        notes=payload.notes,
    )
    session.add(dataset)
    session.flush()

    known_instances = {row.instance_type: row for row in session.scalars(select(InstanceCatalog)).all()}
    known_regions = {row.region_code: row for row in session.scalars(select(RegionCatalog)).all()}
    new_instances: list[InstanceCatalog] = []
    new_regions: list[RegionCatalog] = []
    pricing_rows: list[EC2Pricing] = []
    storage_rows: list[StoragePricing] = []

    for file_path in payload.file_paths:
        for chunk in pd.read_csv(file_path, skiprows=5, chunksize=5000, dtype=str, low_memory=False):
            dataset.source_row_count += len(chunk.index)

            region_pairs = chunk[["Region Code", "Location"]].dropna().drop_duplicates()
            for region_code, region_name in region_pairs.itertuples(index=False, name=None):
                if region_code not in known_regions:
                    known_regions[region_code] = RegionCatalog(region_code=region_code, region_name=region_name)
                    new_regions.append(known_regions[region_code])

            compute_mask = (
                chunk["TermType"].eq("OnDemand")
                & chunk["Product Family"].isin(["Compute Instance", "Compute Instance (bare metal)"])
                & chunk["Operating System"].eq("Linux")
                & chunk["Tenancy"].eq("Shared")
                & chunk["CapacityStatus"].eq("Used")
                & chunk["Instance Type"].notna()
                & chunk["Region Code"].notna()
                & chunk["PricePerUnit"].notna()
                & chunk["PricePerUnit"].ne("0.0000000000")
                & chunk["Pre Installed S/W"].fillna("NA").isin(["NA", ""])
            )
            compute_rows = chunk.loc[compute_mask].copy()
            storage_candidates = pd.DataFrame()

            if not compute_rows.empty:
                compute_rows["PricePerUnit"] = pd.to_numeric(compute_rows["PricePerUnit"], errors="coerce")
                compute_rows = compute_rows.dropna(subset=["PricePerUnit"])
                compute_rows = compute_rows.drop_duplicates(subset=["Instance Type", "Region Code", "CapacityStatus"])

                for row in compute_rows.to_dict(orient="records"):
                    instance_type = row["Instance Type"]
                    if instance_type not in known_instances:
                        known_instances[instance_type] = InstanceCatalog(
                            instance_type=instance_type,
                            family=row.get("Instance Family"),
                            vcpu=_parse_int(row.get("vCPU")),
                            memory_gb=_parse_memory_gib(row.get("Memory")),
                            current_generation=row.get("Current Generation"),
                            processor_architecture=row.get("Processor Architecture"),
                            storage_description=row.get("Storage"),
                            network_performance=row.get("Network Performance"),
                        )
                        new_instances.append(known_instances[instance_type])

                    pricing_rows.append(
                        EC2Pricing(
                            dataset_version_id=dataset.id,
                            instance_type=instance_type,
                            region_code=row["Region Code"],
                            hourly_price=float(row["PricePerUnit"]),
                            currency=row["Currency"],
                            unit=row["Unit"],
                            operating_system=row["Operating System"],
                            tenancy=row["Tenancy"],
                            preinstalled_software=row.get("Pre Installed S/W"),
                            capacity_status=row.get("CapacityStatus"),
                            location=row.get("Location"),
                            effective_date=row.get("EffectiveDate"),
                        )
                    )

            storage_mask = (
                chunk["Product Family"].eq("Storage")
                & chunk["Unit"].eq("GB-Mo")
                & chunk["Region Code"].notna()
                & chunk["usageType"].notna()
            )
            storage_candidates = chunk.loc[storage_mask].copy()
            if not storage_candidates.empty:
                storage_candidates["storage_type"] = storage_candidates["usageType"].map(_resolve_storage_type)
                storage_candidates["PricePerUnit"] = pd.to_numeric(storage_candidates["PricePerUnit"], errors="coerce")
                storage_candidates = storage_candidates.dropna(subset=["storage_type", "PricePerUnit"])
                storage_candidates = storage_candidates.drop_duplicates(subset=["Region Code", "storage_type"])

                for row in storage_candidates.to_dict(orient="records"):
                    storage_rows.append(
                        StoragePricing(
                            dataset_version_id=dataset.id,
                            region_code=row["Region Code"],
                            storage_type=row["storage_type"],
                            volume_type=row.get("Volume Type"),
                            price_per_gb_month=float(row["PricePerUnit"]),
                            currency=row["Currency"],
                            unit=row["Unit"],
                            usage_type=row.get("usageType"),
                            description=row.get("PriceDescription"),
                        )
                    )

            dataset.imported_row_count += len(compute_rows.index) + len(storage_candidates.index)

    dataset.rejected_row_count = max(dataset.source_row_count - dataset.imported_row_count, 0)
    if new_regions:
        session.add_all(new_regions)
    if new_instances:
        session.add_all(new_instances)
    if new_regions or new_instances:
        session.flush()
    if pricing_rows:
        session.bulk_save_objects(pricing_rows)
    if storage_rows:
        session.bulk_save_objects(storage_rows)
    session.commit()
    session.refresh(dataset)
    return dataset
