import asyncio
import logging
import re
from datetime import datetime
from typing import Any

import httpx

from app.common.errors import AppError
from app.versions.service import analyze_changes
from app.services.slack_service import send_change_notification

logger = logging.getLogger(__name__)


async def fetch_swagger_json(url: str, timeout_ms: int = 15000) -> dict[str, Any]:
    timeout = timeout_ms / 1000
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ApiDocManager/1.0)",
    }

    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        try:
            response = await client.get(url)
        except httpx.ConnectTimeout:
            raise AppError(f"타임아웃: {timeout_ms}ms 초과", status_code=408, code="TIMEOUT")
        except httpx.ConnectError:
            raise AppError("연결 거부됨: 서버에 접근할 수 없습니다", status_code=503, code="CONNECTION_FAILED")
        except httpx.RequestError as error:
            raise AppError(str(error), status_code=502, code="REQUEST_FAILED")

    if response.status_code == 404:
        raise AppError("URL을 찾을 수 없습니다 (404)", status_code=404, code="NOT_FOUND")
    if response.status_code == 401:
        message = "인증이 필요합니다 (401). 서버에서 인증이 필요하거나 Vercel Password Protection이 활성화되어 있을 수 있습니다."
        raise AppError(message, status_code=401, code="UNAUTHORIZED")
    if response.status_code != 200:
        raise AppError(f"HTTP 에러: {response.status_code}", status_code=response.status_code, code="HTTP_ERROR")

    json_data = response.json()
    if not (isinstance(json_data, dict) and (json_data.get("openapi") or json_data.get("swagger"))):
        raise AppError("유효한 OpenAPI/Swagger 문서가 아닙니다", status_code=400, code="INVALID_SWAGGER")

    return json_data


def extract_major_version(url: str, swagger_json: dict[str, Any] | None = None) -> str:
    version_pattern = re.compile(r"/v(\d+)(/|$)", re.IGNORECASE)

    if swagger_json and swagger_json.get("paths"):
        first_path = next(iter(swagger_json["paths"].keys()), None)
        if first_path:
            match = version_pattern.search(first_path)
            if match:
                return f"v{match.group(1)}"

    return "v1"


def count_endpoints(swagger_json: dict[str, Any]) -> int:
    paths = swagger_json.get("paths") or {}
    count = 0
    for path_item in paths.values():
        for method in ["get", "post", "put", "delete", "patch", "options", "head"]:
            if method in path_item:
                count += 1
    return count


def generate_summary(changes: list[dict[str, Any]]) -> str:
    if not changes:
        return "초기 버전"

    added = len([c for c in changes if c.get("type") == "added"])
    removed = len([c for c in changes if c.get("type") == "removed"])
    modified = len([c for c in changes if c.get("type") == "modified"])

    parts = []
    if added > 0:
        parts.append(f"{added}개 추가")
    if removed > 0:
        parts.append(f"{removed}개 삭제")
    if modified > 0:
        parts.append(f"{modified}개 수정")

    return ", ".join(parts)


async def parse_and_save_swagger(db, url_id):
    api_url = await db.apiurls.find_one({"_id": url_id})
    if not api_url:
        raise AppError("URL을 찾을 수 없습니다", status_code=404, code="NOT_FOUND")

    if not api_url.get("isActive", True):
        raise AppError("비활성화된 URL입니다", status_code=400, code="INACTIVE_URL")

    try:
        swagger_json = await fetch_swagger_json(api_url["url"])
        major_version = extract_major_version(api_url["url"], swagger_json)

        existing_version = await db.apiversions.find_one(
            {"urlId": api_url["_id"], "majorVersion": major_version}
        )

        now = datetime.utcnow()

        if existing_version:
            diff_result = analyze_changes(existing_version["swaggerJson"], swagger_json)
            if not diff_result["hasChanges"]:
                await db.apiurls.update_one(
                    {"_id": url_id},
                    {
                        "$set": {
                            "lastFetchedAt": now,
                            "lastFetchStatus": "success",
                            "errorMessage": None,
                            "updatedAt": now,
                        }
                    },
                )

                return {
                    "created": False,
                    "updated": False,
                    "message": "변경사항이 없습니다",
                    "version": {
                        "versionId": existing_version["versionId"],
                        "majorVersion": existing_version.get("majorVersion"),
                        "revisionCount": existing_version.get("revisionCount"),
                        "lastUpdatedAt": existing_version.get("lastUpdatedAt"),
                    },
                }

            timestamped_changes = [
                {**change, "recordedAt": now} for change in diff_result["changes"]
            ]
            summary = generate_summary(timestamped_changes)

            await db.apiversions.update_one(
                {"_id": existing_version["_id"]},
                {
                    "$set": {
                        "swaggerJson": swagger_json,
                        "lastUpdatedAt": now,
                        "endpointCount": count_endpoints(swagger_json),
                        "summary": summary,
                    },
                    "$push": {
                        "changes": {"$each": timestamped_changes},
                        "changeHistory": {
                            "updatedAt": now,
                            "changesCount": len(timestamped_changes),
                            "summary": summary,
                        },
                    },
                    "$inc": {"revisionCount": 1},
                },
            )

            updated_version = await db.apiversions.find_one({"_id": existing_version["_id"]})

            await db.apiurls.update_one(
                {"_id": url_id},
                {
                    "$set": {
                        "lastFetchedAt": now,
                        "lastFetchStatus": "success",
                        "errorMessage": None,
                        "updatedAt": now,
                    }
                },
            )

            asyncio.create_task(
                send_change_notification(
                    owner_email=api_url.get("owner"),
                    api_name=api_url.get("name"),
                    api_url=api_url.get("url"),
                    api_id=str(url_id),
                    version_id=updated_version["versionId"],
                    changes_count=len(timestamped_changes),
                    summary=updated_version.get("summary", ""),
                    is_new_version=False,
                )
            )

            return {
                "created": False,
                "updated": True,
                "version": {
                    "_id": updated_version["_id"],
                    "versionId": updated_version["versionId"],
                    "majorVersion": updated_version.get("majorVersion"),
                    "versionNumber": updated_version.get("versionNumber"),
                    "revisionCount": updated_version.get("revisionCount"),
                    "lastUpdatedAt": updated_version.get("lastUpdatedAt"),
                    "changesCount": len(timestamped_changes),
                    "summary": updated_version.get("summary"),
                },
            }

        latest_version = await db.apiversions.find_one({"urlId": api_url["_id"]}, sort=[("versionNumber", -1)])
        version_number = (latest_version["versionNumber"] + 1) if latest_version else 1

        changes: list[dict[str, Any]] = []
        if latest_version:
            diff_result = analyze_changes(latest_version["swaggerJson"], swagger_json)
            changes = [
                {**change, "recordedAt": now} for change in diff_result["changes"]
            ]

        summary = generate_summary(changes) if changes else "초기 버전"

        new_version = {
            "urlId": api_url["_id"],
            "versionId": major_version,
            "versionNumber": version_number,
            "majorVersion": major_version,
            "timestamp": now,
            "createdAt": now,
            "lastUpdatedAt": now,
            "revisionCount": 1,
            "swaggerJson": swagger_json,
            "changes": changes,
            "previousVersionId": latest_version.get("_id") if latest_version else None,
            "endpointCount": count_endpoints(swagger_json),
            "parameterCount": 0,
            "summary": summary,
            "changeHistory": [
                {
                    "updatedAt": now,
                    "changesCount": len(changes),
                    "summary": summary,
                }
            ]
            if changes
            else [],
        }

        result = await db.apiversions.insert_one(new_version)
        new_version["_id"] = result.inserted_id

        await db.apiurls.update_one(
            {"_id": url_id},
            {
                "$set": {
                    "lastFetchedAt": now,
                    "lastFetchStatus": "success",
                    "errorMessage": None,
                    "updatedAt": now,
                },
                "$inc": {"versionCount": 1},
            },
        )

        if changes:
            asyncio.create_task(
                send_change_notification(
                    owner_email=api_url.get("owner"),
                    api_name=api_url.get("name"),
                    api_url=api_url.get("url"),
                    api_id=str(url_id),
                    version_id=new_version["versionId"],
                    changes_count=len(changes),
                    summary=new_version.get("summary", ""),
                    is_new_version=True,
                )
            )

        return {
            "created": True,
            "updated": False,
            "version": {
                "_id": new_version["_id"],
                "versionId": new_version["versionId"],
                "majorVersion": new_version.get("majorVersion"),
                "versionNumber": new_version.get("versionNumber"),
                "revisionCount": new_version.get("revisionCount"),
                "timestamp": new_version.get("timestamp"),
                "changesCount": len(changes),
                "summary": new_version.get("summary"),
            },
        }
    except AppError as error:
        await db.apiurls.update_one(
            {"_id": url_id},
            {
                "$set": {
                    "lastFetchedAt": datetime.utcnow(),
                    "lastFetchStatus": "error",
                    "errorMessage": error.message,
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
        raise
    except Exception as error:
        logger.error("Swagger parse error: %s", error)
        await db.apiurls.update_one(
            {"_id": url_id},
            {
                "$set": {
                    "lastFetchedAt": datetime.utcnow(),
                    "lastFetchStatus": "error",
                    "errorMessage": str(error),
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
        raise AppError(str(error), status_code=500, code="SERVER_ERROR")


__all__ = [
    "fetch_swagger_json",
    "extract_major_version",
    "parse_and_save_swagger",
    "count_endpoints",
    "generate_summary",
]
