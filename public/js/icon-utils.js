/**
 * Icon Utilities - Atlassian 아이콘 헬퍼 함수
 */

/**
 * SVG 아이콘을 인라인으로 렌더링하는 함수
 * @param {string} iconName - 아이콘 파일명 (확장자 제외)
 * @param {Object} options - 옵션 객체
 * @param {string} options.className - 추가할 CSS 클래스
 * @param {string} options.size - 아이콘 크기 (기본: 24)
 * @param {string} options.color - 아이콘 색상 (기본: currentColor)
 * @returns {Promise<string>} SVG HTML 문자열
 */
async function getIcon(iconName, options = {}) {
  const {
    className = '',
    size = 24,
    color = 'currentColor'
  } = options;

  try {
    const response = await fetch(`/icons/${iconName}.svg`);
    if (!response.ok) {
      console.warn(`Icon not found: ${iconName}.svg`);
      return '';
    }

    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (!svgElement) {
      return '';
    }

    // 크기 설정
    svgElement.setAttribute('width', size);
    svgElement.setAttribute('height', size);

    // 클래스 추가
    if (className) {
      const existingClass = svgElement.getAttribute('class') || '';
      svgElement.setAttribute('class', `icon icon-${iconName} ${className}`.trim());
    } else {
      svgElement.setAttribute('class', `icon icon-${iconName}`);
    }

    // 색상 설정 (stroke와 fill을 currentColor로 설정)
    svgElement.setAttribute('fill', 'none');
    svgElement.setAttribute('stroke', color);

    // 모든 path와 circle 요소의 stroke를 currentColor로 설정
    const paths = svgElement.querySelectorAll('path, circle, line, polyline, polygon');
    paths.forEach(el => {
      el.setAttribute('stroke', color);
      if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') {
        el.setAttribute('fill', color);
      }
    });

    return svgElement.outerHTML;
  } catch (error) {
    console.error(`Error loading icon ${iconName}:`, error);
    return '';
  }
}

/**
 * 아이콘을 동기적으로 렌더링하는 함수 (캐시 사용)
 * @param {string} iconName - 아이콘 파일명
 * @param {Object} options - 옵션 객체
 * @returns {string} SVG HTML 문자열
 */
const iconCache = {};
function getIconSync(iconName, options = {}) {
  const {
    className = '',
    size = 24,
    color = 'currentColor'
  } = options;

  const cacheKey = `${iconName}-${size}-${color}-${className}`;
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey];
  }

  // 동기적으로 SVG를 로드하기 위해 fetch 대신 직접 경로 반환
  // 실제로는 HTML에서 직접 사용하거나, 미리 로드된 아이콘을 사용
  return `<img src="/icons/${iconName}.svg" alt="${iconName}" class="icon icon-${iconName} ${className}" width="${size}" height="${size}" style="color: ${color};">`;
}

/**
 * 아이콘을 HTML 요소로 렌더링
 * @param {string} iconName - 아이콘 파일명
 * @param {Object} options - 옵션 객체
 * @returns {HTMLElement} SVG 요소
 */
async function createIconElement(iconName, options = {}) {
  const svgHtml = await getIcon(iconName, options);
  if (!svgHtml) {
    return null;
  }

  const temp = document.createElement('div');
  temp.innerHTML = svgHtml;
  return temp.firstElementChild;
}

// 전역으로 사용할 수 있도록 window 객체에 추가
window.IconUtils = {
  getIcon,
  getIconSync,
  createIconElement
};
