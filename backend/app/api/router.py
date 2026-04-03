from fastapi import APIRouter

from app.api.routes import catalog, health, imports, recommendations, scenarios, tests

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(imports.router, tags=["imports"])
api_router.include_router(catalog.router, tags=["catalog"])
api_router.include_router(scenarios.router, tags=["scenarios"])
api_router.include_router(recommendations.router, tags=["recommendations"])
api_router.include_router(tests.router, tags=["tests"])
