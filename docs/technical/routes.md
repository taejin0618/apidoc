# 라우트 구조 상세

> Express 라우터 구조 및 엔드포인트 상세 설명

## 목차

1. [라우트 구조 개요](#라우트-구조-개요)
2. [urlRoutes](#urlroutes)
3. [versionRoutes](#versionroutes)
4. [swaggerRoutes](#swaggerroutes)
5. [라우트 등록](#라우트-등록)

---

## 라우트 구조 개요

### Express 앱 설정 (`src/app.js`)

```javascript
// API 라우트
app.use('/api', require('./routes/swaggerRoutes'));
app.use('/api/urls', require('./routes/urlRoutes'));
app.use('/api/urls', require('./routes/versionRoutes'));
app.use('/api/versions', require('./routes/versionRoutes'));

// HTML 페이지 라우트
app.get('/', ...);
app.get('/api-detail', ...);
app.get('/version-compare', ...);
app.get('/api-docs', ...);
```

### 라우트 계층 구조

```
/api
├── /health                    [app.js 직접 처리]
├── /swagger.json             [swaggerRoutes]
├── /urls                     [urlRoutes]
│   ├── GET /                 목록 조회
│   ├── POST /                URL 생성
│   ├── GET /:id              상세 조회
│   ├── PUT /:id              수정
│   ├── DELETE /:id           삭제
│   ├── PATCH /:id/activate   활성화/비활성화
│   └── POST /:id/fetch       Swagger JSON 가져오기
├── /urls/:urlId/versions     [versionRoutes]
│   ├── GET /                 버전 목록
│   ├── GET /latest           최신 버전
│   ├── GET /:versionId       버전 상세
│   ├── GET /:versionId/diff  버전 비교
│   └── GET /:v1/compare/:v2  두 버전 비교
└── /versions                 [versionRoutes]
    ├── GET /latest           모든 URL의 최신 버전
    └── GET /recent-changes   최근 변경사항
```

---

## urlRoutes

URL 관리 API를 담당하는 라우터입니다.

**파일:** `src/routes/urlRoutes.js`

### Validation Schemas

#### createUrlSchema

URL 생성 시 사용하는 Joi 스키마입니다.

```javascript
{
  name: string (필수, 최대 100자)
  url: string (필수, HTTP/HTTPS URL)
  group: string (필수)
  service: string (필수)
  description: string (선택, 최대 500자)
  owner: string (선택, 이메일 형식, 빈 문자열 허용)
  tags: string[] (선택)
  priority: 'low' | 'medium' | 'high' (선택)
}
```

#### updateUrlSchema

URL 수정 시 사용하는 Joi 스키마입니다.

- 모든 필드 선택적
- 최소 1개 필드 필수 (`min(1)`)
- `isActive` 필드도 수정 가능

### 엔드포인트

#### GET /api/urls

모든 URL 목록을 조회합니다.

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `group` | string | ❌ | 그룹별 필터링 | - |
| `service` | string | ❌ | 서비스별 필터링 | - |
| `isActive` | boolean | ❌ | 활성화 상태 필터 | - |
| `search` | string | ❌ | 이름/설명 텍스트 검색 | - |
| `sort` | string | ❌ | 정렬 기준 (공백으로 구분, `-`로 내림차순) | `-updatedAt` |
| `page` | number | ❌ | 페이지 번호 | 1 |
| `limit` | number | ❌ | 페이지당 항목 수 | 50 |

**정렬 예시:**
- `sort=-updatedAt` → `updatedAt` 내림차순
- `sort=name -createdAt` → `name` 오름차순, `createdAt` 내림차순

**응답 형식:**
```javascript
{
  success: true,
  data: [ApiUrl],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    groups: string[],
    services: string[],
    servicesByGroup: { [group: string]: string[] }
  }
}
```

**구현 세부사항:**
- `group`, `service`: lowercase로 변환하여 필터링
- `search`: `name`과 `description`에서 정규식 검색 (case-insensitive)
- `servicesByGroup`: 팀별 서비스 목록을 별도 쿼리로 조회

---

#### GET /api/urls/:id

특정 URL의 상세 정보를 조회합니다.

**경로 파라미터:**
- `id` (String): ApiUrl의 MongoDB ObjectId

**응답 형식:**
```javascript
{
  success: true,
  data: ApiUrl
}
```

**에러:**
- `404 NOT_FOUND`: URL을 찾을 수 없음

---

#### POST /api/urls

새 API URL을 등록합니다.

**요청 본문:** `createUrlSchema` 형식

**응답 형식:**
```javascript
{
  success: true,
  data: ApiUrl,
  message: 'URL이 성공적으로 추가되었습니다'
}
```

**에러:**
- `400 VALIDATION_ERROR`: 입력값 검증 실패
- `400 DUPLICATE_ERROR`: 이미 존재하는 URL

**구현 세부사항:**
- Mongoose의 unique 인덱스로 URL 중복 방지
- `group`, `service`: lowercase로 자동 변환
- Pre-save hook으로 URL 끝의 `/` 자동 제거

---

#### PUT /api/urls/:id

API URL 정보를 수정합니다.

**경로 파라미터:**
- `id` (String): ApiUrl의 MongoDB ObjectId

**요청 본문:** `updateUrlSchema` 형식 (모든 필드 선택적)

**응답 형식:**
```javascript
{
  success: true,
  data: ApiUrl,
  message: 'URL이 성공적으로 수정되었습니다'
}
```

**에러:**
- `400 VALIDATION_ERROR`: 입력값 검증 실패
- `404 NOT_FOUND`: URL을 찾을 수 없음

**구현 세부사항:**
- `runValidators: true`로 수정 시에도 검증 실행
- `new: true`로 수정된 문서 반환

---

#### DELETE /api/urls/:id

API URL을 삭제합니다.

**경로 파라미터:**
- `id` (String): ApiUrl의 MongoDB ObjectId

**응답 형식:**
```javascript
{
  success: true,
  message: 'URL이 성공적으로 삭제되었습니다'
}
```

**에러:**
- `404 NOT_FOUND`: URL을 찾을 수 없음

**주의사항:**
- 현재는 연관된 버전 삭제 미구현 (주석 처리됨)
- 향후 `ApiVersion.deleteMany({ urlId })` 추가 예정

---

#### PATCH /api/urls/:id/activate

API URL의 활성화 상태를 토글합니다.

**경로 파라미터:**
- `id` (String): ApiUrl의 MongoDB ObjectId

**응답 형식:**
```javascript
{
  success: true,
  data: { isActive: boolean },
  message: 'URL이 활성화되었습니다' | 'URL이 비활성화되었습니다'
}
```

**에러:**
- `404 NOT_FOUND`: URL을 찾을 수 없음

**구현 세부사항:**
- `isActive` 값을 반전 (`!url.isActive`)
- `save()` 메서드로 저장 (pre-save hook 실행)

---

#### POST /api/urls/:id/fetch

Swagger JSON을 수동으로 가져와 버전을 생성/업데이트합니다.

**경로 파라미터:**
- `id` (String): ApiUrl의 MongoDB ObjectId

**응답 형식:**

**새 버전 생성:**
```javascript
{
  success: true,
  data: {
    created: true,
    updated: false,
    version: {
      _id: ObjectId,
      versionId: string,
      versionNumber: number,
      changesCount: number,
      summary: string
    }
  },
  message: '새 버전이 생성되었습니다'
}
```

**기존 버전 업데이트:**
```javascript
{
  success: true,
  data: {
    created: false,
    updated: true,
    version: {
      _id: ObjectId,
      versionId: string,
      revisionCount: number,
      changesCount: number,
      summary: string
    }
  },
  message: '변경사항이 없습니다'
}
```

**변경사항 없음:**
```javascript
{
  success: true,
  data: {
    created: false,
    updated: false,
    version: {
      versionId: string,
      revisionCount: number
    }
  },
  message: '변경사항이 없습니다'
}
```

**에러:**
- `404 NOT_FOUND`: URL을 찾을 수 없음
- `400`: 비활성화된 URL
- `500`: Swagger 다운로드 실패

**구현 세부사항:**
- `swaggerService.parseAndSaveSwagger()` 호출
- 에러 발생 시 ApiUrl 상태를 `'error'`로 업데이트

---

## versionRoutes

버전 관리 API를 담당하는 라우터입니다.

**파일:** `src/routes/versionRoutes.js`

### 엔드포인트

#### GET /api/urls/:urlId/versions

특정 URL의 버전 목록을 조회합니다.

**경로 파라미터:**
- `urlId` (String): ApiUrl의 MongoDB ObjectId

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `page` | number | ❌ | 페이지 번호 | 1 |
| `limit` | number | ❌ | 페이지당 항목 수 | 20 |

**응답 형식:**
```javascript
{
  success: true,
  data: {
    apiUrl: {
      _id: string,
      name: string,
      url: string,
      group: string
    },
    versions: [ApiVersion]  // swaggerJson 제외
  },
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

**구현 세부사항:**
- `ApiVersion.getVersionList()` static 메서드 사용
- 기본적으로 `swaggerJson` 필드 제외 (용량 절약)
- 버전 번호 내림차순 정렬

---

#### GET /api/urls/:urlId/versions/latest

최신 버전을 조회합니다 (swaggerJson 포함).

**경로 파라미터:**
- `urlId` (String): ApiUrl의 MongoDB ObjectId

**응답 형식:**
```javascript
{
  success: true,
  data: ApiVersion  // swaggerJson 포함
}
```

**에러:**
- `404 NOT_FOUND`: 버전을 찾을 수 없음

**구현 세부사항:**
- `ApiVersion.getLatestVersion()` static 메서드 사용
- `.lean()` 사용하여 Plain Object 반환

---

#### GET /api/urls/:urlId/versions/:versionId

특정 버전의 상세 정보를 조회합니다.

**경로 파라미터:**
- `urlId` (String): ApiUrl의 MongoDB ObjectId
- `versionId` (String): 버전 ID 문자열 (예: "v1", "v2")

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `includeSwagger` | string | ❌ | Swagger JSON 포함 여부 | `'true'` |

**응답 형식:**
```javascript
{
  success: true,
  data: ApiVersion  // includeSwagger에 따라 swaggerJson 포함/제외
}
```

**에러:**
- `404 NOT_FOUND`: 버전을 찾을 수 없음

**구현 세부사항:**
- `includeSwagger === 'true'`일 때만 `swaggerJson` 포함
- 프로젝션으로 필드 제어

---

#### GET /api/urls/:urlId/versions/:versionId/diff

특정 버전과 이전 버전(또는 지정 버전)을 비교합니다.

**경로 파라미터:**
- `urlId` (String): ApiUrl의 MongoDB ObjectId
- `versionId` (String): 비교 대상 버전 ID

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `compareWith` | string | ❌ | 비교할 버전 ID (미지정 시 이전 버전) |

**응답 형식:**

**최초 버전:**
```javascript
{
  success: true,
  data: {
    currentVersion: {
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      swaggerJson: object
    },
    previousVersion: null,
    changes: [],
    isFirstVersion: true
  }
}
```

**일반 버전:**
```javascript
{
  success: true,
  data: {
    currentVersion: {
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      swaggerJson: object
    },
    previousVersion: {
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      swaggerJson: object
    },
    changes: [Change],
    isFirstVersion: false
  }
}
```

**구현 세부사항:**
- `compareWith` 파라미터가 있으면 해당 버전과 비교
- 없으면 `previousVersionId`로 이전 버전 조회
- 저장된 `changes`가 없으면 실시간 비교 수행

---

#### GET /api/urls/:urlId/versions/:v1/compare/:v2

두 특정 버전을 비교합니다.

**경로 파라미터:**
- `urlId` (String): ApiUrl의 MongoDB ObjectId
- `v1` (String): 첫 번째 버전 ID
- `v2` (String): 두 번째 버전 ID

**응답 형식:**
```javascript
{
  success: true,
  data: {
    version1: {
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      swaggerJson: object
    },
    version2: {
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      swaggerJson: object
    },
    changes: [Change],
    rawDiff: string  // json-diff 라이브러리 원시 diff
  }
}
```

**에러:**
- `404 NOT_FOUND`: 버전을 찾을 수 없음

**구현 세부사항:**
- 두 버전을 병렬로 조회 (`Promise.all`)
- `diffService.analyzeChanges()`로 변경사항 분석
- `diffService.getRawDiff()`로 원시 diff 생성

---

#### GET /api/versions/latest

모든 URL의 최신 버전 목록을 조회합니다 (대시보드용).

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `limit` | number | ❌ | 조회할 개수 | 10 |

**응답 형식:**
```javascript
{
  success: true,
  data: [
    {
      _id: string,
      urlId: string,
      versionId: string,
      versionNumber: number,
      timestamp: Date,
      endpointCount: number,
      parameterCount: number,
      summary: string,
      apiUrl: {
        _id: string,
        name: string,
        url: string,
        group: string
      }
    }
  ]
}
```

**구현 세부사항:**
- MongoDB Aggregation Pipeline 사용
- URL별 최신 버전만 조회
- `swaggerJson` 필드 제외
- `$lookup`으로 ApiUrl 정보 포함

**Aggregation Pipeline:**
1. `$sort`: timestamp 내림차순
2. `$group`: urlId별로 그룹화, 첫 번째 버전 선택
3. `$replaceRoot`: latestVersion을 루트로
4. `$sort`: timestamp 내림차순
5. `$limit`: limit 개수만큼 제한
6. `$lookup`: ApiUrl 정보 조인
7. `$unwind`: apiUrl 배열 해제
8. `$project`: swaggerJson 제외

---

#### GET /api/versions/recent-changes

최근 변경사항을 조회합니다.

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `days` | number | ❌ | 조회 기간 (일) | 7 |
| `limit` | number | ❌ | 최대 개수 | 20 |

**응답 형식:**
```javascript
{
  success: true,
  data: [ApiVersion],  // swaggerJson 제외
  meta: {
    since: Date,
    count: number
  }
}
```

**구현 세부사항:**
- `timestamp >= (현재 - days)` 조건으로 필터링
- `changes.0` 존재 조건으로 변경사항이 있는 버전만 조회
- `swaggerJson` 필드 제외
- `populate('urlId')`로 ApiUrl 정보 포함

---

## swaggerRoutes

API Doc Manager 자체 API 문서를 제공하는 라우터입니다.

**파일:** `src/routes/swaggerRoutes.js`

### 엔드포인트

#### GET /api/swagger.json

API Doc Manager의 OpenAPI 3.0 스펙을 반환합니다.

**응답 형식:**
- Content-Type: `application/json`
- OpenAPI 3.0 형식의 JSON 객체

**구현 세부사항:**
- `generateSwaggerSpec()` 함수로 스펙 동적 생성
- `BASE_URL` 환경 변수로 서버 URL 설정
- 모든 엔드포인트, 스키마, 응답 형식 포함

**스펙 구조:**
- `openapi: '3.0.0'`
- `info`: API 정보
- `servers`: 서버 URL 목록
- `tags`: 태그 정의
- `paths`: 모든 엔드포인트 정의
- `components`: 스키마 및 응답 정의

---

## 라우트 등록

### Express 앱 설정 (`src/app.js`)

```javascript
// Swagger 문서 라우트 (먼저 등록)
app.use('/api', require('./routes/swaggerRoutes'));

// URL 관리 라우트
app.use('/api/urls', require('./routes/urlRoutes'));

// 버전 관리 라우트 (URL 하위 경로)
app.use('/api/urls', require('./routes/versionRoutes'));

// 전역 버전 라우트 (대시보드용)
app.use('/api/versions', require('./routes/versionRoutes'));
```

### 라우트 우선순위

Express는 라우트를 등록 순서대로 매칭하므로, 더 구체적인 경로를 먼저 등록해야 합니다.

**올바른 순서:**
1. `/api/urls/:id/fetch` (구체적)
2. `/api/urls/:id` (일반적)
3. `/api/urls` (가장 일반적)

**잘못된 순서 예시:**
```javascript
// ❌ 잘못된 순서
app.use('/api/urls', urlRoutes);  // /api/urls/:id가 먼저 매칭됨
app.use('/api/urls', versionRoutes);  // 도달 불가능
```

---

## 미들웨어

### validateRequest(schema)

Joi 스키마로 요청 본문을 검증하는 미들웨어입니다.

**사용 예:**
```javascript
router.post('/', validateRequest(createUrlSchema), async (req, res, next) => {
  // req.validatedBody에 검증된 데이터 포함
});
```

**에러 응답:**
```javascript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: '입력값 검증 실패',
    details: ['서비스명은 필수입니다', 'URL은 필수입니다']
  }
}
```

---

## 에러 처리

모든 라우트는 `next(error)`로 에러를 전달하며, 전역 에러 핸들러(`errorHandler`)가 처리합니다.

**에러 처리 흐름:**
```
라우트 핸들러
  ├─→ try { ... }
  ├─→ catch (error) { next(error) }
  └─→ errorHandler (src/middlewares/errorHandler.js)
       ├─→ Mongoose ValidationError → 400 VALIDATION_ERROR
       ├─→ Mongoose CastError → 400 INVALID_ID
       ├─→ Mongoose Duplicate Key → 400 DUPLICATE_ERROR
       ├─→ AppError → 커스텀 에러 코드
       └─→ 기타 → 500 SERVER_ERROR
```

---

## 성능 최적화

### Lean 쿼리

조회 전용 쿼리는 `.lean()` 사용:

```javascript
const url = await ApiUrl.findById(id).lean();
```

### 프로젝션

필요한 필드만 조회:

```javascript
const version = await ApiVersion.findOne(
  { urlId, versionId },
  { swaggerJson: 0 }  // swaggerJson 제외
).lean();
```

### 병렬 쿼리

독립적인 쿼리는 `Promise.all`로 병렬 실행:

```javascript
const [version1, version2] = await Promise.all([
  ApiVersion.findOne({ urlId, versionId: v1 }).lean(),
  ApiVersion.findOne({ urlId, versionId: v2 }).lean()
]);
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

← [이전: 서비스 레이어](./services.md) | [목차로 돌아가기](../README.md) | [다음: 미들웨어](./middlewares.md) →
