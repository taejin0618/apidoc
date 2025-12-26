from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VIEWS_DIR = BASE_DIR / "views"

router = APIRouter()


@router.get("/")
async def index_page():
    return FileResponse(VIEWS_DIR / "index.html")


@router.get("/api-detail")
async def api_detail_page():
    return FileResponse(VIEWS_DIR / "api-detail.html")


@router.get("/version-compare")
async def version_compare_page():
    return FileResponse(VIEWS_DIR / "version-compare.html")


@router.get("/api-docs")
async def swagger_ui_page():
    return FileResponse(VIEWS_DIR / "swagger-ui.html")
