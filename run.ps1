# PowerShell 실행 스크립트 - npm 명령어 실행을 위한 환경 변수 새로고침
# 사용법: .\run.ps1 [명령어]
# 예시: .\run.ps1 dev
#      .\run.ps1 start

param(
    [Parameter(Position=0)]
    [string]$Command = "dev"
)

# 환경 변수 PATH 새로고침
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Node.js와 npm이 설치되어 있는지 확인
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Node.js가 설치되어 있지 않거나 PATH에 등록되지 않았습니다." -ForegroundColor Red
        Write-Host "Node.js를 설치하고 PowerShell을 재시작해주세요." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Node.js/npm을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# 명령어 실행
switch ($Command.ToLower()) {
    "dev" {
        Write-Host "🚀 개발 서버 시작 중..." -ForegroundColor Cyan
        npm run dev
    }
    "start" {
        Write-Host "🚀 프로덕션 서버 시작 중..." -ForegroundColor Cyan
        npm start
    }
    "install" {
        Write-Host "📦 의존성 설치 중..." -ForegroundColor Cyan
        npm install
    }
    default {
        Write-Host "📝 사용 가능한 명령어:" -ForegroundColor Yellow
        Write-Host "  .\run.ps1 dev      - 개발 서버 실행 (nodemon)" -ForegroundColor White
        Write-Host "  .\run.ps1 start    - 프로덕션 서버 실행" -ForegroundColor White
        Write-Host "  .\run.ps1 install  - 의존성 설치" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 직접 npm 명령어 실행: npm $Command" -ForegroundColor Cyan
        npm $Command
    }
}

