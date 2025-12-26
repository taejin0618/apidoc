# PowerShell 실행 스크립트 - FastAPI 서버 실행
# 사용법: .\run.ps1 [명령어]
# 예시: .\run.ps1 dev
#      .\run.ps1 start

param(
    [Parameter(Position=0)]
    [string]$Command = "dev"
)

# 환경 변수 PATH 새로고침
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Python 및 pip 확인
try {
    $pythonVersion = python --version 2>&1
    $pipVersion = pip --version 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Python이 설치되어 있지 않거나 PATH에 등록되지 않았습니다." -ForegroundColor Red
        Write-Host "Python을 설치하고 PowerShell을 재시작해주세요." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✅ $pythonVersion" -ForegroundColor Green
    Write-Host "✅ $pipVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Python/pip을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# 명령어 실행
switch ($Command.ToLower()) {
    "dev" {
        Write-Host "🚀 개발 서버 시작 중..." -ForegroundColor Cyan
        uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
    }
    "start" {
        Write-Host "🚀 프로덕션 서버 시작 중..." -ForegroundColor Cyan
        uvicorn app.main:app --host 0.0.0.0 --port 3000
    }
    "install" {
        Write-Host "📦 의존성 설치 중..." -ForegroundColor Cyan
        pip install -r requirements.txt
    }
    default {
        Write-Host "📝 사용 가능한 명령어:" -ForegroundColor Yellow
        Write-Host "  .\run.ps1 dev      - 개발 서버 실행 (자동 재시작)" -ForegroundColor White
        Write-Host "  .\run.ps1 start    - 프로덕션 서버 실행" -ForegroundColor White
        Write-Host "  .\run.ps1 install  - 의존성 설치" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 직접 실행: uvicorn app.main:app" -ForegroundColor Cyan
    }
}
