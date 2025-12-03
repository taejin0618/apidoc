const express = require('express');
const Joi = require('joi');
const ApiUrl = require('../models/ApiUrl');
const { parseAndSaveSwagger } = require('../services/swaggerService');
const { AppError } = require('../middlewares/errorHandler');

const router = express.Router();

// ===== Validation Schemas =====

const createUrlSchema = Joi.object({
  name: Joi.string().required().max(100).messages({
    'string.empty': '서비스명은 필수입니다',
    'string.max': '서비스명은 100자 이내여야 합니다',
  }),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required().messages({
    'string.uri': '유효한 HTTP(S) URL이어야 합니다',
    'string.empty': 'URL은 필수입니다',
  }),
  group: Joi.string().required().messages({
    'string.empty': '팀은 필수입니다',
  }),
  service: Joi.string().required().messages({
    'string.empty': '서비스는 필수입니다',
  }),
  description: Joi.string().max(500).allow('').optional(),
  owner: Joi.string().email().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
});

const updateUrlSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  group: Joi.string().optional(),
  service: Joi.string().optional(),
  description: Joi.string().max(500).allow('').optional(),
  owner: Joi.string().email().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

// ===== Helper Functions =====

const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값 검증 실패',
        details: error.details.map((d) => d.message),
      },
    });
  }
  req.validatedBody = value;
  next();
};

// ===== Routes =====

/**
 * GET /api/urls
 * 모든 URL 목록 조회
 */
router.get('/', async (req, res, next) => {
  try {
    const { group, service, isActive, search, sort = '-updatedAt', page = 1, limit = 50 } = req.query;

    // 필터 조건 구성
    const filter = {};
    if (group) filter.group = group.toLowerCase();
    if (service) filter.service = service.toLowerCase();
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // 페이지네이션
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 쿼리 실행
    const [urls, total] = await Promise.all([
      ApiUrl.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ApiUrl.countDocuments(filter),
    ]);

    // 그룹 목록 조회
    const groups = await ApiUrl.distinct('group');

    res.json({
      success: true,
      data: urls,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        groups,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:id
 * 특정 URL 상세 조회
 */
router.get('/:id', async (req, res, next) => {
  try {
    const url = await ApiUrl.findById(req.params.id).lean();

    if (!url) {
      throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: url,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/urls
 * 새 URL 추가
 */
router.post('/', validateRequest(createUrlSchema), async (req, res, next) => {
  try {
    const url = await ApiUrl.create(req.validatedBody);

    res.status(201).json({
      success: true,
      data: url,
      message: 'URL이 성공적으로 추가되었습니다',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/urls/:id
 * URL 정보 수정
 */
router.put('/:id', validateRequest(updateUrlSchema), async (req, res, next) => {
  try {
    const url = await ApiUrl.findByIdAndUpdate(
      req.params.id,
      req.validatedBody,
      { new: true, runValidators: true }
    );

    if (!url) {
      throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: url,
      message: 'URL이 성공적으로 수정되었습니다',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/urls/:id
 * URL 삭제
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const url = await ApiUrl.findByIdAndDelete(req.params.id);

    if (!url) {
      throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    // 연관된 버전도 삭제 (Phase 3에서 구현)
    // await ApiVersion.deleteMany({ urlId: req.params.id });

    res.json({
      success: true,
      message: 'URL이 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/urls/:id/activate
 * URL 활성화/비활성화 토글
 */
router.patch('/:id/activate', async (req, res, next) => {
  try {
    const url = await ApiUrl.findById(req.params.id);

    if (!url) {
      throw new AppError('URL을 찾을 수 없습니다', 404, 'NOT_FOUND');
    }

    url.isActive = !url.isActive;
    await url.save();

    res.json({
      success: true,
      data: { isActive: url.isActive },
      message: url.isActive ? 'URL이 활성화되었습니다' : 'URL이 비활성화되었습니다',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/urls/:id/fetch
 * 수동으로 Swagger JSON 가져오기
 */
router.post('/:id/fetch', async (req, res, next) => {
  try {
    const result = await parseAndSaveSwagger(req.params.id);

    res.json({
      success: true,
      data: result,
      message: result.created
        ? '새 버전이 생성되었습니다'
        : '변경사항이 없습니다',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
