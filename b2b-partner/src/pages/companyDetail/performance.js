/** 업체 상세 > 시공실적 */
import { esc } from '../../utils/dom.js';
import { card, badge, placeholderButton, kpi } from '../../components/ui.js';
import { dataTable } from '../../components/table.js';
import { PERFORMANCE_STATUS, meta } from '../../data/constants.js';
import { num } from '../../utils/format.js';

export function performanceTab(company) {
  const rows = (company.performances || []).slice().sort((a, b) => b.year - a.year);
  const byStatus = (key) => rows.filter((row) => row.status === key).length;

  return `
    <div class="stack">
      <div class="grid grid-kpi">
        ${kpi({ label: '총 실적 건수', value: num(rows.length), unit: '건', accent: 'navy' })}
        ${kpi({ label: '준공', value: num(byStatus('COMPLETED')), unit: '건', accent: 'green' })}
        ${kpi({ label: '진행중', value: num(byStatus('ONGOING')), unit: '건', accent: 'blue' })}
        ${kpi({ label: '예정', value: num(byStatus('PLANNED')), unit: '건', accent: 'amber' })}
      </div>
      ${card({
        title: '시공실적',
        subtitle: `${rows.length}건`,
        actions: `${placeholderButton('실적 등록', { variant: 'btn-primary' })}${placeholderButton('Excel 업로드')}`,
        flush: true,
        body: dataTable({
          emptyTitle: '등록된 시공실적이 없습니다',
          columns: [
            { key: 'siteName', label: '현장명', render: (row) => `<span class="cell-main">${esc(row.siteName)}</span>` },
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
    </div>`;
}
