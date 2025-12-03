# 아키텍처

> 시스템 구조, 데이터 모델, 핵심 서비스 설명

## 목차

1. [시스템 개요](#시스템-개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [레이어별 상세 설명](#레이어별-상세-설명)
4. [데이터 모델](#데이터-모델)
5. [핵심 서비스](#핵심-서비스)
6. [API 설계](#api-설계)
7. [보안 아키텍처](#보안-아키텍처)
8. [프론트엔드 아키텍처](#프론트엔드-아키텍처)
9. [확장성 및 성능](#확장성-및-성능)
10. [데이터 흐름](#데이터-흐름)
11. [개발 워크플로우](#개발-워크플로우)

---

## 시스템 개요

### 프로젝트 목적

API Doc Manager (ADM)는 여러 API 서비스의 Swagger/OpenAPI 문서를 중앙에서 관리하고, 버전별 변경사항을 자동으로 추적하는 시스템입니다.

**핵심 가치:**
- **중앙 집중식 관리**: 여러 팀의 API 문서를 한 곳에서 관리
- **자동화된 버전 추적**: Swagger JSON을 자동으로 다운로드하고 버전별로 저장
- **변경사항 감지**: 이전 버전과 비교하여 추가/삭제/수정된 항목 자동 분석
- **심각도 분류**: 변경사항을 `low` / `medium` / `high` 수준으로 자동 분류하여 우선순위 파악
- **시각화**: Swagger UI를 통한 실시간 문서 조회 및 버전 비교 기능

### 주요 기능

| 기능 | 설명 |
|------|------|
| **URL 관리** | Swagger 문서 URL 등록, 그룹화, 활성화 관리 |
| **버전 추적** | 자동 버전 생성 및 히스토리 관리 (메이저 버전 + 리비전) |
| **변경 분석** | 15개 영역 상세 비교 (endpoint, parameter, schema 등) |
| **심각도 분류** | high/medium/low 레벨로 변경사항 우선순위 표시 |
| **Swagger UI** | 내장 Swagger UI로 API 문서 실시간 조회 |
| **버전 비교** | 두 버전 간 상세 비교 및 시각화 |
| **슬랙 알림** | 변경사항 발생 시 담당자에게 개인 DM 전송 (선택사항) |

### 기술 스택

#### Backend
- **Runtime**: Node.js 18.x 이상
- **Framework**: Express.js 4.18.x
- **Database**: MongoDB (Mongoose 8.x)
- **HTTP Client**: Axios 1.6.x
- **Validation**: Joi 17.11.x

#### Frontend
- **Language**: Vanilla JavaScript (ES6+)
- **UI Library**: Swagger UI 5.x
- **Styling**: CSS3 (커스텀 디자인)
- **Fonts**: Open Sans, Source Code Pro

#### 보안 및 성능
- **Security**: Helmet 8.1.x (보안 헤더)
- **CORS**: cors 2.8.x
- **Rate Limiting**: express-rate-limit 8.2.x
- **Compression**: compression 1.8.x

#### 외부 서비스
- **Notification**: Slack Web API (@slack/web-api 7.0.x)

#### 개발 도구
- **Linting**: ESLint 8.54.x
- **Formatting**: Prettier 3.1.x
- **Auto-reload**: Nodemon 3.0.x

---

## 전체 아키텍처

### 레이어드 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                           │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐            │
│  │ index    │  │ api-detail   │  │ version-compare │            │
│  │  .html   │  │    .html     │  │     .html       │            │
│  └────┬─────┘  └──────┬───────┘  └────────┬────────┘            │
│       │               │                   │                     │
│       └───────────────┼───────────────────┘                     │
│                       │ api-client.js                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Client JavaScript Modules                               │   │
│  │  - main.js (메인 페이지 로직)                            │   │
│  │  - version-compare.js (버전 비교 로직)                    │   │
│  │  - icon-utils.js (아이콘 유틸리티)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTP (REST API)
┌───────────────────────┼─────────────────────────────────────────┐
│                    Application Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Express.js 서버                         │ │
│  │  ┌──────────┐  ┌────────────┐  ┌────────────────┐          │ │
│  │  │ server.js │→ │  app.js   │→ │   routes/      │          │ │
│  │  │ (진입점)  │  │ (Express) │  │ urlRoutes.js   │          │ │
│  │  └──────────┘  └────────────┘  │ versionRoutes  │          │ │
│  │                                │ swaggerRoutes  │          │ │
│  │                                └───────┬────────┘          │ │
│  │                                        │                    │ │
│  │  ┌─────────────────────────────────────┼────────────────┐  │ │
│  │  │              Middlewares            │                │  │ │
│  │  │  - helmet (보안 헤더)                │                │  │ │
│  │  │  - cors (CORS 처리)                  │                │  │ │
│  │  │  - rate-limit (요청 제한)            │                │  │ │
│  │  │  - compression (응답 압축)           │                │  │ │
│  │  │  - morgan (로깅)                     │                │  │ │
│  │  │  - errorHandler (에러 처리)          │                │  │ │
│  │  └─────────────────────────────────────┼────────────────┘  │ │
│  └────────────────────────────────────────┼────────────────────┘ │
│                                            │                      │
┌────────────────────────────────────────────┼──────────────────────┐
│                    Domain Layer            │                      │
│  ┌────────────────────────────────────────┼──────────────────┐  │
│  │                   services/            ▼                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐   │  │
│  │  │ swaggerService  │  │   diffService   │  │ slack    │   │  │
│  │  │ (버전 관리)      │  │  (변경 분석)     │  │ Service  │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────┬─────┘   │  │
│  └───────────┼───────────────────┼──────────────────┼─────────┘  │
│              │                   │                  │            │
┌──────────────┼───────────────────┼──────────────────┼────────────┐
│         Infrastructure Layer     │                  │            │
│  ┌───────────┼───────────────────┼──────────────────┼────────┐  │
│  │           ▼                   ▼                  ▼        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                    models/                         │  │  │
│  │  │  ┌──────────┐  ┌────────────┐  ┌──────────┐        │  │  │
│  │  │  │ ApiUrl   │  │ ApiVersion │  │ AuditLog │        │  │  │
│  │  │  └────┬─────┘  └─────┬──────┘  └────┬─────┘        │  │  │
│  │  └───────┼──────────────┼──────────────┼──────────────┘  │  │
│  └──────────┼──────────────┼──────────────┼─────────────────┘  │
│             │              │              │                     │
└─────────────┼──────────────┼──────────────┼─────────────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Database                             │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐                    │
│  │ apiurls  │  │ apiversions│  │ auditlogs│                    │
│  └──────────┘  └────────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Services                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Swagger URLs    │  │  Slack API       │                    │
│  │  (외부 API 서버)  │  │  (알림 전송)     │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 컴포넌트 간 상호작용

```
클라이언트 요청 흐름:
┌─────────┐
│ Browser │
└────┬────┘
     │ HTTP Request
     ▼
┌─────────────────┐
│ Express Server  │
│  (app.js)       │
└────┬────────────┘
     │
     ├───→ Middlewares (helmet, cors, rate-limit, etc.)
     │
     ├───→ Routes (urlRoutes, versionRoutes, swaggerRoutes)
     │
     ├───→ Services (swaggerService, diffService, slackService)
     │
     └───→ Models (ApiUrl, ApiVersion, AuditLog)
              │
              ▼
         ┌─────────┐
         │ MongoDB │
         └─────────┘
```

---

## 레이어별 상세 설명

### Presentation Layer (프레젠테이션 레이어)

프론트엔드는 순수 HTML/CSS/JavaScript로 구성되어 있으며, Swagger UI를 통합하여 API 문서를 시각화합니다.

#### 페이지 구조

| 페이지 | 파일 | 용도 |
|--------|------|------|
| **메인 페이지** | `views/index.html` | API URL 목록 조회, 필터링, 추가/수정 |
| **상세 페이지** | `views/api-detail.html` | 특정 API의 Swagger UI 표시, 버전 목록 |
| **버전 비교** | `views/version-compare.html` | 두 버전 간 변경사항 비교 및 시각화 |
| **Swagger UI** | `views/swagger-ui.html` | API Doc Manager 자체 API 문서 |

#### 클라이언트 JavaScript 모듈

**`api-client.js`**
- 백엔드 API 호출을 위한 래퍼 클래스
- 통일된 에러 처리 및 응답 파싱
- 주요 메서드:
  - `getUrls()`: URL 목록 조회
  - `createUrl()`: URL 생성
  - `updateUrl()`: URL 수정
  - `deleteUrl()`: URL 삭제
  - `getVersions()`: 버전 목록 조회
  - `compareVersions()`: 버전 비교

**`main.js`**
- 메인 페이지 로직
- 필터링, 검색, 모달 관리
- URL CRUD 작업 처리

**`version-compare.js`**
- 버전 비교 페이지 로직
- 변경사항 시각화 및 필터링

**`icon-utils.js`**
- 아이콘 유틸리티 함수
- 상태별 아이콘 매핑

### Application Layer (애플리케이션 레이어)

Express.js 기반의 RESTful API 서버로 구성되어 있습니다.

#### 서버 진입점 (`server.js`)

```javascript
// 주요 역할:
// 1. 환경 변수 로드 (dotenv)
// 2. MongoDB 연결 (connectDB)
// 3. Express 앱 시작
// 4. Graceful shutdown 처리
```

#### Express 앱 설정 (`src/app.js`)

**미들웨어 체인:**

1. **보안 미들웨어**
   - `helmet`: 보안 헤더 설정 (CSP, XSS Protection 등)
   - `cors`: CORS 정책 설정
   - `express-rate-limit`: API 요청 제한 (15분당 100회)

2. **로깅 및 모니터링**
   - `morgan`: HTTP 요청 로깅
   - `compression`: 응답 압축 (gzip)

3. **Body 파싱**
   - `express.json`: JSON 요청 본문 파싱 (최대 10MB)
   - `express.urlencoded`: URL 인코딩된 요청 파싱

4. **정적 파일 서빙**
   - `express.static`: public 디렉토리 서빙

5. **라우트 마운트**
   - `/api/health`: 헬스 체크
   - `/api/swagger.json`: Swagger 문서
   - `/api/urls`: URL 관리
   - `/api/urls/:id/versions`: 버전 관리
   - `/api/versions`: 전역 버전 조회

6. **에러 핸들링**
   - `notFoundHandler`: 404 처리
   - `errorHandler`: 전역 에러 처리

#### 라우트 구조

**`src/routes/urlRoutes.js`**
- URL CRUD 작업 처리
- Joi를 통한 입력 검증
- 주요 엔드포인트:
  - `GET /api/urls`: 목록 조회 (필터링, 페이지네이션)
  - `POST /api/urls`: URL 생성
  - `GET /api/urls/:id`: 상세 조회
  - `PUT /api/urls/:id`: 수정
  - `DELETE /api/urls/:id`: 삭제
  - `PATCH /api/urls/:id/activate`: 활성화/비활성화
  - `POST /api/urls/:id/fetch`: Swagger JSON 수동 가져오기

**`src/routes/versionRoutes.js`**
- 버전 관리 및 비교
- 주요 엔드포인트:
  - `GET /api/urls/:urlId/versions`: 버전 목록
  - `GET /api/urls/:urlId/versions/latest`: 최신 버전
  - `GET /api/urls/:urlId/versions/:versionId`: 버전 상세
  - `GET /api/urls/:urlId/versions/:versionId/diff`: 버전 비교
  - `GET /api/urls/:urlId/versions/:v1/compare/:v2`: 두 버전 비교
  - `GET /api/versions/latest`: 모든 URL의 최신 버전
  - `GET /api/versions/recent-changes`: 최근 변경사항

**`src/routes/swaggerRoutes.js`**
- API Doc Manager 자체 API 문서 제공
- OpenAPI 3.0 스펙 생성
- `GET /api/swagger.json`: Swagger 문서 반환

### Domain Layer (도메인 레이어)

비즈니스 로직을 담당하는 서비스 레이어입니다.

#### swaggerService.js

Swagger JSON 다운로드 및 버전 관리를 담당합니다.

**주요 함수:**

**`fetchSwaggerJson(url, timeout)`**
- Swagger URL에서 JSON 다운로드
- 타임아웃: 15초 (기본값)
- OpenAPI/Swagger 유효성 검사
- 에러 처리: 404, 401, 타임아웃 등

**`extractMajorVersion(url, swaggerJson)`**
- paths에서 메이저 버전 추출
- 패턴: `/v1/`, `/v2/` 등
- 기본값: `'v1'`
- 우선순위: paths → URL → 기본값

**`parseAndSaveSwagger(urlId)`**
- 메인 처리 로직
- 1. Swagger JSON 다운로드
- 2. 메이저 버전 추출
- 3. 기존 버전 조회
- 4. 변경사항 분석 (diffService)
- 5. 신규 버전 생성 또는 기존 버전 업데이트
- 6. 슬랙 알림 전송 (비동기)
- 반환: `{ created, updated, version }`

**`countEndpoints(swaggerJson)`**
- paths에서 엔드포인트 수 계산
- HTTP 메서드: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD

**`generateSummary(changes)`**
- 변경사항 요약 문자열 생성
- 예: "5개 추가, 2개 삭제, 3개 수정"

#### diffService.js

두 Swagger JSON의 변경사항을 분석합니다.

**비교 영역 (15개):**

| 영역 | 설명 | 심각도 | 비교 함수 |
|------|------|--------|----------|
| **Endpoints** | 경로 및 HTTP 메서드 | high | `comparePaths()` |
| **Parameters** | 쿼리/경로/헤더 파라미터 | medium/low | `compareParameters()` |
| **Request Body** | 요청 본문 | medium | `compareRequestBody()` |
| **Responses** | HTTP 응답 코드 및 스키마 | low | `compareResponses()` |
| **Schemas** | components.schemas | medium | `compareObjectMaps()` |
| **Security** | 보안 요구사항 | high | `compareSecurity()` |
| **Tags** | API 태그 | low | `compareTags()` |
| **Info** | 제목, 설명, 버전 | low | `compareInfo()` |
| **Servers** | 서버 URL | medium | `compareServers()` |
| **Security Schemes** | 인증 방식 정의 | high | `compareObjectMaps()` |
| **Headers** | 커스텀 헤더 | low | `compareObjectMaps()` |
| **Examples** | 예제 정의 | low | `compareObjectMaps()` |
| **Links** | OpenAPI 링크 | low | `compareObjectMaps()` |
| **Callbacks** | 콜백 정의 | medium | `compareObjectMaps()` |
| **External Docs** | 외부 문서 링크 | low | `compareExternalDocs()` |

**주요 함수:**

**`analyzeChanges(oldJson, newJson)`**
- 메인 비교 함수
- 1. 전역 설정 비교 (info, servers, security, tags)
- 2. paths (endpoints) 비교 (정규화된 경로 비교)
- 3. components/definitions 비교
- 4. Swagger 2.0 호환 필드 비교
- 반환: `{ hasChanges, changes }`

**경로 정규화 알고리즘:**
- 버전 접두사 제거: `/v1/users` → `/{VERSION}/users`
- 동일 문서 내 여러 버전 공존 케이스 처리
- 버전 변경 감지: `/v1/users` → `/v2/users` (동일 엔드포인트로 인식)

**헬퍼 함수:**
- `compareObjectMaps()`: 객체 맵 비교
- `compareArrays()`: 배열 비교 (keyField 기준)
- `compareValues()`: 단순 값 비교
- `normalizePathKey()`: 경로 정규화
- `buildPathMapping()`: 경로 매핑 생성

#### slackService.js

Slack 알림 시스템을 담당합니다.

**주요 함수:**

**`findUserByEmail(email)`**
- 이메일로 Slack 사용자 ID 조회
- Slack Web API 사용

**`sendDirectMessage(userId, message)`**
- 개인 DM 전송
- DM 채널 자동 생성

**`formatChangeNotification(options)`**
- 변경사항 알림 메시지 포맷팅
- Slack Block Kit 형식 사용

**`sendChangeNotification(options)`**
- API 변경사항 알림 전송
- 비동기 처리 (실패해도 버전 업데이트는 정상 진행)
- 조건: `SLACK_ENABLED=true`, `owner` 이메일 존재

### Infrastructure Layer (인프라스트럭처 레이어)

데이터베이스 및 외부 서비스와의 통신을 담당합니다.

#### 데이터베이스 연결 (`src/config/database.js`)

```javascript
// MongoDB 연결 설정
// - Connection Pool: min 10, max 50
// - Server Selection Timeout: 5초
// - 자동 재연결 처리
// - 연결 이벤트 리스너
```

#### 데이터 모델

아래 [데이터 모델](#데이터-모델) 섹션 참조.

---

## 데이터 모델

### ApiUrl (URL 메타데이터)

API 서비스의 Swagger URL 정보를 저장합니다.

```javascript
{
  _id: ObjectId,           // MongoDB 자동 생성

  // 기본 정보
  name: String,            // 서비스명 (필수, max 100)
  url: String,             // Swagger URL (필수, unique, http/https)
  group: String,           // 그룹/팀 (필수, lowercase)
  service: String,         // 서비스명 (필수, lowercase)
  description: String,     // 설명 (max 500)

  // 상태 정보
  isActive: Boolean,       // 활성화 여부 (기본: true)
  lastFetchedAt: Date,     // 마지막 fetch 시간
  lastFetchStatus: String, // 'pending' | 'success' | 'error'
  errorMessage: String,    // 에러 메시지 (실패 시)

  // 부가 정보
  owner: String,           // 담당자 이메일 (슬랙 알림용)
  tags: [String],          // 태그 배열
  priority: String,        // 'low' | 'medium' | 'high' (기본: 'medium')
  versionCount: Number,    // 버전 수 (기본: 0)

  // 타임스탬프
  createdAt: Date,         // 생성 시간 (자동)
  updatedAt: Date          // 수정 시간 (자동)
}
```

**인덱스:**

| 필드 | 타입 | 용도 |
|------|------|------|
| `url` | unique | URL 중복 방지 |
| `group` | 단일 | 그룹별 조회 |
| `service` | 단일 | 서비스별 조회 |
| `isActive` | 단일 | 상태 필터링 |
| `lastFetchStatus` | 단일 | 상태별 조회 |
| `name, description` | text | 텍스트 검색 |

**Virtual 필드:**
- `versions`: ApiVersion 참조 (populate 사용)

**Pre-save Hook:**
- URL 끝의 `/` 제거

### ApiVersion (버전 데이터)

Swagger JSON의 버전별 스냅샷을 저장합니다.

```javascript
{
  _id: ObjectId,
  urlId: ObjectId,          // ApiUrl 참조 (필수)

  // 버전 식별
  versionId: String,        // 'v1', 'v2' 등 (메이저 버전)
  versionNumber: Number,    // 순번 (정렬용, 1부터 시작)
  majorVersion: String,     // URL 기반 메이저 버전 (예: 'v1')
  revisionCount: Number,    // 동일 메이저 버전 내 리비전 수 (기본: 1)

  // 시간 정보
  timestamp: Date,          // 최초 생성 시간
  lastUpdatedAt: Date,      // 마지막 업데이트 시간

  // Swagger 데이터
  swaggerJson: Mixed,       // 완전한 OpenAPI/Swagger JSON

  // 변경사항
  changes: [{
    type: String,           // 'added' | 'removed' | 'modified' | 'path_version_changed'
    category: String,       // 'endpoint' | 'parameter' | 'schema' | 'info' | ...
    path: String,           // 'GET /api/users' 또는 경로
    field: String,          // 변경된 필드명 (nullable)
    oldValue: Mixed,        // 이전 값 (nullable)
    newValue: Mixed,        // 새 값 (nullable)
    description: String,    // 변경 설명
    severity: String,       // 'low' | 'medium' | 'high'
    recordedAt: Date,       // 기록 시간
    metadata: Mixed         // 추가 메타데이터 (경로 버전 변경 등)
  }],

  // 변경 이력 (리비전별)
  changeHistory: [{
    updatedAt: Date,
    changesCount: Number,
    summary: String
  }],

  // 이전 버전 참조
  previousVersionId: ObjectId,  // 이전 버전 ID (nullable)

  // 통계
  endpointCount: Number,    // 엔드포인트 수
  parameterCount: Number,   // 파라미터 수 (미사용)
  summary: String           // 변경 요약 (예: "5개 추가, 2개 삭제")
}
```

**Virtual 필드:**

```javascript
changeStats: {
  added: Number,
  removed: Number,
  modified: Number,
  path_version_changed: Number,
  total: Number,
  bySeverity: { high: Number, medium: Number, low: Number },
  byCategory: { endpoint: Number, parameter: Number, ... }
}
```

**Static 메서드:**

| 메서드 | 설명 |
|--------|------|
| `getLatestVersion(urlId)` | 최신 버전 조회 (swaggerJson 포함) |
| `getVersionList(urlId, options)` | 버전 목록 조회 (페이지네이션, swaggerJson 제외 옵션) |

**인덱스:**

| 필드 | 타입 | 용도 |
|------|------|------|
| `urlId + versionNumber` | 복합 | URL별 버전 정렬 |
| `urlId + timestamp` | 복합 | 시간순 조회 |
| `urlId + majorVersion` | 복합 | 메이저 버전 조회 |

**버전 관리 전략:**
- **메이저 버전**: paths에서 추출한 버전 (예: `/v1/`, `/v2/`)
- **리비전**: 동일 메이저 버전 내 변경사항 발생 시 `revisionCount` 증가
- **버전 번호**: 전체 버전 순번 (1부터 시작, 증가)

### AuditLog (감사 로그)

시스템 작업 이력을 기록합니다.

```javascript
{
  _id: ObjectId,

  // 작업 정보
  action: String,           // 작업 종류 (enum)
  urlId: ObjectId,          // 관련 URL (nullable)
  versionId: ObjectId,      // 관련 버전 (nullable)
  user: String,             // 수행자 (기본: 'system')
  status: String,           // 'success' | 'error' | 'pending'

  // 상세 정보
  details: Mixed,           // 작업 상세 (JSON)
  errorMessage: String,     // 에러 메시지 (nullable)

  // 클라이언트 정보
  ipAddress: String,        // 클라이언트 IP (nullable)
  userAgent: String,        // User Agent (nullable)

  // 타임스탬프
  timestamp: Date           // 생성 시간 (자동)
}
```

**Action 종류:**

| Action | 설명 |
|--------|------|
| `fetch_swagger` | Swagger JSON 가져오기 |
| `create_url` | URL 등록 |
| `update_url` | URL 수정 |
| `delete_url` | URL 삭제 |
| `activate_url` | 활성화/비활성화 |
| `create_version` | 버전 생성 |
| `error` | 오류 발생 |

**인덱스:**
- `timestamp`: -1 (시간순 조회)
- `urlId + timestamp`: 복합 (URL별 이력 조회)
- `action + timestamp`: 복합 (작업별 조회)
- **TTL 인덱스**: 90일 후 자동 삭제

**Static 메서드:**
- `log(data)`: 로그 생성 헬퍼

### 데이터 관계

```
ApiUrl (1) ──────< (N) ApiVersion
   │                      │
   │                      │
   └──────────< (N) AuditLog
```

- 하나의 ApiUrl은 여러 ApiVersion을 가질 수 있음
- ApiVersion은 하나의 ApiUrl에 속함
- AuditLog는 ApiUrl 또는 ApiVersion을 참조할 수 있음

---

## 핵심 서비스

### swaggerService.js

Swagger JSON 다운로드 및 버전 관리를 담당합니다.

#### 주요 함수

**`fetchSwaggerJson(url, timeout)`**

```javascript
// Swagger URL에서 JSON 다운로드
// - 타임아웃: 15초 (기본값)
// - OpenAPI/Swagger 유효성 검사
// - 에러 처리: 404, 401, 타임아웃, 연결 거부 등
// 반환: swaggerJson 객체
```

**`extractMajorVersion(url, swaggerJson)`**

```javascript
// paths에서 메이저 버전 추출
// 우선순위:
// 1. paths의 첫 번째 경로에서 /v숫자/ 패턴 추출
// 2. 없으면 기본값 'v1' 반환
// 반환: 'v1', 'v2' 등
```

**`parseAndSaveSwagger(urlId)`**

```javascript
// 메인 처리 로직
// 1. ApiUrl 조회 및 활성화 확인
// 2. fetchSwaggerJson으로 JSON 다운로드
// 3. extractMajorVersion으로 버전 추출
// 4. 기존 버전 조회 (majorVersion 기준)
// 5. diffService.analyzeChanges로 변경사항 분석
// 6. 변경사항 있으면:
//    - 기존 버전: revisionCount 증가, changes 추가
//    - 신규 버전: 새 버전 생성
// 7. ApiUrl 상태 업데이트
// 8. 슬랙 알림 전송 (비동기)
// 반환: { created, updated, version }
```

**`countEndpoints(swaggerJson)`**

```javascript
// paths에서 엔드포인트 수 계산
// HTTP 메서드: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
// 반환: 엔드포인트 총 개수
```

**`generateSummary(changes)`**

```javascript
// 변경사항 요약 문자열 생성
// 예: "5개 추가, 2개 삭제, 3개 수정"
// 반환: 요약 문자열
```

### diffService.js

두 Swagger JSON의 변경사항을 분석합니다.

#### 비교 영역 (15개)

| 영역 | 설명 | 심각도 | 비교 함수 |
|------|------|--------|----------|
| **Endpoints** | 경로 및 HTTP 메서드 | high | `comparePaths()` |
| **Parameters** | 쿼리/경로/헤더 파라미터 | medium/low | `compareParameters()` |
| **Request Body** | 요청 본문 | medium | `compareRequestBody()` |
| **Responses** | HTTP 응답 코드 및 스키마 | low | `compareResponses()` |
| **Schemas** | components.schemas | medium | `compareObjectMaps()` |
| **Security** | 보안 요구사항 | high | `compareSecurity()` |
| **Tags** | API 태그 | low | `compareTags()` |
| **Info** | 제목, 설명, 버전 | low | `compareInfo()` |
| **Servers** | 서버 URL | medium | `compareServers()` |
| **Security Schemes** | 인증 방식 정의 | high | `compareObjectMaps()` |
| **Headers** | 커스텀 헤더 | low | `compareObjectMaps()` |
| **Examples** | 예제 정의 | low | `compareObjectMaps()` |
| **Links** | OpenAPI 링크 | low | `compareObjectMaps()` |
| **Callbacks** | 콜백 정의 | medium | `compareObjectMaps()` |
| **External Docs** | 외부 문서 링크 | low | `compareExternalDocs()` |

#### 주요 함수

**`analyzeChanges(oldJson, newJson)`**

```javascript
// 메인 비교 함수
// 1. OpenAPI/Swagger 버전 비교
// 2. info 섹션 비교
// 3. servers 비교
// 4. 전역 security 비교
// 5. tags 비교
// 6. externalDocs 비교
// 7. paths (endpoints) 비교 (정규화된 경로 비교)
// 8. components 전체 비교
// 9. Swagger 2.0 호환 필드 비교 (definitions, securityDefinitions, basePath, host, schemes, consumes, produces)
// 반환: { hasChanges, changes }
```

**경로 정규화 알고리즘:**

```javascript
// normalizePathKey(path)
// 입력: "/v1/users/{id}"
// 출력: {
//   normalizedPath: "/{VERSION}/users/{id}",
//   versionPrefix: "/v1",
//   originalPath: "/v1/users/{id}"
// }

// buildPathMapping(oldPaths, newPaths)
// - 정규화된 키로 그룹화
// - 동일 버전끼리 먼저 매칭
// - 버전 업그레이드 매칭 시도 (v1 -> v2)
// - 매칭되지 않은 것은 추가/삭제로 처리
```

**헬퍼 함수:**

- `compareObjectMaps()`: 객체 맵 비교 (key-value 형태)
- `compareArrays()`: 배열 비교 (keyField 기준 또는 전체 비교)
- `compareValues()`: 단순 값 비교
- `compareOperation()`: Operation(엔드포인트 메서드) 상세 비교
- `compareParameters()`: Parameters 비교 (name + in 조합으로 고유 식별)
- `compareRequestBody()`: RequestBody 비교
- `compareResponses()`: Responses 비교 (응답 코드별)

#### Swagger 2.0 호환

| OpenAPI 3.0 | Swagger 2.0 |
|-------------|-------------|
| `components.schemas` | `definitions` |
| `components.securitySchemes` | `securityDefinitions` |
| `servers` | `basePath`, `host`, `schemes` |
| `requestBody` | `consumes` + body parameter |

### slackService.js

Slack 알림 시스템을 담당합니다.

#### 주요 함수

**`findUserByEmail(email)`**

```javascript
// 이메일로 Slack 사용자 ID 조회
// Slack Web API: users.lookupByEmail
// 반환: userId 또는 null
```

**`sendDirectMessage(userId, message)`**

```javascript
// 개인 DM 전송
// 1. conversations.open으로 DM 채널 생성/열기
// 2. chat.postMessage로 메시지 전송
// 반환: 성공 여부 (boolean)
```

**`formatChangeNotification(options)`**

```javascript
// 변경사항 알림 메시지 포맷팅
// Slack Block Kit 형식 사용
// 포함 정보:
// - API 이름, 버전, 상태, 변경사항 수
// - 변경사항 요약
// - 상세 페이지 링크
// - API URL
// 반환: Slack 메시지 포맷 객체
```

**`sendChangeNotification(options)`**

```javascript
// API 변경사항 알림 전송
// 1. SLACK_ENABLED 확인
// 2. ownerEmail로 사용자 조회
// 3. 메시지 포맷팅
// 4. DM 전송
// 비동기 처리 (실패해도 버전 업데이트는 정상 진행)
// 반환: 성공 여부 (boolean)
```

---

## API 설계

### RESTful API 구조

API는 RESTful 원칙을 따르며, 일관된 응답 형식을 사용합니다.

#### 응답 형식

**성공 응답:**

```json
{
  "success": true,
  "data": { ... },
  "message": "작업 성공 메시지" // 선택사항
}
```

**에러 응답:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": ["상세 메시지1", "상세 메시지2"] // 선택사항
  }
}
```

#### 엔드포인트 그룹화

**URL 관리 (`/api/urls`)**

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/urls` | 목록 조회 (필터링, 페이지네이션) |
| `POST` | `/api/urls` | URL 생성 |
| `GET` | `/api/urls/:id` | 상세 조회 |
| `PUT` | `/api/urls/:id` | 수정 |
| `DELETE` | `/api/urls/:id` | 삭제 |
| `PATCH` | `/api/urls/:id/activate` | 활성화/비활성화 |
| `POST` | `/api/urls/:id/fetch` | Swagger JSON 수동 가져오기 |

**버전 관리 (`/api/urls/:urlId/versions`)**

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/urls/:urlId/versions` | 버전 목록 |
| `GET` | `/api/urls/:urlId/versions/latest` | 최신 버전 |
| `GET` | `/api/urls/:urlId/versions/:versionId` | 버전 상세 |
| `GET` | `/api/urls/:urlId/versions/:versionId/diff` | 버전 비교 |
| `GET` | `/api/urls/:urlId/versions/:v1/compare/:v2` | 두 버전 비교 |

**전역 버전 (`/api/versions`)**

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/versions/latest` | 모든 URL의 최신 버전 |
| `GET` | `/api/versions/recent-changes` | 최근 변경사항 |

**Swagger 문서 (`/api/swagger.json`)**

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/swagger.json` | API Doc Manager 자체 API 문서 |

**헬스 체크 (`/api/health`)**

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/health` | 서버 상태 확인 |

#### 에러 처리 전략

**에러 코드:**

| 코드 | HTTP 상태 | 설명 |
|------|-----------|------|
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `DUPLICATE_ERROR` | 400 | 중복된 리소스 |
| `INVALID_ID` | 400 | 잘못된 ID 형식 |
| `RATE_LIMIT_EXCEEDED` | 429 | 요청 제한 초과 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 |

**에러 핸들러 (`src/middlewares/errorHandler.js`):**

- Mongoose Validation Error → `VALIDATION_ERROR`
- Mongoose CastError → `INVALID_ID`
- Mongoose Duplicate Key → `DUPLICATE_ERROR`
- Joi Validation Error → `VALIDATION_ERROR`
- Custom AppError → 커스텀 에러 코드
- 기타 → `SERVER_ERROR`

**AppError 클래스:**

```javascript
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}
```

---

## 보안 아키텍처

### 보안 미들웨어

#### Helmet

보안 헤더를 설정하여 일반적인 웹 취약점을 방지합니다.

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));
```

#### CORS

Cross-Origin Resource Sharing 정책을 설정합니다.

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
```

#### Rate Limiting

API 요청을 제한하여 DDoS 공격을 방지합니다.

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,                   // 최대 100회
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    },
  },
});
app.use('/api', apiLimiter);
```

### 데이터 검증

#### Joi

입력 데이터를 검증하여 잘못된 데이터가 데이터베이스에 저장되는 것을 방지합니다.

**예시 (`src/routes/urlRoutes.js`):**

```javascript
const createUrlSchema = Joi.object({
  name: Joi.string().required().max(100),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  group: Joi.string().required(),
  service: Joi.string().required(),
  description: Joi.string().max(500).allow('').optional(),
  owner: Joi.string().email().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
});
```

### 에러 처리 및 로깅

#### 에러 핸들링

- 모든 에러를 일관된 형식으로 처리
- 개발 환경: 상세 에러 메시지 및 스택 트레이스
- 프로덕션: 일반적인 에러 메시지만 반환

#### 로깅

- `morgan`: HTTP 요청 로깅
- `console.error`: 에러 로깅
- 환경 변수 `LOG_LEVEL`로 로그 레벨 제어

### Trust Proxy 설정

프록시 환경에서 IP 주소를 정확히 식별하기 위한 설정.

```javascript
const trustProxy = process.env.TRUST_PROXY === 'true' ? true :
                   process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY) : 1;
app.set('trust proxy', trustProxy);
```

---

## 프론트엔드 아키텍처

### 페이지 구조

#### 메인 페이지 (`views/index.html`)

**기능:**
- API URL 목록 표시 (카드 형식)
- 필터링 (그룹, 서비스, 검색)
- URL 추가/수정/삭제
- 활성화/비활성화 토글
- Swagger JSON 수동 가져오기

**주요 컴포넌트:**
- 필터 바 (그룹, 서비스, 검색)
- API 그리드 (카드 목록)
- 모달 (추가/수정)

#### 상세 페이지 (`views/api-detail.html`)

**기능:**
- Swagger UI로 API 문서 표시
- 버전 목록 및 변경사항 표시
- 버전 비교 링크

**주요 컴포넌트:**
- 사이드바 (API 정보, 버전 목록)
- Swagger UI 컨테이너

#### 버전 비교 페이지 (`views/version-compare.html`)

**기능:**
- 두 버전 간 변경사항 비교
- 변경사항 필터링 (심각도, 카테고리)
- 변경사항 시각화 (추가/삭제/수정)

**주요 컴포넌트:**
- 버전 선택 드롭다운
- 변경사항 목록
- 필터 바

#### Swagger UI 페이지 (`views/swagger-ui.html`)

**기능:**
- API Doc Manager 자체 API 문서 표시
- Swagger UI 5.x 사용

### 클라이언트 JavaScript 모듈

#### api-client.js

백엔드 API 호출을 위한 래퍼 클래스입니다.

**주요 메서드:**

```javascript
class ApiClient {
  async request(endpoint, options)      // 기본 HTTP 요청
  async getUrls(params)                // URL 목록 조회
  async getUrlById(id)                 // URL 상세 조회
  async createUrl(data)                // URL 생성
  async updateUrl(id, data)            // URL 수정
  async deleteUrl(id)                  // URL 삭제
  async toggleUrlActivation(id)        // 활성화/비활성화
  async fetchSwagger(id)               // Swagger JSON 가져오기
  async getVersions(urlId, params)     // 버전 목록 조회
  async getLatestVersion(urlId)        // 최신 버전 조회
  async getVersion(urlId, versionId)   // 버전 상세 조회
  async compareVersions(urlId, v1, v2) // 버전 비교
}
```

**에러 처리:**

```javascript
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
```

#### main.js

메인 페이지 로직을 담당합니다.

**주요 기능:**
- URL 목록 로딩 및 표시
- 필터링 및 검색
- 모달 관리 (추가/수정)
- URL CRUD 작업 처리
- 이벤트 리스너 설정

**상태 관리:**
- `urlsData`: URL 목록 데이터
- `currentFilter`: 현재 필터 상태
- `servicesByGroup`: 팀별 서비스 목록

#### version-compare.js

버전 비교 페이지 로직을 담당합니다.

**주요 기능:**
- 버전 목록 로딩
- 버전 선택 및 비교
- 변경사항 필터링 및 표시
- 변경사항 시각화

#### icon-utils.js

아이콘 유틸리티 함수를 제공합니다.

**주요 함수:**
- 상태별 아이콘 매핑
- SVG 아이콘 생성

### Swagger UI 통합

**CDN 사용:**
- Swagger UI CSS: `https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css`
- Swagger UI JS: `https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js`

**설정:**

```javascript
SwaggerUIBundle({
  url: "/api/swagger.json",
  dom_id: '#swagger-ui',
  deepLinking: true,
  presets: [
    SwaggerUIBundle.presets.apis,
    SwaggerUIStandalonePreset
  ],
  layout: "StandaloneLayout",
  validatorUrl: null,
  docExpansion: "list",
  filter: true,
});
```

---

## 확장성 및 성능

### 데이터베이스 최적화 전략

#### 인덱스 전략

**ApiUrl:**
- `url`: unique 인덱스 (중복 방지)
- `group`, `service`: 단일 인덱스 (필터링)
- `isActive`, `lastFetchStatus`: 단일 인덱스 (상태 필터링)
- `name, description`: text 인덱스 (검색)

**ApiVersion:**
- `urlId + versionNumber`: 복합 인덱스 (버전 정렬)
- `urlId + timestamp`: 복합 인덱스 (시간순 조회)
- `urlId + majorVersion`: 복합 인덱스 (메이저 버전 조회)

**AuditLog:**
- `timestamp`: -1 인덱스 (시간순 조회)
- `urlId + timestamp`: 복합 인덱스 (URL별 이력)
- `action + timestamp`: 복합 인덱스 (작업별 조회)
- TTL 인덱스: 90일 후 자동 삭제

#### Connection Pool 설정

```javascript
mongoose.connect(uri, {
  maxPoolSize: 50,        // 최대 연결 수
  minPoolSize: 10,        // 최소 연결 수
  serverSelectionTimeoutMS: 5000,  // 서버 선택 타임아웃
});
```

### 응답 압축

`compression` 미들웨어를 사용하여 응답을 gzip으로 압축합니다.

```javascript
app.use(compression());
```

### 요청 제한

Rate limiting을 통해 API 요청을 제한하여 서버 부하를 방지합니다.

- 15분당 100회 요청 제한
- IP 기반 제한

### 향후 개선 사항

#### 캐싱 전략 (미구현)

- **Redis 캐싱**: 자주 조회되는 데이터 캐싱
  - URL 목록 캐싱 (TTL: 5분)
  - 버전 목록 캐싱 (TTL: 1분)
  - 최신 버전 캐싱 (TTL: 30초)

- **Swagger JSON 캐싱**: 외부 Swagger URL 응답 캐싱 (TTL: 1시간)

#### 배치 처리

- 여러 URL의 Swagger JSON을 배치로 가져오기
- 스케줄러를 통한 자동 업데이트 (cron job)

#### 데이터베이스 샤딩

- 대규모 데이터 처리를 위한 MongoDB 샤딩
- URL ID 기반 샤딩 키

### 배포 아키텍처

**현재 구조:**
- 단일 서버 배포
- MongoDB 단일 인스턴스

**권장 구조 (프로덕션):**

```
┌─────────────────┐
│  Load Balancer  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│ Node  │ │ Node  │
│ App 1 │ │ App 2 │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
    ┌────▼────┐
    │ MongoDB │
    │ Replica │
    │   Set   │
    └─────────┘
```

---

## 데이터 흐름

### Swagger Fetch 플로우

```
POST /api/urls/:id/fetch
       │
       ▼
┌──────────────────────┐
│ urlRoutes            │
│ POST /:id/fetch      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ swaggerService       │
│ .parseAndSaveSwagger │
└──────────┬───────────┘
           │
           ├─→ 1. ApiUrl 조회 및 활성화 확인
           │
           ├─→ 2. fetchSwaggerJson
           │      └─→ axios GET ──→ Swagger URL
           │
           ├─→ 3. extractMajorVersion
           │      └─→ paths에서 버전 추출
           │
           ├─→ 4. 기존 버전 조회
           │      └─→ MongoDB Query ──→ ApiVersion
           │
           ├─→ 5. diffService.analyzeChanges
           │      └─→ 변경사항 분석
           │
           ├─→ 6. 버전 생성/업데이트
           │      ├─→ 신규: ApiVersion.create
           │      └─→ 기존: ApiVersion.findByIdAndUpdate
           │
           ├─→ 7. ApiUrl 상태 업데이트
           │      └─→ lastFetchedAt, lastFetchStatus
           │
           └─→ 8. 슬랙 알림 전송 (비동기)
                  └─→ slackService.sendChangeNotification
```

### 버전 비교 플로우

```
GET /api/urls/:urlId/versions/:v1/compare/:v2
       │
       ▼
┌──────────────────────┐
│ versionRoutes        │
│ .compareVersions     │
└──────────┬───────────┘
           │
           ├─→ 1. 두 버전 조회
           │      └─→ MongoDB Query ──→ ApiVersion
           │
           ├─→ 2. diffService.analyzeChanges
           │      └─→ 실시간 비교
           │
           └─→ 3. 결과 반환
                  ├─→ version1 정보
                  ├─→ version2 정보
                  ├─→ changes 배열
                  └─→ rawDiff (선택사항)
```

### URL 생성 플로우

```
POST /api/urls
       │
       ▼
┌──────────────────────┐
│ urlRoutes            │
│ POST /               │
└──────────┬───────────┘
           │
           ├─→ 1. Joi 검증
           │      └─→ createUrlSchema.validate
           │
           ├─→ 2. ApiUrl.create
           │      └─→ MongoDB Insert
           │
           └─→ 3. 응답 반환
                  └─→ 생성된 URL 정보
```

### 버전 목록 조회 플로우

```
GET /api/urls/:urlId/versions
       │
       ▼
┌──────────────────────┐
│ versionRoutes        │
│ GET /:urlId/versions │
└──────────┬───────────┘
           │
           ├─→ 1. ApiUrl 존재 확인
           │      └─→ MongoDB Query
           │
           ├─→ 2. ApiVersion.getVersionList
           │      └─→ 페이지네이션 적용
           │      └─→ swaggerJson 제외 (기본)
           │
           └─→ 3. 응답 반환
                  ├─→ apiUrl 정보
                  ├─→ versions 배열
                  └─→ meta (페이지네이션 정보)
```

---

## 개발 워크플로우

### 코드 구조 및 컨벤션

#### 디렉토리 구조

```
apidoc/
├── server.js              # 서버 진입점
├── package.json           # 의존성 및 스크립트
├── .env                   # 환경 변수
│
├── src/                   # 소스 코드
│   ├── app.js             # Express 앱 설정
│   ├── config/            # 설정 파일
│   ├── models/            # 데이터 모델
│   ├── routes/            # API 라우트
│   ├── services/          # 비즈니스 로직
│   └── middlewares/       # 미들웨어
│
├── views/                 # HTML 페이지
├── public/                # 정적 파일
│   ├── js/                # 클라이언트 JavaScript
│   └── css/               # 스타일시트
│
├── scripts/               # 유틸리티 스크립트
└── docs/                  # 문서
```

#### 네이밍 컨벤션

- **파일명**: camelCase (예: `apiClient.js`)
- **클래스명**: PascalCase (예: `ApiClient`)
- **함수명**: camelCase (예: `fetchSwaggerJson`)
- **상수명**: UPPER_SNAKE_CASE (예: `API_BASE`)
- **변수명**: camelCase (예: `urlsData`)

#### 코드 스타일

- **ESLint**: 코드 검사
- **Prettier**: 코드 포맷팅
- **JSDoc**: 함수 문서화

### 테스트 전략

**현재 상태:** 테스트 미구현

**권장 테스트 구조:**

```
tests/
├── unit/                  # 단위 테스트
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/           # 통합 테스트
│   ├── routes/
│   └── api/
└── e2e/                   # E2E 테스트
    └── pages/
```

**권장 테스트 도구:**
- **단위 테스트**: Jest, Mocha
- **통합 테스트**: Supertest
- **E2E 테스트**: Playwright, Puppeteer

### 배포 프로세스

#### 개발 환경

```bash
# 개발 서버 실행 (자동 재시작)
npm run dev

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정
```

#### 프로덕션 환경

```bash
# 프로덕션 서버 실행
npm start

# 환경 변수 설정
# NODE_ENV=production
# MONGODB_URI=...
# PORT=3000
```

#### 배포 체크리스트

- [ ] 환경 변수 설정 확인
- [ ] MongoDB 연결 확인
- [ ] 의존성 설치 (`npm install --production`)
- [ ] 서버 시작 테스트
- [ ] 헬스 체크 확인 (`/api/health`)
- [ ] 로그 확인

### Git 워크플로우

**브랜치 전략:**
- `main`: 배포용 브랜치 (안정 버전만)
- `develop`: 개발 통합 브랜치
- `feature/기능명`: 새 기능 개발 브랜치

**워크플로우:**
1. `develop` 브랜치에서 작업 시작
2. `feature/기능명` 브랜치 생성
3. 작업 후 Pull Request 생성 (`feature/기능명` → `develop`)
4. 코드 리뷰 후 머지
5. `develop`에서 테스트 후 `main`으로 머지

자세한 내용은 [Git 워크플로우 가이드](./git-workflow.md)를 참고하세요.

---

## 참고 자료

- [Express.js 문서](https://expressjs.com/)
- [Mongoose 문서](https://mongoosejs.com/)
- [OpenAPI 스펙](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Slack Web API](https://api.slack.com/web)

---

← [이전: API 명세](./api-reference.md) | [목차로 돌아가기](./README.md) | [다음: 핵심 기능](./features.md) →
