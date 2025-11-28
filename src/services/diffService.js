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
 * Paths 비교 (endpoint 변경)
 */
const comparePaths = (oldPaths, newPaths) => {
  const changes = [];
  const oldP = oldPaths || {};
  const newP = newPaths || {};
  const allPaths = new Set([...Object.keys(oldP), ...Object.keys(newP)]);

  for (const pathKey of allPaths) {
    const oldPath = oldP[pathKey];
    const newPath = newP[pathKey];

    // 새로 추가된 path
    if (!oldPath && newPath) {
      const methods = extractMethods(newPath);
      for (const method of methods) {
        changes.push({
          type: 'added',
          category: 'endpoint',
          path: `${method.toUpperCase()} ${pathKey}`,
          field: null,
          oldValue: null,
          newValue: newPath[method],
          description: `새 엔드포인트 추가: ${method.toUpperCase()} ${pathKey}`,
          severity: 'high',
        });
      }
      continue;
    }

    // 삭제된 path
    if (oldPath && !newPath) {
      const methods = extractMethods(oldPath);
      for (const method of methods) {
        changes.push({
          type: 'removed',
          category: 'endpoint',
          path: `${method.toUpperCase()} ${pathKey}`,
          field: null,
          oldValue: oldPath[method],
          newValue: null,
          description: `엔드포인트 삭제: ${method.toUpperCase()} ${pathKey}`,
          severity: 'high',
        });
      }
      continue;
    }

    // 수정된 path (method 레벨 비교)
    if (oldPath && newPath) {
      const oldMethods = extractMethods(oldPath);
      const newMethods = extractMethods(newPath);
      const allMethods = new Set([...oldMethods, ...newMethods]);

      // path 레벨 공통 속성 비교 (parameters, servers, summary, description)
      const pathLevelParams = compareParameters(
        oldPath.parameters,
        newPath.parameters,
        pathKey
      );
      changes.push(...pathLevelParams);

      // path 레벨 summary 비교
      const pathSummaryChanges = compareValues(
        oldPath.summary,
        newPath.summary,
        'description',
        pathKey,
        'summary',
        `Path 요약 (${pathKey})`,
        'low'
      );
      changes.push(...pathSummaryChanges);

      // path 레벨 description 비교
      const pathDescChanges = compareValues(
        oldPath.description,
        newPath.description,
        'description',
        pathKey,
        'description',
        `Path 설명 (${pathKey})`,
        'low'
      );
      changes.push(...pathDescChanges);

      // path 레벨 servers 비교
      const pathServerChanges = compareArrays(
        oldPath.servers,
        newPath.servers,
        'server',
        pathKey,
        'url',
        'medium'
      );
      changes.push(...pathServerChanges);

      for (const method of allMethods) {
        const oldMethod = oldPath[method];
        const newMethod = newPath[method];
        const opPath = `${method.toUpperCase()} ${pathKey}`;

        // 새 method 추가
        if (!oldMethod && newMethod) {
          changes.push({
            type: 'added',
            category: 'endpoint',
            path: opPath,
            field: null,
            oldValue: null,
            newValue: newMethod,
            description: `새 메서드 추가: ${opPath}`,
            severity: 'high',
          });
          continue;
        }

        // method 삭제
        if (oldMethod && !newMethod) {
          changes.push({
            type: 'removed',
            category: 'endpoint',
            path: opPath,
            field: null,
            oldValue: oldMethod,
            newValue: null,
            description: `메서드 삭제: ${opPath}`,
            severity: 'high',
          });
          continue;
        }

        // method 내용 변경 - Operation 상세 비교
        if (oldMethod && newMethod) {
          const opChanges = compareOperation(oldMethod, newMethod, opPath);
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
