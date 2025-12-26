import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import DuplicateKeyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from app.common.config import settings
from app.common.database import close_db, connect_db
from app.common.errors import AppError, create_error_response
from app.common.middlewares import RateLimitMiddleware, SecurityHeadersMiddleware
from app.routes import health
from app.pages import router as pages_router
from app.swagger import router as swagger_router
from app.urls import router as urls_router
from app.versions import urls_router as versions_urls_router, versions_router

# 로깅 설정
logging.basicConfig(
    level=logging.INFO if settings.is_production else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("apidoc")

# pymongo 로거 레벨 설정 (DEBUG 로그 억제)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("motor").setLevel(logging.WARNING)

BASE_DIR = Path(__file__).resolve().parent.parent


app = FastAPI(
    title="API Doc Manager",
    description="""
    Swagger/OpenAPI 문서를 중앙에서 관리하고 버전별 변경사항을 자동으로 추적하는 시스템입니다.

    ## 주요 기능

    - **Swagger 문서 URL 관리**: 여러 API 서비스의 Swagger URL을 등록하고 관리
    - **자동 버전 관리**: Swagger JSON을 자동으로 다운로드하고 버전별로 저장
    - **변경사항 자동 감지**: 이전 버전과 비교하여 추가/삭제/수정된 항목 자동 분석
    - **심각도 분류**: 변경사항을 `low` / `medium` / `high` 수준으로 자동 분류
    - **버전 비교**: 두 버전을 나란히 비교하고 변경된 부분 강조 표시
    - **검색 및 필터링**: API 이름, 그룹별 필터링 지원

    ## 변경사항 심각도

    - **high**: 새 endpoint 추가, 필수 파라미터 변경
    - **medium**: 선택 파라미터 변경, RequestBody 수정
    - **low**: 설명 변경, 메타정보 수정
    """,
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "ISC License",
    },
    docs_url="/api-docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json",
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecurityHeadersMiddleware)

cors_origins = settings.cors_origins
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.mount("/css", StaticFiles(directory=BASE_DIR / "public" / "css"), name="css")
app.mount("/js", StaticFiles(directory=BASE_DIR / "public" / "js"), name="js")
app.mount("/icons", StaticFiles(directory=BASE_DIR / "public" / "icons"), name="icons")

app.include_router(health.router, prefix="/api")
app.include_router(swagger_router, prefix="/api", tags=["Swagger"])
app.include_router(urls_router, prefix="/api/urls", tags=["URLs"])
app.include_router(versions_urls_router, prefix="/api/urls", tags=["Versions"])
app.include_router(versions_router, prefix="/api/versions", tags=["Versions"])
app.include_router(pages_router, tags=["Pages"], include_in_schema=False)


@app.on_event("startup")
async def startup_event():
    await connect_db()


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(exc.code, exc.message),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    details = [error.get("msg") for error in exc.errors()]
    return JSONResponse(
        status_code=400,
        content=create_error_response("VALIDATION_ERROR", "입력값 검증 실패", details),
    )


@app.exception_handler(DuplicateKeyError)
async def duplicate_key_handler(request, exc: DuplicateKeyError):
    return JSONResponse(
        status_code=400,
        content=create_error_response("DUPLICATE_ERROR", "이미 존재하는 값입니다"),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content=create_error_response(
                "NOT_FOUND", f"경로를 찾을 수 없습니다: {request.url.path}"
            ),
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response("HTTP_ERROR", str(exc.detail)),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception("Unhandled error")
    message = "서버 내부 오류가 발생했습니다" if settings.is_production else str(exc)
    return JSONResponse(
        status_code=500,
        content=create_error_response("SERVER_ERROR", message),
    )
