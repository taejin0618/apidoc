# 프론트엔드 개발자용 API 가이드

## 📖 개요

이 문서는 **프론트엔드 개발자**가 API Doc Manager의 REST API를 사용하는 방법을 설명합니다.

모든 API는 JSON 형식의 요청/응답을 사용하며, 기본 URL은 `http://localhost:3000/api`입니다.

---

## 🚀 빠른 시작

### API 기본 정보

| 항목 | 값 |
|------|-----|
| **기본 URL** | `http://localhost:3000/api` |
| **문서** | `http://localhost:3000/api-docs` (Swagger UI) |
| **OpenAPI 스펙** | `http://localhost:3000/api/openapi.json` |
| **응답 형식** | JSON |
| **타임아웃** | 30초 |

### 응답 형식

모든 API 응답은 다음 구조를 따릅니다:

```json
{
  "success": true,
  "data": {},
  "message": "성공 메시지",
  "meta": {}
}
```

**에러 응답:**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "에러 메시지",
  "details": []
}
```

---

## 🔗 URL 관리 API

URL을 등록하고 관리하는 API입니다.

### 1. URL 목록 조회

**요청:**
```http
GET /urls
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|-----|
| `group` | string | ✗ | 그룹 필터링 |
| `search` | string | ✗ | 이름/설명 검색 |
| `page` | integer | ✗ | 페이지 번호 (기본값: 1) |
| `limit` | integer | ✗ | 페이지당 개수 (기본값: 20) |

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "CEO Service API",
      "url": "http://api.example.com/swagger.json",
      "group": "backend",
      "isActive": true,
      "versionCount": 5,
      "lastFetchedAt": "2024-01-20T10:30:00Z",
      "lastFetchStatus": "success"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

**JavaScript 예시:**
```javascript
async function fetchUrls(group) {
  const params = new URLSearchParams();
  if (group) params.append('group', group);

  const response = await fetch(`/api/urls?${params}`);
  const result = await response.json();

  if (result.success) {
    console.log('URL 목록:', result.data);
  }
}

fetchUrls('backend');
```

---

### 2. 새 URL 등록

**요청:**
```http
POST /urls
Content-Type: application/json

{
  "name": "CEO Service API",
  "url": "http://api.example.com/swagger.json",
  "group": "backend",
  "owner": "dev@example.com",
  "description": "경영진 서비스 API"
}
```

**요청 본문:**
| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|-----|
| `name` | string | ✓ | 1-100자 | API 이름 |
| `url` | string | ✓ | 유효한 URL | Swagger JSON URL |
| `group` | string | ✗ | 1-50자 | 팀/그룹명 |
| `owner` | string | ✗ | 유효한 이메일 | 담당자 이메일 |
| `description` | string | ✗ | 1-500자 | 설명 |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "CEO Service API",
    "url": "http://api.example.com/swagger.json",
    "group": "backend",
    "isActive": true,
    "versionCount": 0,
    "createdAt": "2024-01-20T10:30:00Z"
  },
  "message": "URL이 등록되었습니다"
}
```

**에러 응답:**
```json
{
  "success": false,
  "code": "INVALID_SWAGGER",
  "message": "유효한 OpenAPI/Swagger 문서가 아닙니다"
}
```

**JavaScript 예시:**
```javascript
async function addUrl(urlData) {
  try {
    const response = await fetch('/api/urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: urlData.name,
        url: urlData.url,
        group: urlData.group,
        owner: urlData.owner,
        description: urlData.description
      })
    });

    const result = await response.json();
    if (result.success) {
      alert('URL 등록 완료!');
      return result.data;
    } else {
      alert(`에러: ${result.message}`);
    }
  } catch (error) {
    console.error('요청 실패:', error);
  }
}

addUrl({
  name: 'My API',
  url: 'http://api.example.com/swagger.json',
  group: 'backend',
  owner: 'dev@example.com',
  description: 'API 설명'
});
```

---

### 3. URL 상세 조회

**요청:**
```http
GET /urls/{id}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "CEO Service API",
    "url": "http://api.example.com/swagger.json",
    "group": "backend",
    "owner": "dev@example.com",
    "description": "경영진 서비스 API",
    "isActive": true,
    "versionCount": 5,
    "lastFetchedAt": "2024-01-20T10:30:00Z",
    "lastFetchStatus": "success",
    "createdAt": "2024-01-15T14:20:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  }
}
```

---

### 4. URL 수정

**요청:**
```http
PUT /urls/{id}
Content-Type: application/json

{
  "name": "CEO Service API v2",
  "group": "backend",
  "owner": "dev@example.com",
  "description": "경영진 서비스 API - 업데이트됨"
}
```

**응답:**
```json
{
  "success": true,
  "message": "URL이 수정되었습니다",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "CEO Service API v2",
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

---

### 5. URL 삭제

**요청:**
```http
DELETE /urls/{id}
```

**응답:**
```json
{
  "success": true,
  "message": "URL이 삭제되었습니다"
}
```

---

### 6. 활성화/비활성화 토글

**요청:**
```http
PATCH /urls/{id}/activate
```

**응답:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isActive": false,
    "message": "비활성화되었습니다"
  }
}
```

---

### 7. Swagger JSON 수동 다운로드

**요청:**
```http
POST /urls/{id}/fetch
```

**응답:**
```json
{
  "success": true,
  "data": {
    "created": false,
    "updated": true,
    "message": "버전이 업데이트되었습니다",
    "version": {
      "versionId": "v1",
      "versionNumber": 3,
      "revisionCount": 2,
      "changesCount": 5,
      "summary": "3개 추가, 1개 삭제, 2개 수정",
      "lastUpdatedAt": "2024-01-20T11:30:00Z"
    }
  }
}
```

**JavaScript 예시:**
```javascript
async function refreshSwagger(urlId) {
  try {
    const response = await fetch(`/api/urls/${urlId}/fetch`, {
      method: 'POST'
    });
    const result = await response.json();

    if (result.success) {
      if (result.data.created) {
        alert('새로운 버전이 생성되었습니다!');
      } else if (result.data.updated) {
        alert(`버전이 업데이트되었습니다: ${result.data.version.summary}`);
      } else {
        alert('변경사항이 없습니다');
      }
    }
  } catch (error) {
    console.error('새로고침 실패:', error);
  }
}
```

---

## 📊 버전 관리 API

Swagger 버전을 조회하고 비교하는 API입니다.

### 1. URL별 버전 목록 조회

**요청:**
```http
GET /urls/{id}/versions?page=1&limit=20
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "versionId": "v1",
      "versionNumber": 3,
      "majorVersion": "v1",
      "revisionCount": 2,
      "endpointCount": 45,
      "summary": "3개 추가, 1개 삭제",
      "lastUpdatedAt": "2024-01-20T11:30:00Z",
      "createdAt": "2024-01-15T14:20:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

### 2. 버전 상세 조회

**요청:**
```http
GET /urls/{id}/versions/{versionId}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "versionId": "v1",
    "versionNumber": 3,
    "revisionCount": 2,
    "endpointCount": 45,
    "summary": "3개 추가, 1개 삭제",
    "changes": [
      {
        "type": "added",
        "path": "/api/users/{id}/profile",
        "method": "GET",
        "severity": "high",
        "detail": "새로운 엔드포인트 추가",
        "recordedAt": "2024-01-20T11:30:00Z"
      }
    ],
    "lastUpdatedAt": "2024-01-20T11:30:00Z"
  }
}
```

---

### 3. 두 버전 비교

**요청:**
```http
GET /urls/{id}/versions/{v1}/compare/{v2}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "from": {
      "versionId": "v1",
      "versionNumber": 1,
      "createdAt": "2024-01-15T14:20:00Z"
    },
    "to": {
      "versionId": "v1",
      "versionNumber": 3,
      "createdAt": "2024-01-20T11:30:00Z"
    },
    "changes": [
      {
        "type": "added",
        "path": "/api/users/{id}/profile",
        "method": "GET",
        "severity": "high",
        "detail": "새로운 엔드포인트"
      },
      {
        "type": "modified",
        "path": "/api/users",
        "method": "GET",
        "severity": "medium",
        "detail": "쿼리 파라미터 추가: filter"
      }
    ],
    "summary": {
      "added": 3,
      "removed": 1,
      "modified": 2,
      "severity_high": 2,
      "severity_medium": 2,
      "severity_low": 2
    }
  }
}
```

**JavaScript 예시:**
```javascript
async function compareVersions(urlId, v1, v2) {
  try {
    const response = await fetch(
      `/api/urls/${urlId}/versions/${v1}/compare/${v2}`
    );
    const result = await response.json();

    if (result.success) {
      const { changes, summary } = result.data;
      console.log(`변경사항: ${summary.added}개 추가, ${summary.removed}개 삭제`);

      changes.forEach(change => {
        console.log(`[${change.severity}] ${change.type}: ${change.path}`);
      });
    }
  } catch (error) {
    console.error('비교 실패:', error);
  }
}

compareVersions('507f...', 'v1/1', 'v1/3');
```

---

### 4. 최신 N개 버전 조회

**요청:**
```http
GET /versions/latest/{count}
```

**파라미터:**
| 파라미터 | 타입 | 제약 | 설명 |
|---------|------|------|-----|
| `count` | integer | 1-100 | 반환할 최신 버전 개수 |

**응답:**
```json
{
  "success": true,
  "data": [
    {
      "urlId": "507f1f77bcf86cd799439011",
      "apiName": "CEO Service API",
      "versionId": "v1",
      "versionNumber": 3,
      "summary": "3개 추가, 1개 삭제",
      "changesCount": 4,
      "lastUpdatedAt": "2024-01-20T11:30:00Z"
    }
  ]
}
```

---

## ⚠️ 에러 처리

### 에러 코드

| 코드 | HTTP | 설명 |
|------|------|-----|
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `DUPLICATE_ERROR` | 400 | 중복된 값 |
| `INVALID_SWAGGER` | 400 | 유효하지 않은 Swagger 문서 |
| `TIMEOUT` | 408 | 요청 타임아웃 |
| `CONNECTION_FAILED` | 503 | 서버 연결 거부 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 |

### 에러 응답 예시

```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "URL을 찾을 수 없습니다",
  "details": []
}
```

### JavaScript 에러 처리

```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!result.success) {
      // 에러 처리
      switch (result.code) {
        case 'NOT_FOUND':
          console.error('리소스를 찾을 수 없습니다');
          break;
        case 'VALIDATION_ERROR':
          console.error('입력값이 유효하지 않습니다:', result.details);
          break;
        case 'TIMEOUT':
          console.error('요청이 타임아웃되었습니다');
          break;
        default:
          console.error(result.message);
      }
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('네트워크 오류:', error);
    return null;
  }
}
```

---

## 🔧 클라이언트 라이브러리 예시

### Fetch API 래퍼

```javascript
class ApiDocManagerClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 요청 실패: ${endpoint}`, error);
      throw error;
    }
  }

  // URL API
  async getUrls(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/urls?${query}`);
  }

  async createUrl(data) {
    return this.request('/urls', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getUrl(id) {
    return this.request(`/urls/${id}`);
  }

  async updateUrl(id, data) {
    return this.request(`/urls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteUrl(id) {
    return this.request(`/urls/${id}`, { method: 'DELETE' });
  }

  async toggleUrl(id) {
    return this.request(`/urls/${id}/activate`, { method: 'PATCH' });
  }

  async refreshUrl(id) {
    return this.request(`/urls/${id}/fetch`, { method: 'POST' });
  }

  // Version API
  async getVersions(urlId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/urls/${urlId}/versions?${query}`);
  }

  async getVersion(urlId, versionId) {
    return this.request(`/urls/${urlId}/versions/${versionId}`);
  }

  async compareVersions(urlId, v1, v2) {
    return this.request(`/urls/${urlId}/versions/${v1}/compare/${v2}`);
  }

  async getLatestVersions(count = 10) {
    return this.request(`/versions/latest/${count}`);
  }
}

// 사용 예시
const client = new ApiDocManagerClient('/api');

// URL 목록 조회
const urls = await client.getUrls({ group: 'backend' });
console.log(urls.data);

// URL 생성
const newUrl = await client.createUrl({
  name: 'My API',
  url: 'http://api.example.com/swagger.json',
  group: 'backend'
});

// 버전 비교
const comparison = await client.compareVersions(
  '507f1f77bcf86cd799439011',
  'v1/1',
  'v1/3'
);
console.log(comparison.data.summary);
```

---

## 🔄 CORS 설정

기본적으로 CORS는 `.env`의 `CORS_ORIGIN` 설정에 따릅니다.

**`.env` 설정:**
```env
# 단일 도메인
CORS_ORIGIN=http://localhost:3000

# 여러 도메인 (쉼표로 구분)
CORS_ORIGIN=http://localhost:3000,http://localhost:8080,https://example.com
```

**개발 환경:**
```env
CORS_ORIGIN=*
```

---

## 📚 추가 리소스

- **Swagger UI**: http://localhost:3000/api-docs
- **ReDoc**: http://localhost:3000/redoc
- **OpenAPI JSON**: http://localhost:3000/api/openapi.json
- **GitHub**: [프로젝트 저장소]

---

## 💬 문제 해결

### Q: CORS 에러가 발생합니다

**A:** `.env` 파일의 `CORS_ORIGIN` 설정을 확인하세요.

```env
# 프론트엔드 도메인을 추가하세요
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
```

### Q: API 응답이 느립니다

**A:** 대량의 URL이 등록된 경우 페이지네이션을 사용하세요.

```javascript
const urls = await client.getUrls({ limit: 20, page: 1 });
```

### Q: Swagger 다운로드에 실패했습니다

**A:** Swagger URL이 유효한지 확인하세요.

```bash
curl http://your-api.com/swagger.json
```

---

**마지막 업데이트**: 2024년 1월 20일
