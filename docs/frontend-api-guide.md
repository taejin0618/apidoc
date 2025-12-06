# 프론트엔드 API 사용 가이드

> API Doc Manager의 프론트엔드 개발자를 위한 API 사용 매뉴얼

## 목차

1. [개요](#개요)
2. [기본 설정](#기본-설정)
3. [화면별 API 사용 가이드](#화면별-api-사용-가이드)
4. [에러 처리](#에러-처리)
5. [실전 예제](#실전-예제)

---

## 개요

이 문서는 API Doc Manager의 프론트엔드에서 사용하는 모든 API 엔드포인트를 화면/기능별로 정리한 가이드입니다.

### Base URL

```
http://localhost:3000/api
```

### 응답 형식

모든 API는 다음 형식을 따릅니다:

**성공 응답:**
```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "meta": { /* 페이지네이션 등 메타 정보 */ }
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": [ /* 상세 정보 배열 (선택) */ ]
  }
}
```

---

## 기본 설정

### API Client 사용

프로젝트에는 `api-client.js`가 포함되어 있어 편리하게 API를 호출할 수 있습니다:

```javascript
// api-client.js를 import
import { apiClient } from '/js/api-client.js';

// 또는 전역 변수로 사용 (HTML에서 script 태그로 로드한 경우)
const response = await apiClient.getUrls();
```

### 직접 fetch 사용

```javascript
const response = await fetch('/api/urls', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
if (!response.ok) {
  throw new Error(data.error?.message || 'API 요청 실패');
}
```

---

## 화면별 API 사용 가이드

### 1. 메인 페이지 (`/`)

#### 1.1 API 목록 조회

**기능:** 페이지 로드 시 API 목록을 표시합니다.

**API:** `GET /api/urls`

**사용 위치:** `main.js` - `loadUrls()` 함수

**요청 예시:**
```javascript
// 기본 조회
const response = await apiClient.getUrls();

// 필터링 및 검색
const response = await apiClient.getUrls({
  group: 'backend',        // 팀 필터
  service: 'user-service', // 서비스 필터
  search: '결제',          // 검색어
  sort: '-updatedAt',      // 정렬 (최신순)
  page: 1,                 // 페이지 번호
  limit: 50                // 페이지당 항목 수
});
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "User Service API",
      "url": "https://api.example.com/swagger.json",
      "group": "backend",
      "service": "user-service",
      "description": "사용자 관리 API",
      "isActive": true,
      "versionCount": 5,
      "lastFetchedAt": "2024-11-27T10:00:00.000Z",
      "lastFetchStatus": "success",
      "createdAt": "2024-11-20T10:00:00.000Z",
      "updatedAt": "2024-11-27T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "groups": ["backend", "frontend", "platform"],
    "services": ["user-service", "auth-service"],
    "servicesByGroup": {
      "backend": ["user-service", "auth-service"],
      "frontend": ["web-app"]
    }
  }
}
```

**프론트엔드 사용 예시:**
```javascript
// main.js의 loadUrls() 함수
async function loadUrls() {
  try {
    const response = await apiClient.getUrls({
      group: currentFilter.group || undefined,
      service: currentFilter.service || undefined,
      search: currentFilter.search || undefined,
      sort: sortParam,
    });

    urlsData = response.data;
    renderUrlCards(urlsData);

    // 필터 옵션 업데이트
    if (response.meta) {
      updateTeamOptions(response.meta.groups);
      updateServiceOptions(response.meta.servicesByGroup);
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

#### 1.2 API 추가

**기능:** "API 추가" 버튼 클릭 시 모달에서 새 API를 등록합니다.

**API:** `POST /api/urls`

**사용 위치:** `main.js` - `handleAddUrl()` 함수

**요청 예시:**
```javascript
const response = await apiClient.createUrl({
  name: "User Service API",
  url: "https://api.example.com/swagger.json",
  group: "backend",
  service: "user-service",
  description: "사용자 관리 API",
  owner: "developer@example.com",  // 선택
  tags: ["v2", "production"],       // 선택
  priority: "high"                  // 선택: "low" | "medium" | "high"
});
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "사용자 관리 API",
    "isActive": true,
    "createdAt": "2024-11-27T10:00:00.000Z",
    "updatedAt": "2024-11-27T10:00:00.000Z"
  },
  "message": "URL이 성공적으로 추가되었습니다"
}
```

**프론트엔드 사용 예시:**
```javascript
// main.js의 handleAddUrl() 함수
async function handleAddUrl(e) {
  e.preventDefault();

  const form = e.target;
  const data = {
    name: form.name.value.trim(),
    url: form.url.value.trim(),
    group: form.group.value.trim().toLowerCase(),
    service: form.service.value.trim().toLowerCase(),
    description: form.description.value.trim(),
  };

  try {
    await apiClient.createUrl(data);
    showToast("API가 성공적으로 추가되었습니다", "success");
    closeModal();
    form.reset();
    await loadUrls(); // 목록 새로고침
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

**유효성 검사:**
- `name`: 필수, 최대 100자
- `url`: 필수, 유효한 HTTP(S) URL
- `group`: 필수
- `service`: 필수
- `description`: 선택, 최대 500자
- `owner`: 선택, 유효한 이메일 형식
- `priority`: 선택, "low" | "medium" | "high"

#### 1.3 API 수정

**기능:** API 카드의 수정 버튼 클릭 시 모달에서 API 정보를 수정합니다.

**API:** `PUT /api/urls/:id`

**사용 위치:** `main.js` - `handleEditUrl()` 함수

**요청 예시:**
```javascript
const response = await apiClient.updateUrl(apiId, {
  name: "Updated API Name",
  description: "Updated description",
  // 수정할 필드만 전송
});
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated API Name",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "Updated description",
    "updatedAt": "2024-11-27T11:00:00.000Z"
  },
  "message": "URL이 성공적으로 수정되었습니다"
}
```

**프론트엔드 사용 예시:**
```javascript
// main.js의 handleEditUrl() 함수
async function handleEditUrl(e) {
  e.preventDefault();

  const form = e.target;
  const id = form.id.value;
  const data = {
    name: form.name.value.trim(),
    url: form.url.value.trim(),
    group: form.group.value.trim().toLowerCase(),
    service: form.service.value.trim().toLowerCase(),
    description: form.description.value.trim(),
  };

  try {
    await apiClient.updateUrl(id, data);
    showToast("API가 성공적으로 수정되었습니다", "success");
    closeModal();
    await loadUrls();
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

#### 1.4 API 삭제

**기능:** API 상세 페이지에서 삭제 버튼 클릭 시 API를 삭제합니다.

**API:** `DELETE /api/urls/:id`

**사용 위치:** `api-detail.html` - `handleDelete()` 함수

**요청 예시:**
```javascript
const response = await apiClient.deleteUrl(apiId);
```

**응답 예시:**
```json
{
  "success": true,
  "message": "URL이 성공적으로 삭제되었습니다"
}
```

**주의사항:**
- 삭제 시 모든 버전 히스토리도 함께 삭제됩니다.
- 되돌릴 수 없는 작업입니다.

---

### 2. API 상세 페이지 (`/api-detail?id=:id`)

#### 2.1 API 상세 정보 조회

**기능:** 페이지 로드 시 API의 상세 정보를 표시합니다.

**API:** `GET /api/urls/:id`

**사용 위치:** `api-detail.html` - `loadApiDetail()` 함수

**요청 예시:**
```javascript
const response = await apiClient.getUrl(apiId);
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "User Service API",
    "url": "https://api.example.com/swagger.json",
    "group": "backend",
    "service": "user-service",
    "description": "사용자 관리 API",
    "isActive": true,
    "owner": "developer@example.com",
    "tags": ["v2", "production"],
    "priority": "high",
    "versionCount": 5,
    "lastFetchedAt": "2024-11-27T10:00:00.000Z",
    "lastFetchStatus": "success",
    "createdAt": "2024-11-20T10:00:00.000Z",
    "updatedAt": "2024-11-27T10:00:00.000Z"
  }
}
```

#### 2.2 버전 목록 조회

**기능:** 사이드바에 버전 히스토리를 표시합니다.

**API:** `GET /api/urls/:id/versions`

**사용 위치:** `api-detail.html` - `loadVersions()` 함수

**요청 예시:**
```javascript
const response = await apiClient.getVersions(apiId, {
  page: 1,
  limit: 50
});
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "apiUrl": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "User Service API",
      "url": "https://api.example.com/swagger.json",
      "group": "backend"
    },
    "versions": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "urlId": "507f1f77bcf86cd799439011",
        "versionId": "v3",
        "versionNumber": 3,
        "majorVersion": "v1",
        "timestamp": "2024-11-27T10:00:00.000Z",
        "endpointCount": 15,
        "parameterCount": 25,
        "summary": "5개 추가, 2개 삭제, 3개 수정",
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

**주의사항:**
- `swaggerJson`은 기본적으로 제외됩니다 (용량 절감).
- 버전 목록은 최신순으로 정렬됩니다.

#### 2.3 특정 버전 조회

**기능:** 버전 클릭 시 해당 버전의 Swagger JSON을 로드하여 Swagger UI에 표시합니다.

**API:** `GET /api/urls/:id/versions/:versionId`

**사용 위치:** `api-detail.html` - `loadSwaggerUI()` 함수

**요청 예시:**
```javascript
const response = await apiClient.getVersion(apiId, 'v3', {
  includeSwagger: true  // 기본값: true
});
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "urlId": "507f1f77bcf86cd799439011",
    "versionId": "v3",
    "versionNumber": 3,
    "timestamp": "2024-11-27T10:00:00.000Z",
    "swaggerJson": {
      "openapi": "3.0.0",
      "info": {
        "title": "User Service API",
        "version": "1.0.0"
      },
      "paths": {
        "/api/users": {
          "get": {
            "summary": "사용자 목록 조회",
            "responses": {
              "200": {
                "description": "성공"
              }
            }
          }
        }
      }
    },
    "changes": [ /* 변경사항 배열 */ ]
  }
}
```

**프론트엔드 사용 예시:**
```javascript
// api-detail.html의 loadSwaggerUI() 함수
async function loadSwaggerUI(apiId, versionId) {
  try {
    const response = await apiClient.getVersion(apiId, versionId);
    const version = response.data;

    currentSwaggerJson = version.swaggerJson;
    selectedVersionId = versionId;

    // Swagger UI 렌더링
    SwaggerUIBundle({
      spec: currentSwaggerJson,
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      supportedSubmitMethods: [], // Try it out 비활성화
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

#### 2.4 Swagger JSON 수동 업데이트

**기능:** "지금 확인" 버튼 클릭 시 최신 Swagger JSON을 가져와 새 버전을 생성합니다.

**API:** `POST /api/urls/:id/fetch`

**사용 위치:** `api-detail.html` - `handleFetch()` 함수

**요청 예시:**
```javascript
const response = await apiClient.fetchSwagger(apiId);
```

**응답 예시 (새 버전 생성된 경우):**
```json
{
  "success": true,
  "data": {
    "created": true,
    "updated": false,
    "version": {
      "_id": "507f1f77bcf86cd799439013",
      "versionId": "v4",
      "versionNumber": 4,
      "endpointCount": 16,
      "summary": "1개 추가, 0개 삭제, 2개 수정"
    }
  },
  "message": "새 버전이 생성되었습니다"
}
```

**응답 예시 (변경사항 없는 경우):**
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

**프론트엔드 사용 예시:**
```javascript
// api-detail.html의 handleFetch() 함수
async function handleFetch(apiId) {
  const btn = document.getElementById("fetchBtn");
  btn.disabled = true;
  btn.innerHTML = "확인 중...";

  try {
    const response = await apiClient.fetchSwagger(apiId);

    if (response.data.created) {
      showToast(
        `새 버전 ${response.data.version.versionId}이(가) 생성되었습니다`,
        "success"
      );
    } else {
      showToast("변경사항이 없습니다", "info");
    }

    // 목록 새로고침
    await loadApiDetail(apiId);
    await loadVersions(apiId);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "지금 확인";
  }
}
```

**주의사항:**
- 이 API는 Swagger URL에서 JSON을 다운로드하고 분석하는 작업이므로 시간이 걸릴 수 있습니다.
- 네트워크 오류나 잘못된 Swagger 형식의 경우 에러가 발생할 수 있습니다.

---

### 3. 버전 비교 페이지 (`/version-compare?id=:id`)

#### 3.1 두 버전 비교

**기능:** 두 버전을 선택하여 변경사항을 비교합니다.

**API:** `GET /api/urls/:id/versions/:v1/compare/:v2`

**사용 위치:** `version-compare.js` - `loadComparison()` 함수

**요청 예시:**
```javascript
const response = await apiClient.compareVersions(apiId, 'v1', 'v2');
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "version1": {
      "versionId": "v1",
      "versionNumber": 1,
      "timestamp": "2024-11-20T10:00:00.000Z",
      "swaggerJson": { /* Swagger JSON */ }
    },
    "version2": {
      "versionId": "v2",
      "versionNumber": 2,
      "timestamp": "2024-11-27T10:00:00.000Z",
      "swaggerJson": { /* Swagger JSON */ }
    },
    "changes": [
      {
        "type": "added",
        "category": "endpoint",
        "path": "POST /api/users",
        "description": "사용자 생성 엔드포인트 추가",
        "severity": "high",
        "oldValue": null,
        "newValue": {
          "summary": "사용자 생성",
          "requestBody": { /* ... */ }
        }
      },
      {
        "type": "modified",
        "category": "parameter",
        "path": "GET /api/users",
        "field": "page",
        "description": "파라미터 추가: page",
        "severity": "medium",
        "oldValue": null,
        "newValue": {
          "name": "page",
          "in": "query",
          "schema": { "type": "integer" }
        }
      }
    ],
    "rawDiff": "--- a/swagger.json\n+++ b/swagger.json\n..."
  }
}
```

**프론트엔드 사용 예시:**
```javascript
// version-compare.js의 loadComparison() 함수
async function loadComparison() {
  const v1 = document.getElementById("version1Select").value;
  const v2 = document.getElementById("version2Select").value;

  if (!v1 || !v2 || v1 === v2) {
    return;
  }

  try {
    const response = await apiClient.compareVersions(apiId, v1, v2);
    currentComparison = {
      v1: response.data.version1,
      v2: response.data.version2,
      changes: response.data.changes,
    };

    renderComparison();
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

**변경사항 타입:**
- `added`: 새로 추가된 항목
- `removed`: 삭제된 항목
- `modified`: 수정된 항목
- `path_version_changed`: 경로 버전이 변경된 경우 (예: `/v1/users` → `/v2/users`)

**심각도 (severity):**
- `high`: 새 endpoint 추가, 필수 파라미터 변경
- `medium`: 선택 파라미터 변경, RequestBody 수정
- `low`: 설명 변경, 메타정보 수정

---

## 에러 처리

### 에러 코드 목록

| 코드 | HTTP 상태 | 설명 | 해결 방법 |
|------|-----------|------|-----------|
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 | 요청 데이터 확인 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 | ID 확인 |
| `DUPLICATE_URL` | 400 | 중복된 URL | 다른 URL 사용 |
| `FETCH_ERROR` | 500 | Swagger JSON 다운로드 실패 | URL 확인, 네트워크 확인 |
| `INVALID_SWAGGER` | 400 | 잘못된 Swagger 형식 | Swagger JSON 형식 확인 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 | 서버 로그 확인 |
| `RATE_LIMIT_EXCEEDED` | 429 | 요청 제한 초과 | 잠시 후 재시도 |
| `INVALID_ID` | 400 | 잘못된 ID 형식 | 올바른 MongoDB ObjectId 사용 |

### 에러 처리 예시

```javascript
try {
  const response = await apiClient.getUrl(apiId);
  // 성공 처리
} catch (error) {
  // api-client.js가 자동으로 ApiError로 변환
  if (error.status === 404) {
    showToast("API를 찾을 수 없습니다", "error");
  } else if (error.status === 400) {
    showToast(`입력값 오류: ${error.message}`, "error");
  } else {
    showToast("오류가 발생했습니다", "error");
  }
}
```

### 직접 fetch 사용 시 에러 처리

```javascript
const response = await fetch('/api/urls/invalid-id');

if (!response.ok) {
  const errorData = await response.json();

  if (errorData.error) {
    console.error('에러 코드:', errorData.error.code);
    console.error('에러 메시지:', errorData.error.message);

    if (errorData.error.details) {
      console.error('상세 정보:', errorData.error.details);
    }
  }

  throw new Error(errorData.error?.message || 'API 요청 실패');
}
```

---

## 실전 예제

### 예제 1: 필터링된 API 목록 조회

```javascript
// 팀과 서비스로 필터링
async function loadFilteredApis(team, service) {
  try {
    const response = await apiClient.getUrls({
      group: team,
      service: service,
      sort: 'group service', // 팀별, 서비스별 정렬
      limit: 100
    });

    console.log(`총 ${response.meta.total}개의 API를 찾았습니다`);
    return response.data;
  } catch (error) {
    console.error('API 목록 조회 실패:', error);
    return [];
  }
}
```

### 예제 2: 검색 기능 구현

```javascript
// 검색어로 API 검색
async function searchApis(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return await apiClient.getUrls();
  }

  try {
    const response = await apiClient.getUrls({
      search: searchTerm.trim(),
      sort: '-updatedAt'
    });

    return response.data;
  } catch (error) {
    console.error('검색 실패:', error);
    throw error;
  }
}

// 사용 예시
const results = await searchApis('결제');
```

### 예제 3: 버전 비교 및 변경사항 표시

```javascript
// 두 버전 비교 및 변경사항 요약
async function compareVersions(apiId, v1, v2) {
  try {
    const response = await apiClient.compareVersions(apiId, v1, v2);
    const changes = response.data.changes;

    // 변경사항 통계
    const stats = {
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      modified: changes.filter(c => c.type === 'modified').length,
      high: changes.filter(c => c.severity === 'high').length,
    };

    console.log('변경사항 요약:', stats);

    // 높은 심각도 변경사항만 필터링
    const criticalChanges = changes.filter(c => c.severity === 'high');
    console.log('중요 변경사항:', criticalChanges);

    return response.data;
  } catch (error) {
    console.error('버전 비교 실패:', error);
    throw error;
  }
}
```

### 예제 4: Swagger JSON 다운로드

```javascript
// 특정 버전의 Swagger JSON 다운로드
async function downloadSwaggerJson(apiId, versionId, apiName) {
  try {
    const response = await apiClient.getVersion(apiId, versionId);
    const swaggerJson = response.data.swaggerJson;

    // JSON 파일로 다운로드
    const blob = new Blob([JSON.stringify(swaggerJson, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${apiName}-${versionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('다운로드 실패:', error);
    throw error;
  }
}
```

### 예제 5: 실시간 업데이트 폴링

```javascript
// 주기적으로 최신 버전 확인
async function pollForUpdates(apiId, intervalMs = 60000) {
  let lastVersionId = null;

  const checkForUpdates = async () => {
    try {
      const response = await apiClient.getVersions(apiId, { limit: 1 });

      if (response.data.versions.length > 0) {
        const latestVersion = response.data.versions[0];

        if (lastVersionId && lastVersionId !== latestVersion.versionId) {
          console.log('새 버전 발견:', latestVersion.versionId);
          // 알림 표시 또는 자동 새로고침
          showToast(`새 버전 ${latestVersion.versionId}이(가) 생성되었습니다`, 'info');
        }

        lastVersionId = latestVersion.versionId;
      }
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
    }
  };

  // 즉시 한 번 실행
  await checkForUpdates();

  // 주기적으로 실행
  setInterval(checkForUpdates, intervalMs);
}
```

---

## 추가 리소스

- [API 명세서](./api-reference.md) - 전체 API 엔드포인트 상세 문서
- [Swagger UI](../views/swagger-ui.html) - `/api-docs`에서 인터랙티브 API 문서 확인
- [기술 문서](./technical/) - 백엔드 구현 상세

---

**문서 버전:** 1.0.0
**최종 업데이트:** 2024-11-27
