const jsonDiff = require('json-diff');

/**
 * ===== 범용 비교 헬퍼 함수 =====
 */

/**
 * 객체 맵 비교 (key-value 형태의 객체 비교)
 * @param {object} oldMap - 이전 객체 맵
 * @param {object} newMap - 새 객체 맵
 * @param {string} category - 변경 카테고리
 * @param {string} basePath - 기본 경로
 * @param {string} severity - 심각도 (기본: 'medium')
 * @returns {Array} 변경사항 배열
 */
const compareObjectMaps = (oldMap, newMap, category, basePath, severity = 'medium') => {
  const changes = [];
  const oldObj = oldMap || {};
  const newObj = newMap || {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (!oldValue && newValue) {
      changes.push({
        type: 'added',
        category,
        path: basePath,
        field: key,
        oldValue: null,
        newValue: newValue,
        description: `${category} 추가: ${key}`,
        severity,
      });
    } else if (oldValue && !newValue) {
      changes.push({
        type: 'removed',
        category,
        path: basePath,
        field: key,
        oldValue: oldValue,
        newValue: null,
        description: `${category} 삭제: ${key}`,
        severity,
      });
    } else if (oldValue && newValue) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          type: 'modified',
          category,
          path: basePath,
          field: key,
          oldValue: oldValue,
          newValue: newValue,
          description: `${category} 수정: ${key}`,
          severity,
        });
      }
    }
  }

  return changes;
};

/**
 * 배열 비교 (keyField 기준 또는 인덱스 기준)
 * @param {Array} oldArr - 이전 배열
 * @param {Array} newArr - 새 배열
 * @param {string} category - 변경 카테고리
 * @param {string} path - 경로
 * @param {string|null} keyField - 배열 항목 식별용 키 필드 (null이면 전체 비교)
 * @param {string} severity - 심각도 (기본: 'medium')
 * @returns {Array} 변경사항 배열
 */
const compareArrays = (oldArr, newArr, category, path, keyField = null, severity = 'medium') => {
  const changes = [];
  const oldArray = oldArr || [];
  const newArray = newArr || [];

  if (keyField) {
    // keyField 기준 비교
    const oldByKey = new Map(oldArray.map((item) => [item[keyField], item]));
    const newByKey = new Map(newArray.map((item) => [item[keyField], item]));

    // 추가된 항목
    for (const [key, item] of newByKey) {
      if (!oldByKey.has(key)) {
        changes.push({
          type: 'added',
          category,
          path,
          field: key,
          oldValue: null,
          newValue: item,
          description: `${category} 추가: ${key}`,
          severity,
        });
      }
    }

    // 삭제된 항목
    for (const [key, item] of oldByKey) {
      if (!newByKey.has(key)) {
        changes.push({
          type: 'removed',
          category,
          path,
          field: key,
          oldValue: item,
          newValue: null,
          description: `${category} 삭제: ${key}`,
          severity,
        });
      }
    }

    // 수정된 항목
    for (const [key, newItem] of newByKey) {
      const oldItem = oldByKey.get(key);
      if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        changes.push({
          type: 'modified',
          category,
          path,
          field: key,
          oldValue: oldItem,
          newValue: newItem,
          description: `${category} 수정: ${key}`,
          severity,
        });
      }
    }
  } else {
    // 전체 배열 비교 (keyField 없음)
    if (JSON.stringify(oldArray) !== JSON.stringify(newArray)) {
      changes.push({
        type: 'modified',
        category,
        path,
        field: null,
        oldValue: oldArray,
        newValue: newArray,
        description: `${category} 변경`,
        severity,
      });
    }
  }

  return changes;
};

/**
 * 단순 값 비교
 * @param {*} oldValue - 이전 값
 * @param {*} newValue - 새 값
 * @param {string} category - 변경 카테고리
 * @param {string} path - 경로
 * @param {string} field - 필드명
 * @param {string} description - 설명
 * @param {string} severity - 심각도
 * @returns {Array} 변경사항 배열
 */
const compareValues = (oldValue, newValue, category, path, field, description, severity = 'low') => {
  const changes = [];

  const oldExists = oldValue !== undefined && oldValue !== null;
  const newExists = newValue !== undefined && newValue !== null;

  if (!oldExists && newExists) {
    changes.push({
      type: 'added',
      category,
      path,
      field,
      oldValue: null,
      newValue,
      description: `${description} 추가`,
      severity,
    });
  } else if (oldExists && !newExists) {
    changes.push({
      type: 'removed',
      category,
      path,
      field,
      oldValue,
      newValue: null,
      description: `${description} 삭제`,
      severity,
    });
  } else if (oldExists && newExists) {
    const oldStr = typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue;
    const newStr = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;

    if (oldStr !== newStr) {
      changes.push({
        type: 'modified',
        category,
        path,
        field,
        oldValue,
        newValue,
        description: `${description} 변경`,
        severity,
      });
    }
  }

  return changes;
};

/**
 * ===== 전역(Root) 레벨 비교 함수 =====
 */

/**
 * servers 배열 비교
 */
const compareServers = (oldServers, newServers) => {
  return compareArrays(oldServers, newServers, 'server', 'servers', 'url', 'medium');
};

/**
 * 전역 security 비교
 */
const compareSecurity = (oldSecurity, newSecurity, path = 'security') => {
  const changes = [];
  const oldArr = oldSecurity || [];
  const newArr = newSecurity || [];

  if (JSON.stringify(oldArr) !== JSON.stringify(newArr)) {
    changes.push({
      type: 'modified',
      category: 'security',
      path,
      field: null,
      oldValue: oldArr,
      newValue: newArr,
      description: '보안 요구사항 변경',
      severity: 'high',
    });
  }

  return changes;
};

/**
 * tags 배열 비교
 */
const compareTags = (oldTags, newTags) => {
  return compareArrays(oldTags, newTags, 'tag', 'tags', 'name', 'low');
};

/**
 * externalDocs 비교
 */
const compareExternalDocs = (oldDocs, newDocs, path = 'externalDocs') => {
  return compareValues(oldDocs, newDocs, 'externalDocs', path, 'externalDocs', '외부 문서', 'low');
};

/**
 * Info 섹션 비교 (확장)
 */
const compareInfo = (oldInfo, newInfo) => {
  const changes = [];
  const old = oldInfo || {};
  const newI = newInfo || {};

  // 기존 필드
  const infoFields = ['title', 'description', 'termsOfService', 'version'];

  for (const field of infoFields) {
    const fieldChanges = compareValues(
      old[field],
      newI[field],
      'info',
      'info',
      field,
      getInfoFieldDescription(field),
      'low'
    );
    changes.push(...fieldChanges);
  }

  // contact 객체 비교
  if (JSON.stringify(old.contact || {}) !== JSON.stringify(newI.contact || {})) {
    changes.push({
      type: 'modified',
      category: 'info',
      path: 'info',
      field: 'contact',
      oldValue: old.contact,
      newValue: newI.contact,
      description: '연락처 정보 변경',
      severity: 'low',
    });
  }

  // license 객체 비교
  if (JSON.stringify(old.license || {}) !== JSON.stringify(newI.license || {})) {
    changes.push({
      type: 'modified',
      category: 'info',
      path: 'info',
      field: 'license',
      oldValue: old.license,
      newValue: newI.license,
      description: '라이선스 정보 변경',
      severity: 'low',
    });
  }

  return changes;
};

const getInfoFieldDescription = (field) => {
  const descriptions = {
    title: 'API 제목',
    description: 'API 설명',
    termsOfService: '서비스 약관',
    version: 'API 버전',
  };
  return descriptions[field] || field;
};

/**
 * ===== Components 섹션 비교 함수 =====
 */

/**
 * Components 전체 비교
 */
const compareComponents = (oldComponents, newComponents) => {
  const changes = [];
  const oldComp = oldComponents || {};
  const newComp = newComponents || {};

  // schemas
  const schemaChanges = compareObjectMaps(
    oldComp.schemas,
    newComp.schemas,
    'schema',
    'components/schemas',
    'medium'
  );
  changes.push(...schemaChanges);

  // securitySchemes
  const securitySchemeChanges = compareObjectMaps(
    oldComp.securitySchemes,
    newComp.securitySchemes,
    'securityScheme',
    'components/securitySchemes',
    'high'
  );
  changes.push(...securitySchemeChanges);

  // parameters
  const parameterChanges = compareObjectMaps(
    oldComp.parameters,
    newComp.parameters,
    'parameter',
    'components/parameters',
    'medium'
  );
  changes.push(...parameterChanges);

  // requestBodies
  const requestBodyChanges = compareObjectMaps(
    oldComp.requestBodies,
    newComp.requestBodies,
    'requestBody',
    'components/requestBodies',
    'medium'
  );
  changes.push(...requestBodyChanges);

  // responses
  const responseChanges = compareObjectMaps(
    oldComp.responses,
    newComp.responses,
    'response',
    'components/responses',
    'medium'
  );
  changes.push(...responseChanges);

  // headers
  const headerChanges = compareObjectMaps(
    oldComp.headers,
    newComp.headers,
    'header',
    'components/headers',
    'low'
  );
  changes.push(...headerChanges);

  // examples
  const exampleChanges = compareObjectMaps(
    oldComp.examples,
    newComp.examples,
    'example',
    'components/examples',
    'low'
  );
  changes.push(...exampleChanges);

  // links
  const linkChanges = compareObjectMaps(
    oldComp.links,
    newComp.links,
    'link',
    'components/links',
    'low'
  );
  changes.push(...linkChanges);

  // callbacks
  const callbackChanges = compareObjectMaps(
    oldComp.callbacks,
    newComp.callbacks,
    'callback',
    'components/callbacks',
    'medium'
  );
  changes.push(...callbackChanges);

  return changes;
};

/**
 * ===== Path 정규화 및 매핑 함수 =====
 */

/**
 * 경로에서 버전 접두사를 제거하여 정규화된 키 생성
 * 지원 패턴: /v1/, /v2/, /api/v1/, /api/internal/v1/ 등
 * @param {string} path - 원본 경로 (예: "/v1/users/{id}")
 * @returns {object} { normalizedPath, versionPrefix, originalPath }
 */
const normalizePathKey = (path) => {
  // 버전 패턴: /v숫자/ 형태를 찾음 (대소문자 무관)
  // 예: /v1/users, /api/v2/orders, /api/internal/v1/admin
  const versionPattern = /^(.*?)(\/v\d+)(\/.*)?$/i;
  const match = path.match(versionPattern);

  if (match) {
    const prefix = match[1] || ''; // "/api" 또는 ""
    const version = match[2]; // "/v1", "/v2"
    const rest = match[3] || ''; // "/users/{id}"

    return {
      normalizedPath: prefix + '/{VERSION}' + rest, // "/api/{VERSION}/users/{id}"
      versionPrefix: version.toLowerCase(), // "/v1", "/v2"
      originalPath: path,
    };
  }

  // 버전 패턴이 없는 경우
  return {
    normalizedPath: path,
    versionPrefix: null,
    originalPath: path,
  };
};

/**
 * old/new paths를 정규화된 키로 매핑
 * 동일 문서 내 여러 버전 공존 케이스도 처리
 * @param {object} oldPaths - 이전 버전 paths
 * @param {object} newPaths - 새 버전 paths
 * @returns {object} { matched, oldOnly, newOnly }
 */
const buildPathMapping = (oldPaths, newPaths) => {
  const oldP = oldPaths || {};
  const newP = newPaths || {};

  // 1. 정규화된 키로 그룹화 (버전별로 구분)
  // Map<normalizedPath, Map<versionPrefix, { originalPath, spec }>>
  const oldByNormalized = new Map();
  for (const [path, spec] of Object.entries(oldP)) {
    const { normalizedPath, versionPrefix } = normalizePathKey(path);
    if (!oldByNormalized.has(normalizedPath)) {
      oldByNormalized.set(normalizedPath, new Map());
    }
    oldByNormalized.get(normalizedPath).set(versionPrefix, { originalPath: path, versionPrefix, spec });
  }

  const newByNormalized = new Map();
  for (const [path, spec] of Object.entries(newP)) {
    const { normalizedPath, versionPrefix } = normalizePathKey(path);
    if (!newByNormalized.has(normalizedPath)) {
      newByNormalized.set(normalizedPath, new Map());
    }
    newByNormalized.get(normalizedPath).set(versionPrefix, { originalPath: path, versionPrefix, spec });
  }

  const mapping = {
    matched: [], // 매칭된 경로 쌍 (버전 변경 또는 스펙 변경)
    oldOnly: [], // old에만 있는 경로 (진짜 삭제)
    newOnly: [], // new에만 있는 경로 (진짜 추가)
  };

  // 2. 모든 정규화된 키 수집
  const allNormalizedKeys = new Set([...oldByNormalized.keys(), ...newByNormalized.keys()]);

  for (const normalizedKey of allNormalizedKeys) {
    const oldVersions = oldByNormalized.get(normalizedKey) || new Map();
    const newVersions = newByNormalized.get(normalizedKey) || new Map();

    // 2.1. 동일 버전끼리 먼저 매칭
    const matchedVersions = new Set();
    for (const [version, oldItem] of oldVersions) {
      if (newVersions.has(version)) {
        mapping.matched.push({
          normalizedKey,
          old: oldItem,
          new: newVersions.get(version),
          versionChanged: false,
        });
        matchedVersions.add(version);
      }
    }

    // 2.2. 남은 old/new 버전들 수집
    const unmatchedOld = [];
    const unmatchedNew = [];

    for (const [version, item] of oldVersions) {
      if (!matchedVersions.has(version)) {
        unmatchedOld.push(item);
      }
    }
    for (const [version, item] of newVersions) {
      if (!matchedVersions.has(version)) {
        unmatchedNew.push(item);
      }
    }

    // 2.3. 남은 것들끼리 버전 업그레이드 매칭 시도
    // 버전 순서로 정렬하여 매칭 (v1 -> v2 등)
    unmatchedOld.sort((a, b) => (a.versionPrefix || '').localeCompare(b.versionPrefix || ''));
    unmatchedNew.sort((a, b) => (a.versionPrefix || '').localeCompare(b.versionPrefix || ''));

    const matchCount = Math.min(unmatchedOld.length, unmatchedNew.length);
    for (let i = 0; i < matchCount; i++) {
      mapping.matched.push({
        normalizedKey,
        old: unmatchedOld[i],
        new: unmatchedNew[i],
        versionChanged: unmatchedOld[i].versionPrefix !== unmatchedNew[i].versionPrefix,
      });
    }

    // 2.4. 매칭되지 않은 나머지는 추가/삭제
    for (let i = matchCount; i < unmatchedOld.length; i++) {
      mapping.oldOnly.push(unmatchedOld[i]);
    }
    for (let i = matchCount; i < unmatchedNew.length; i++) {
      mapping.newOnly.push(unmatchedNew[i]);
    }
  }

  return mapping;
};

/**
 * ===== Endpoint/Operation 레벨 비교 함수 =====
 */

/**
 * HTTP 메서드 추출
 */
const extractMethods = (pathObj) => {
  const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
  return Object.keys(pathObj).filter((k) => validMethods.includes(k));
};

/**
 * Parameters 비교
 */
const compareParameters = (oldParams, newParams, path) => {
  const changes = [];
  const oldArray = oldParams || [];
  const newArray = newParams || [];

  // name + in 조합으로 고유 식별
  const getParamKey = (p) => `${p.name}:${p.in}`;
  const oldByKey = new Map(oldArray.map((p) => [getParamKey(p), p]));
  const newByKey = new Map(newArray.map((p) => [getParamKey(p), p]));

  // 추가된 파라미터
  for (const [key, param] of newByKey) {
    if (!oldByKey.has(key)) {
      changes.push({
        type: 'added',
        category: 'parameter',
        path,
        field: param.name,
        oldValue: null,
        newValue: param,
        description: `파라미터 추가: ${param.name} (${param.in})`,
        severity: param.required ? 'medium' : 'low',
      });
    }
  }

  // 삭제된 파라미터
  for (const [key, param] of oldByKey) {
    if (!newByKey.has(key)) {
      changes.push({
        type: 'removed',
        category: 'parameter',
        path,
        field: param.name,
        oldValue: param,
        newValue: null,
        description: `파라미터 삭제: ${param.name} (${param.in})`,
        severity: 'medium',
      });
    }
  }

  // 수정된 파라미터
  for (const [key, newParam] of newByKey) {
    const oldParam = oldByKey.get(key);
    if (oldParam && JSON.stringify(oldParam) !== JSON.stringify(newParam)) {
      changes.push({
        type: 'modified',
        category: 'parameter',
        path,
        field: newParam.name,
        oldValue: oldParam,
        newValue: newParam,
        description: `파라미터 수정: ${newParam.name} (${newParam.in})`,
        severity: 'low',
      });
    }
  }

  return changes;
};

/**
 * RequestBody 비교
 */
const compareRequestBody = (oldBody, newBody, path) => {
  return compareValues(oldBody, newBody, 'requestBody', path, 'requestBody', 'Request Body', 'medium');
};

/**
 * Responses 비교
 */
const compareResponses = (oldResponses, newResponses, path) => {
  const changes = [];
  const oldResp = oldResponses || {};
  const newResp = newResponses || {};
  const allCodes = new Set([...Object.keys(oldResp), ...Object.keys(newResp)]);

  for (const code of allCodes) {
    const oldValue = oldResp[code];
    const newValue = newResp[code];

    if (!oldValue && newValue) {
      changes.push({
        type: 'added',
        category: 'response',
        path,
        field: `response-${code}`,
        oldValue: null,
        newValue: newValue,
        description: `응답 코드 ${code} 추가`,
        severity: 'low',
      });
    } else if (oldValue && !newValue) {
      changes.push({
        type: 'removed',
        category: 'response',
        path,
        field: `response-${code}`,
        oldValue: oldValue,
        newValue: null,
        description: `응답 코드 ${code} 삭제`,
        severity: 'low',
      });
    } else if (oldValue && newValue) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          type: 'modified',
          category: 'response',
          path,
          field: `response-${code}`,
          oldValue: oldValue,
          newValue: newValue,
          description: `응답 코드 ${code} 수정`,
          severity: 'low',
        });
      }
    }
  }

  return changes;
};

/**
 * Operation(엔드포인트 메서드) 상세 비교
 */
const compareOperation = (oldOp, newOp, path) => {
  const changes = [];

  // parameters 비교
  const paramChanges = compareParameters(
    oldOp.parameters,
    newOp.parameters,
    path
  );
  changes.push(...paramChanges);

  // requestBody 비교
  const bodyChanges = compareRequestBody(
    oldOp.requestBody,
    newOp.requestBody,
    path
  );
  changes.push(...bodyChanges);

  // responses 비교
  const respChanges = compareResponses(
    oldOp.responses,
    newOp.responses,
    path
  );
  changes.push(...respChanges);

  // operationId 비교
  const opIdChanges = compareValues(
    oldOp.operationId,
    newOp.operationId,
    'endpoint',
    path,
    'operationId',
    'Operation ID',
    'low'
  );
  changes.push(...opIdChanges);

  // summary 비교
  const summaryChanges = compareValues(
    oldOp.summary,
    newOp.summary,
    'description',
    path,
    'summary',
    '요약',
    'low'
  );
  changes.push(...summaryChanges);

  // description 비교
  const descChanges = compareValues(
    oldOp.description,
    newOp.description,
    'description',
    path,
    'description',
    '설명',
    'low'
  );
  changes.push(...descChanges);

  // tags 비교
  const tagChanges = compareValues(
    oldOp.tags,
    newOp.tags,
    'tag',
    path,
    'tags',
    '태그',
    'low'
  );
  changes.push(...tagChanges);

  // deprecated 비교
  const deprecatedChanges = compareValues(
    oldOp.deprecated,
    newOp.deprecated,
    'endpoint',
    path,
    'deprecated',
    'Deprecated 상태',
    'high'
  );
  changes.push(...deprecatedChanges);

  // security 비교 (엔드포인트 레벨)
  const securityChanges = compareSecurity(
    oldOp.security,
    newOp.security,
    path
  );
  changes.push(...securityChanges);

  // servers 비교 (엔드포인트 레벨)
  const serverChanges = compareArrays(
    oldOp.servers,
    newOp.servers,
    'server',
    path,
    'url',
    'medium'
  );
  changes.push(...serverChanges);

  // callbacks 비교
  const callbackChanges = compareObjectMaps(
    oldOp.callbacks,
    newOp.callbacks,
    'callback',
    path,
    'medium'
  );
  changes.push(...callbackChanges);

  // externalDocs 비교
  const extDocsChanges = compareExternalDocs(
    oldOp.externalDocs,
    newOp.externalDocs,
    path
  );
  changes.push(...extDocsChanges);

  return changes;
};

/**
 * Paths 비교 (endpoint 변경) - 정규화 비교 사용
 * v1 -> v2 버전 변경 시 동일 엔드포인트로 인식하고 스펙 변경만 비교
 */
const comparePaths = (oldPaths, newPaths) => {
  const changes = [];
  const mapping = buildPathMapping(oldPaths, newPaths);

  // 1. 진짜 추가된 엔드포인트 (정규화 후에도 new에만 존재)
  for (const item of mapping.newOnly) {
    const methods = extractMethods(item.spec);
    for (const method of methods) {
      changes.push({
        type: 'added',
        category: 'endpoint',
        path: `${method.toUpperCase()} ${item.originalPath}`,
        field: null,
        oldValue: null,
        newValue: item.spec[method],
        description: `새 엔드포인트 추가: ${method.toUpperCase()} ${item.originalPath}`,
        severity: 'high',
      });
    }
  }

  // 2. 진짜 삭제된 엔드포인트 (정규화 후에도 old에만 존재)
  for (const item of mapping.oldOnly) {
    const methods = extractMethods(item.spec);
    for (const method of methods) {
      changes.push({
        type: 'removed',
        category: 'endpoint',
        path: `${method.toUpperCase()} ${item.originalPath}`,
        field: null,
        oldValue: item.spec[method],
        newValue: null,
        description: `엔드포인트 삭제: ${method.toUpperCase()} ${item.originalPath}`,
        severity: 'high',
      });
    }
  }

  // 3. 매칭된 엔드포인트 분석 (버전 변경 또는 스펙 변경)
  for (const match of mapping.matched) {
    const { old: oldItem, new: newItem, versionChanged, normalizedKey } = match;
    const oldSpec = oldItem.spec;
    const newSpec = newItem.spec;

    const oldMethods = extractMethods(oldSpec);
    const newMethods = extractMethods(newSpec);
    const allMethods = new Set([...oldMethods, ...newMethods]);

    // path 레벨 공통 속성 비교 (버전 변경과 무관하게)
    const pathKey = newItem.originalPath;

    const pathLevelParams = compareParameters(oldSpec.parameters, newSpec.parameters, pathKey);
    changes.push(...pathLevelParams);

    const pathSummaryChanges = compareValues(
      oldSpec.summary,
      newSpec.summary,
      'description',
      pathKey,
      'summary',
      `Path 요약 (${pathKey})`,
      'low'
    );
    changes.push(...pathSummaryChanges);

    const pathDescChanges = compareValues(
      oldSpec.description,
      newSpec.description,
      'description',
      pathKey,
      'description',
      `Path 설명 (${pathKey})`,
      'low'
    );
    changes.push(...pathDescChanges);

    const pathServerChanges = compareArrays(oldSpec.servers, newSpec.servers, 'server', pathKey, 'url', 'medium');
    changes.push(...pathServerChanges);

    // 메서드별 비교
    for (const method of allMethods) {
      const oldMethod = oldSpec[method];
      const newMethod = newSpec[method];
      const opPathOld = `${method.toUpperCase()} ${oldItem.originalPath}`;
      const opPathNew = `${method.toUpperCase()} ${newItem.originalPath}`;

      // 메서드 추가
      if (!oldMethod && newMethod) {
        changes.push({
          type: 'added',
          category: 'endpoint',
          path: opPathNew,
          field: null,
          oldValue: null,
          newValue: newMethod,
          description: `새 메서드 추가: ${opPathNew}`,
          severity: 'high',
        });
        continue;
      }

      // 메서드 삭제
      if (oldMethod && !newMethod) {
        changes.push({
          type: 'removed',
          category: 'endpoint',
          path: opPathOld,
          field: null,
          oldValue: oldMethod,
          newValue: null,
          description: `메서드 삭제: ${opPathOld}`,
          severity: 'high',
        });
        continue;
      }

      // 버전 변경 + 스펙 비교
      if (oldMethod && newMethod) {
        const specEqual = JSON.stringify(oldMethod) === JSON.stringify(newMethod);

        if (versionChanged) {
          if (specEqual) {
            // 버전만 변경, 스펙 동일 -> path_version_changed
            changes.push({
              type: 'path_version_changed',
              category: 'endpoint',
              path: opPathNew,
              field: 'path',
              oldValue: {
                path: oldItem.originalPath,
                version: oldItem.versionPrefix,
              },
              newValue: {
                path: newItem.originalPath,
                version: newItem.versionPrefix,
              },
              description: `경로 버전 변경: ${oldItem.originalPath} → ${newItem.originalPath}`,
              severity: 'medium',
              metadata: {
                oldPath: oldItem.originalPath,
                newPath: newItem.originalPath,
                normalizedPath: normalizedKey,
                oldVersion: oldItem.versionPrefix,
                newVersion: newItem.versionPrefix,
              },
            });
          } else {
            // 버전 변경 + 스펙 변경 -> modified with metadata
            changes.push({
              type: 'modified',
              category: 'endpoint',
              path: opPathNew,
              field: 'path_and_spec',
              oldValue: {
                path: oldItem.originalPath,
                version: oldItem.versionPrefix,
              },
              newValue: {
                path: newItem.originalPath,
                version: newItem.versionPrefix,
              },
              description: `엔드포인트 버전 및 스펙 변경: ${oldItem.originalPath} → ${newItem.originalPath}`,
              severity: 'high',
              metadata: {
                versionChanged: true,
                oldPath: oldItem.originalPath,
                newPath: newItem.originalPath,
                normalizedPath: normalizedKey,
                oldVersion: oldItem.versionPrefix,
                newVersion: newItem.versionPrefix,
              },
            });

            // 상세 변경사항도 추가
            const opChanges = compareOperation(oldMethod, newMethod, opPathNew);
            changes.push(...opChanges);
          }
        } else {
          // 버전 동일, 스펙만 비교 (기존 로직)
          const opChanges = compareOperation(oldMethod, newMethod, opPathNew);
          changes.push(...opChanges);
        }
      }
    }
  }

  return changes;
};

/**
 * ===== 메인 비교 함수 =====
 */

/**
 * 두 Swagger/OpenAPI JSON을 비교하여 변경사항 분석
 * @param {object} oldJson - 이전 버전 JSON
 * @param {object} newJson - 새 버전 JSON
 * @returns {object} { hasChanges, changes }
 */
const analyzeChanges = (oldJson, newJson) => {
  const changes = [];

  // 1. OpenAPI/Swagger 버전 비교
  const openapiChanges = compareValues(
    oldJson.openapi || oldJson.swagger,
    newJson.openapi || newJson.swagger,
    'info',
    'root',
    'openapi/swagger',
    'OpenAPI/Swagger 버전',
    'low'
  );
  changes.push(...openapiChanges);

  // 2. info 섹션 비교
  const infoChanges = compareInfo(oldJson.info, newJson.info);
  changes.push(...infoChanges);

  // 3. servers 비교
  const serverChanges = compareServers(oldJson.servers, newJson.servers);
  changes.push(...serverChanges);

  // 4. 전역 security 비교
  const securityChanges = compareSecurity(oldJson.security, newJson.security);
  changes.push(...securityChanges);

  // 5. tags 비교
  const tagChanges = compareTags(oldJson.tags, newJson.tags);
  changes.push(...tagChanges);

  // 6. externalDocs 비교
  const extDocsChanges = compareExternalDocs(oldJson.externalDocs, newJson.externalDocs);
  changes.push(...extDocsChanges);

  // 7. paths (endpoints) 비교
  const pathChanges = comparePaths(oldJson.paths, newJson.paths);
  changes.push(...pathChanges);

  // 8. components 전체 비교 (schemas, securitySchemes, parameters, requestBodies, responses, headers, examples, links, callbacks)
  const componentChanges = compareComponents(oldJson.components, newJson.components);
  changes.push(...componentChanges);

  // 9. Swagger 2.0 호환 - definitions 비교 (OpenAPI 3.0의 components/schemas와 동일)
  if (oldJson.definitions || newJson.definitions) {
    const definitionChanges = compareObjectMaps(
      oldJson.definitions,
      newJson.definitions,
      'schema',
      'definitions',
      'medium'
    );
    changes.push(...definitionChanges);
  }

  // 10. Swagger 2.0 호환 - securityDefinitions 비교
  if (oldJson.securityDefinitions || newJson.securityDefinitions) {
    const secDefChanges = compareObjectMaps(
      oldJson.securityDefinitions,
      newJson.securityDefinitions,
      'securityScheme',
      'securityDefinitions',
      'high'
    );
    changes.push(...secDefChanges);
  }

  // 11. basePath, host, schemes 비교 (Swagger 2.0)
  const basePathChanges = compareValues(
    oldJson.basePath,
    newJson.basePath,
    'server',
    'root',
    'basePath',
    'Base Path',
    'medium'
  );
  changes.push(...basePathChanges);

  const hostChanges = compareValues(
    oldJson.host,
    newJson.host,
    'server',
    'root',
    'host',
    'Host',
    'medium'
  );
  changes.push(...hostChanges);

  const schemesChanges = compareValues(
    oldJson.schemes,
    newJson.schemes,
    'server',
    'root',
    'schemes',
    'Schemes',
    'medium'
  );
  changes.push(...schemesChanges);

  // 12. consumes, produces 비교 (Swagger 2.0)
  const consumesChanges = compareValues(
    oldJson.consumes,
    newJson.consumes,
    'info',
    'root',
    'consumes',
    'Consumes (Content-Types)',
    'low'
  );
  changes.push(...consumesChanges);

  const producesChanges = compareValues(
    oldJson.produces,
    newJson.produces,
    'info',
    'root',
    'produces',
    'Produces (Content-Types)',
    'low'
  );
  changes.push(...producesChanges);

  return {
    hasChanges: changes.length > 0,
    changes,
  };
};

/**
 * 두 버전의 원시 diff 생성
 */
const getRawDiff = (oldJson, newJson) => {
  return jsonDiff.diff(oldJson, newJson);
};

module.exports = {
  analyzeChanges,
  getRawDiff,
  // 헬퍼 함수들 (테스트용 export)
  compareObjectMaps,
  compareArrays,
  compareValues,
  // Path 정규화 함수 (테스트용 export)
  normalizePathKey,
  buildPathMapping,
  // 전역 레벨
  compareServers,
  compareSecurity,
  compareTags,
  compareExternalDocs,
  compareInfo,
  // Components
  compareComponents,
  // Operation 레벨
  compareParameters,
  compareRequestBody,
  compareResponses,
  compareOperation,
  comparePaths,
};
