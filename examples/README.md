# 예제 Swagger JSON 데이터

이 디렉토리에는 변경사항 추적 기능을 테스트하기 위한 예제 Swagger JSON 파일들이 포함되어 있습니다.

## 파일 설명

### swagger-v1.json
- **버전**: 1.0.0
- **엔드포인트**: 3개
  - `GET /users` - 사용자 목록 조회
  - `POST /users` - 사용자 생성
  - `GET /users/{userId}` - 사용자 상세 조회
- **스키마**: User, CreateUserRequest, UserListResponse

### swagger-v2.json
- **버전**: 2.0.0
- **변경사항**:
  - ✅ `GET /users`에 `status` 파라미터 추가
  - ✅ `page`, `limit` 파라미터에 validation 추가 (minimum, maximum)
  - ✅ `POST /users`에 400 에러 응답 추가
  - ✅ `PUT /users/{userId}` 엔드포인트 추가 (새로 추가됨)
  - ✅ `GET /users/{userId}/profile` 엔드포인트 추가 (새로 추가됨)
  - ✅ User 스키마에 `status` 필드 추가
  - ✅ CreateUserRequest에 validation 추가 (minLength, maxLength)
  - ✅ UpdateUserRequest 스키마 추가
  - ✅ UserProfile 스키마 추가
  - ✅ Error 스키마 추가

### swagger-v3.json
- **버전**: 3.0.0
- **변경사항**:
  - ✅ `GET /users`에 `role` 파라미터 추가
  - ✅ `GET /users/{userId}`에 `includeProfile` 파라미터 추가
  - ✅ `DELETE /users/{userId}` 엔드포인트 추가 (새로 추가됨)
  - ❌ `GET /users/{userId}/profile` 엔드포인트 삭제됨
  - ✅ User 스키마에 `role`, `updatedAt` 필드 추가
  - ✅ CreateUserRequest에 `role` 필드 추가
  - ✅ UpdateUserRequest에 `role` 필드 추가
  - ✅ UserDetailResponse 스키마 추가
  - ✅ UserListResponse에 `page`, `limit` 필드 추가
  - ✅ UserProfile의 `bio` 필드에 maxLength 추가
  - ✅ Error 스키마에 `details` 필드 추가

## 사용 방법

### 방법 1: API를 통해 추가하기

1. 먼저 API URL을 등록합니다:
```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Management API (예제)",
    "url": "http://localhost:3000/examples/swagger-v1.json",
    "group": "example",
    "description": "변경사항 추적 테스트용 예제 API"
  }'
```

2. 등록된 API의 ID를 확인합니다.

3. "지금 확인" 버튼을 클릭하여 v1을 가져옵니다.

4. `swagger-v2.json`과 `swagger-v3.json`을 순서대로 서버에 배치하고 다시 "지금 확인"을 클릭하여 버전을 생성합니다.

### 방법 2: MongoDB에 직접 추가하기

1. MongoDB에 연결합니다:
```bash
mongosh
```

2. 예제 데이터를 읽어서 API URL을 생성합니다:
```javascript
use apidoc

// API URL 생성
db.api_urls.insertOne({
  name: "User Management API (예제)",
  url: "http://localhost:3000/examples/swagger-v1.json",
  group: "example",
  description: "변경사항 추적 테스트용 예제 API",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

3. 각 버전의 Swagger JSON을 읽어서 버전을 생성합니다:
```javascript
// v1 버전 (예제 파일을 읽어서 사용)
const v1Json = require('./swagger-v1.json')
const urlDoc = db.api_urls.findOne({ name: "User Management API (예제)" })

db.api_versions.insertOne({
  urlId: urlDoc._id,
  versionId: "v1",
  versionNumber: 1,
  timestamp: new Date("2025-01-20T10:00:00Z"),
  swaggerJson: v1Json,
  changes: [],
  createdAt: new Date()
})

// v2 버전
const v2Json = require('./swagger-v2.json')
const v1Version = db.api_versions.findOne({ versionId: "v1" })

db.api_versions.insertOne({
  urlId: urlDoc._id,
  versionId: "v2",
  versionNumber: 2,
  timestamp: new Date("2025-01-21T10:00:00Z"),
  swaggerJson: v2Json,
  previousVersionId: v1Version._id,
  changes: [], // 실제로는 diffService.analyzeChanges()로 생성
  createdAt: new Date()
})

// v3 버전
const v3Json = require('./swagger-v3.json')
const v2Version = db.api_versions.findOne({ versionId: "v2" })

db.api_versions.insertOne({
  urlId: urlDoc._id,
  versionId: "v3",
  versionNumber: 3,
  timestamp: new Date("2025-01-22T10:00:00Z"),
  swaggerJson: v3Json,
  previousVersionId: v2Version._id,
  changes: [], // 실제로는 diffService.analyzeChanges()로 생성
  createdAt: new Date()
})
```

### 방법 3: Express 서버에서 정적 파일로 제공하기

1. `server.js`에 정적 파일 서빙을 추가합니다:
```javascript
app.use('/examples', express.static('examples'));
```

2. 예제 파일들을 웹에서 접근 가능하게 만듭니다.

3. API URL을 등록할 때 `http://localhost:3000/examples/swagger-v1.json` 형식으로 사용합니다.

## 변경사항 요약

### v1 → v2
- **추가됨**: 2개 엔드포인트 (PUT /users/{userId}, GET /users/{userId}/profile)
- **수정됨**: GET /users 파라미터, POST /users 응답, User 스키마
- **추가됨**: 4개 스키마 (UpdateUserRequest, UserProfile, Error)

### v2 → v3
- **추가됨**: 1개 엔드포인트 (DELETE /users/{userId})
- **삭제됨**: 1개 엔드포인트 (GET /users/{userId}/profile)
- **수정됨**: GET /users 파라미터, GET /users/{userId} 파라미터 및 응답
- **수정됨**: User, CreateUserRequest, UpdateUserRequest, UserListResponse, Error 스키마
- **추가됨**: UserDetailResponse 스키마

## 테스트 시나리오

1. **엔드포인트 추가 테스트**: v1 → v2에서 PUT /users/{userId} 추가 확인
2. **엔드포인트 삭제 테스트**: v2 → v3에서 GET /users/{userId}/profile 삭제 확인
3. **파라미터 추가 테스트**: 각 버전에서 파라미터 추가 확인
4. **스키마 변경 테스트**: User 스키마에 필드 추가/수정 확인
5. **응답 변경 테스트**: 응답 스키마 변경 확인

## 참고사항

- 모든 파일은 OpenAPI 3.0 형식을 따릅니다.
- 실제 API 서버가 필요하지 않으며, Swagger JSON만 있으면 됩니다.
- 변경사항은 `src/services/diffService.js`의 `analyzeChanges()` 함수로 자동 분석됩니다.
