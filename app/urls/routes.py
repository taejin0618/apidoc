from datetime import datetime
from typing import Union

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.common.dependencies import get_db
from app.common.errors import AppError
from app.urls.schemas import UrlCreate, UrlUpdate
from app.common.responses import ErrorResponse
from app.swagger.service import parse_and_save_swagger
from app.common.utils import normalize_lower, normalize_tags, normalize_url, parse_object_id, serialize_mongo

router = APIRouter(
    tags=["URLs"],
    responses={
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        404: {"model": ErrorResponse, "description": "리소스를 찾을 수 없음"},
        500: {"model": ErrorResponse, "description": "서버 내부 오류"},
    },
)


def _parse_int(value: Union[int, str], default: int) -> int:
    """정수 파싱 헬퍼 함수"""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@router.get(
    "",
    summary="API URL 목록 조회",
    description="""
    등록된 모든 API URL 목록을 조회합니다.

    **필터링 옵션:**
    - `group`: 팀/그룹별 필터링
    - `service`: 서비스별 필터링
    - `isActive`: 활성화 상태 필터링 (true/false)
    - `search`: 이름 또는 설명으로 검색

    **정렬:**
    - `sort` 파라미터로 정렬 필드 지정 (예: `-updatedAt` 내림차순, `name` 오름차순)
    - 여러 필드 정렬: `-updatedAt name`

    **페이지네이션:**
    - `page`: 페이지 번호 (기본값: 1)
    - `limit`: 페이지당 항목 수 (기본값: 50)
    """,
    responses={
        200: {
            "description": "성공적으로 조회됨",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "data": [
                            {
                                "_id": "507f1f77bcf86cd799439011",
                                "name": "User Service API",
                                "url": "https://api.example.com/swagger.json",
                                "group": "backend",
                                "service": "user-service",
                                "isActive": True,
                                "versionCount": 5,
                            }
                        ],
                        "meta": {
                            "total": 100,
                            "page": 1,
                            "limit": 50,
                            "totalPages": 2,
                            "groups": ["backend", "frontend"],
                            "services": ["user-service", "payment-service"],
                            "servicesByGroup": {"backend": ["user-service"]},
                        },
                    }
                }
            },
        }
    },
)
async def list_urls(
    group: str | None = Query(None, description="팀/그룹별 필터링"),
    service: str | None = Query(None, description="서비스별 필터링"),
    isActive: str | None = Query(None, description="활성화 상태 필터링 (true/false)"),
    search: str | None = Query(None, description="이름 또는 설명으로 검색"),
    sort: str | None = Query("-updatedAt", description="정렬 필드 (예: -updatedAt, name)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(50, ge=1, le=100, description="페이지당 항목 수"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    filter_query: dict = {}

    if group:
        filter_query["group"] = normalize_lower(group)
    if service:
        filter_query["service"] = normalize_lower(service)
    if isActive is not None:
        filter_query["isActive"] = str(isActive).lower() == "true"
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit

    sort_spec = []
    if sort:
        for field in str(sort).split():
            if field.startswith("-"):
                sort_spec.append((field[1:], -1))
            else:
                sort_spec.append((field, 1))
    if not sort_spec:
        sort_spec = [("updatedAt", -1)]

    cursor = db.apiurls.find(filter_query).sort(sort_spec).skip(skip).limit(limit)
    urls = await cursor.to_list(length=limit)
    total = await db.apiurls.count_documents(filter_query)

    groups = await db.apiurls.distinct("group")
    services = await db.apiurls.distinct("service")

    services_by_group = {}
    for team in groups:
        team_services = await db.apiurls.distinct("service", {"group": team})
        services_by_group[team] = team_services

    return {
        "success": True,
        "data": serialize_mongo(urls),
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if limit else 1,
            "groups": groups,
            "services": services,
            "servicesByGroup": services_by_group,
        },
    }


@router.get(
    "/{url_id}",
    summary="특정 API URL 상세 조회",
    description="URL ID를 사용하여 특정 API URL의 상세 정보를 조회합니다.",
    responses={
        200: {"description": "성공적으로 조회됨"},
        404: {"description": "URL을 찾을 수 없음"},
    },
)
async def get_url(
    url_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    url = await db.apiurls.find_one({"_id": object_id})
    if not url:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    return {"success": True, "data": serialize_mongo(url)}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="새 API URL 등록",
    description="""
    새로운 Swagger/OpenAPI 문서 URL을 등록합니다.

    **주요 기능:**
    - Swagger JSON URL을 등록하여 자동 버전 관리 시작
    - 그룹/서비스별로 분류하여 관리
    - 담당자 이메일 설정 시 변경사항 발생 시 Slack 알림

    **주의사항:**
    - URL은 고유해야 합니다 (중복 등록 불가)
    - 등록 후 자동으로 Swagger JSON을 다운로드하여 첫 버전 생성
    """,
    responses={
        201: {"description": "성공적으로 생성됨"},
        400: {"description": "잘못된 요청 또는 중복된 URL"},
    },
)
async def create_url(
    payload: UrlCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    now = datetime.utcnow()

    data = payload.model_dump()
    data.update(
        {
            "name": data["name"].strip(),
            "url": normalize_url(data["url"]),
            "group": normalize_lower(data["group"]),
            "service": normalize_lower(data["service"]),
            "description": (data.get("description") or "").strip(),
            "owner": data.get("owner"),
            "tags": normalize_tags(data.get("tags")),
            "priority": data.get("priority") or "medium",
            "isActive": True,
            "lastFetchedAt": None,
            "lastFetchStatus": "pending",
            "errorMessage": None,
            "versionCount": 0,
            "createdAt": now,
            "updatedAt": now,
        }
    )

    try:
        result = await db.apiurls.insert_one(data)
    except DuplicateKeyError:
        raise AppError("이미 존재하는 url입니다", status_code=400, code="DUPLICATE_ERROR")

    data["_id"] = result.inserted_id
    return {
        "success": True,
        "data": serialize_mongo(data),
        "message": "URL이 성공적으로 추가되었습니다",
    }


@router.put(
    "/{url_id}",
    summary="API URL 정보 수정",
    description="""
    기존 API URL의 정보를 수정합니다.

    **수정 가능한 필드:**
    - name, url, group, service, description
    - owner, tags, priority, isActive

    **주의사항:**
    - 최소 한 개 이상의 필드를 제공해야 합니다
    - URL 변경 시 중복 체크가 수행됩니다
    """,
    responses={
        200: {"description": "성공적으로 수정됨"},
        400: {"description": "잘못된 요청 또는 중복된 URL"},
        404: {"description": "URL을 찾을 수 없음"},
    },
)
async def update_url(
    url_id: str,
    payload: UrlUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)
    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()
    if "url" in updates and updates["url"] is not None:
        updates["url"] = normalize_url(updates["url"])
    if "group" in updates and updates["group"] is not None:
        updates["group"] = normalize_lower(updates["group"])
    if "service" in updates and updates["service"] is not None:
        updates["service"] = normalize_lower(updates["service"])
    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()
    if "tags" in updates:
        updates["tags"] = normalize_tags(updates.get("tags"))

    updates["updatedAt"] = datetime.utcnow()

    try:
        updated = await db.apiurls.find_one_and_update(
            {"_id": object_id},
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        raise AppError("이미 존재하는 url입니다", status_code=400, code="DUPLICATE_ERROR")

    if not updated:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    return {
        "success": True,
        "data": serialize_mongo(updated),
        "message": "URL이 성공적으로 수정되었습니다",
    }


@router.delete(
    "/{url_id}",
    summary="API URL 삭제",
    description="등록된 API URL을 삭제합니다. 관련된 모든 버전 정보도 함께 삭제됩니다.",
    # response_model은 실제 반환값이 dict이므로 제거
    responses={
        200: {"description": "성공적으로 삭제됨"},
        404: {"description": "URL을 찾을 수 없음"},
    },
)
async def delete_url(
    url_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    deleted = await db.apiurls.find_one_and_delete({"_id": object_id})
    if not deleted:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    return {"success": True, "message": "URL이 성공적으로 삭제되었습니다"}


@router.patch(
    "/{url_id}/activate",
    summary="API URL 활성화/비활성화 토글",
    description="""
    API URL의 활성화 상태를 토글합니다.

    - 활성화된 API는 자동 버전 체크 대상이 됩니다
    - 비활성화된 API는 버전 체크에서 제외됩니다
    """,
    responses={
        200: {"description": "상태가 성공적으로 변경됨"},
        404: {"description": "URL을 찾을 수 없음"},
    },
)
async def toggle_url_active(
    url_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    url = await db.apiurls.find_one({"_id": object_id})
    if not url:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    new_status = not url.get("isActive", True)
    await db.apiurls.update_one(
        {"_id": object_id},
        {"$set": {"isActive": new_status, "updatedAt": datetime.utcnow()}},
    )

    return {
        "success": True,
        "data": {"isActive": new_status},
        "message": "URL이 활성화되었습니다" if new_status else "URL이 비활성화되었습니다",
    }


@router.post(
    "/{url_id}/fetch",
    summary="Swagger JSON 수동 업데이트",
    description="""
    지정된 API URL에서 Swagger JSON을 수동으로 가져와 버전을 업데이트합니다.

    **동작 방식:**
    1. 등록된 URL에서 Swagger JSON 다운로드
    2. 이전 버전과 비교하여 변경사항 분석
    3. 변경사항이 있으면 새 버전 생성
    4. 변경사항이 없으면 기존 버전 유지

    **알림:**
    - 변경사항 발생 시 설정된 담당자에게 Slack 알림 전송 (설정된 경우)
    """,
    responses={
        200: {"description": "업데이트 완료 (변경사항 있음 또는 없음)"},
        404: {"description": "URL을 찾을 수 없음"},
        408: {"description": "요청 타임아웃"},
        503: {"description": "연결 실패"},
    },
)
async def fetch_swagger(
    url_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)
    result = await parse_and_save_swagger(db, object_id)

    return {
        "success": True,
        "data": serialize_mongo(result),
        "message": "새 버전이 생성되었습니다" if result.get("created") else "변경사항이 없습니다",
    }
