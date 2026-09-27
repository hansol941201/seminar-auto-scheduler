/**
 * 앱 셸 + 해시 라우터 + 이벤트 위임.
 * 라우트 정의만 추가하면 화면이 확장된다.
 */
import { esc } from './utils/dom.js';
import { appHeader, mainNav, MAIN_TABS } from './components/appShell.js';
import { initModalHost, openModal, closeModal } from './components/modal.js';
import { newCompanyModal } from './components/newCompanyModal.js';
import { uiState, patch, resetCompanyFilter, onChange } from './services/uiState.js';
import { getListCompanies, globalSearch } from './services/companyService.js';

import { dashboardPage } from './pages/dashboard.js';
import { companiesPage } from './pages/companies.js';
import { companyDetailPage } from './pages/companyDetail/index.js';
import { salesPage } from './pages/sales.js';
import { mouPage } from './pages/mou.js';
import { revenuePage } from './pages/revenue.js';
import { revenueUploadPage } from './pages/revenueUpload.js';
import { performancePage } from './pages/performance.js';
import { mapPage } from './pages/map.js';
import { analyticsPage } from './pages/analytics.js';
import { adminPage } from './pages/admin.js';

/** 라우트 표 — [패턴, 활성 메인 탭, 렌더러] */
const ROUTES = [
  { match: /^\/dashboard$/, tab: 'dashboard', render: () => dashboardPage() },
  { match: /^\/companies$/, tab: 'companies', render: () => companiesPage() },
  { match: /^\/companies\/([^/]+)$/, tab: 'companies', render: (id) => companyDetailPage(id) },
  { match: /^\/sales$/, tab: 'sales', render: () => salesPage() },
  { match: /^\/mou$/, tab: 'mou', render: () => mouPage() },
  { match: /^\/revenue$/, tab: 'revenue', render: () => revenuePage() },
  { match: /^\/revenue\/upload$/, tab: 'revenue', render: () => revenueUploadPage() },
  { match: /^\/performance$/, tab: 'performance', render: () => performancePage() },
  { match: /^\/map$/, tab: 'map', render: () => mapPage() },
  { match: /^\/analytics$/, tab: 'analytics', render: () => analyticsPage() },
  { match: /^\/admin$/, tab: 'admin', render: () => adminPage(uiState.adminSection) },
  { match: /^\/admin\/([^/]+)$/, tab: 'admin', render: (section) => adminPage(section) },
];

const elements = {};

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/dashboard';
}

function resolve(path) {
  for (const route of ROUTES) {
    const matched = route.match.exec(path);
    if (matched) return { route, params: matched.slice(1) };
  }
  return null;
}

function navCounts() {
  const companies = getListCompanies();
  return {
    companies: companies.length,
    mou: companies.filter((company) => company.mou?.status === 'SIGNED').length,
  };
}

export function render() {
  const path = currentPath();
  const resolved = resolve(path);

  if (!resolved) {
    elements.nav.innerHTML = mainNav('dashboard', navCounts());
    elements.view.innerHTML = `
      <div class="page">
        <div class="empty">
          <div class="e-title">화면을 찾을 수 없습니다</div>
          <div class="small">요청 경로: ${esc(path)}</div>
          <div style="margin-top:12px"><a class="btn btn-primary" href="#/dashboard">대시보드로 이동</a></div>
        </div>
      </div>`;
    return;
  }

  const { route, params } = resolved;
  if (route.tab === 'admin' && params[0]) uiState.adminSection = params[0];

  elements.nav.innerHTML = mainNav(route.tab, navCounts());
  elements.view.innerHTML = route.render(...params);
  document.title = `${MAIN_TABS.find((tab) => tab.key === route.tab)?.label || ''} · B2B Partner Management`;
  window.scrollTo({ top: 0 });
}

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  elements.toast.append(node);
  setTimeout(() => node.remove(), 2200);
}

function go(path) {
  window.location.hash = path;
}

/* ------------------------------ 이벤트 위임 ------------------------------ */

const CLICK_HANDLERS = {
  openNewCompany: () => openModal(newCompanyModal()),
  notImplemented: (dataset) => toast(`"${dataset.label}" 동작은 다음 단계에서 연결합니다.`),
  notifications: () => toast('알림 화면은 다음 단계에서 연결합니다.'),
  settings: () => go('/admin/settings'),
  openCompany: (dataset) => { uiState.companyDetailTab = 'basic'; go(`/companies/${dataset.id}`); },
  openCompanyTab: (dataset) => { uiState.companyDetailTab = dataset.tab || 'basic'; go(`/companies/${dataset.id}`); },
  detailTab: (dataset) => patch('companyDetailTab', dataset.tab),
  resetFilter: () => resetCompanyFilter(),
  salesStage: (dataset) => patch('salesStageFilter', dataset.stage || ''),
  mouStatus: (dataset) => patch('mouStatusFilter', dataset.status || ''),
  revenueYear: (dataset) => patch('revenueYear', Number(dataset.year)),
  analyticsYear: (dataset) => patch('analyticsYear', Number(dataset.year)),
  perfYear: (dataset) => patch('performanceFilter.year', dataset.year ? Number(dataset.year) : null),
  mapLayer: (dataset) => patch('mapLayer', dataset.layer),
  uploadNext: (dataset) => patch('uploadStep', dataset.step),
};

const FILTER_HANDLERS = {
  keyword: (value) => patch('companyFilter.keyword', value),
  region: (value) => patch('companyFilter.region', value),
  companyType: (value) => patch('companyFilter.companyType', value),
  salesStage: (value) => patch('companyFilter.salesStage', value),
  mouStatus: (value) => patch('companyFilter.mouStatus', value),
  status: (value) => patch('companyFilter.status', value),
  sort: (value) => patch('companyFilter.sort', value),
  revenueCompany: (value) => patch('revenueCompanyId', value),
  perfRegion: (value) => patch('performanceFilter.region', value),
  perfWorkType: (value) => patch('performanceFilter.workType', value),
  perfStatus: (value) => patch('performanceFilter.status', value),
};

function bindEvents() {
  document.body.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const handler = CLICK_HANDLERS[target.dataset.action];
    if (!handler) return;
    if (target.tagName !== 'A') event.preventDefault();
    handler(target.dataset, target);
  });

  // 목록 필터: 입력(검색어)과 선택(셀렉트) 모두 위임 처리
  elements.view.addEventListener('input', (event) => {
    const target = event.target.closest('[data-filter]');
    if (!target) return;
    const handler = FILTER_HANDLERS[target.dataset.filter];
    if (!handler) return;
    const caretOwner = target.dataset.filter;
    handler(target.value);
    // 재렌더 후 검색 입력 포커스/커서 복원
    if (caretOwner === 'keyword') {
      const next = elements.view.querySelector('[data-filter="keyword"]');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    }
  });

  elements.view.addEventListener('change', (event) => {
    const target = event.target.closest('select[data-filter]');
    if (!target) return;
    const handler = FILTER_HANDLERS[target.dataset.filter];
    if (handler) handler(target.value);
  });

  // 헤더 전체검색
  const searchInput = elements.header.querySelector('#global-search-input');
  const box = elements.header.querySelector('.global-search');
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim();
    const existing = box.querySelector('.search-results');
    if (existing) existing.remove();
    if (keyword.length < 1) return;

    const results = globalSearch(keyword);
    const panel = document.createElement('div');
    panel.className = 'search-results';
    panel.innerHTML = results.length
      ? results.map((company) => `
          <a class="sr-item" href="#/companies/${company.id}">
            <span class="code-chip">${esc(company.companyCode)}</span>
            <span class="grow">${esc(company.name)}</span>
            <span class="small muted">${esc(company.region)}</span>
          </a>`).join('')
      : '<div class="sr-empty">일치하는 업체가 없습니다.</div>';
    box.append(panel);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    patch('companyFilter.keyword', searchInput.value.trim());
    go('/companies');
    searchInput.value = '';
    box.querySelector('.search-results')?.remove();
  });
  document.addEventListener('click', (event) => {
    if (!box.contains(event.target)) box.querySelector('.search-results')?.remove();
  });

  window.addEventListener('hashchange', () => { closeModal(); render(); });
  onChange(render);
}

export function bootstrap(root) {
  root.innerHTML = `
    <div id="app-header"></div>
    <div id="app-nav"></div>
    <main id="app-view"></main>
    <div id="modal-host" hidden></div>
    <div class="toast-host" id="toast-host"></div>`;

  elements.header = root.querySelector('#app-header');
  elements.nav = root.querySelector('#app-nav');
  elements.view = root.querySelector('#app-view');
  elements.toast = root.querySelector('#toast-host');

  elements.header.innerHTML = appHeader();
  initModalHost(root.querySelector('#modal-host'));
  bindEvents();
  render();
}
