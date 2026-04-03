from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dataset_kind: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    version_label: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    source_row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejected_row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workload_records: Mapped[list["WorkloadRecord"]] = relationship(back_populates="dataset_version")
    ec2_pricing_rows: Mapped[list["EC2Pricing"]] = relationship(back_populates="dataset_version")
    storage_pricing_rows: Mapped[list["StoragePricing"]] = relationship(back_populates="dataset_version")
    recommendation_runs: Mapped[list["RecommendationRun"]] = relationship(back_populates="dataset_version")


class WorkloadRecord(Base):
    __tablename__ = "workload_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_version_id: Mapped[int] = mapped_column(ForeignKey("dataset_versions.id"), nullable=False, index=True)
    source_row_id: Mapped[int | None] = mapped_column(Integer)
    job_id: Mapped[int | None] = mapped_column(Integer)
    task_id: Mapped[int | None] = mapped_column(Integer)
    machine_id: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(64))
    avg_cpu_usage: Mapped[float] = mapped_column(Float, nullable=False)
    peak_cpu_usage: Mapped[float] = mapped_column(Float, nullable=False)
    runtime_hours: Mapped[float] = mapped_column(Float, nullable=False)
    start_timestamp: Mapped[int | None] = mapped_column(Integer)
    end_timestamp: Mapped[int | None] = mapped_column(Integer)
    avg_memory_usage: Mapped[float | None] = mapped_column(Float)
    peak_memory_usage: Mapped[float | None] = mapped_column(Float)

    dataset_version: Mapped["DatasetVersion"] = relationship(back_populates="workload_records")


class InstanceCatalog(Base):
    __tablename__ = "instance_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    instance_type: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    family: Mapped[str | None] = mapped_column(String(100))
    vcpu: Mapped[int | None] = mapped_column(Integer)
    memory_gb: Mapped[float | None] = mapped_column(Float)
    current_generation: Mapped[str | None] = mapped_column(String(20))
    processor_architecture: Mapped[str | None] = mapped_column(String(100))
    storage_description: Mapped[str | None] = mapped_column(String(255))
    network_performance: Mapped[str | None] = mapped_column(String(100))

    pricing_rows: Mapped[list["EC2Pricing"]] = relationship(back_populates="instance")


class RegionCatalog(Base):
    __tablename__ = "region_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    region_name: Mapped[str] = mapped_column(String(120), nullable=False)


class EC2Pricing(Base):
    __tablename__ = "ec2_pricing"
    __table_args__ = (
        UniqueConstraint(
            "dataset_version_id",
            "instance_type",
            "region_code",
            "operating_system",
            "tenancy",
            "capacity_status",
            name="uq_ec2_price_variant",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_version_id: Mapped[int] = mapped_column(ForeignKey("dataset_versions.id"), nullable=False, index=True)
    instance_type: Mapped[str] = mapped_column(ForeignKey("instance_catalog.instance_type"), nullable=False, index=True)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    hourly_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    operating_system: Mapped[str] = mapped_column(String(50), nullable=False)
    tenancy: Mapped[str] = mapped_column(String(32), nullable=False)
    preinstalled_software: Mapped[str | None] = mapped_column(String(50))
    capacity_status: Mapped[str | None] = mapped_column(String(50))
    location: Mapped[str | None] = mapped_column(String(120))
    effective_date: Mapped[str | None] = mapped_column(String(40))

    dataset_version: Mapped["DatasetVersion"] = relationship(back_populates="ec2_pricing_rows")
    instance: Mapped["InstanceCatalog"] = relationship(back_populates="pricing_rows")


class StoragePricing(Base):
    __tablename__ = "storage_pricing"
    __table_args__ = (UniqueConstraint("dataset_version_id", "region_code", "storage_type", name="uq_storage_price_variant"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_version_id: Mapped[int] = mapped_column(ForeignKey("dataset_versions.id"), nullable=False, index=True)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    storage_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    volume_type: Mapped[str | None] = mapped_column(String(120))
    price_per_gb_month: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    usage_type: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)

    dataset_version: Mapped["DatasetVersion"] = relationship(back_populates="storage_pricing_rows")


class ScenarioInput(Base):
    __tablename__ = "scenario_inputs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_name: Mapped[str | None] = mapped_column(String(120))
    avg_cpu_usage: Mapped[float] = mapped_column(Float, nullable=False)
    peak_cpu_usage: Mapped[float] = mapped_column(Float, nullable=False)
    runtime_hours: Mapped[float] = mapped_column(Float, nullable=False)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    storage_type: Mapped[str] = mapped_column(String(20), nullable=False)
    storage_gb: Mapped[float] = mapped_column(Float, nullable=False)
    objective_type: Mapped[str] = mapped_column(String(32), nullable=False)
    cost_weight: Mapped[float] = mapped_column(Float, nullable=False)
    performance_weight: Mapped[float] = mapped_column(Float, nullable=False)
    fit_weight: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    recommendation_runs: Mapped[list["RecommendationRun"]] = relationship(back_populates="scenario")


class RecommendationRun(Base):
    __tablename__ = "recommendation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenario_inputs.id"), nullable=False, index=True)
    dataset_version_id: Mapped[int] = mapped_column(ForeignKey("dataset_versions.id"), nullable=False, index=True)
    algorithm_name: Mapped[str] = mapped_column(String(80), nullable=False)
    execution_ms: Mapped[float] = mapped_column(Float, nullable=False)
    candidate_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    scenario: Mapped["ScenarioInput"] = relationship(back_populates="recommendation_runs")
    dataset_version: Mapped["DatasetVersion"] = relationship(back_populates="recommendation_runs")
    results: Mapped[list["RecommendationResult"]] = relationship(back_populates="run")


class RecommendationResult(Base):
    __tablename__ = "recommendation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("recommendation_runs.id"), nullable=False, index=True)
    instance_type: Mapped[str] = mapped_column(String(100), nullable=False)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False)
    compute_cost: Mapped[float] = mapped_column(Float, nullable=False)
    storage_cost: Mapped[float] = mapped_column(Float, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    cost_score: Mapped[float] = mapped_column(Float, nullable=False)
    performance_score: Mapped[float] = mapped_column(Float, nullable=False)
    fit_score: Mapped[float] = mapped_column(Float, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)
    hourly_price: Mapped[float] = mapped_column(Float, nullable=False)
    storage_price_per_gb_month: Mapped[float] = mapped_column(Float, nullable=False)
    family: Mapped[str | None] = mapped_column(String(100))
    vcpu: Mapped[int | None] = mapped_column(Integer)
    memory_gb: Mapped[float | None] = mapped_column(Float)
    explanation: Mapped[str | None] = mapped_column(Text)

    run: Mapped["RecommendationRun"] = relationship(back_populates="results")


class TestLog(Base):
    __tablename__ = "test_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_name: Mapped[str] = mapped_column(String(120), nullable=False)
    test_type: Mapped[str] = mapped_column(String(50), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
