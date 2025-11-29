/**
 * Changes 재계산 마이그레이션 스크립트
 * - 모든 ApiVersion 문서의 changes 배열을 새 정규화 로직으로 재계산
 * - v1 -> v2 경로 변경이 "추가+삭제"가 아닌 "버전변경" 또는 "수정"으로 표시되도록 함
 * - 실행: node scripts/migrate-recalculate-changes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiVersion = require('../src/models/ApiVersion');
const { analyzeChanges } = require('../src/services/diffService');

// 색상 출력 헬퍼
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
};

const migrate = async () => {
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('  Changes 재계산 마이그레이션'));
  console.log(colors.bold('========================================\n'));

  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(colors.green('✅ MongoDB 연결 성공\n'));

    // 모든 버전 조회 (swaggerJson 포함)
    const versions = await ApiVersion.find({}).lean();
    console.log(colors.blue(`📦 총 ${versions.length}개 버전 발견\n`));

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // 변경사항 통계
    const stats = {
      added: 0,
      removed: 0,
      modified: 0,
      path_version_changed: 0,
    };

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      const progress = `[${i + 1}/${versions.length}]`;

      // 첫 버전 (previousVersionId가 없음)은 스킵
      if (!version.previousVersionId) {
        console.log(colors.dim(`${progress} ${version._id} - 첫 버전, 스킵`));
        skipped++;
        continue;
      }

      try {
        // 이전 버전 조회
        const prevVersion = await ApiVersion.findById(version.previousVersionId).lean();

        if (!prevVersion) {
          console.log(colors.yellow(`${progress} ${version._id} - 이전 버전 없음, 스킵`));
          skipped++;
          continue;
        }

        // 새 로직으로 changes 재계산
        const { changes } = analyzeChanges(prevVersion.swaggerJson, version.swaggerJson);

        // 이전 changes와 비교
        const oldChangesCount = version.changes?.length || 0;
        const newChangesCount = changes.length;

        // 변경 유형별 카운트
        const changeTypes = {
          added: 0,
          removed: 0,
          modified: 0,
          path_version_changed: 0,
        };

        for (const change of changes) {
          if (changeTypes[change.type] !== undefined) {
            changeTypes[change.type]++;
            stats[change.type]++;
          }
        }

        // 업데이트
        await ApiVersion.updateOne({ _id: version._id }, { $set: { changes } });

        const changeInfo = `added:${changeTypes.added} removed:${changeTypes.removed} modified:${changeTypes.modified} version:${changeTypes.path_version_changed}`;
        console.log(
          colors.green(`${progress} ${version._id}`) +
            ` - ${oldChangesCount} → ${newChangesCount} changes (${changeInfo})`
        );
        updated++;
      } catch (err) {
        console.log(colors.red(`${progress} ${version._id} - 오류: ${err.message}`));
        errors++;
      }
    }

    // 결과 요약
    console.log(colors.bold('\n========================================'));
    console.log(colors.bold('  마이그레이션 결과'));
    console.log(colors.bold('========================================'));
    console.log(colors.green(`  ✅ 업데이트: ${updated}개`));
    console.log(colors.dim(`  ⏭️  스킵: ${skipped}개`));
    if (errors > 0) {
      console.log(colors.red(`  ❌ 오류: ${errors}개`));
    }

    console.log(colors.bold('\n  변경사항 통계:'));
    console.log(colors.green(`    + 추가: ${stats.added}`));
    console.log(colors.red(`    - 삭제: ${stats.removed}`));
    console.log(colors.yellow(`    ✎ 수정: ${stats.modified}`));
    console.log(colors.blue(`    ↑ 버전변경: ${stats.path_version_changed}`));
    console.log(colors.bold('========================================\n'));
  } catch (error) {
    console.error(colors.red('\n❌ 마이그레이션 실패:'), error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log(colors.dim('🔌 MongoDB 연결 종료\n'));
  }
};

migrate();
