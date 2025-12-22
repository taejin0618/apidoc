require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;
const USE_HTTPS = process.env.USE_HTTPS === 'true' || PORT === 443;

// 서버 시작
const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();

    if (USE_HTTPS) {
      // HTTPS 서버 설정
      const keyPath = path.join(__dirname, 'cert', 'server.key');
      const certPath = path.join(__dirname, 'cert', 'server.crt');

      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.error('❌ SSL 인증서를 찾을 수 없습니다.');
        console.error('   인증서 생성: node scripts/generate-cert.js');
        process.exit(1);
      }

      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };

      https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('🚀 API Doc Manager 서버 시작 (HTTPS)');
        console.log(`📍 환경: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 로컬 주소: https://localhost:${PORT}`);
        console.log(`📚 API: https://localhost:${PORT}/api`);
        console.log(`🌍 외부 접근: https://211.39.156.53:${PORT}`);
        console.log('========================================');
      });
    } else {
      // HTTP 서버 시작 (0.0.0.0으로 바인딩하여 외부 접근 허용)
      app.listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('🚀 API Doc Manager 서버 시작');
        console.log(`📍 환경: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 로컬 주소: http://localhost:${PORT}`);
        console.log(`📚 API: http://localhost:${PORT}/api`);
        console.log(`🌍 외부 접근: http://211.39.156.53:${PORT}`);
        console.log('========================================');
      });
    }
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
