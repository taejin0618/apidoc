# API 호출 가이드

> API Doc Manager 서버의 API를 호출하는 방법에 대한 실용적인 가이드

## 목차

1. [서버 정보](#서버-정보)
2. [Base URL](#base-url)
3. [응답 형식](#응답-형식)
4. [curl로 API 호출하기](#curl로-api-호출하기)
5. [JavaScript (Fetch API)로 호출하기](#javascript-fetch-api로-호출하기)
6. [Node.js (Axios)로 호출하기](#nodejs-axios로-호출하기)
7. [에러 처리](#에러-처리)
8. [실제 사용 시나리오](#실제-사용-시나리오)

---

## 서버 정보

### 기본 설정

- **기본 포트**: `3000` (환경 변수 `PORT`로 변경 가능)
- **프로토콜**: HTTP (기본) 또는 HTTPS (`USE_HTTPS=true` 설정 시)
- **바인딩 주소**: `0.0.0.0` (모든 네트워크 인터페이스에서 접근 가능)

### 서버 주소

- **로컬 접근**: `http://localhost:3000` (또는 `https://localhost:3000`)
- **외부 접근**: `https://211.39.156.53` (HTTPS 기본 포트 443 사용, 포트 생략 가능)

---

## Base URL

모든 API 엔드포인트는 다음 Base URL을 사용합니다:

**로컬 접근:**
```
http://localhost:3000/api
```

또는 HTTPS를 사용하는 경우:

```
https://localhost:3000/api
```

**외부 접근:**
```
https://211.39.156.53/api
```

> 참고: HTTPS 기본 포트는 443이므로 `https://211.39.156.53`와 `https://211.39.156.53:443`는 동일합니다.

---

## 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "meta": { /* 페이지네이션 등 메타 정보 */ },
  "message": "성공 메시지" /* 선택적 */
}
```

### 에러 응답

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

## curl로 API 호출하기

### Windows PowerShell

PowerShell에서는 따옴표 처리 방식이 다릅니다.

#### 헬스 체크

**로컬 접근:**
```powershell
curl http://localhost:3000/api/health
```

**외부 접근:**
```powershell
curl https://211.39.156.53/api/health
```

또는 `Invoke-WebRequest` 사용:

```powershell
# 로컬 접근
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET | Select-Object -ExpandProperty Content

# 외부 접근
Invoke-WebRequest -Uri "https://211.39.156.53/api/health" -Method GET | Select-Object -ExpandProperty Content
```

#### URL 목록 조회

```powershell
curl "http://localhost:3000/api/urls?page=1&limit=10"
```

필터링 예시:

```powershell
curl "http://localhost:3000/api/urls?group=backend&isActive=true&page=1&limit=10"
```

#### URL 생성 (POST)

```powershell
$body = @{
    name = "User Service API"
    url = "https://api.example.com/swagger.json"
    group = "backend"
    service = "user-service"
    description = "사용자 관리 API"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/urls" -Method POST -Body $body -ContentType "application/json"
```

또는 curl 사용:

```powershell
curl -X POST "http://localhost:3000/api/urls" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"User Service API\",\"url\":\"https://api.example.com/swagger.json\",\"group\":\"backend\",\"service\":\"user-service\",\"description\":\"사용자 관리 API\"}'
```

#### URL 상세 조회

```powershell
curl "http://localhost:3000/api/urls/65432abc123def456"
```

#### URL 수정 (PUT)

```powershell
$body = @{
    description = "수정된 설명"
    priority = "high"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/urls/65432abc123def456" -Method PUT -Body $body -ContentType "application/json"
```

#### URL 삭제 (DELETE)

```powershell
curl -X DELETE "http://localhost:3000/api/urls/65432abc123def456"
```

#### 버전 목록 조회

```powershell
curl "http://localhost:3000/api/urls/65432abc123def456/versions?page=1&limit=20"
```

#### 버전 상세 조회

```powershell
curl "http://localhost:3000/api/urls/65432abc123def456/versions/v1.0.0"
```

### Linux/Mac (Bash)

#### 헬스 체크

**로컬 접근:**
```bash
curl http://localhost:3000/api/health
```

**외부 접근:**
```bash
curl https://211.39.156.53/api/health
```

#### URL 목록 조회

```bash
curl "http://localhost:3000/api/urls?page=1&limit=10"
```

필터링 예시:

```bash
curl "http://localhost:3000/api/urls?group=backend&isActive=true&page=1&limit=10"
```

#### URL 생성 (POST)

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

#### URL 상세 조회

```bash
curl "http://localhost:3000/api/urls/65432abc123def456"
```

#### URL 수정 (PUT)

```bash
curl -X PUT "http://localhost:3000/api/urls/65432abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "수정된 설명",
    "priority": "high"
  }'
```

#### URL 삭제 (DELETE)

```bash
curl -X DELETE "http://localhost:3000/api/urls/65432abc123def456"
```

#### 버전 목록 조회

```bash
curl "http://localhost:3000/api/urls/65432abc123def456/versions?page=1&limit=20"
```

#### 버전 상세 조회

```bash
curl "http://localhost:3000/api/urls/65432abc123def456/versions/v1.0.0"
```

#### 버전 비교

```bash
curl "http://localhost:3000/api/urls/65432abc123def456/versions/v1.0.0/compare/v1.1.0"
```

---

## JavaScript (Fetch API)로 호출하기

### 기본 설정

```javascript
// 로컬 접근
const BASE_URL = 'http://localhost:3000/api';

// 외부 접근
// const BASE_URL = 'https://211.39.156.53/api';

// 헬퍼 함수: API 호출
async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API 호출 실패');
    }
    
    return data;
  } catch (error) {
    console.error('API 호출 에러:', error);
    throw error;
  }
}
```

### 헬스 체크

```javascript
async function checkHealth() {
  try {
    // BASE_URL이 설정되어 있으면 자동으로 사용됨
    const result = await apiCall('/health');
    console.log('서버 상태:', result.data);
    // { status: 'healthy', timestamp: '...', uptime: 123.456 }
  } catch (error) {
    console.error('서버 상태 확인 실패:', error);
  }
}

// 직접 URL 지정 (외부 접근 예시)
async function checkHealthExternal() {
  try {
    const response = await fetch('https://211.39.156.53/api/health');
    const result = await response.json();
    console.log('서버 상태:', result.data);
  } catch (error) {
    console.error('서버 상태 확인 실패:', error);
  }
}
```

### URL 목록 조회

```javascript
async function getUrls(filters = {}) {
  try {
    const params = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 50,
      ...(filters.group && { group: filters.group }),
      ...(filters.service && { service: filters.service }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && { search: filters.search }),
    });

    const result = await apiCall(`/urls?${params}`);
    console.log('URL 목록:', result.data);
    console.log('메타 정보:', result.meta);
    return result;
  } catch (error) {
    console.error('URL 목록 조회 실패:', error);
    throw error;
  }
}

// 사용 예시
getUrls({ group: 'backend', page: 1, limit: 10 });
```

### URL 생성

```javascript
async function createUrl(urlData) {
  try {
    const result = await apiCall('/urls', {
      method: 'POST',
      body: JSON.stringify({
        name: urlData.name,
        url: urlData.url,
        group: urlData.group,
        service: urlData.service,
        description: urlData.description || '',
        owner: urlData.owner || '',
        tags: urlData.tags || [],
        priority: urlData.priority || 'medium',
      }),
    });
    
    console.log('생성된 URL:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 생성 실패:', error);
    throw error;
  }
}

// 사용 예시
createUrl({
  name: 'User Service API',
  url: 'https://api.example.com/swagger.json',
  group: 'backend',
  service: 'user-service',
  description: '사용자 관리 API',
});
```

### URL 상세 조회

```javascript
async function getUrlById(urlId) {
  try {
    const result = await apiCall(`/urls/${urlId}`);
    console.log('URL 상세:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 조회 실패:', error);
    throw error;
  }
}
```

### URL 수정

```javascript
async function updateUrl(urlId, updateData) {
  try {
    const result = await apiCall(`/urls/${urlId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    console.log('수정된 URL:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 수정 실패:', error);
    throw error;
  }
}

// 사용 예시
updateUrl('65432abc123def456', {
  description: '수정된 설명',
  priority: 'high',
});
```

### URL 삭제

```javascript
async function deleteUrl(urlId) {
  try {
    const result = await apiCall(`/urls/${urlId}`, {
      method: 'DELETE',
    });
    
    console.log('삭제 결과:', result.message);
    return result;
  } catch (error) {
    console.error('URL 삭제 실패:', error);
    throw error;
  }
}
```

### 버전 목록 조회

```javascript
async function getVersions(urlId, page = 1, limit = 20) {
  try {
    const result = await apiCall(
      `/urls/${urlId}/versions?page=${page}&limit=${limit}`
    );
    console.log('버전 목록:', result.data.versions);
    return result.data;
  } catch (error) {
    console.error('버전 목록 조회 실패:', error);
    throw error;
  }
}
```

### 버전 상세 조회

```javascript
async function getVersion(urlId, versionId, includeSwagger = true) {
  try {
    const result = await apiCall(
      `/urls/${urlId}/versions/${versionId}?includeSwagger=${includeSwagger}`
    );
    console.log('버전 상세:', result.data);
    return result.data;
  } catch (error) {
    console.error('버전 조회 실패:', error);
    throw error;
  }
}
```

### 버전 비교

```javascript
async function compareVersions(urlId, version1, version2) {
  try {
    const result = await apiCall(
      `/urls/${urlId}/versions/${version1}/compare/${version2}`
    );
    console.log('변경사항:', result.data.changes);
    return result.data;
  } catch (error) {
    console.error('버전 비교 실패:', error);
    throw error;
  }
}
```

---

## Node.js (Axios)로 호출하기

### 설치

```bash
npm install axios
```

### 기본 설정

```javascript
const axios = require('axios');

// 로컬 접근
const BASE_URL = 'http://localhost:3000/api';

// 외부 접근
// const BASE_URL = 'https://211.39.156.53/api';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response.data, // data만 반환
  (error) => {
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      const errorData = error.response.data;
      throw new Error(errorData.error?.message || 'API 호출 실패');
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      throw new Error('서버에 연결할 수 없습니다');
    } else {
      // 요청 설정 중 에러
      throw new Error(error.message);
    }
  }
);
```

### 헬스 체크

```javascript
async function checkHealth() {
  try {
    // BASE_URL이 설정되어 있으면 자동으로 사용됨
    const result = await apiClient.get('/health');
    console.log('서버 상태:', result.data);
    return result.data;
  } catch (error) {
    console.error('서버 상태 확인 실패:', error.message);
    throw error;
  }
}

// 직접 URL 지정 (외부 접근 예시)
async function checkHealthExternal() {
  try {
    const result = await axios.get('https://211.39.156.53/api/health');
    console.log('서버 상태:', result.data);
    return result.data;
  } catch (error) {
    console.error('서버 상태 확인 실패:', error.message);
    throw error;
  }
}
```

### URL 목록 조회

```javascript
async function getUrls(filters = {}) {
  try {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 50,
      ...(filters.group && { group: filters.group }),
      ...(filters.service && { service: filters.service }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && { search: filters.search }),
    };

    const result = await apiClient.get('/urls', { params });
    console.log('URL 목록:', result.data);
    console.log('메타 정보:', result.meta);
    return result;
  } catch (error) {
    console.error('URL 목록 조회 실패:', error.message);
    throw error;
  }
}

// 사용 예시
getUrls({ group: 'backend', page: 1, limit: 10 });
```

### URL 생성

```javascript
async function createUrl(urlData) {
  try {
    const result = await apiClient.post('/urls', {
      name: urlData.name,
      url: urlData.url,
      group: urlData.group,
      service: urlData.service,
      description: urlData.description || '',
      owner: urlData.owner || '',
      tags: urlData.tags || [],
      priority: urlData.priority || 'medium',
    });
    
    console.log('생성된 URL:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 생성 실패:', error.message);
    throw error;
  }
}

// 사용 예시
createUrl({
  name: 'User Service API',
  url: 'https://api.example.com/swagger.json',
  group: 'backend',
  service: 'user-service',
  description: '사용자 관리 API',
});
```

### URL 상세 조회

```javascript
async function getUrlById(urlId) {
  try {
    const result = await apiClient.get(`/urls/${urlId}`);
    console.log('URL 상세:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 조회 실패:', error.message);
    throw error;
  }
}
```

### URL 수정

```javascript
async function updateUrl(urlId, updateData) {
  try {
    const result = await apiClient.put(`/urls/${urlId}`, updateData);
    console.log('수정된 URL:', result.data);
    return result.data;
  } catch (error) {
    console.error('URL 수정 실패:', error.message);
    throw error;
  }
}

// 사용 예시
updateUrl('65432abc123def456', {
  description: '수정된 설명',
  priority: 'high',
});
```

### URL 삭제

```javascript
async function deleteUrl(urlId) {
  try {
    const result = await apiClient.delete(`/urls/${urlId}`);
    console.log('삭제 결과:', result.message);
    return result;
  } catch (error) {
    console.error('URL 삭제 실패:', error.message);
    throw error;
  }
}
```

### 버전 목록 조회

```javascript
async function getVersions(urlId, page = 1, limit = 20) {
  try {
    const result = await apiClient.get(`/urls/${urlId}/versions`, {
      params: { page, limit },
    });
    console.log('버전 목록:', result.data.versions);
    return result.data;
  } catch (error) {
    console.error('버전 목록 조회 실패:', error.message);
    throw error;
  }
}
```

### 버전 상세 조회

```javascript
async function getVersion(urlId, versionId, includeSwagger = true) {
  try {
    const result = await apiClient.get(
      `/urls/${urlId}/versions/${versionId}`,
      {
        params: { includeSwagger },
      }
    );
    console.log('버전 상세:', result.data);
    return result.data;
  } catch (error) {
    console.error('버전 조회 실패:', error.message);
    throw error;
  }
}
```

### 버전 비교

```javascript
async function compareVersions(urlId, version1, version2) {
  try {
    const result = await apiClient.get(
      `/urls/${urlId}/versions/${version1}/compare/${version2}`
    );
    console.log('변경사항:', result.data.changes);
    return result.data;
  } catch (error) {
    console.error('버전 비교 실패:', error.message);
    throw error;
  }
}
```

---

## 에러 처리

### JavaScript (Fetch API)

```javascript
async function apiCallWithErrorHandling(endpoint, options = {}) {
  const BASE_URL = 'http://localhost:3000/api';
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // 에러 응답 처리
      if (data.error) {
        switch (data.error.code) {
          case 'VALIDATION_ERROR':
            console.error('유효성 검사 실패:', data.error.details);
            break;
          case 'NOT_FOUND':
            console.error('리소스를 찾을 수 없습니다:', data.error.message);
            break;
          case 'RATE_LIMIT_EXCEEDED':
            console.error('요청 한도 초과:', data.error.message);
            break;
          default:
            console.error('에러 발생:', data.error.message);
        }
      }
      throw new Error(data.error?.message || 'API 호출 실패');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('네트워크 에러: 서버에 연결할 수 없습니다');
    } else {
      console.error('API 호출 에러:', error.message);
    }
    throw error;
  }
}
```

### Node.js (Axios)

```javascript
const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 에러 처리 예시
async function handleApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      const errorData = error.response.data;
      
      if (errorData.error) {
        switch (errorData.error.code) {
          case 'VALIDATION_ERROR':
            console.error('유효성 검사 실패:', errorData.error.details);
            break;
          case 'NOT_FOUND':
            console.error('리소스를 찾을 수 없습니다:', errorData.error.message);
            break;
          case 'RATE_LIMIT_EXCEEDED':
            console.error('요청 한도 초과:', errorData.error.message);
            break;
          default:
            console.error('에러 발생:', errorData.error.message);
        }
      }
      
      throw new Error(errorData.error?.message || 'API 호출 실패');
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      console.error('서버에 연결할 수 없습니다');
      throw new Error('서버에 연결할 수 없습니다');
    } else {
      // 요청 설정 중 에러
      console.error('요청 설정 에러:', error.message);
      throw error;
    }
  }
}

// 사용 예시
handleApiCall(() => apiClient.get('/urls/123'))
  .then((result) => console.log('성공:', result))
  .catch((error) => console.error('실패:', error.message));
```

---

## 실제 사용 시나리오

### 시나리오 1: 새로운 API URL 등록 및 초기 버전 가져오기

```javascript
async function registerNewApi(apiInfo) {
  try {
    // 1. URL 등록
    const createResult = await apiCall('/urls', {
      method: 'POST',
      body: JSON.stringify({
        name: apiInfo.name,
        url: apiInfo.swaggerUrl,
        group: apiInfo.group,
        service: apiInfo.service,
        description: apiInfo.description,
      }),
    });

    const urlId = createResult.data._id;
    console.log('URL 등록 완료:', urlId);

    // 2. Swagger JSON 가져오기
    const fetchResult = await apiCall(`/urls/${urlId}/fetch`, {
      method: 'POST',
    });

    console.log('Swagger JSON 가져오기 완료:', fetchResult.message);
    return { urlId, fetchResult };
  } catch (error) {
    console.error('API 등록 실패:', error);
    throw error;
  }
}
```

### 시나리오 2: 특정 그룹의 모든 API 목록 조회 및 최신 버전 확인

```javascript
async function getGroupApisWithLatestVersions(groupName) {
  try {
    // 1. 그룹별 URL 목록 조회
    const urlsResult = await apiCall(`/urls?group=${groupName}&isActive=true`);
    const urls = urlsResult.data;

    // 2. 각 URL의 최신 버전 조회
    const apisWithVersions = await Promise.all(
      urls.map(async (url) => {
        try {
          const versionResult = await apiCall(
            `/urls/${url._id}/versions/latest`
          );
          return {
            ...url,
            latestVersion: versionResult.data,
          };
        } catch (error) {
          console.warn(`URL ${url._id}의 버전 조회 실패:`, error.message);
          return {
            ...url,
            latestVersion: null,
          };
        }
      })
    );

    return apisWithVersions;
  } catch (error) {
    console.error('그룹 API 조회 실패:', error);
    throw error;
  }
}
```

### 시나리오 3: 버전 변경사항 모니터링

```javascript
async function monitorVersionChanges(urlId, checkInterval = 60000) {
  let lastVersionId = null;

  const checkChanges = async () => {
    try {
      // 최신 버전 조회
      const result = await apiCall(`/urls/${urlId}/versions/latest`);
      const currentVersion = result.data;

      if (lastVersionId && lastVersionId !== currentVersion.versionId) {
        // 버전이 변경됨
        console.log('새 버전 감지:', currentVersion.versionId);

        // 변경사항 조회
        const diffResult = await apiCall(
          `/urls/${urlId}/versions/${currentVersion.versionId}/diff`
        );

        console.log('변경사항:', diffResult.data.changes);
        // 알림 전송 등의 작업 수행
      }

      lastVersionId = currentVersion.versionId;
    } catch (error) {
      console.error('버전 확인 실패:', error);
    }
  };

  // 즉시 한 번 실행
  await checkChanges();

  // 주기적으로 확인
  setInterval(checkChanges, checkInterval);
}
```

### 시나리오 4: 대량 URL 등록 (배치 처리)

```javascript
async function batchRegisterUrls(urlsData) {
  const results = {
    success: [],
    failed: [],
  };

  for (const urlData of urlsData) {
    try {
      const result = await apiCall('/urls', {
        method: 'POST',
        body: JSON.stringify(urlData),
      });

      results.success.push({
        input: urlData,
        output: result.data,
      });

      console.log(`✅ 등록 성공: ${urlData.name}`);
    } catch (error) {
      results.failed.push({
        input: urlData,
        error: error.message,
      });

      console.error(`❌ 등록 실패: ${urlData.name} - ${error.message}`);
    }

    // API 부하 방지를 위한 딜레이
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n총 ${urlsData.length}개 중 ${results.success.length}개 성공, ${results.failed.length}개 실패`);
  return results;
}
```

---

## 추가 팁

### 1. 환경 변수 사용

```javascript
// .env 파일
// 로컬 접근
// API_BASE_URL=http://localhost:3000/api

// 외부 접근
// API_BASE_URL=https://211.39.156.53/api

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
```

### 2. 요청 재시도 로직

```javascript
async function apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall(endpoint, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 지수 백오프: 1초, 2초, 4초
      const delay = Math.pow(2, i) * 1000;
      console.log(`${delay}ms 후 재시도... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

### 3. 요청 캐싱

```javascript
const cache = new Map();
const CACHE_TTL = 60000; // 1분

async function apiCallWithCache(endpoint, options = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await apiCall(endpoint, options);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}
```

---

## 참고 자료

- [API 명세서](./docs/api-reference.md) - 전체 API 엔드포인트 상세 문서
- [서버 설정](./server.js) - 서버 구성 및 포트 설정
- [라우트 구조](./docs/technical/routes.md) - API 라우트 구조 상세

---

**마지막 업데이트**: 2024-11-27

