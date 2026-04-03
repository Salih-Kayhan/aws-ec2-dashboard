from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    EC2Pricing,
    InstanceCatalog,
    RecommendationResult,
    RecommendationRun,
    ScenarioInput,
    StoragePricing,
)
from app.schemas.api import RecommendationRequest, ScenarioCreate
from app.services.catalog import get_latest_pricing_dataset_id


OBJECTIVE_PRESETS = {
    "cost": (0.6, 0.2, 0.2),
    "balanced": (0.4, 0.35, 0.25),
    "performance": (0.2, 0.5, 0.3),
}


@dataclass
class RankedCandidate:
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
    family: str | None
    vcpu: int | None
    memory_gb: float | None
    explanation: str


def _clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return max(min_value, min(value, max_value))


def _family_alignment_score(family: str | None, avg_ratio: float, peak_ratio: float) -> float:
    family_name = (family or "").lower()
    burstiness = max(peak_ratio - avg_ratio, 0)
    score = 50.0

    if "compute" in family_name:
        score += 25 if peak_ratio >= 0.55 else -10
    elif "general" in family_name:
        score += 20 if 0.25 <= peak_ratio <= 0.75 else -5
    elif "burst" in family_name:
        score += 25 if avg_ratio <= 0.35 and burstiness >= 0.10 else -15
    elif "memory" in family_name:
        score += 8

    if avg_ratio > 0.9:
        score -= 20
    return _clamp(score)


def _build_explanation(instance_type: str, total_cost: float, performance_score: float, fit_score: float, vcpu: int | None) -> str:
    capacity_text = f"{vcpu} vCPU capacity" if vcpu else "available capacity"
    if performance_score >= 75 and fit_score >= 70:
        return f"{instance_type} offers strong workload headroom, good utilisation fit, and {capacity_text} for this scenario."
    if total_cost <= 5:
        return f"{instance_type} stays low-cost for the requested runtime while still meeting the scenario constraints."
    return f"{instance_type} provides a balanced trade-off between price, workload fit, and {capacity_text}."


def resolve_weights(payload: ScenarioCreate | RecommendationRequest) -> tuple[float, float, float]:
    if payload.cost_weight is not None and payload.performance_weight is not None and payload.fit_weight is not None:
        return (payload.cost_weight, payload.performance_weight, payload.fit_weight)
    return OBJECTIVE_PRESETS[payload.objective_type]


def create_scenario(session: Session, payload: ScenarioCreate | RecommendationRequest) -> ScenarioInput:
    cost_weight, performance_weight, fit_weight = resolve_weights(payload)
    scenario = ScenarioInput(
        scenario_name=payload.scenario_name,
        avg_cpu_usage=payload.avg_cpu_usage,
        peak_cpu_usage=payload.peak_cpu_usage,
        runtime_hours=payload.runtime_hours,
        region_code=payload.region_code,
        storage_type=payload.storage_type,
        storage_gb=payload.storage_gb,
        objective_type=payload.objective_type,
        cost_weight=cost_weight,
        performance_weight=performance_weight,
        fit_weight=fit_weight,
    )
    session.add(scenario)
    session.flush()
    return scenario

def _resolve_pricing_dataset_id(session: Session) -> int:
    dataset_id = get_latest_pricing_dataset_id(session)
    if dataset_id is None:
        raise ValueError("No pricing dataset has been imported yet")
    return dataset_id


def rank_recommendations(session: Session, payload: RecommendationRequest) -> tuple[ScenarioInput, RecommendationRun, list[RecommendationResult]]:
    started = perf_counter()
    scenario = create_scenario(session, payload)
    dataset_version_id = payload.dataset_version_id or _resolve_pricing_dataset_id(session)
    settings = get_settings()

    storage_rate = session.scalar(
        select(StoragePricing.price_per_gb_month)
        .where(
            StoragePricing.dataset_version_id == dataset_version_id,
            StoragePricing.region_code == payload.region_code,
            StoragePricing.storage_type == payload.storage_type,
        )
        .limit(1)
    )
    if storage_rate is None:
        raise ValueError(f"No storage pricing found for {payload.region_code} / {payload.storage_type}")

    query = (
        select(EC2Pricing, InstanceCatalog)
        .join(InstanceCatalog, InstanceCatalog.instance_type == EC2Pricing.instance_type)
        .where(
            EC2Pricing.dataset_version_id == dataset_version_id,
            EC2Pricing.region_code == payload.region_code,
        )
        .order_by(EC2Pricing.hourly_price.asc())
    )
    if payload.instance_types:
        query = query.where(EC2Pricing.instance_type.in_(payload.instance_types))

    candidate_rows = session.execute(query).all()
    if not candidate_rows:
        raise ValueError(f"No candidate instances found for region {payload.region_code}")

    raw_candidates: list[dict[str, float | str | int | None]] = []
    for pricing, instance in candidate_rows:
        vcpu = max(instance.vcpu or 1, 1)
        peak_ratio = payload.peak_cpu_usage / vcpu
        avg_ratio = payload.avg_cpu_usage / vcpu

        compute_cost = pricing.hourly_price * payload.runtime_hours
        storage_cost = storage_rate * payload.storage_gb * (payload.runtime_hours / settings.month_hours)
        total_cost = compute_cost + storage_cost

        capacity_score = _clamp(100 - max(peak_ratio - 0.8, 0) * 140)
        utilisation_score = _clamp(100 - abs(avg_ratio - 0.55) * 130)
        performance_score = round(_clamp(capacity_score * 0.7 + min(vcpu * 10, 100) * 0.3), 2)
        fit_score = round(_clamp(utilisation_score * 0.6 + _family_alignment_score(instance.family, avg_ratio, peak_ratio) * 0.4), 2)

        raw_candidates.append(
            {
                "instance_type": instance.instance_type,
                "region_code": payload.region_code,
                "compute_cost": round(compute_cost, 4),
                "storage_cost": round(storage_cost, 4),
                "total_cost": round(total_cost, 4),
                "performance_score": performance_score,
                "fit_score": fit_score,
                "hourly_price": pricing.hourly_price,
                "storage_price_per_gb_month": storage_rate,
                "family": instance.family,
                "vcpu": instance.vcpu,
                "memory_gb": instance.memory_gb,
                "explanation": _build_explanation(instance.instance_type, total_cost, performance_score, fit_score, instance.vcpu),
            }
        )

    min_cost = min(candidate["total_cost"] for candidate in raw_candidates)  # type: ignore[arg-type]
    max_cost = max(candidate["total_cost"] for candidate in raw_candidates)  # type: ignore[arg-type]

    ranked_payload: list[RankedCandidate] = []
    for candidate in raw_candidates:
        if max_cost == min_cost:
            cost_score = 100.0
        else:
            cost_score = round(((max_cost - float(candidate["total_cost"])) / (max_cost - min_cost)) * 100, 2)

        score = round(
            scenario.cost_weight * cost_score
            + scenario.performance_weight * float(candidate["performance_score"])
            + scenario.fit_weight * float(candidate["fit_score"]),
            2,
        )
        ranked_payload.append(
            RankedCandidate(
                instance_type=str(candidate["instance_type"]),
                region_code=str(candidate["region_code"]),
                compute_cost=float(candidate["compute_cost"]),
                storage_cost=float(candidate["storage_cost"]),
                total_cost=float(candidate["total_cost"]),
                cost_score=cost_score,
                performance_score=float(candidate["performance_score"]),
                fit_score=float(candidate["fit_score"]),
                score=score,
                rank_position=0,
                hourly_price=float(candidate["hourly_price"]),
                storage_price_per_gb_month=float(candidate["storage_price_per_gb_month"]),
                family=candidate["family"] and str(candidate["family"]),
                vcpu=int(candidate["vcpu"]) if candidate["vcpu"] is not None else None,
                memory_gb=float(candidate["memory_gb"]) if candidate["memory_gb"] is not None else None,
                explanation=str(candidate["explanation"]),
            )
        )

    ranked_payload.sort(key=lambda item: (-item.score, item.total_cost))
    ranked_payload = ranked_payload[: payload.limit]

    run = RecommendationRun(
        scenario_id=scenario.id,
        dataset_version_id=dataset_version_id,
        algorithm_name="weighted_multi_criteria_scoring",
        execution_ms=round((perf_counter() - started) * 1000, 2),
        candidate_count=len(candidate_rows),
    )
    session.add(run)
    session.flush()

    results: list[RecommendationResult] = []
    for index, item in enumerate(ranked_payload, start=1):
        result = RecommendationResult(
            run_id=run.id,
            instance_type=item.instance_type,
            region_code=item.region_code,
            compute_cost=item.compute_cost,
            storage_cost=item.storage_cost,
            total_cost=item.total_cost,
            cost_score=item.cost_score,
            performance_score=item.performance_score,
            fit_score=item.fit_score,
            score=item.score,
            rank_position=index,
            hourly_price=item.hourly_price,
            storage_price_per_gb_month=item.storage_price_per_gb_month,
            family=item.family,
            vcpu=item.vcpu,
            memory_gb=item.memory_gb,
            explanation=item.explanation,
        )
        results.append(result)

    session.add_all(results)
    session.commit()
    session.refresh(scenario)
    session.refresh(run)
    for result in results:
        session.refresh(result)
    return scenario, run, results
