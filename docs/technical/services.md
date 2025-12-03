# 서비스 레이어 상세

> 비즈니스 로직을 담당하는 서비스 모듈 상세 설명

## 목차

1. [swaggerService](#swaggerservice)
2. [diffService](#diffservice)
3. [slackService](#slackservice)

---

## swaggerService

Swagger JSON 다운로드 및 버전 관리를 담당하는 서비스입니다.

### 주요 함수

#### fetchSwaggerJson(url, timeout)

Swagger URL에서 JSON을 다운로드합니다.

**파라미터:**
- `url` (String): Swagger URL
- `timeout` (Number): 타임아웃 (ms, 기본값: 15000)

**반환:** `Promise<object>` - Swagger JSON 객체

**에러 처리:**
- `404`: "URL을 찾을 수 없습니다 (404)"
- `401`: "인증이 필요합니다 (401)"
- `ECONNABORTED`: 타임아웃 에러
- `ECONNREFUSED`: 연결 거부 에러
- 유효하지 않은 Swagger 형식: "유효한 OpenAPI/Swagger 문서가 아닙니다"

**사용 예:**
```javascript
const swaggerJson = await fetchSwaggerJson('https://api.example.com/swagger.json');
```

**구현 세부사항:**
- User-Agent 헤더 설정: `'Mozilla/5.0 (compatible; ApiDocManager/1.0)'`
- Accept 헤더: `'application/json'`
- validateStatus: 500 미만의 상태 코드 허용
- OpenAPI/Swagger 형식 검증: `openapi` 또는 `swagger` 필드 존재 확인

---

#### extractMajorVersion(url, swaggerJson)

Swagger JSON의 paths에서 메이저 버전을 추출합니다.

**파라미터:**
- `url` (String): Swagger URL (사용하지 않음, 호환성 유지)
- `swaggerJson` (Object): 파싱된 Swagger JSON (optional)

**반환:** `String` - 버전 문자열 (예: "v1", "v2")

**추출 로직:**
1. `swaggerJson.paths`의 첫 번째 경로에서 `/v숫자/` 패턴 검색
2. 패턴이 없으면 기본값 `'v1'` 반환

**정규식 패턴:**
```javascript
const versionPattern = /\/v(\d+)(\/|$)/i;
```

**사용 예:**
```javascript
const majorVersion = extractMajorVersion(null, swaggerJson);
// swaggerJson.paths = { '/v1/users': {...} } → 'v1'
// swaggerJson.paths = { '/users': {...} } → 'v1' (기본값)
```

---

#### parseAndSaveSwagger(urlId)

Swagger JSON을 파싱하고 버전을 생성/업데이트하는 메인 함수입니다.

**파라미터:**
- `urlId` (String): ApiUrl ID

**반환:** `Promise<object>` - `{ created, updated, version }`

**처리 흐름:**

1. **ApiUrl 조회 및 활성화 확인**
   ```javascript
   const apiUrl = await ApiUrl.findById(urlId);
   if (!apiUrl.isActive) throw new Error('비활성화된 URL입니다');
   ```

2. **Swagger JSON 다운로드**
   ```javascript
   const swaggerJson = await fetchSwaggerJson(apiUrl.url);
   ```

3. **메이저 버전 추출**
   ```javascript
   const majorVersion = extractMajorVersion(apiUrl.url, swaggerJson);
   ```

4. **기존 버전 조회**
   ```javascript
   const existingVersion = await ApiVersion.findOne({
     urlId: apiUrl._id,
     majorVersion
   });
   ```

5. **변경사항 분석**
   - 기존 버전이 있으면: `diffService.analyzeChanges()` 호출
   - 변경사항 없으면: 상태만 업데이트 후 종료

6. **버전 생성/업데이트**
   - **기존 버전 업데이트**:
     - `revisionCount` 증가
     - `changes` 배열에 새 변경사항 추가
     - `changeHistory`에 업데이트 기록 추가
     - `lastUpdatedAt` 업데이트
   - **신규 버전 생성**:
     - 새 `ApiVersion` 문서 생성
     - `versionNumber` 자동 계산 (최신 버전 + 1)
     - `previousVersionId` 설정

7. **ApiUrl 상태 업데이트**
   ```javascript
   await ApiUrl.findByIdAndUpdate(urlId, {
     lastFetchedAt: now,
     lastFetchStatus: 'success',
     errorMessage: null
   });
   ```

8. **슬랙 알림 전송** (비동기)
   ```javascript
   sendChangeNotification({...}).catch(error => {
     console.error('[Slack] 알림 전송 실패 (무시됨):', error.message);
   });
   ```

**반환 형식:**

**변경사항 없음:**
```javascript
{
  created: false,
  updated: false,
  message: '변경사항이 없습니다',
  version: {
    versionId: 'v1',
    majorVersion: 'v1',
    revisionCount: 1,
    lastUpdatedAt: Date
  }
}
```

**기존 버전 업데이트:**
```javascript
{
  created: false,
  updated: true,
  version: {
    _id: ObjectId,
    versionId: 'v1',
    majorVersion: 'v1',
    versionNumber: 1,
    revisionCount: 2,
    lastUpdatedAt: Date,
    changesCount: 5,
    summary: '5개 추가, 2개 삭제'
  }
}
```

**신규 버전 생성:**
```javascript
{
  created: true,
  updated: false,
  version: {
    _id: ObjectId,
    versionId: 'v2',
    majorVersion: 'v2',
    versionNumber: 2,
    revisionCount: 1,
    timestamp: Date,
    changesCount: 3,
    summary: '3개 추가'
  }
}
```

**에러 처리:**
- ApiUrl이 없으면: `Error('URL을 찾을 수 없습니다')`
- 비활성화된 URL: `Error('비활성화된 URL입니다')`
- Swagger 다운로드 실패: ApiUrl 상태를 `'error'`로 업데이트 후 에러 throw

---

#### countEndpoints(swaggerJson)

Swagger JSON에서 엔드포인트 수를 계산합니다.

**파라미터:**
- `swaggerJson` (Object): Swagger JSON 객체

**반환:** `Number` - 엔드포인트 총 개수

**계산 로직:**
- `paths` 객체의 각 경로에서 HTTP 메서드 확인
- 지원 메서드: `get`, `post`, `put`, `delete`, `patch`, `options`, `head`
- 각 메서드마다 카운트 증가

**사용 예:**
```javascript
const count = countEndpoints(swaggerJson);
// swaggerJson.paths = {
//   '/users': { get: {...}, post: {...} },
//   '/users/{id}': { get: {...}, put: {...}, delete: {...} }
// }
// → count = 5
```

---

#### generateSummary(changes)

변경사항 배열에서 요약 문자열을 생성합니다.

**파라미터:**
- `changes` (Array): 변경사항 배열

**반환:** `String` - 요약 문자열

**생성 로직:**
- `added` 타입 개수 계산
- `removed` 타입 개수 계산
- `modified` 타입 개수 계산
- 형식: "N개 추가, M개 삭제, K개 수정"

**사용 예:**
```javascript
const summary = generateSummary([
  { type: 'added', ... },
  { type: 'added', ... },
  { type: 'removed', ... },
  { type: 'modified', ... }
]);
// → "2개 추가, 1개 삭제, 1개 수정"
```

**특수 케이스:**
- 변경사항이 없으면: `'초기 버전'`

---

## diffService

두 Swagger JSON의 변경사항을 분석하는 서비스입니다.

### 주요 함수

#### analyzeChanges(oldJson, newJson)

두 Swagger JSON을 비교하여 변경사항을 분석합니다.

**파라미터:**
- `oldJson` (Object): 이전 버전 Swagger JSON
- `newJson` (Object): 새 버전 Swagger JSON

**반환:** `{ hasChanges: boolean, changes: Array }`

**비교 영역 (15개):**

1. **OpenAPI/Swagger 버전** (`openapi` 또는 `swagger`)
2. **Info 섹션** (`info.title`, `info.description`, `info.version`, `info.contact`, `info.license`)
3. **Servers** (`servers` 배열)
4. **전역 Security** (`security` 배열)
5. **Tags** (`tags` 배열)
6. **External Docs** (`externalDocs`)
7. **Paths (Endpoints)** (`paths` 객체) - 정규화된 경로 비교
8. **Components/Schemas** (`components.schemas`)
9. **Security Schemes** (`components.securitySchemes`)
10. **Parameters** (`components.parameters`)
11. **Request Bodies** (`components.requestBodies`)
12. **Responses** (`components.responses`)
13. **Headers** (`components.headers`)
14. **Examples** (`components.examples`)
15. **Links** (`components.links`)
16. **Callbacks** (`components.callbacks`)

**Swagger 2.0 호환:**
- `definitions` → `components.schemas`
- `securityDefinitions` → `components.securitySchemes`
- `basePath`, `host`, `schemes` → `servers`
- `consumes`, `produces` 비교

**사용 예:**
```javascript
const result = analyzeChanges(oldSwaggerJson, newSwaggerJson);
if (result.hasChanges) {
  console.log(`변경사항 ${result.changes.length}개 발견`);
}
```

---

#### 경로 정규화 알고리즘

동일 문서 내 여러 버전 공존 케이스를 처리하기 위한 경로 정규화 알고리즘입니다.

**normalizePathKey(path)**

경로에서 버전 접두사를 제거하여 정규화된 키를 생성합니다.

**파라미터:**
- `path` (String): 원본 경로 (예: "/v1/users/{id}")

**반환:** `{ normalizedPath, versionPrefix, originalPath }`

**예시:**
```javascript
normalizePathKey('/v1/users/{id}')
// → {
//   normalizedPath: '/{VERSION}/users/{id}',
//   versionPrefix: '/v1',
//   originalPath: '/v1/users/{id}'
// }

normalizePathKey('/api/v2/orders')
// → {
//   normalizedPath: '/api/{VERSION}/orders',
//   versionPrefix: '/v2',
//   originalPath: '/api/v2/orders'
// }

normalizePathKey('/users')
// → {
//   normalizedPath: '/users',
//   versionPrefix: null,
//   originalPath: '/users'
// }
```

**buildPathMapping(oldPaths, newPaths)**

old/new paths를 정규화된 키로 매핑합니다.

**매칭 전략:**
1. 동일 버전끼리 먼저 매칭 (`/v1/users` ↔ `/v1/users`)
2. 버전 업그레이드 매칭 시도 (`/v1/users` ↔ `/v2/users`)
3. 매칭되지 않은 것은 추가/삭제로 처리

**반환:** `{ matched, oldOnly, newOnly }`

**matched 항목 구조:**
```javascript
{
  normalizedKey: '/{VERSION}/users',
  old: {
    originalPath: '/v1/users',
    versionPrefix: '/v1',
    spec: {...}
  },
  new: {
    originalPath: '/v2/users',
    versionPrefix: '/v2',
    spec: {...}
  },
  versionChanged: true  // 버전 변경 여부
}
```

---

#### comparePaths(oldPaths, newPaths)

Paths (endpoints) 비교 함수입니다.

**처리 흐름:**

1. **경로 매핑 생성**
   ```javascript
   const mapping = buildPathMapping(oldPaths, newPaths);
   ```

2. **진짜 추가된 엔드포인트 처리**
   - `mapping.newOnly`의 각 항목에 대해
   - HTTP 메서드별로 `added` 타입 변경사항 생성

3. **진짜 삭제된 엔드포인트 처리**
   - `mapping.oldOnly`의 각 항목에 대해
   - HTTP 메서드별로 `removed` 타입 변경사항 생성

4. **매칭된 엔드포인트 분석**
   - Path 레벨 공통 속성 비교 (parameters, summary, description, servers)
   - 메서드별 상세 비교 (`compareOperation`)

5. **버전 변경 감지**
   - `versionChanged === true`이고 스펙이 동일하면: `path_version_changed` 타입
   - `versionChanged === true`이고 스펙이 다르면: `modified` 타입 + 상세 변경사항

**변경사항 타입:**

| 상황 | Type | Severity |
|------|------|----------|
| 새 엔드포인트 추가 | `added` | `high` |
| 엔드포인트 삭제 | `removed` | `high` |
| 버전만 변경, 스펙 동일 | `path_version_changed` | `medium` |
| 버전 변경 + 스펙 변경 | `modified` | `high` |
| 스펙만 변경 | `modified` | (상세에 따라) |

---

#### compareOperation(oldOp, newOp, path)

Operation(엔드포인트 메서드) 상세 비교 함수입니다.

**비교 항목:**
- Parameters (`compareParameters`)
- Request Body (`compareRequestBody`)
- Responses (`compareResponses`)
- Operation ID (`compareValues`)
- Summary (`compareValues`)
- Description (`compareValues`)
- Tags (`compareValues`)
- Deprecated (`compareValues`) - **high** severity
- Security (엔드포인트 레벨) (`compareSecurity`)
- Servers (엔드포인트 레벨) (`compareArrays`)
- Callbacks (`compareObjectMaps`)
- External Docs (`compareExternalDocs`)

**사용 예:**
```javascript
const changes = compareOperation(
  oldSwaggerJson.paths['/users'].post,
  newSwaggerJson.paths['/users'].post,
  'POST /users'
);
```

---

#### compareParameters(oldParams, newParams, path)

Parameters 비교 함수입니다.

**고유 식별:**
- `name + in` 조합으로 파라미터 식별
- 예: `{ name: 'id', in: 'path' }`와 `{ name: 'id', in: 'query' }`는 다른 파라미터

**심각도 판단:**
- `required: true` 파라미터 추가/삭제: `medium`
- `required: false` 파라미터 변경: `low`
- 파라미터 수정: `low`

**사용 예:**
```javascript
const changes = compareParameters(
  oldOp.parameters,
  newOp.parameters,
  'GET /users'
);
```

---

#### compareResponses(oldResponses, newResponses, path)

Responses 비교 함수입니다.

**비교 방식:**
- 응답 코드별로 비교 (예: `200`, `404`, `500`)
- 각 응답 코드의 추가/삭제/수정 감지

**심각도:** `low` (응답 변경은 일반적으로 low)

**사용 예:**
```javascript
const changes = compareResponses(
  oldOp.responses,
  newOp.responses,
  'POST /users'
);
```

---

#### 헬퍼 함수

**compareObjectMaps(oldMap, newMap, category, basePath, severity)**
- 객체 맵 비교 (key-value 형태)
- 사용: schemas, securitySchemes, parameters 등

**compareArrays(oldArr, newArr, category, path, keyField, severity)**
- 배열 비교 (keyField 기준 또는 전체 비교)
- 사용: servers, tags 등

**compareValues(oldValue, newValue, category, path, field, description, severity)**
- 단순 값 비교
- 사용: info 필드, operationId 등

---

## slackService

Slack 알림 시스템을 담당하는 서비스입니다.

### 초기화

```javascript
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackEnabled = process.env.SLACK_ENABLED === 'true';

let slackClient = null;
if (slackEnabled && slackToken) {
  slackClient = new WebClient(slackToken);
}
```

### 주요 함수

#### findUserByEmail(email)

이메일로 Slack 사용자 ID를 조회합니다.

**파라미터:**
- `email` (String): 사용자 이메일

**반환:** `Promise<string | null>` - Slack 사용자 ID 또는 null

**에러 처리:**
- `users_not_found`: null 반환 (에러로 처리하지 않음)
- 기타 에러: 콘솔 로그 후 null 반환

**사용 예:**
```javascript
const userId = await findUserByEmail('user@example.com');
if (userId) {
  // DM 전송 가능
}
```

---

#### sendDirectMessage(userId, message)

개인 DM을 전송합니다.

**파라미터:**
- `userId` (String): Slack 사용자 ID
- `message` (Object): Slack 메시지 객체 (blocks 또는 text)

**반환:** `Promise<boolean>` - 전송 성공 여부

**처리 흐름:**
1. `conversations.open`으로 DM 채널 생성/열기
2. `chat.postMessage`로 메시지 전송

**사용 예:**
```javascript
const success = await sendDirectMessage(userId, {
  text: '알림 메시지',
  blocks: [...]
});
```

---

#### formatChangeNotification(options)

변경사항 알림 메시지를 포맷팅합니다.

**파라미터:**
- `options.apiName` (String): API 이름
- `options.apiUrl` (String): API URL
- `options.versionId` (String): 버전 ID
- `options.changesCount` (Number): 변경사항 수
- `options.summary` (String): 변경사항 요약
- `options.isNewVersion` (Boolean): 새 버전 생성 여부
- `options.detailUrl` (String, optional): 상세 페이지 URL

**반환:** `Object` - Slack Block Kit 형식 메시지

**메시지 구조:**
- Header: "🆕 API 변경사항 알림" 또는 "🔄 API 변경사항 알림"
- Section: API 이름, 버전, 상태, 변경사항 수
- Section: 변경사항 요약
- Section: 상세 페이지 링크 (있으면)
- Context: API URL

**사용 예:**
```javascript
const message = formatChangeNotification({
  apiName: 'User Service API',
  apiUrl: 'https://api.example.com/swagger.json',
  versionId: 'v2',
  changesCount: 5,
  summary: '5개 추가, 2개 삭제',
  isNewVersion: true,
  detailUrl: 'https://adm.example.com/api-detail?id=123'
});
```

---

#### sendChangeNotification(options)

API 변경사항 알림을 전송합니다.

**파라미터:**
- `options.ownerEmail` (String): 담당자 이메일
- `options.apiName` (String): API 이름
- `options.apiUrl` (String): API URL
- `options.apiId` (String): API ID (상세 페이지 링크용)
- `options.versionId` (String): 버전 ID
- `options.changesCount` (Number): 변경사항 수
- `options.summary` (String): 변경사항 요약
- `options.isNewVersion` (Boolean): 새 버전 생성 여부
- `options.baseUrl` (String, optional): 기본 URL (기본값: `process.env.BASE_URL`)

**반환:** `Promise<boolean>` - 전송 성공 여부

**처리 흐름:**
1. `SLACK_ENABLED` 확인 → false면 종료
2. `ownerEmail` 확인 → 없으면 종료
3. 이메일로 Slack 사용자 ID 조회
4. 상세 페이지 URL 생성: `${baseUrl}/api-detail?id=${apiId}`
5. 메시지 포맷팅
6. DM 전송

**에러 처리:**
- 모든 에러는 콘솔 로그 후 false 반환
- 버전 업데이트는 정상 진행 (비동기 처리)

**사용 예:**
```javascript
await sendChangeNotification({
  ownerEmail: 'developer@example.com',
  apiName: 'User Service API',
  apiUrl: 'https://api.example.com/swagger.json',
  apiId: '1234567890abcdef',
  versionId: 'v2',
  changesCount: 5,
  summary: '5개 추가, 2개 삭제',
  isNewVersion: true
}).catch(error => {
  // 에러 무시 (버전 업데이트는 정상 진행)
});
```

---

## 서비스 간 상호작용

### 버전 생성/업데이트 플로우

```
parseAndSaveSwagger()
  ├─→ fetchSwaggerJson()          [swaggerService]
  ├─→ extractMajorVersion()       [swaggerService]
  ├─→ analyzeChanges()             [diffService]
  ├─→ ApiVersion.create/update    [Mongoose]
  └─→ sendChangeNotification()     [slackService] (비동기)
```

### 변경사항 분석 플로우

```
analyzeChanges()
  ├─→ compareInfo()
  ├─→ compareServers()
  ├─→ compareSecurity()
  ├─→ compareTags()
  ├─→ comparePaths()
  │    ├─→ buildPathMapping()
  │    │    └─→ normalizePathKey()
  │    └─→ compareOperation()
  │         ├─→ compareParameters()
  │         ├─→ compareRequestBody()
  │         └─→ compareResponses()
  └─→ compareComponents()
       └─→ compareObjectMaps()
```

---

## 에러 처리 전략

### swaggerService

- **Swagger 다운로드 실패**: ApiUrl 상태를 `'error'`로 업데이트 후 에러 throw
- **비활성화된 URL**: 즉시 에러 throw
- **변경사항 없음**: 정상 반환 (에러 아님)

### diffService

- **에러 없음**: 모든 비교 함수는 안전하게 처리
- **null/undefined 처리**: 모든 비교 함수에서 null/undefined 안전 처리

### slackService

- **알림 실패**: 콘솔 로그 후 false 반환 (버전 업데이트는 정상 진행)
- **사용자 없음**: null 반환 (에러 아님)
- **비활성화**: 즉시 false 반환 (에러 아님)

---

## 성능 고려사항

### swaggerService

- **타임아웃**: 기본 15초 (대용량 JSON 고려)
- **에러 재시도**: 없음 (수동 재시도 필요)

### diffService

- **메모리 사용**: 대용량 JSON 비교 시 메모리 사용량 증가 가능
- **성능**: 경로 정규화 알고리즘으로 비교 횟수 최소화

### slackService

- **비동기 처리**: 버전 업데이트와 독립적으로 실행
- **에러 무시**: 알림 실패해도 버전 업데이트는 정상 진행

---

---

← [이전: 데이터 모델](./models.md) | [목차로 돌아가기](../README.md) | [다음: 라우트 구조](./routes.md) →
