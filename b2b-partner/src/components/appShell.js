/** 상단 헤더 + 메인 탭 (좌측 고정 사이드바 없음). 탭 정의는 배열로만 확장한다. */
import { esc, cx } from '../utils/dom.js';
import { mockUser, mockNotifications } from '../data/mockCompanies.js';

/** 메인 탭 — 항목 추가만으로 확장 가능 */
export const MAIN_TABS = [
  { key: 'dashboard', label: '대시보드', route: '#/dashboard' },
  { key: 'companies', label: '업체', route: '#/companies' },
  { key: 'sales', label: '영업', route: '#/sales' },
  { key: 'mou', label: 'MOU', route: '#/mou' },
  { key: 'revenue', label: '매출', route: '#/revenue' },
  { key: 'performance', label: '시공실적', route: '#/performance' },
  { key: 'map', label: '지도', route: '#/map' },
  { key: 'analytics', label: '분석', route: '#/analytics' },
  { key: 'admin', label: '관리', route: '#/admin' },
];

export const PRODUCT_NAME = 'B2B Partner Management';
export const PRODUCT_NAME_KO = 'B2B 업체관리';

export function appHeader() {
  return `
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">B</span>
        <span class="brand-name">${esc(PRODUCT_NAME_KO)}</span>
      </div>

      <div class="global-search">
        <span class="gs-icon">⌕</span>
        <label class="sr-only" for="global-search-input">전체 검색</label>
        <input id="global-search-input" type="search" autocomplete="off"
               placeholder="업체명 · 업체코드 · 사업자번호 · 대표자 전체 검색">
      </div>

      <div class="header-actions">
        <button type="button" class="icon-btn" title="알림 ${mockNotifications.length}건" data-action="notifications">
          🔔<span class="dot"></span>
        </button>
        <button type="button" class="icon-btn" title="설정" data-action="settings">⚙</button>
        <div class="user-chip">
          <span class="avatar">${esc(mockUser.initials)}</span>
          <span class="col" style="gap:0">
            <span class="u-name">${esc(mockUser.name)}</span>
            <span class="u-role">${esc(mockUser.role)}</span>
          </span>
        </div>
      </div>
    </header>`;
}

export function mainNav(activeKey, counts = {}) {
  return `
    <nav class="app-nav">
      <div class="app-nav-inner">
        ${MAIN_TABS.map((tab) => `
          <a class="${cx('nav-tab', tab.key === activeKey && 'is-active')}" href="${tab.route}">
            ${esc(tab.label)}
            ${counts[tab.key] !== undefined ? `<span class="count">${counts[tab.key]}</span>` : ''}
          </a>`).join('')}
      </div>
    </nav>`;
}
