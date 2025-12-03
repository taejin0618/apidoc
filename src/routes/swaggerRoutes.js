const express = require('express');

const router = express.Router();

/**
 * OpenAPI 3.0 스펙 생성
 */
const generateSwaggerSpec = () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return {
    openapi: '3.0.0',
    info: {
      title: 'API Doc Manager API',
      description: 'Swagger/OpenAPI 문서의 버전 관리 및 변경사항 추적 시스템 API',
      version: '1.0.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `${baseUrl}/api`,
        description: 'API 서버',
      },
    ],
    tags: [
      { name: 'Health', description: '헬스 체크' },
      { name: 'URLs', description: 'URL 관리 API' },
      { name: 'Versions', description: '버전 관리 API' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: '서버 상태 확인',
          description: '서버 상태를 확인합니다.',
          operationId: 'getHealth',
          responses: {
            '200': {
              description: '서버가 정상 작동 중',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/urls': {
        get: {
          tags: ['URLs'],
          summary: 'URL 목록 조회',
          description: '등록된 API URL 목록을 조회합니다.',
          operationId: 'getUrls',
          parameters: [
            {
              name: 'group',
              in: 'query',
              description: '그룹별 필터링',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'service',
              in: 'query',
              description: '서비스별 필터링',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'isActive',
              in: 'query',
              description: '활성화 상태 필터',
              required: false,
              schema: { type: 'boolean' },
            },
            {
              name: 'search',
              in: 'query',
              description: '이름/설명 텍스트 검색',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'sort',
              in: 'query',
              description: '정렬 기준 (공백으로 구분, `-`로 내림차순)',
              required: false,
              schema: { type: 'string', default: '-updatedAt' },
            },
            {
              name: 'page',
              in: 'query',
              description: '페이지 번호',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: '페이지당 항목 수',
              required: false,
              schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UrlListResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        post: {
          tags: ['URLs'],
          summary: 'URL 등록',
          description: '새 API URL을 등록합니다.',
          operationId: 'createUrl',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUrlRequest',
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
                    $ref: '#/components/schemas/UrlResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{id}': {
        get: {
          tags: ['URLs'],
          summary: 'URL 상세 조회',
          description: '특정 API URL의 상세 정보를 조회합니다.',
          operationId: 'getUrlById',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UrlResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        put: {
          tags: ['URLs'],
          summary: 'URL 수정',
          description: 'API URL 정보를 수정합니다.',
          operationId: 'updateUrl',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateUrlRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: '수정 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UrlResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        delete: {
          tags: ['URLs'],
          summary: 'URL 삭제',
          description: 'API URL을 삭제합니다.',
          operationId: 'deleteUrl',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '삭제 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SuccessMessageResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{id}/activate': {
        patch: {
          tags: ['URLs'],
          summary: 'URL 활성화/비활성화',
          description: 'API URL의 활성화 상태를 토글합니다.',
          operationId: 'toggleUrlActivation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ActivationResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{id}/fetch': {
        post: {
          tags: ['URLs'],
          summary: 'Swagger JSON 가져오기',
          description: 'Swagger JSON을 수동으로 가져와 버전을 생성/업데이트합니다.',
          operationId: 'fetchSwagger',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FetchResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{urlId}/versions': {
        get: {
          tags: ['Versions'],
          summary: '버전 목록 조회',
          description: '특정 URL의 버전 목록을 조회합니다.',
          operationId: 'getVersions',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              description: '페이지 번호',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: '페이지당 항목 수',
              required: false,
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VersionListResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{urlId}/versions/latest': {
        get: {
          tags: ['Versions'],
          summary: '최신 버전 조회',
          description: '최신 버전을 조회합니다 (swaggerJson 포함).',
          operationId: 'getLatestVersion',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VersionResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{urlId}/versions/{versionId}': {
        get: {
          tags: ['Versions'],
          summary: '버전 상세 조회',
          description: '특정 버전의 상세 정보를 조회합니다.',
          operationId: 'getVersionById',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
            {
              name: 'versionId',
              in: 'path',
              required: true,
              description: '버전 ID 문자열 (예: "v1", "v2")',
              schema: { type: 'string' },
            },
            {
              name: 'includeSwagger',
              in: 'query',
              description: 'Swagger JSON 포함 여부',
              required: false,
              schema: { type: 'string', enum: ['true', 'false'], default: 'true' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VersionResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{urlId}/versions/{versionId}/diff': {
        get: {
          tags: ['Versions'],
          summary: '버전 비교',
          description: '특정 버전과 이전 버전(또는 지정 버전)을 비교합니다.',
          operationId: 'getVersionDiff',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
            {
              name: 'versionId',
              in: 'path',
              required: true,
              description: '비교 대상 버전 ID 문자열',
              schema: { type: 'string' },
            },
            {
              name: 'compareWith',
              in: 'query',
              description: '비교할 버전 ID (미지정 시 이전 버전)',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VersionDiffResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/urls/{urlId}/versions/{v1}/compare/{v2}': {
        get: {
          tags: ['Versions'],
          summary: '두 버전 비교',
          description: '두 특정 버전을 비교합니다.',
          operationId: 'compareVersions',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string' },
            },
            {
              name: 'v1',
              in: 'path',
              required: true,
              description: '첫 번째 버전 ID 문자열',
              schema: { type: 'string' },
            },
            {
              name: 'v2',
              in: 'path',
              required: true,
              description: '두 번째 버전 ID 문자열',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VersionCompareResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/versions/latest': {
        get: {
          tags: ['Versions'],
          summary: '모든 URL의 최신 버전 목록',
          description: '모든 URL의 최신 버전 목록을 조회합니다 (대시보드용).',
          operationId: 'getAllLatestVersions',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: '조회할 개수',
              required: false,
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LatestVersionsResponse',
                  },
                },
              },
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
      '/versions/recent-changes': {
        get: {
          tags: ['Versions'],
          summary: '최근 변경사항 조회',
          description: '최근 변경사항을 조회합니다.',
          operationId: 'getRecentChanges',
          parameters: [
            {
              name: 'days',
              in: 'query',
              description: '조회 기간 (일)',
              required: false,
              schema: { type: 'integer', default: 7, minimum: 1, maximum: 365 },
            },
            {
              name: 'limit',
              in: 'query',
              description: '최대 개수',
              required: false,
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/RecentChangesResponse',
                  },
                },
              },
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number', example: 123.456 },
              },
            },
          },
        },
        ApiUrl: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'MongoDB ObjectId' },
            name: { type: 'string', example: 'User Service API', maxLength: 100 },
            url: { type: 'string', format: 'uri', example: 'https://api.example.com/swagger.json' },
            group: { type: 'string', example: 'backend' },
            service: { type: 'string', example: 'user-service' },
            description: { type: 'string', example: '사용자 관리 API', maxLength: 500 },
            isActive: { type: 'boolean', example: true },
            owner: { type: 'string', format: 'email', example: 'developer@example.com' },
            tags: { type: 'array', items: { type: 'string' }, example: ['v2', 'production'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
            lastFetchedAt: { type: 'string', format: 'date-time', nullable: true },
            lastFetchStatus: { type: 'string', enum: ['pending', 'success', 'error'], example: 'success' },
            versionCount: { type: 'integer', example: 5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateUrlRequest: {
          type: 'object',
          required: ['name', 'url', 'group', 'service'],
          properties: {
            name: { type: 'string', maxLength: 100, example: 'User Service API' },
            url: { type: 'string', format: 'uri', example: 'https://api.example.com/swagger.json' },
            group: { type: 'string', example: 'backend' },
            service: { type: 'string', example: 'user-service' },
            description: { type: 'string', maxLength: 500, example: '사용자 관리 API' },
            owner: { type: 'string', format: 'email', example: 'developer@example.com' },
            tags: { type: 'array', items: { type: 'string' }, example: ['v2', 'production'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
          },
        },
        UpdateUrlRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 100 },
            url: { type: 'string', format: 'uri' },
            group: { type: 'string' },
            service: { type: 'string' },
            description: { type: 'string', maxLength: 500 },
            owner: { type: 'string', format: 'email' },
            tags: { type: 'array', items: { type: 'string' } },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            isActive: { type: 'boolean' },
          },
        },
        UrlResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ApiUrl' },
            message: { type: 'string', example: 'URL이 성공적으로 추가되었습니다' },
          },
        },
        UrlListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/ApiUrl' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 25 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 3 },
                groups: { type: 'array', items: { type: 'string' }, example: ['backend', 'frontend'] },
                services: { type: 'array', items: { type: 'string' }, example: ['user-service', 'auth-service'] },
                servicesByGroup: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  example: { backend: ['user-service', 'auth-service'] },
                },
              },
            },
          },
        },
        SuccessMessageResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'URL이 성공적으로 삭제되었습니다' },
          },
        },
        ActivationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                isActive: { type: 'boolean', example: false },
              },
            },
            message: { type: 'string', example: 'URL이 비활성화되었습니다' },
          },
        },
        FetchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                created: { type: 'boolean', example: true },
                updated: { type: 'boolean', example: false },
                version: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    _id: { type: 'string' },
                    versionId: { type: 'string', example: 'v3' },
                    majorVersion: { type: 'string', example: 'v1' },
                    versionNumber: { type: 'integer', example: 3 },
                    endpointCount: { type: 'integer', example: 15 },
                    summary: { type: 'string', example: '5개 추가, 2개 삭제, 3개 수정' },
                  },
                },
              },
            },
            message: { type: 'string', example: '새 버전이 생성되었습니다' },
          },
        },
        ApiVersion: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'MongoDB ObjectId' },
            urlId: { type: 'string', description: 'API URL의 MongoDB ObjectId' },
            versionId: { type: 'string', example: 'v2' },
            versionNumber: { type: 'integer', example: 2 },
            majorVersion: { type: 'string', example: 'v1' },
            revisionCount: { type: 'integer', example: 1 },
            timestamp: { type: 'string', format: 'date-time' },
            lastUpdatedAt: { type: 'string', format: 'date-time' },
            swaggerJson: { type: 'object', description: 'Swagger/OpenAPI JSON 객체' },
            changes: {
              type: 'array',
              items: { $ref: '#/components/schemas/Change' },
            },
            changeHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  updatedAt: { type: 'string', format: 'date-time' },
                  changesCount: { type: 'integer' },
                  summary: { type: 'string' },
                },
              },
            },
            endpointCount: { type: 'integer', example: 10 },
            parameterCount: { type: 'integer', example: 25 },
            summary: { type: 'string', example: '5개 추가, 2개 삭제' },
          },
        },
        Change: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: { type: 'string', enum: ['added', 'removed', 'modified', 'path_version_changed'] },
            category: {
              type: 'string',
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
            },
            path: { type: 'string', example: 'POST /api/users' },
            field: { type: 'string', nullable: true },
            oldValue: { type: 'object', nullable: true },
            newValue: { type: 'object', nullable: true },
            description: { type: 'string', example: '사용자 생성 엔드포인트 추가' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
            recordedAt: { type: 'string', format: 'date-time' },
            metadata: { type: 'object', nullable: true },
          },
        },
        VersionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ApiVersion' },
          },
        },
        VersionListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                apiUrl: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    url: { type: 'string' },
                    group: { type: 'string' },
                  },
                },
                versions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ApiVersion' },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 3 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 1 },
              },
            },
          },
        },
        VersionDiffResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                currentVersion: {
                  type: 'object',
                  properties: {
                    versionId: { type: 'string' },
                    versionNumber: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    swaggerJson: { type: 'object' },
                  },
                },
                previousVersion: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    versionId: { type: 'string' },
                    versionNumber: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    swaggerJson: { type: 'object' },
                  },
                },
                changes: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Change' },
                },
                isFirstVersion: { type: 'boolean', example: false },
              },
            },
          },
        },
        VersionCompareResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                version1: {
                  type: 'object',
                  properties: {
                    versionId: { type: 'string' },
                    versionNumber: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    swaggerJson: { type: 'object' },
                  },
                },
                version2: {
                  type: 'object',
                  properties: {
                    versionId: { type: 'string' },
                    versionNumber: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    swaggerJson: { type: 'object' },
                  },
                },
                changes: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Change' },
                },
                rawDiff: { type: 'string', example: '--- a/swagger.json\n+++ b/swagger.json\n...' },
              },
            },
          },
        },
        LatestVersionsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  urlId: { type: 'string' },
                  versionId: { type: 'string' },
                  versionNumber: { type: 'integer' },
                  timestamp: { type: 'string', format: 'date-time' },
                  endpointCount: { type: 'integer' },
                  parameterCount: { type: 'integer' },
                  summary: { type: 'string' },
                  apiUrl: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      url: { type: 'string' },
                      group: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        RecentChangesResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/ApiVersion' },
            },
            meta: {
              type: 'object',
              properties: {
                since: { type: 'string', format: 'date-time' },
                count: { type: 'integer', example: 25 },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'NOT_FOUND',
                    'DUPLICATE_URL',
                    'FETCH_ERROR',
                    'INVALID_SWAGGER',
                    'SERVER_ERROR',
                    'RATE_LIMIT_EXCEEDED',
                  ],
                  example: 'VALIDATION_ERROR',
                },
                message: { type: 'string', example: '입력값 검증 실패' },
                details: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['서비스명은 필수입니다', 'URL은 필수입니다'],
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: '잘못된 요청 (유효성 검사 실패)',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: '리소스를 찾을 수 없음',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: '서버 내부 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
  };
};

/**
 * GET /api/swagger.json
 * Swagger 문서를 JSON 형식으로 반환
 */
router.get('/swagger.json', (req, res) => {
  const spec = generateSwaggerSpec();
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

module.exports = router;
