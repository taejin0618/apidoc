"""
Swagger 서비스 모듈

Swagger JSON을 다운로드하고 파싱하여 API 버전을 관리합니다.
"""

from app.swagger.routes import router

__all__ = ["router"]
