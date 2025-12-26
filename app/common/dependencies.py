"""FastAPI 의존성 주입"""

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.database import get_database


def get_db() -> AsyncIOMotorDatabase:
    """데이터베이스 의존성 주입"""
    return get_database()
