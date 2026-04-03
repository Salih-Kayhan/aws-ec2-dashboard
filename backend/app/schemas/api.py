from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    timestamp: datetime


class DatasetImportRequest(BaseModel):
    file_paths: list[str] = Field(min_length=1)
    source_name: str
    version_label: str | None = None
    notes: str | None = None
    schema_path: str | None = None


class DatasetImportResponse(BaseModel):
    dataset_version_id: int
    dataset_kind: str
    source_row_count: int
    imported_row_count: int
    rejected_row_count: int


class RegionRead(BaseModel):
    region_code: str
    region_name: str

    model_config = {"from_attributes": True}


class InstanceRead(BaseModel):
    instance_type: str
    family: str | None = None
    vcpu: int | None = None
    memory_gb: float | None = None
    current_generation: str | None = None
    processor_architecture: str | None = None

    model_config = {"from_attributes": True}


class StorageTypeRead(BaseModel):
    storage_type: str
    price_per_gb_month: float
    region_code: str


class ConfigResponse(BaseModel):
    regions: list[RegionRead]
    instances: list[InstanceRead]
    storage_types: list[StorageTypeRead]
    objectives: list[str]


class ScenarioBase(BaseModel):
    scenario_name: str | None = None
    avg_cpu_usage: float = Field(gt=0)
    peak_cpu_usage: float = Field(gt=0)
    runtime_hours: float = Field(gt=0)
    region_code: str
    storage_type: str = Field(pattern="^(gp3|io2|st1)$")
    storage_gb: float = Field(gt=0)
    objective_type: Literal["cost", "balanced", "performance"] = "balanced"
    cost_weight: float | None = Field(default=None, ge=0, le=1)
    performance_weight: float | None = Field(default=None, ge=0, le=1)
    fit_weight: float | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def validate_cpu_and_weights(self) -> "ScenarioBase":
        if self.peak_cpu_usage < self.avg_cpu_usage:
            raise ValueError("peak_cpu_usage must be greater than or equal to avg_cpu_usage")
        supplied = [self.cost_weight, self.performance_weight, self.fit_weight]
        if any(weight is not None for weight in supplied):
            if not all(weight is not None for weight in supplied):
                raise ValueError("Either provide all custom weights or none of them")
            total = sum(supplied)  # type: ignore[arg-type]
            if abs(total - 1.0) > 0.001:
                raise ValueError("Custom weights must sum to 1.0")
        return self


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioRead(ScenarioBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RecommendationRequest(ScenarioBase):
    dataset_version_id: int | None = None
    limit: int = Field(default=10, ge=1, le=25)
    instance_types: list[str] | None = None


class RecommendationResultRead(BaseModel):
    instance_type: str
    region_code: str
    compute_cost: float
    storage_cost: float
    total_cost: float
    cost_score: float
    performance_score: float
    fit_score: float
    score: float
    rank_position: int
    hourly_price: float
    storage_price_per_gb_month: float
    family: str | None = None
    vcpu: int | None = None
    memory_gb: float | None = None
    explanation: str | None = None

    model_config = {"from_attributes": True}


class RecommendationRunRead(BaseModel):
    run_id: int
    scenario_id: int
    dataset_version_id: int
    algorithm_name: str
    execution_ms: float
    candidate_count: int
    created_at: datetime
    scenario: ScenarioRead
    results: list[RecommendationResultRead]


class RunSummaryRead(BaseModel):
    id: int
    scenario_id: int
    dataset_version_id: int
    algorithm_name: str
    execution_ms: float
    candidate_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TestLogRead(BaseModel):
    id: int
    test_name: str
    test_type: str
    result: str
    notes: str | None = None
    executed_at: datetime

    model_config = {"from_attributes": True}


class MutationResponse(BaseModel):
    ok: bool = True
    message: str
