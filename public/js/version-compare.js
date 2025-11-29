/**
 * Version Compare - 버전 비교 로직
 */

// ===== Global State =====
let apiId = null;
let versions = [];
let currentComparison = {
  v1: null,
  v2: null,
  changes: [],
};
let activeFilter = "all";

// ===== Global Functions (for onclick handlers) =====
window.toggleChangeDetails = function (index) {
  const changeItem = document.querySelector(
    `.change-item[data-change-index="${index}"]`
  );
  if (!changeItem) return;

  const expandBtn = changeItem.querySelector(".change-expand-btn");

  if (changeItem.classList.contains("expanded")) {
    changeItem.classList.remove("expanded");
    if (expandBtn) expandBtn.textContent = "▶";
    expandBtn?.setAttribute("aria-expanded", "false");
  } else {
    changeItem.classList.add("expanded");
    if (expandBtn) expandBtn.textContent = "▼";
    expandBtn?.setAttribute("aria-expanded", "true");
  }
};

// 더보기/접기 토글
window.toggleJsonExpand = function (btn) {
  const container = btn.closest(".json-truncate-container");
  if (!container) return;

  const truncated = container.querySelector(".json-truncated");
  const full = container.querySelector(".json-full");

  if (full.classList.contains("hidden")) {
    truncated.classList.add("hidden");
    full.classList.remove("hidden");
    btn.textContent = "접기";
  } else {
    truncated.classList.remove("hidden");
    full.classList.add("hidden");
    btn.textContent = "더보기";
  }
};

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  apiId = urlParams.get("id");

  if (!apiId) {
    window.location.href = "/";
    return;
  }

  initComparePage();
});

async function initComparePage() {
  setupEventListeners();
  await loadApiInfo();
  await loadVersions();
}

// ===== Event Listeners =====
function setupEventListeners() {
  // 버전 선택
  document
    .getElementById("version1Select")
    .addEventListener("change", handleVersionChange);
  document
    .getElementById("version2Select")
    .addEventListener("change", handleVersionChange);

  // 스왑 버튼
  document.getElementById("swapBtn").addEventListener("click", handleSwap);

  // 필터 탭
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", handleFilterClick);
  });

  // 변경사항 통계 클릭 (필터링)
  document.querySelectorAll(".changes-stat").forEach((stat) => {
    stat.addEventListener("click", handleStatClick);
    stat.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleStatClick(e);
      }
    });
  });
}

// ===== Data Loading =====
async function loadApiInfo() {
  try {
    const response = await apiClient.getUrl(apiId);
    const apiUrl = response.data;

    document.getElementById("apiName").textContent = apiUrl.name;
    document.title = `버전 비교 - ${apiUrl.name}`;
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadVersions() {
  try {
    const response = await apiClient.getVersions(apiId, { limit: 100 });
    versions = response.data.versions;

    if (versions.length < 2) {
      document.querySelector(".compare-layout").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <img src="/icons/graph.svg" alt="비교" class="icon" width="48" height="48">
          </div>
          <h3 class="empty-state-title">비교할 버전이 부족합니다</h3>
          <p class="empty-state-text">버전이 2개 이상 있어야 비교할 수 있습니다</p>
          <a href="/api-detail?id=${apiId}" class="btn btn-primary">API 상세로 돌아가기</a>
        </div>
      `;
      return;
    }

    populateVersionSelects();

    // 기본값: 최신 2개 버전 비교
    const v1Select = document.getElementById("version1Select");
    const v2Select = document.getElementById("version2Select");

    if (versions.length >= 2) {
      v1Select.value = versions[1].versionId; // 이전 버전
      v2Select.value = versions[0].versionId; // 최신 버전
    }

    await loadComparison();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function populateVersionSelects() {
  const v1Select = document.getElementById("version1Select");
  const v2Select = document.getElementById("version2Select");

  const options = versions
    .map(
      (v) =>
        `<option value="${v.versionId}">${v.versionId} - ${formatDate(v.timestamp)}</option>`
    )
    .join("");

  v1Select.innerHTML = options;
  v2Select.innerHTML = options;
}

async function loadComparison() {
  const v1 = document.getElementById("version1Select").value;
  const v2 = document.getElementById("version2Select").value;

  if (!v1 || !v2 || v1 === v2) {
    return;
  }

  showLoading(true);

  try {
    const response = await apiClient.compareVersions(apiId, v1, v2);
    currentComparison = {
      v1: response.data.version1,
      v2: response.data.version2,
      changes: response.data.changes,
    };

    renderComparison();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    showLoading(false);
  }
}

// ===== Rendering =====
function renderComparison() {
  renderChangesSummary();
  renderChangesList();
}

function renderChangesSummary() {
  const { changes } = currentComparison;

  const stats = {
    added: changes.filter((c) => c.type === "added").length,
    removed: changes.filter((c) => c.type === "removed").length,
    modified: changes.filter((c) => c.type === "modified").length,
    path_version_changed: changes.filter((c) => c.type === "path_version_changed").length,
  };

  document.getElementById("addedCount").textContent = stats.added;
  document.getElementById("removedCount").textContent = stats.removed;
  document.getElementById("modifiedCount").textContent = stats.modified;

  const versionChangedEl = document.getElementById("versionChangedCount");
  if (versionChangedEl) {
    versionChangedEl.textContent = stats.path_version_changed;
  }

  // 활성 필터 상태 업데이트
  document.querySelectorAll(".changes-stat").forEach((stat) => {
    stat.classList.toggle("active", stat.dataset.filter === activeFilter);
  });
}

function renderChangesList() {
  const container = document.getElementById("changesList");
  let { changes } = currentComparison;

  // 필터 적용
  if (activeFilter !== "all") {
    changes = changes.filter((c) => c.type === activeFilter);
  }

  if (changes.length === 0) {
    container.innerHTML = `
      <div class="no-changes">
        <div class="no-changes-icon">
          <img src="/icons/star.svg" alt="변경사항 없음" class="icon" width="32" height="32">
        </div>
        <p>${activeFilter === "all" ? "변경사항이 없습니다" : `${getFilterLabel(activeFilter)} 변경사항이 없습니다`}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = changes
    .map(
      (change, index) => `
    <div class="change-item ${change.type}" data-change-index="${index}">
      <div class="change-header" role="button" tabindex="0">
        <div class="change-type-icon">
          ${getChangeIcon(change.type)}
        </div>
        <div class="change-header-content">
          <div class="change-path-line">
            ${getMethodBadge(change.path)}
            <span class="change-path-text">${escapeHtml(getPathWithoutMethod(change.path))}</span>
          </div>
          <div class="change-description">${escapeHtml(change.description)}</div>
          <div class="change-meta">
            <span class="change-category">${getCategoryIcon(change.category)} ${change.category}</span>
          </div>
        </div>
        <button class="change-expand-btn" aria-expanded="false">▶</button>
      </div>
      <div class="change-comparison">
        ${renderChangeDetails(change)}
      </div>
    </div>
  `
    )
    .join("");

  // 이벤트 위임으로 클릭 핸들러 바인딩
  attachChangeItemListeners();
}

/**
 * 변경 항목 클릭 이벤트 리스너 연결 (이벤트 위임)
 */
function attachChangeItemListeners() {
  const container = document.getElementById("changesList");
  if (!container) return;

  // 기존 리스너 제거 후 다시 바인딩 (중복 방지)
  container.removeEventListener("click", handleChangeItemClick);
  container.addEventListener("click", handleChangeItemClick);
}

/**
 * 변경 항목 클릭 핸들러
 */
function handleChangeItemClick(e) {
  // 헤더 클릭 시 토글
  const header = e.target.closest(".change-header");
  if (header) {
    const changeItem = header.closest(".change-item");
    if (changeItem) {
      const index = parseInt(changeItem.dataset.changeIndex, 10);
      toggleChangeDetails(index);
    }
  }
}

function renderChangeDetails(change) {
  // 엔드포인트 관련 변경사항은 전체 스펙 비교로 표시
  if (isEndpointChange(change)) {
    return renderEndpointComparison(change);
  }

  // 그 외의 변경사항 (info, schema 등)은 기존 방식
  return renderSimpleComparison(change);
}

/**
 * 엔드포인트 관련 변경사항인지 판단
 */
function isEndpointChange(change) {
  // 카테고리가 endpoint, parameter, requestBody, response인 경우
  const endpointCategories = ["endpoint", "parameter", "requestBody", "response"];
  if (endpointCategories.includes(change.category)) {
    return true;
  }

  // 경로에서 HTTP 메서드가 있는 경우
  const { method } = extractMethodAndPath(change.path);
  if (method) {
    return true;
  }

  // path_version_changed 타입인 경우
  if (change.type === "path_version_changed") {
    return true;
  }

  return false;
}

/**
 * 엔드포인트 전체 스펙 비교 렌더링
 */
function renderEndpointComparison(change) {
  const { method, path } = extractMethodAndPath(change.path);

  if (!method || !path) {
    // 메서드/경로 추출 실패시 기본 비교로 폴백
    return renderSimpleComparison(change);
  }

  // swaggerJson에서 스펙 가져오기
  const v1SwaggerJson = currentComparison.v1?.swaggerJson;
  const v2SwaggerJson = currentComparison.v2?.swaggerJson;

  // path_version_changed인 경우 oldPath/newPath 사용
  let oldPath = path;
  let newPath = path;

  if (change.type === "path_version_changed") {
    oldPath = change.oldValue?.path || change.metadata?.oldPath || path;
    newPath = change.newValue?.path || change.metadata?.newPath || path;
  }

  // 스펙 추출 (버전 정규화 매칭 포함)
  const oldSpec = getEndpointSpec(v1SwaggerJson, oldPath, method);
  const newSpec = getEndpointSpec(v2SwaggerJson, newPath, method);

  // 스펙이 없는 경우 처리
  if (!oldSpec && !newSpec) {
    return renderSimpleComparison(change);
  }

  // 좌우 스펙 비교 렌더링
  return renderSideBySideSpec(oldSpec, newSpec, change);
}

/**
 * 단순 비교 렌더링 (기존 로직)
 */
function renderSimpleComparison(change) {
  // 이전 값 처리
  let oldValueStr = "";
  if (change.oldValue !== null && change.oldValue !== undefined) {
    oldValueStr =
      typeof change.oldValue === "object"
        ? JSON.stringify(change.oldValue, null, 2)
        : String(change.oldValue);
  }

  // 새 값 처리
  let newValueStr = "";
  if (change.newValue !== null && change.newValue !== undefined) {
    newValueStr =
      typeof change.newValue === "object"
        ? JSON.stringify(change.newValue, null, 2)
        : String(change.newValue);
  }

  // 변경된 필드 정보
  const fieldInfo = change.field
    ? `<div class="change-field-label">필드: ${escapeHtml(change.field)}</div>`
    : "";

  // JSON 포맷팅 (하이라이팅 + 축약)
  const oldFormatted = formatJsonValue(oldValueStr);
  const newFormatted = formatJsonValue(newValueStr);

  // 타입에 따라 표시 방식 결정
  if (change.type === "added") {
    // 추가된 항목: 오른쪽만 표시
    return `
      <div class="change-comparison-grid">
        <div class="change-comparison-col old-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">이전</span>
          </div>
          <div class="change-comparison-content empty">
            <div class="empty-value">없음</div>
          </div>
        </div>
        <div class="change-comparison-col new-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">현재</span>
          </div>
          <div class="change-comparison-content">
            ${fieldInfo}
            <pre class="change-comparison-value json-code">${newFormatted.isTruncated ? newFormatted.html : newFormatted.html || "추가됨"}</pre>
          </div>
        </div>
      </div>
    `;
  } else if (change.type === "removed") {
    // 삭제된 항목: 왼쪽만 표시
    return `
      <div class="change-comparison-grid">
        <div class="change-comparison-col old-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">이전</span>
          </div>
          <div class="change-comparison-content">
            ${fieldInfo}
            <pre class="change-comparison-value json-code">${oldFormatted.isTruncated ? oldFormatted.html : oldFormatted.html || "삭제됨"}</pre>
          </div>
        </div>
        <div class="change-comparison-col new-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">현재</span>
          </div>
          <div class="change-comparison-content empty">
            <div class="empty-value">없음</div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 수정된 항목 또는 기타: 양쪽 모두 표시
    return `
      <div class="change-comparison-grid">
        <div class="change-comparison-col old-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">이전</span>
          </div>
          <div class="change-comparison-content">
            ${fieldInfo}
            <pre class="change-comparison-value json-code">${oldFormatted.isTruncated ? oldFormatted.html : oldFormatted.html || "없음"}</pre>
          </div>
        </div>
        <div class="change-comparison-col new-col">
          <div class="change-comparison-header">
            <span class="change-comparison-label">현재</span>
          </div>
          <div class="change-comparison-content">
            ${fieldInfo}
            <pre class="change-comparison-value json-code">${newFormatted.isTruncated ? newFormatted.html : newFormatted.html || "없음"}</pre>
          </div>
        </div>
      </div>
    `;
  }
}

function getCategoryIcon(category) {
  const icons = {
    endpoint:
      '<img src="/icons/link.svg" alt="엔드포인트" class="icon" width="14" height="14" style="vertical-align: middle;">',
    parameter:
      '<img src="/icons/edit.svg" alt="파라미터" class="icon" width="14" height="14" style="vertical-align: middle;">',
    response:
      '<img src="/icons/export.svg" alt="응답" class="icon" width="14" height="14" style="vertical-align: middle;">',
    requestBody:
      '<img src="/icons/import.svg" alt="요청 본문" class="icon" width="14" height="14" style="vertical-align: middle;">',
    schema:
      '<img src="/icons/list.svg" alt="스키마" class="icon" width="14" height="14" style="vertical-align: middle;">',
    info: '<img src="/icons/info.svg" alt="정보" class="icon" width="14" height="14" style="vertical-align: middle;">',
    description:
      '<img src="/icons/document.svg" alt="설명" class="icon" width="14" height="14" style="vertical-align: middle;">',
  };
  return (
    icons[category] ||
    '<img src="/icons/pin.svg" alt="기본" class="icon" width="14" height="14" style="vertical-align: middle;">'
  );
}

// HTTP 메서드 추출 및 배지 생성
function extractMethodFromPath(path) {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  const upperPath = path.toUpperCase();
  for (const method of methods) {
    if (
      upperPath.startsWith(method + " ") ||
      upperPath.startsWith(method + "/")
    ) {
      return method;
    }
  }
  return null;
}

function getMethodBadge(path) {
  const method = extractMethodFromPath(path);
  if (!method) return "";

  const methodClass = method.toLowerCase();
  return `<span class="method-badge method-${methodClass}">${method}</span>`;
}

function getPathWithoutMethod(path) {
  const method = extractMethodFromPath(path);
  if (!method) return path;

  // 메서드 + 공백 또는 / 제거
  if (path.toUpperCase().startsWith(method + " ")) {
    return path.substring(method.length + 1);
  }
  if (path.toUpperCase().startsWith(method + "/")) {
    return path.substring(method.length);
  }
  return path;
}

// JSON 축약 및 하이라이팅
function formatJsonValue(jsonStr, maxLines = 5) {
  if (!jsonStr) return { html: "", isTruncated: false };

  const lines = jsonStr.split("\n");
  const highlighted = syntaxHighlight(jsonStr);

  if (lines.length <= maxLines) {
    return { html: highlighted, isTruncated: false };
  }

  // 축약 버전
  const truncatedLines = lines.slice(0, maxLines).join("\n") + "\n...";
  const truncatedHighlighted = syntaxHighlight(truncatedLines);

  return {
    html: `<div class="json-truncate-container">
      <div class="json-truncated">${truncatedHighlighted}</div>
      <div class="json-full hidden">${highlighted}</div>
      <button class="json-expand-btn" onclick="toggleJsonExpand(this)">더보기</button>
    </div>`,
    isTruncated: true,
  };
}

function getSeverityText(severity) {
  const texts = {
    high: "높음",
    medium: "중간",
    low: "낮음",
  };
  return texts[severity] || severity;
}

// ===== Event Handlers =====
function handleVersionChange() {
  loadComparison();
}

function handleSwap() {
  const v1Select = document.getElementById("version1Select");
  const v2Select = document.getElementById("version2Select");

  const temp = v1Select.value;
  v1Select.value = v2Select.value;
  v2Select.value = temp;

  loadComparison();
}

function handleFilterClick(e) {
  const filter =
    e.target.dataset.filter ||
    e.target.closest("[data-filter]")?.dataset.filter;
  if (filter) {
    setActiveFilter(filter);
  } else {
    // "전체" 탭 클릭 시
    setActiveFilter("all");
  }
}

function handleStatClick(e) {
  const filter =
    e.target.dataset.filter ||
    e.target.closest("[data-filter]")?.dataset.filter;
  if (filter) {
    setActiveFilter(filter);
  }
}

function setActiveFilter(filter) {
  activeFilter = filter;

  // 탭 상태 업데이트
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === filter);
  });

  // 통계 상태 업데이트
  document.querySelectorAll(".changes-stat").forEach((stat) => {
    stat.classList.toggle("active", stat.dataset.filter === filter);
  });

  renderChangesList();
}

// ===== Utility Functions =====
function syntaxHighlight(json) {
  if (typeof json !== "string") {
    json = JSON.stringify(json, null, 2);
  }

  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function getChangeIcon(type) {
  const icons = {
    added: "+",
    removed: "−",
    modified: "✎",
    path_version_changed: "↑",
  };
  return icons[type] || "?";
}

function getFilterLabel(filter) {
  const labels = {
    added: "추가된",
    removed: "삭제된",
    modified: "수정된",
    path_version_changed: "버전변경된",
  };
  return labels[filter] || "";
}

// ===== Spec Extraction and Comparison =====

/**
 * 경로 문자열에서 method와 path 추출
 * "GET /v2/users" → { method: "get", path: "/v2/users" }
 */
function extractMethodAndPath(pathStr) {
  if (!pathStr) return { method: null, path: null };

  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  const upperPath = pathStr.toUpperCase();

  for (const method of methods) {
    if (upperPath.startsWith(method + " ")) {
      return {
        method: method.toLowerCase(),
        path: pathStr.substring(method.length + 1).trim()
      };
    }
  }

  return { method: null, path: pathStr };
}

/**
 * 버전 패턴 정규화 (v1, v2 등 제거하여 매칭)
 * "/v1/users" → "/{VERSION}/users"
 */
function normalizeVersionInPath(path) {
  if (!path) return path;
  return path.replace(/\/v\d+\//i, "/{VERSION}/");
}

/**
 * swaggerJson에서 엔드포인트 스펙 가져오기
 * 버전 정규화 고려하여 매칭
 */
function getEndpointSpec(swaggerJson, path, method) {
  if (!swaggerJson || !swaggerJson.paths || !path) return null;

  // 1. 정확한 경로로 먼저 찾기
  if (swaggerJson.paths[path] && swaggerJson.paths[path][method]) {
    return swaggerJson.paths[path][method];
  }

  // 2. 버전 정규화하여 찾기 (v1/v2 차이 무시)
  const normalizedTarget = normalizeVersionInPath(path);

  for (const [swaggerPath, pathSpec] of Object.entries(swaggerJson.paths)) {
    const normalizedSwagger = normalizeVersionInPath(swaggerPath);
    if (normalizedSwagger === normalizedTarget && pathSpec[method]) {
      return pathSpec[method];
    }
  }

  return null;
}

/**
 * 스펙의 주요 섹션들을 추출
 */
function extractSpecSections(spec) {
  if (!spec) return null;

  return {
    summary: spec.summary || null,
    description: spec.description || null,
    operationId: spec.operationId || null,
    tags: spec.tags || [],
    parameters: spec.parameters || [],
    requestBody: spec.requestBody || null,
    responses: spec.responses || {},
    security: spec.security || null,
    deprecated: spec.deprecated || false,
  };
}

/**
 * 스펙 섹션 렌더링 (단일 섹션)
 */
function renderSpecSectionHtml(title, value, isEmpty = false) {
  if (isEmpty || value === null || value === undefined) {
    return `
      <div class="spec-section">
        <div class="spec-section-title">${escapeHtml(title)}</div>
        <div class="spec-section-content empty">
          <span class="empty-value">없음</span>
        </div>
      </div>
    `;
  }

  let content = "";
  if (typeof value === "object") {
    content = syntaxHighlight(JSON.stringify(value, null, 2));
  } else {
    content = escapeHtml(String(value));
  }

  return `
    <div class="spec-section">
      <div class="spec-section-title">${escapeHtml(title)}</div>
      <div class="spec-section-content">
        <pre class="json-code">${content}</pre>
      </div>
    </div>
  `;
}

/**
 * 전체 스펙 좌우 비교 렌더링
 */
function renderSideBySideSpec(oldSpec, newSpec, change) {
  const oldSections = extractSpecSections(oldSpec);
  const newSections = extractSpecSections(newSpec);

  // 표시할 섹션 정의
  const sectionsToShow = [
    { key: "summary", title: "요약 (Summary)" },
    { key: "description", title: "설명 (Description)" },
    { key: "operationId", title: "Operation ID" },
    { key: "tags", title: "태그 (Tags)" },
    { key: "parameters", title: "파라미터 (Parameters)" },
    { key: "requestBody", title: "요청 본문 (Request Body)" },
    { key: "responses", title: "응답 (Responses)" },
    { key: "security", title: "보안 (Security)" },
  ];

  // 이전/현재 버전 라벨
  const v1Label = currentComparison.v1?.versionId || "이전";
  const v2Label = currentComparison.v2?.versionId || "현재";

  // 경로 정보 (버전 변경인 경우)
  let pathInfo = "";
  if (change.type === "path_version_changed" || change.metadata?.versionChanged) {
    const oldPath = change.oldValue?.path || change.metadata?.oldPath || "";
    const newPath = change.newValue?.path || change.metadata?.newPath || "";
    pathInfo = `
      <div class="spec-path-info">
        <div class="spec-path-item old">
          <span class="path-label">이전 경로:</span>
          <code class="path-code">${escapeHtml(oldPath)}</code>
        </div>
        <div class="spec-path-arrow">→</div>
        <div class="spec-path-item new">
          <span class="path-label">현재 경로:</span>
          <code class="path-code">${escapeHtml(newPath)}</code>
        </div>
      </div>
    `;
  }

  // 섹션별 비교 렌더링
  let sectionsHtml = "";
  for (const section of sectionsToShow) {
    const oldValue = oldSections ? oldSections[section.key] : null;
    const newValue = newSections ? newSections[section.key] : null;

    // 둘 다 비어있으면 스킵
    const oldEmpty = oldValue === null || oldValue === undefined ||
                     (Array.isArray(oldValue) && oldValue.length === 0) ||
                     (typeof oldValue === "object" && !Array.isArray(oldValue) && Object.keys(oldValue).length === 0);
    const newEmpty = newValue === null || newValue === undefined ||
                     (Array.isArray(newValue) && newValue.length === 0) ||
                     (typeof newValue === "object" && !Array.isArray(newValue) && Object.keys(newValue).length === 0);

    if (oldEmpty && newEmpty) continue;

    // 변경 여부 확인
    const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
    const changeClass = hasChanged ? "has-diff" : "";

    sectionsHtml += `
      <div class="spec-section-row ${changeClass}">
        <div class="spec-section-header">
          <span class="spec-section-title">${escapeHtml(section.title)}</span>
          ${hasChanged ? '<span class="diff-indicator">변경됨</span>' : ""}
        </div>
        <div class="spec-section-compare">
          <div class="spec-col old-col">
            ${renderSpecValue(oldValue, oldEmpty)}
          </div>
          <div class="spec-col new-col">
            ${renderSpecValue(newValue, newEmpty)}
          </div>
        </div>
      </div>
    `;
  }

  // 섹션이 없으면 기본 메시지
  if (!sectionsHtml) {
    sectionsHtml = `
      <div class="spec-empty-message">
        <p>표시할 스펙 정보가 없습니다.</p>
      </div>
    `;
  }

  return `
    <div class="spec-comparison-container">
      ${pathInfo}
      <div class="spec-comparison-header">
        <div class="spec-header-col old">${escapeHtml(v1Label)} (이전)</div>
        <div class="spec-header-col new">${escapeHtml(v2Label)} (현재)</div>
      </div>
      <div class="spec-comparison-body">
        ${sectionsHtml}
      </div>
    </div>
  `;
}

/**
 * 스펙 값 렌더링
 */
function renderSpecValue(value, isEmpty) {
  if (isEmpty) {
    return '<div class="spec-value empty"><span class="empty-value">없음</span></div>';
  }

  let content = "";
  if (typeof value === "object") {
    content = syntaxHighlight(JSON.stringify(value, null, 2));
  } else if (typeof value === "boolean") {
    content = value ? "true" : "false";
  } else {
    content = escapeHtml(String(value));
  }

  return `<div class="spec-value"><pre class="json-code">${content}</pre></div>`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showLoading(show) {
  let loader = document.getElementById("loadingOverlay");
  if (show) {
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "loadingOverlay";
      loader.className = "loading-overlay";
      loader.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(loader);
    }
    loader.style.display = "flex";
  } else if (loader) {
    loader.style.display = "none";
  }
}
