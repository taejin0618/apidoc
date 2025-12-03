# 데이터베이스 상세

> MongoDB 연결 설정 및 데이터베이스 전략 상세 설명

## 목차

1. [데이터베이스 연결](#데이터베이스-연결)
2. [컬렉션 구조](#컬렉션-구조)
3. [인덱스 전략](#인덱스-전략)
4. [쿼리 최적화](#쿼리-최적화)
5. [데이터 마이그레이션](#데이터-마이그레이션)

---

## 데이터베이스 연결

### 연결 설정 (`src/config/database.js`)

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,        // 최대 연결 수
      minPoolSize: 10,        // 최소 연결 수
      serverSelectionTimeoutMS: 5000,  // 서버 선택 타임아웃
    });

    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB 연결 실패: ${error.message}`);
    process.exit(1);
  }
};
```

### 연결 옵션

| 옵션 | 값 | 설명 |
|------|-----|------|
| `maxPoolSize` | 50 | 최대 연결 풀 크기 |
| `minPoolSize` | 10 | 최소 연결 풀 크기 |
| `serverSelectionTimeoutMS` | 5000 | 서버 선택 타임아웃 (5초) |

### 연결 이벤트 리스너

```javascript
// 연결 에러
mongoose.connection.on("error", (err) => {
  console.error(`❌ MongoDB 연결 에러: ${err.message}`);
});

// 연결 끊김
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB 연결이 끊어졌습니다.");
});

// 재연결 성공
mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB 재연결 성공");
});
```

### 환경 변수

**MONGODB_URI 형식:**
```
mongodb://[username:password@]host[:port][/database][?options]
```

**예시:**
- 로컬: `mongodb://localhost:27017/api-doc-manager`
- Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/api-doc-manager?retryWrites=true&w=majority`

---

## 컬렉션 구조

### apiurls 컬렉션

**모델:** `ApiUrl`

**문서 구조:**
```javascript
{
  _id: ObjectId,
  name: String,
  url: String (unique),
  group: String (lowercase),
  service: String (lowercase),
  description: String,
  isActive: Boolean,
  lastFetchedAt: Date,
  lastFetchStatus: String,  // 'pending' | 'success' | 'error'
  errorMessage: String,
  owner: String,
  tags: [String],
  priority: String,  // 'low' | 'medium' | 'high'
  versionCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:**
- `url`: unique
- `group`: 단일
- `service`: 단일
- `isActive`: 단일
- `lastFetchStatus`: 단일
- `name, description`: text

---

### apiversions 컬렉션

**모델:** `ApiVersion`

**문서 구조:**
```javascript
{
  _id: ObjectId,
  urlId: ObjectId (ref: ApiUrl),
  versionId: String,  // 'v1', 'v2'
  versionNumber: Number,
  majorVersion: String,
  revisionCount: Number,
  timestamp: Date,
  lastUpdatedAt: Date,
  swaggerJson: Mixed,  // 완전한 Swagger JSON
  changes: [Change],
  changeHistory: [{
    updatedAt: Date,
    changesCount: Number,
    summary: String
  }],
  previousVersionId: ObjectId (ref: ApiVersion),
  endpointCount: Number,
  parameterCount: Number,
  summary: String,
  createdAt: Date
}
```

**Change 서브도큐먼트:**
```javascript
{
  _id: ObjectId,
  type: String,  // 'added' | 'removed' | 'modified' | 'path_version_changed'
  category: String,
  path: String,
  field: String,
  oldValue: Mixed,
  newValue: Mixed,
  description: String,
  severity: String,  // 'low' | 'medium' | 'high'
  recordedAt: Date,
  metadata: Mixed
}
```

**인덱스:**
- `urlId + versionNumber`: 복합 (내림차순)
- `urlId + timestamp`: 복합 (내림차순)
- `urlId + majorVersion`: 복합

---

### auditlogs 컬렉션

**모델:** `AuditLog`

**문서 구조:**
```javascript
{
  _id: ObjectId,
  action: String,  // enum
  urlId: ObjectId (ref: ApiUrl, nullable),
  versionId: ObjectId (ref: ApiVersion, nullable),
  user: String,  // 기본: 'system'
  status: String,  // 'success' | 'error' | 'pending'
  details: Mixed,
  errorMessage: String,
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

**인덱스:**
- `timestamp`: 단일 (-1)
- `urlId + timestamp`: 복합
- `action + timestamp`: 복합
- `timestamp`: TTL (90일 후 자동 삭제)

---

## 인덱스 전략

### 단일 인덱스

**ApiUrl:**
```javascript
apiUrlSchema.index({ group: 1 });
apiUrlSchema.index({ service: 1 });
apiUrlSchema.index({ isActive: 1 });
apiUrlSchema.index({ lastFetchStatus: 1 });
```

**ApiVersion:**
```javascript
apiVersionSchema.index({ timestamp: -1 });
```

**AuditLog:**
```javascript
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
```

### Unique 인덱스

**ApiUrl:**
```javascript
apiUrlSchema.index({ url: 1 }, { unique: true });
```

### 복합 인덱스

**ApiVersion:**
```javascript
// URL별 버전 정렬 (가장 많이 사용)
apiVersionSchema.index({ urlId: 1, versionNumber: -1 });

// URL별 시간순 조회
apiVersionSchema.index({ urlId: 1, timestamp: -1 });

// URL별 메이저 버전 조회
apiVersionSchema.index({ urlId: 1, majorVersion: 1 });
```

**AuditLog:**
```javascript
// URL별 이력 조회
auditLogSchema.index({ urlId: 1, timestamp: -1 });
```

### 텍스트 검색 인덱스

**ApiUrl:**
```javascript
apiUrlSchema.index({ name: 'text', description: 'text' });
```

**사용 예:**
```javascript
const urls = await ApiUrl.find({
  $text: { $search: 'user' }
});
```

### TTL 인덱스

**AuditLog:**
```javascript
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }  // 90일
);
```

**동작:**
- MongoDB가 주기적으로 만료된 문서 삭제
- 백그라운드 작업으로 실행

---

## 쿼리 최적화

### Lean 쿼리

Mongoose Document 대신 Plain Object 반환:

```javascript
// 일반 쿼리 (느림)
const url = await ApiUrl.findById(id);
// → Mongoose Document 반환 (메모리 사용량 많음)

// Lean 쿼리 (빠름)
const url = await ApiUrl.findById(id).lean();
// → Plain JavaScript Object 반환
```

**사용 시기:**
- 조회 전용 쿼리
- 수정이 필요 없는 데이터

**성능 향상:**
- 메모리 사용량 감소
- 조회 속도 향상 (약 2-3배)

---

### 프로젝션

필요한 필드만 조회:

```javascript
// swaggerJson 제외 (용량 절약)
const versions = await ApiVersion.find(
  { urlId },
  { swaggerJson: 0 }
).lean();
```

**효과:**
- 네트워크 트래픽 감소
- 메모리 사용량 감소
- 조회 속도 향상

---

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

**권장 limit:**
- 버전 목록: 20
- URL 목록: 50

---

### 병렬 쿼리

독립적인 쿼리는 `Promise.all`로 병렬 실행:

```javascript
// 순차 실행 (느림)
const url = await ApiUrl.findById(urlId);
const versions = await ApiVersion.find({ urlId });

// 병렬 실행 (빠름)
const [url, versions] = await Promise.all([
  ApiUrl.findById(urlId).lean(),
  ApiVersion.find({ urlId }).lean()
]);
```

---

### Aggregation Pipeline

복잡한 쿼리는 Aggregation 사용:

**예시: 모든 URL의 최신 버전 조회**
```javascript
const versions = await ApiVersion.aggregate([
  { $sort: { timestamp: -1 } },
  {
    $group: {
      _id: '$urlId',
      latestVersion: { $first: '$$ROOT' },
    },
  },
  { $replaceRoot: { newRoot: '$latestVersion' } },
  { $sort: { timestamp: -1 } },
  { $limit: parseInt(limit) },
  {
    $lookup: {
      from: 'apiurls',
      localField: 'urlId',
      foreignField: '_id',
      as: 'apiUrl',
    },
  },
  { $unwind: '$apiUrl' },
  {
    $project: {
      swaggerJson: 0,
    },
  },
]);
```

**단계 설명:**
1. `$sort`: timestamp 내림차순 정렬
2. `$group`: urlId별로 그룹화, 첫 번째 버전 선택
3. `$replaceRoot`: latestVersion을 루트로
4. `$sort`: timestamp 내림차순 정렬
5. `$limit`: limit 개수만큼 제한
6. `$lookup`: ApiUrl 정보 조인
7. `$unwind`: apiUrl 배열 해제
8. `$project`: swaggerJson 제외

---

## 데이터 마이그레이션

### 마이그레이션 스크립트 위치

`scripts/` 디렉토리에 마이그레이션 스크립트가 있습니다:

- `migrate-add-service.js`: service 필드 추가
- `migrate-recalculate-changes.js`: 변경사항 재계산
- `migrate-version-scheme.js`: 버전 스키마 변경
- `migrate-versions.js`: 버전 데이터 마이그레이션

### 마이그레이션 실행

```bash
node scripts/migrate-add-service.js
```

### 마이그레이션 예시

**service 필드 추가:**
```javascript
const ApiUrl = require('../src/models/ApiUrl');

async function migrate() {
  const urls = await ApiUrl.find({ service: { $exists: false } });

  for (const url of urls) {
    url.service = url.group;  // 기본값: group과 동일
    await url.save();
  }

  console.log(`마이그레이션 완료: ${urls.length}개 문서 업데이트`);
}
```

---

## 백업 전략

### MongoDB Atlas

- **자동 백업**: Atlas가 자동으로 백업 생성
- **백업 주기**: 6시간마다
- **보관 기간**: 2일 (무료 티어)

### 로컬 MongoDB

**수동 백업:**
```bash
# 전체 데이터베이스 백업
mongodump --uri="mongodb://localhost:27017/api-doc-manager" --out=/backup

# 특정 컬렉션만 백업
mongodump --uri="mongodb://localhost:27017/api-doc-manager" --collection=apiurls --out=/backup
```

**복원:**
```bash
mongorestore --uri="mongodb://localhost:27017/api-doc-manager" /backup/api-doc-manager
```

---

## 성능 모니터링

### 쿼리 성능 분석

**explain() 사용:**
```javascript
const result = await ApiVersion.find({ urlId })
  .sort({ versionNumber: -1 })
  .explain('executionStats');

console.log(result.executionStats);
```

**확인 항목:**
- `executionTimeMillis`: 실행 시간
- `totalDocsExamined`: 검사한 문서 수
- `totalKeysExamined`: 검사한 인덱스 키 수

### 인덱스 사용 확인

**hint() 사용:**
```javascript
// 특정 인덱스 강제 사용
const versions = await ApiVersion.find({ urlId })
  .hint({ urlId: 1, versionNumber: -1 })
  .sort({ versionNumber: -1 });
```

---

## 데이터베이스 크기 예상

### 문서 크기

**ApiUrl:**
- 평균: ~500 bytes
- 100개: ~50 KB

**ApiVersion:**
- swaggerJson 포함: 평균 ~100 KB (큰 문서는 1MB 이상 가능)
- swaggerJson 제외: 평균 ~2 KB
- 100개 (swaggerJson 제외): ~200 KB

**AuditLog:**
- 평균: ~300 bytes
- 1000개: ~300 KB

### 저장 공간 예상

**소규모 (20개 API, 각 10개 버전):**
- ApiUrl: ~10 KB
- ApiVersion (swaggerJson 포함): ~20 MB
- AuditLog: ~1 MB
- **총합: ~21 MB**

**중규모 (50개 API, 각 20개 버전):**
- ApiUrl: ~25 KB
- ApiVersion (swaggerJson 포함): ~100 MB
- AuditLog: ~3 MB
- **총합: ~103 MB**

**대규모 (100개 API, 각 50개 버전):**
- ApiUrl: ~50 KB
- ApiVersion (swaggerJson 포함): ~500 MB
- AuditLog: ~10 MB
- **총합: ~510 MB**

---

## 연결 풀 관리

### 연결 풀 설정

```javascript
mongoose.connect(uri, {
  maxPoolSize: 50,        // 최대 연결 수
  minPoolSize: 10,        // 최소 연결 수
  serverSelectionTimeoutMS: 5000,
});
```

### 연결 풀 모니터링

```javascript
// 현재 연결 수 확인
console.log(mongoose.connection.readyState);
// 0: disconnected
// 1: connected
// 2: connecting
// 3: disconnecting

// 연결 풀 상태 확인
const pool = mongoose.connection.db.serverConfig.pool;
console.log('Active connections:', pool.currentSize);
console.log('Available connections:', pool.availableConnections);
```

---

## 트랜잭션 (미사용)

현재 시스템은 트랜잭션을 사용하지 않습니다.

**이유:**
- 단일 문서 작업이 대부분
- 복잡한 다중 문서 작업 없음
- 성능 우선

**향후 필요 시:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await ApiUrl.create([...], { session });
  await ApiVersion.create([...], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

---

← [이전: 미들웨어](./middlewares.md) | [목차로 돌아가기](../README.md) | [다음: 프론트엔드](./frontend.md) →
