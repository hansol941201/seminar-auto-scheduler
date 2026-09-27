/** 업체 상세 > 매출 */
import { esc } from '../../utils/dom.js';
import { card, kpi, badge, placeholderButton, sparkColumns } from '../../components/ui.js';
import { dataTable } from '../../components/table.js';
import { REVENUE_YEARS, REVENUE_TYPE, REVENUE_STATUS, CURRENT_YEAR, meta } from '../../data/constants.js';
import { won, wonShort, date as fmtDate } from '../../utils/format.js';
import { companyTotalsByYear } from '../../services/revenueService.js';

export function revenueTab(company) {
  const totals = companyTotalsByYear(company);
  const rows = (company.revenues || []).slice().sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
  const sum = rows.reduce((acc, row) => acc + row.amount, 0);

  return `
    <div class="stack">
      <div class="grid grid-kpi">
        ${totals.map((total) => kpi({
          label: `${total.year} 매출`,
          value: wonShort(total.amount),
          foot: total.year === CURRENT_YEAR ? '진행 연도' : '',
          accent: total.year === CURRENT_YEAR ? 'blue' : '',
        })).join('')}
        ${kpi({ label: '전체 누적', value: wonShort(sum), accent: 'navy' })}
      </div>
      ${card({
        title: '연도별 추이',
        subtitle: REVENUE_YEARS.join(' · '),
        body: sparkColumns(totals, CURRENT_YEAR),
      })}
      ${card({
        title: '거래내역',
        subtitle: `${rows.length}건`,
        actions: `${placeholderButton('매출 등록')}<a class="btn btn-sm" href="#/revenue/upload">Excel 업로드</a>`,
        flush: true,
        body: dataTable({
          emptyTitle: '등록된 매출이 없습니다',
          columns: [
            { key: 'issuedAt', label: '발행일', width: '104px', render: (row) => fmtDate(row.issuedAt) },
            { key: 'year', label: '연도', width: '64px', align: 'right', render: (row) => row.year },
            { key: 'siteName', label: '현장명', render: (row) => esc(row.siteName) },
            { key: 'type', label: '매출유형', width: '104px', render: (row) => badge(meta(REVENUE_TYPE, row.type)) },
            { key: 'amount', label: '금액', width: '132px', align: 'right', render: (row) => won(row.amount) },
            { key: 'status', label: '상태', width: '88px', render: (row) => badge(meta(REVENUE_STATUS, row.status)) },
          ],
          rows,
          footer: `<tr><td colspan="4">합계</td><td class="num">${won(sum)}</td><td></td></tr>`,
        }),
      })}
    </div>`;
}
