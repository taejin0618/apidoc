# API Doc Version Manager (ADM)

> Swagger/OpenAPI 문서의 버전 관리 및 변경사항 추적 시스템

## 개요

API Doc Version Manager는 여러 API 서비스의 Swagger 문서를 중앙에서 관리하고, 버전 변경사항을 자동으로 추적하는 시스템입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 🔗 **URL 관리** | Swagger 문서 URL 등록, 그룹화, 활성화 관리 |
| 📊 **버전 추적** | 자동 버전 생성 및 히스토리 관리 |
| 🔍 **변경 분석** | 15개 영역 상세 비교 (endpoint, parameter, schema 등) |
| 📈 **심각도 분류** | high/medium/low 레벨로 변경사항 우선순위 표시 |
| 🎨 **Swagger UI** | 내장 Swagger UI로 API 문서 실시간 조회 |
| ⚡ **버전 비교** | 두 버전 간 상세 비교 및 시각화 |

---

## 📚 문서 목차

### 시작하기

| 문서 | 설명 | 대상 |
|------|------|------|
| [설치 가이드](./getting-started.md) | 환경 설정 및 서버 실행 방법 | 개발자 |
| [배포 가이드](./deployment.md) | 프로덕션 배포 방법 | 개발자/운영자 |

### 사용자 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| [사용자 가이드](./user-guide.md) | 화면별 상세 조작 방법 | 운영자/사용자 |

### 기술 문서

#### 개요 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| [API 명세](./api-reference.md) | REST API 엔드포인트 상세 | 개발자 |
| [아키텍처](./architecture.md) | 시스템 구조 및 데이터 모델 | 개발자 |
| [핵심 기능](./features.md) | 버전 관리, 변경 분석 상세 | 모두 |

#### 상세 기술 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| [데이터 모델](./technical/models.md) | MongoDB 스키마 상세 | 개발자 |
| [서비스 레이어](./technical/services.md) | 비즈니스 로직 상세 | 개발자 |
| [라우트 구조](./technical/routes.md) | Express 라우터 상세 | 개발자 |
| [미들웨어](./technical/middlewares.md) | 미들웨어 및 에러 처리 | 개발자 |
| [데이터베이스](./technical/database.md) | MongoDB 연결 및 최적화 | 개발자 |
| [프론트엔드](./technical/frontend.md) | 클라이언트 사이드 구조 | 개발자 |

**→ [기술 문서 전체 목차](./technical/README.md)**
| [데이터 모델](./technical/models.md) | MongoDB 스키마 상세 | 개발자 |
| [서비스 레이어](./technical/services.md) | 비즈니스 로직 상세 | 개발자 |
| [라우트 구조](./technical/routes.md) | Express 라우터 상세 | 개발자 |
| [미들웨어](./technical/middlewares.md) | 미들웨어 및 에러 처리 | 개발자 |
| [데이터베이스](./technical/database.md) | MongoDB 연결 및 최적화 | 개발자 |
| [프론트엔드](./technical/frontend.md) | 클라이언트 사이드 구조 | 개발자 |

---

## 🚀 빠른 시작

```bash
# 1. 저장소 클론
git clone <repository-url>
cd apidoc

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일에서 MongoDB URI 등 설정

# 4. 개발 서버 실행
npm run dev

# 5. 브라우저에서 접속
open http://localhost:3000
```

자세한 설치 방법은 [설치 가이드](./getting-started.md)를 참조하세요.

---

## 💻 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Node.js 18.x, Express.js 4.18.x |
| **Database** | MongoDB (Mongoose 8.x) |
| **Frontend** | Vanilla JavaScript, Swagger UI 5.x |
| **Styling** | CSS3 (커스텀 디자인) |

---

## 📁 프로젝트 구조

```
apidoc/
├── server.js              # 서버 진입점
├── src/
│   ├── app.js             # Express 앱 설정
│   ├── config/            # 데이터베이스 설정
│   ├── models/            # MongoDB 스키마
│   ├── routes/            # API 라우터
│   ├── services/          # 비즈니스 로직
│   └── middlewares/       # 미들웨어
├── views/                 # HTML 페이지
├── public/                # 정적 파일 (CSS, JS)
└── docs/                  # 문서 (현재 위치)
```

---

## 🔗 관련 링크

- [Express.js 문서](https://expressjs.com/)
- [Mongoose 문서](https://mongoosejs.com/)
- [OpenAPI 스펙](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

---

## 📝 라이선스

이 프로젝트는 내부 사용 목적으로 개발되었습니다.
