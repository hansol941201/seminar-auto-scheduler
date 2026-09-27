/** 매출 — 연도별 KPI + 거래내역 표 중심. 차트는 최소한으로. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, barList, placeholderButton } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import {
  totalsByYear, totalsByType, revenueRows, revenueRanking, unpaidRows,
} from '../services/revenueService.js';
import { getListCompanies } from '../services/companyService.js';
import { REVENUE_YEARS, REVENUE_TYPE, REVENUE_STATUS, meta } from '../data/constants.js';
import { won, wonShort, date as fmtDate, percent } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

export function revenuePage() {
  const year = uiState.revenueYear;
  const companyId = uiState.revenueCompanyId;
  const totals = totalsByYear();
  const yearTotal = totals.find((total) => total.year === year)?.amount || 0;
  const previousTotal = totals.find((total) => total.year === year - 1)?.amount || 0;
  const rows = revenueRows({ year, companyId: companyId || null });
  const types = totalsByType(year);
  const ranking = revenueRanking(year, 8);
  const unpaid = unpaidRows(year);
  const companies = getListCompanies();

  return `
    <div class="page">
      ${pageHead({
        title: '매출',
        desc: '연도별 매출과 거래내역을 확인합니다.',
        actions: `${placeholderButton('매출 등록')}<a class="btn btn-primary" href="#/revenue/upload">Excel 업로드</a>`,
      })}

      <div class="stack">
        <div class="grid grid-kpi">
          ${totals.map((total) => kpi({
            label: `${total.year} 매출`,
            value: wonShort(total.amount),
            foot: total.year === year ? '선택 연도' : '',
            accent: total.year === year ? 'blue' : '',
          })).join('')}
          ${kpi({ label: '전년 대비', value: previousTotal ? percent((yearTotal - previousTotal) / previousTotal, 1) : '—', foot: `${year - 1} → ${year}` })}
          ${kpi({ label: '미수', value: unpaid.length, unit: '건', foot: wonShort(unpaid.reduce((sum, row) => sum + row.amount, 0)) })}
        </div>

        <div class="toolbar">
          <span class="small muted">연도</span>
          <div class="btn-group">
            ${REVENUE_YEARS.map((option) => `
              <button type="button" class="btn btn-sm ${option === year ? 'is-active' : ''}" data-action="revenueYear" data-year="${option}">${option}</button>`).join('')}
          </div>
          <span class="sep"></span>
          <label class="sr-only" for="rev-company">업체</label>
          <select class="select" id="rev-company" data-filter="revenueCompany">
            <option value="">전체 업체</option>
            ${companies.map((company) => `<option value="${company.id}" ${company.id === companyId ? 'selected' : ''}>${esc(company.name)}</option>`).join('')}
          </select>
          <span class="spacer"></span>
          <span class="filter-summary">${rows.length}건 · ${won(rows.reduce((sum, row) => sum + row.amount, 0))}</span>
          ${placeholderButton('Excel 내보내기')}
        </div>

        <div class="grid grid-2-1">
          ${card({
            title: '거래내역',
            subtitle: `${year}년 · ${rows.length}건`,
            flush: true,
            body: dataTable({
              compact: true,
              emptyTitle: '해당 조건의 거래내역이 없습니다',
              rowAction: 'openCompanyTab',
              rowDataset: (row) => ({ id: row.company.id, tab: 'revenue' }),
              columns: [
                { key: 'issuedAt', label: '발행일', width: '96px', render: (row) => fmtDate(row.issuedAt) },
                { key: 'company', label: '업체명', render: (row) => `<span class="cell-main">${esc(row.company.name)}</span>` },
                { key: 'siteName', label: '현장명', render: (row) => esc(row.siteName) },
                { key: 'type', label: '매출유형', width: '96px', render: (row) => badge(meta(REVENUE_TYPE, row.type)) },
                { key: 'amount', label: '금액', width: '128px', align: 'right', render: (row) => `<span class="strong">${won(row.amount)}</span>` },
                { key: 'status', label: '상태', width: '82px', render: (row) => badge(meta(REVENUE_STATUS, row.status)) },
              ],
              rows,
              footer: `<tr><td colspan="4">합계 ${rows.length}건</td><td class="num">${won(rows.reduce((sum, row) => sum + row.amount, 0))}</td><td></td></tr>`,
            }),
          })}

          <div class="stack">
            ${card({
              title: `${year} 매출유형`,
              body: types.length
                ? barList(types.map((type) => ({ label: meta(REVENUE_TYPE, type.type).label, value: type.amount })), { formatter: wonShort })
                : '<div class="small muted">해당 연도 매출이 없습니다.</div>',
            })}
            ${card({
              title: `${year} 업체 순위`,
              body: ranking.length
                ? barList(ranking.map((row) => ({ label: row.company.name, value: row.amount })), { formatter: wonShort })
                : '<div class="small muted">해당 연도 매출이 없습니다.</div>',
            })}
          </div>
        </div>
      </div>
    </div>`;
}
