/** 시공실적 — 전 업체 통합 목록. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, barList, placeholderButton } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { performanceRows, performanceYears } from '../services/performanceService.js';
import { sitesByRegion } from '../services/analyticsService.js';
import { PERFORMANCE_STATUS, WORK_TYPES, REGIONS, meta } from '../data/constants.js';
import { num } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

export function performancePage() {
  const filter = uiState.performanceFilter;
  const rows = performanceRows(filter);
  const all = performanceRows({});
  const years = performanceYears();
  const byWorkType = WORK_TYPES
    .map((workType) => ({ label: workType, value: all.filter((row) => row.workType === workType).length }))
    .filter((row) => row.value > 0);

  return `
    <div class="page">
      ${pageHead({
        title: '시공실적',
        desc: '업체별 현장 실적을 통합 조회합니다.',
        actions: `${placeholderButton('실적 등록')}${placeholderButton('Excel 업로드')}`,
      })}

      <div class="stack">
        <div class="grid grid-kpi">
          ${kpi({ label: '총 실적 건수', value: num(all.length), unit: '건', accent: 'navy' })}
          ${['COMPLETED', 'ONGOING', 'PLANNED'].map((key) => kpi({
            label: meta(PERFORMANCE_STATUS, key).label,
            value: num(all.filter((row) => row.status === key).length),
            unit: '건',
            accent: key === 'COMPLETED' ? 'green' : key === 'ONGOING' ? 'blue' : 'amber',
          })).join('')}
          ${kpi({ label: '적용 업체 수', value: num(new Set(all.map((row) => row.company.id)).size), unit: '개', accent: 'violet' })}
        </div>

        <div class="toolbar">
          <span class="small muted">연도</span>
          <div class="btn-group">
            <button type="button" class="btn btn-sm ${filter.year ? '' : 'is-active'}" data-action="perfYear" data-year="">전체</button>
            ${years.map((year) => `<button type="button" class="btn btn-sm ${filter.year === year ? 'is-active' : ''}" data-action="perfYear" data-year="${year}">${year}</button>`).join('')}
          </div>
          <span class="sep"></span>
          <select class="select" data-filter="perfRegion" title="지역">
            <option value="">지역 전체</option>
            ${REGIONS.map((region) => `<option value="${esc(region)}" ${filter.region === region ? 'selected' : ''}>${esc(region)}</option>`).join('')}
          </select>
          <select class="select" data-filter="perfWorkType" title="공종">
            <option value="">공종 전체</option>
            ${WORK_TYPES.map((workType) => `<option value="${esc(workType)}" ${filter.workType === workType ? 'selected' : ''}>${esc(workType)}</option>`).join('')}
          </select>
          <select class="select" data-filter="perfStatus" title="상태">
            <option value="">상태 전체</option>
            ${Object.values(PERFORMANCE_STATUS).map((statusMeta) => `<option value="${statusMeta.key}" ${filter.status === statusMeta.key ? 'selected' : ''}>${esc(statusMeta.label)}</option>`).join('')}
          </select>
          <span class="spacer"></span>
          <span class="filter-summary">${rows.length}건 표시</span>
        </div>

        <div class="grid grid-2">
          ${card({ title: '공종별 분포', body: barList(byWorkType, { formatter: (value) => `${value}건` }) })}
          ${card({ title: '지역별 현장 분포', body: barList(sitesByRegion().map((row) => ({ label: row.region, value: row.count })), { formatter: (value) => `${value}건` }) })}
        </div>

        ${card({
          title: '실적 목록',
          subtitle: `${rows.length}건`,
          flush: true,
          body: dataTable({
            compact: true,
            rowAction: 'openCompanyTab',
            rowDataset: (row) => ({ id: row.company.id, tab: 'performance' }),
            emptyTitle: '조건에 맞는 실적이 없습니다',
            columns: [
              { key: 'siteName', label: '현장명', render: (row) => `<span class="cell-main">${esc(row.siteName)}</span>` },
              { key: 'company', label: '업체명', render: (row) => esc(row.company.name) },
              { key: 'code', label: '업체코드', width: '96px', render: (row) => `<span class="mono small">${esc(row.company.companyCode)}</span>` },
              { key: 'region', label: '지역', width: '72px', render: (row) => esc(row.region) },
              { key: 'workType', label: '공종', width: '96px', render: (row) => `<span class="badge badge-outline">${esc(row.workType)}</span>` },
              { key: 'patentNumber', label: '특허번호', width: '116px', render: (row) => (row.patentNumber ? `<span class="mono small">${esc(row.patentNumber)}</span>` : '<span class="muted">—</span>') },
              { key: 'year', label: '공사연도', width: '84px', align: 'right', render: (row) => row.year },
              { key: 'status', label: '상태', width: '84px', render: (row) => badge(meta(PERFORMANCE_STATUS, row.status)) },
              { key: 'note', label: '비고', render: (row) => esc(row.note || '—') },
            ],
            rows,
          }),
        })}
      </div>
    </div>`;
}
