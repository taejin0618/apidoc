"""API 요청/응답 스키마"""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.utils import validate_http_url


class UrlCreate(BaseModel):
    """API URL 등록 요청 스키마"""

    model_config = {"json_schema_extra": {"examples": [{"name": "User Service API", "url": "https://api.example.com/swagger.json", "group": "backend", "service": "user-service", "description": "사용자 관리 API", "owner": "admin@example.com", "tags": ["user", "auth"], "priority": "high"}]}}

    name: str = Field(
        ...,
        max_length=100,
        description="API 서비스 이름 (예: 'User Service API')",
        examples=["User Service API"],
    )
    url: str = Field(
        ...,
        description="Swagger/OpenAPI JSON 문서의 URL (HTTP 또는 HTTPS)",
        examples=["https://api.example.com/swagger.json"],
    )
    group: str = Field(
        ...,
        description="소속 팀 또는 그룹명 (예: 'backend', 'frontend')",
        examples=["backend"],
    )
    service: str = Field(
        ...,
        description="서비스명 (예: 'user-service', 'payment-service')",
        examples=["user-service"],
    )
    description: str | None = Field(
        default="",
        max_length=500,
        description="API에 대한 설명 (선택사항, 최대 500자)",
        examples=["사용자 관리 및 인증 API"],
    )
    owner: EmailStr | None = Field(
        default=None,
        description="API 담당자 이메일 주소 (Slack 알림용, 선택사항)",
        examples=["admin@example.com"],
    )
    tags: list[str] | None = Field(
        default=None,
        description="API 태그 목록 (검색 및 분류용, 선택사항)",
        examples=[["user", "auth", "api"]],
    )
    priority: Literal["low", "medium", "high"] | None = Field(
        default=None,
        description="우선순위 (low: 낮음, medium: 보통, high: 높음)",
        examples=["high"],
    )

    @field_validator("name")
    @classmethod
    def name_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("서비스명은 필수입니다")
        return value

    @field_validator("url")
    @classmethod
    def url_required(cls, value: str) -> str:
        validate_http_url(value)
        return value

    @field_validator("group")
    @classmethod
    def group_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("팀은 필수입니다")
        return value

    @field_validator("service")
    @classmethod
    def service_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("서비스는 필수입니다")
        return value

    @field_validator("owner", mode="before")
    @classmethod
    def owner_empty_to_none(cls, value):
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value


class UrlUpdate(BaseModel):
    """API URL 수정 요청 스키마"""

    model_config = {"json_schema_extra": {"examples": [{"name": "Updated User Service API", "description": "업데이트된 설명"}]}}

    name: str | None = Field(
        default=None,
        max_length=100,
        description="API 서비스 이름 (수정 시에만 제공)",
        examples=["Updated User Service API"],
    )
    url: str | None = Field(
        default=None,
        description="Swagger/OpenAPI JSON 문서의 URL (수정 시에만 제공)",
        examples=["https://api.example.com/v2/swagger.json"],
    )
    group: str | None = Field(
        default=None,
        description="소속 팀 또는 그룹명 (수정 시에만 제공)",
        examples=["backend"],
    )
    service: str | None = Field(
        default=None,
        description="서비스명 (수정 시에만 제공)",
        examples=["user-service"],
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="API에 대한 설명 (수정 시에만 제공)",
        examples=["업데이트된 API 설명"],
    )
    owner: EmailStr | None = Field(
        default=None,
        description="API 담당자 이메일 주소 (수정 시에만 제공)",
        examples=["new-owner@example.com"],
    )
    tags: list[str] | None = Field(
        default=None,
        description="API 태그 목록 (수정 시에만 제공)",
        examples=[["user", "auth"]],
    )
    priority: Literal["low", "medium", "high"] | None = Field(
        default=None,
        description="우선순위 (수정 시에만 제공)",
        examples=["medium"],
    )
    isActive: bool | None = Field(
        default=None,
        description="API 활성화 여부 (true: 활성화, false: 비활성화)",
        examples=[True],
    )

    @field_validator("url")
    @classmethod
    def url_valid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        validate_http_url(value)
        return value

    @field_validator("owner", mode="before")
    @classmethod
    def owner_empty_to_none(cls, value):
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def at_least_one_field(self):
        values = self.model_dump(exclude_unset=True)
        if not values:
            raise ValueError("최소 한 개 이상의 필드를 입력해야 합니다")
        return self
