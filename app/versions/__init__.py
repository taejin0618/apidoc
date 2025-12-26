"""
버전 관리 모듈

Swagger JSON 버전을 관리하고 변경사항을 자동 추적합니다.

주요 기능:
- 버전 목록 조회
- 버전 간 비교 (Diff)
- 변경사항 자동 감지
- 심각도 분류 (low/medium/high)
"""

from app.versions.routes import urls_router, versions_router

__all__ = ["urls_router", "versions_router"]
