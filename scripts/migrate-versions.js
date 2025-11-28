/**
 * 버전 마이그레이션 스크립트
 * - 기존 ApiVersion의 majorVersion, versionId를 새 규칙에 맞게 업데이트
 * - 규칙: paths에서 버전 추출 → 없으면 v1
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiVersion = require('../src/models/ApiVersion');

// 버전 추출 함수 (swaggerService와 동일한 로직)
const extractMajorVersion = (swaggerJson) => {
  const versionPattern = /\/v(\d+)(\/|$)/i;

  if (swaggerJson && swaggerJson.paths) {
    const firstPath = Object.keys(swaggerJson.paths)[0];
    if (firstPath) {
      const match = firstPath.match(versionPattern);
      if (match) return `v${match[1]}`;
    }
  }

  return 'v1';
};

const migrate = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 모든 버전 조회
    const versions = await ApiVersion.find({});
    console.log(`📦 총 ${versions.length}개 버전 발견\n`);

    let updated = 0;
    let unchanged = 0;

    for (const version of versions) {
      const newMajorVersion = extractMajorVersion(version.swaggerJson);
      const oldMajorVersion = version.majorVersion;

      if (oldMajorVersion !== newMajorVersion) {
        await ApiVersion.updateOne(
          { _id: version._id },
          {
            majorVersion: newMajorVersion,
            versionId: newMajorVersion,
          }
        );
        console.log(`🔄 ${version._id}: ${oldMajorVersion} → ${newMajorVersion}`);
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log('\n========================================');
    console.log(`✅ 마이그레이션 완료`);
    console.log(`   - 업데이트: ${updated}개`);
    console.log(`   - 변경 없음: ${unchanged}개`);
    console.log('========================================');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
};

migrate();
