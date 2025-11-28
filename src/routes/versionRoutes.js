const express = require('express');
const ApiUrl = require('../models/ApiUrl');
const ApiVersion = require('../models/ApiVersion');
const { analyzeChanges, getRawDiff } = require('../services/diffService');
const { AppError } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * GET /api/urls/:urlId/versions
 * 특정 URL의 모든 버전 목록 조회
 */
router.get('/:urlId/versions', async (req, res, next) => {
  try {
    const { urlId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // URL 존재 확인
    const apiUrl = await ApiUrl.findById(urlId).lean();
    if (!apiUrl) {
      throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    // 버전 목록 조회 (swaggerJson 제외)
    const result = await ApiVersion.getVersionList(urlId, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeSwagger: false,
    });

    res.json({
      success: true,
      data: {
        apiUrl: {
          _id: apiUrl._id,
          name: apiUrl.name,
          url: apiUrl.url,
          group: apiUrl.group,
        },
        versions: result.versions,
      },
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:urlId/versions/latest
 * 최신 버전 조회 (Swagger JSON 포함)
 */
router.get('/:urlId/versions/latest', async (req, res, next) => {
  try {
    const { urlId } = req.params;

    const version = await ApiVersion.getLatestVersion(urlId);

    if (!version) {
      throw new AppError('버전을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:urlId/versions/:versionId
 * 특정 버전 상세 조회
 */
router.get('/:urlId/versions/:versionId', async (req, res, next) => {
  try {
    const { urlId, versionId } = req.params;
    const { includeSwagger = 'true' } = req.query;

    const projection =
      includeSwagger === 'true' ? {} : { swaggerJson: 0 };

    const version = await ApiVersion.findOne(
      { urlId, versionId },
      projection
    ).lean();

    if (!version) {
      throw new AppError('버전을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:urlId/versions/:versionId/diff
 * 특정 버전과 이전 버전 비교
 */
router.get('/:urlId/versions/:versionId/diff', async (req, res, next) => {
  try {
    const { urlId, versionId } = req.params;
    const { compareWith } = req.query; // 비교할 버전 ID (선택)

    // 현재 버전 조회
    const currentVersion = await ApiVersion.findOne({ urlId, versionId }).lean();

    if (!currentVersion) {
      throw new AppError('버전을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    // 비교할 버전 결정
    let previousVersion;

    if (compareWith) {
      // 특정 버전과 비교
      previousVersion = await ApiVersion.findOne({
        urlId,
        versionId: compareWith,
      }).lean();
    } else if (currentVersion.previousVersionId) {
      // 이전 버전과 비교
      previousVersion = await ApiVersion.findById(
        currentVersion.previousVersionId
      ).lean();
    }

    // 이전 버전이 없으면 (최초 버전)
    if (!previousVersion) {
      return res.json({
        success: true,
        data: {
          currentVersion: {
            versionId: currentVersion.versionId,
            versionNumber: currentVersion.versionNumber,
            timestamp: currentVersion.timestamp,
            swaggerJson: currentVersion.swaggerJson,
          },
          previousVersion: null,
          changes: currentVersion.changes,
          isFirstVersion: true,
        },
      });
    }

    // 변경사항 다시 계산 (저장된 changes가 없는 경우)
    let changes = currentVersion.changes;
    if (!changes || changes.length === 0) {
      const diffResult = analyzeChanges(
        previousVersion.swaggerJson,
        currentVersion.swaggerJson
      );
      changes = diffResult.changes;
    }

    res.json({
      success: true,
      data: {
        currentVersion: {
          versionId: currentVersion.versionId,
          versionNumber: currentVersion.versionNumber,
          timestamp: currentVersion.timestamp,
          swaggerJson: currentVersion.swaggerJson,
        },
        previousVersion: {
          versionId: previousVersion.versionId,
          versionNumber: previousVersion.versionNumber,
          timestamp: previousVersion.timestamp,
          swaggerJson: previousVersion.swaggerJson,
        },
        changes,
        isFirstVersion: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:urlId/versions/:v1/compare/:v2
 * 두 특정 버전 비교
 */
router.get('/:urlId/versions/:v1/compare/:v2', async (req, res, next) => {
  try {
    const { urlId, v1, v2 } = req.params;

    // 두 버전 동시 조회
    const [version1, version2] = await Promise.all([
      ApiVersion.findOne({ urlId, versionId: v1 }).lean(),
      ApiVersion.findOne({ urlId, versionId: v2 }).lean(),
    ]);

    if (!version1) {
      throw new AppError(`버전 ${v1}을(를) 찾을 수 없습니다`, 404, 'NOT_FOUND');
    }
    if (!version2) {
      throw new AppError(`버전 ${v2}을(를) 찾을 수 없습니다`, 404, 'NOT_FOUND');
    }

    // 변경사항 분석 (v1 → v2)
    const diffResult = analyzeChanges(version1.swaggerJson, version2.swaggerJson);

    res.json({
      success: true,
      data: {
        version1: {
          versionId: version1.versionId,
          versionNumber: version1.versionNumber,
          timestamp: version1.timestamp,
          swaggerJson: version1.swaggerJson,
        },
        version2: {
          versionId: version2.versionId,
          versionNumber: version2.versionNumber,
          timestamp: version2.timestamp,
          swaggerJson: version2.swaggerJson,
        },
        changes: diffResult.changes,
        rawDiff: getRawDiff(version1.swaggerJson, version2.swaggerJson),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/versions/latest
 * 모든 URL의 최신 버전 목록 (대시보드용)
 */
router.get('/latest', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // 최신 버전 조회 (URL 정보 포함)
    const versions = await ApiVersion.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$urlId',
          latestVersion: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestVersion' } },
      { $sort: { timestamp: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'apiurls',
          localField: 'urlId',
          foreignField: '_id',
          as: 'apiUrl',
        },
      },
      { $unwind: '$apiUrl' },
      {
        $project: {
          swaggerJson: 0,
        },
      },
    ]);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/versions/recent-changes
 * 최근 변경사항 조회 (대시보드용)
 */
router.get('/recent-changes', async (req, res, next) => {
  try {
    const { limit = 20, days = 7 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const versions = await ApiVersion.find(
      {
        timestamp: { $gte: since },
        'changes.0': { $exists: true }, // 변경사항이 있는 버전만
      },
      { swaggerJson: 0 }
    )
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('urlId', 'name group url')
      .lean();

    res.json({
      success: true,
      data: versions,
      meta: {
        since: since.toISOString(),
        count: versions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
