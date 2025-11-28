require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// 서버 시작
const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();

    // Express 서버 시작
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('🚀 API Doc Manager 서버 시작');
      console.log(`📍 환경: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 주소: http://localhost:${PORT}`);
      console.log(`📚 API: http://localhost:${PORT}/api`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM 수신. 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 수신. 서버를 종료합니다...');
  process.exit(0);
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
