# 설치 가이드

## 📋 사전 요구사항

- **Python 3.10 이상** - [다운로드](https://www.python.org/downloads/)
- **MongoDB 8.x** - [다운로드](https://www.mongodb.com/try/download/community) 또는 Docker
- **Git** - [다운로드](https://git-scm.com/downloads)

---

## 🚀 빠른 설치 (권장)

### Step 1: 저장소 클론

```bash
git clone <repository-url>
cd apidocpython
```

### Step 2: 자동 설정 스크립트 실행

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

스크립트가 다음을 자동으로 수행합니다:
- Python 버전 확인 (3.10+)
- 가상환경 생성 (.venv)
- 의존성 설치 (pip install -r requirements.txt)
- .env 파일 생성

---

## 🔧 수동 설치

### Step 1: 가상환경 생성

```bash
# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Windows (CMD)
python -m venv .venv
.venv\Scripts\activate.bat
```

### Step 2: 의존성 설치

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 다음 항목을 설정합니다:

```env
# MongoDB 연결
MONGODB_URI=mongodb://localhost:27017/api-doc-manager

# CORS 설정 (프론트엔드 도메인)
CORS_ORIGIN=http://localhost:3000

# Slack 알림 (선택사항)
SLACK_ENABLED=false
SLACK_BOT_TOKEN=xoxb-your-token
```

---

## 🗄️ MongoDB 설정

### 옵션 1: Docker 사용 (권장)

```bash
# MongoDB 실행
docker run -d -p 27017:27017 --name mongodb mongo:8

# MongoDB 중지
docker stop mongodb

# MongoDB 제거
docker rm mongodb
```

### 옵션 2: 로컬 설치

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
1. [MongoDB Community](https://www.mongodb.com/try/download/community) 다운로드
2. 설치 후 자동으로 서비스 시작됨

**Linux (Ubuntu):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### 옵션 3: MongoDB Atlas (클라우드)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 가입
2. 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일에 설정:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/api-doc-manager?retryWrites=true&w=majority
```

---

## ▶️ 서버 실행

### 개발 모드 (자동 재시작)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

### 프로덕션 모드

```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### 로그 레벨 조정

```bash
# DEBUG 로그
uvicorn app.main:app --reload --log-level debug

# WARNING 로그만
uvicorn app.main:app --reload --log-level warning
```

---

## 🌐 웹 인터페이스 접속

서버 실행 후 브라우저에서 접속하세요:

| 주소 | 설명 |
|------|------|
| http://localhost:3000 | 메인 페이지 (API 목록) |
| http://localhost:3000/api-docs | Swagger UI (API 문서) |
| http://localhost:3000/redoc | ReDoc (API 문서) |
| http://localhost:3000/api/openapi.json | OpenAPI 스펙 |

---

## 🐛 문제 해결

### MongoDB 연결 실패

**증상:**
```
pymongo.errors.ServerSelectionTimeoutError: No servers matched query
```

**해결:**
```bash
# Docker 확인
docker ps | grep mongodb

# 로컬 MongoDB 확인
ps aux | grep mongod

# MongoDB 재시작
docker restart mongodb  # Docker
brew services restart mongodb-community  # macOS
```

### 포트 이미 사용 중

**증상:**
```
OSError: [Errno 48] Address already in use
```

**해결:**
```bash
# 다른 포트로 실행
uvicorn app.main:app --reload --port 8000

# 또는 기존 프로세스 종료 (Linux/macOS)
lsof -i :3000
kill -9 <PID>
```

### 가상환경 활성화 안 됨

```bash
# 가상환경 다시 생성
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 의존성 설치 실패

```bash
# pip 업그레이드
pip install --upgrade pip

# setuptools 업그레이드
pip install --upgrade setuptools

# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

---

## 📚 다음 단계

- [API 가이드](API_GUIDE.md) - API 엔드포인트 및 사용 방법
- [아키텍처](ARCHITECTURE.md) - 프로젝트 구조 및 설계

---

## 💬 추가 도움말

문제가 해결되지 않으면:
1. [GitHub Issues](https://github.com/repo/issues) 확인
2. 로그 메시지를 상세히 기록하고 보고
3. MongoDB 연결 확인
4. 필요시 `setup.sh` 다시 실행
