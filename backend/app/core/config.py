import os
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def build_default_database_url() -> str:
    app_data = os.getenv("APPDATA") or os.getenv("LOCALAPPDATA")
    base_dir = Path(app_data) if app_data else Path.cwd()
    db_path = (base_dir / "aws-ec2-dashboard" / "dev.db").resolve()
    return f"sqlite:///{db_path.as_posix()}"


class Settings(BaseSettings):
    project_name: str = "AWS EC2 Decision Support API"
    api_v1_prefix: str = ""
    database_url: str = build_default_database_url()
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    month_hours: int = 730

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
