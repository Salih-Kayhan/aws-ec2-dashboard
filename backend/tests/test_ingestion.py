from unittest.mock import patch

import pandas as pd

from app.models import EC2Pricing, StoragePricing, WorkloadRecord
from app.schemas.api import DatasetImportRequest
from app.services.ingestion import import_pricing_csv, import_workload_csv


def test_import_workload_csv(session) -> None:
    schema_df = pd.DataFrame(
        {
            "file name": ["batch_instance.csv"] * 12,
            "field number": list(range(1, 13)),
            "content": [
                "start_timestamp",
                "end_timestamp",
                "job id",
                "task id",
                "machine id",
                "status",
                "sequence number",
                "total sequence number",
                "maximum real cpu number",
                "average real cpu number",
                "maximum normalized memory usage",
                "average normalized memory usage",
            ],
            "format": ["INTEGER"] * 12,
            "mandatory": ["YES"] * 12,
        }
    )
    workload_df = pd.DataFrame(
        [
            {
                "start_timestamp": 0,
                "end_timestamp": 3600,
                "job_id": 1,
                "task_id": 10,
                "machine_id": 100,
                "status": "Terminated",
                "sequence_number": 1,
                "total_sequence_number": 1,
                "maximum_real_cpu_number": 2.0,
                "average_real_cpu_number": 1.2,
                "maximum_normalized_memory_usage": None,
                "average_normalized_memory_usage": None,
            }
        ]
    )

    with patch("app.services.ingestion.pd.read_csv", side_effect=[schema_df, workload_df]):
        dataset = import_workload_csv(
            session,
            DatasetImportRequest(
                file_paths=["mock-workload.csv"],
                schema_path="mock-schema.csv",
                source_name="Alibaba sample",
                version_label="test-workload",
            ),
        )

    records = session.query(WorkloadRecord).all()
    assert dataset.imported_row_count == 1
    assert len(records) == 1
    assert records[0].runtime_hours == 1.0
    assert records[0].avg_cpu_usage == 1.2


def test_import_pricing_csv(session) -> None:
    pricing_chunk = pd.DataFrame(
        [
            {
                "TermType": "OnDemand",
                "Product Family": "Compute Instance",
                "Operating System": "Linux",
                "Tenancy": "Shared",
                "CapacityStatus": "Used",
                "Instance Type": "m5.large",
                "Region Code": "eu-west-1",
                "PricePerUnit": "0.1000000000",
                "Pre Installed S/W": "NA",
                "Currency": "USD",
                "Unit": "Hrs",
                "Instance Family": "General purpose",
                "vCPU": "2",
                "Memory": "8 GiB",
                "Current Generation": "Yes",
                "Processor Architecture": "64-bit",
                "Storage": "EBS only",
                "Network Performance": "Up to 10 Gigabit",
                "Location": "EU (Ireland)",
                "EffectiveDate": "2026-03-01",
                "usageType": "EU-BoxUsage:m5.large",
                "Volume Type": None,
                "PriceDescription": "Compute row",
            },
            {
                "TermType": "OnDemand",
                "Product Family": "Storage",
                "Operating System": None,
                "Tenancy": None,
                "CapacityStatus": None,
                "Instance Type": None,
                "Region Code": "eu-west-1",
                "PricePerUnit": "0.0880000000",
                "Pre Installed S/W": None,
                "Currency": "USD",
                "Unit": "GB-Mo",
                "Instance Family": None,
                "vCPU": None,
                "Memory": None,
                "Current Generation": None,
                "Processor Architecture": None,
                "Storage": None,
                "Network Performance": None,
                "Location": "EU (Ireland)",
                "EffectiveDate": "2026-03-01",
                "usageType": "EU-EBS:VolumeUsage.gp3",
                "Volume Type": "General Purpose",
                "PriceDescription": "Storage row",
            },
        ]
    )

    with patch("app.services.ingestion.pd.read_csv", side_effect=[[pricing_chunk]]):
        dataset = import_pricing_csv(
            session,
            DatasetImportRequest(
                file_paths=["mock-pricing.csv"],
                source_name="AWS sample",
                version_label="test-pricing",
            ),
        )

    compute_rows = session.query(EC2Pricing).all()
    storage_rows = session.query(StoragePricing).all()
    assert dataset.imported_row_count == 2
    assert len(compute_rows) == 1
    assert len(storage_rows) == 1
    assert compute_rows[0].instance_type == "m5.large"
    assert storage_rows[0].storage_type == "gp3"
