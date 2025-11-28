const mongoose = require('mongoose');

const apiUrlSchema = new mongoose.Schema(
  {
    // 서비스명
    name: {
      type: String,
      required: [true, '서비스명은 필수입니다'],
      trim: true,
      maxlength: [100, '서비스명은 100자 이내여야 합니다'],
    },

    // Swagger URL
    url: {
      type: String,
      required: [true, 'URL은 필수입니다'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: '유효한 HTTP(S) URL이어야 합니다',
      },
    },

    // 카테고리/그룹
    group: {
      type: String,
      required: [true, '그룹은 필수입니다'],
      trim: true,
      lowercase: true,
    },

    // 설명
    description: {
      type: String,
      trim: true,
      maxlength: [500, '설명은 500자 이내여야 합니다'],
    },

    // 활성화 여부
    isActive: {
      type: Boolean,
      default: true,
    },

    // 마지막 크롤링 시간
    lastFetchedAt: {
      type: Date,
      default: null,
    },

    // 마지막 크롤링 결과
    lastFetchStatus: {
      type: String,
      enum: ['pending', 'success', 'error'],
      default: 'pending',
    },

    // 에러 메시지
    errorMessage: {
      type: String,
      default: null,
    },

    // 담당 팀/담당자 이메일
    owner: {
      type: String,
      trim: true,
    },

    // 태그
    tags: {
      type: [String],
      default: [],
    },

    // 우선순위
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // 최신 버전 수
    versionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 인덱스 생성
apiUrlSchema.index({ group: 1 });
apiUrlSchema.index({ isActive: 1 });
apiUrlSchema.index({ lastFetchStatus: 1 });
apiUrlSchema.index({ name: 'text', description: 'text' }); // 텍스트 검색용

// Virtual: 버전 목록 참조
apiUrlSchema.virtual('versions', {
  ref: 'ApiVersion',
  localField: '_id',
  foreignField: 'urlId',
});

// 저장 전 URL 정규화
apiUrlSchema.pre('save', function (next) {
  // URL 끝에 / 제거
  if (this.url && this.url.endsWith('/')) {
    this.url = this.url.slice(0, -1);
  }
  next();
});

const ApiUrl = mongoose.model('ApiUrl', apiUrlSchema);

module.exports = ApiUrl;
