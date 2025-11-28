# 설치 및 시작 가이드

> API Doc Version Manager 설치 및 실행 방법

## 사전 요구사항

시스템을 실행하기 전에 다음 소프트웨어가 설치되어 있어야 합니다:

| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| **Node.js** | 18.x 이상 | 서버 런타임 |
| **npm** | 9.x 이상 | 패키지 관리 |
| **MongoDB** | 6.x 이상 | 데이터베이스 |

### 버전 확인

```bash
# Node.js 버전 확인
node --version
# 출력 예: v18.17.0

# npm 버전 확인
npm --version
# 출력 예: 9.6.7

# MongoDB 버전 확인
mongod --version
```

---

## 설치 방법

### 1. 저장소 클론

```bash
git clone <repository-url>
cd apidoc
```

### 2. 의존성 설치

```bash
npm install
```

설치되는 주요 패키지:

| 패키지 | 버전 | 용도 |
|--------|------|------|
| express | 4.18.x | 웹 프레임워크 |
| mongoose | 8.x | MongoDB ODM |
| axios | 1.x | HTTP 클라이언트 |
| joi | 17.x | 입력 검증 |
| morgan | 1.x | 로깅 미들웨어 |
| cors | 2.x | CORS 처리 |

---

## 환경 설정

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
# .env 파일 생성
touch .env
```

### 2. 환경 변수 설정

`.env` 파일에 다음 내용을 입력합니다:

```env
# MongoDB 연결 URI
MONGODB_URI=mongodb://localhost:27017/api-doc-manager

# 서버 포트 (기본값: 3000)
PORT=3000

# 실행 환경 (development | production)
NODE_ENV=development

# 로그 레벨 (dev | combined | common)
LOG_LEVEL=dev

# CORS 허용 오리진
CORS_ORIGIN=http://localhost:3000
```

### 환경 변수 설명

| 변수 | 필수 | 설명 | 기본값 |
|------|------|------|--------|
| `MONGODB_URI` | ✅ | MongoDB 연결 문자열 | - |
| `PORT` | ❌ | 서버 포트 번호 | 3000 |
| `NODE_ENV` | ❌ | 실행 환경 | development |
| `LOG_LEVEL` | ❌ | Morgan 로그 형식 | dev |
| `CORS_ORIGIN` | ❌ | CORS 허용 도메인 | http://localhost:3000 |

---

## 서버 실행

### 개발 모드

자동 재시작 기능이 포함된 개발 서버:

```bash
npm run dev
```

**특징:**
- nodemon으로 파일 변경 감지
- 코드 수정 시 자동 재시작
- 개발 환경 로그 출력

### 프로덕션 모드

```bash
npm start
```

**특징:**
- 일반 node 프로세스로 실행
- 프로덕션 환경 최적화

---

## 서버 확인

### 1. 브라우저 접속

서버 실행 후 브라우저에서 접속:

```
http://localhost:3000
```

### 2. API 헬스 체크

서버 상태 확인 API:

```bash
curl http://localhost:3000/api/health
```

정상 응답:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-11-27T10:00:00.000Z",
    "uptime": 123.456
  }
}
```

---

## 테스트 데이터 생성

개발 및 테스트용 샘플 데이터를 생성할 수 있습니다:

```bash
node scripts/seed-sample-version.js
```

이 스크립트는:
- 샘플 API URL 등록
- 여러 버전의 Swagger JSON 생성
- 변경사항 히스토리 생성

**주의:** 기존 데이터가 있으면 중복 생성될 수 있습니다.

---

## 주요 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `npm install` | 의존성 설치 |
| `npm run dev` | 개발 서버 실행 (자동 재시작) |
| `npm start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run format` | Prettier 코드 포맷팅 |
| `node scripts/seed-sample-version.js` | 테스트 데이터 생성 |

---

## MongoDB 설정

### 로컬 MongoDB 실행

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongo mongo:6
```

### MongoDB 연결 확인

```bash
# MongoDB 셸 접속
mongosh

# 데이터베이스 목록 확인
show dbs
```

### Docker Compose 사용 (선택사항)

프로젝트에 `docker-compose.yml` 파일을 생성하여 MongoDB를 컨테이너로 실행할 수 있습니다:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

```bash
docker-compose up -d
```

---

## 문제 해결

### MongoDB 연결 실패

**증상:**
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**해결:**
1. MongoDB 서비스가 실행 중인지 확인
2. `MONGODB_URI` 환경 변수 확인
3. 방화벽/네트워크 설정 확인

### 포트 사용 중

**증상:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결:**
1. 다른 프로세스가 포트를 사용 중인지 확인
   ```bash
   lsof -i :3000
   ```
2. `.env`에서 `PORT` 변경 또는 해당 프로세스 종료

### 의존성 설치 오류

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

## 다음 단계

- [사용자 매뉴얼](./user-guide.md) - 화면별 사용 방법
- [API 명세](./api-reference.md) - REST API 상세
- [핵심 기능](./features.md) - 버전 관리 상세

---

← [목차로 돌아가기](./README.md)
