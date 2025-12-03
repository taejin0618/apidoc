# 데이터 모델 상세

> MongoDB 스키마 및 데이터 모델 상세 설명

## 목차

1. [ApiUrl 모델](#apiurl-모델)
2. [ApiVersion 모델](#apiversion-모델)
3. [AuditLog 모델](#auditlog-모델)
4. [데이터 관계](#데이터-관계)
5. [인덱스 전략](#인덱스-전략)

---

## ApiUrl 모델

API 서비스의 Swagger URL 메타데이터를 저장하는 모델입니다.

### 스키마 정의

```javascript
{
  // 기본 정보
  name: String,              // 서비스명 (필수, 최대 100자)
  url: String,              // Swagger URL (필수, unique, HTTP/HTTPS)
  group: String,            // 그룹/팀 (필수, lowercase)
  service: String,          // 서비스명 (필수, lowercase)
  description: String,      // 설명 (최대 500자)

  // 상태 정보
  isActive: Boolean,        // 활성화 여부 (기본: true)
  lastFetchedAt: Date,      // 마지막 fetch 시간
  lastFetchStatus: String,  // 'pending' | 'success' | 'error'
  errorMessage: String,     // 에러 메시지 (실패 시)

  // 부가 정보
  owner: String,            // 담당자 이메일 (슬랙 알림용)
  tags: [String],           // 태그 배열
  priority: String,         // 'low' | 'medium' | 'high' (기본: 'medium')
  versionCount: Number,      // 버전 수 (기본: 0)

  // 타임스탬프 (자동 생성)
  createdAt: Date,
  updatedAt: Date
}
```

### 필드 상세

#### name
- **타입**: `String`
- **필수**: ✅
- **제약**: 최대 100자
- **설명**: API 서비스의 이름 (예: "User Service API")

#### url
- **타입**: `String`
- **필수**: ✅
- **제약**:
  - Unique 인덱스
  - HTTP/HTTPS URL 형식 검증
  - 저장 전 끝의 `/` 자동 제거
- **설명**: Swagger/OpenAPI JSON 파일의 URL

#### group
- **타입**: `String`
- **필수**: ✅
- **제약**: lowercase로 자동 변환
- **설명**: 팀 또는 그룹 분류 (예: "backend", "frontend", "mobile")

#### service
- **타입**: `String`
- **필수**: ✅
- **제약**: lowercase로 자동 변환
- **설명**: 서비스명 (예: "user-service", "auth-service")

#### lastFetchStatus
- **타입**: `String`
- **Enum**: `['pending', 'success', 'error']`
- **기본값**: `'pending'`
- **설명**: 마지막 Swagger JSON 가져오기 결과

### Virtual 필드

#### versions
- **타입**: `Virtual`
- **설명**: ApiVersion 참조 (populate 사용)
- **사용 예**:
```javascript
const url = await ApiUrl.findById(id).populate('versions');
// url.versions 배열에 버전 목록 포함
```

### Pre-save Hook

URL 끝의 `/` 자동 제거:

```javascript
apiUrlSchema.pre('save', function (next) {
  if (this.url && this.url.endsWith('/')) {
    this.url = this.url.slice(0, -1);
  }
  next();
});
```

### 인덱스

| 필드 | 타입 | 용도 |
|------|------|------|
| `url` | unique | URL 중복 방지 |
| `group` | 단일 | 그룹별 조회 |
| `service` | 단일 | 서비스별 조회 |
| `isActive` | 단일 | 상태 필터링 |
| `lastFetchStatus` | 단일 | 상태별 조회 |
| `name, description` | text | 텍스트 검색 |

---

## ApiVersion 모델

Swagger JSON의 버전별 스냅샷을 저장하는 모델입니다.

### 스키마 정의

```javascript
{
  // 참조
  urlId: ObjectId,          // ApiUrl 참조 (필수)

  // 버전 식별
  versionId: String,        // 'v1', 'v2' 등 (메이저 버전)
  versionNumber: Number,    // 순번 (정렬용, 1부터 시작)
  majorVersion: String,    // URL 기반 메이저 버전 (예: 'v1')
  revisionCount: Number,    // 동일 메이저 버전 내 리비전 수 (기본: 1)

  // 시간 정보
  timestamp: Date,          // 최초 생성 시간
  lastUpdatedAt: Date,      // 마지막 업데이트 시간

  // Swagger 데이터
  swaggerJson: Mixed,       // 완전한 OpenAPI/Swagger JSON

  // 변경사항
  changes: [Change],        // 변경사항 배열

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
  parameterCount: Number,   // 파라미터 수
  summary: String           // 변경 요약 (예: "5개 추가, 2개 삭제")

  // 타임스탬프 (자동 생성)
  createdAt: Date
}
```

### Change 스키마

변경사항을 나타내는 내장 스키마입니다.

```javascript
{
  type: String,             // 'added' | 'removed' | 'modified' | 'path_version_changed'
  category: String,         // 'endpoint' | 'parameter' | 'schema' | 'info' | ...
  path: String,             // 'GET /api/users' 또는 경로
  field: String,            // 변경된 필드명 (nullable)
  oldValue: Mixed,          // 이전 값 (nullable)
  newValue: Mixed,          // 새 값 (nullable)
  description: String,      // 변경 설명
  severity: String,         // 'low' | 'medium' | 'high'
  recordedAt: Date,         // 기록 시간
  metadata: Mixed           // 추가 메타데이터 (경로 버전 변경 등)
}
```

### Change Type

| Type | 설명 | 예시 |
|------|------|------|
| `added` | 새로 추가된 항목 | 새 엔드포인트 추가 |
| `removed` | 삭제된 항목 | 엔드포인트 삭제 |
| `modified` | 변경된 항목 | 파라미터 타입 변경 |
| `path_version_changed` | 경로 버전 변경 | `/v1/users` → `/v2/users` |

### Change Category

| Category | 설명 | 심각도 |
|----------|------|--------|
| `endpoint` | 엔드포인트 추가/삭제/수정 | high |
| `parameter` | 파라미터 변경 | medium/low |
| `requestBody` | 요청 본문 변경 | medium |
| `response` | 응답 변경 | low |
| `schema` | 스키마 변경 | medium |
| `info` | Info 섹션 변경 | low |
| `server` | 서버 URL 변경 | medium |
| `security` | 보안 요구사항 변경 | high |
| `tag` | 태그 변경 | low |
| `securityScheme` | 보안 스키마 변경 | high |
| `header` | 헤더 변경 | low |
| `example` | 예제 변경 | low |
| `link` | 링크 변경 | low |
| `callback` | 콜백 변경 | medium |
| `externalDocs` | 외부 문서 변경 | low |

### 버전 관리 전략

#### 메이저 버전 (majorVersion)
- **추출 방법**: Swagger JSON의 `paths`에서 `/v1/`, `/v2/` 패턴 추출
- **기본값**: `'v1'` (패턴이 없을 경우)
- **용도**: 동일 API의 여러 버전 구분

#### 리비전 (revisionCount)
- **증가 조건**: 동일 메이저 버전에서 변경사항 발생 시
- **초기값**: `1`
- **용도**: 동일 메이저 버전 내 변경 이력 추적

#### 버전 번호 (versionNumber)
- **증가 조건**: 새 메이저 버전 발견 시
- **초기값**: `1`
- **용도**: 전체 버전 순번 (정렬용)

### Virtual 필드

#### apiUrl
- **타입**: `Virtual`
- **설명**: ApiUrl 참조
- **사용 예**:
```javascript
const version = await ApiVersion.findById(id).populate('apiUrl');
// version.apiUrl에 ApiUrl 정보 포함
```

#### changeStats
- **타입**: `Virtual` (Getter)
- **설명**: 변경사항 통계
- **반환 형식**:
```javascript
{
  added: Number,                    // 추가된 항목 수
  removed: Number,                  // 삭제된 항목 수
  modified: Number,                 // 수정된 항목 수
  path_version_changed: Number,     // 경로 버전 변경 수
  total: Number,                    // 전체 변경사항 수
  bySeverity: {
    high: Number,
    medium: Number,
    low: Number
  },
  byCategory: {
    endpoint: Number,
    parameter: Number,
    // ...
  }
}
```

### Static 메서드

#### getLatestVersion(urlId)
- **설명**: URL의 최신 버전 조회 (swaggerJson 포함)
- **반환**: `Promise<ApiVersion | null>`
- **사용 예**:
```javascript
const latest = await ApiVersion.getLatestVersion(urlId);
```

#### getVersionList(urlId, options)
- **설명**: URL의 버전 목록 조회 (페이지네이션 지원)
- **파라미터**:
  - `urlId`: ApiUrl ID
  - `options`:
    - `page`: 페이지 번호 (기본: 1)
    - `limit`: 페이지당 항목 수 (기본: 20)
    - `includeSwagger`: Swagger JSON 포함 여부 (기본: false)
- **반환**: `Promise<{ versions, total, page, limit, totalPages }>`
- **사용 예**:
```javascript
const result = await ApiVersion.getVersionList(urlId, {
  page: 1,
  limit: 20,
  includeSwagger: false
});
```

### 인덱스

| 필드 | 타입 | 용도 |
|------|------|------|
| `urlId + versionNumber` | 복합 | URL별 버전 정렬 |
| `urlId + timestamp` | 복합 | 시간순 조회 |
| `urlId + majorVersion` | 복합 | 메이저 버전 조회 |
| `timestamp` | 단일 | 시간순 조회 |

---

## AuditLog 모델

시스템 작업 이력을 기록하는 모델입니다.

### 스키마 정의

```javascript
{
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

  // 타임스탬프 (자동 생성)
  timestamp: Date
}
```

### Action 종류

| Action | 설명 |
|--------|------|
| `fetch_swagger` | Swagger JSON 가져오기 |
| `create_url` | URL 등록 |
| `update_url` | URL 수정 |
| `delete_url` | URL 삭제 |
| `activate_url` | 활성화/비활성화 |
| `create_version` | 버전 생성 |
| `error` | 오류 발생 |

### Static 메서드

#### log(data)
- **설명**: 로그 생성 헬퍼
- **파라미터**: `{ action, urlId?, versionId?, user?, status?, details?, errorMessage?, ipAddress?, userAgent? }`
- **반환**: `Promise<AuditLog | null>`
- **사용 예**:
```javascript
await AuditLog.log({
  action: 'fetch_swagger',
  urlId: urlId,
  status: 'success',
  details: { endpointCount: 15 }
});
```

### 인덱스

| 필드 | 타입 | 용도 |
|------|------|------|
| `timestamp` | 단일 (-1) | 시간순 조회 |
| `urlId + timestamp` | 복합 | URL별 이력 조회 |
| `action + timestamp` | 복합 | 작업별 조회 |
| `timestamp` | TTL | 90일 후 자동 삭제 |

### TTL 인덱스

90일 후 자동 삭제:

```javascript
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

---

## 데이터 관계

```
ApiUrl (1) ──────< (N) ApiVersion
   │                      │
   │                      │
   └──────────< (N) AuditLog
```

### 관계 설명

- **ApiUrl ↔ ApiVersion**: 1:N 관계
  - 하나의 ApiUrl은 여러 ApiVersion을 가질 수 있음
  - ApiVersion은 하나의 ApiUrl에 속함
  - 참조: `ApiVersion.urlId` → `ApiUrl._id`

- **ApiUrl ↔ AuditLog**: 1:N 관계
  - 하나의 ApiUrl은 여러 AuditLog를 가질 수 있음
  - AuditLog는 ApiUrl을 참조할 수 있음 (nullable)
  - 참조: `AuditLog.urlId` → `ApiUrl._id`

- **ApiVersion ↔ AuditLog**: 1:N 관계
  - 하나의 ApiVersion은 여러 AuditLog를 가질 수 있음
  - AuditLog는 ApiVersion을 참조할 수 있음 (nullable)
  - 참조: `AuditLog.versionId` → `ApiVersion._id`

- **ApiVersion ↔ ApiVersion**: 자기 참조
  - 이전 버전 참조: `ApiVersion.previousVersionId` → `ApiVersion._id`

---

## 인덱스 전략

### ApiUrl 인덱스

```javascript
// 단일 인덱스
apiUrlSchema.index({ group: 1 });
apiUrlSchema.index({ service: 1 });
apiUrlSchema.index({ isActive: 1 });
apiUrlSchema.index({ lastFetchStatus: 1 });

// Unique 인덱스
apiUrlSchema.index({ url: 1 }, { unique: true });

// 텍스트 검색 인덱스
apiUrlSchema.index({ name: 'text', description: 'text' });
```

### ApiVersion 인덱스

```javascript
// 복합 인덱스
apiVersionSchema.index({ urlId: 1, versionNumber: -1 });
apiVersionSchema.index({ urlId: 1, timestamp: -1 });
apiVersionSchema.index({ urlId: 1, majorVersion: 1 });
```

### AuditLog 인덱스

```javascript
// 단일 인덱스
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// 복합 인덱스
auditLogSchema.index({ urlId: 1, timestamp: -1 });

// TTL 인덱스 (90일 후 자동 삭제)
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

### 인덱스 사용 예시

#### 그룹별 조회
```javascript
// group 인덱스 사용
const urls = await ApiUrl.find({ group: 'backend' });
```

#### 버전 목록 조회 (정렬)
```javascript
// urlId + versionNumber 복합 인덱스 사용
const versions = await ApiVersion.find({ urlId })
  .sort({ versionNumber: -1 });
```

#### 텍스트 검색
```javascript
// text 인덱스 사용
const urls = await ApiUrl.find({
  $text: { $search: 'user' }
});
```

---

## 데이터 검증

### Mongoose Validation

#### ApiUrl
- `name`: 필수, 최대 100자
- `url`: 필수, HTTP/HTTPS URL 형식 검증
- `group`: 필수
- `service`: 필수
- `description`: 최대 500자
- `priority`: enum ['low', 'medium', 'high']

#### ApiVersion
- `urlId`: 필수, ObjectId 형식
- `versionId`: 필수
- `versionNumber`: 필수, 숫자
- `swaggerJson`: 필수

#### Change
- `type`: enum ['added', 'removed', 'modified', 'path_version_changed']
- `category`: enum (16개 카테고리)
- `severity`: enum ['low', 'medium', 'high']

### Pre-save Hook

#### ApiUrl
- URL 끝의 `/` 자동 제거

---

## 성능 최적화

### Lean 쿼리

조회 전용 쿼리는 `.lean()` 사용:

```javascript
// Mongoose Document 반환 (느림)
const url = await ApiUrl.findById(id);

// Plain Object 반환 (빠름)
const url = await ApiUrl.findById(id).lean();
```

### 프로젝션

필요한 필드만 조회:

```javascript
// swaggerJson 제외 (용량 절약)
const versions = await ApiVersion.find(
  { urlId },
  { swaggerJson: 0 }
).lean();
```

### 페이지네이션

대량 데이터 조회 시 페이지네이션 사용:

```javascript
const skip = (page - 1) * limit;
const versions = await ApiVersion.find({ urlId })
  .sort({ versionNumber: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
```

---

---

← [이전: 아키텍처](../architecture.md) | [목차로 돌아가기](../README.md) | [다음: 서비스 레이어](./services.md) →
