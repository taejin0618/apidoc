# API Doc Manager (ADM)

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green.svg)](https://www.mongodb.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-teal.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

Swagger/OpenAPI 문서를 중앙에서 관리하고 버전별 변경사항을 자동으로 추적하는 시스템입니다.

## 스크린샷

### 메인 페이지 - API 목록

### API 상세 페이지 - Swagger UI 렌더링

## 주요 기능

- **Swagger 문서 URL 관리**: 여러 API 서비스의 Swagger URL을 등록하고 관리
- **자동 버전 관리**: Swagger JSON을 자동으로 다운로드하고 버전별로 저장
- **변경사항 자동 감지**: 이전 버전과 비교하여 추가/삭제/수정된 항목 자동 분석
- **심각도 분류**: 변경사항을 `low` / `medium` / `high` 수준으로 자동 분류
- **버전 비교**: 두 버전을 나란히 비교하고 변경된 부분 강조 표시
- **검색 및 필터링**: API 이름, 그룹별 필터링 지원

## 기술 스택

| 구분     | 기술                              |
| -------- | --------------------------------- |
| Backend  | FastAPI                           |
| Database | MongoDB (Motor / PyMongo)         |
| Runtime  | Python 3.10+                      |
| Frontend | HTML5 / CSS3 / Vanilla JavaScript |

## 빠른 시작

### 사전 요구사항

- Python 3.10 이상
- MongoDB 실행 중

### 설치 및 실행

```bash
# 저장소 클론
git clone <repository-url>
cd apidocpython

# 가상환경 생성 및 활성화
# macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell):
# python -m venv .venv
# .venv\Scripts\Activate.ps1

# Windows (CMD):
# python -m venv .venv
# .venv\Scripts\activate.bat

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 MONGODB_URI 등 설정

# 개발 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 브라우저에서 접속
# http://localhost:3000
```

**참고**: 가상 환경을 활성화하면 프롬프트 앞에 `(.venv)`가 표시됩니다. 가상 환경을 비활성화하려면 `deactivate` 명령어를 실행하세요.

## 환경 변수

`.env` 파일에 다음 환경 변수를 설정합니다:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/api-doc-manager
LOG_LEVEL=dev
CORS_ORIGIN=http://localhost:3000
TRUST_PROXY=1

# 슬랙 알림 설정 (선택사항)
SLACK_ENABLED=false
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
BASE_URL=http://localhost:3000
```

**참고**: `NODE_ENV`는 레거시 호환성을 위해 유지되지만, 실제로는 Python 환경에서 사용되지 않습니다.

### 슬랙 알림 설정

API 변경사항 발생 시 슬랙 개인 DM으로 알림을 받으려면 다음 설정이 필요합니다:

1. **Slack Bot 생성**

   - [Slack API](https://api.slack.com/apps)에서 새 앱 생성
   - Bot Token Scopes에 다음 권한 추가:
     - `users:read.email` (이메일로 사용자 조회)
     - `chat:write` (메시지 전송)
     - `im:write` (DM 전송)
   - Bot Token (xoxb-로 시작) 복사

2. **환경 변수 설정**

   - `SLACK_ENABLED=true`: 슬랙 알림 활성화
   - `SLACK_BOT_TOKEN`: 위에서 복사한 Bot Token
   - `BASE_URL`: 상세 페이지 링크 생성용 기본 URL (프로덕션 도메인)

3. **API 담당자 설정**
   - API 추가/수정 시 `owner` 필드에 슬랙에 등록된 이메일 주소 입력
   - 변경사항 발생 시 해당 이메일로 슬랙 사용자를 찾아 개인 DM 전송

**참고**: 슬랙 알림이 실패해도 버전 업데이트는 정상적으로 진행됩니다.

## 프로젝트 구조

```
apidocpython/
├── app/                      # FastAPI 앱
│   ├── main.py               # 앱 진입점
│   ├── db.py                 # MongoDB 연결
│   ├── routes/               # API/페이지 라우트
│   ├── services/             # 비즈니스 로직
│   └── swagger_spec.json     # OpenAPI 스펙 (정적)
├── requirements.txt          # Python 의존성
├── .env                      # 환경 변수
│
├── views/                    # HTML 페이지
│   ├── index.html            # 메인 페이지 (API 목록)
│   ├── api-detail.html       # API 상세 페이지
│   └── version-compare.html  # 버전 비교 페이지
│
├── public/                   # 정적 자산
│   ├── css/                  # 스타일시트
│   └── js/                   # 클라이언트 JavaScript
│
├── scripts/                  # 유틸리티 스크립트 (Node.js 기반 마이그레이션 스크립트)
│
└── examples/                 # 예제 Swagger JSON
    ├── swagger-v1.json
    ├── swagger-v2.json
    └── swagger-v3.json
```

## API 엔드포인트

### URL 관리

| Method   | Endpoint                 | 설명                       |
| -------- | ------------------------ | -------------------------- |
| `GET`    | `/api/urls`              | 모든 URL 목록 조회         |
| `POST`   | `/api/urls`              | 새 URL 등록                |
| `GET`    | `/api/urls/:id`          | 특정 URL 상세 조회         |
| `PUT`    | `/api/urls/:id`          | URL 정보 수정              |
| `DELETE` | `/api/urls/:id`          | URL 삭제                   |
| `PATCH`  | `/api/urls/:id/activate` | 활성화/비활성화 토글       |
| `POST`   | `/api/urls/:id/fetch`    | Swagger JSON 수동 업데이트 |

### 버전 관리

| Method | Endpoint                                 | 설명               |
| ------ | ---------------------------------------- | ------------------ |
| `GET`  | `/api/urls/:id/versions`                 | 버전 목록 조회     |
| `GET`  | `/api/urls/:id/versions/:versionId`      | 버전 상세 조회     |
| `GET`  | `/api/urls/:id/versions/:v1/compare/:v2` | 두 버전 비교       |
| `GET`  | `/api/versions/latest/:count`            | 최신 N개 버전 조회 |

### 헬스체크

| Method | Endpoint      | 설명           |
| ------ | ------------- | -------------- |
| `GET`  | `/api/health` | 서버 상태 확인 |

## 개발 스크립트

```bash
# 개발 서버 (자동 재시작)
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 프로덕션 서버
uvicorn app.main:app --host 0.0.0.0 --port 3000

```

## 개발 워크플로우

이 프로젝트는 간단한 Git 브랜치 전략을 사용합니다:

- **main**: 배포용 브랜치 (안정 버전만, 직접 푸시 금지)
- **develop**: 개발 통합 브랜치 (평소 작업하는 곳)
- **feature/기능명**: 새 기능 개발 브랜치 (작업 후 삭제)

### 빠른 시작

```bash
# 1. develop 브랜치로 이동
git checkout develop
git pull origin develop

# 2. 새 기능 브랜치 만들기
git checkout -b feature/기능명

# 3. 작업 후 Pull Request 생성
# feature/기능명 → develop
```

자세한 내용은 [Git 워크플로우 가이드](docs/git-workflow.md)를 참고하세요.

## 변경사항 심각도

| 심각도     | 기준                                 | 예시                              |
| ---------- | ------------------------------------ | --------------------------------- |
| **high**   | 새 endpoint 추가, 필수 파라미터 변경 | path 추가, required=true 파라미터 |
| **medium** | 선택 파라미터 변경, RequestBody 수정 | optional 파라미터, schema 변경    |
| **low**    | 설명 변경, 메타정보 수정             | description, summary 변경         |

## 의존성

### 프로덕션

| 패키지          | 용도                    |
| --------------- | ----------------------- |
| fastapi         | 웹 프레임워크           |
| uvicorn         | ASGI 서버               |
| motor           | MongoDB 비동기 드라이버 |
| pymongo         | MongoDB 동기 드라이버   |
| httpx           | HTTP 클라이언트         |
| deepdiff        | JSON 비교               |
| python-dotenv   | 환경 변수 관리          |
| slack-sdk       | 슬랙 알림               |
| email-validator | 이메일 검증             |

자세한 내용은 `requirements.txt`를 참고하세요.

## 라이선스

ISC License

## 작성자

Taejin Kim
