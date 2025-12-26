import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.uri_parser import parse_uri

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def connect_db() -> None:
    global _client, _db
    if _client is not None:
        return

    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        maxPoolSize=50,
        minPoolSize=10,
        serverSelectionTimeoutMS=5000,
    )

    parsed = parse_uri(settings.mongodb_uri)
    db_name = parsed.get("database") or "api-doc-manager"
    _db = _client[db_name]

    await _client.admin.command("ping")
    await ensure_indexes(_db)
    logger.info("MongoDB connected: %s", db_name)


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.apiurls.create_indexes(
        [
            IndexModel([("url", ASCENDING)], unique=True),
            IndexModel([("group", ASCENDING)]),
            IndexModel([("service", ASCENDING)]),
            IndexModel([("isActive", ASCENDING)]),
            IndexModel([("lastFetchStatus", ASCENDING)]),
            IndexModel([("name", "text"), ("description", "text")]),
        ]
    )

    await db.apiversions.create_indexes(
        [
            IndexModel([("urlId", ASCENDING), ("versionNumber", DESCENDING)]),
            IndexModel([("urlId", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("urlId", ASCENDING), ("majorVersion", ASCENDING)]),
            IndexModel([("timestamp", DESCENDING)]),
        ]
    )

    await db.auditlogs.create_indexes(
        [
            IndexModel([("timestamp", DESCENDING)]),
            IndexModel([("urlId", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("action", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("timestamp", ASCENDING)], expireAfterSeconds=90 * 24 * 60 * 60),
        ]
    )
