const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // 작업 종류
    action: {
      type: String,
      required: true,
      enum: [
        'fetch_swagger',
        'create_url',
        'update_url',
        'delete_url',
        'activate_url',
        'create_version',
        'error',
      ],
      index: true,
    },

    // 관련 URL ID
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiUrl',
      default: null,
    },

    // 관련 버전 ID
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiVersion',
      default: null,
    },

    // 수행자 (system 또는 사용자 이메일)
    user: {
      type: String,
      default: 'system',
    },

    // 상태
    status: {
      type: String,
      enum: ['success', 'error', 'pending'],
      default: 'success',
    },

    // 상세 정보
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 에러 메시지
    errorMessage: {
      type: String,
      default: null,
    },

    // IP 주소
    ipAddress: {
      type: String,
      default: null,
    },

    // User Agent
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// 인덱스
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ urlId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// TTL 인덱스 (90일 후 자동 삭제)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// 정적 메서드: 로그 생성 헬퍼
auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Audit log 생성 실패:', error.message);
    return null;
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
