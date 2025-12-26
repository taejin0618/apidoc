import os
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

# .env 파일 경로 확인 (존재하고 읽을 수 있는 경우에만)
_env_file = BASE_DIR / ".env"
if _env_file.exists() and os.access(_env_file, os.R_OK):
    env_file_path = _env_file
else:
    env_file_path = None


class Settings(BaseSettings):
    """애플리케이션 설정"""

    model_config = SettingsConfigDict(
        env_file=env_file_path,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 환경 설정
    environment: Literal["development", "production", "test"] = Field(
        default="development", alias="NODE_ENV"
    )
    port: int = Field(default=3000, ge=1, le=65535)
    log_level: Literal["dev", "info", "warning", "error", "combined"] = Field(default="dev")

    # 데이터베이스
    mongodb_uri: str = Field(
        default="mongodb://localhost:27017/api-doc-manager",
        description="MongoDB 연결 URI",
    )

    # CORS 설정
    cors_origin: str = Field(default="*", description="CORS 허용 오리진 (쉼표로 구분)")

    # 애플리케이션 URL
    base_url: str = Field(default="", description="애플리케이션 기본 URL")

    # Slack 설정
    slack_enabled: bool = Field(default=False, description="Slack 알림 활성화 여부")
    slack_bot_token: str | None = Field(default=None, description="Slack Bot Token")

    # 프록시 설정
    trust_proxy: int | bool = Field(default=1, description="프록시 신뢰 설정")

    @field_validator("trust_proxy", mode="before")
    @classmethod
    def parse_trust_proxy(cls, value: str | int | bool | None) -> int | bool:
        """프록시 신뢰 설정 파싱"""
        if value is None:
            return 1
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value
        lowered = str(value).strip().lower()
        if lowered == "true":
            return True
        if lowered == "false":
            return False
        try:
            return int(lowered)
        except ValueError:
            return 1

    @property
    def is_production(self) -> bool:
        """프로덕션 환경 여부"""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """개발 환경 여부"""
        return self.environment == "development"

    @property
    def resolved_base_url(self) -> str:
        """해결된 기본 URL"""
        if self.base_url:
            return self.base_url
        return f"http://localhost:{self.port}"

    @property
    def cors_origins(self) -> list[str]:
        """CORS 오리진 목록"""
        raw = self.cors_origin.strip()
        if not raw:
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()
