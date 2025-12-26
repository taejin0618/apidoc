import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from bson import ObjectId
from bson.errors import InvalidId
from fastapi.encoders import jsonable_encoder
from starlette.requests import Request

from app.config import settings
from app.errors import AppError


def normalize_url(value: str) -> str:
    trimmed = value.strip()
    if trimmed.endswith("/"):
        trimmed = trimmed[:-1]
    return trimmed


def normalize_lower(value: str) -> str:
    return value.strip().lower()


def validate_http_url(value: str) -> str:
    if not value or not value.strip():
        raise ValueError("URL은 필수입니다")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("유효한 HTTP(S) URL이어야 합니다")
    return value


def _encode_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    return value.isoformat()


def serialize_mongo(doc: Any) -> Any:
    return jsonable_encoder(
        doc,
        custom_encoder={ObjectId: str, datetime: _encode_datetime},
    )


def parse_object_id(value: str, message: str = "잘못된 ID 형식입니다") -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise AppError(message, status_code=400, code="INVALID_ID")


def get_client_ip(request: Request) -> str:
    trust_proxy = settings.trust_proxy
    xff = request.headers.get("x-forwarded-for")
    if trust_proxy and xff:
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


_slug_pattern = re.compile(r"\s+")


def normalize_tags(tags: list[str] | None) -> list[str]:
    if not tags:
        return []
    cleaned = []
    for tag in tags:
        trimmed = _slug_pattern.sub(" ", str(tag).strip())
        if trimmed:
            cleaned.append(trimmed)
    return cleaned
