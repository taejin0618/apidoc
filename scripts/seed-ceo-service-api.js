/**
 * CEO Service API 비교 버전 데이터 생성 스크립트
 *
 * 실행: node scripts/seed-ceo-service-api.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ApiUrl = require('../src/models/ApiUrl');
const ApiVersion = require('../src/models/ApiVersion');
const { analyzeChanges } = require('../src/services/diffService');

// MongoDB 연결
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB 연결 성공');
}

/**
 * 엔드포인트 개수 계산
 */
function countEndpoints(swaggerJson) {
  if (!swaggerJson.paths) return 0;
  let count = 0;
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
  for (const path in swaggerJson.paths) {
    for (const method of methods) {
      if (swaggerJson.paths[path][method]) {
        count++;
      }
    }
  }
  return count;
}

/**
 * 변경사항 요약 생성
 */
function generateSummary(changes) {
  const stats = {
    added: changes.filter((c) => c.type === 'added').length,
    removed: changes.filter((c) => c.type === 'removed').length,
    modified: changes.filter((c) => c.type === 'modified').length,
  };
  const parts = [];
  if (stats.added > 0) parts.push(`${stats.added}개 추가`);
  if (stats.removed > 0) parts.push(`${stats.removed}개 삭제`);
  if (stats.modified > 0) parts.push(`${stats.modified}개 수정`);
  return parts.length > 0 ? parts.join(', ') : '변경사항 없음';
}

async function createCeoServiceApiVersions() {
  // 1. CEO Service API URL 찾기 또는 생성
  let apiUrl = await ApiUrl.findOne({ name: /ceo service api/i });

  if (!apiUrl) {
    console.log('📝 CEO Service API URL 생성 중...');
    apiUrl = await ApiUrl.create({
      name: 'CEO Service API',
      url: 'https://api.example.com/ceo-service/v1/swagger.json',
      group: 'ceo',
      description: 'CEO 서비스 API 문서 - 변경사항 비교 테스트용',
      isActive: true,
      priority: 'high',
    });
    console.log('✅ API URL 생성 완료:', apiUrl._id);
  } else {
    console.log('✅ 기존 API URL 발견:', apiUrl._id);
  }

  // 2. v1 버전 Swagger JSON 생성 (기본 버전)
  const v1SwaggerJson = {
    openapi: '3.0.0',
    info: {
      title: 'CEO Service API',
      version: '1.0.0',
      description: 'CEO 서비스를 위한 RESTful API',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'https://api.example.com/ceo-service/v1',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Members',
        description: '회원 관리 API',
      },
      {
        name: 'Tenants',
        description: '테넌트 관리 API',
      },
    ],
    paths: {
      '/v1/tenants/{tenantId}/members': {
        get: {
          tags: ['Members'],
          summary: '회원 목록 조회',
          description: '테넌트의 회원 목록을 페이지네이션으로 조회합니다',
          operationId: 'getMembers',
          parameters: [
            {
              name: 'tenantId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: '테넌트 ID',
            },
            {
              name: 'page',
              in: 'query',
              description: '페이지 번호',
              required: false,
              schema: {
                type: 'integer',
                default: 1,
                minimum: 1,
              },
            },
            {
              name: 'size',
              in: 'query',
              description: 'The size of the page to be returned',
              required: false,
              schema: {
                type: 'integer',
                default: 20,
                minimum: 1,
              },
            },
            {
              name: 'search',
              in: 'query',
              description: '검색어',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Member',
                        },
                      },
                      total: {
                        type: 'integer',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Members'],
          summary: '회원 등록',
          description: '새로운 회원을 등록합니다',
          operationId: 'createMember',
          parameters: [
            {
              name: 'tenantId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemberCreateRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: '생성 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Member',
                  },
                },
              },
            },
          },
        },
      },
      '/v1/tenants/{tenantId}/members/{memberId}': {
        get: {
          tags: ['Members'],
          summary: '회원 상세 조회',
          operationId: 'getMember',
          parameters: [
            {
              name: 'tenantId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'memberId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Member',
                  },
                },
              },
            },
          },
        },
        put: {
          tags: ['Members'],
          summary: '회원 정보 수정',
          operationId: 'updateMember',
          parameters: [
            {
              name: 'tenantId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'memberId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemberUpdateRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: '성공',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Member: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            loginId: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        MemberCreateRequest: {
          type: 'object',
          required: ['loginId', 'email'],
          properties: {
            loginId: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
        },
        MemberUpdateRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
        },
      },
    },
  };

  // 3. v1 버전이 있는지 확인
  let v1 = await ApiVersion.findOne({
    urlId: apiUrl._id,
    versionId: 'v1',
  }).lean();

  if (!v1) {
    console.log('📝 v1 버전 생성 중...');
    const now = new Date();
    v1 = await ApiVersion.create({
      urlId: apiUrl._id,
      versionId: 'v1',
      versionNumber: 1,
      majorVersion: 'v1',
      timestamp: now,
      lastUpdatedAt: now,
      revisionCount: 1,
      swaggerJson: v1SwaggerJson,
      changes: [],
      previousVersionId: null,
      endpointCount: countEndpoints(v1SwaggerJson),
      summary: '초기 버전',
      changeHistory: [],
    });
    console.log('✅ v1 버전 생성 완료');
  } else {
    console.log('✅ 기존 v1 버전 발견');
  }

  // 4. v2 버전 Swagger JSON 생성 (변경사항 포함)
  const v2SwaggerJson = JSON.parse(JSON.stringify(v1SwaggerJson));

  // 변경사항 1: info 버전 변경
  v2SwaggerJson.info.version = '2.0.0';
  v2SwaggerJson.info.description = 'CEO 서비스를 위한 RESTful API\n\n## v2.0.0 변경사항\n- 회원 목록 조회 API 개선\n- 파라미터 검증 강화';

  // 변경사항 2: size 파라미터에 maximum 추가
  const membersGetOp = v2SwaggerJson.paths['/v1/tenants/{tenantId}/members'].get;
  const sizeParam = membersGetOp.parameters.find((p) => p.name === 'size');
  if (sizeParam) {
    sizeParam.schema.maximum = 100;
    sizeParam.description = 'The size of the page to be returned (최대 100)';
  }

  // 변경사항 3: page 파라미터에 maximum 추가
  const pageParam = membersGetOp.parameters.find((p) => p.name === 'page');
  if (pageParam) {
    pageParam.schema.maximum = 1000;
    pageParam.description = '페이지 번호 (최대 1000)';
  }

  // 변경사항 4: 새 엔드포인트 추가 - DELETE
  v2SwaggerJson.paths['/v1/tenants/{tenantId}/members/{memberId}'].delete = {
    tags: ['Members'],
    summary: '회원 삭제',
    description: '회원을 삭제합니다 (v2에서 추가됨)',
    operationId: 'deleteMember',
    parameters: [
      {
        name: 'tenantId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'memberId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      '204': {
        description: '삭제 성공',
      },
      '404': {
        description: '회원을 찾을 수 없음',
      },
    },
  };

  // 변경사항 5: 새 태그 추가
  v2SwaggerJson.tags.push({
    name: 'Reports',
    description: '리포트 관리 API',
  });

  // 변경사항 6: 새 서버 추가
  v2SwaggerJson.servers.push({
    url: 'https://staging-api.example.com/ceo-service/v2',
    description: 'Staging server',
  });

  // 변경사항 7: components/schemas에 새 스키마 추가
  v2SwaggerJson.components.schemas.MemberResponse = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
      },
      data: {
        $ref: '#/components/schemas/Member',
      },
    },
  };

  // 변경사항 8: Member 스키마에 필드 추가
  v2SwaggerJson.components.schemas.Member.properties.status = {
    type: 'string',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  };

  // 변경사항 9: externalDocs 추가
  v2SwaggerJson.externalDocs = {
    description: 'API 문서',
    url: 'https://docs.example.com/ceo-service',
  };

  // 변경사항 10: security 추가
  v2SwaggerJson.security = [
    {
      bearerAuth: [],
    },
  ];
  v2SwaggerJson.components.securitySchemes = {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  };

  // 5. diffService로 실제 변경사항 분석
  console.log('🔍 변경사항 분석 중...');
  const diffResult = analyzeChanges(v1.swaggerJson, v2SwaggerJson);
  const now = new Date();
  const changes = diffResult.changes.map((change) => ({
    ...change,
    recordedAt: now,
  }));

  console.log(`✅ ${changes.length}개의 변경사항 발견`);

  // 6. 기존 v2가 있으면 삭제
  await ApiVersion.deleteMany({
    urlId: apiUrl._id,
    versionId: 'v2',
  });

  // 7. v2 버전 생성
  console.log('📝 v2 버전 생성 중...');
  const v2 = await ApiVersion.create({
    urlId: apiUrl._id,
    versionId: 'v2',
    versionNumber: 2,
    majorVersion: 'v2',
    timestamp: new Date(now.getTime() + 1000), // v1보다 1초 후
    lastUpdatedAt: now,
    revisionCount: 1,
    swaggerJson: v2SwaggerJson,
    changes: changes,
    previousVersionId: v1._id,
    endpointCount: countEndpoints(v2SwaggerJson),
    summary: generateSummary(changes),
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

  console.log('✅ v2 버전 생성 완료');

  // 8. ApiUrl의 versionCount 업데이트
  const versionCount = await ApiVersion.countDocuments({ urlId: apiUrl._id });
  await ApiUrl.findByIdAndUpdate(apiUrl._id, {
    $set: { versionCount },
  });

  // 9. 변경사항 요약 출력
  console.log('\n=== 생성된 변경사항 요약 ===');
  const stats = {
    added: changes.filter((c) => c.type === 'added').length,
    removed: changes.filter((c) => c.type === 'removed').length,
    modified: changes.filter((c) => c.type === 'modified').length,
  };
  console.log(`➕ 추가: ${stats.added}개`);
  console.log(`➖ 삭제: ${stats.removed}개`);
  console.log(`🔄 수정: ${stats.modified}개`);
  console.log(`📊 총 ${changes.length}개 변경사항`);

  console.log('\n=== 주요 변경사항 ===');
  changes.slice(0, 10).forEach((c, idx) => {
    const icon = c.type === 'added' ? '➕' : c.type === 'removed' ? '➖' : '🔄';
    console.log(`${idx + 1}. ${icon} [${c.severity}] ${c.category}: ${c.path}`);
    if (c.field) console.log(`   필드: ${c.field}`);
    console.log(`   설명: ${c.description}`);
  });

  if (changes.length > 10) {
    console.log(`\n... 외 ${changes.length - 10}개 변경사항`);
  }

  console.log(`\n✅ CEO Service API 버전 데이터 생성 완료!`);
  console.log(`📋 API ID: ${apiUrl._id}`);
  console.log(`🔗 비교 페이지: http://localhost:3000/version-compare?id=${apiUrl._id}`);
}

async function main() {
  try {
    await connectDB();
    await createCeoServiceApiVersions();
  } catch (error) {
    console.error('❌ 에러:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

main();




