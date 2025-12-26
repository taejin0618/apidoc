"""
URL 관리 모듈

Swagger/OpenAPI 문서 URL을 등록하고 관리하는 기능을 제공합니다.

주요 기능:
- URL CRUD 작업 (조회, 생성, 수정, 삭제)
- 활성화/비활성화 토글
- Swagger JSON 수동 다운로드
- 그룹/서비스별 필터링
- 검색 및 정렬
"""

from app.urls.routes import router

__all__ = ["router"]
