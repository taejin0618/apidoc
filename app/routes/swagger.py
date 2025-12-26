import copy
import json
from pathlib import Path

from fastapi import APIRouter

from app.config import settings

router = APIRouter(
    tags=["Swagger"],
    responses={
        200: {"description": "OpenAPI 스펙 반환"},
    },
)

_spec_path = Path(__file__).resolve().parent.parent / "swagger_spec.json"
with _spec_path.open("r", encoding="utf-8") as handle:
    _SWAGGER_SPEC = json.load(handle)


@router.get(
    "/swagger.json",
    summary="OpenAPI 스펙 조회",
    description="""
    이 API의 OpenAPI 3.0 스펙을 JSON 형식으로 반환합니다.

    **용도:**
    - Swagger UI에서 API 문서 확인
    - OpenAPI 호환 도구에서 API 스펙 가져오기
    - API 클라이언트 코드 생성

    **응답:**
    - OpenAPI 3.0 형식의 JSON 스펙
    - 서버 URL이 자동으로 현재 환경에 맞게 설정됨
    """,
)
async def swagger_json():
    """OpenAPI 스펙을 반환합니다."""
    spec = copy.deepcopy(_SWAGGER_SPEC)
    base_url = settings.resolved_base_url
    if spec.get("servers"):
        spec["servers"][0]["url"] = f"{base_url}/api"
    return spec
