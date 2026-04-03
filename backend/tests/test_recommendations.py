from app.models import DatasetVersion, EC2Pricing, InstanceCatalog, RegionCatalog, StoragePricing
from app.schemas.api import RecommendationRequest
from app.services.recommendations import rank_recommendations


def seed_pricing(session) -> int:
    dataset = DatasetVersion(
        source_name="seed",
        dataset_kind="pricing",
        version_label="seed-v1",
        imported_row_count=3,
        source_row_count=3,
        rejected_row_count=0,
    )
    session.add(dataset)
    session.add(RegionCatalog(region_code="eu-west-1", region_name="EU (Ireland)"))
    session.add_all(
        [
            InstanceCatalog(instance_type="t3.medium", family="Burstable", vcpu=2, memory_gb=4),
            InstanceCatalog(instance_type="m5.large", family="General purpose", vcpu=2, memory_gb=8),
            InstanceCatalog(instance_type="c6i.large", family="Compute optimized", vcpu=2, memory_gb=4),
        ]
    )
    session.flush()
    session.add_all(
        [
            EC2Pricing(
                dataset_version_id=dataset.id,
                instance_type="t3.medium",
                region_code="eu-west-1",
                hourly_price=0.0416,
                currency="USD",
                unit="Hrs",
                operating_system="Linux",
                tenancy="Shared",
                preinstalled_software="NA",
                capacity_status="Used",
            ),
            EC2Pricing(
                dataset_version_id=dataset.id,
                instance_type="m5.large",
                region_code="eu-west-1",
                hourly_price=0.0960,
                currency="USD",
                unit="Hrs",
                operating_system="Linux",
                tenancy="Shared",
                preinstalled_software="NA",
                capacity_status="Used",
            ),
            EC2Pricing(
                dataset_version_id=dataset.id,
                instance_type="c6i.large",
                region_code="eu-west-1",
                hourly_price=0.0890,
                currency="USD",
                unit="Hrs",
                operating_system="Linux",
                tenancy="Shared",
                preinstalled_software="NA",
                capacity_status="Used",
            ),
            StoragePricing(
                dataset_version_id=dataset.id,
                region_code="eu-west-1",
                storage_type="gp3",
                volume_type="General Purpose",
                price_per_gb_month=0.088,
                currency="USD",
                unit="GB-Mo",
                usage_type="EU-EBS:VolumeUsage.gp3",
            ),
        ]
    )
    session.commit()
    return dataset.id


def test_rank_recommendations_persists_results(session) -> None:
    dataset_id = seed_pricing(session)
    payload = RecommendationRequest(
        scenario_name="Benchmark",
        avg_cpu_usage=1.0,
        peak_cpu_usage=1.8,
        runtime_hours=120,
        region_code="eu-west-1",
        storage_type="gp3",
        storage_gb=100,
        objective_type="balanced",
        dataset_version_id=dataset_id,
        limit=3,
    )

    scenario, run, results = rank_recommendations(session, payload)

    assert scenario.id is not None
    assert run.id is not None
    assert len(results) == 3
    assert results[0].rank_position == 1
    assert results[0].total_cost <= results[-1].total_cost or results[0].score >= results[-1].score
    assert all(result.storage_cost > 0 for result in results)
