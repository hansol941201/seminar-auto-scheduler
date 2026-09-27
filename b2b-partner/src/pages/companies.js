/** 업체 목록 — 검색 / 필터 / 정렬 / 신규 등록 진입. */
import { esc } from '../utils/dom.js';
import { pageHead, card, placeholderButton, badge } from '../components/ui.js';
import { dataTable, tableFoot } from '../components/table.js';
import {
  companyNameCell, companyCodeCell, bizNoCell, typeBadge, stageBadge, mouBadge,
  meetingCell, lastActivityCell, revenueCell, performanceCell, statusBadge,
} from '../components/companyBits.js';
import { queryCompanies, SORT_OPTIONS, getListCompanies } from '../services/companyService.js';
import { uiState } from '../services/uiState.js';
import {
  REGIONS, COMPANY_TYPE, SALES_STAGE, MOU_STATUS, COMPANY_STATUS, CURRENT_YEAR, meta,
} from '../data/constants.js';
import { wonShort } from '../utils/format.js';

function options(map) {
  return Object.values(map).map((item) => ({ value: item.key, label: item.label }));
}

function filterSelect(name, label, items, value) {
  return `
    <label class="sr-only" for="flt-${name}">${esc(label)}</label>
    <select class="select" id="flt-${name}" data-filter="${name}" title="${esc(label)}">
      <option value="">${esc(label)} 전체</option>
      ${items.map((item) => {
        const itemValue = item.value ?? item;
        const itemLabel = item.label ?? item;
        return `<option value="${esc(itemValue)}" ${String(itemValue) === String(value) ? 'selected' : ''}>${esc(itemLabel)}</option>`;
      }).join('')}
    </select>`;
}

export function companyListToolbar() {
  const filter = uiState.companyFilter;
  return `
    <div class="toolbar">
      <div class="search">
        <span class="s-icon">⌕</span>
        <label class="sr-only" for="company-search">업체 검색</label>
        <input class="input" id="company-search" type="search" data-filter="keyword"
               value="${esc(filter.keyword)}" placeholder="업체명 · 코드 · 사업자번호 · 대표자 · 별칭">
      </div>
      <span class="sep"></span>
      ${filterSelect('region', '지역', REGIONS, filter.region)}
      ${filterSelect('companyType', '업체유형', options(COMPANY_TYPE), filter.companyType)}
      ${filterSelect('salesStage', '영업단계', options(SALES_STAGE), filter.salesStage)}
      ${filterSelect('mouStatus', 'MOU', options(MOU_STATUS), filter.mouStatus)}
      ${filterSelect('status', '상태', options(COMPANY_STATUS), filter.status)}
      <span class="sep"></span>
      ${filterSelect('sort', '정렬', SORT_OPTIONS.map((option) => ({ value: option.key, label: option.label })), filter.sort)}
      <button type="button" class="btn btn-sm" data-action="resetFilter">초기화</button>
      <span class="spacer"></span>
      <div class="btn-group">
        ${placeholderButton('Excel 내보내기')}
        ${placeholderButton('Excel 가져오기')}
      </div>
      <button type="button" class="btn btn-primary btn-sm" data-action="openNewCompany">+ 신규 업체 등록</button>
    </div>`;
}

export function companyTable(rows) {
  const totalRevenue = rows.reduce((sum, company) => sum + (company.revenues || [])
    .filter((revenue) => revenue.year === CURRENT_YEAR)
    .reduce((acc, revenue) => acc + revenue.amount, 0), 0);

  return dataTable({
    rowAction: 'openCompany',
    rowDataset: (company) => ({ id: company.id }),
    rowClass: (company) => (company.status !== 'ACTIVE' ? 'is-muted' : ''),
    emptyTitle: '조건에 맞는 업체가 없습니다',
    emptyDesc: '검색어나 필터를 조정해 보세요.',
    columns: [
      { key: 'name', label: '업체명', render: companyNameCell },
      { key: 'code', label: '업체코드', width: '96px', render: companyCodeCell },
      { key: 'bizNo', label: '사업자번호', width: '116px', render: bizNoCell },
      { key: 'representative', label: '대표자', width: '80px', render: (company) => esc(company.representative || '—') },
      { key: 'contactName', label: '담당자', width: '120px', render: (company) => esc(company.contactName || '—') },
      { key: 'region', label: '지역', width: '64px', render: (company) => esc(company.region) },
      { key: 'type', label: '업체유형', width: '84px', render: typeBadge },
      { key: 'stage', label: '영업단계', width: '96px', render: stageBadge },
      { key: 'mou', label: 'MOU', width: '76px', render: mouBadge },
      { key: 'first', label: '1차 미팅', width: '96px', render: (company) => meetingCell(company.firstMeeting) },
      { key: 'second', label: '2차 미팅', width: '96px', render: (company) => meetingCell(company.secondMeeting) },
      { key: 'activity', label: '최근 활동', width: '150px', render: lastActivityCell },
      { key: 'performance', label: '시공실적', width: '76px', align: 'right', render: performanceCell },
      { key: 'revenue', label: `${CURRENT_YEAR} 매출`, width: '96px', align: 'right', render: revenueCell },
      { key: 'status', label: '상태', width: '84px', render: statusBadge },
    ],
    rows,
    footer: `<tr>
      <td colspan="12">합계 ${rows.length}개 업체</td>
      <td class="num">${rows.reduce((sum, company) => sum + (company.performances || []).length, 0)}건</td>
      <td class="num">${wonShort(totalRevenue)}</td>
      <td></td>
    </tr>`,
  });
}

export function companiesPage() {
  const rows = queryCompanies(uiState.companyFilter);
  const all = getListCompanies();
  const activeFilters = Object.entries(uiState.companyFilter)
    .filter(([key, value]) => value && !['sort', 'includeDeleted'].includes(key)).length;

  return `
    <div class="page">
      ${pageHead({
        title: '업체',
        desc: '등록된 모든 업체를 검색·필터하고 상세로 진입합니다.',
        actions: `
          <span class="filter-summary">전체 ${all.length}개 중 ${rows.length}개 표시${activeFilters ? ` · 필터 ${activeFilters}개 적용` : ''}</span>`,
      })}
      <div class="stack">
        ${companyListToolbar()}
        ${card({ flush: true, body: companyTable(rows) + tableFoot(`${rows.length}개 업체`, '행을 클릭하면 상세화면으로 이동합니다') })}
        <div class="row wrap small muted">
          ${['ACTIVE', 'TERMINATED', 'DELETED'].map((key) => `${badge(meta(COMPANY_STATUS, key))} ${all.filter((company) => company.status === key).length}개`).join(' &nbsp; ')}
          <span class="spacer"></span>
          <span>삭제업체는 관리 &gt; 삭제업체에서 확인합니다.</span>
        </div>
      </div>
    </div>`;
}
