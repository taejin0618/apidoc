/**
 * 버전 비교 테스트용 샘플 데이터 생성 스크립트
 *
 * 실행: node scripts/seed-sample-version.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB 연결
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB 연결 성공');
}

async function createSampleVersion() {
  const ApiVersion = mongoose.model('ApiVersion', new mongoose.Schema({}, { strict: false }));
  const ApiUrl = mongoose.model('ApiUrl', new mongoose.Schema({}, { strict: false }));

  // 대상 API URL ID
  const urlId = '6925020f0ca0709eac88abb5';

  // v1 버전 조회
  const v1 = await ApiVersion.findOne({ urlId: new mongoose.Types.ObjectId(urlId), versionId: 'v1' }).lean();

  if (!v1) {
    console.error('v1 버전을 찾을 수 없습니다');
    process.exit(1);
  }

  console.log('v1 버전 찾음:', v1.versionId);

  // 기존 v2가 있으면 삭제
  await ApiVersion.deleteMany({ urlId: new mongoose.Types.ObjectId(urlId), versionId: 'v2' });
  console.log('기존 v2 삭제 완료');

  // swaggerJson 복사 및 수정
  const newSwaggerJson = JSON.parse(JSON.stringify(v1.swaggerJson));

  // 1. 새 엔드포인트 추가: POST /v1/tenants/{tenantId}/members/bulk
  newSwaggerJson.paths['/v1/tenants/{tenantId}/members/bulk'] = {
    post: {
      tags: ['Member API'],
      summary: '대량 회원 등록',
      description: '여러 회원을 한 번에 등록합니다. (v2에서 추가됨)',
      operationId: 'bulkCreateMembers',
      parameters: [
        {
          name: 'tenantId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: '테넌트 ID'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      loginId: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: '성공',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  successCount: { type: 'integer' },
                  failCount: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  };

  // 2. 엔드포인트 삭제 시뮬레이션: 기존 경로 하나를 삭제
  // /v1/tenants/{tenantId}/members/{loginId}/verifications 삭제 (deprecated로 가정)
  const deletedPath = '/v1/tenants/{tenantId}/members/{loginId}/verifications';
  const deletedEndpoint = newSwaggerJson.paths[deletedPath];
  delete newSwaggerJson.paths[deletedPath];

  // 3. 파라미터 수정: /v1/tenants/{tenantId}/members 의 GET 파라미터 수정
  const membersPath = '/v1/tenants/{tenantId}/members';
  if (newSwaggerJson.paths[membersPath] && newSwaggerJson.paths[membersPath].get) {
    const getOperation = newSwaggerJson.paths[membersPath].get;

    // page 파라미터에 최대값 제한 추가
    if (getOperation.parameters) {
      const pageParam = getOperation.parameters.find(p => p.name === 'page');
      if (pageParam) {
        pageParam.schema = {
          ...pageParam.schema,
          maximum: 1000,
          description: '페이지 번호 (최대 1000)'
        };
      }
    }
  }

  // 4. description 수정
  if (newSwaggerJson.info) {
    newSwaggerJson.info.version = '2.0.0';
    newSwaggerJson.info.description = (newSwaggerJson.info.description || '') + '\n\n## v2.0.0 변경사항\n- 대량 회원 등록 API 추가\n- 회원 인증 API deprecated\n- 페이지네이션 제한 추가';
  }

  // 변경사항 배열 생성
  const changes = [
    {
      type: 'added',
      category: 'endpoint',
      path: 'POST /v1/tenants/{tenantId}/members/bulk',
      field: null,
      oldValue: null,
      newValue: newSwaggerJson.paths['/v1/tenants/{tenantId}/members/bulk'].post,
      description: '새 엔드포인트 추가: 대량 회원 등록 API',
      severity: 'high'
    },
    {
      type: 'removed',
      category: 'endpoint',
      path: `GET ${deletedPath}`,
      field: null,
      oldValue: deletedEndpoint,
      newValue: null,
      description: '엔드포인트 삭제: 회원 인증 API (deprecated)',
      severity: 'high'
    },
    {
      type: 'modified',
      category: 'parameter',
      path: `GET ${membersPath}`,
      field: 'page',
      oldValue: { type: 'integer' },
      newValue: { type: 'integer', maximum: 1000 },
      description: 'page 파라미터에 최대값 1000 제한 추가',
      severity: 'medium'
    },
    {
      type: 'modified',
      category: 'info',
      path: 'info',
      field: 'version',
      oldValue: v1.swaggerJson.info?.version || '1.0.0',
      newValue: '2.0.0',
      description: 'API 버전 변경: 1.0.0 → 2.0.0',
      severity: 'low'
    }
  ];

  // v2 버전 생성
  const v2 = new ApiVersion({
    urlId: new mongoose.Types.ObjectId(urlId),
    versionId: 'v2',
    versionNumber: 2,
    timestamp: new Date(),
    swaggerJson: newSwaggerJson,
    changes: changes,
    previousVersionId: v1._id,
    endpointCount: Object.keys(newSwaggerJson.paths).reduce((count, path) => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      return count + methods.filter(m => newSwaggerJson.paths[path][m]).length;
    }, 0),
    summary: '1개 추가, 1개 삭제, 2개 수정'
  });

  await v2.save();
  console.log('v2 버전 생성 완료:', v2.versionId);

  // ApiUrl의 versionCount 업데이트
  await ApiUrl.findByIdAndUpdate(urlId, {
    $set: { versionCount: 2 }
  });

  console.log('\n=== 생성된 변경사항 ===');
  changes.forEach(c => {
    const icon = c.type === 'added' ? '➕' : c.type === 'removed' ? '➖' : '🔄';
    console.log(`${icon} [${c.severity}] ${c.type}: ${c.path} - ${c.description}`);
  });
}

async function main() {
  try {
    await connectDB();
    await createSampleVersion();
    console.log('\n샘플 데이터 생성 완료!');
    console.log('http://localhost:3000/version-compare?id=6925020f0ca0709eac88abb5 에서 확인하세요.');
  } catch (error) {
    console.error('에러:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
