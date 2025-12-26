"""URL 관련 Pydantic 스키마"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UrlCreate(BaseModel):
    """URL 생성 요청 스키마"""
    name: str = Field(..., max_length=100, description="API 이름")
    url: str = Field(..., description="Swagger JSON URL")
    group: str = Field(..., description="팀/그룹")
    service: str = Field(..., description="서비스명")
    description: Optional[str] = Field(None, description="설명")
    owner: Optional[EmailStr] = Field(None, description="담당자 이메일")
    tags: Optional[list[str]] = Field(None, description="태그")
    priority: Optional[str] = Field("medium", description="우선순위")

class UrlUpdate(BaseModel):
    """URL 수정 요청 스키마"""
    name: Optional[str] = Field(None, max_length=100)
    url: Optional[str] = Field(None)
    group: Optional[str] = Field(None)
    service: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    owner: Optional[EmailStr] = Field(None)
    tags: Optional[list[str]] = Field(None)
    priority: Optional[str] = Field(None)
