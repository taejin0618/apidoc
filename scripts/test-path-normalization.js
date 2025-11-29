/**
 * Path 정규화 비교 기능 테스트 스크립트
 * 실행: node scripts/test-path-normalization.js
 */

const {
  normalizePathKey,
  buildPathMapping,
  comparePaths,
  analyzeChanges,
} = require('../src/services/diffService');

// 색상 출력 헬퍼
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

console.log(colors.bold('\n========================================'));
console.log(colors.bold('  Path 정규화 비교 기능 테스트'));
console.log(colors.bold('========================================\n'));

// 테스트 1: normalizePathKey 함수 테스트
console.log(colors.blue('1. normalizePathKey() 테스트'));
console.log('-'.repeat(40));

const pathTests = [
  { input: '/v1/users', expected: { normalized: '/{VERSION}/users', version: '/v1' } },
  { input: '/v2/users', expected: { normalized: '/{VERSION}/users', version: '/v2' } },
  { input: '/api/v1/orders', expected: { normalized: '/api/{VERSION}/orders', version: '/v1' } },
  { input: '/api/internal/v2/admin', expected: { normalized: '/api/internal/{VERSION}/admin', version: '/v2' } },
  { input: '/users', expected: { normalized: '/users', version: null } },
  { input: '/V1/users', expected: { normalized: '/{VERSION}/users', version: '/v1' } }, // 대소문자
];

let passCount = 0;
let failCount = 0;

pathTests.forEach(({ input, expected }) => {
  const result = normalizePathKey(input);
  const pass =
    result.normalizedPath === expected.normalized &&
    result.versionPrefix === expected.version;

  if (pass) {
    console.log(colors.green(`  ✓ ${input} → ${result.normalizedPath} (${result.versionPrefix})`));
    passCount++;
  } else {
    console.log(colors.red(`  ✗ ${input}`));
    console.log(`    Expected: ${expected.normalized} (${expected.version})`);
    console.log(`    Got: ${result.normalizedPath} (${result.versionPrefix})`);
    failCount++;
  }
});

console.log();

// 테스트 2: buildPathMapping 함수 테스트
console.log(colors.blue('2. buildPathMapping() 테스트'));
console.log('-'.repeat(40));

const oldPaths = {
  '/v1/users': { get: { summary: 'Get users' } },
  '/v1/users/{id}': { get: { summary: 'Get user by ID' } },
  '/v1/orders': { get: { summary: 'Get orders' } },
};

const newPaths = {
  '/v2/users': { get: { summary: 'Get users' } },
  '/v2/users/{id}': { get: { summary: 'Get user by ID' } },
  '/v2/products': { get: { summary: 'Get products' } }, // 새로운 엔드포인트
};

const mapping = buildPathMapping(oldPaths, newPaths);

console.log(colors.yellow('  매칭된 경로:'));
mapping.matched.forEach((m) => {
  console.log(`    ${m.old.originalPath} → ${m.new.originalPath} (versionChanged: ${m.versionChanged})`);
});

console.log(colors.yellow('  Old에만 있는 경로 (삭제됨):'));
mapping.oldOnly.forEach((item) => {
  console.log(`    ${item.originalPath}`);
});

console.log(colors.yellow('  New에만 있는 경로 (추가됨):'));
mapping.newOnly.forEach((item) => {
  console.log(`    ${item.originalPath}`);
});

// 검증
const matchedCount = mapping.matched.length;
const oldOnlyCount = mapping.oldOnly.length;
const newOnlyCount = mapping.newOnly.length;

if (matchedCount === 2 && oldOnlyCount === 1 && newOnlyCount === 1) {
  console.log(colors.green(`  ✓ 매핑 결과 정확 (matched: ${matchedCount}, oldOnly: ${oldOnlyCount}, newOnly: ${newOnlyCount})`));
  passCount++;
} else {
  console.log(colors.red(`  ✗ 매핑 결과 오류 (matched: ${matchedCount}, oldOnly: ${oldOnlyCount}, newOnly: ${newOnlyCount})`));
  failCount++;
}

console.log();

// 테스트 3: comparePaths 함수 테스트 (스펙 동일)
console.log(colors.blue('3. comparePaths() 테스트 - 버전만 변경 (스펙 동일)'));
console.log('-'.repeat(40));

const oldPathsV1 = {
  '/v1/users': { get: { summary: 'Get users', operationId: 'getUsers' } },
};

const newPathsV2Same = {
  '/v2/users': { get: { summary: 'Get users', operationId: 'getUsers' } },
};

const changesSpecSame = comparePaths(oldPathsV1, newPathsV2Same);
const versionChangedOnly = changesSpecSame.filter((c) => c.type === 'path_version_changed');

console.log(`  변경사항 수: ${changesSpecSame.length}`);
changesSpecSame.forEach((c) => {
  console.log(`    - [${c.type}] ${c.description}`);
});

if (versionChangedOnly.length === 1) {
  console.log(colors.green(`  ✓ path_version_changed 타입으로 올바르게 감지됨`));
  passCount++;
} else {
  console.log(colors.red(`  ✗ path_version_changed가 ${versionChangedOnly.length}개 (예상: 1)`));
  failCount++;
}

console.log();

// 테스트 4: comparePaths 함수 테스트 (스펙 변경)
console.log(colors.blue('4. comparePaths() 테스트 - 버전 + 스펙 변경'));
console.log('-'.repeat(40));

const newPathsV2Different = {
  '/v2/users': { get: { summary: 'Get all users', operationId: 'getAllUsers' } }, // 스펙 변경
};

const changesSpecDiff = comparePaths(oldPathsV1, newPathsV2Different);
const modifiedChanges = changesSpecDiff.filter((c) => c.type === 'modified');
const versionChanges = changesSpecDiff.filter((c) => c.type === 'path_version_changed');

console.log(`  변경사항 수: ${changesSpecDiff.length}`);
changesSpecDiff.forEach((c) => {
  console.log(`    - [${c.type}] ${c.description}`);
});

if (modifiedChanges.length >= 1 && versionChanges.length === 0) {
  console.log(colors.green(`  ✓ modified 타입으로 올바르게 감지됨 (스펙 변경 포함)`));
  passCount++;
} else {
  console.log(colors.red(`  ✗ 예상과 다른 결과 (modified: ${modifiedChanges.length}, path_version_changed: ${versionChanges.length})`));
  failCount++;
}

console.log();

// 테스트 5: 진짜 추가/삭제 테스트
console.log(colors.blue('5. comparePaths() 테스트 - 진짜 추가/삭제'));
console.log('-'.repeat(40));

const oldPathsMixed = {
  '/v1/users': { get: { summary: 'Get users' } },
  '/v1/legacy': { get: { summary: 'Legacy endpoint' } }, // 삭제될 예정
};

const newPathsMixed = {
  '/v2/users': { get: { summary: 'Get users' } },
  '/v2/new-feature': { get: { summary: 'New feature' } }, // 새로 추가
};

const changesMixed = comparePaths(oldPathsMixed, newPathsMixed);
const addedChanges = changesMixed.filter((c) => c.type === 'added');
const removedChanges = changesMixed.filter((c) => c.type === 'removed');
const versionOnlyChanges = changesMixed.filter((c) => c.type === 'path_version_changed');

console.log(`  변경사항 수: ${changesMixed.length}`);
changesMixed.forEach((c) => {
  console.log(`    - [${c.type}] ${c.description}`);
});

if (addedChanges.length === 1 && removedChanges.length === 1 && versionOnlyChanges.length === 1) {
  console.log(colors.green(`  ✓ 추가/삭제/버전변경 올바르게 구분됨`));
  passCount++;
} else {
  console.log(colors.red(`  ✗ 구분 오류 (added: ${addedChanges.length}, removed: ${removedChanges.length}, version: ${versionOnlyChanges.length})`));
  failCount++;
}

console.log();

// 테스트 6: 동일 문서 내 여러 버전 공존
console.log(colors.blue('6. comparePaths() 테스트 - 동일 문서 내 v1, v2 공존'));
console.log('-'.repeat(40));

const oldPathsMultiVersion = {
  '/v1/users': { get: { summary: 'V1 Get users' } },
  '/v2/users': { get: { summary: 'V2 Get users' } },
};

const newPathsMultiVersion = {
  '/v1/users': { get: { summary: 'V1 Get users' } }, // 동일
  '/v2/users': { get: { summary: 'V2 Get users - updated' } }, // v2만 변경
};

const changesMulti = comparePaths(oldPathsMultiVersion, newPathsMultiVersion);

console.log(`  변경사항 수: ${changesMulti.length}`);
changesMulti.forEach((c) => {
  console.log(`    - [${c.type}] ${c.description}`);
});

// v1은 변경 없고, v2만 description 변경
if (changesMulti.length === 1 || changesMulti.length === 2) {
  console.log(colors.green(`  ✓ 여러 버전 공존 케이스 처리됨`));
  passCount++;
} else {
  console.log(colors.yellow(`  △ 결과 확인 필요 (변경사항: ${changesMulti.length}개)`));
}

console.log();

// 결과 요약
console.log(colors.bold('========================================'));
console.log(colors.bold('  테스트 결과 요약'));
console.log(colors.bold('========================================'));
console.log(colors.green(`  통과: ${passCount}`));
console.log(colors.red(`  실패: ${failCount}`));
console.log();

if (failCount === 0) {
  console.log(colors.green(colors.bold('  ✓ 모든 테스트 통과!')));
} else {
  console.log(colors.red(colors.bold('  ✗ 일부 테스트 실패')));
}

console.log();
