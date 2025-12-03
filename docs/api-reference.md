# API 명세

> REST API 엔드포인트 상세 문서

## Base URL

```
http://localhost:3000/api
```

## 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "meta": { /* 페이지네이션 등 메타 정보 */ }
}
```

### 오류 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": [ /* 상세 정보 배열 */ ]
  }
}
```

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 (조회, 수정) |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 내부 오류 |

---

## 헬스 체크

### GET /api/health

서버 상태를 확인합니다.

**응답 예시:**

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

## URL 관리 API

### GET /api/urls

등록된 API URL 목록을 조회합니다.

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

**요청 예시:**

```bash
curl "http://localhost:3000/api/urls?group=backend&page=1&limit=10"
```

**응답 예시:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65432...",
      "name": "User Service API",
      "url": "https://api.example.com/swagger.json",
      "group": "backend",
      "description": "사용자 관리 API",
      "isActive": true,
      "lastFetchedAt": "2024-11-27T10:00:00.000Z",
      "lastFetchStatus": "success",
      "versionCount": 5,
      "createdAt": "2024-11-01T00:00:00.000Z",
      "updatedAt": "2024-11-27T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "groups": ["backend", "frontend", "mobile"],
    "services": ["user-service", "auth-service", "payment-service"],
    "servicesByGroup": {
      "backend": ["user-service", "auth-service"],
      "frontend": ["web-app"],
      "mobile": ["mobile-api"]
    }
  }
}
```

---

### GET /api/urls/:id

특정 API URL의 상세 정보를 조회합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | API URL의 MongoDB ObjectId |

**요청 예시:**

```bash
curl "http://localhost:3000/api/urls/65432..."
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "_id": "65432...",
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "사용자 관리 API",
    "isActive": true,
    "owner": "developer@example.com",
    "tags": ["v2", "production"],
    "priority": "high",
    "lastFetchedAt": "2024-11-27T10:00:00.000Z",
    "lastFetchStatus": "success",
    "versionCount": 5,
    "createdAt": "2024-11-01T00:00:00.000Z",
    "updatedAt": "2024-11-27T10:00:00.000Z"
  }
}
```

---

### POST /api/urls

새 API URL을 등록합니다.

**요청 본문:**

| 필드 | 타입 | 필수 | 설명 | 제약 |
|------|------|------|------|------|
| `name` | string | ✅ | 서비스명 | 최대 100자 |
| `url` | string | ✅ | Swagger URL | HTTP(S) URL |
| `group` | string | ✅ | 그룹/팀 | - |
| `service` | string | ✅ | 서비스명 | - |
| `description` | string | ❌ | 설명 | 최대 500자 |
| `owner` | string | ❌ | 담당자 이메일 | 이메일 형식 (빈 문자열 허용) |
| `tags` | string[] | ❌ | 태그 배열 | - |
| `priority` | string | ❌ | 우선순위 | low/medium/high |

**요청 예시:**

```bash
curl -X POST "http://localhost:3000/api/urls" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "사용자 관리 API"
  }'
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "_id": "65432...",
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "사용자 관리 API",
    "isActive": true,
    "lastFetchStatus": "pending",
    "versionCount": 0,
    "createdAt": "2024-11-27T10:00:00.000Z",
    "updatedAt": "2024-11-27T10:00:00.000Z"
  },
  "message": "URL이 성공적으로 추가되었습니다"
}
```

---

### PUT /api/urls/:id

API URL 정보를 수정합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | API URL의 MongoDB ObjectId |

**요청 본문:** POST /api/urls와 동일 (모든 필드 선택적)

**요청 본문:** POST /api/urls와 동일하지만 모든 필드가 선택적입니다. `isActive` 필드도 수정 가능합니다.

**요청 예시:**

```bash
curl -X PUT "http://localhost:3000/api/urls/65432..." \
  -H "Content-Type: application/json" \
  -d '{
    "description": "수정된 설명",
    "priority": "high"
  }'
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "_id": "65432...",
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "수정된 설명",
    "isActive": true,
    "priority": "high",
    "updatedAt": "2024-11-27T10:00:00.000Z"
  },
  "message": "URL이 성공적으로 수정되었습니다"
}
```

---

### DELETE /api/urls/:id

API URL을 삭제합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | API URL의 MongoDB ObjectId |

**요청 예시:**

```bash
curl -X DELETE "http://localhost:3000/api/urls/65432..."
```

**응답 예시:**

```json
{
  "success": true,
  "message": "URL이 성공적으로 삭제되었습니다"
}
```

**주의:** 삭제 시 해당 URL의 모든 버전 히스토리도 함께 삭제됩니다.

---

### PATCH /api/urls/:id/activate

API URL의 활성화 상태를 토글합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | API URL의 MongoDB ObjectId |

**요청 예시:**

```bash
curl -X PATCH "http://localhost:3000/api/urls/65432.../activate"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "isActive": false
  },
  "message": "URL이 비활성화되었습니다"
}
```

---

### POST /api/urls/:id/fetch

Swagger JSON을 수동으로 가져와 버전을 생성/업데이트합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | API URL의 MongoDB ObjectId |

**요청 예시:**

```bash
curl -X POST "http://localhost:3000/api/urls/65432.../fetch"
```

**응답 예시 (새 버전 생성):**

```json
{
  "success": true,
  "data": {
    "created": true,
    "updated": false,
    "version": {
      "_id": "65433...",
      "versionId": "v3",
      "majorVersion": "v1",
      "versionNumber": 3,
      "endpointCount": 15,
      "summary": "5개 추가, 2개 삭제, 3개 수정"
    }
  },
  "message": "새 버전이 생성되었습니다"
}
```

**응답 예시 (변경사항 없음):**

```json
{
  "success": true,
  "data": {
    "created": false,
    "updated": false,
    "version": null
  },
  "message": "변경사항이 없습니다"
}
```

---

## 버전 관리 API

### GET /api/urls/:urlId/versions

특정 URL의 버전 목록을 조회합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `urlId` | string | API URL의 MongoDB ObjectId |

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `page` | number | ❌ | 페이지 번호 | 1 |
| `limit` | number | ❌ | 페이지당 항목 수 | 20 |

**요청 예시:**

```bash
curl "http://localhost:3000/api/urls/65432.../versions?limit=50"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "apiUrl": {
      "_id": "65432...",
      "name": "User Service API",
      "url": "https://api.example.com/swagger.json",
      "group": "backend"
    },
    "versions": [
      {
        "_id": "65433...",
        "versionId": "v3",
        "versionNumber": 3,
        "majorVersion": "v1",
        "revisionCount": 1,
        "timestamp": "2024-11-27T10:00:00.000Z",
        "endpointCount": 15,
        "parameterCount": 42,
        "summary": "5개 추가, 2개 삭제, 3개 수정"
      }
    ]
  },
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

**참고:** `swaggerJson` 필드는 기본적으로 제외됩니다. 버전 상세 조회는 `GET /api/urls/:urlId/versions/:versionId`를 사용하세요.

---

### GET /api/urls/:urlId/versions/latest

최신 버전을 조회합니다 (swaggerJson 포함).

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `urlId` | string | API URL의 MongoDB ObjectId |

**요청 예시:**

```bash
curl "http://localhost:3000/api/urls/65432.../versions/latest"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "_id": "65433...",
    "versionId": "v3",
    "versionNumber": 3,
    "swaggerJson": {
      "openapi": "3.0.0",
      "info": { "title": "User API", "version": "1.0.0" },
      "paths": { ... }
    },
    "changes": [ ... ],
    "endpointCount": 15
  }
}
```

---

### GET /api/urls/:urlId/versions/:versionId

특정 버전의 상세 정보를 조회합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `urlId` | string | API URL의 MongoDB ObjectId |
| `versionId` | string | 버전 ID 문자열 (예: "v1", "v2", "v3") |

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `includeSwagger` | string | ❌ | Swagger JSON 포함 여부 | `true` |

**요청 예시:**

```bash
# Swagger JSON 포함
curl "http://localhost:3000/api/urls/65432.../versions/v2"

# Swagger JSON 제외
curl "http://localhost:3000/api/urls/65432.../versions/v2?includeSwagger=false"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "_id": "65433...",
    "urlId": "65432...",
    "versionId": "v2",
    "versionNumber": 2,
    "majorVersion": "v1",
    "revisionCount": 1,
    "timestamp": "2024-11-26T10:00:00.000Z",
    "lastUpdatedAt": "2024-11-26T10:00:00.000Z",
    "swaggerJson": {
      "openapi": "3.0.0",
      "info": { "title": "User API", "version": "2.0.0" },
      "paths": { ... }
    },
    "changes": [
      {
        "_id": "change123...",
        "type": "added",
        "category": "endpoint",
        "path": "POST /api/users",
        "description": "사용자 생성 엔드포인트 추가",
        "severity": "high",
        "recordedAt": "2024-11-26T10:00:00.000Z"
      }
    ],
    "changeHistory": [
      {
        "updatedAt": "2024-11-26T10:00:00.000Z",
        "changesCount": 5,
        "summary": "5개 추가"
      }
    ],
    "endpointCount": 10,
    "parameterCount": 25,
    "summary": "5개 추가, 2개 삭제"
  }
}
```

**참고:** `includeSwagger=false`로 요청하면 `swaggerJson` 필드가 제외됩니다.

---

### GET /api/urls/:urlId/versions/:versionId/diff

특정 버전과 이전 버전(또는 지정 버전)을 비교합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `urlId` | string | API URL의 MongoDB ObjectId |
| `versionId` | string | 비교 대상 버전 ID 문자열 (예: "v2") |

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `compareWith` | string | ❌ | 비교할 버전 ID 문자열 (미지정 시 이전 버전) |

**요청 예시:**

```bash
# 이전 버전과 비교
curl "http://localhost:3000/api/urls/65432.../versions/v2/diff"

# 특정 버전과 비교
curl "http://localhost:3000/api/urls/65432.../versions/v2/diff?compareWith=v1"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "currentVersion": {
      "versionId": "v2",
      "versionNumber": 2,
      "timestamp": "2024-11-27T10:00:00.000Z",
      "swaggerJson": { ... }
    },
    "previousVersion": {
      "versionId": "v1",
      "versionNumber": 1,
      "timestamp": "2024-11-26T10:00:00.000Z",
      "swaggerJson": { ... }
    },
    "changes": [
      {
        "type": "added",
        "category": "endpoint",
        "path": "POST /api/users",
        "description": "사용자 생성 엔드포인트 추가",
        "severity": "high"
      }
    ],
    "isFirstVersion": false
  }
}
```

**참고:** 최초 버전인 경우 `previousVersion`은 `null`이고 `isFirstVersion`은 `true`입니다.

---

### GET /api/urls/:urlId/versions/:v1/compare/:v2

두 특정 버전을 비교합니다.

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `urlId` | string | API URL의 MongoDB ObjectId |
| `v1` | string | 첫 번째 버전 ID 문자열 (예: "v1") |
| `v2` | string | 두 번째 버전 ID 문자열 (예: "v2") |

**요청 예시:**

```bash
curl "http://localhost:3000/api/urls/65432.../versions/v1/compare/v2"
```

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "version1": {
      "_id": "65433...",
      "versionId": "v1",
      "versionNumber": 1
    },
    "version2": {
      "_id": "65434...",
      "versionId": "v2",
      "versionNumber": 2
    },
    "version1": {
      "versionId": "v1",
      "versionNumber": 1,
      "timestamp": "2024-11-26T10:00:00.000Z",
      "swaggerJson": { ... }
    },
    "version2": {
      "versionId": "v2",
      "versionNumber": 2,
      "timestamp": "2024-11-27T10:00:00.000Z",
      "swaggerJson": { ... }
    },
    "changes": [
      {
        "type": "added",
        "category": "endpoint",
        "path": "POST /api/users",
        "description": "사용자 생성 엔드포인트 추가",
        "severity": "high"
      },
      {
        "type": "modified",
        "category": "parameter",
        "path": "GET /api/users",
        "field": "limit",
        "oldValue": { "type": "integer", "default": 10 },
        "newValue": { "type": "integer", "default": 20 },
        "description": "limit 파라미터 기본값 변경",
        "severity": "low"
      }
    ],
    "rawDiff": "--- a/swagger.json\n+++ b/swagger.json\n..."
  }
}
```

---

### GET /api/versions/latest

모든 URL의 최신 버전 목록을 조회합니다 (대시보드용).

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `limit` | number | ❌ | 조회할 개수 | 10 |

**요청 예시:**

```bash
curl "http://localhost:3000/api/versions/latest?limit=5"
```

**응답 예시:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65433...",
      "urlId": "65432...",
      "versionId": "v3",
      "versionNumber": 3,
      "timestamp": "2024-11-27T10:00:00.000Z",
      "endpointCount": 15,
      "parameterCount": 42,
      "summary": "5개 추가",
      "apiUrl": {
        "_id": "65432...",
        "name": "User Service API",
        "url": "https://api.example.com/swagger.json",
        "group": "backend"
      }
    }
  ]
}
```

**참고:** `swaggerJson` 필드는 제외됩니다.

---

### GET /api/versions/recent-changes

최근 변경사항을 조회합니다.

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| `days` | number | ❌ | 조회 기간 (일) | 7 |
| `limit` | number | ❌ | 최대 개수 | 50 |

**요청 예시:**

```bash
curl "http://localhost:3000/api/versions/recent-changes?days=30&limit=100"
```

**응답 예시:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65433...",
      "urlId": {
        "_id": "65432...",
        "name": "User Service API",
        "group": "backend",
        "url": "https://api.example.com/swagger.json"
      },
      "versionId": "v3",
      "versionNumber": 3,
      "timestamp": "2024-11-27T10:00:00.000Z",
      "endpointCount": 15,
      "parameterCount": 42,
      "summary": "5개 추가, 2개 삭제",
      "changes": [
        {
          "type": "added",
          "category": "endpoint",
          "path": "POST /api/users",
          "description": "사용자 생성 엔드포인트 추가",
          "severity": "high"
        }
      ]
    }
  ],
  "meta": {
    "since": "2024-10-28T00:00:00.000Z",
    "count": 25
  }
}
```

**참고:** `swaggerJson` 필드는 제외됩니다. 변경사항이 있는 버전만 조회됩니다.

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| `VALIDATION_ERROR` | 입력 데이터 유효성 검사 실패 |
| `NOT_FOUND` | 요청한 리소스를 찾을 수 없음 |
| `DUPLICATE_URL` | 이미 등록된 URL |
| `FETCH_ERROR` | Swagger JSON 가져오기 실패 |
| `INVALID_SWAGGER` | 유효하지 않은 Swagger/OpenAPI 형식 |
| `SERVER_ERROR` | 서버 내부 오류 |

---

← [이전: 사용자 매뉴얼](./user-guide.md) | [목차로 돌아가기](./README.md) | [다음: 아키텍처](./architecture.md) →
