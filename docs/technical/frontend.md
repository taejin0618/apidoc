# 프론트엔드 구조 상세

> 클라이언트 사이드 구조 및 컴포넌트 상세 설명

## 목차

1. [프론트엔드 개요](#프론트엔드-개요)
2. [파일 구조](#파일-구조)
3. [JavaScript 모듈](#javascript-모듈)
4. [HTML 페이지](#html-페이지)
5. [스타일링](#스타일링)
6. [상태 관리](#상태-관리)

---

## 프론트엔드 개요

### 기술 스택

- **Vanilla JavaScript**: 프레임워크 없이 순수 JavaScript 사용
- **Fetch API**: HTTP 요청
- **Swagger UI**: OpenAPI 문서 렌더링
- **CSS Variables**: 테마 관리

### 아키텍처

```
프론트엔드
├── HTML 페이지 (views/)
│   ├── index.html (메인 페이지)
│   ├── api-detail.html (API 상세)
│   ├── version-compare.html (버전 비교)
│   └── swagger-ui.html (Swagger UI)
├── JavaScript 모듈 (public/js/)
│   ├── main.js (메인 페이지 로직)
│   ├── api-client.js (API 클라이언트)
│   └── version-compare.js (버전 비교 로직)
└── 스타일 (public/css/)
    ├── style.css (메인 스타일)
    ├── swagger-custom.css (Swagger UI 커스텀)
    └── diff-view.css (Diff 뷰 스타일)
```

---

## 파일 구조

### JavaScript 모듈

#### main.js

메인 페이지의 모든 로직을 담당합니다.

**주요 기능:**
- API 목록 조회 및 표시
- 필터링 (팀, 서비스, 검색)
- API 추가/수정/삭제
- 모달 관리
- 카드 UI 렌더링

**전역 변수:**
```javascript
let urlsData = [];              // 현재 표시 중인 URL 목록
let currentFilter = {           // 현재 필터 상태
  group: "",
  service: "",
  search: ""
};
let servicesByGroup = {};      // 팀별 서비스 목록
```

**주요 함수:**
- `initApp()`: 앱 초기화
- `loadUrls()`: API 목록 로드
- `renderApiCards()`: 카드 UI 렌더링
- `handleAddUrl()`: API 추가 처리
- `handleEditUrl()`: API 수정 처리
- `handleDeleteUrl()`: API 삭제 처리

---

#### api-client.js

백엔드 API 호출을 담당하는 클라이언트입니다.

**클래스:** `ApiClient`

**주요 메서드:**

```javascript
class ApiClient {
  // HTTP 요청 기본 메서드
  async request(endpoint, options)

  // URL API
  async getUrls(params)
  async getUrl(id)
  async createUrl(data)
  async updateUrl(id, data)
  async deleteUrl(id)
  async toggleUrlActive(id)
  async fetchSwagger(id)

  // Version API
  async getVersions(urlId, params)
  async getLatestVersion(urlId)
  async getVersion(urlId, versionId, includeSwagger)
  async getVersionDiff(urlId, versionId, compareWith)
  async compareVersions(urlId, v1, v2)
  async getAllLatestVersions(limit)
  async getRecentChanges(days, limit)
}
```

**에러 처리:**

```javascript
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
```

**사용 예:**
```javascript
const api = new ApiClient();

try {
  const response = await api.getUrls({ group: 'backend' });
  console.log(response.data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API 에러: ${error.code} - ${error.message}`);
  }
}
```

---

#### version-compare.js

버전 비교 페이지의 로직을 담당합니다.

**전역 변수:**
```javascript
let apiId = null;              // 현재 API ID
let versions = [];             // 버전 목록
let currentComparison = {      // 현재 비교 상태
  v1: null,
  v2: null,
  changes: []
};
let activeFilter = "all";      // 활성 필터 ('all', 'added', 'removed', 'modified')
```

**주요 함수:**
- `initComparePage()`: 페이지 초기화
- `loadApiInfo()`: API 정보 로드
- `loadVersions()`: 버전 목록 로드
- `handleVersionChange()`: 버전 선택 변경 처리
- `compareVersions()`: 버전 비교 실행
- `renderChanges()`: 변경사항 렌더링
- `filterChanges()`: 변경사항 필터링

**전역 함수 (window 객체):**
- `toggleChangeDetails(index)`: 변경사항 상세 토글
- `toggleJsonExpand(btn)`: JSON 확장/축소

---

### HTML 페이지

#### index.html

메인 대시보드 페이지입니다.

**주요 섹션:**
- 헤더: 제목, 검색, 필터, 액션 버튼
- 통계 바: 전체 API 수, 활성 API 수 등
- API 그리드: API 카드 목록
- 모달: API 추가/수정 폼

**스켈레톤 UI:**
- 로딩 중 스켈레톤 카드 표시
- 페이드 인 애니메이션

**이벤트 위임:**
- 카드 클릭: API 상세 페이지로 이동
- 수정 버튼: 수정 모달 열기
- 삭제 버튼: 삭제 확인 후 삭제

---

#### api-detail.html

API 상세 페이지입니다.

**레이아웃:**
- 사이드바: API 정보, 버전 목록
- 메인 영역: Swagger UI

**주요 기능:**
- 버전 선택: 사이드바에서 버전 선택
- Swagger UI: 선택한 버전의 Swagger 문서 표시
- 버전 비교: 버전 비교 페이지로 이동

**Swagger UI 통합:**
```javascript
SwaggerUIBundle({
  url: swaggerJsonUrl,
  dom_id: '#swagger-ui',
  presets: [
    SwaggerUIBundle.presets.apis,
    SwaggerUIStandalonePreset
  ],
  layout: "StandaloneLayout"
});
```

---

#### version-compare.html

버전 비교 페이지입니다.

**주요 섹션:**
- 버전 선택: 두 버전 선택 드롭다운
- 변경사항 통계: 추가/삭제/수정 개수
- 변경사항 목록: 필터링 가능한 변경사항 목록
- Diff 뷰: JSON diff 표시

**필터링:**
- 전체 (`all`)
- 추가됨 (`added`)
- 삭제됨 (`removed`)
- 수정됨 (`modified`)

**변경사항 렌더링:**
- 카테고리별 그룹화
- 심각도별 색상 구분
- 접기/펼치기 기능
- JSON diff 표시

---

#### swagger-ui.html

독립적인 Swagger UI 페이지입니다.

**기능:**
- URL 파라미터로 Swagger JSON URL 받기
- Swagger UI 렌더링
- 다크 모드 지원

---

## 스타일링

### CSS 파일

#### style.css

메인 스타일시트입니다.

**CSS Variables:**
```css
:root {
  /* 색상 */
  --bg-primary: #ffffff;
  --bg-secondary: #f7f7f7;
  --text-primary: #3b4151;
  --text-secondary: #6b7280;

  /* 폰트 */
  --font-family: 'Open Sans', sans-serif;
  --font-mono: 'Source Code Pro', monospace;

  /* 간격 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* 테두리 */
  --border-radius: 8px;
  --border-color: #e5e7eb;

  /* 그림자 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

**컴포넌트 스타일:**
- 카드: `.card`, `.api-card`
- 버튼: `.btn`, `.btn-primary`, `.btn-secondary`
- 배지: `.group-badge`, `.status-badge`
- 모달: `.modal-overlay`, `.modal-content`
- 스켈레톤: `.skeleton-card`

---

#### swagger-custom.css

Swagger UI 커스텀 스타일입니다.

**커스터마이징:**
- Swagger UI 테마 색상
- 폰트 통일
- 레이아웃 조정

---

#### diff-view.css

Diff 뷰 스타일입니다.

**스타일:**
- 추가된 라인: 녹색 배경
- 삭제된 라인: 빨간색 배경
- 수정된 라인: 노란색 배경

---

## 상태 관리

### 전역 상태

**main.js:**
```javascript
let urlsData = [];              // API 목록
let currentFilter = {           // 필터 상태
  group: "",
  service: "",
  search: ""
};
let servicesByGroup = {};      // 팀별 서비스 목록
```

**version-compare.js:**
```javascript
let apiId = null;               // 현재 API ID
let versions = [];              // 버전 목록
let currentComparison = {      // 비교 상태
  v1: null,
  v2: null,
  changes: []
};
let activeFilter = "all";       // 필터 상태
```

### 상태 업데이트 패턴

**단방향 데이터 흐름:**
```
사용자 액션
  ↓
이벤트 핸들러
  ↓
API 호출
  ↓
상태 업데이트
  ↓
UI 렌더링
```

**예시:**
```javascript
// 1. 사용자 액션
button.addEventListener('click', handleClick);

// 2. 이벤트 핸들러
async function handleClick() {
  // 3. API 호출
  const response = await api.getUrls();

  // 4. 상태 업데이트
  urlsData = response.data;

  // 5. UI 렌더링
  renderApiCards(urlsData);
}
```

---

## 이벤트 처리

### 이벤트 위임

**카드 클릭 처리:**
```javascript
const apiGrid = document.getElementById("apiGrid");
apiGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".api-card");
  if (card) {
    const id = card.dataset.id;
    window.location.href = `/api-detail?id=${id}`;
  }
});
```

**장점:**
- 동적으로 추가된 요소도 이벤트 처리 가능
- 메모리 효율적 (단일 리스너)

---

### Debounce

**검색 입력:**
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

searchInput.addEventListener("input", debounce(handleSearch, 300));
```

**효과:**
- 입력 중 API 호출 최소화
- 성능 향상

---

## UI 컴포넌트

### 카드 컴포넌트

**구조:**
```html
<div class="card api-card" data-id="${url._id}">
  <button class="edit-card-btn">수정</button>
  <div class="card-body">
    <div class="api-card-header">
      <img src="/icons/code.svg" alt="API">
      <div>
        <div class="api-card-title">${url.name}</div>
        <div class="api-card-url">${url.url}</div>
      </div>
    </div>
    <p class="api-card-description">${url.description}</p>
  </div>
  <div class="card-footer">
    <div class="api-card-meta">
      <span class="group-badge">${url.group}</span>
      <span class="status-badge">${status}</span>
    </div>
  </div>
</div>
```

---

### 모달 컴포넌트

**구조:**
```html
<div class="modal-overlay" id="addUrlModal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>API 추가</h2>
      <button class="modal-close">×</button>
    </div>
    <form class="modal-body">
      <!-- 폼 필드 -->
    </form>
    <div class="modal-footer">
      <button type="button" class="modal-cancel">취소</button>
      <button type="submit">저장</button>
    </div>
  </div>
</div>
```

**제어 함수:**
```javascript
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add("active");
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.classList.remove("active");
  });
}
```

---

### 스켈레톤 UI

**로딩 상태:**
```html
<div class="skeleton-card">
  <div class="skeleton-header">
    <div class="skeleton-icon"></div>
    <div class="skeleton-content">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</div>
```

**애니메이션:**
```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 유틸리티 함수

### HTML 이스케이프

```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**용도:** XSS 방지

---

### 날짜 포맷팅

```javascript
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

---

### 그룹 색상

```javascript
function getGroupColor(group) {
  const colors = [
    { background: '#e3f2fd', color: '#1976d2' },
    { background: '#f3e5f5', color: '#7b1fa2' },
    // ...
  ];
  const index = group.charCodeAt(0) % colors.length;
  return colors[index];
}
```

**효과:** 동일 그룹은 항상 동일 색상

---

## 성능 최적화

### 이미지 지연 로딩

```html
<img src="/icons/code.svg" loading="lazy" alt="API">
```

---

### 페이드 인 애니메이션

```javascript
// CSS 애니메이션으로 부드러운 렌더링
card.style.opacity = 0;
card.style.animation = 'fadeIn 0.3s ease forwards';
```

---

### 가상 스크롤 (미구현)

대량 데이터 표시 시 가상 스크롤 구현 가능:

```javascript
// 향후 구현 가능
class VirtualScroll {
  constructor(container, items, itemHeight) {
    // 가상 스크롤 로직
  }
}
```

---

## 접근성 (A11y)

### 키보드 네비게이션

```javascript
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
});
```

---

### ARIA 속성

```html
<button aria-label="API 추가" aria-expanded="false">
  + API 추가
</button>
```

---

## 브라우저 호환성

### 지원 브라우저

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)

### 폴리필

- Fetch API: 모든 모던 브라우저 지원
- Promise: 모든 모던 브라우저 지원
- async/await: 모든 모던 브라우저 지원

---

## 빌드 및 배포

### 빌드 없음

현재는 빌드 과정 없이 순수 HTML/CSS/JS를 직접 서빙합니다.

**장점:**
- 간단한 구조
- 빠른 개발
- 디버깅 용이

**단점:**
- 코드 분할 없음
- 번들 최적화 없음

### 향후 개선 가능

- **Webpack/Vite**: 번들링 및 최적화
- **TypeScript**: 타입 안정성
- **React/Vue**: 컴포넌트 기반 개발

---

---

← [이전: 데이터베이스](./database.md) | [목차로 돌아가기](../README.md) →
