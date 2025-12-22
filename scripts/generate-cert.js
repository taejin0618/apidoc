// Node.js로 자체 서명 SSL 인증서 생성 스크립트
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, '..', 'cert');
const keyPath = path.join(certDir, 'server.key');
const certPath = path.join(certDir, 'server.crt');

// cert 디렉토리 생성
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log('✅ cert 디렉토리 생성 완료');
}

// OpenSSL 경로 찾기
function findOpenSSL() {
  const paths = [
    'openssl', // PATH에 있는 경우
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    process.env.ProgramFiles + '\\Git\\usr\\bin\\openssl.exe',
  ];

  for (const opensslPath of paths) {
    try {
      execSync(`"${opensslPath}" version`, { stdio: 'ignore' });
      return opensslPath;
    } catch {
      continue;
    }
  }
  return null;
}

// OpenSSL로 인증서 생성
function generateWithOpenSSL(opensslPath) {
  const opensslCommand = `"${opensslPath}" req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=KR/ST=Seoul/L=Seoul/O=API Doc Manager/CN=211.39.156.53"`;
  execSync(opensslCommand, { stdio: 'inherit' });
}

// Node.js crypto로 인증서 생성 (간단한 방법)
function generateWithNode() {
  console.log('⚠️  OpenSSL이 없어 Node.js로 인증서를 생성합니다.');
  console.log('   (프로덕션 환경에서는 Let\'s Encrypt 인증서 사용 권장)');
  console.log('');

  // RSA 키 쌍 생성
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // 간단한 자체 서명 인증서 생성 (실제로는 더 복잡하지만, 테스트용)
  // 실제 프로덕션에서는 OpenSSL이나 Let's Encrypt 사용 권장
  
  // PEM 형식으로 저장
  fs.writeFileSync(keyPath, privateKey);
  
  // 간단한 인증서 템플릿 (실제로는 더 복잡한 구조 필요)
  // 여기서는 OpenSSL을 사용하는 것이 더 좋지만, 없을 경우를 대비해 기본 구조만 제공
  console.log('⚠️  Node.js crypto로는 완전한 인증서 생성이 제한적입니다.');
  console.log('   OpenSSL 설치를 권장합니다.');
  console.log('');
  console.log('대안:');
  console.log('1. OpenSSL 설치: https://slproweb.com/products/Win32OpenSSL.html');
  console.log('2. Git for Windows 설치 (OpenSSL 포함)');
  console.log('3. win-acme로 Let\'s Encrypt 인증서 발급: https://www.win-acme.com/');
  console.log('');
  console.log('임시로 자체 서명 인증서를 생성하려면:');
  console.log('   (Git Bash 또는 OpenSSL 설치 후)');
  console.log('   openssl req -x509 -newkey rsa:4096 -keyout cert/server.key -out cert/server.crt -days 365 -nodes');
  
  process.exit(1);
}

// 메인 실행
try {
  console.log('🔐 SSL 인증서 생성 중...');
  
  const opensslPath = findOpenSSL();
  if (opensslPath) {
    console.log(`✅ OpenSSL 발견: ${opensslPath}`);
    console.log('   인증서 생성 중...');
    generateWithOpenSSL(opensslPath);
    console.log('');
    console.log('✅ SSL 인증서 생성 완료!');
    console.log(`   키 파일: ${keyPath}`);
    console.log(`   인증서 파일: ${certPath}`);
    console.log('');
    console.log('⚠️  참고: 이 인증서는 자체 서명 인증서입니다.');
    console.log('   브라우저에서 보안 경고가 표시될 수 있습니다.');
    console.log('   프로덕션 환경에서는 Let\'s Encrypt 인증서 사용을 권장합니다.');
  } else {
    generateWithNode();
  }
} catch (error) {
  console.error('❌ 인증서 생성 실패:', error.message);
  process.exit(1);
}
