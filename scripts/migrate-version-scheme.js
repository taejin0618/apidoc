/**
 * 마이그레이션 스크립트: URL 기반 버전 관리 체계 전환
 *
 * 기존 버전들에 majorVersion 필드를 추가하고,
 * 동일 메이저 버전끼리 병합합니다.
 *
 * 사용법:
 *   node scripts/migrate-version-scheme.js [--dry-run]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiUrl = require('../src/models/ApiUrl');
const ApiVersion = require('../src/models/ApiVersion');

// URL에서 메이저 버전 추출 (swaggerService.js와 동일)
// 우선순위: paths → servers → basePath → URL
const extractMajorVersion = (url, swaggerJson = null) => {
  const versionPattern = /\/v(\d+)(\/|$)/i;

  if (swaggerJson) {
    // 1. paths에서 추출 (실제 API 엔드포인트 버전 - 최우선)
    if (swaggerJson.paths) {
      const firstPath = Object.keys(swaggerJson.paths)[0];
      if (firstPath) {
        const match = firstPath.match(versionPattern);
        if (match) return `v${match[1]}`;
      }
    }

    // 2. OpenAPI 3.x: servers 배열
    if (swaggerJson.servers && swaggerJson.servers.length > 0) {
      for (const server of swaggerJson.servers) {
        const match = server.url?.match(versionPattern);
        if (match) return `v${match[1]}`;
      }
    }

    // 3. Swagger 2.x: basePath
    if (swaggerJson.basePath) {
      const match = swaggerJson.basePath.match(versionPattern);
      if (match) return `v${match[1]}`;
    }
  }

  // 4. URL에서 추출 (최후 수단)
  const urlMatch = url.match(versionPattern);
  if (urlMatch) return `v${urlMatch[1]}`;

  return 'default';
};

// 변경사항 요약 생성
const generateSummary = (changes) => {
  if (!changes || changes.length === 0) return '초기 버전';

  const added = changes.filter((c) => c.type === 'added').length;
  const removed = changes.filter((c) => c.type === 'removed').length;
  const modified = changes.filter((c) => c.type === 'modified').length;

  const parts = [];
  if (added > 0) parts.push(`${added}개 추가`);
  if (removed > 0) parts.push(`${removed}개 삭제`);
  if (modified > 0) parts.push(`${modified}개 수정`);

  return parts.join(', ') || '변경사항 없음';
};

// 동일 메이저 버전의 여러 버전을 하나로 병합
const mergeVersions = async (majorVersion, versions, dryRun = false) => {
  // 시간순 정렬 (가장 오래된 것부터)
  versions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const baseVersion = versions[0]; // 가장 오래된 버전을 베이스로
  const latestVersion = versions[versions.length - 1]; // 가장 최신 swaggerJson 사용

  // 모든 changes 누적 (타임스탬프 추가)
  const allChanges = [];
  const changeHistory = [];

  for (const version of versions) {
    const recordedAt = version.timestamp || new Date();

    if (version.changes && version.changes.length > 0) {
      const timestampedChanges = version.changes.map((change) => ({
        ...change,
        recordedAt: change.recordedAt || recordedAt,
      }));
      allChanges.push(...timestampedChanges);

      changeHistory.push({
        updatedAt: recordedAt,
        changesCount: version.changes.length,
        summary: version.summary || generateSummary(version.changes),
      });
    }
  }

  console.log(`    - 병합 대상: ${versions.length}개 버전`);
  console.log(`    - 베이스 버전: ${baseVersion.versionId} (${baseVersion._id})`);
  console.log(`    - 최신 swaggerJson: ${latestVersion.versionId}`);
  console.log(`    - 누적 변경사항: ${allChanges.length}개`);

  if (dryRun) {
    console.log('    - [DRY-RUN] 실제 변경 없음');
    return;
  }

  // 베이스 버전 업데이트
  await ApiVersion.findByIdAndUpdate(baseVersion._id, {
    versionId: majorVersion,
    majorVersion,
    swaggerJson: latestVersion.swaggerJson,
    changes: allChanges,
    changeHistory,
    revisionCount: versions.length,
    lastUpdatedAt: latestVersion.timestamp,
    endpointCount: latestVersion.endpointCount || 0,
    summary: latestVersion.summary || generateSummary(allChanges.slice(-10)),
  });

  // 나머지 버전들 삭제
  const idsToDelete = versions.slice(1).map((v) => v._id);
  if (idsToDelete.length > 0) {
    await ApiVersion.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`    - 삭제된 버전: ${idsToDelete.length}개`);
  }
};

// 메인 마이그레이션 함수
const migrateVersionScheme = async (dryRun = false) => {
  console.log('========================================');
  console.log('URL 기반 버전 관리 체계 마이그레이션');
  console.log(`모드: ${dryRun ? 'DRY-RUN (시뮬레이션)' : '실제 실행'}`);
  console.log('========================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB 연결 완료\n');

  const apiUrls = await ApiUrl.find({}).lean();
  console.log(`총 ${apiUrls.length}개 API URL 처리 예정\n`);

  let totalMerged = 0;
  let totalUpdated = 0;

  for (const apiUrl of apiUrls) {
    console.log(`\n[${apiUrl.name}]`);
    console.log(`  URL: ${apiUrl.url}`);

    // 해당 URL의 모든 버전 조회 (시간순 정렬)
    const versions = await ApiVersion.find({ urlId: apiUrl._id })
      .sort({ timestamp: 1 })
      .lean();

    if (versions.length === 0) {
      console.log('  버전 없음, 스킵');
      continue;
    }

    console.log(`  버전 수: ${versions.length}개`);

    // 메이저 버전별로 그룹화
    const versionGroups = {};

    for (const version of versions) {
      const majorVersion = extractMajorVersion(apiUrl.url, version.swaggerJson);

      if (!versionGroups[majorVersion]) {
        versionGroups[majorVersion] = [];
      }
      versionGroups[majorVersion].push(version);
    }

    const groupKeys = Object.keys(versionGroups);
    console.log(`  메이저 버전: ${groupKeys.join(', ')}`);

    // 각 그룹별로 처리
    for (const [majorVersion, groupVersions] of Object.entries(versionGroups)) {
      console.log(`\n  [${majorVersion}] ${groupVersions.length}개 버전`);

      if (groupVersions.length === 1) {
        // 버전이 하나뿐이면 필드만 업데이트
        const version = groupVersions[0];

        if (!dryRun) {
          await ApiVersion.findByIdAndUpdate(version._id, {
            majorVersion,
            revisionCount: 1,
            lastUpdatedAt: version.timestamp,
            changeHistory:
              version.changes && version.changes.length > 0
                ? [
                    {
                      updatedAt: version.timestamp,
                      changesCount: version.changes.length,
                      summary: version.summary || '초기 버전',
                    },
                  ]
                : [],
          });
        }

        console.log(`    - 단일 버전, majorVersion 필드 업데이트`);
        totalUpdated++;
      } else {
        // 여러 버전 병합
        await mergeVersions(majorVersion, groupVersions, dryRun);
        totalMerged += groupVersions.length - 1;
        totalUpdated++;
      }
    }

    // versionCount 재계산
    if (!dryRun) {
      const finalCount = await ApiVersion.countDocuments({ urlId: apiUrl._id });
      await ApiUrl.findByIdAndUpdate(apiUrl._id, { versionCount: finalCount });
    }
  }

  console.log('\n========================================');
  console.log('마이그레이션 완료!');
  console.log(`  - 업데이트된 버전: ${totalUpdated}개`);
  console.log(`  - 병합으로 삭제된 버전: ${totalMerged}개`);
  console.log('========================================\n');

  await mongoose.disconnect();
};

// 실행
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

migrateVersionScheme(dryRun).catch((error) => {
  console.error('마이그레이션 에러:', error);
  process.exit(1);
});
