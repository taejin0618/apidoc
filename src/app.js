const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Trust proxy 설정 (프록시 환경에서 IP 주소 정확히 식별)
// 보안을 위해 첫 번째 프록시만 신뢰 (개발: 1, 프로덕션: 환경 변수로 제어)
// true로 설정하면 rate limiting을 우회할 수 있어 보안 경고 발생
const trustProxy = process.env.TRUST_PROXY === 'true' ? true :
                   process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY) : 1;
app.set('trust proxy', trustProxy);

// ===== 미들웨어 설정 =====

// 보안 헤더 설정
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

// 응답 압축
app.use(compression());

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);

// API 요청 제한 (IP당 15분에 100회)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// 요청 로깅
app.use(morgan(process.env.LOG_LEVEL || 'dev'));

// Body 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// ===== API 라우트 =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Swagger 문서 라우트
app.use('/api', require('./routes/swaggerRoutes'));

// URL 관리 라우트
app.use('/api/urls', require('./routes/urlRoutes'));

// 버전 관리 라우트 (URL 하위 경로)
app.use('/api/urls', require('./routes/versionRoutes'));

// 전역 버전 라우트 (대시보드용)
app.use('/api/versions', require('./routes/versionRoutes'));

// ===== HTML 페이지 라우트 =====

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// API 상세 페이지
app.get('/api-detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/api-detail.html'));
});

// 버전 비교 페이지
app.get('/version-compare', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/version-compare.html'));
});

// Swagger UI 페이지
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/swagger-ui.html'));
});

// ===== 에러 핸들러 =====

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
