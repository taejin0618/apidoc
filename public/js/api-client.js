/**
 * API Client - 백엔드 API 호출 래퍼
 */
const API_BASE = '/api';

class ApiClient {
  /**
   * HTTP 요청 수행
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error?.message || 'API 요청 실패',
          response.status,
          data.error?.code
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || '네트워크 오류', 0, 'NETWORK_ERROR');
    }
  }

  // ===== URL API =====

  /**
   * 모든 URL 목록 조회
   */
  async getUrls(params = {}) {
    // undefined, null, 빈 문자열 값 제거
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/urls${query ? `?${query}` : ''}`);
  }

  /**
   * 특정 URL 조회
   */
  async getUrl(id) {
    return this.request(`/urls/${id}`);
  }

  /**
   * URL 생성
   */
  async createUrl(data) {
    return this.request('/urls', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * URL 수정
   */
  async updateUrl(id, data) {
    return this.request(`/urls/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * URL 삭제
   */
  async deleteUrl(id) {
    return this.request(`/urls/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * URL 활성화/비활성화 토글
   */
  async toggleUrlActive(id) {
    return this.request(`/urls/${id}/activate`, {
      method: 'PATCH',
    });
  }

  /**
   * Swagger 파싱 실행
   */
  async fetchSwagger(id) {
    return this.request(`/urls/${id}/fetch`, {
      method: 'POST',
    });
  }

  // ===== Version API =====

  /**
   * URL의 버전 목록 조회
   */
  async getVersions(urlId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/urls/${urlId}/versions${query ? `?${query}` : ''}`);
  }

  /**
   * 최신 버전 조회
   */
  async getLatestVersion(urlId) {
    return this.request(`/urls/${urlId}/versions/latest`);
  }

  /**
   * 특정 버전 조회
   */
  async getVersion(urlId, versionId) {
    return this.request(`/urls/${urlId}/versions/${versionId}`);
  }

  /**
   * 버전 diff 조회
   */
  async getVersionDiff(urlId, versionId, compareWith = null) {
    const query = compareWith ? `?compareWith=${compareWith}` : '';
    return this.request(`/urls/${urlId}/versions/${versionId}/diff${query}`);
  }

  /**
   * 두 버전 비교
   */
  async compareVersions(urlId, v1, v2) {
    return this.request(`/urls/${urlId}/versions/${v1}/compare/${v2}`);
  }

  /**
   * 최근 변경사항 조회
   */
  async getRecentChanges(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/versions/recent-changes${query ? `?${query}` : ''}`);
  }

  // ===== Health API =====

  /**
   * 서버 상태 확인
   */
  async healthCheck() {
    return this.request('/health');
  }
}

/**
 * API 에러 클래스
 */
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// 싱글톤 인스턴스 내보내기
const apiClient = new ApiClient();
