# API 문서 버전 관리 시스템 (API Doc Version Manager)

## 상세 PRD - Express.js + MongoDB 기반

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정보

```
프로젝트명:   API 문서 버전 관리 시스템 (API Doc Version Manager)
약칭:         ADM (API Doc Manager)
목표:         Hunet의 여러 API 서비스 Swagger 문서 중앙 집중식 관리
개발자:       Taejin Kim (QA Unit Leader)
개발 기간:    약 3개월 (주 20시간 투자 기준)
배포 환경:    사내 로컬 서버 (Windows/Mac/Linux)
사용자:       약 20명 이상 (Hunet 팀원)
```

### 1.2 기술 스택 (확정)

```
백엔드 프레임워크:    Express.js 4.18.x
런타임:              Node.js 18.x LTS
데이터베이스:        MongoDB (로컬 설치)
프론트엔드:          HTML5 / CSS3 / Vanilla JavaScript (ES6+)
배포 포트:           3000
배포 주소:           http://[사내서버IP]:3000
```

### 1.3 프로젝트 배경

```
현황:
- Hunet 관리 API가 20개 이상 분산 존재
- 각 API의 Swagger 문서가 별도로 관리됨
- API 변경사항을 추적하기 어려움
- 팀원들이 어느 API가 언제 변경되었는지 파악 어려움
- QA 관점에서 변경사항에 대한 체계적 관리 필요

해결 방안:
- 모든 Swagger 문서를 중앙에서 관리
- 자동으로 변경사항 감지 및 기록
- 버전별 비교 기능 제공
- 팀원 협업 기능 (댓글) 제공
```

---

## 2. 기술 스택 상세

### 2.1 백엔드 구성

#### 2.1.1 Node.js + Express.js

```javascript
// 선택 이유
✓ JavaScript 단일 언어 (프론트엔드와 통일)
✓ 초보자가 배우기 가장 쉬움
✓ 온라인 튜토리얼 & 커뮤니티 풍부
✓ 당신의 요구사항 (CRUD, JSON 처리)에 완벽
✓ 미들웨어 개념이 직관적
✓ 디버깅이 용이

버전:
- Node.js: 18.x LTS (LTS 버전으로 안정성)
- Express: 4.18.x 이상
```

#### 2.1.2 핵심 라이브러리

```javascript
{
  "dependencies": {
    // 웹 프레임워크
    "express": "^4.18.2",

    // MongoDB 연결
    "mongoose": "^7.0.0",

    // HTTP 요청 (Swagger URL에서 JSON 다운로드)
    "axios": "^1.3.0",

    // JSON 비교 (변경사항 감지)
    "json-diff": "^0.7.0",  // 또는 "deep-diff": "^1.0.2"

    // 정기적 작업 스케줄링 (선택사항)
    "node-cron": "^3.0.2",

    // CORS 처리 (프론트엔드 통신)
    "cors": "^2.8.5",

    // 환경 변수 관리
    "dotenv": "^16.0.3",

    // 로깅
    "morgan": "^1.10.0",

    // 데이터 검증
    "joi": "^17.9.0"  // API 요청 데이터 검증
  },

  "devDependencies": {
    // 자동 재시작
    "nodemon": "^2.0.20",

    // 코드 포맷팅
    "prettier": "^2.8.4",

    // 린터
    "eslint": "^8.36.0"
  }
}
```

---

### 2.2 데이터베이스 구성

#### 2.2.1 MongoDB 선택 이유

```
MongoDB 선택 이유:
1. JSON 저장에 최적화
   - Swagger JSON을 그대로 저장 가능
   - 정규화 없음 (빠른 개발)

2. 유연한 스키마
   - 필드 추가/제거 쉬움
   - Swagger 버전에 따른 구조 변화 대응 용이

3. 초보자 친화적
   - CRUD 개념이 직관적
   - Mongoose ORM이 쉬움

4. 로컬 배포 용이
   - 사내 서버에 설치 간단
   - 관리 부담 적음

5. 확장성
   - 나중에 PostgreSQL로 마이그레이션 가능
   - 클라우드 (MongoDB Atlas) 전환 용이
```

#### 2.2.2 MongoDB 설치 방식 (2가지 옵션)

**옵션 A: 로컬 설치 (권장, 정식 운영)**

```
설치 대상:    사내 서버 PC
용도:         프로덕션 환경
용량:         초기 500MB, 운영 중 1-5GB
유지보수:     수동 백업 필요
보안:         최고 (외부 인터넷 불필요)

설치 방법:
1. mongodb.com에서 Community Server 다운로드
2. 사내 서버 PC에 설치
3. mongod 서비스 자동 시작 설정
4. Express 앱에서 localhost:27017로 연결
```

**옵션 B: MongoDB Atlas (클라우드, 선택사항)**

```
설치 대상:    MongoDB의 클라우드 서비스
용도:         개발/테스트 환경
용량:         프리 티어 512MB
유지보수:     자동 백업
보안:         네트워크 설정 필요

사용 시나리오:
- 초기 개발 단계에서 빠른 셋업 필요할 때
- 로컬 MongoDB 설치 전 테스트할 때
- 최종적으로는 로컬로 마이그레이션

주의:
- 회사 보안 정책 확인 필요
- 외부 인터넷 의존
```

**최종 권장:**

```
개발 초기 (1주):     MongoDB Atlas (빠른 개발)
개발 진행 (2주):     로컬 MongoDB 전환
정식 운영 (이후):    로컬 MongoDB 유지
```

#### 2.2.3 MongoDB 컬렉션 설계

**컬렉션 1: api_urls (Swagger URL 관리)**

```javascript
{
  _id: ObjectId,
  name: "결제 시스템 API",              // 서비스명
  url: "https://saturn.lm.qa.hunet.io/v3/api-docs/grp1",
  group: "payment",                     // 카테고리
  description: "KCP 결제 게이트웨이 통합 API",
  isActive: true,                       // 활성화 여부
  lastFetchedAt: ISODate,              // 마지막 크롤링 시간
  lastFetchStatus: "success",           // 마지막 크롤링 결과
  errorMessage: null,                   // 에러 메시지
  createdAt: ISODate,
  updatedAt: ISODate,

  // 메타데이터
  owner: "payment-team@hunet.com",     // 담당 팀
  tags: ["payment", "critical"],        // 태그
  priority: "high"                      // 우선순위
}
```

**컬렉션 2: api_versions (버전 히스토리)**

```javascript
{
  _id: ObjectId,
  urlId: ObjectId,                      // api_urls 참조
  versionId: "v5",                      // 버전 번호
  versionNumber: 5,                     // 정렬용 숫자
  timestamp: ISODate("2025-01-20T14:30:00Z"),

  // 원본 Swagger JSON 저장 (완전한 버전 보존)
  swaggerJson: {
    "openapi": "3.0.0",
    "info": {
      "title": "결제 API",
      "version": "1.0.0",
      "description": "..."
    },
    "servers": [...],
    "paths": {
      "/payments/orders": {
        "post": { ... },
        "get": { ... }
      }
    },
    "components": { ... }
  },

  // 변경사항 분석 (자동 생성)
  changes: [
    {
      _id: ObjectId,
      type: "added",                    // added, removed, modified
      category: "endpoint",             // endpoint, parameter, response, etc
      path: "POST /payments/orders",    // endpoint 경로
      field: "paymentMethod",           // 변경된 필드 (parameter/response인 경우)
      oldValue: null,
      newValue: "string",
      description: "새로운 결제 수단 선택 파라미터 추가",
      severity: "medium"                // low, medium, high
    },
    {
      type: "modified",
      category: "parameter",
      path: "POST /payments/orders",
      field: "amount",
      oldValue: {
        type: "integer",
        description: "결제액 (원)"
      },
      newValue: {
        type: "integer",
        description: "결제액 (원, 최소 100원)",
        minimum: 100
      },
      description: "amount 파라미터에 최소값 제약 추가",
      severity: "low"
    }
  ],

  // 비교용 메타데이터
  previousVersionId: ObjectId,          // 이전 버전 참조
  endpointCount: 15,                    // 이 버전의 endpoint 개수
  parameterCount: 42,                   // 파라미터 개수

  // 요약
  summary: "paymentMethod 파라미터 추가 및 amount 검증 추가",

  createdAt: ISODate
}
```

**컬렉션 3: comments (팀 피드백/댓글)**

```javascript
{
  _id: ObjectId,
  versionId: ObjectId,                  // api_versions 참조
  author: "taejin.kim@hunet.com",      // 작성자 이메일
  authorName: "김태진",
  authorRole: "QA",                     // 역할
  content: "이 변경이 기존 결제 로직과 호환되나요?",
  createdAt: ISODate("2025-01-20T15:30:00Z"),
  updatedAt: ISODate,
  isResolved: false,                    // 해결 여부

  // 댓글 스레드
  replies: [
    {
      _id: ObjectId,
      author: "developer@hunet.com",
      authorName: "개발자",
      content: "네, 하위호환성을 유지합니다.",
      createdAt: ISODate,
      updatedAt: ISODate,
      likes: 2                           // 공감 수
    }
  ],

  // 메타데이터
  mentions: ["developer@hunet.com"],     // @mention된 사람
  labels: ["important", "question"],     // 라벨
  attachments: [                         // 첨부파일 (선택)
    {
      url: "https://...",
      name: "test_result.pdf"
    }
  ]
}
```

**컬렉션 4: audit_logs (감시/추적용)**

```javascript
{
  _id: ObjectId,
  action: "fetch_swagger",              // 작업 종류
  urlId: ObjectId,
  versionId: ObjectId,
  user: "system",                       // 또는 사용자 이메일
  timestamp: ISODate,
  status: "success",                    // success, error
  details: {
    statusCode: 200,
    responseTime: 1234,                 // ms
    size: 524288                        // 바이트
  },
  errorMessage: null
}
```

#### 2.2.4 MongoDB 인덱싱 전략

```javascript
// api_urls 인덱싱
db.api_urls.createIndex({ group: 1 }); // 그룹 필터
db.api_urls.createIndex({ isActive: 1 }); // 활성화 필터
db.api_urls.createIndex({ url: 1 }, { unique: true }); // URL 중복 방지

// api_versions 인덱싱
db.api_versions.createIndex({ urlId: 1, versionNumber: -1 }); // 버전 조회
db.api_versions.createIndex({ timestamp: -1 }); // 최신순 정렬

// comments 인덱싱
db.comments.createIndex({ versionId: 1 }); // 버전별 댓글
db.comments.createIndex({ author: 1 }); // 작성자별 댓글

// audit_logs 인덱싱
db.audit_logs.createIndex({ timestamp: -1 }); // 최신순
db.audit_logs.createIndex({ action: 1 }); // 액션별 필터
```

---

### 2.3 프론트엔드 구성

#### 2.3.1 기술 스택

```html
<!-- HTML5 -->
구조: 시맨틱 HTML5 (header, nav, main, footer) 폼: form, input, select, textarea
표준 요소

<!-- CSS3 -->
방식: 바닐라 CSS (외부 라이브러리 최소화) 방법론: BEM (Block Element Modifier)
레이아웃: CSS Grid + Flexbox 반응형: Media Query (모바일 대응)

<!-- JavaScript (Vanilla ES6+) -->
DOM 조작: querySelector, addEventListener 비동기: async/await, fetch API 상태
관리: localStorage (간단한 UI 상태만)
```

#### 2.3.2 외부 라이브러리

```html
<!-- Swagger UI (API 문서 표시) -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css"
/>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.bundle.js"></script>

<!-- Highlight.js (JSON 문법 강조) -->
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css"
/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>

<!-- Axios (HTTP 요청) -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<!-- Diff view (버전 비교 표시, 선택사항) -->
<script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/html2pdf.min.js"></script>
```

#### 2.3.3 페이지 구조

```
/
├── public/
│   ├── css/
│   │   ├── style.css              (전체 스타일)
│   │   ├── swagger-custom.css     (Swagger UI 커스터마이즈)
│   │   └── diff-view.css          (비교 뷰 스타일)
│   └── js/
│       ├── main.js                (메인 로직)
│       ├── api-client.js           (백엔드 API 호출)
│       ├── version-compare.js      (버전 비교 로직)
│       └── comments.js             (댓글 기능)
│
├── views/
│   ├── index.html                 (메인 페이지)
│   ├── api-detail.html            (API 상세 페이지)
│   ├── version-compare.html       (버전 비교 페이지)
│   └── admin.html                 (관리 페이지)
│
└── (Express 서버에서 제공)
```

---

## 3. 백엔드 API 설계

### 3.1 API 엔드포인트 (RESTful)

#### 3.1.1 Swagger URL 관리 API

```
GET    /api/urls                    # 모든 URL 목록 조회
GET    /api/urls/:id                # 특정 URL 상세 조회
POST   /api/urls                    # 새 URL 추가
PUT    /api/urls/:id                # URL 정보 수정
DELETE /api/urls/:id                # URL 삭제
PATCH  /api/urls/:id/activate       # URL 활성화/비활성화
POST   /api/urls/:id/fetch          # 수동으로 Swagger JSON 가져오기
```

#### 3.1.2 버전 관리 API

```
GET    /api/urls/:id/versions           # 특정 URL의 모든 버전 목록
GET    /api/urls/:id/versions/:versionId  # 특정 버전 상세 조회
GET    /api/urls/:id/versions/:versionId/diff  # 이전 버전과 비교
GET    /api/versions/latest/:count      # 최신 N개 버전 (모든 URL)
```

#### 3.1.3 댓글 API

```
GET    /api/versions/:versionId/comments     # 댓글 목록
POST   /api/versions/:versionId/comments     # 댓글 작성
PUT    /api/versions/:versionId/comments/:commentId  # 댓글 수정
DELETE /api/versions/:versionId/comments/:commentId  # 댓글 삭제
POST   /api/versions/:versionId/comments/:commentId/replies  # 답글 작성
```

#### 3.1.4 검색/필터 API

```
GET    /api/search?q=:keyword        # endpoint 검색
GET    /api/urls?group=:group        # 그룹별 필터
GET    /api/versions?from=:date&to=:date  # 날짜 범위 필터
```

### 3.2 API 응답 형식

#### 성공 응답 (200)

```json
{
  "success": true,
  "data": {
    // 실제 데이터
  },
  "meta": {
    "timestamp": "2025-01-20T15:30:00Z",
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "SWAGGER_FETCH_FAILED",
    "message": "Swagger JSON을 가져올 수 없습니다",
    "details": "Connection timeout after 5s"
  }
}
```

---

## 4. 기능 요구사항 (Express + MongoDB 기반)

### 4.1 핵심 기능 (P0)

#### 4.1.1 Swagger URL 관리

```
기능:
- 20개 이상 URL 등록/관리
- URL별 메타데이터 저장 (이름, 그룹, 설명, 담당자)
- URL 활성화/비활성화
- 마지막 크롤링 상태 추적

구현 방식:
- Express 라우터: /api/urls
- MongoDB 컬렉션: api_urls
- 유효성 검사: Joi 사용
- 에러 처리: try-catch + 에러 미들웨어
```

#### 4.1.2 Swagger JSON 자동 파싱

```
기능:
- HTTP GET 요청으로 Swagger JSON 다운로드
- JSON 유효성 검사 (OpenAPI 3.0 스펙 확인)
- 파싱 성공/실패 상태 기록
- 에러 상황 로깅

구현 방식:
- axios: URL에서 JSON 다운로드
- JSON.parse(): JSON 유효성 검사
- 타임스탬프 자동 기록
- 에러 메시지 저장 (재시도 가능)

코드 예시:
async function fetchSwaggerJson(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const json = response.data;

    // OpenAPI 유효성 검사
    if (!json.openapi && !json.swagger) {
      throw new Error("Invalid OpenAPI/Swagger format");
    }

    return json;
  } catch (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
}
```

#### 4.1.3 버전 관리

```
기능:
- 각 파싱 시마다 새 버전 생성
- 원본 JSON을 그대로 저장
- 버전ID 자동 생성 (v1, v2, v3...)
- 타임스탐프 자동 기록

구현 방식:
- MongoDB: api_versions 컬렉션
- versionNumber 필드로 정렬
- 이전 버전ID 참조
- 전체 JSON을 저장 (검색/비교용)

데이터 구조:
{
  urlId: ObjectId,
  versionId: "v5",
  versionNumber: 5,
  timestamp: ISODate,
  swaggerJson: { ... },  // 원본 전체 저장
  changes: [ ... ],      // 변경사항 분석
  previousVersionId: ObjectId
}
```

#### 4.1.4 변경사항 자동 감지

```
기능:
- 새 버전과 이전 버전 JSON 자동 비교
- 변경 유형 분류: 추가/삭제/수정
- 변경 범위 분류: endpoint/parameter/response
- 심각도 판단: low/medium/high

구현 방식:
- json-diff 라이브러리: JSON 비교
- 커스텀 로직: 변경사항 분류 및 분석
- 휴리스틱: 심각도 자동 판단

코드 예시:
const diff = require('json-diff');
const differences = diff(previousJson, currentJson);

// 변경사항 분류
const changes = analyzeChanges(differences);
// [
//   { type: 'added', category: 'endpoint', path: '...', ... },
//   { type: 'modified', category: 'parameter', path: '...', ... }
// ]
```

#### 4.1.5 문서 표시 (Swagger UI)

```
기능:
- Swagger UI 라이브러리 통합
- 모든 endpoint 자동 표시
- 요청/응답 예시 표시
- 파라미터 정보 표시

구현 방식:
- 프론트엔드: Swagger UI 라이브러리
- JSON 소스: MongoDB에서 조회한 swaggerJson
- 동적 로드: JavaScript로 런타임에 로드

코드 예시 (프론트엔드):
const ui = SwaggerUIBundle({
  url: `/api/urls/${urlId}/versions/latest`,
  dom_id: '#swagger-ui',
  presets: [
    SwaggerUIBundle.presets.apis,
    SwaggerUIBundle.SwaggerUIStandalonePreset
  ]
});
```

### 4.2 비교 기능 (P0)

#### 4.2.1 버전 비교

```
기능:
- 이전 버전 vs 현재 버전 나란히 표시
- 변경된 부분 색상 강조
  - 추가: 녹색 (green)
  - 삭제: 빨강 (red)
  - 수정: 노랑 (yellow)
- 정확한 차이점 표시 (이전값 vs 현재값)

구현 방식:
- 백엔드: 두 버전 JSON 모두 조회
- 프론트엔드: 사이드바이 사이드 비교 뷰
- CSS: 색상 강조
- 선택사항: Diff 라이브러리 (diff2html 등)

응답 형식:
{
  success: true,
  data: {
    version1: { ... },  // 이전 버전 JSON
    version2: { ... },  // 현재 버전 JSON
    changes: [
      {
        type: "added",
        category: "endpoint",
        path: "POST /orders",
        ...
      }
    ]
  }
}
```

#### 4.2.2 변경사항 상세 분석

```
기능:
- 각 변경사항별 상세 설명
- 이전값과 새 값 정확히 표시
- 변경 원인 추측 (자동)
- 영향도 판단

구현 방식:
- api_versions.changes 배열에서 조회
- 각 항목별 상세 정보 포함
- 심각도 표시 (low/medium/high)

데이터 예시:
changes: [
  {
    type: "added",
    category: "endpoint",
    path: "POST /payments/orders",
    description: "결제 주문 생성 API 추가",
    severity: "high"
  },
  {
    type: "modified",
    category: "parameter",
    path: "POST /payments/orders",
    field: "amount",
    oldValue: { type: "integer" },
    newValue: { type: "integer", minimum: 100 },
    description: "amount 파라미터에 최소값 제약",
    severity: "low"
  }
]
```

### 4.3 협업 기능 (P1)

#### 4.3.1 댓글/피드백

```
기능:
- 각 버전별 댓글 작성
- 스레드식 답글
- 댓글 수정/삭제
- 댓글 해결 표시

구현 방식:
- MongoDB: comments 컬렉션
- Express API: POST /api/versions/:versionId/comments
- 프론트엔드: 동적 UI로 댓글 로드

권한:
- 모든 팀원: 읽기 + 작성
- 본인: 수정/삭제
```

### 4.4 부가 기능 (P1)

#### 4.4.1 검색

```
기능:
- endpoint 경로 검색 (예: /users)
- 메서드 필터 (GET, POST, PUT 등)
- 설명으로 검색

구현 방식:
- MongoDB 텍스트 인덱싱
- 정규식 매칭 (case-insensitive)

엔드포인트:
GET /api/search?q=users&method=POST
```

#### 4.4.2 필터링

```
기능:
- 그룹별 필터 (payment, member, etc)
- 날짜 범위 필터
- 변경사항 유형 필터 (added, removed, modified)

구현 방식:
- MongoDB 쿼리
- 쿼리 스트링 파라미터

엔드포인트:
GET /api/urls?group=payment
GET /api/versions?from=2025-01-15&to=2025-01-20
```

---

## 5. 개발 로드맵 (Express + MongoDB 기반)

### 5.1 개발 단계

#### Phase 1: 환경 구축 (1주)

```
목표: 개발 환경 완성

Task:
□ Node.js 18.x 설치
□ MongoDB 설치 (Atlas 또는 로컬)
□ Express 프로젝트 초기화
□ 기본 라우팅 구축
□ MongoDB 연결 확인
□ 첫 번째 컬렉션 생성 (api_urls)

체크포인트:
- npm start → localhost:3000에서 "Hello World" 표시
- MongoDB에 api_urls 컬렉션 생성 확인
```

#### Phase 2: URL 관리 및 파싱 (2주)

```
목표: Swagger JSON 자동 파싱 완성

Task:
□ api_urls 컬렉션 모델링 (Mongoose)
□ URL CRUD API 개발
  - GET /api/urls
  - POST /api/urls
  - PUT /api/urls/:id
  - DELETE /api/urls/:id
□ Swagger JSON 파싱 로직 개발
  - axios로 URL에서 JSON 다운로드
  - JSON 유효성 검사
  - 에러 처리
□ 파싱 결과 저장
□ 상태 추적 (success/error/timeout)
□ 테스트 (Postman으로 API 테스트)

체크포인트:
- 테스트 URL로 Swagger JSON 성공적으로 파싱
- MongoDB에 저장 확인
- 에러 처리 검증
```

#### Phase 3: 버전 관리 (2주)

```
목표: 변경사항 감지 및 버전 관리 완성

Task:
□ api_versions 컬렉션 모델링
□ JSON diff 로직 개발
  - json-diff 라이브러리 사용
  - 변경사항 분류 (added/removed/modified)
  - 심각도 판단 로직
□ 변경사항 저장 로직
□ 버전 비교 API 개발
  - GET /api/urls/:id/versions
  - GET /api/urls/:id/versions/:versionId/diff
□ 테스트

체크포인트:
- 2개 버전 업로드 후 변경사항 정확히 감지
- MongoDB에서 변경사항 조회 가능
- API 응답 정확
```

#### Phase 4: 프론트엔드 메인 페이지 (2주)

```
목표: API 목록 및 문서 표시 UI

Task:
□ 메인 레이아웃 HTML (header, nav, main, footer)
□ CSS 기본 스타일 (BEM 방법론)
□ API 목록 화면
  - 그룹별 분류 표시
  - 각 API의 메타데이터 표시
  - 클릭 시 상세 페이지로 이동
□ API 상세 페이지
  - Swagger UI 통합
  - 현재 버전 문서 표시
  - 버전 목록 표시
□ API 호출 (JavaScript)
  - axios로 백엔드에서 데이터 조회
  - 동적 UI 업데이트

체크포인트:
- localhost:3000에서 메인 페이지 로드
- API 목록 표시
- 특정 API 클릭 → 문서 표시
```

#### Phase 5: 버전 비교 UI (1.5주)

```
목표: 버전 비교 페이지 완성

Task:
□ 버전 선택 UI (드롭다운)
□ 사이드바이사이드 비교 뷰
□ 변경사항 색상 강조
  - 추가: 녹색
  - 삭제: 빨강
  - 수정: 노랑
□ 변경사항 상세 리스트
□ JSON diff 시각화 (선택사항)

체크포인트:
- 2개 버전 비교 뷰 작동
- 변경사항 정확히 강조
- 성능 테스트 (큰 JSON도 빠름)
```

#### Phase 6: 댓글 기능 (1.5주)

```
목표: 팀 협업 기능 구현

Task:
□ comments 컬렉션 모델링
□ 댓글 CRUD API
  - GET /api/versions/:versionId/comments
  - POST /api/versions/:versionId/comments
  - PUT /api/comments/:id
  - DELETE /api/comments/:id
□ 댓글 UI
  - 댓글 목록 표시
  - 댓글 작성 폼
  - 실시간 업데이트 (선택사항)
□ 사용자 인증 (간단한 방식)

체크포인트:
- 댓글 작성/조회/삭제 작동
- 사용자 정보 표시
- 스레드식 답글 작동
```

#### Phase 7: 추가 기능 (1주)

```
목표: 검색, 필터, 최적화

Task:
□ 검색 기능
  - endpoint 검색 API
  - 프론트엔드 검색 UI
□ 필터링
  - 그룹별 필터
  - 날짜 필터
□ 성능 최적화
  - 페이지네이션 (대용량 데이터)
  - 캐싱 (Swagger UI)
  - 인덱싱 최적화
□ 응답 속도 테스트

체크포인트:
- 검색 기능 정상 작동
- 필터 기능 정상 작동
- 응답 시간 < 2초
```

#### Phase 8: 테스트 및 배포 (1주)

```
목표: 사내 서버 배포 및 팀원 테스트

Task:
□ 기능 테스트
  - 모든 API 테스트 (Postman)
  - 모든 UI 테스트 (수동)
  - 엣지 케이스 테스트
□ 성능 테스트
  - 부하 테스트 (20명 동시접속)
  - 데이터베이스 성능
□ 사내 서버 준비
  - MongoDB 설치 및 설정
  - Express 앱 배포
  - 환경 변수 설정
□ 팀원 온보딩
  - 사용 설명서 작성
  - 데모 세션
  - 피드백 수집

체크포인트:
- 사내 서버에서 정상 작동
- 팀원 20명 접속 가능
- 주요 버그 없음
```

### 5.2 마일스톤 및 일정

```
Week 1 (1/25 ~ 1/31)      | Phase 1: 환경 구축
Week 2-3 (2/1 ~ 2/14)     | Phase 2: URL 관리 및 파싱
Week 4-5 (2/15 ~ 2/28)    | Phase 3: 버전 관리
Week 6-7 (3/1 ~ 3/14)     | Phase 4: 프론트엔드 메인
Week 8 (3/15 ~ 3/21)      | Phase 5: 버전 비교 UI
Week 9 (3/22 ~ 3/28)      | Phase 6: 댓글 기능
Week 10 (3/29 ~ 4/4)      | Phase 7: 추가 기능
Week 11 (4/5 ~ 4/11)      | Phase 8: 테스트 및 배포

MVP (최소 기능): Phase 1-5 완료 (8주)
베타 버전: Phase 1-6 완료 (9주)
정식 운영: Phase 1-8 완료 (11주)
```

---

## 6. 데이터 흐름 (Express + MongoDB)

### 6.1 초기 Swagger JSON 저장 흐름

```
사용자가 URL 추가 (POST /api/urls)
    ↓
Express 라우터 받음
    ↓
MongoDB에 api_urls 저장
    ↓
사용자가 "지금 확인" 버튼 클릭
    ↓
Express: axios로 Swagger URL에서 JSON 다운로드
    ↓
JSON 유효성 검사
    ↓
이전 버전 있는지 확인
    ↓
새 버전 생성 (v1)
    ↓
swaggerJson을 그대로 MongoDB api_versions에 저장
    ↓
변경사항 분석 (이전 버전 없으므로 빔)
    ↓
프론트엔드에 응답
    ↓
사용자에게 "저장 완료" 표시
```

### 6.2 변경사항 감지 흐름

```
사용자가 같은 URL의 "지금 확인" 다시 클릭
    ↓
Express: 최신 Swagger JSON 다운로드
    ↓
현재 버전(v2)로 새 버전 생성 예정
    ↓
이전 버전(v1)의 swaggerJson과 비교
    ↓
json-diff 라이브러리로 차이점 분석
    ↓
변경사항 분류 (추가/삭제/수정)
    ↓
심각도 판단
    ↓
changes 배열 생성
    ↓
v2 정보 저장:
{
  versionId: "v2",
  timestamp: now,
  swaggerJson: { 새 JSON },
  changes: [
    { type: "added", category: "endpoint", ... },
    ...
  ]
}
    ↓
MongoDB에 저장
    ↓
변경 없으면? → "변경사항 없음" 응답
```

### 6.3 버전 비교 조회 흐름

```
사용자가 "v1 vs v2 비교" 클릭
    ↓
프론트엔드: GET /api/urls/:id/versions/v1/diff
    ↓
Express 라우터:
  1. v1 JSON 조회
  2. v2 JSON 조회
    ↓
차이점 계산 (MongoDB에 저장된 changes 배열 조회)
    ↓
응답:
{
  version1: { 전체 JSON },
  version2: { 전체 JSON },
  changes: [ ]
}
    ↓
프론트엔드: 사이드바이사이드 뷰로 표시
    ↓
변경된 부분 색상 강조
```

---

## 7. 에러 처리 전략 (Express + MongoDB)

### 7.1 HTTP 요청 에러

```javascript
// Swagger JSON 다운로드 실패
async function fetchSwaggerJson(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10초 타임아웃
      validateStatus: (status) => status < 500,
    });

    if (response.status === 404) {
      throw new Error("URL not found (404)");
    }

    return response.data;
  } catch (error) {
    // 에러 기록
    await logError("SWAGGER_FETCH_FAILED", url, error.message);

    // 상태 업데이트
    await ApiUrl.findByIdAndUpdate(urlId, {
      lastFetchStatus: "error",
      errorMessage: error.message,
    });

    throw error;
  }
}
```

### 7.2 MongoDB 에러

```javascript
// 데이터 저장 실패
try {
  const version = await ApiVersion.create({
    urlId: urlId,
    versionId: versionId,
    swaggerJson: swaggerJson,
    changes: changes,
  });
} catch (error) {
  if (error.code === 11000) {
    // 중복 키 에러
    res.status(400).json({
      success: false,
      error: { code: "DUPLICATE_VERSION" },
    });
  } else {
    // 기타 에러
    res.status(500).json({
      success: false,
      error: { code: "DB_ERROR" },
    });
  }
}
```

### 7.3 유효성 검사 에러

```javascript
// Joi로 요청 데이터 검증
const schema = Joi.object({
  name: Joi.string().required(),
  url: Joi.string().uri().required(),
  group: Joi.string().required(),
});

try {
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.details[0].message,
      },
    });
    return;
  }
} catch (error) {
  res.status(500).json({ success: false });
}
```

---

## 8. 성능 고려사항

### 8.1 데이터베이스 최적화

```javascript
// 인덱싱
db.api_urls.createIndex({ url: 1 }, { unique: true });
db.api_versions.createIndex({ urlId: 1, versionNumber: -1 });
db.comments.createIndex({ versionId: 1, createdAt: -1 });

// 페이지네이션 (대용량 데이터)
app.get("/api/versions/:urlId", async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;

  const versions = await ApiVersion.find({ urlId: urlId })
    .sort({ versionNumber: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
});

// 프로젝션 (필요한 필드만)
const versions = await ApiVersion.find(
  { urlId: urlId },
  { swaggerJson: 0 } // swaggerJson 제외
);
```

### 8.2 캐싱 전략

```javascript
// 자주 조회되는 데이터 캐싱
const cache = new Map();

app.get('/api/urls/:id/versions/latest', (req, res) => {
  const cacheKey = `versions-${req.params.id}`;

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  // DB 조회
  const data = await ApiVersion.findOne(...);

  // 5분 캐싱
  cache.set(cacheKey, data);
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);

  res.json(data);
});
```

### 8.3 응답 시간 목표

```
API 요청:           < 500ms (대부분)
페이지 로드:        < 2초
Swagger UI 렌더링:   < 3초 (첫 로드)
버전 비교:          < 1초
댓글 로드:          < 500ms
```

---

## 9. 보안 고려사항

### 9.1 데이터 검증

```javascript
// 입력값 검증 (Joi)
const urlSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .max(2048),
}).unknown(false);

// URL 형식 검증
if (!url.startsWith("http")) {
  throw new Error("Invalid URL");
}
```

### 9.2 속도 제한

```javascript
// Rate limiting (과도한 요청 방지)
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
});

app.use("/api/", limiter);
```

### 9.3 CORS 설정

```javascript
// 같은 네트워크 내에서만 접근
const cors = require("cors");

app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.*"],
    credentials: true,
  })
);
```

---

## 10. 모니터링 & 로깅

### 10.1 요청 로깅

```javascript
const morgan = require("morgan");

// 모든 요청 로깅
app.use(morgan("combined"));

// 커스텀 로깅
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

### 10.2 에러 로깅

```javascript
// 에러 추적
const logError = async (code, details, message) => {
  await AuditLog.create({
    action: "error",
    code: code,
    details: details,
    message: message,
    timestamp: new Date(),
  });
};
```

### 10.3 성능 모니터링

```javascript
// 응답 시간 측정
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });

  next();
});
```

---

## 11. 배포 체크리스트

### 사내 서버 준비

```
□ Node.js 18.x 설치
□ MongoDB 설치 (로컬)
  □ 서비스 자동 시작 설정
  □ 데이터 디렉토리 설정
  □ 백업 정책 수립
□ Express 앱 배포
  □ 환경 변수 파일 (.env) 생성
  □ 보안 설정 (포트, 방화벽)
  □ PM2 또는 systemd로 자동 실행 설정
□ 네트워크 설정
  □ 로컬 IP 고정
  □ 포트 포워딩 (필요시)
□ 테스트
  □ 팀원들이 접속 가능한지 확인
  □ 모든 기능 테스트
```

### 환경 변수 (.env)

```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/api-doc-manager
LOG_LEVEL=info
CORS_ORIGIN=http://192.168.1.100:3000
```

---

## 12. 향후 확장 (로드맵)

### Phase 2 (운영 안정화 후, 2025년 3월~)

```
1. 자동 파싱 스케줄
   - 매일 특정 시간에 자동 파싱
   - node-cron 사용

2. 알림 기능
   - 이메일 알림
   - 슬랙 연동

3. 고급 필터링
   - 복잡한 쿼리 지원
   - 저장된 필터 (즐겨찾기)

4. API 분석
   - 변경 트렌드
   - 사용 현황

5. 문서 내보내기
   - Markdown/PDF 생성
   - 팀 위키 연동
```

---

## 13. 성공 기준

### 기술적 성공 기준

```
✓ 20개 이상 Swagger URL 안정적 관리
✓ JSON 파싱 성공률 99% 이상
✓ 변경사항 감지 정확도 99% 이상
✓ API 응답 시간 < 500ms
✓ 데이터베이스 쿼리 < 100ms
✓ 동시접속자 20명 이상 안정적 운영
✓ 월간 99.5% 가용성
```

### 사용자 관점

```
✓ 팀원 80% 이상이 월 2회 이상 사용
✓ API 변경사항 파악 시간 50% 단축
✓ 변경사항 관련 버그 감소
✓ 팀 간 협업 효율성 향상
✓ 사용자 만족도 4/5 이상
```

---

## 14. 문제 해결 가이드

### 자주 발생하는 문제

#### 문제 1: Swagger URL에서 JSON을 못 가져옴

```
원인 분석:
- URL이 잘못됨
- 방화벽 차단
- 타임아웃
- CORS 에러

해결 방법:
1. URL이 브라우저에서 직접 접속 가능한지 확인
2. curl로 테스트: curl https://...
3. 타임아웃 값 증가 (axios timeout)
4. 프록시 설정 (회사 인트라넷이면 필요)

코드:
const response = await axios.get(url, {
  timeout: 15000,  // 15초로 증가
  httpAgent: new HttpAgent({ keepAlive: true })
});
```

#### 문제 2: MongoDB 연결 실패

```
원인 분석:
- MongoDB 서비스 안 켜짐
- 포트 다름
- 인증 오류

해결 방법:
1. MongoDB 서비스 상태 확인
   - Windows: services.msc에서 MongoDB 확인
   - Mac/Linux: mongod 프로세스 확인
2. 포트 확인: netstat -an | grep 27017
3. 연결 테스트: mongosh

코드:
try {
  await mongoose.connect('mongodb://localhost:27017/api-doc-manager');
  console.log('MongoDB connected');
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
}
```

#### 문제 3: 메모리 부족

```
원인 분석:
- 너무 큰 Swagger JSON
- 캐싱된 데이터 누적
- 인덱스 생성 중

해결 방법:
1. Node.js 메모리 제한 증가
   node --max-old-space-size=2048 app.js

2. MongoDB 메모리 설정 변경
   mongod --setParameter wiredTigerEngineRuntimeConfig="{internalQueryExecMaxBlockingSortBytes: 33554432}"

3. 불필요한 캐시 제거
```

---

## 15. 참고 자료

### 공식 문서

```
Express.js:  https://expressjs.com
MongoDB:     https://docs.mongodb.com
Mongoose:    https://mongoosejs.com
Swagger UI:  https://swagger.io/tools/swagger-ui
OpenAPI 3.0: https://spec.openapis.org/oas/v3.0.3
```

### 튜토리얼

```
Express 기초:        https://youtu.be/... (생활코딩)
MongoDB 기초:        https://www.mongodb.com/docs/manual/
Mongoose 가이드:     https://mongoosejs.com/docs/guide.html
RESTful API 설계:    https://restfulapi.net/
```

### 라이브러리 문서

```
axios:       https://axios-http.com/docs/intro
json-diff:   https://github.com/andreyvit/json-diff
node-cron:   https://github.com/node-cron/node-cron
Highlight:   https://highlightjs.org/
```

---

## 16. 최종 체크리스트

```
개발 전:
□ Node.js 18.x 설치 및 확인
□ MongoDB 설치 완료
□ Git 저장소 생성
□ 폴더 구조 생성

개발 중:
□ 각 Phase별 테스트 완료
□ 코드 리뷰 (혼자 하는 경우 자가 검토)
□ 문서화 (README, API 문서)
□ 에러 처리 적용

배포 전:
□ 모든 기능 테스트
□ 성능 테스트
□ 보안 검토
□ 사내 서버 준비

배포 후:
□ 팀원 온보딩
□ 피드백 수집
□ 버그 추적
□ 성능 모니터링
```

---

**문서 작성일** : 2025-01-25

**버전** : 2.0 (Express.js + MongoDB 기반)

**작성자** : Taejin Kim (QA Unit Leader)

**최종 검토** : 예정
