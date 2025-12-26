import time
from datetime import datetime

from fastapi import APIRouter

from app.schemas.responses import ErrorResponse

router = APIRouter(tags=["Health"])
_START_TIME = time.time()


@router.get(
    "/health",
    summary="서버 상태 확인",
    description="""
    서버의 상태를 확인합니다.

    **응답 정보:**
    - `status`: 서버 상태 (항상 "healthy")
    - `timestamp`: 현재 시간 (ISO 8601 형식)
    - `uptime`: 서버가 실행된 시간 (초)

    이 엔드포인트는 헬스체크 및 모니터링에 사용됩니다.
    """,
    responses={
        200: {
            "description": "서버가 정상 작동 중",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "data": {
                            "status": "healthy",
                            "timestamp": "2024-01-01T00:00:00.000Z",
                            "uptime": 12345.67,
                        },
                    }
                }
            },
        }
    },
)
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": time.time() - _START_TIME,
        },
    }
