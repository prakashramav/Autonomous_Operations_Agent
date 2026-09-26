import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List

# Explicitly load .env from backend directory and root directory
_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent
for env_file in [_backend_dir / ".env", _root_dir / ".env"]:
    if env_file.exists():
        load_dotenv(env_file, override=False)

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
        # Check instance attributes, then environment variables, then reload from backend/.env if needed
        key = self.GEMINI_API_KEY or self.GOOGLE_API_KEY or os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
        if not key or key.startswith("your-"):
            for ef in [_backend_dir / ".env", _root_dir / ".env"]:
                if ef.exists():
                    load_dotenv(ef, override=True)
                    key = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
                    if key and not key.startswith("your-"):
                        break
        return key.strip() if key else ""
    
    # Database & Cache (ready for Phase 2 & 3)
    DATABASE_URL: str = "postgresql+asyncpg://enterpriseops:enterpriseops_pwd@localhost:5432/enterpriseops_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://autonomous-operations-agent.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
