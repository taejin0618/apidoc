"""
공통 모듈

프로젝트 전체에서 사용되는 공통 기능들을 제공합니다:
- config: 환경변수 및 설정 관리
- database: MongoDB 연결 관리
- dependencies: FastAPI 의존성 주입
- errors: 에러 처리 및 커스텀 예외
- responses: API 응답 스키마
- utils: 유틸리티 함수
- middlewares: 미들웨어 (rate limiting, security)
"""

from app.common.config import settings
from app.common.database import connect_db, close_db
from app.common.dependencies import get_db
from app.common.errors import AppError, create_error_response
from app.common.responses import SuccessResponse, ErrorResponse

__all__ = [
    "settings",
    "get_db",
    "connect_db",
    "close_db",
    "AppError",
    "create_error_response",
    "SuccessResponse",
    "ErrorResponse",
]
