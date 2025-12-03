# 미들웨어 상세

> Express 미들웨어 및 에러 처리 상세 설명

## 목차

1. [미들웨어 개요](#미들웨어-개요)
2. [보안 미들웨어](#보안-미들웨어)
3. [에러 핸들러](#에러-핸들러)
4. [기타 미들웨어](#기타-미들웨어)

---

## 미들웨어 개요

### Express 앱 설정 (`src/app.js`)

미들웨어는 다음 순서로 등록됩니다:

```javascript
1. helmet (보안 헤더)
2. compression (응답 압축)
3. cors (CORS 처리)
4. rateLimit (API 요청 제한)
5. morgan (로깅)
6. express.json (Body 파싱)
7. express.urlencoded (URL 인코딩 파싱)
8. express.static (정적 파일 서빙)
9. 라우트
10. notFoundHandler (404 처리)
11. errorHandler (전역 에러 처리)
```

---

## 보안 미들웨어

### Helmet

보안 헤더를 설정하여 일반적인 웹 취약점을 방지합니다.

**설정:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));
```

**헤더:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS일 때)
- `Content-Security-Policy` (위 설정)

**CSP 허용 도메인:**
- `cdn.jsdelivr.net`: Swagger UI CSS/JS
- `unpkg.com`: Swagger UI 번들
- `fonts.googleapis.com`: Google Fonts
- `fonts.gstatic.com`: Google Fonts 리소스

---

### CORS

Cross-Origin Resource Sharing 정책을 설정합니다.

**설정:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
```

**환경 변수:**
- `CORS_ORIGIN`: 허용할 오리진 (쉼표로 구분)
- 예: `CORS_ORIGIN=http://localhost:3000,https://example.com`

**기본값:**
- `CORS_ORIGIN`이 없으면 `'*'` (모든 오리진 허용)

**주의사항:**
- 프로덕션 환경에서는 특정 도메인만 허용하도록 설정 권장

---

### Rate Limiting

API 요청을 제한하여 DDoS 공격을 방지합니다.

**설정:**
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,                   // 최대 100회
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    },
  },
});
app.use('/api', apiLimiter);
```

**제한:**
- 15분당 100회 요청
- IP 기반 제한

**에러 응답:**
```javascript
{
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
}
```

**HTTP 헤더:**
- `X-RateLimit-Limit`: 최대 요청 수 (100)
- `X-RateLimit-Remaining`: 남은 요청 수
- `X-RateLimit-Reset`: 리셋 시간 (Unix timestamp)

---

### Trust Proxy

프록시 환경에서 IP 주소를 정확히 식별하기 위한 설정입니다.

**설정:**
```javascript
const trustProxy = process.env.TRUST_PROXY === 'true' ? true :
                   process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY) : 1;
app.set('trust proxy', trustProxy);
```

**환경 변수:**
- `TRUST_PROXY=true`: 모든 프록시 신뢰
- `TRUST_PROXY=2`: 첫 2개 프록시 신뢰
- 미설정: 첫 번째 프록시만 신뢰 (기본값: 1)

**용도:**
- Rate limiting의 정확한 IP 식별
- `req.ip` 정확도 향상

---

## 에러 핸들러

**파일:** `src/middlewares/errorHandler.js`

### AppError 클래스

커스텀 에러 클래스입니다.

```javascript
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**사용 예:**
```javascript
throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
```

**속성:**
- `message`: 에러 메시지
- `statusCode`: HTTP 상태 코드
- `code`: 에러 코드
- `isOperational`: 운영 에러 여부 (true)

---

### notFoundHandler

404 Not Found 핸들러입니다.

**위치:** 모든 라우트 이후

**응답 형식:**
```javascript
{
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: '경로를 찾을 수 없습니다: /api/invalid'
  }
}
```

**구현:**
```javascript
const notFoundHandler = (req, res, next) => {
  res.status(404).json(
    createErrorResponse('NOT_FOUND', `경로를 찾을 수 없습니다: ${req.originalUrl}`)
  );
};
```

---

### errorHandler

전역 에러 핸들러입니다.

**위치:** 모든 미들웨어 및 라우트 이후

**에러 타입별 처리:**

#### Mongoose ValidationError

**조건:** `err.name === 'ValidationError'`

**응답:**
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

**HTTP 상태:** 400

---

#### Mongoose CastError

**조건:** `err.name === 'CastError'`

**응답:**
```javascript
{
  success: false,
  error: {
    code: 'INVALID_ID',
    message: '잘못된 ID 형식입니다'
  }
}
```

**HTTP 상태:** 400

**발생 시나리오:**
- 잘못된 ObjectId 형식
- 예: `/api/urls/invalid-id`

---

#### Mongoose Duplicate Key Error

**조건:** `err.code === 11000`

**응답:**
```javascript
{
  success: false,
  error: {
    code: 'DUPLICATE_ERROR',
    message: '이미 존재하는 url입니다'
  }
}
```

**HTTP 상태:** 400

**발생 시나리오:**
- Unique 인덱스 위반
- 예: 동일한 URL 중복 등록

---

#### Joi Validation Error

**조건:** `err.isJoi === true`

**응답:**
```javascript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: '서비스명은 필수입니다'
  }
}
```

**HTTP 상태:** 400

---

#### Custom AppError

**조건:** `err.isOperational === true`

**응답:**
```javascript
{
  success: false,
  error: {
    code: err.code || 'APP_ERROR',
    message: err.message
  }
}
```

**HTTP 상태:** `err.statusCode || 400`

**사용 예:**
```javascript
throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
```

---

#### 기본 서버 에러

**조건:** 위 조건에 해당하지 않는 모든 에러

**응답:**

**개발 환경:**
```javascript
{
  success: false,
  error: {
    code: 'SERVER_ERROR',
    message: err.message  // 상세 에러 메시지
  }
}
```

**프로덕션 환경:**
```javascript
{
  success: false,
  error: {
    code: 'SERVER_ERROR',
    message: '서버 내부 오류가 발생했습니다'  // 일반 메시지
  }
}
```

**HTTP 상태:** `err.statusCode || 500`

**로깅:**
- 모든 에러는 `console.error`로 로깅
- 프로덕션에서는 상세 정보 숨김

---

### createErrorResponse

에러 응답 생성 헬퍼 함수입니다.

```javascript
const createErrorResponse = (code, message, details = null) => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});
```

**사용 예:**
```javascript
res.status(400).json(
  createErrorResponse('VALIDATION_ERROR', '입력값 검증 실패', ['필드1 오류', '필드2 오류'])
);
```

---

## 기타 미들웨어

### Compression

응답을 gzip으로 압축합니다.

**설정:**
```javascript
app.use(compression());
```

**효과:**
- 대용량 JSON 응답 압축
- 네트워크 트래픽 감소
- 응답 시간 단축

**압축 대상:**
- `text/*`
- `application/json`
- `application/javascript`

---

### Morgan

HTTP 요청을 로깅합니다.

**설정:**
```javascript
app.use(morgan(process.env.LOG_LEVEL || 'dev'));
```

**환경 변수:**
- `LOG_LEVEL`: 로그 형식
  - `dev`: 개발용 (짧은 형식)
  - `combined`: Apache combined 형식
  - `common`: Apache common 형식

**로그 예시:**
```
GET /api/urls 200 12.345 ms
POST /api/urls/123/fetch 201 234.567 ms
```

---

### express.json

JSON 요청 본문을 파싱합니다.

**설정:**
```javascript
app.use(express.json({ limit: '10mb' }));
```

**제한:**
- 최대 10MB

**용도:**
- POST/PUT 요청의 JSON 본문 파싱
- `req.body`에 파싱된 객체 저장

---

### express.urlencoded

URL 인코딩된 요청 본문을 파싱합니다.

**설정:**
```javascript
app.use(express.urlencoded({ extended: true }));
```

**설정:**
- `extended: true`: qs 라이브러리 사용 (중첩 객체 지원)

**용도:**
- HTML 폼 데이터 파싱
- `application/x-www-form-urlencoded` Content-Type 처리

---

### express.static

정적 파일을 서빙합니다.

**설정:**
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```

**서빙 경로:**
- `/public/css/style.css` → `http://localhost:3000/css/style.css`
- `/public/js/main.js` → `http://localhost:3000/js/main.js`

**파일:**
- CSS 파일
- JavaScript 파일
- 아이콘 (SVG)

---

## 미들웨어 실행 순서

### 요청 처리 흐름

```
1. 요청 수신
   ↓
2. helmet (보안 헤더 추가)
   ↓
3. compression (응답 압축 준비)
   ↓
4. cors (CORS 헤더 추가)
   ↓
5. rateLimit (요청 제한 확인)
   ↓
6. morgan (요청 로깅)
   ↓
7. express.json (JSON 본문 파싱)
   ↓
8. express.urlencoded (URL 인코딩 파싱)
   ↓
9. express.static (정적 파일 확인)
   ↓
10. 라우트 매칭
    ├─→ 매칭 성공 → 라우트 핸들러 실행
    └─→ 매칭 실패 → notFoundHandler
   ↓
11. 에러 발생 시 → errorHandler
   ↓
12. 응답 전송
```

---

## 커스텀 미들웨어

### validateRequest (urlRoutes)

Joi 스키마로 요청 본문을 검증하는 미들웨어입니다.

**구현:**
```javascript
const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값 검증 실패',
        details: error.details.map((d) => d.message),
      },
    });
  }
  req.validatedBody = value;
  next();
};
```

**사용 예:**
```javascript
router.post('/', validateRequest(createUrlSchema), async (req, res, next) => {
  // req.validatedBody에 검증된 데이터 포함
  const url = await ApiUrl.create(req.validatedBody);
});
```

**특징:**
- `abortEarly: false`: 모든 검증 오류 수집
- 검증 실패 시 즉시 응답 (next() 호출 안 함)
- 검증 성공 시 `req.validatedBody`에 검증된 데이터 저장

---

## 에러 처리 전략

### 에러 전파

```javascript
// 라우트 핸들러에서
try {
  const url = await ApiUrl.findById(id);
  if (!url) {
    throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
  }
  res.json({ success: true, data: url });
} catch (error) {
  next(error);  // 에러 핸들러로 전달
}
```

### 비동기 에러 처리

Express는 비동기 에러를 자동으로 catch하지 않으므로, 명시적으로 처리해야 합니다.

**방법 1: try-catch**
```javascript
router.get('/:id', async (req, res, next) => {
  try {
    const url = await ApiUrl.findById(req.params.id);
    res.json({ success: true, data: url });
  } catch (error) {
    next(error);
  }
});
```

**방법 2: asyncHandler 래퍼 (미구현)**
```javascript
// 향후 구현 가능
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/:id', asyncHandler(async (req, res) => {
  const url = await ApiUrl.findById(req.params.id);
  res.json({ success: true, data: url });
}));
```

---

## 보안 고려사항

### 입력 검증

- **Joi**: 요청 본문 검증
- **Mongoose**: 스키마 레벨 검증
- **Express**: 기본 검증 없음 (명시적 검증 필요)

### XSS 방어

- **Helmet CSP**: Content Security Policy 설정
- **입력 이스케이프**: 프론트엔드에서 처리 (서버는 JSON만 반환)

### SQL Injection 방어

- **Mongoose**: NoSQL Injection 방어 (파라미터화된 쿼리)
- **Joi**: 입력값 검증

### Rate Limiting

- **express-rate-limit**: IP 기반 요청 제한
- **15분당 100회**: 기본 제한

---

## 성능 최적화

### 응답 압축

- **compression**: gzip 압축
- **대용량 JSON**: 압축률 높음

### 정적 파일 캐싱

- **express.static**: 기본 캐싱 헤더 설정
- **CDN 사용 권장**: 프로덕션 환경

### 로깅 최적화

- **morgan**: 개발 환경에서만 상세 로깅
- **프로덕션**: `combined` 형식 사용

---

---

← [이전: 라우트 구조](./routes.md) | [목차로 돌아가기](../README.md) | [다음: 데이터베이스](./database.md) →
