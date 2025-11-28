# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

API Doc Version Manager (ADM) - Swagger 문서 중앙 집중식 관리 시스템
- **Tech Stack**: Express.js 4.18.x, MongoDB (Mongoose 8.x), Node.js 18.x
- **Purpose**: 여러 API 서비스의 Swagger 문서 버전 관리 및 변경사항 추적

## Commands

```bash
# Development
npm run dev          # nodemon으로 개발 서버 실행 (자동 재시작)
npm start            # 프로덕션 서버 실행

# Code Quality
npm run lint         # ESLint 실행 (src/ 디렉토리)
npm run format       # Prettier 포맷팅

# Test Data
node scripts/seed-sample-version.js  # 버전 비교 테스트용 샘플 데이터 생성

# Server runs on http://localhost:3000
```

## Architecture

```
server.js              # 진입점: dotenv 로드, DB 연결, 서버 시작
src/
├── app.js             # Express 앱 설정 (미들웨어, 라우트 마운트)
├── config/
│   └── database.js    # MongoDB 연결 설정 (Mongoose)
├── models/
│   ├── ApiUrl.js      # Swagger URL 등록 정보
│   ├── ApiVersion.js  # 버전별 Swagger JSON 저장 (변경사항 포함)
│   └── AuditLog.js    # 감사 로그
├── routes/
│   ├── urlRoutes.js   # /api/urls/* - URL CRUD, fetch 트리거
│   └── versionRoutes.js # /api/urls/:urlId/versions/* - 버전 조회/비교
├── services/
│   ├── swaggerService.js # Swagger JSON 다운로드, 버전 생성 로직
│   └── diffService.js    # JSON 비교, 변경사항 분석 (endpoint/parameter/response)
├── middlewares/
│   └── errorHandler.js   # AppError 클래스, 전역 에러 핸들러
public/                # 정적 파일 (CSS, JS)
views/                 # HTML 페이지 (index, api-detail, version-compare)
```

## Key Data Flow

1. **URL 등록**: `POST /api/urls` → ApiUrl 생성
2. **Swagger 파싱**: `POST /api/urls/:id/fetch` → swaggerService.parseAndSaveSwagger()
   - axios로 JSON 다운로드 → 메이저 버전 추출 → 이전 버전과 비교 → 변경시 ApiVersion 생성/업데이트
3. **변경사항 분석**: diffService.analyzeChanges()
   - paths, parameters, requestBody, responses, schemas 비교
   - 변경 유형: added/removed/modified
   - 심각도: low/medium/high

## Version Management Strategy

**메이저 버전 추출**: `swaggerService.extractMajorVersion()`
- paths의 첫 번째 경로에서 `/v1/`, `/v2/` 패턴 추출
- 패턴 없으면 기본값 `v1`

**버전 업데이트 로직**: `swaggerService.parseAndSaveSwagger()`
- **같은 majorVersion 존재**: 기존 버전 업데이트 (revisionCount 증가, changes 누적)
- **새 majorVersion**: 새 ApiVersion 문서 생성

**변경사항 누적**: 동일 majorVersion에서 여러 번 fetch 시 changes 배열에 타임스탬프와 함께 누적됨

## API Response Format

```javascript
// Success
{ success: true, data: {...}, meta: {...} }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: '...', details: [...] } }
```

## Environment Variables (.env)

```
MONGODB_URI=mongodb://localhost:27017/api-doc-manager
PORT=3000
NODE_ENV=development
LOG_LEVEL=dev
CORS_ORIGIN=http://localhost:3000
```

## MongoDB Collections

- `apiurls`: Swagger URL 메타데이터 (name, url, group, isActive, lastFetchStatus)
- `apiversions`: 버전별 swaggerJson, changes 배열, 메타데이터
- `auditlogs`: 시스템 감사 로그

## Frontend Pages

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `views/index.html` | 메인 페이지 (API URL 목록) |
| `/api-detail?id=` | `views/api-detail.html` | API 상세 (Swagger UI 렌더링) |
| `/version-compare?id=` | `views/version-compare.html` | 버전 비교 페이지 |

## API Endpoints

```
# URL 관리
GET    /api/urls              # 목록 조회
POST   /api/urls              # URL 등록
GET    /api/urls/:id          # 상세 조회
PUT    /api/urls/:id          # 수정
DELETE /api/urls/:id          # 삭제
POST   /api/urls/:id/fetch    # Swagger JSON 수동 fetch
PATCH  /api/urls/:id/activate # 활성화/비활성화 토글

# 버전 관리
GET    /api/urls/:urlId/versions              # 버전 목록
GET    /api/urls/:urlId/versions/:versionId   # 버전 상세 (swaggerJson 포함)
GET    /api/urls/:urlId/versions/:v1/compare/:v2  # 버전 비교
GET    /api/versions/latest/:count               # 최신 N개 버전 (전체)
```

## Change Severity Levels

| 심각도 | 기준 | 예시 |
|--------|------|------|
| **high** | 새 endpoint 추가, 필수 파라미터 추가/삭제 | path 추가, required=true 파라미터 |
| **medium** | 선택 파라미터 변경, RequestBody 수정 | optional 파라미터, schema 변경 |
| **low** | 설명 변경, 메타정보 수정 | description, summary, 응답 코드 |

## Diff Analysis

**핵심 함수**: `diffService.analyzeChanges(oldJson, newJson)`
- OpenAPI 3.0과 Swagger 2.0 모두 지원
- 비교 대상: info, servers, security, tags, paths, components, definitions

**비교 순서**:
1. 전역 설정 (openapi version, info, servers, security, tags)
2. paths (endpoints) - 메서드별 상세 비교
3. components/definitions (schemas, securitySchemes 등)

**Swagger 2.0 호환 필드**: definitions, securityDefinitions, basePath, host, schemes, consumes, produces
