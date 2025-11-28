# 아키텍처

> 시스템 구조, 데이터 모델, 핵심 서비스 설명

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 (브라우저)                      │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐             │
│  │ index    │  │ api-detail   │  │ version-compare │             │
│  │  .html   │  │    .html     │  │     .html       │             │
│  └────┬─────┘  └──────┬───────┘  └────────┬────────┘             │
│       │               │                   │                      │
│       └───────────────┼───────────────────┘                      │
│                       │ api-client.js                            │
└───────────────────────┼──────────────────────────────────────────┘
                        │ HTTP (REST API)
┌───────────────────────┼──────────────────────────────────────────┐
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Express.js 서버                          │ │
│  │  ┌──────────┐  ┌────────────┐  ┌────────────────┐          │ │
│  │  │ server.js │→ │  app.js   │→ │   routes/      │          │ │
│  │  │ (진입점)  │  │ (Express) │  │ urlRoutes.js   │          │ │
│  │  └──────────┘  └────────────┘  │ versionRoutes  │          │ │
│  │                                └───────┬────────┘          │ │
│  │                                        │                    │ │
│  │  ┌─────────────────────────────────────┼────────────────┐  │ │
│  │  │                   services/         ▼                │  │ │
│  │  │  ┌─────────────────┐  ┌─────────────────┐           │  │ │
│  │  │  │ swaggerService  │  │   diffService   │           │  │ │
│  │  │  │ (버전 관리)      │  │  (변경 분석)     │           │  │ │
│  │  │  └────────┬────────┘  └────────┬────────┘           │  │ │
│  │  └───────────┼───────────────────┼─────────────────────┘  │ │
│  │              │                   │                         │ │
│  │              ▼                   ▼                         │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │                    models/                          │  │ │
│  │  │  ┌──────────┐  ┌────────────┐  ┌──────────┐        │  │ │
│  │  │  │ ApiUrl   │  │ ApiVersion │  │ AuditLog │        │  │ │
│  │  │  └────┬─────┘  └─────┬──────┘  └────┬─────┘        │  │ │
│  │  └───────┼──────────────┼──────────────┼──────────────┘  │ │
│  └──────────┼──────────────┼──────────────┼─────────────────┘ │
│             │              │              │                    │
└─────────────┼──────────────┼──────────────┼────────────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MongoDB                                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐                    │
│  │ apiurls  │  │ apiversions│  │ auditlogs│                    │
│  └──────────┘  └────────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
apidoc/
├── server.js              # 서버 진입점 (dotenv, DB 연결)
├── package.json           # 의존성 및 스크립트
├── .env                   # 환경 변수
│
├── src/
│   ├── app.js             # Express 앱 설정
│   │
│   ├── config/
│   │   └── database.js    # MongoDB 연결 설정
│   │
│   ├── models/
│   │   ├── ApiUrl.js      # URL 스키마
│   │   ├── ApiVersion.js  # 버전 스키마
│   │   └── AuditLog.js    # 감사 로그 스키마
│   │
│   ├── routes/
│   │   ├── urlRoutes.js   # /api/urls 라우트
│   │   └── versionRoutes.js # /api/urls/:id/versions 라우트
│   │
│   ├── services/
│   │   ├── swaggerService.js  # Swagger 처리 로직
│   │   └── diffService.js     # 변경사항 분석 로직
│   │
│   └── middlewares/
│       └── errorHandler.js    # 에러 핸들링
│
├── views/
│   ├── index.html         # 메인 페이지
│   ├── api-detail.html    # 상세 페이지
│   └── version-compare.html # 비교 페이지
│
├── public/
│   ├── js/
│   │   ├── api-client.js      # API 통신 래퍼
│   │   ├── main.js            # 메인 페이지 로직
│   │   ├── version-compare.js # 비교 페이지 로직
│   │   └── icon-utils.js      # 아이콘 유틸리티
│   │
│   └── css/
│       ├── style.css          # 메인 스타일
│       ├── swagger-custom.css # Swagger UI 커스텀
│       └── diff-view.css      # 비교 뷰 스타일
│
├── scripts/
│   └── seed-sample-version.js # 테스트 데이터 생성
│
└── docs/                  # 문서 (현재 위치)
```

---

## 데이터 모델

### ApiUrl (URL 메타데이터)

```javascript
{
  _id: ObjectId,           // MongoDB 자동 생성

  // 기본 정보
  name: String,            // 서비스명 (필수, max 100)
  url: String,             // Swagger URL (필수, unique, http/https)
  group: String,           // 그룹/카테고리
  description: String,     // 설명 (max 500)

  // 상태 정보
  isActive: Boolean,       // 활성화 여부 (기본: true)
  lastFetchedAt: Date,     // 마지막 fetch 시간
  lastFetchStatus: String, // 'pending' | 'success' | 'error'
  errorMessage: String,    // 에러 메시지 (실패 시)

  // 부가 정보
  owner: String,           // 담당자 이메일
  tags: [String],          // 태그 배열
  priority: String,        // 'low' | 'medium' | 'high'
  versionCount: Number,    // 버전 수

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
| `isActive` | 단일 | 상태 필터링 |
| `lastFetchStatus` | 단일 | 상태별 조회 |
| `name, description` | text | 텍스트 검색 |

---

### ApiVersion (버전 데이터)

```javascript
{
  _id: ObjectId,
  urlId: ObjectId,          // ApiUrl 참조 (필수)

  // 버전 식별
  versionId: String,        // 'v1', 'v2' 등
  versionNumber: Number,    // 순번 (정렬용)
  majorVersion: String,     // URL 기반 메이저 버전
  revisionCount: Number,    // 동일 메이저 버전 내 리비전 수

  // 시간 정보
  timestamp: Date,          // 최초 생성 시간
  lastUpdatedAt: Date,      // 마지막 업데이트 시간

  // Swagger 데이터
  swaggerJson: Mixed,       // 완전한 OpenAPI/Swagger JSON

  // 변경사항
  changes: [{
    type: String,           // 'added' | 'removed' | 'modified'
    category: String,       // 'endpoint' | 'parameter' | 'schema' ...
    path: String,           // 'GET /api/users'
    field: String,          // 변경된 필드명
    oldValue: Mixed,        // 이전 값
    newValue: Mixed,        // 새 값
    description: String,    // 변경 설명
    severity: String,       // 'low' | 'medium' | 'high'
    recordedAt: Date        // 기록 시간
  }],

  // 변경 이력
  changeHistory: [{
    updatedAt: Date,
    changesCount: Number,
    summary: String
  }],

  // 이전 버전 참조
  previousVersionId: ObjectId,

  // 통계
  endpointCount: Number,    // 엔드포인트 수
  parameterCount: Number,   // 파라미터 수
  summary: String           // 변경 요약
}
```

**Virtual 필드:**

```javascript
changeStats: {
  added: Number,
  removed: Number,
  modified: Number,
  total: Number,
  bySeverity: { high, medium, low },
  byCategory: { endpoint, parameter, ... }
}
```

**Static 메서드:**

| 메서드 | 설명 |
|--------|------|
| `getLatestVersion(urlId)` | 최신 버전 조회 |
| `getVersionList(urlId, options)` | 버전 목록 조회 (페이지네이션) |

**인덱스:**

| 필드 | 타입 | 용도 |
|------|------|------|
| `urlId + versionNumber` | 복합 | URL별 버전 정렬 |
| `urlId + timestamp` | 복합 | 시간순 조회 |
| `urlId + majorVersion` | 복합 | 메이저 버전 조회 |

---

### AuditLog (감사 로그)

```javascript
{
  _id: ObjectId,

  // 작업 정보
  action: String,           // 작업 종류
  urlId: ObjectId,          // 관련 URL
  versionId: ObjectId,      // 관련 버전
  user: String,             // 수행자 (기본: 'system')
  status: String,           // 'success' | 'error' | 'pending'

  // 상세 정보
  details: Mixed,           // 작업 상세 (JSON)
  errorMessage: String,     // 에러 메시지

  // 클라이언트 정보
  ipAddress: String,        // 클라이언트 IP
  userAgent: String,        // User Agent

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

**TTL 인덱스:** 90일 후 자동 삭제

---

## 핵심 서비스

### swaggerService.js

Swagger JSON 다운로드 및 버전 관리를 담당합니다.

#### 주요 함수

**`fetchSwaggerJson(url)`**

```javascript
// Swagger URL에서 JSON 다운로드
// - 타임아웃: 15초
// - OpenAPI/Swagger 유효성 검사
// 반환: swaggerJson 객체
```

**`extractMajorVersion(swaggerJson)`**

```javascript
// paths에서 메이저 버전 추출
// - 패턴: /v1/, /v2/ 등
// - 기본값: 'v1'
// 반환: 'v1', 'v2' 등
```

**`parseAndSaveSwagger(urlId)`**

```javascript
// 메인 처리 로직
// 1. fetchSwaggerJson으로 JSON 다운로드
// 2. extractMajorVersion으로 버전 추출
// 3. 기존 버전 조회
// 4. diffService.analyzeChanges로 변경사항 분석
// 5. 신규 버전 생성 또는 기존 버전 업데이트
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
// 반환: "5개 추가, 2개 삭제, 3개 수정"
```

---

### diffService.js

두 Swagger JSON의 변경사항을 분석합니다.

#### 비교 영역 (15개)

| 영역 | 설명 | 심각도 |
|------|------|--------|
| **Endpoints** | 경로 및 HTTP 메서드 | high |
| **Parameters** | 쿼리/경로/헤더 파라미터 | medium/low |
| **Request Body** | 요청 본문 | medium |
| **Responses** | HTTP 응답 코드 및 스키마 | low |
| **Schemas** | components.schemas | medium |
| **Security** | 보안 요구사항 | high |
| **Tags** | API 태그 | low |
| **Info** | 제목, 설명, 버전 | low |
| **Servers** | 서버 URL | medium |
| **Security Schemes** | 인증 방식 정의 | high |
| **Headers** | 커스텀 헤더 | low |
| **Examples** | 예제 정의 | low |
| **Links** | OpenAPI 링크 | low |
| **Callbacks** | 콜백 정의 | medium |
| **External Docs** | 외부 문서 링크 | low |

#### 주요 함수

**`analyzeChanges(oldJson, newJson)`**

```javascript
// 메인 비교 함수
// 1. 전역 설정 비교 (info, servers, security, tags)
// 2. paths (endpoints) 비교
// 3. components/definitions 비교
// 반환: changes 배열
```

**`compareEndpoints(oldPaths, newPaths)`**

```javascript
// 엔드포인트 상세 비교
// - 경로 추가/삭제/수정
// - 메서드별 파라미터 비교
// - requestBody 비교
// - responses 비교
```

**`determineParameterSeverity(param, type)`**

```javascript
// 파라미터 변경 심각도 결정
// - required=true: high
// - in='path': high
// - 기타: medium/low
```

#### Swagger 2.0 호환

| OpenAPI 3.0 | Swagger 2.0 |
|-------------|-------------|
| `components.schemas` | `definitions` |
| `components.securitySchemes` | `securityDefinitions` |
| `servers` | `basePath`, `host`, `schemes` |
| `requestBody` | `consumes` + body parameter |

---

## 데이터 흐름

### Swagger Fetch 플로우

```
POST /api/urls/:id/fetch
       │
       ▼
┌──────────────────────┐
│ swaggerService       │
│ .parseAndSaveSwagger │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 1. fetchSwaggerJson  │ ─── axios GET ──→ Swagger URL
│    (JSON 다운로드)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. extractMajorVersion│
│    (v1, v2 추출)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. 기존 버전 조회     │ ─── MongoDB Query ──→ ApiVersion
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. diffService       │
│    .analyzeChanges   │
│    (변경사항 분석)    │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌─────────┐
│ 신규    │ │ 기존    │
│ 버전    │ │ 버전    │
│ 생성    │ │ 업데이트│
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           │
           ▼
┌──────────────────────┐
│ ApiUrl 상태 업데이트  │
│ - lastFetchedAt      │
│ - lastFetchStatus    │
│ - versionCount       │
└──────────────────────┘
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
           ▼
┌──────────────────────┐
│ 1. 두 버전 조회       │ ─── MongoDB Query ──→ ApiVersion
│    (swaggerJson 포함) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. diffService       │
│    .analyzeChanges   │
│    (실시간 비교)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. 결과 반환         │
│    - version1 정보   │
│    - version2 정보   │
│    - changes 배열    │
│    - summary 통계    │
└──────────────────────┘
```

---

## 미들웨어

### errorHandler.js

**AppError 클래스:**

```javascript
class AppError extends Error {
  constructor(message, statusCode, errorCode, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}
```

**전역 에러 핸들러:**

```javascript
// 모든 라우트의 에러를 일관되게 처리
// - 개발 환경: 스택 트레이스 포함
// - 프로덕션: 에러 메시지만 반환
// - 응답 형식 통일
```

---

## Express 설정 (app.js)

```javascript
// CORS 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));

// Body 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅
app.use(morgan(process.env.LOG_LEVEL || 'dev'));

// 정적 파일
app.use(express.static('public'));

// 라우트 마운트
app.use('/api/urls', urlRoutes);
app.use('/api', versionRoutes);

// 에러 핸들링
app.use(errorHandler);
```

---

← [이전: API 명세](./api-reference.md) | [목차로 돌아가기](./README.md) | [다음: 핵심 기능](./features.md) →
