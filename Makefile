.PHONY: help setup install run run-prod test clean format lint mongo mongo-stop

help:
	@echo "🚀 API Doc Manager - Make Commands"
	@echo ""
	@echo "설정 및 설치:"
	@echo "  make setup         - 개발 환경 자동 설정"
	@echo "  make install       - Python 의존성 설치"
	@echo ""
	@echo "서버 실행:"
	@echo "  make run           - 개발 서버 실행 (자동 재시작)"
	@echo "  make run-prod      - 프로덕션 서버 실행"
	@echo ""
	@echo "개발:"
	@echo "  make format        - 코드 포맷팅 (black, isort)"
	@echo "  make lint          - 코드 분석 (flake8)"
	@echo ""
	@echo "데이터베이스:"
	@echo "  make mongo         - MongoDB 시작 (Docker)"
	@echo "  make mongo-stop    - MongoDB 중지"
	@echo ""
	@echo "유틸리티:"
	@echo "  make clean         - Python 캐시 정리"
	@echo "  make test          - 테스트 실행 (준비 중)"
	@echo ""

# 개발 환경 설정
setup:
	@echo "🚀 개발 환경 자동 설정을 시작합니다..."
	./scripts/setup.sh

# Python 의존성 설치
install:
	@echo "📦 Python 의존성 설치 중..."
	pip install --upgrade pip
	pip install -r requirements.txt
	@echo "✅ 의존성 설치 완료"

# 개발 서버 실행 (자동 재시작)
run:
	@echo "▶️  개발 서버 실행 중..."
	@echo "📍 접속: http://localhost:3000"
	@echo "📚 Swagger: http://localhost:3000/api-docs"
	@echo "⛔ 중단: Ctrl+C"
	uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 프로덕션 서버 실행
run-prod:
	@echo "▶️  프로덕션 서버 실행 중..."
	uvicorn app.main:app --host 0.0.0.0 --port 3000 --workers 4

# 코드 포맷팅
format:
	@echo "🎨 코드 포맷팅 중..."
	@if command -v black > /dev/null 2>&1; then \
		black app/; \
		echo "✅ Black 포맷팅 완료"; \
	else \
		echo "⚠️  black이 설치되지 않았습니다. pip install black"; \
	fi
	@if command -v isort > /dev/null 2>&1; then \
		isort app/; \
		echo "✅ isort 정렬 완료"; \
	else \
		echo "⚠️  isort가 설치되지 않았습니다. pip install isort"; \
	fi

# 코드 분석
lint:
	@echo "🔍 코드 분석 중..."
	@if command -v flake8 > /dev/null 2>&1; then \
		flake8 app/ --max-line-length=100; \
		echo "✅ flake8 분석 완료"; \
	else \
		echo "⚠️  flake8이 설치되지 않았습니다. pip install flake8"; \
	fi

# 테스트 실행
test:
	@echo "🧪 테스트 실행 중... (준비 중)"
	@echo "pytest tests/ -v"

# Python 캐시 정리
clean:
	@echo "🗑️  Python 캐시 정리 중..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name ".pytest_cache" -delete
	find . -type f -name ".DS_Store" -delete
	@echo "✅ 정리 완료"

# MongoDB 시작 (Docker)
mongo:
	@echo "🗄️  MongoDB를 시작하는 중... (Docker)"
	@if command -v docker > /dev/null 2>&1; then \
		docker run -d -p 27017:27017 --name mongodb mongo:8; \
		sleep 2; \
		echo "✅ MongoDB 시작 완료"; \
		echo "📍 연결: mongodb://localhost:27017"; \
	else \
		echo "❌ Docker가 설치되지 않았습니다."; \
		echo "   로컬 설치: brew install mongodb-community"; \
		echo "   또는 Docker 설치: https://www.docker.com/products/docker-desktop"; \
	fi

# MongoDB 중지 및 제거
mongo-stop:
	@echo "🛑 MongoDB를 중지하는 중..."
	@if command -v docker > /dev/null 2>&1; then \
		docker stop mongodb 2>/dev/null || true; \
		docker rm mongodb 2>/dev/null || true; \
		echo "✅ MongoDB 중지 완료"; \
	else \
		echo "❌ Docker가 설치되지 않았습니다."; \
	fi

# 정보 출력
info:
	@echo "📋 프로젝트 정보:"
	@echo ""
	@echo "🔹 Python 버전: $$(python3 --version)"
	@python3 -c "import app.common.config; print('🔹 MongoDB:', app.common.config.settings.mongodb_uri.split('@')[0] + '...')" 2>/dev/null || echo "🔹 설정 로드 불가"
	@echo "🔹 FastAPI 버전: $$(python3 -c "import fastapi; print(fastapi.__version__)" 2>/dev/null || echo 'Not installed')"
	@echo ""
