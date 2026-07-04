from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    discord_bot_token: str = ""
    backend_base_url: str = "http://127.0.0.1:8000"
    alert_poll_seconds: int = 30
    groq_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
