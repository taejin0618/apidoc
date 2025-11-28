const axios = require('axios');
const ApiUrl = require('../models/ApiUrl');
const ApiVersion = require('../models/ApiVersion');
const { analyzeChanges } = require('./diffService');

/**
 * Swagger JSON 다운로드
 * @param {string} url - Swagger URL
 * @param {number} timeout - 타임아웃 (ms)
 * @returns {Promise<object>} Swagger JSON
 */
const fetchSwaggerJson = async (url, timeout = 15000) => {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        Accept: 'application/json',
      },
      validateStatus: (status) => status < 500,
    });

    if (response.status === 404) {
      throw new Error('URL을 찾을 수 없습니다 (404)');
    }

    if (response.status !== 200) {
      throw new Error(`HTTP 에러: ${response.status}`);
    }

    const json = response.data;

    // OpenAPI/Swagger 유효성 검사
    if (!json.openapi && !json.swagger) {
      throw new Error('유효한 OpenAPI/Swagger 문서가 아닙니다');
    }

    return json;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error(`타임아웃: ${timeout}ms 초과`);
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('연결 거부됨: 서버에 접근할 수 없습니다');
    }
    throw error;
  }
};

/**
 * URL 또는 Swagger JSON에서 메이저 버전 추출
 * 우선순위: paths에서 추출 → 없으면 v1
 * @param {string} url - Swagger URL (사용하지 않음, 호환성 유지)
 * @param {object} swaggerJson - 파싱된 Swagger JSON (optional)
 * @returns {string} 버전 문자열 (예: "v1", "v2")
 */
const extractMajorVersion = (url, swaggerJson = null) => {
  // 패턴: /v + 숫자 + / 또는 끝
  const versionPattern = /\/v(\d+)(\/|$)/i;

  // paths에서 버전 추출 시도
  if (swaggerJson && swaggerJson.paths) {
    const firstPath = Object.keys(swaggerJson.paths)[0];
    if (firstPath) {
      const match = firstPath.match(versionPattern);
      if (match) return `v${match[1]}`;
    }
  }

  // paths에 버전 정보 없으면 v1 반환
  return 'v1';
};

/**
 * Swagger JSON 파싱 및 버전 생성/업데이트
 * @param {string} urlId - ApiUrl ID
 * @returns {Promise<object>} 생성/업데이트된 버전 또는 비교 결과
 */
const parseAndSaveSwagger = async (urlId) => {
  const apiUrl = await ApiUrl.findById(urlId);
  if (!apiUrl) {
    throw new Error('URL을 찾을 수 없습니다');
  }

  if (!apiUrl.isActive) {
    throw new Error('비활성화된 URL입니다');
  }

  try {
    // Swagger JSON 다운로드
    const swaggerJson = await fetchSwaggerJson(apiUrl.url);

    // URL/JSON에서 메이저 버전 추출
    const majorVersion = extractMajorVersion(apiUrl.url, swaggerJson);

    // 해당 메이저 버전의 기존 버전 조회
    const existingVersion = await ApiVersion.findOne({
      urlId: apiUrl._id,
      majorVersion,
    });

    const now = new Date();

    if (existingVersion) {
      // ===== 기존 버전 업데이트 로직 =====
      const diffResult = analyzeChanges(existingVersion.swaggerJson, swaggerJson);

      if (!diffResult.hasChanges) {
        // 변경사항 없음 - 상태만 업데이트
        await ApiUrl.findByIdAndUpdate(urlId, {
          lastFetchedAt: now,
          lastFetchStatus: 'success',
          errorMessage: null,
        });

        return {
          created: false,
          updated: false,
          message: '변경사항이 없습니다',
          version: {
            versionId: existingVersion.versionId,
            majorVersion: existingVersion.majorVersion,
            revisionCount: existingVersion.revisionCount,
            lastUpdatedAt: existingVersion.lastUpdatedAt,
          },
        };
      }

      // 변경사항에 타임스탬프 추가
      const timestampedChanges = diffResult.changes.map((change) => ({
        ...change,
        recordedAt: now,
      }));

      // 기존 버전 업데이트
      const updatedVersion = await ApiVersion.findByIdAndUpdate(
        existingVersion._id,
        {
          swaggerJson,
          $push: {
            changes: { $each: timestampedChanges },
            changeHistory: {
              updatedAt: now,
              changesCount: timestampedChanges.length,
              summary: generateSummary(timestampedChanges),
            },
          },
          $inc: { revisionCount: 1 },
          lastUpdatedAt: now,
          endpointCount: countEndpoints(swaggerJson),
          summary: generateSummary(timestampedChanges),
        },
        { new: true }
      );

      // ApiUrl 상태 업데이트
      await ApiUrl.findByIdAndUpdate(urlId, {
        lastFetchedAt: now,
        lastFetchStatus: 'success',
        errorMessage: null,
      });

      return {
        created: false,
        updated: true,
        version: {
          _id: updatedVersion._id,
          versionId: updatedVersion.versionId,
          majorVersion: updatedVersion.majorVersion,
          versionNumber: updatedVersion.versionNumber,
          revisionCount: updatedVersion.revisionCount,
          lastUpdatedAt: updatedVersion.lastUpdatedAt,
          changesCount: timestampedChanges.length,
          summary: updatedVersion.summary,
        },
      };
    } else {
      // ===== 새 버전 생성 로직 =====
      // 이전 최신 버전 조회 (버전 번호 계산용)
      const latestVersion = await ApiVersion.findOne({ urlId: apiUrl._id })
        .sort({ versionNumber: -1 })
        .lean();

      const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      // 초기 변경사항 (이전 버전이 있으면 비교)
      let changes = [];
      if (latestVersion) {
        const diffResult = analyzeChanges(latestVersion.swaggerJson, swaggerJson);
        changes = diffResult.changes.map((change) => ({
          ...change,
          recordedAt: now,
        }));
      }

      const newVersion = await ApiVersion.create({
        urlId: apiUrl._id,
        versionId: majorVersion,
        versionNumber,
        majorVersion,
        timestamp: now,
        lastUpdatedAt: now,
        revisionCount: 1,
        swaggerJson,
        changes,
        previousVersionId: latestVersion?._id || null,
        endpointCount: countEndpoints(swaggerJson),
        summary: changes.length > 0 ? generateSummary(changes) : '초기 버전',
        changeHistory:
          changes.length > 0
            ? [
                {
                  updatedAt: now,
                  changesCount: changes.length,
                  summary: generateSummary(changes),
                },
              ]
            : [],
      });

      // ApiUrl 상태 업데이트
      await ApiUrl.findByIdAndUpdate(urlId, {
        lastFetchedAt: now,
        lastFetchStatus: 'success',
        errorMessage: null,
        $inc: { versionCount: 1 },
      });

      return {
        created: true,
        updated: false,
        version: {
          _id: newVersion._id,
          versionId: newVersion.versionId,
          majorVersion: newVersion.majorVersion,
          versionNumber: newVersion.versionNumber,
          revisionCount: newVersion.revisionCount,
          timestamp: newVersion.timestamp,
          changesCount: changes.length,
          summary: newVersion.summary,
        },
      };
    }
  } catch (error) {
    // 에러 상태 업데이트
    await ApiUrl.findByIdAndUpdate(urlId, {
      lastFetchedAt: new Date(),
      lastFetchStatus: 'error',
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * Swagger JSON에서 endpoint 수 계산
 * @param {object} swaggerJson
 * @returns {number}
 */
const countEndpoints = (swaggerJson) => {
  const paths = swaggerJson.paths || {};
  let count = 0;

  for (const path of Object.values(paths)) {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    for (const method of methods) {
      if (path[method]) {
        count++;
      }
    }
  }

  return count;
};

/**
 * 변경사항 요약 생성
 * @param {Array} changes
 * @returns {string}
 */
const generateSummary = (changes) => {
  if (changes.length === 0) {
    return '초기 버전';
  }

  const added = changes.filter((c) => c.type === 'added').length;
  const removed = changes.filter((c) => c.type === 'removed').length;
  const modified = changes.filter((c) => c.type === 'modified').length;

  const parts = [];
  if (added > 0) parts.push(`${added}개 추가`);
  if (removed > 0) parts.push(`${removed}개 삭제`);
  if (modified > 0) parts.push(`${modified}개 수정`);

  return parts.join(', ');
};

module.exports = {
  fetchSwaggerJson,
  extractMajorVersion,
  parseAndSaveSwagger,
  countEndpoints,
  generateSummary,
};
