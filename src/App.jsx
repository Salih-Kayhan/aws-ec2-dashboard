import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Cpu,
  Database,
  Download,
  DollarSign,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  LayoutDashboard,
  RefreshCcw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// AWS EC2 Cost / Performance Decision Support Dashboard
// Self-contained React implementation with FastAPI backend support
// ============================================================

const regionOptions = [
  { code: "us-east-1", label: "US East (N. Virginia)", multiplier: 1.0 },
  { code: "eu-west-1", label: "EU West (Ireland)", multiplier: 1.12 },
  { code: "ap-southeast-1", label: "Asia Pacific (Singapore)", multiplier: 1.18 },
  { code: "eu-central-1", label: "EU Central (Frankfurt)", multiplier: 1.15 },
];

const storageOptions = [
  { type: "gp3", label: "General Purpose SSD (gp3)", monthlyPerGb: 0.088, perfBonus: 1.0 },
  { type: "io2", label: "Provisioned IOPS SSD (io2)", monthlyPerGb: 0.125, perfBonus: 1.12 },
  { type: "st1", label: "Throughput Optimized HDD (st1)", monthlyPerGb: 0.05, perfBonus: 0.88 },
];

const instanceCatalog = [
  { id: "t3.medium", vcpu: 2, memory: 4, baseHourly: 0.0416, family: "Burstable", perfTier: 62 },
  { id: "t3.large", vcpu: 2, memory: 8, baseHourly: 0.0832, family: "Burstable", perfTier: 70 },
  { id: "m5.large", vcpu: 2, memory: 8, baseHourly: 0.0960, family: "General Purpose", perfTier: 76 },
  { id: "m5.xlarge", vcpu: 4, memory: 16, baseHourly: 0.1920, family: "General Purpose", perfTier: 84 },
  { id: "c5.large", vcpu: 2, memory: 4, baseHourly: 0.0850, family: "Compute Optimized", perfTier: 88 },
  { id: "c6i.large", vcpu: 2, memory: 4, baseHourly: 0.0890, family: "Compute Optimized", perfTier: 92 },
  { id: "r5.large", vcpu: 2, memory: 16, baseHourly: 0.1260, family: "Memory Optimized", perfTier: 79 },
  { id: "r6i.xlarge", vcpu: 4, memory: 32, baseHourly: 0.2520, family: "Memory Optimized", perfTier: 90 },
];

const savedScenarioSeeds = [
  {
    name: "Dev Analytics Prototype",
    avgCpuUsage: 0.65,
    peakCpuUsage: 1.1,
    runtimeHours: 180,
    region: "eu-west-1",
    storageType: "gp3",
    storageGb: 120,
    objective: "balanced",
  },
  {
    name: "Batch Compute Burst",
    avgCpuUsage: 1.45,
    peakCpuUsage: 2.2,
    runtimeHours: 72,
    region: "us-east-1",
    storageType: "gp3",
    storageGb: 80,
    objective: "performance",
  },
  {
    name: "Long Running Internal Tool",
    avgCpuUsage: 0.4,
    peakCpuUsage: 0.85,
    runtimeHours: 720,
    region: "eu-central-1",
    storageType: "st1",
    storageGb: 200,
    objective: "cost",
  },
];

const benchmarkScenarioSeeds = [
  {
    id: "low-cpu-long-runtime",
    name: "Low CPU / Long Runtime",
    description: "Good for validating cheaper long-duration recommendations.",
    avgCpuUsage: 0.35,
    peakCpuUsage: 0.7,
    runtimeHours: 720,
    region: "eu-west-1",
    storageType: "st1",
    storageGb: 160,
    objective: "cost",
  },
  {
    id: "high-cpu-short-runtime",
    name: "High CPU / Short Runtime",
    description: "Checks whether compute-optimised options rise for burstier short runs.",
    avgCpuUsage: 1.8,
    peakCpuUsage: 2.8,
    runtimeHours: 48,
    region: "us-east-1",
    storageType: "gp3",
    storageGb: 80,
    objective: "performance",
  },
  {
    id: "high-storage-moderate-cpu",
    name: "High Storage / Moderate CPU",
    description: "Shows how storage-heavy workloads shift total cost and rankings.",
    avgCpuUsage: 0.8,
    peakCpuUsage: 1.3,
    runtimeHours: 240,
    region: "eu-central-1",
    storageType: "gp3",
    storageGb: 600,
    objective: "balanced",
  },
  {
    id: "region-sensitive-workload",
    name: "Region-Sensitive Workload",
    description: "Useful for comparing similar workloads across different pricing regions.",
    avgCpuUsage: 1.0,
    peakCpuUsage: 1.7,
    runtimeHours: 300,
    region: "ap-southeast-1",
    storageType: "gp3",
    storageGb: 150,
    objective: "balanced",
  },
  {
    id: "cost-priority-workload",
    name: "Cost-Priority Workload",
    description: "Emphasises the lowest reasonable spend for a steady workload.",
    avgCpuUsage: 0.55,
    peakCpuUsage: 0.95,
    runtimeHours: 500,
    region: "eu-west-1",
    storageType: "st1",
    storageGb: 120,
    objective: "cost",
  },
  {
    id: "balanced-priority-workload",
    name: "Balanced-Priority Workload",
    description: "A repeatable middle-ground scenario for demos and evaluation.",
    avgCpuUsage: 0.9,
    peakCpuUsage: 1.6,
    runtimeHours: 240,
    region: "eu-west-1",
    storageType: "gp3",
    storageGb: 120,
    objective: "balanced",
  },
];

const latencyByRegion = {
  "us-east-1": 46,
  "eu-west-1": 23,
  "ap-southeast-1": 91,
  "eu-central-1": 28,
};

const objectivePresets = {
  balanced: { costWeight: 0.45, performanceWeight: 0.4, utilisationWeight: 0.15 },
  cost: { costWeight: 0.65, performanceWeight: 0.2, utilisationWeight: 0.15 },
  performance: { costWeight: 0.2, performanceWeight: 0.65, utilisationWeight: 0.15 },
};

const MONTH_HOURS = 730;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const initialFilters = {
  scenarioName: "Main Analysis",
  avgCpuUsage: 0.9,
  peakCpuUsage: 1.6,
  runtimeHours: 240,
  region: "eu-west-1",
  storageType: "gp3",
  storageGb: 120,
  objective: "balanced",
  search: "",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatCompact = (value) =>
  new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const slugify = (value) =>
  String(value || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRegion = (code) => regionOptions.find((r) => r.code === code) || regionOptions[0];
const getStorage = (type) => storageOptions.find((s) => s.type === type) || storageOptions[0];
const normaliseFamilyLabel = (value) =>
  (value || "Unknown")
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");

function buildScenario(instance, filters) {
  const region = getRegion(filters.region);
  const storage = getStorage(filters.storageType);

  const runtimeCost = instance.baseHourly * region.multiplier * filters.runtimeHours;
  const proratedStorageCost = storage.monthlyPerGb * filters.storageGb * (filters.runtimeHours / MONTH_HOURS);
  const totalCost = runtimeCost + proratedStorageCost;

  const peakRatio = filters.peakCpuUsage / Math.max(instance.vcpu, 1);
  const avgRatio = filters.avgCpuUsage / Math.max(instance.vcpu, 1);
  const capacityScore = clamp(100 - Math.max(peakRatio - 0.8, 0) * 140, 0, 100);
  const familyScore = familyAlignmentScore(instance.family, avgRatio, peakRatio);
  const utilisationFit = clamp(100 - Math.abs(avgRatio - 0.55) * 130, 0, 100);
  const estimatedThroughput = (capacityScore * 0.7 + Math.min(instance.vcpu * 10, 100) * 0.3) * storage.perfBonus;
  const regionLatencyPenalty = latencyByRegion[filters.region] / 200;
  const effectivePerformance = estimatedThroughput * (1 - regionLatencyPenalty * 0.12);
  const workloadFit = clamp(utilisationFit * 0.6 + familyScore * 0.4, 0, 100);
  const costEfficiency = effectivePerformance / Math.max(totalCost, 0.01);

  return {
    ...filters,
    instanceId: instance.id,
    family: instance.family,
    vcpu: instance.vcpu,
    memory: instance.memory,
    baseHourly: instance.baseHourly,
    regionLabel: region.label,
    storageLabel: storage.label,
    runtimeCost,
    proratedStorageCost,
    totalCost,
    estimatedThroughput,
    effectivePerformance,
    utilisationFit: workloadFit,
    costEfficiency,
    latency: latencyByRegion[filters.region],
    avgCpuUsage: filters.avgCpuUsage,
    peakCpuUsage: filters.peakCpuUsage,
  };
}

function familyAlignmentScore(family, avgRatio, peakRatio) {
  const burstiness = Math.max(peakRatio - avgRatio, 0);
  switch (family) {
    case "Burstable":
      return clamp(50 + (avgRatio <= 0.35 && burstiness >= 0.1 ? 25 : -15), 0, 100);
    case "General Purpose":
      return clamp(50 + (peakRatio >= 0.25 && peakRatio <= 0.75 ? 20 : -5), 0, 100);
    case "Compute Optimized":
      return clamp(50 + (peakRatio >= 0.55 ? 25 : -10), 0, 100);
    case "Memory Optimized":
      return 58;
    default:
      return 50;
  }
}

function scoreScenario(scenario, objective = "balanced") {
  const preset = objectivePresets[objective] || objectivePresets.balanced;

  const normalisedCost = clamp(100 - scenario.totalCost * 1.8, 0, 100);
  const normalisedPerformance = clamp(scenario.effectivePerformance, 0, 100);
  const normalisedFit = clamp(scenario.utilisationFit, 0, 100);

  const weighted =
    normalisedCost * preset.costWeight +
    normalisedPerformance * preset.performanceWeight +
    normalisedFit * preset.utilisationWeight;

  return {
    ...scenario,
    recommendationScore: Number(weighted.toFixed(2)),
    normalisedCost,
    normalisedPerformance,
    normalisedFit,
  };
}

function buildRuntimeSeries(bestScenario, currentFilters) {
  const checkpoints = [0.25, 0.5, 1, 1.5, 2].map((multiplier) =>
    Number(Math.max(1, (currentFilters.runtimeHours * multiplier).toFixed(1)))
  );

  if (bestScenario.hourlyPrice) {
    return checkpoints.map((hours) => ({
      runtimeHours: hours,
      totalCost: Number(
        (
          bestScenario.hourlyPrice * hours +
          bestScenario.storagePricePerGbMonth * currentFilters.storageGb * (hours / MONTH_HOURS)
        ).toFixed(2)
      ),
      performance: Number(bestScenario.effectivePerformance.toFixed(1)),
    }));
  }

  const instance = instanceCatalog.find((item) => item.id === bestScenario.instanceId) || instanceCatalog[0];
  return checkpoints.map((hours) => {
    const candidate = buildScenario(instance, { ...currentFilters, runtimeHours: hours });
    const scored = scoreScenario(candidate, currentFilters.objective);
    return {
      runtimeHours: hours,
      totalCost: Number(scored.totalCost.toFixed(2)),
      performance: Number(scored.effectivePerformance.toFixed(1)),
    };
  });
}

function buildApiPayload(filters) {
  return {
    scenario_name: filters.scenarioName,
    avg_cpu_usage: filters.avgCpuUsage,
    peak_cpu_usage: filters.peakCpuUsage,
    runtime_hours: filters.runtimeHours,
    region_code: filters.region,
    storage_type: filters.storageType,
    storage_gb: filters.storageGb,
    objective_type: filters.objective,
  };
}

function mapApiScenario(scenario) {
  return {
    id: scenario.id,
    name: scenario.scenario_name || "Saved scenario",
    avgCpuUsage: scenario.avg_cpu_usage,
    peakCpuUsage: scenario.peak_cpu_usage,
    runtimeHours: scenario.runtime_hours,
    region: scenario.region_code,
    storageType: scenario.storage_type,
    storageGb: scenario.storage_gb,
    objective: scenario.objective_type,
    createdAt: scenario.created_at,
  };
}

function mapApiRunSummary(run) {
  return {
    id: run.id,
    scenarioId: run.scenario_id,
    datasetVersionId: run.dataset_version_id,
    algorithmName: run.algorithm_name,
    executionMs: run.execution_ms,
    candidateCount: run.candidate_count,
    createdAt: run.created_at,
  };
}

function mapApiRunDetail(run) {
  const scenario = {
    id: run.scenario.id,
    scenarioName: run.scenario.scenario_name || `Scenario ${run.scenario.id}`,
    avgCpuUsage: run.scenario.avg_cpu_usage,
    peakCpuUsage: run.scenario.peak_cpu_usage,
    runtimeHours: run.scenario.runtime_hours,
    region: run.scenario.region_code,
    storageType: run.scenario.storage_type,
    storageGb: run.scenario.storage_gb,
    objective: run.scenario.objective_type,
    createdAt: run.scenario.created_at,
  };

  return {
    id: run.run_id,
    scenarioId: run.scenario_id,
    datasetVersionId: run.dataset_version_id,
    algorithmName: run.algorithm_name,
    executionMs: run.execution_ms,
    candidateCount: run.candidate_count,
    createdAt: run.created_at,
    scenario,
    results: mapApiRecommendationResults(run.results, {
      region: scenario.region,
      storageType: scenario.storageType,
    }),
  };
}

function buildExecutionKey(filters) {
  return [
    filters.avgCpuUsage,
    filters.peakCpuUsage,
    filters.runtimeHours,
    filters.region,
    filters.storageType,
    filters.storageGb,
    filters.objective,
  ].join("|");
}

function buildRecommendationCsv(filters, rows, resultSource) {
  const scenarioLines = [
    ["scenario_name", filters.scenarioName],
    ["avg_cpu_usage", filters.avgCpuUsage],
    ["peak_cpu_usage", filters.peakCpuUsage],
    ["runtime_hours", filters.runtimeHours],
    ["region_code", filters.region],
    ["storage_type", filters.storageType],
    ["storage_gb", filters.storageGb],
    ["objective_type", filters.objective],
    ["result_source", resultSource],
  ];

  const headers = [
    "rank",
    "instance_type",
    "family",
    "region",
    "vcpu",
    "memory_gb",
    "runtime_cost",
    "storage_cost",
    "total_cost",
    "performance_score",
    "fit_score",
    "recommendation_score",
    "explanation",
  ];

  const bodyRows = rows.map((row, index) => [
    index + 1,
    row.instanceId,
    row.family,
    row.region,
    row.vcpu,
    row.memory,
    row.runtimeCost,
    row.proratedStorageCost,
    row.totalCost,
    row.effectivePerformance,
    row.utilisationFit,
    row.recommendationScore,
    row.explanation || "",
  ]);

  return [
    ...scenarioLines.map((line) => line.map(csvValue).join(",")),
    "",
    headers.map(csvValue).join(","),
    ...bodyRows.map((line) => line.map(csvValue).join(",")),
  ].join("\n");
}

function buildEvidenceSummary(filters, best, resultSource, recentRuns, selectedRunDetail) {
  const summaryLines = [
    "AWS EC2 Dashboard Evidence Summary",
    "",
    `Scenario name: ${filters.scenarioName}`,
    `Average CPU usage: ${filters.avgCpuUsage} vCPU`,
    `Peak CPU usage: ${filters.peakCpuUsage} vCPU`,
    `Runtime: ${filters.runtimeHours} hours`,
    `Region: ${filters.region}`,
    `Storage: ${filters.storageType} / ${filters.storageGb} GB`,
    `Objective: ${filters.objective}`,
    `Result source: ${resultSource}`,
    "",
  ];

  if (best) {
    summaryLines.push(
      "Current top recommendation",
      `Instance type: ${best.instanceId}`,
      `Family: ${best.family}`,
      `Total cost: ${formatCurrency(best.totalCost)}`,
      `Performance score: ${best.effectivePerformance.toFixed(1)}`,
      `Fit score: ${best.utilisationFit.toFixed(1)}`,
      `Recommendation score: ${best.recommendationScore}`,
      `Explanation: ${best.explanation || "No explanation available."}`,
      ""
    );
  }

  if (selectedRunDetail) {
    summaryLines.push(
      "Selected run detail",
      `Run id: ${selectedRunDetail.id}`,
      `Created at: ${formatDateTime(selectedRunDetail.createdAt)}`,
      `Execution time: ${selectedRunDetail.executionMs.toFixed(1)} ms`,
      `Candidate count: ${selectedRunDetail.candidateCount}`,
      `Dataset version: ${selectedRunDetail.datasetVersionId}`,
      ""
    );
  }

  if (recentRuns.length > 0) {
    summaryLines.push("Recent run ids", recentRuns.map((run) => `#${run.id}`).join(", "));
  }

  return summaryLines.join("\n");
}

function mapApiRecommendationResults(results, filters) {
  const region = getRegion(filters.region);
  const storage = getStorage(filters.storageType);

  return results.map((row) => ({
    instanceId: row.instance_type,
    family: normaliseFamilyLabel(row.family),
    vcpu: row.vcpu,
    memory: row.memory_gb,
    region: row.region_code,
    regionLabel: region.label,
    storageType: filters.storageType,
    storageLabel: storage.label,
    runtimeCost: row.compute_cost,
    proratedStorageCost: row.storage_cost,
    totalCost: row.total_cost,
    effectivePerformance: row.performance_score,
    utilisationFit: row.fit_score,
    recommendationScore: row.score,
    normalisedCost: row.cost_score,
    normalisedPerformance: row.performance_score,
    normalisedFit: row.fit_score,
    latency: latencyByRegion[filters.region],
    hourlyPrice: row.hourly_price,
    storagePricePerGbMonth: row.storage_price_per_gb_month,
    explanation: row.explanation,
  }));
}

function mapBackendConfig(config) {
  const storageTypeMeta = storageOptions.reduce((acc, item) => {
    acc[item.type] = item;
    return acc;
  }, {});

  const uniqueStorageTypes = [...new Set(config.storage_types.map((item) => item.storage_type))];

  return {
    regions: config.regions.map((region) => ({
      code: region.region_code,
      label: region.region_name,
      multiplier: getRegion(region.region_code).multiplier,
    })),
    storageTypes: uniqueStorageTypes.map((storageType) => ({
      type: storageType,
      label: storageTypeMeta[storageType]?.label || storageType,
      monthlyPerGb: storageTypeMeta[storageType]?.monthlyPerGb || 0,
      perfBonus: storageTypeMeta[storageType]?.perfBonus || 1,
    })),
    instances: config.instances.map((instance) => ({
      id: instance.instance_type,
      vcpu: instance.vcpu,
      memory: instance.memory_gb,
      family: normaliseFamilyLabel(instance.family),
    })),
  };
}

const apiClient = {
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error("Health check failed");
      const data = await response.json();
      return {
        status: data.status,
        backendConnected: true,
        timestamp: data.timestamp,
      };
    } catch {
      return { status: "offline-fallback", backendConnected: false, timestamp: new Date().toISOString() };
    }
  },
  async getConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/config`);
      if (!response.ok) throw new Error("Config request failed");
      const data = await response.json();
      return mapBackendConfig(data);
    } catch {
      return {
        regions: regionOptions,
        storageTypes: storageOptions,
        instances: instanceCatalog,
      };
    }
  },
  async getSavedScenarios() {
    try {
      const response = await fetch(`${API_BASE_URL}/scenarios`);
      if (!response.ok) throw new Error("Scenario request failed");
      const data = await response.json();
      return data.map(mapApiScenario);
    } catch {
      return savedScenarioSeeds;
    }
  },
  async getRuns() {
    try {
      const response = await fetch(`${API_BASE_URL}/runs`);
      if (!response.ok) throw new Error("Run history request failed");
      const data = await response.json();
      return data.map(mapApiRunSummary);
    } catch {
      return [];
    }
  },
  async getRun(runId) {
    try {
      const response = await fetch(`${API_BASE_URL}/runs/${runId}`);
      if (!response.ok) throw new Error("Run detail request failed");
      const data = await response.json();
      return mapApiRunDetail(data);
    } catch {
      return null;
    }
  },
  async runRecommendation(filters, options = {}) {
    const { fallbackToMock = true } = options;
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApiPayload(filters)),
      });
      if (!response.ok) throw new Error("Recommendation request failed");
      const data = await response.json();
      return {
        rows: mapApiRecommendationResults(data.results, filters),
        source: "live",
        error: null,
        runMeta: {
          id: data.run_id,
          scenarioId: data.scenario_id,
          datasetVersionId: data.dataset_version_id,
          algorithmName: data.algorithm_name,
          executionMs: data.execution_ms,
          candidateCount: data.candidate_count,
          createdAt: data.created_at,
        },
      };
    } catch (error) {
      if (!fallbackToMock) {
        throw error;
      }
      const computed = instanceCatalog.map((instance) => scoreScenario(buildScenario(instance, filters), filters.objective));
      return {
        rows: computed.sort((a, b) => b.recommendationScore - a.recommendationScore),
        source: "fallback",
        error: error instanceof Error ? error.message : "Recommendation request failed",
        runMeta: null,
      };
    }
  },
  async saveScenario(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApiPayload(payload)),
      });
      if (!response.ok) throw new Error("Scenario save failed");
      const data = await response.json();
      return { ok: true, scenario: mapApiScenario(data) };
    } catch {
      return { ok: false };
    }
  },
  async deleteScenario(scenarioId) {
    try {
      const response = await fetch(`${API_BASE_URL}/scenarios/${scenarioId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Scenario delete failed");
      const data = await response.json();
      return { ok: true, message: data.message };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Scenario delete failed" };
    }
  },
};

function StatCard({ icon, label, value, subtext }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{subtext}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon, children, right }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="rounded-2xl bg-slate-100 p-2">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AccordionSection({ title, subtitle, icon, open, onToggle, children, badge }) {
  const Icon = icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="rounded-2xl bg-slate-100 p-2">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              {badge && <Pill>{badge}</Pill>}
            </div>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-slate-200 p-4">{children}</div>}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function ScoreBadge({ score }) {
  const tone =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 65
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>Score {score}</span>;
}

function FormLabel({ children }) {
  return <label className="mb-2 block text-sm font-medium text-slate-700">{children}</label>;
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function NumericSliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  description,
  sliderLabels,
}) {
  const sliderMax = Math.max(max, Number(value) || max);
  const sliderMin = Math.min(min, Number(value) || min);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <FormLabel>{label}</FormLabel>
          {description && <p className="mb-3 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        <div className="w-24 shrink-0">
          <input
            type="number"
            min={min}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
          />
          {unit && <div className="mt-1 text-right text-[11px] uppercase tracking-wide text-slate-400">{unit}</div>}
        </div>
      </div>
      <div className="mt-3">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
          <span>{sliderLabels?.[0] || min}</span>
          <span>{sliderLabels?.[1] || `${sliderMax}${unit ? ` ${unit}` : ""}`}</span>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({ open, title, message, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <div className="font-semibold text-slate-900">{point.instanceId || `Runtime ${point.runtimeHours}h`}</div>
      {point.regionLabel && <div className="text-slate-500">{point.regionLabel}</div>}
      {point.totalCost !== undefined && <div className="mt-2">Cost: {formatCurrency(point.totalCost)}</div>}
      {point.effectivePerformance !== undefined && <div>Performance: {point.effectivePerformance.toFixed(1)}</div>}
      {point.performance !== undefined && point.effectivePerformance === undefined && <div>Performance: {point.performance.toFixed(1)}</div>}
      {point.score !== undefined && point.recommendationScore === undefined && <div>Score: {point.score.toFixed(2)}</div>}
      {point.recommendationScore !== undefined && <div>Score: {point.recommendationScore}</div>}
    </div>
  );
}

export default function AwsEc2CostPerformanceDashboard() {
  const [config, setConfig] = useState({ regions: [], storageTypes: [], instances: [] });
  const [apiStatus, setApiStatus] = useState({ status: "loading", backendConnected: false });
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState(null);
  const [recommendationRows, setRecommendationRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingRunDetail, setIsLoadingRunDetail] = useState(false);
  const [resultSource, setResultSource] = useState("loading");
  const [resultMessage, setResultMessage] = useState("Loading recommendation results...");
  const [lastRunInputKey, setLastRunInputKey] = useState(null);
  const [exportNotice, setExportNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [openSections, setOpenSections] = useState({
    scenarioInputs: true,
    scenarioLibrary: false,
    advancedFilters: false,
    benchmarkRuns: false,
    runHistory: false,
    evidence: false,
  });

  const [filters, setFilters] = useState(initialFilters);
  const executionInputKey = buildExecutionKey(filters);

  async function refreshSavedScenarios() {
    const scenarios = await apiClient.getSavedScenarios();
    setSavedScenarios(scenarios);
    return scenarios;
  }

  async function refreshRecentRuns() {
    const runs = await apiClient.getRuns();
    setRecentRuns(runs.slice(0, 8));
    return runs;
  }

  useEffect(() => {
    async function load() {
      const [health, cfg, scenarios, runs] = await Promise.all([
        apiClient.healthCheck(),
        apiClient.getConfig(),
        apiClient.getSavedScenarios(),
        apiClient.getRuns(),
      ]);
      setApiStatus(health);
      setConfig(cfg);
      setSavedScenarios(scenarios);
      setRecentRuns(runs.slice(0, 8));
      const initialRecommendationResponse = await apiClient.runRecommendation(initialFilters, { fallbackToMock: true });
      setRecommendationRows(initialRecommendationResponse.rows);
      setResultSource(initialRecommendationResponse.source);
      setResultMessage(
        initialRecommendationResponse.source === "live"
          ? "Showing recommendation results from the FastAPI backend and PostgreSQL dataset."
          : "Backend recommendation retrieval was unavailable, so a local fallback ranking is being shown."
      );
      setLastRunInputKey(buildExecutionKey(initialFilters));
      if (initialRecommendationResponse.runMeta) {
        setRecentRuns((prev) => {
          const next = [initialRecommendationResponse.runMeta, ...prev.filter((item) => item.id !== initialRecommendationResponse.runMeta.id)];
          return next.slice(0, 8);
        });
        const runDetail = await apiClient.getRun(initialRecommendationResponse.runMeta.id);
        setSelectedRunDetail(runDetail);
      } else if (runs.length > 0) {
        const runDetail = await apiClient.getRun(runs[0].id);
        setSelectedRunDetail(runDetail);
      }
    }
    load();
  }, []);

  const localRankedScenarios = useMemo(() => {
    return instanceCatalog
      .map((instance) => buildScenario(instance, filters))
      .map((scenario) => scoreScenario(scenario, filters.objective))
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [filters]);

  const hasPendingChanges = lastRunInputKey !== null && executionInputKey !== lastRunInputKey;

  const rankedScenarios = useMemo(() => {
    let source = recommendationRows;
    if (!source.length && (!apiStatus.backendConnected || resultSource === "fallback")) {
      source = localRankedScenarios;
    }
    return source
      .filter((item) => {
        return !filters.search || item.instanceId.toLowerCase().includes(filters.search.toLowerCase());
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [apiStatus.backendConnected, filters.search, localRankedScenarios, recommendationRows, resultSource]);

  const best = rankedScenarios[0];
  const cheapest = [...rankedScenarios].sort((a, b) => a.totalCost - b.totalCost)[0];
  const fastest = [...rankedScenarios].sort((a, b) => b.effectivePerformance - a.effectivePerformance)[0];

  const runtimeSeries = useMemo(() => (best ? buildRuntimeSeries(best, filters) : []), [best, filters]);
  const topCandidateComparison = useMemo(
    () =>
      rankedScenarios.slice(0, 6).map((row) => ({
        instanceId: row.instanceId,
        score: row.recommendationScore,
        totalCost: row.totalCost,
        performance: row.effectivePerformance,
      })),
    [rankedScenarios]
  );

  const comparisonRows = useMemo(
    () => rankedScenarios.filter((item) => selectedRows.includes(item.instanceId)).slice(0, 3),
    [rankedScenarios, selectedRows]
  );

  const scenarioNameById = useMemo(() => {
    return savedScenarios.reduce((acc, scenario) => {
      if (scenario.id !== undefined) {
        acc[scenario.id] = scenario.name;
      }
      return acc;
    }, {});
  }, [savedScenarios]);

  const selectedRunTopResults = useMemo(() => {
    return selectedRunDetail?.results?.slice(0, 3) || [];
  }, [selectedRunDetail]);

  const summaryNarrative = useMemo(() => {
    if (!best || !cheapest || !fastest) return "Loading recommendation summary...";
    if (hasPendingChanges) {
      return "The workload inputs have changed since the last executed run. Click Run to refresh the ranking for the current values.";
    }
    if (best.explanation) {
      return best.explanation;
    }

    if (filters.objective === "cost") {
      return `${best.instanceId} is currently the most cost-aware option for the chosen workload profile, balancing low runtime cost with acceptable CPU headroom and utilisation fit.`;
    }
    if (filters.objective === "performance") {
      return `${best.instanceId} is the strongest performance-led recommendation, offering the highest overall technical suitability for the current average CPU, peak CPU, runtime, and storage profile.`;
    }
    return `${best.instanceId} is the best balanced recommendation right now, giving a strong trade-off between total cost, effective performance, and workload fit for the exact values entered.`;
  }, [best, cheapest, fastest, filters.objective, hasPendingChanges]);

  async function executeRecommendation(nextFilters) {
    setIsRefreshing(true);
    try {
      const refreshed = await apiClient.runRecommendation(nextFilters, { fallbackToMock: true });
      setRecommendationRows(refreshed.rows);
      setResultSource(refreshed.source);
      setResultMessage(
        refreshed.source === "live"
          ? "Showing recommendation results from the FastAPI backend and PostgreSQL dataset."
          : "Backend recommendation retrieval failed for this run, so the dashboard is showing a local fallback ranking."
      );
      setLastRunInputKey(buildExecutionKey(nextFilters));
      if (refreshed.runMeta) {
        setRecentRuns((prev) => {
          const next = [refreshed.runMeta, ...prev.filter((item) => item.id !== refreshed.runMeta.id)];
          return next.slice(0, 8);
        });
        const runDetail = await apiClient.getRun(refreshed.runMeta.id);
        setSelectedRunDetail(runDetail);
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshRecommendations() {
    await executeRecommendation(filters);
  }

  async function saveCurrentScenario() {
    setIsSaving(true);
    try {
      const result = await apiClient.saveScenario({
        name: filters.scenarioName,
        ...filters,
      });
      if (result.ok) {
        await refreshSavedScenarios();
        setExportNotice(`Saved scenario "${filters.scenarioName}"`);
      } else {
        setSavedScenarios((prev) => {
          const scenario = {
            name: filters.scenarioName,
            avgCpuUsage: filters.avgCpuUsage,
            peakCpuUsage: filters.peakCpuUsage,
            runtimeHours: filters.runtimeHours,
            region: filters.region,
            storageType: filters.storageType,
            storageGb: filters.storageGb,
            objective: filters.objective,
          };
          return [scenario, ...prev];
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  function loadScenario(seed) {
    setFilters((prev) => ({
      ...prev,
      scenarioName: seed.name,
      avgCpuUsage: seed.avgCpuUsage,
      peakCpuUsage: seed.peakCpuUsage,
      runtimeHours: seed.runtimeHours,
      region: seed.region,
      storageType: seed.storageType,
      storageGb: seed.storageGb,
      objective: seed.objective,
    }));
  }

  async function runBenchmark(seed) {
    const nextFilters = {
      ...filters,
      scenarioName: seed.name,
      avgCpuUsage: seed.avgCpuUsage,
      peakCpuUsage: seed.peakCpuUsage,
      runtimeHours: seed.runtimeHours,
      region: seed.region,
      storageType: seed.storageType,
      storageGb: seed.storageGb,
      objective: seed.objective,
      search: "",
    };
    setFilters(nextFilters);
    setSelectedRows([]);
    await executeRecommendation(nextFilters);
  }

  async function inspectRun(runId) {
    setIsLoadingRunDetail(true);
    try {
      const runDetail = await apiClient.getRun(runId);
      setSelectedRunDetail(runDetail);
    } finally {
      setIsLoadingRunDetail(false);
    }
  }

  async function deleteScenarioRecord(scenario) {
    if (scenario.id === undefined) return;
    setPendingDelete({
      scenario,
      stage: 1,
    });
  }

  async function confirmDeleteScenario() {
    if (!pendingDelete?.scenario?.id) return;

    if (pendingDelete.stage === 1) {
      setPendingDelete((prev) => (prev ? { ...prev, stage: 2 } : prev));
      return;
    }

    const scenario = pendingDelete.scenario;
    const result = await apiClient.deleteScenario(scenario.id);
    if (!result.ok) {
      setExportNotice(`Delete failed: ${result.message}`);
      setPendingDelete(null);
      return;
    }

    await Promise.all([refreshSavedScenarios(), refreshRecentRuns()]);
    setSelectedRunDetail((prev) => (prev?.scenarioId === scenario.id ? null : prev));
    setExportNotice(`${result.message} Removed scenario #${scenario.id}.`);
    setPendingDelete(null);
  }

  function cancelDeleteScenario() {
    setPendingDelete(null);
  }

  function exportCurrentResultsCsv() {
    if (!rankedScenarios.length) return;
    const filename = `${slugify(filters.scenarioName)}-recommendations.csv`;
    const csv = buildRecommendationCsv(filters, rankedScenarios.slice(0, 10), resultSource);
    downloadTextFile(filename, csv, "text/csv;charset=utf-8");
    setExportNotice(`Exported current recommendation results to ${filename}`);
  }

  function exportSelectedRunJson() {
    if (!selectedRunDetail) return;
    const filename = `run-${selectedRunDetail.id}-detail.json`;
    const content = JSON.stringify(selectedRunDetail, null, 2);
    downloadTextFile(filename, content, "application/json;charset=utf-8");
    setExportNotice(`Exported selected run detail to ${filename}`);
  }

  function exportEvidenceSummaryText() {
    const filename = `${slugify(filters.scenarioName)}-evidence-summary.txt`;
    const content = buildEvidenceSummary(filters, best, resultSource, recentRuns, selectedRunDetail);
    downloadTextFile(filename, content, "text/plain;charset=utf-8");
    setExportNotice(`Exported evidence summary to ${filename}`);
  }

  function toggleCompare(instanceId) {
    setSelectedRows((prev) => {
      if (prev.includes(instanceId)) return prev.filter((item) => item !== instanceId);
      if (prev.length >= 3) return [...prev.slice(1), instanceId];
      return [...prev, instanceId];
    });
  }

  function toggleSection(sectionKey) {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <ConfirmationModal
        open={Boolean(pendingDelete)}
        title={pendingDelete?.stage === 2 ? "Final confirmation required" : "Delete scenario?"}
        message={
          pendingDelete?.stage === 2
            ? "Please confirm again. This will permanently remove the scenario and any recommendation runs linked to it."
            : pendingDelete?.scenario
            ? `Delete "${pendingDelete.scenario.name}"${pendingDelete.scenario.id ? ` (#${pendingDelete.scenario.id})` : ""}? This also removes related recommendation history from the dashboard.`
            : ""
        }
        confirmLabel={pendingDelete?.stage === 2 ? "Delete permanently" : "Continue"}
        onConfirm={confirmDeleteScenario}
        onCancel={cancelDeleteScenario}
      />
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                <LayoutDashboard className="h-4 w-4" />
                AWS EC2 Recommendation Dashboard
              </div>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
                Find the best EC2 instance for your workload
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Compare cost, performance, and workload fit using exact runtime, CPU, region, and storage inputs.
                Each run is calculated from imported AWS pricing data and logged for later review.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>Backend recommendation engine</Pill>
                <Pill>Exact workload inputs</Pill>
                <Pill>Regional pricing data</Pill>
                <Pill>Run history and exports</Pill>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Scenario</div>
                  <div className="mt-2 text-lg font-semibold text-white">{filters.scenarioName}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {filters.avgCpuUsage}/{filters.peakCpuUsage} vCPU · {filters.runtimeHours}h
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Deployment profile</div>
                  <div className="mt-2 text-lg font-semibold text-white">{getRegion(filters.region).label}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {filters.storageType} · {filters.storageGb} GB · {filters.objective}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead estimate</div>
                  <div className="mt-2 text-lg font-semibold text-white">{best ? formatCurrency(best.totalCost) : "Calculating..."}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {best ? `${best.instanceId} · score ${best.recommendationScore}` : "Waiting for recommendation"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <ShieldCheck className="h-4 w-4" /> API Status
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Connection</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {apiStatus.backendConnected ? "Online" : "Offline"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">Health: {apiStatus.status}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Result source</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {resultSource === "live" ? "Backend run" : resultSource === "fallback" ? "Local fallback" : "Loading"}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      {hasPendingChanges ? "Re-run needed" : "Current run is up to date"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Server className="h-4 w-4" /> Recommendation snapshot
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold text-white">{best?.instanceId || "Calculating..."}</div>
                    <div className="mt-1 text-sm text-slate-300">
                      {best ? `${best.vcpu} vCPU · ${best.memory} GB RAM · ${best.family}` : "Waiting for ranked results"}
                    </div>
                  </div>
                  {best && <ScoreBadge score={best.recommendationScore} />}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{summaryNarrative}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-2">
            <SectionCard
              title="Workload controls"
              subtitle="Enter exact workload values and run a fresh recommendation scenario"
              icon={SlidersHorizontal}
              right={
                <button
                  onClick={refreshRecommendations}
                  disabled={isRefreshing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 md:w-auto"
                >
                  <RefreshCcw className="h-4 w-4" /> {isRefreshing ? "Running..." : "Run"}
                </button>
              }
            >
              <div className="space-y-4">
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    hasPendingChanges
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : resultSource === "live"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {hasPendingChanges ? "Inputs changed since the last executed run. Click Run to refresh the results." : resultMessage}
                </div>

                <div>
                  <FormLabel>Scenario name</FormLabel>
                  <input
                    value={filters.scenarioName}
                    onChange={(e) => setFilters((prev) => ({ ...prev, scenarioName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-400"
                    placeholder="e.g. Research dashboard workload"
                  />
                </div>

                <div className="space-y-4">
                  <NumericSliderField
                    label="Average CPU demand"
                    description="Drag for quick tuning or type an exact vCPU value."
                    value={filters.avgCpuUsage}
                    onChange={(next) => setFilters((prev) => ({ ...prev, avgCpuUsage: Number(next) }))}
                    min={0.1}
                    max={8}
                    step={0.05}
                    unit="vCPU"
                    sliderLabels={["Light", "High"]}
                  />
                  <NumericSliderField
                    label="Peak CPU demand"
                    description="Use peak demand to capture spikes and burst pressure."
                    value={filters.peakCpuUsage}
                    onChange={(next) => setFilters((prev) => ({ ...prev, peakCpuUsage: Number(next) }))}
                    min={0.1}
                    max={16}
                    step={0.05}
                    unit="vCPU"
                    sliderLabels={["Steady", "Burst"]}
                  />
                  <NumericSliderField
                    label="Runtime"
                    description="The slider handles common ranges, while the input keeps exact control."
                    value={filters.runtimeHours}
                    onChange={(next) => setFilters((prev) => ({ ...prev, runtimeHours: Number(next) }))}
                    min={1}
                    max={1500}
                    step={1}
                    unit="hrs"
                    sliderLabels={["Short", "Long"]}
                  />
                  <NumericSliderField
                    label="Storage size"
                    description="Adjust expected storage demand for the recommendation scenario."
                    value={filters.storageGb}
                    onChange={(next) => setFilters((prev) => ({ ...prev, storageGb: Number(next) }))}
                    min={1}
                    max={2000}
                    step={1}
                    unit="GB"
                    sliderLabels={["Small", "Large"]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <FormLabel>Region</FormLabel>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                    >
                      {config.regions.map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FormLabel>Storage type</FormLabel>
                    <select
                      value={filters.storageType}
                      onChange={(e) => setFilters((prev) => ({ ...prev, storageType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                    >
                      {config.storageTypes.map((storage) => (
                        <option key={storage.type} value={storage.type}>
                          {storage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <FormLabel>Optimisation objective</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "cost", label: "Cost" },
                      { value: "balanced", label: "Balanced" },
                      { value: "performance", label: "Performance" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilters((prev) => ({ ...prev, objective: option.value }))}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          filters.objective === option.value
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div>
                    <FormLabel>Search instance type</FormLabel>
                    <input
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                      placeholder="e.g. c6i"
                    />
                  </div>
                </div>

                <button
                  onClick={saveCurrentScenario}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  {isSaving ? "Saving scenario..." : "Save current scenario"}
                </button>
              </div>
            </SectionCard>

            <AccordionSection
              title="Saved scenarios"
              subtitle="Load previously saved workload profiles."
              icon={Database}
              open={openSections.scenarioLibrary}
              onToggle={() => toggleSection("scenarioLibrary")}
              badge={`${savedScenarios.length}`}
            >
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {savedScenarios.map((scenario) => (
                  <div
                    key={`${scenario.name}-${scenario.region}-${scenario.runtimeHours}-${scenario.id ?? "local"}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{scenario.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Avg {scenario.avgCpuUsage} vCPU · Peak {scenario.peakCpuUsage} vCPU · {scenario.runtimeHours}h
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {scenario.createdAt
                            ? `Saved ${formatDateTime(scenario.createdAt)}`
                            : "Saved locally in fallback mode"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scenario.id !== undefined && <Pill>#{scenario.id}</Pill>}
                        <Pill>{scenario.objective}</Pill>
                        {scenario.id !== undefined && (
                          <button
                            onClick={() => deleteScenarioRecord(scenario)}
                            className="rounded-xl border border-rose-200 bg-white px-2 py-2 text-rose-600 transition hover:bg-rose-50"
                            aria-label={`Delete ${scenario.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => loadScenario(scenario)}
                      className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection
              title="Benchmark scenarios"
              subtitle="Repeatable workload cases for demos, testing, and evaluation."
              icon={Zap}
              open={openSections.benchmarkRuns}
              onToggle={() => toggleSection("benchmarkRuns")}
              badge={`${benchmarkScenarioSeeds.length}`}
            >
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {benchmarkScenarioSeeds.map((scenario) => (
                  <div key={scenario.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{scenario.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{scenario.description}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          {`${scenario.region} · ${scenario.runtimeHours}h · ${scenario.storageGb} GB · ${scenario.objective}`}
                        </div>
                      </div>
                      <button
                        onClick={() => runBenchmark(scenario)}
                        disabled={isRefreshing}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection
              title="Recent recommendation runs"
              subtitle="Review recent recommendation executions."
              icon={Activity}
              open={openSections.runHistory}
              onToggle={() => toggleSection("runHistory")}
              badge={recentRuns.length ? `${recentRuns.length}` : undefined}
            >
              {recentRuns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Run a scenario to populate recommendation history.
                </div>
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            {scenarioNameById[run.scenarioId] || `Scenario ${run.scenarioId}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateTime(run.createdAt)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Pill>Run #{run.id}</Pill>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => inspectRun(run.id)}
                              disabled={isLoadingRunDetail}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() =>
                                deleteScenarioRecord({
                                  id: run.scenarioId,
                                  name: scenarioNameById[run.scenarioId] || `Scenario ${run.scenarioId}`,
                                })
                              }
                              className="rounded-xl border border-rose-200 bg-white px-2 py-1.5 text-rose-600 transition hover:bg-rose-50"
                              aria-label={`Delete run ${run.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <MiniMetric label="Execution" value={`${run.executionMs.toFixed(1)} ms`} />
                        <MiniMetric label="Candidates" value={String(run.candidateCount)} />
                        <MiniMetric label="Dataset" value={String(run.datasetVersionId)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            <SectionCard title="Selected run details" subtitle="Inspect one recorded recommendation execution" icon={Server}>
              {!selectedRunDetail ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  {isLoadingRunDetail ? "Loading run details..." : "Select Inspect on a recent run to view its scenario inputs and top ranked outputs."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <div className="text-sm text-slate-500">Scenario</div>
                      <div className="font-semibold text-slate-900">{selectedRunDetail.scenario.scenarioName}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(selectedRunDetail.createdAt)}</div>
                    </div>
                    <Pill>Run #{selectedRunDetail.id}</Pill>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniMetric
                      label="Scenario inputs"
                      value={`${selectedRunDetail.scenario.avgCpuUsage}/${selectedRunDetail.scenario.peakCpuUsage} vCPU · ${selectedRunDetail.scenario.runtimeHours}h`}
                    />
                    <MiniMetric
                      label="Region / storage"
                      value={`${selectedRunDetail.scenario.region} · ${selectedRunDetail.scenario.storageType} · ${selectedRunDetail.scenario.storageGb} GB`}
                    />
                    <MiniMetric label="Objective" value={selectedRunDetail.scenario.objective} />
                    <MiniMetric label="Execution / candidates" value={`${selectedRunDetail.executionMs.toFixed(1)} ms · ${selectedRunDetail.candidateCount}`} />
                  </div>

                  <div className="space-y-3">
                    {selectedRunTopResults.map((row, index) => (
                      <div key={`${selectedRunDetail.id}-${row.instanceId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-500">Rank {index + 1}</div>
                            <div className="font-semibold text-slate-900">{row.instanceId}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {row.regionLabel} · {row.vcpu} vCPU · {row.memory} GB RAM · {row.storageLabel}
                            </div>
                          </div>
                          <ScoreBadge score={row.recommendationScore} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <MiniMetric label="Total cost" value={formatCurrency(row.totalCost)} />
                          <MiniMetric label="Performance" value={row.effectivePerformance.toFixed(1)} />
                          <MiniMetric label="Fit" value={row.utilisationFit.toFixed(1)} />
                        </div>
                        {row.explanation && <div className="mt-3 text-sm text-slate-600">{row.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <AccordionSection
              title="Evidence exports"
              subtitle="Download structured outputs and keep a compact evidence snapshot."
              icon={FileText}
              open={openSections.evidence}
              onToggle={() => toggleSection("evidence")}
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Scenario" value={filters.scenarioName} />
                  <MiniMetric label="Top recommendation" value={best ? best.instanceId : "Not available"} />
                  <MiniMetric label="Results source" value={resultSource} />
                  <MiniMetric label="Selected run" value={selectedRunDetail ? `Run #${selectedRunDetail.id}` : "None selected"} />
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={exportCurrentResultsCsv}
                    disabled={!rankedScenarios.length}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" /> Export results CSV
                  </button>
                  <button
                    onClick={exportSelectedRunJson}
                    disabled={!selectedRunDetail}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" /> Export run JSON
                  </button>
                  <button
                    onClick={exportEvidenceSummaryText}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <FileText className="h-4 w-4" /> Export summary TXT
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-medium text-slate-900">Evidence snapshot</div>
                  <div className="mt-2">
                    {best
                      ? `${best.instanceId} is currently leading for ${filters.region} with an estimated total cost of ${formatCurrency(best.totalCost)} and a score of ${best.recommendationScore}.`
                      : "Run a recommendation to generate an evidence snapshot."}
                  </div>
                  {exportNotice && <div className="mt-3 text-xs text-slate-500">{exportNotice}</div>}
                </div>
              </div>
            </AccordionSection>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={DollarSign}
                label="Best cost"
                value={cheapest ? formatCurrency(cheapest.totalCost) : "-"}
                subtext={cheapest ? `${cheapest.instanceId} in ${cheapest.regionLabel}` : "Calculating"}
              />
              <StatCard
                icon={Zap}
                label="Best balanced choice"
                value={best ? best.instanceId : "-"}
                subtext={best ? `Score ${best.recommendationScore} · ${formatCurrency(best.totalCost)}` : "Calculating"}
              />
              <StatCard
                icon={Gauge}
                label="Best performance"
                value={fastest ? fastest.instanceId : "-"}
                subtext={fastest ? `${fastest.effectivePerformance.toFixed(1)} performance score` : "Calculating"}
              />
              <StatCard
                icon={Activity}
                label="Analysed options"
                value={formatCompact(rankedScenarios.length)}
                subtext={`${filters.region} · ${filters.storageType} · ${filters.objective}`}
              />
            </div>

            <SectionCard title="Recommendation summary" subtitle="Why this instance is ranked first" icon={BarChart3}>
              {best && (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-500">Recommended instance</div>
                        <div className="text-2xl font-semibold text-slate-900">{best.instanceId}</div>
                      </div>
                      <ScoreBadge score={best.recommendationScore} />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{summaryNarrative}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MiniMetric label="Total cost" value={formatCurrency(best.totalCost)} />
                      <MiniMetric label="Performance" value={best.effectivePerformance.toFixed(1)} />
                      <MiniMetric label="vCPU / RAM" value={`${best.vcpu} vCPU / ${best.memory} GB`} />
                      <MiniMetric label="Latency" value={`${best.latency} ms`} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <MiniMetric label="Runtime cost" value={formatCurrency(best.runtimeCost)} />
                    <MiniMetric label="Storage cost" value={formatCurrency(best.proratedStorageCost)} />
                    <MiniMetric label="Storage type" value={best.storageLabel} />
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Cost and performance trade-off" subtitle="Each point shows estimated cost against performance score for the filtered shortlist." icon={Cpu}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="totalCost"
                        name="Estimated total cost (USD)"
                        tickFormatter={(v) => `$${v.toFixed(0)}`}
                        label={{ value: "Estimated total cost (USD)", position: "insideBottom", offset: -4 }}
                      />
                      <YAxis
                        dataKey="effectivePerformance"
                        name="Performance score"
                        label={{ value: "Performance score", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Scatter data={rankedScenarios}>
                        {rankedScenarios.map((entry) => (
                          <Cell
                            key={`${entry.instanceId}-${entry.region}`}
                            fill={entry.instanceId === best?.instanceId ? "#0f172a" : "#94a3b8"}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Runtime sensitivity analysis" subtitle="Shows how the lead recommendation's cost and performance move as runtime changes." icon={RefreshCcw}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={runtimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="runtimeHours" label={{ value: "Runtime (hours)", position: "insideBottom", offset: -4 }} />
                      <YAxis yAxisId="left" label={{ value: "Total cost (USD)", angle: -90, position: "insideLeft" }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: "Performance score", angle: 90, position: "insideRight" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="totalCost" name="Estimated total cost (USD)" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="performance" name="Performance score" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Top candidate score comparison" subtitle="Compare recommendation score across the highest-ranked instance types." icon={Globe2}>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCandidateComparison} barGap={8} barCategoryGap="18%">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="instanceId" label={{ value: "Instance type", position: "insideBottom", offset: -4 }} />
                      <YAxis
                        yAxisId="left"
                        label={{ value: "Recommendation score", angle: -90, position: "insideLeft" }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                        label={{ value: "Total cost (USD)", angle: 90, position: "insideRight" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="score"
                        name="Recommendation score"
                        radius={[8, 8, 0, 0]}
                        fill="#0f172a"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="totalCost"
                        name="Estimated total cost (USD)"
                        radius={[8, 8, 0, 0]}
                        fill="#2563eb"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Top recommendations" subtitle="Ranked shortlist for the currently selected optimisation objective" icon={Server}>
                <div className="space-y-3">
                  {rankedScenarios.slice(0, 5).map((row, index) => (
                    <div
                      key={row.instanceId}
                      className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[56px_minmax(0,1.5fr)_minmax(260px,1fr)_auto] lg:items-center"
                    >
                      <div className="text-lg font-semibold text-slate-400">{index + 1}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">{row.instanceId}</div>
                          <Pill>{row.family}</Pill>
                          <ScoreBadge score={row.recommendationScore} />
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.regionLabel} · {row.vcpu} vCPU · {row.memory} GB RAM · {row.storageLabel}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MiniMetric label="Cost" value={formatCurrency(row.totalCost)} />
                        <MiniMetric label="Performance" value={row.effectivePerformance.toFixed(1)} />
                      </div>
                      <button
                        onClick={() => toggleCompare(row.instanceId)}
                        className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition lg:w-auto ${
                          selectedRows.includes(row.instanceId)
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {selectedRows.includes(row.instanceId) ? "Selected" : "Compare"}
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Comparison table" subtitle="Select up to three ranked candidates for a side-by-side comparison" icon={HardDrive}>
              {comparisonRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Select instance rows from the recommendations list to compare them here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="sticky top-0 border-b border-slate-200 bg-white text-slate-500">
                        <th className="px-4 py-3 font-medium">Rank</th>
                        <th className="px-4 py-3 font-medium">Instance</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">vCPU</th>
                        <th className="px-4 py-3 font-medium">Memory</th>
                        <th className="px-4 py-3 font-medium">Total cost</th>
                        <th className="px-4 py-3 font-medium">Performance score</th>
                        <th className="px-4 py-3 font-medium">Fit score</th>
                        <th className="px-4 py-3 font-medium">Recommendation score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, index) => (
                        <tr key={row.instanceId} className="border-b border-slate-100">
                          <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.instanceId}</td>
                          <td className="px-4 py-3 text-slate-600">{row.family}</td>
                          <td className="px-4 py-3 text-slate-600">{row.vcpu}</td>
                          <td className="px-4 py-3 text-slate-600">{row.memory} GB</td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(row.totalCost)}</td>
                          <td className="px-4 py-3 text-slate-600">{row.effectivePerformance.toFixed(1)}</td>
                          <td className="px-4 py-3 text-slate-600">{row.utilisationFit.toFixed(1)}</td>
                          <td className="px-4 py-3">
                            <ScoreBadge score={row.recommendationScore} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

