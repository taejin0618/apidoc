/**
 * 마이그레이션 스크립트: 기존 레코드에 service 필드 추가
 *
 * 기존 ApiUrl 레코드 중 service 필드가 없거나 null인 레코드에
 * name 필드를 기반으로 service 값을 생성하여 추가합니다.
 *
 * 사용법:
 *   node scripts/migrate-add-service.js [--dry-run]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiUrl = require('../src/models/ApiUrl');

/**
 * name 필드를 service 형식으로 변환
 * @param {string} name - 원본 name 필드 값
 * @returns {string} 변환된 service 값
 */
function nameToService(name) {
  if (!name) return 'default';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/[^a-z0-9-]/g, '') // 영문자, 숫자, 하이픈만 유지
    .replace(/-+/g, '-') // 연속된 하이픈을 하나로
    .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
}

// 메인 마이그레이션 함수
const migrateAddService = async (dryRun = false) => {
  console.log('========================================');
  console.log('서비스 필드 마이그레이션');
  console.log(`모드: ${dryRun ? 'DRY-RUN (시뮬레이션)' : '실제 실행'}`);
  console.log('========================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB 연결 완료\n');

  // service 필드가 없거나 null인 레코드 조회
  const apiUrls = await ApiUrl.find({
    $or: [{ service: { $exists: false } }, { service: null }],
  }).lean();

  console.log(`📦 총 ${apiUrls.length}개 레코드 발견 (service 필드 없음)\n`);

  if (apiUrls.length === 0) {
    console.log('✅ 마이그레이션할 레코드가 없습니다.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;
  const updateLog = [];

  for (const apiUrl of apiUrls) {
    // 이미 service 필드가 있는 경우 건너뛰기 (안전장치)
    if (apiUrl.service && apiUrl.service.trim() !== '') {
      skipped++;
      continue;
    }

    const serviceValue = nameToService(apiUrl.name);
    const logEntry = {
      id: apiUrl._id,
      name: apiUrl.name,
      currentService: apiUrl.service || '(없음)',
      newService: serviceValue,
    };

    console.log(`[${apiUrl.name}]`);
    console.log(`  ID: ${apiUrl._id}`);
    console.log(`  현재 service: ${apiUrl.service || '(없음)'}`);
    console.log(`  새 service: ${serviceValue}`);

    if (dryRun) {
      console.log('  - [DRY-RUN] 실제 변경 없음');
      updateLog.push(logEntry);
      updated++;
    } else {
      try {
        await ApiUrl.findByIdAndUpdate(apiUrl._id, {
          service: serviceValue,
        });
        console.log('  ✅ 업데이트 완료');
        updateLog.push(logEntry);
        updated++;
      } catch (error) {
        console.error(`  ❌ 업데이트 실패: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log('========================================');
  console.log('마이그레이션 완료!');
  console.log(`  - 업데이트: ${updated}개`);
  if (skipped > 0) {
    console.log(`  - 건너뛴 레코드: ${skipped}개`);
  }
  console.log('========================================\n');

  // 업데이트된 레코드 상세 정보 출력
  if (updateLog.length > 0) {
    console.log('업데이트된 레코드 목록:');
    updateLog.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.name}`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   ${entry.currentService} → ${entry.newService}`);
    });
    console.log('');
  }

  await mongoose.disconnect();
  console.log('🔌 MongoDB 연결 종료');
};

// 실행
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

migrateAddService(dryRun).catch((error) => {
  console.error('❌ 마이그레이션 에러:', error);
  process.exit(1);
});
