/**
 * Main.js - 메인 페이지 로직
 */

// ===== DOM Elements =====
let urlsData = [];
let currentFilter = { group: "", service: "", search: "" };
let servicesByGroup = {}; // 팀별 서비스 목록

// ===== Initialize =====
// DOM이 이미 로드되었거나 로드 중인 경우 처리
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM이 이미 로드됨
  initApp();
}

async function initApp() {
  setupEventListeners();
  // 즉시 로딩 시작
  await loadUrls();
}

// ===== Event Listeners =====
function setupEventListeners() {
  // 검색
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // 팀 필터
  const teamFilter = document.getElementById("teamFilter");
  if (teamFilter) {
    teamFilter.addEventListener("change", handleTeamFilter);
  }

  // 서비스 필터
  const serviceFilter = document.getElementById("serviceFilter");
  if (serviceFilter) {
    serviceFilter.addEventListener("change", handleServiceFilter);
  }

  // 초기화 버튼
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", resetFilters);
  }

  // URL 추가 버튼
  const addUrlBtn = document.getElementById("addUrlBtn");
  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", () => openModal("addUrlModal"));
  }

  // 모달 닫기
  document.querySelectorAll(".modal-close, .modal-cancel").forEach((btn) => {
    btn.addEventListener("click", () => closeModal());
  });

  // 모달 외부 클릭으로 닫기
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  });

  // URL 추가 폼 제출
  const addUrlForm = document.getElementById("addUrlForm");
  if (addUrlForm) {
    addUrlForm.addEventListener("submit", handleAddUrl);
  }

  // URL 수정 폼 제출
  const editUrlForm = document.getElementById("editUrlForm");
  if (editUrlForm) {
    editUrlForm.addEventListener("submit", handleEditUrl);
  }

  // 새로고침 버튼
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadUrls);
  }

  // API 그리드 이벤트 위임 (카드 클릭, 수정 버튼, 빈 상태 추가 버튼)
  const apiGrid = document.getElementById("apiGrid");
  if (apiGrid) {
    apiGrid.addEventListener("click", (e) => {
      // 빈 상태에서 API 추가 버튼
      const addBtn = e.target.closest(".empty-state-add-btn");
      if (addBtn) {
        openModal("addUrlModal");
        return;
      }

      // 수정 버튼 클릭
      const editBtn = e.target.closest(".edit-card-btn");
      if (editBtn) {
        e.stopPropagation();
        const id = editBtn.dataset.id;
        if (id) openEditModal(id);
        return;
      }

      // API 카드 클릭
      const card = e.target.closest(".api-card");
      if (card) {
        const id = card.dataset.id;
        if (id) viewApiDetail(id);
      }
    });
  }
}

// ===== Data Loading =====
async function loadUrls() {
  const container = document.getElementById("apiGrid");
  if (container) {
    container.classList.add("loading");
  }

  try {
    // 정렬 기준 결정
    let sortParam = '-updatedAt'; // 기본 정렬
    if (currentFilter.group && currentFilter.service) {
      sortParam = 'group service'; // 팀과 서비스 모두 선택시: 팀별, 서비스별 정렬
    } else if (currentFilter.group) {
      sortParam = 'group service'; // 팀만 선택시: 팀별, 서비스별 정렬
    } else if (currentFilter.service) {
      sortParam = 'service'; // 서비스만 선택시: 서비스별 정렬
    }

    const response = await apiClient.getUrls({
      group: currentFilter.group || undefined,
      service: currentFilter.service || undefined,
      search: currentFilter.search || undefined,
      sort: sortParam,
    });

    console.log("API Response:", response);
    urlsData = response.data;
    console.log("urlsData:", urlsData);

    // 필터 옵션 업데이트
    if (response.meta) {
      if (response.meta.groups) {
        updateTeamOptions(response.meta.groups);
      }
      if (response.meta.servicesByGroup) {
        servicesByGroup = response.meta.servicesByGroup;
      }
      updateServiceOptions();
    }

    // 스켈레톤 UI 페이드 아웃 후 실제 데이터 렌더링
    removeSkeletonCards();
    renderUrlCards(urlsData);
  } catch (error) {
    console.error("loadUrls error:", error);
    removeSkeletonCards();
    showToast(error.message, "error");
  } finally {
    if (container) {
      container.classList.remove("loading");
    }
  }
}

// ===== Rendering =====
function removeSkeletonCards() {
  const container = document.getElementById("apiGrid");
  if (!container) return;

  const skeletonCards = container.querySelectorAll('[data-skeleton="true"]');
  skeletonCards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add("fade-out");
      setTimeout(() => {
        card.remove();
      }, 300);
    }, index * 50); // 순차적으로 페이드 아웃
  });
}

function renderUrlCards(urls) {
  const container = document.getElementById("apiGrid");
  if (!container) return;

  // 스켈레톤 카드가 아직 남아있으면 제거
  const skeletonCards = container.querySelectorAll('[data-skeleton="true"]');
  skeletonCards.forEach((card) => card.remove());

  if (urls.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <img src="/icons/inbox.svg" alt="빈 상태" class="icon" width="48" height="48">
        </div>
        <h3 class="empty-state-title">등록된 API가 없습니다</h3>
        <p class="empty-state-text">새 API URL을 추가하여 시작하세요</p>
        <button class="btn btn-primary empty-state-add-btn">
          + API 추가
        </button>
      </div>
    `;
    return;
  }

  // 실제 카드들을 페이드 인 효과와 함께 추가
  const cardsHtml = urls
    .map(
      (url) => `
    <div class="card api-card" data-id="${url._id}" style="opacity: 0; animation: fadeIn 0.3s ease forwards; position: relative; cursor: pointer;">
      <button class="btn btn-sm btn-icon edit-card-btn" data-id="${url._id}" title="수정" style="position: absolute; top: 12px; right: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px;">
        <img src="/icons/edit.svg" alt="수정" class="icon" width="16" height="16">
      </button>
      <div class="card-body">
        <div class="api-card-header">
          <div class="api-card-icon">
            <img src="/icons/code.svg" alt="API" class="icon" width="24" height="24">
          </div>
          <div>
            <div class="api-card-title">${escapeHtml(url.name)}</div>
            <div class="api-card-url">${escapeHtml(url.url)}</div>
          </div>
        </div>
        ${url.description ? `<p class="api-card-description">${escapeHtml(url.description)}</p>` : ""}
      </div>
      <div class="card-footer">
        <div class="api-card-meta">
          <span class="group-badge" style="background: ${getGroupColor(url.group).background}; color: ${getGroupColor(url.group).color};">${escapeHtml(url.group)}</span>
          ${url.service ? `<span class="group-badge" style="background: ${getServiceColor(url.service).background}; color: ${getServiceColor(url.service).color};">${escapeHtml(url.service)}</span>` : ""}
          <span class="status-badge status-${url.lastFetchStatus}">
            <span class="status-dot"></span>
            ${getStatusText(url.lastFetchStatus)}
          </span>
          <span class="api-card-meta-item">
            <img src="/icons/graph.svg" alt="버전" class="icon" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
            ${url.versionCount || 0} 버전
          </span>
          ${
            url.lastFetchedAt
              ? `
            <span class="api-card-meta-item">
              <img src="/icons/clock.svg" alt="시간" class="icon" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
              ${formatDate(url.lastFetchedAt)}
            </span>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = cardsHtml;

  // 페이드 인 애니메이션을 위한 스타일 추가
  if (!document.getElementById("fadeInStyle")) {
    const style = document.createElement("style");
    style.id = "fadeInStyle";
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function updateTeamOptions(groups) {
  const select = document.getElementById("teamFilter");
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">전체 팀</option>';

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group.toUpperCase();
    select.appendChild(option);
  });

  select.value = currentValue;
}

function updateServiceOptions() {
  const select = document.getElementById("serviceFilter");
  if (!select) return;

  const currentValue = select.value;
  const selectedTeam = document.getElementById("teamFilter")?.value || "";

  // 팀이 선택된 경우 해당 팀의 서비스만 표시
  let servicesToShow = [];
  if (selectedTeam && servicesByGroup[selectedTeam]) {
    servicesToShow = servicesByGroup[selectedTeam];
  } else {
    // 모든 서비스 표시 (팀별 서비스 목록에서 중복 제거)
    const allServices = new Set();
    Object.values(servicesByGroup).forEach(services => {
      services.forEach(service => allServices.add(service));
    });
    servicesToShow = Array.from(allServices);
  }

  select.innerHTML = '<option value="">전체 서비스</option>';

  servicesToShow.forEach((service) => {
    const option = document.createElement("option");
    option.value = service;
    option.textContent = service.toUpperCase();
    select.appendChild(option);
  });

  // 현재 선택된 값이 유효한지 확인하고 설정
  if (currentValue && servicesToShow.includes(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "";
    currentFilter.service = "";
  }
}

// ===== Event Handlers =====
function handleSearch(e) {
  currentFilter.search = e.target.value;
  loadUrls();
}

function handleTeamFilter(e) {
  currentFilter.group = e.target.value;
  // 팀 변경시 서비스 필터 초기화 및 서비스 옵션 업데이트
  currentFilter.service = "";
  updateServiceOptions();
  loadUrls();
}

function handleServiceFilter(e) {
  currentFilter.service = e.target.value;
  loadUrls();
}

function resetFilters() {
  // currentFilter 초기화
  currentFilter = { group: "", service: "", search: "" };

  // 필터 select 요소들 초기화
  const teamFilter = document.getElementById("teamFilter");
  if (teamFilter) {
    teamFilter.value = "";
  }

  const serviceFilter = document.getElementById("serviceFilter");
  if (serviceFilter) {
    serviceFilter.value = "";
  }

  // 검색 입력 필드 비우기
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.value = "";
  }

  // 서비스 옵션 업데이트 (팀 필터가 없으므로 전체 서비스 표시)
  updateServiceOptions();

  // 데이터 다시 로드
  loadUrls();
}

async function handleAddUrl(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    const data = {
      name: form.name.value.trim(),
      url: form.url.value.trim(),
      group: form.group.value.trim().toLowerCase(),
      service: form.service.value.trim().toLowerCase(),
      description: form.description.value.trim(),
    };

    await apiClient.createUrl(data);

    showToast("API가 성공적으로 추가되었습니다", "success");
    closeModal();
    form.reset();
    await loadUrls();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function viewApiDetail(id) {
  window.location.href = `/api-detail?id=${id}`;
}

async function openEditModal(id) {
  try {
    // API 정보 가져오기
    const response = await apiClient.getUrl(id);
    const url = response.data;

    // 폼에 기존 값 채우기
    document.getElementById("editUrlId").value = url._id;
    document.getElementById("editUrlName").value = url.name || "";
    document.getElementById("editUrlUrl").value = url.url || "";
    document.getElementById("editUrlGroup").value = url.group || "";
    document.getElementById("editUrlService").value = url.service || "";
    document.getElementById("editUrlDescription").value = url.description || "";

    // 모달 열기
    openModal("editUrlModal");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleEditUrl(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const id = form.id.value;

  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    const data = {
      name: form.name.value.trim(),
      url: form.url.value.trim(),
      group: form.group.value.trim().toLowerCase(),
      service: form.service.value.trim().toLowerCase(),
      description: form.description.value.trim(),
    };

    await apiClient.updateUrl(id, data);

    showToast("API가 성공적으로 수정되었습니다", "success");
    closeModal();
    await loadUrls();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ===== Modal Functions =====
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.classList.remove("active");
  });
  document.body.style.overflow = "";
}

// ===== Toast Notifications =====
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button class="toast-close-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;margin-left:auto;display:flex;align-items:center;padding:4px;" aria-label="닫기">
      <img src="/icons/close.svg" alt="닫기" class="icon" width="16" height="16">
    </button>
  `;

  // 닫기 버튼 이벤트 바인딩
  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  // 5초 후 자동 삭제
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ===== Loading State =====
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

// ===== Utility Functions =====
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getGroupColor(group) {
  if (!group) return { background: "rgba(97, 175, 254, 0.15)", color: "#0ea5e9" };

  const groupLower = group.toLowerCase().trim();

  // 기존 그룹은 고정된 색상 유지
  const predefinedColors = {
    "hu": { background: "rgba(171, 146, 255, 0.15)", color: "#7c3aed" },
    "플랫폼": { background: "rgba(171, 146, 255, 0.15)", color: "#7c3aed" },
    "공통": { background: "rgba(97, 175, 254, 0.15)", color: "#0ea5e9" },
    "러닝": { background: "rgba(73, 204, 144, 0.15)", color: "#10b981" },
    "learning": { background: "rgba(73, 204, 144, 0.15)", color: "#10b981" },
    "샘플": { background: "rgba(252, 161, 48, 0.15)", color: "#f59e0b" },
    "sample": { background: "rgba(252, 161, 48, 0.15)", color: "#f59e0b" },
    "연수": { background: "rgba(244, 114, 182, 0.15)", color: "#ec4899" },
    "academy": { background: "rgba(244, 114, 182, 0.15)", color: "#ec4899" }
  };

  // 기존 그룹 매칭
  for (const [key, colors] of Object.entries(predefinedColors)) {
    if (groupLower.includes(key)) {
      return colors;
    }
  }

  // 새로운 그룹: HSL 기반 동적 색상 생성
  const hash = hashString(groupLower);
  const hue = hash % 360;
  const saturation = 65;
  const lightness = 55;

  return {
    background: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.15)`,
    color: `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`
  };
}

function getServiceColor(service) {
  if (!service) return { background: "rgba(97, 175, 254, 0.15)", color: "#0ea5e9" };

  const serviceLower = service.toLowerCase().trim();

  // 서비스: HSL 기반 동적 색상 생성 (팀 배지와 동일한 방식)
  const hash = hashString(serviceLower);
  const hue = hash % 360;
  const saturation = 65;
  const lightness = 55;

  return {
    background: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.15)`,
    color: `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`
  };
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  // 1시간 이내
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}분 전`;
  }

  // 24시간 이내
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}시간 전`;
  }

  // 7일 이내
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}일 전`;
  }

  // 그 외
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function getStatusText(status) {
  const statusMap = {
    success: "정상",
    error: "오류",
    pending: "대기중",
  };
  return statusMap[status] || status;
}

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
