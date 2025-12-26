"""Rate Limiting 미들웨어"""

import asyncio
import time
from typing import Dict

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.errors import create_error_response
from app.utils import get_client_ip


class RateLimitMiddleware(BaseHTTPMiddleware):
    """API 요청 제한 미들웨어"""

    def __init__(
        self,
        app,
        window_seconds: int = 900,
        max_requests: int = 100,
    ):
        super().__init__(app)
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.storage: Dict[str, Dict[str, float | int]] = {}
        self.lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next) -> Response:
        """요청 처리 및 Rate Limiting 적용"""
        # API 경로가 아니면 제한하지 않음
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        key = get_client_ip(request)
        now = time.time()

        async with self.lock:
            entry = self.storage.get(key)
            if not entry or now - entry["start"] >= self.window_seconds:
                entry = {"count": 0, "start": now}
                self.storage[key] = entry

            if entry["count"] >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content=create_error_response(
                        "RATE_LIMIT_EXCEEDED",
                        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
                    ),
                )

            entry["count"] += 1
            remaining = max(self.max_requests - entry["count"], 0)
            reset = int(entry["start"] + self.window_seconds)

        response = await call_next(request)
        response.headers["RateLimit-Limit"] = str(self.max_requests)
        response.headers["RateLimit-Remaining"] = str(remaining)
        response.headers["RateLimit-Reset"] = str(reset)
        return response
