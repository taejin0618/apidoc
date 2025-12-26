#!/bin/bash
# API Doc Manager - 개발 환경 자동 설정 스크립트
# 이 스크립트는 Python 가상환경을 설정하고 모든 의존성을 설치합니다.

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 성공 메시지
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 에러 메시지
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 함수: 경고 메시지
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 함수: 정보 메시지
info() {
    echo -e "${YELLOW}📌 $1${NC}"
}

echo ""
echo "🚀 API Doc Manager 설치를 시작합니다..."
echo ""

# 1. Python 버전 확인
info "Python 버전 확인 중..."
if ! command -v python3 &> /dev/null; then
    error "Python 3이 설치되지 않았습니다. https://www.python.org/downloads/ 에서 설치하세요."
fi

PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if (( PYTHON_MAJOR < 3 )) || (( PYTHON_MAJOR == 3 && PYTHON_MINOR < 10 )); then
    error "Python 3.10 이상이 필요합니다. (현재: $PYTHON_VERSION)"
fi
success "Python $PYTHON_VERSION"

# 2. 가상환경 생성
info "가상환경 생성 중..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    success "가상환경 생성 완료"
else
    warning "가상환경이 이미 존재합니다. 건너뜁니다."
fi

# 3. 가상환경 활성화
info "가상환경 활성화 중..."
source .venv/bin/activate
success "가상환경 활성화 완료"

# 4. pip 업그레이드
info "pip 업그레이드 중..."
pip install --upgrade pip > /dev/null 2>&1
success "pip 업그레이드 완료"

# 5. 의존성 설치
info "의존성 설치 중... (이 과정은 수 분이 걸릴 수 있습니다)"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    success "의존성 설치 완료"
else
    error "requirements.txt 파일을 찾을 수 없습니다."
fi

# 6. .env 파일 생성
if [ ! -f ".env" ]; then
    info ".env 파일 생성 중..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        success ".env 파일 생성 완료"
        warning ".env 파일을 열어 MONGODB_URI를 확인하세요!"
    else
        error ".env.example 파일을 찾을 수 없습니다."
    fi
else
    warning ".env 파일이 이미 존재합니다. 건너뜁니다."
fi

# 7. MongoDB 확인 (선택사항)
echo ""
info "MongoDB 연결 확인 중..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        success "MongoDB 연결 성공"
    else
        warning "MongoDB가 실행 중이지 않습니다."
        echo "   시작하려면:"
        echo "   • Docker: docker run -d -p 27017:27017 --name mongodb mongo:8"
        echo "   • 로컬: mongod"
    fi
else
    warning "MongoDB Shell이 설치되지 않았습니다. 연결 확인을 건너뜁니다."
fi

# 완료 메시지
echo ""
echo "🎉 설치가 완료되었습니다!"
echo ""
echo "📋 다음 단계:"
echo ""
echo "1️⃣  MongoDB가 실행 중인지 확인하세요:"
echo "   • Docker: docker run -d -p 27017:27017 --name mongodb mongo:8"
echo "   • 로컬: mongod"
echo ""
echo "2️⃣  개발 서버를 실행하세요:"
echo "   source .venv/bin/activate"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 3000"
echo ""
echo "3️⃣  브라우저에서 http://localhost:3000 을 열어보세요!"
echo ""
echo "📚 문서 보기:"
echo "   • Swagger UI: http://localhost:3000/api-docs"
echo "   • API 가이드: docs/API_GUIDE.md"
echo "   • 아키텍처: docs/ARCHITECTURE.md"
echo ""
