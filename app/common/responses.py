"""API 응답 스키마"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """성공 응답 기본 스키마"""

    success: bool = Field(True, description="요청 성공 여부")
    data: T = Field(..., description="응답 데이터")
    message: str | None = Field(None, description="응답 메시지")


class ErrorResponse(BaseModel):
    """에러 응답 스키마"""

    success: bool = Field(False, description="요청 실패 여부")
    error: dict[str, Any] = Field(
        ...,
        description="에러 정보",
        examples=[
            {
                "code": "NOT_FOUND",
                "message": "URL을 찾을 수 없습니다",
                "details": None,
            }
        ],
    )


class HealthResponse(BaseModel):
    """헬스체크 응답 스키마"""

    success: bool = Field(True, description="요청 성공 여부")
    data: dict[str, Any] = Field(
        ...,
        description="서버 상태 정보",
        examples=[
            {
                "status": "healthy",
                "timestamp": "2024-01-01T00:00:00.000Z",
                "uptime": 12345.67,
            }
        ],
    )


class PaginationMeta(BaseModel):
    """페이지네이션 메타 정보"""

    total: int = Field(..., description="전체 항목 수", examples=[100])
    page: int = Field(..., description="현재 페이지 번호", examples=[1])
    limit: int = Field(..., description="페이지당 항목 수", examples=[50])
    totalPages: int = Field(..., description="전체 페이지 수", examples=[2])


class ListResponse(BaseModel, Generic[T]):
    """목록 응답 스키마"""

    success: bool = Field(True, description="요청 성공 여부")
    data: list[T] = Field(..., description="응답 데이터 목록")
    meta: PaginationMeta | dict[str, Any] = Field(..., description="페이지네이션 메타 정보")
