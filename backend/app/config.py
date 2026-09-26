import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "EnterpriseOps Agent Backend"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api"
    
    # Google Gemini LLM
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    DEFAULT_TEMPERATURE: float = 0.2

    @property
    def effective_gemini_key(self) -> str:
        key = self.GEMINI_API_KEY or self.GOOGLE_API_KEY or os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
        return key.strip()
    
    # Database & Cache (ready for Phase 2 & 3)
    DATABASE_URL: str = "postgresql+asyncpg://enterpriseops:enterpriseops_pwd@localhost:5432/enterpriseops_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
