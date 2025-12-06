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
          description: '서버 상태를 확인합니다. 서버가 정상 작동 중인지, 얼마나 오래 실행되었는지 확인할 수 있습니다.',
          operationId: 'getHealth',
          responses: {
            '200': {
              description: '서버가 정상 작동 중',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                  example: {
                    success: true,
                    data: {
                      status: 'healthy',
                      timestamp: '2024-11-27T10:00:00.000Z',
                      uptime: 123.456
                    }
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
      '/urls': {
        get: {
          tags: ['URLs'],
          summary: 'URL 목록 조회',
          description: '등록된 API URL 목록을 조회합니다. 필터링, 검색, 정렬, 페이지네이션을 지원합니다.\n\n**사용 예시:**\n- 모든 API 조회: `GET /api/urls`\n- 팀별 필터링: `GET /api/urls?group=backend`\n- 검색: `GET /api/urls?search=결제`\n- 정렬: `GET /api/urls?sort=group service` (팀별, 서비스별 정렬)\n- 페이지네이션: `GET /api/urls?page=2&limit=20`',
          operationId: 'getUrls',
          parameters: [
            {
              name: 'group',
              in: 'query',
              description: '그룹(팀)별 필터링. 소문자로 자동 변환됩니다.',
              required: false,
              schema: { type: 'string', example: 'backend' },
            },
            {
              name: 'service',
              in: 'query',
              description: '서비스별 필터링. 소문자로 자동 변환됩니다.',
              required: false,
              schema: { type: 'string', example: 'user-service' },
            },
            {
              name: 'isActive',
              in: 'query',
              description: '활성화 상태 필터. true 또는 false 문자열로 전달합니다.',
              required: false,
              schema: { type: 'boolean', example: true },
            },
            {
              name: 'search',
              in: 'query',
              description: '이름(name) 또는 설명(description) 필드에서 텍스트 검색. 대소문자 구분 없음.',
              required: false,
              schema: { type: 'string', example: '결제' },
            },
            {
              name: 'sort',
              in: 'query',
              description: '정렬 기준. 공백으로 구분하며, `-` 접두사로 내림차순 지정 가능.\n예: `-updatedAt` (최신순), `group service` (팀별, 서비스별 오름차순)',
              required: false,
              schema: { type: 'string', default: '-updatedAt', example: '-updatedAt' },
            },
            {
              name: 'page',
              in: 'query',
              description: '페이지 번호 (1부터 시작)',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1, example: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: '페이지당 항목 수. 최대 100개까지 가능.',
              required: false,
              schema: { type: 'integer', default: 50, minimum: 1, maximum: 100, example: 50 },
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
                  example: {
                    success: true,
                    data: [
                      {
                        _id: '507f1f77bcf86cd799439011',
                        name: 'User Service API',
                        url: 'https://api.example.com/swagger.json',
                        group: 'backend',
                        service: 'user-service',
                        description: '사용자 관리 API',
                        isActive: true,
                        versionCount: 5,
                        lastFetchedAt: '2024-11-27T10:00:00.000Z',
                        lastFetchStatus: 'success',
                        createdAt: '2024-11-20T10:00:00.000Z',
                        updatedAt: '2024-11-27T10:00:00.000Z'
                      }
                    ],
                    meta: {
                      total: 25,
                      page: 1,
                      limit: 50,
                      totalPages: 1,
                      groups: ['backend', 'frontend', 'platform'],
                      services: ['user-service', 'auth-service'],
                      servicesByGroup: {
                        backend: ['user-service', 'auth-service'],
                        frontend: ['web-app']
                      }
                    }
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '429': {
              description: '요청 제한 초과',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'RATE_LIMIT_EXCEEDED',
                      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
                    }
                  },
                },
              },
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        post: {
          tags: ['URLs'],
          summary: 'URL 등록',
          description: '새 API URL을 등록합니다. Swagger/OpenAPI JSON을 반환하는 URL을 등록하면 자동으로 버전 관리가 시작됩니다.\n\n**필수 필드:**\n- `name`: API 이름 (최대 100자)\n- `url`: Swagger JSON URL (HTTP/HTTPS)\n- `group`: 팀/그룹명\n- `service`: 서비스명\n\n**선택 필드:**\n- `description`: 설명 (최대 500자)\n- `owner`: 담당자 이메일\n- `tags`: 태그 배열\n- `priority`: 우선순위 (low/medium/high)',
          operationId: 'createUrl',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUrlRequest',
                },
                example: {
                  name: 'User Service API',
                  url: 'https://api.example.com/v3/api-docs',
                  group: 'backend',
                  service: 'user-service',
                  description: '사용자 관리 API',
                  owner: 'developer@example.com',
                  tags: ['v2', 'production'],
                  priority: 'high'
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
                  example: {
                    success: true,
                    data: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'User Service API',
                      url: 'https://api.example.com/v3/api-docs',
                      group: 'backend',
                      service: 'user-service',
                      description: '사용자 관리 API',
                      isActive: true,
                      createdAt: '2024-11-27T10:00:00.000Z',
                      updatedAt: '2024-11-27T10:00:00.000Z'
                    },
                    message: 'URL이 성공적으로 추가되었습니다'
                  },
                },
              },
            },
            '400': {
              description: '입력값 검증 실패 또는 중복 URL',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    validationError: {
                      summary: '유효성 검사 실패',
                      value: {
                        success: false,
                        error: {
                          code: 'VALIDATION_ERROR',
                          message: '입력값 검증 실패',
                          details: [
                            '서비스명은 필수입니다',
                            'URL은 필수입니다',
                            '유효한 HTTP(S) URL이어야 합니다'
                          ]
                        }
                      }
                    },
                    duplicateUrl: {
                      summary: '중복 URL',
                      value: {
                        success: false,
                        error: {
                          code: 'DUPLICATE_URL',
                          message: '이미 존재하는 url입니다'
                        }
                      }
                    }
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
      '/urls/{id}': {
        get: {
          tags: ['URLs'],
          summary: 'URL 상세 조회',
          description: '특정 API URL의 상세 정보를 조회합니다. 버전 수, 최종 업데이트 시간, 상태 등의 정보를 포함합니다.',
          operationId: 'getUrlById',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId (24자리 hex 문자열)',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
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
                  example: {
                    success: true,
                    data: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'User Service API',
                      url: 'https://api.example.com/swagger.json',
                      group: 'backend',
                      service: 'user-service',
                      description: '사용자 관리 API',
                      isActive: true,
                      owner: 'developer@example.com',
                      tags: ['v2', 'production'],
                      priority: 'high',
                      versionCount: 5,
                      lastFetchedAt: '2024-11-27T10:00:00.000Z',
                      lastFetchStatus: 'success',
                      createdAt: '2024-11-20T10:00:00.000Z',
                      updatedAt: '2024-11-27T10:00:00.000Z'
                    }
                  },
                },
              },
            },
            '400': {
              description: '잘못된 ID 형식',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'INVALID_ID',
                      message: '잘못된 ID 형식입니다'
                    }
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
          description: 'API URL 정보를 수정합니다. 수정할 필드만 전송하면 됩니다. 모든 필드는 선택사항이지만 최소 1개 필드는 수정해야 합니다.',
          operationId: 'updateUrl',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateUrlRequest',
                },
                example: {
                  name: 'Updated API Name',
                  description: 'Updated description',
                  priority: 'medium'
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
                  example: {
                    success: true,
                    data: {
                      _id: '507f1f77bcf86cd799439011',
                      name: 'Updated API Name',
                      url: 'https://api.example.com/swagger.json',
                      group: 'backend',
                      service: 'user-service',
                      description: 'Updated description',
                      priority: 'medium',
                      updatedAt: '2024-11-27T11:00:00.000Z'
                    },
                    message: 'URL이 성공적으로 수정되었습니다'
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
          description: 'API URL을 삭제합니다. **주의:** 삭제 시 모든 버전 히스토리도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.',
          operationId: 'deleteUrl',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
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
                  example: {
                    success: true,
                    message: 'URL이 성공적으로 삭제되었습니다'
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
          description: 'API URL의 활성화 상태를 토글합니다. 현재 상태가 활성화(`isActive: true`)이면 비활성화로, 비활성화(`isActive: false`)이면 활성화로 변경됩니다. 비활성화된 API는 목록에서 필터링할 수 있습니다.',
          operationId: 'toggleUrlActivation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
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
                  examples: {
                    activated: {
                      summary: '활성화됨',
                      value: {
                        success: true,
                        data: {
                          isActive: true
                        },
                        message: 'URL이 활성화되었습니다'
                      }
                    },
                    deactivated: {
                      summary: '비활성화됨',
                      value: {
                        success: true,
                        data: {
                          isActive: false
                        },
                        message: 'URL이 비활성화되었습니다'
                      }
                    }
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
          description: 'Swagger JSON을 수동으로 가져와 버전을 생성/업데이트합니다. 등록된 URL에서 Swagger JSON을 다운로드하고, 이전 버전과 비교하여 변경사항을 분석합니다. 변경사항이 있으면 새 버전을 생성하고, 없으면 기존 버전을 유지합니다.\n\n**주의사항:**\n- 네트워크 요청이므로 시간이 걸릴 수 있습니다.\n- Swagger URL이 접근 불가능하거나 잘못된 형식이면 에러가 발생합니다.',
          operationId: 'fetchSwagger',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
            },
          ],
          responses: {
            '200': {
              description: '성공 (새 버전 생성 또는 변경사항 없음)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FetchResponse',
                  },
                  examples: {
                    newVersionCreated: {
                      summary: '새 버전 생성됨',
                      value: {
                        success: true,
                        data: {
                          created: true,
                          updated: false,
                          version: {
                            _id: '507f1f77bcf86cd799439013',
                            versionId: 'v4',
                            versionNumber: 4,
                            endpointCount: 16,
                            summary: '1개 추가, 0개 삭제, 2개 수정'
                          }
                        },
                        message: '새 버전이 생성되었습니다'
                      }
                    },
                    noChanges: {
                      summary: '변경사항 없음',
                      value: {
                        success: true,
                        data: {
                          created: false,
                          updated: false,
                          version: null
                        },
                        message: '변경사항이 없습니다'
                      }
                    }
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '400': {
              description: 'Swagger JSON 다운로드 실패 또는 잘못된 형식',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  examples: {
                    fetchError: {
                      summary: '다운로드 실패',
                      value: {
                        success: false,
                        error: {
                          code: 'FETCH_ERROR',
                          message: 'Swagger JSON을 가져올 수 없습니다: Network timeout'
                        }
                      }
                    },
                    invalidSwagger: {
                      summary: '잘못된 Swagger 형식',
                      value: {
                        success: false,
                        error: {
                          code: 'INVALID_SWAGGER',
                          message: '유효하지 않은 Swagger/OpenAPI 형식입니다'
                        }
                      }
                    }
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
      '/urls/{urlId}/versions': {
        get: {
          tags: ['Versions'],
          summary: '버전 목록 조회',
          description: '특정 URL의 버전 목록을 조회합니다. 버전은 최신순으로 정렬되며, `swaggerJson`은 기본적으로 제외되어 응답 크기를 줄입니다. 각 버전의 변경사항 요약(`summary`)과 변경 통계를 포함합니다.',
          operationId: 'getVersions',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
            },
            {
              name: 'page',
              in: 'query',
              description: '페이지 번호 (1부터 시작)',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1, example: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: '페이지당 항목 수. 최대 100개까지 가능.',
              required: false,
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100, example: 50 },
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
                  example: {
                    success: true,
                    data: {
                      apiUrl: {
                        _id: '507f1f77bcf86cd799439011',
                        name: 'User Service API',
                        url: 'https://api.example.com/swagger.json',
                        group: 'backend'
                      },
                      versions: [
                        {
                          _id: '507f1f77bcf86cd799439012',
                          urlId: '507f1f77bcf86cd799439011',
                          versionId: 'v3',
                          versionNumber: 3,
                          timestamp: '2024-11-27T10:00:00.000Z',
                          endpointCount: 15,
                          parameterCount: 25,
                          summary: '5개 추가, 2개 삭제, 3개 수정',
                          changes: [
                            {
                              type: 'added',
                              category: 'endpoint',
                              path: 'POST /api/users',
                              description: '사용자 생성 엔드포인트 추가',
                              severity: 'high'
                            }
                          ]
                        }
                      ]
                    },
                    meta: {
                      total: 3,
                      page: 1,
                      limit: 50,
                      totalPages: 1
                    }
                  },
                },
              },
            },
            '404': {
              description: 'API URL을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: 'URL을 찾을 수 없습니다'
                    }
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
      '/urls/{urlId}/versions/latest': {
        get: {
          tags: ['Versions'],
          summary: '최신 버전 조회',
          description: '최신 버전을 조회합니다. `swaggerJson`이 포함되어 있어 Swagger UI에 바로 표시할 수 있습니다. 버전이 없는 경우 404 에러가 반환됩니다.',
          operationId: 'getLatestVersion',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
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
                  example: {
                    success: true,
                    data: {
                      _id: '507f1f77bcf86cd799439012',
                      urlId: '507f1f77bcf86cd799439011',
                      versionId: 'v3',
                      versionNumber: 3,
                      timestamp: '2024-11-27T10:00:00.000Z',
                      swaggerJson: {
                        openapi: '3.0.0',
                        info: {
                          title: 'User Service API',
                          version: '1.0.0'
                        },
                        paths: { /* ... */ }
                      },
                      endpointCount: 15,
                      parameterCount: 25,
                      summary: '5개 추가, 2개 삭제, 3개 수정'
                    }
                  },
                },
              },
            },
            '404': {
              description: '버전을 찾을 수 없음 (버전이 아직 생성되지 않음)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: '버전을 찾을 수 없습니다'
                    }
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
      '/urls/{urlId}/versions/{versionId}': {
        get: {
          tags: ['Versions'],
          summary: '버전 상세 조회',
          description: '특정 버전의 상세 정보를 조회합니다. `includeSwagger` 파라미터로 Swagger JSON 포함 여부를 제어할 수 있습니다. Swagger JSON이 큰 경우 제외하여 응답 크기를 줄일 수 있습니다.',
          operationId: 'getVersionById',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
            },
            {
              name: 'versionId',
              in: 'path',
              required: true,
              description: '버전 ID 문자열. 예: "v1", "v2", "v3"',
              schema: { type: 'string', example: 'v3' },
            },
            {
              name: 'includeSwagger',
              in: 'query',
              description: 'Swagger JSON 포함 여부. 기본값은 "true"입니다. "false"로 설정하면 응답 크기가 크게 줄어듭니다.',
              required: false,
              schema: { type: 'string', enum: ['true', 'false'], default: 'true', example: 'true' },
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
                  examples: {
                    withSwagger: {
                      summary: 'Swagger JSON 포함',
                      value: {
                        success: true,
                        data: {
                          _id: '507f1f77bcf86cd799439012',
                          urlId: '507f1f77bcf86cd799439011',
                          versionId: 'v3',
                          versionNumber: 3,
                          timestamp: '2024-11-27T10:00:00.000Z',
                          swaggerJson: {
                            openapi: '3.0.0',
                            info: { title: 'User Service API', version: '1.0.0' },
                            paths: { /* ... */ }
                          },
                          endpointCount: 15,
                          parameterCount: 25,
                          summary: '5개 추가, 2개 삭제, 3개 수정',
                          changes: [ /* 변경사항 배열 */ ]
                        }
                      }
                    },
                    withoutSwagger: {
                      summary: 'Swagger JSON 제외',
                      value: {
                        success: true,
                        data: {
                          _id: '507f1f77bcf86cd799439012',
                          urlId: '507f1f77bcf86cd799439011',
                          versionId: 'v3',
                          versionNumber: 3,
                          timestamp: '2024-11-27T10:00:00.000Z',
                          endpointCount: 15,
                          parameterCount: 25,
                          summary: '5개 추가, 2개 삭제, 3개 수정'
                        }
                      }
                    }
                  },
                },
              },
            },
            '404': {
              description: '버전을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: '버전을 찾을 수 없습니다'
                    }
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
          description: '두 특정 버전을 비교하여 변경사항을 분석합니다. v1(이전 버전)과 v2(현재 버전)를 비교하여 추가/삭제/수정된 항목을 반환합니다.\n\n**변경사항 타입:**\n- `added`: 새로 추가된 엔드포인트, 파라미터 등\n- `removed`: 삭제된 항목\n- `modified`: 수정된 항목\n- `path_version_changed`: 경로 버전 변경 (예: `/v1/users` → `/v2/users`)\n\n**심각도 (severity):**\n- `high`: 새 endpoint 추가, 필수 파라미터 변경\n- `medium`: 선택 파라미터 변경, RequestBody 수정\n- `low`: 설명 변경, 메타정보 수정',
          operationId: 'compareVersions',
          parameters: [
            {
              name: 'urlId',
              in: 'path',
              required: true,
              description: 'API URL의 MongoDB ObjectId',
              schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' },
            },
            {
              name: 'v1',
              in: 'path',
              required: true,
              description: '첫 번째 버전 ID (이전 버전). 예: "v1", "v2"',
              schema: { type: 'string', example: 'v1' },
            },
            {
              name: 'v2',
              in: 'path',
              required: true,
              description: '두 번째 버전 ID (현재 버전). 예: "v2", "v3"',
              schema: { type: 'string', example: 'v2' },
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
                  example: {
                    success: true,
                    data: {
                      version1: {
                        versionId: 'v1',
                        versionNumber: 1,
                        timestamp: '2024-11-20T10:00:00.000Z',
                        swaggerJson: { /* Swagger JSON */ }
                      },
                      version2: {
                        versionId: 'v2',
                        versionNumber: 2,
                        timestamp: '2024-11-27T10:00:00.000Z',
                        swaggerJson: { /* Swagger JSON */ }
                      },
                      changes: [
                        {
                          type: 'added',
                          category: 'endpoint',
                          path: 'POST /api/users',
                          description: '사용자 생성 엔드포인트 추가',
                          severity: 'high',
                          oldValue: null,
                          newValue: {
                            summary: '사용자 생성',
                            requestBody: { /* ... */ }
                          }
                        },
                        {
                          type: 'modified',
                          category: 'parameter',
                          path: 'GET /api/users',
                          field: 'page',
                          description: '파라미터 추가: page',
                          severity: 'medium',
                          oldValue: null,
                          newValue: {
                            name: 'page',
                            in: 'query',
                            schema: { type: 'integer' }
                          }
                        }
                      ],
                      rawDiff: '--- a/swagger.json\n+++ b/swagger.json\n...'
                    }
                  },
                },
              },
            },
            '404': {
              description: '버전을 찾을 수 없음',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: '버전 v1을(를) 찾을 수 없습니다'
                    }
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
          description: '잘못된 요청 (유효성 검사 실패 또는 잘못된 파라미터)',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                validationError: {
                  summary: '입력값 검증 실패',
                  value: {
                    success: false,
                    error: {
                      code: 'VALIDATION_ERROR',
                      message: '입력값 검증 실패',
                      details: [
                        '서비스명은 필수입니다',
                        'URL은 필수입니다',
                        '유효한 HTTP(S) URL이어야 합니다'
                      ]
                    }
                  }
                },
                invalidId: {
                  summary: '잘못된 ID 형식',
                  value: {
                    success: false,
                    error: {
                      code: 'INVALID_ID',
                      message: '잘못된 ID 형식입니다'
                    }
                  }
                },
                duplicateUrl: {
                  summary: '중복 URL',
                  value: {
                    success: false,
                    error: {
                      code: 'DUPLICATE_URL',
                      message: '이미 존재하는 url입니다'
                    }
                  }
                }
              },
            },
          },
        },
        NotFound: {
          description: '리소스를 찾을 수 없음 (존재하지 않는 ID 또는 버전)',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                urlNotFound: {
                  summary: 'API URL을 찾을 수 없음',
                  value: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: 'URL을 찾을 수 없습니다'
                    }
                  }
                },
                versionNotFound: {
                  summary: '버전을 찾을 수 없음',
                  value: {
                    success: false,
                    error: {
                      code: 'NOT_FOUND',
                      message: '버전을 찾을 수 없습니다'
                    }
                  }
                }
              },
            },
          },
        },
        InternalServerError: {
          description: '서버 내부 오류 (예상치 못한 오류 발생)',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              examples: {
                serverError: {
                  summary: '서버 오류',
                  value: {
                    success: false,
                    error: {
                      code: 'SERVER_ERROR',
                      message: process.env.NODE_ENV === 'production'
                        ? '서버 내부 오류가 발생했습니다'
                        : 'Database connection failed'
                    }
                  }
                },
                fetchError: {
                  summary: 'Swagger JSON 다운로드 실패',
                  value: {
                    success: false,
                    error: {
                      code: 'FETCH_ERROR',
                      message: 'Swagger JSON을 가져올 수 없습니다: Network timeout'
                    }
                  }
                },
                invalidSwagger: {
                  summary: '잘못된 Swagger 형식',
                  value: {
                    success: false,
                    error: {
                      code: 'INVALID_SWAGGER',
                      message: '유효하지 않은 Swagger/OpenAPI 형식입니다'
                    }
                  }
                }
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
