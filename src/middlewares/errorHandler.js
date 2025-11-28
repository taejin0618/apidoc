/**
 * 에러 응답 생성 헬퍼
 */
const createErrorResponse = (code, message, details = null) => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});

/**
 * 404 Not Found 핸들러
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json(
    createErrorResponse('NOT_FOUND', `경로를 찾을 수 없습니다: ${req.originalUrl}`)
  );
};

/**
 * 글로벌 에러 핸들러
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', '입력값 검증 실패', messages)
    );
  }

  // Mongoose CastError (잘못된 ObjectId 등)
  if (err.name === 'CastError') {
    return res.status(400).json(
      createErrorResponse('INVALID_ID', '잘못된 ID 형식입니다')
    );
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json(
      createErrorResponse('DUPLICATE_ERROR', `이미 존재하는 ${field}입니다`)
    );
  }

  // Joi Validation Error
  if (err.isJoi) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', err.details[0].message)
    );
  }

  // Custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json(
      createErrorResponse(err.code || 'APP_ERROR', err.message)
    );
  }

  // 기본 서버 에러
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? '서버 내부 오류가 발생했습니다'
      : err.message;

  res.status(statusCode).json(
    createErrorResponse('SERVER_ERROR', message)
  );
};

/**
 * 커스텀 앱 에러 클래스
 */
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  AppError,
  createErrorResponse,
};
