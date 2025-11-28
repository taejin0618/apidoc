const mongoose = require('mongoose');

// 변경사항 스키마
const changeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['added', 'removed', 'modified'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'endpoint',
        'parameter',
        'requestBody',
        'response',
        'schema',
        'info',
        'description',
        'server',
        'security',
        'tag',
        'externalDocs',
        'securityScheme',
        'header',
        'example',
        'link',
        'callback',
      ],
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      default: null,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    // 변경 기록 시점
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// API 버전 스키마
const apiVersionSchema = new mongoose.Schema(
  {
    // api_urls 참조
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiUrl',
      required: true,
      index: true,
    },

    // 버전 번호 (문자열)
    versionId: {
      type: String,
      required: true,
    },

    // 버전 번호 (정렬용 숫자)
    versionNumber: {
      type: Number,
      required: true,
    },

    // 생성 시간
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 원본 Swagger JSON (완전한 버전 보존)
    swaggerJson: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // 변경사항 분석
    changes: {
      type: [changeSchema],
      default: [],
    },

    // 이전 버전 참조
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiVersion',
      default: null,
    },

    // 메타데이터
    endpointCount: {
      type: Number,
      default: 0,
    },

    parameterCount: {
      type: Number,
      default: 0,
    },

    // 변경 요약
    summary: {
      type: String,
      default: '',
    },

    // URL 기반 메이저 버전 (v1, v2, default)
    majorVersion: {
      type: String,
      default: null,
    },

    // 동일 메이저 버전 내 리비전 횟수
    revisionCount: {
      type: Number,
      default: 1,
    },

    // 마지막 업데이트 시점
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    // 변경 이력 요약 (리비전별)
    changeHistory: {
      type: [
        {
          updatedAt: { type: Date, required: true },
          changesCount: { type: Number, default: 0 },
          summary: { type: String, default: '' },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 복합 인덱스 (URL별 버전 조회 최적화)
apiVersionSchema.index({ urlId: 1, versionNumber: -1 });
apiVersionSchema.index({ urlId: 1, timestamp: -1 });
apiVersionSchema.index({ urlId: 1, majorVersion: 1 });  // URL + 메이저버전 조회

// Virtual: URL 정보 참조
apiVersionSchema.virtual('apiUrl', {
  ref: 'ApiUrl',
  localField: 'urlId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: 변경사항 통계
apiVersionSchema.virtual('changeStats').get(function () {
  const stats = {
    added: 0,
    removed: 0,
    modified: 0,
    total: this.changes.length,
    bySeverity: { high: 0, medium: 0, low: 0 },
    byCategory: {},
  };

  for (const change of this.changes) {
    stats[change.type]++;
    stats.bySeverity[change.severity]++;
    stats.byCategory[change.category] = (stats.byCategory[change.category] || 0) + 1;
  }

  return stats;
});

// 정적 메서드: URL의 최신 버전 조회
apiVersionSchema.statics.getLatestVersion = async function (urlId) {
  return this.findOne({ urlId }).sort({ versionNumber: -1 }).lean();
};

// 정적 메서드: URL의 버전 목록 조회
apiVersionSchema.statics.getVersionList = async function (urlId, options = {}) {
  const { page = 1, limit = 20, includeSwagger = false } = options;
  const skip = (page - 1) * limit;

  const projection = includeSwagger ? {} : { swaggerJson: 0 };

  const [versions, total] = await Promise.all([
    this.find({ urlId }, projection)
      .sort({ versionNumber: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ urlId }),
  ]);

  return {
    versions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const ApiVersion = mongoose.model('ApiVersion', apiVersionSchema);

module.exports = ApiVersion;
