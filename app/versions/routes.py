from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.dependencies import get_db
from app.common.errors import AppError
from app.common.responses import ErrorResponse
from app.versions.service import analyze_changes, get_raw_diff
from app.common.utils import parse_object_id, serialize_mongo

urls_router = APIRouter(
    tags=["Versions"],
    responses={
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        404: {"model": ErrorResponse, "description": "리소스를 찾을 수 없음"},
    },
)
versions_router = APIRouter(
    tags=["Versions"],
    responses={
        400: {"model": ErrorResponse, "description": "잘못된 요청"},
        404: {"model": ErrorResponse, "description": "리소스를 찾을 수 없음"},
    },
)


@urls_router.get(
    "/{url_id}/versions",
    summary="API 버전 목록 조회",
    description="""
    특정 API URL의 모든 버전 목록을 조회합니다.

    **페이지네이션:**
    - `page`: 페이지 번호 (기본값: 1)
    - `limit`: 페이지당 항목 수 (기본값: 20)

    **응답:**
    - 각 버전의 메타데이터 (버전 ID, 번호, 타임스탬프 등)
    - Swagger JSON은 기본적으로 제외되며, 필요시 개별 버전 조회 API 사용
    """,
)
async def list_versions(
    url_id: str,
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    api_url = await db.apiurls.find_one({"_id": object_id})
    if not api_url:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    skip = (page - 1) * limit

    projection = {"swaggerJson": 0}
    cursor = (
        db.apiversions.find({"urlId": object_id}, projection)
        .sort("versionNumber", -1)
        .skip(skip)
        .limit(limit)
    )
    versions = await cursor.to_list(length=limit)
    total = await db.apiversions.count_documents({"urlId": object_id})

    return {
        "success": True,
        "data": {
            "apiUrl": serialize_mongo(
                {
                    "_id": api_url["_id"],
                    "name": api_url.get("name"),
                    "url": api_url.get("url"),
                    "group": api_url.get("group"),
                }
            ),
            "versions": serialize_mongo(versions),
        },
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if limit else 1,
        },
    }


@urls_router.get(
    "/{url_id}/versions/latest",
    summary="최신 버전 조회",
    description="특정 API URL의 최신 버전 정보를 조회합니다. Swagger JSON이 포함됩니다.",
    # response_model은 실제 반환값이 dict이므로 제거
)
async def latest_version(
    url_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    version = await db.apiversions.find_one({"urlId": object_id}, sort=[("versionNumber", -1)])
    if not version:
        raise AppError("버전을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    return {"success": True, "data": serialize_mongo(version)}


@urls_router.get(
    "/{url_id}/versions/{version_id}",
    summary="특정 버전 상세 조회",
    description="""
    특정 버전의 상세 정보를 조회합니다.

    **파라미터:**
    - `includeSwagger`: Swagger JSON 포함 여부 (true/false, 기본값: true)
      - true: Swagger JSON 포함 (용량이 클 수 있음)
      - false: 메타데이터만 반환 (빠른 조회)
    """,
)
async def get_version(
    url_id: str,
    version_id: str,
    includeSwagger: str = "true",
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    projection = {} if includeSwagger == "true" else {"swaggerJson": 0}
    version = await db.apiversions.find_one(
        {"urlId": object_id, "versionId": version_id}, projection
    )

    if not version:
        raise AppError("버전을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    return {"success": True, "data": serialize_mongo(version)}


@urls_router.get(
    "/{url_id}/versions/{version_id}/diff",
    summary="버전 간 변경사항 조회",
    description="""
    특정 버전과 이전 버전 간의 변경사항을 조회합니다.

    **비교 대상:**
    - `compareWith` 파라미터가 제공되면 해당 버전과 비교
    - 제공되지 않으면 이전 버전과 자동 비교

    **응답:**
    - 현재 버전과 이전 버전의 Swagger JSON
    - 분석된 변경사항 목록 (추가/삭제/수정)
    - 각 변경사항의 심각도 (low/medium/high)
    """,
)
async def version_diff(
    url_id: str,
    version_id: str,
    compareWith: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    current_version = await db.apiversions.find_one({"urlId": object_id, "versionId": version_id})
    if not current_version:
        raise AppError("버전을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    previous_version = None
    if compareWith:
        previous_version = await db.apiversions.find_one(
            {"urlId": object_id, "versionId": compareWith}
        )
    elif current_version.get("previousVersionId"):
        previous_version = await db.apiversions.find_one(
            {"_id": current_version.get("previousVersionId")}
        )

    if not previous_version:
        return {
            "success": True,
            "data": {
                "currentVersion": serialize_mongo(
                    {
                        "versionId": current_version.get("versionId"),
                        "versionNumber": current_version.get("versionNumber"),
                        "timestamp": current_version.get("timestamp"),
                        "swaggerJson": current_version.get("swaggerJson"),
                    }
                ),
                "previousVersion": None,
                "changes": serialize_mongo(current_version.get("changes", [])),
                "isFirstVersion": True,
            },
        }

    changes = current_version.get("changes") or []
    if not changes:
        diff_result = analyze_changes(previous_version.get("swaggerJson", {}), current_version.get("swaggerJson", {}))
        changes = diff_result.get("changes", [])

    changes = serialize_mongo(changes)

    return {
        "success": True,
        "data": {
            "currentVersion": serialize_mongo(
                {
                    "versionId": current_version.get("versionId"),
                    "versionNumber": current_version.get("versionNumber"),
                    "timestamp": current_version.get("timestamp"),
                    "swaggerJson": current_version.get("swaggerJson"),
                }
            ),
            "previousVersion": serialize_mongo(
                {
                    "versionId": previous_version.get("versionId"),
                    "versionNumber": previous_version.get("versionNumber"),
                    "timestamp": previous_version.get("timestamp"),
                    "swaggerJson": previous_version.get("swaggerJson"),
                }
            ),
            "changes": changes,
            "isFirstVersion": False,
        },
    }


@urls_router.get(
    "/{url_id}/versions/{v1}/compare/{v2}",
    summary="두 버전 직접 비교",
    description="""
    두 버전을 직접 지정하여 비교합니다.

    **비교 결과:**
    - 두 버전의 Swagger JSON
    - 분석된 변경사항 목록
    - 원시 diff 데이터 (상세 비교용)

    **사용 사례:**
    - 특정 두 버전 간의 차이점 확인
    - 롤백 전 변경사항 검토
    """,
)
async def compare_versions(
    url_id: str,
    v1: str,
    v2: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    object_id = parse_object_id(url_id)

    version1 = await db.apiversions.find_one({"urlId": object_id, "versionId": v1})
    version2 = await db.apiversions.find_one({"urlId": object_id, "versionId": v2})

    if not version1:
        raise AppError(f"버전 {v1}을(를) 찾을 수 없습니다", status_code=404, code="NOT_FOUND")
    if not version2:
        raise AppError(f"버전 {v2}을(를) 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    diff_result = analyze_changes(version1.get("swaggerJson", {}), version2.get("swaggerJson", {}))

    return {
        "success": True,
        "data": {
            "version1": serialize_mongo(
                {
                    "versionId": version1.get("versionId"),
                    "versionNumber": version1.get("versionNumber"),
                    "timestamp": version1.get("timestamp"),
                    "swaggerJson": version1.get("swaggerJson"),
                }
            ),
            "version2": serialize_mongo(
                {
                    "versionId": version2.get("versionId"),
                    "versionNumber": version2.get("versionNumber"),
                    "timestamp": version2.get("timestamp"),
                    "swaggerJson": version2.get("swaggerJson"),
                }
            ),
            "changes": diff_result.get("changes", []),
            "rawDiff": get_raw_diff(version1.get("swaggerJson", {}), version2.get("swaggerJson", {})),
        },
    }


@versions_router.get(
    "/latest",
    summary="전체 API의 최신 버전 조회",
    description="""
    모든 API의 최신 버전 목록을 조회합니다.

    **정렬:**
    - 최근 업데이트된 순서로 정렬

    **용도:**
    - 대시보드에서 최근 업데이트된 API 확인
    - 전체 API의 최신 상태 모니터링
    """,
)
async def latest_versions(
    limit: int = Query(10, ge=1, le=100, description="최대 반환 개수"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    # limit_int는 안전한 제한값으로 설정
    limit_int = min(limit, 100)

    pipeline = [
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$urlId", "latestVersion": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$latestVersion"}},
        {"$sort": {"timestamp": -1}},
        {"$limit": limit_int},
        {
            "$lookup": {
                "from": "apiurls",
                "localField": "urlId",
                "foreignField": "_id",
                "as": "apiUrl",
            }
        },
        {"$unwind": "$apiUrl"},
        {"$project": {"swaggerJson": 0}},
    ]

    versions = await db.apiversions.aggregate(pipeline).to_list(length=limit_int)
    return {"success": True, "data": serialize_mongo(versions)}


@versions_router.get(
    "/recent-changes",
    summary="최근 변경사항 조회",
    description="""
    최근 일정 기간 동안 변경사항이 발생한 버전 목록을 조회합니다.

    **필터링:**
    - `days`: 조회할 기간 (일 단위, 기본값: 7일)
    - `limit`: 최대 반환 개수 (기본값: 20)

    **응답:**
    - 변경사항이 있는 버전만 반환
    - 각 버전의 변경사항 요약 포함

    **용도:**
    - 최근 API 변경 이력 확인
    - 변경사항 모니터링 및 알림
    """,
)
async def recent_changes(
    limit: int = Query(20, ge=1, le=100, description="최대 반환 개수"),
    days: int = Query(7, ge=1, le=365, description="조회할 기간 (일 단위)"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    # limit_int는 안전한 제한값으로 설정
    limit_int = min(limit, 100)

    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": since},
                "changes.0": {"$exists": True},
            }
        },
        {"$sort": {"timestamp": -1}},
        {"$limit": limit_int},
        {
            "$lookup": {
                "from": "apiurls",
                "localField": "urlId",
                "foreignField": "_id",
                "as": "urlId",
            }
        },
        {"$unwind": "$urlId"},
        {
            "$project": {
                "swaggerJson": 0,
                "urlId.name": 1,
                "urlId.group": 1,
                "urlId.url": 1,
            }
        },
    ]

    versions = await db.apiversions.aggregate(pipeline).to_list(length=limit)

    return {
        "success": True,
        "data": serialize_mongo(versions),
        "meta": {
            "since": since.isoformat(),
            "count": len(versions),
        },
    }
