/** 업체 상세 > 문서 */
import { esc } from '../../utils/dom.js';
import { card, placeholderButton } from '../../components/ui.js';
import { dataTable } from '../../components/table.js';
import { date as fmtDate } from '../../utils/format.js';

export function documentsTab(company) {
  const rows = (company.documents || []).slice().sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return `
    <div class="stack">
      ${card({
        title: '문서',
        subtitle: `${rows.length}건`,
        actions: placeholderButton('문서 업로드', { variant: 'btn-primary' }),
        flush: true,
        body: dataTable({
          emptyTitle: '등록된 문서가 없습니다',
          emptyDesc: 'MOU·사업자등록증·실적 자료 등을 이 영역에서 관리합니다.',
          columns: [
            { key: 'name', label: '파일명', render: (row) => `📄 ${esc(row.name)}` },
            { key: 'category', label: '분류', width: '96px', render: (row) => `<span class="badge badge-outline">${esc(row.category)}</span>` },
            { key: 'size', label: '크기', width: '80px', align: 'right', render: (row) => esc(row.size) },
            { key: 'uploadedAt', label: '등록일', width: '104px', render: (row) => fmtDate(row.uploadedAt) },
            { key: 'uploader', label: '등록자', width: '88px', render: (row) => esc(row.uploader) },
            { key: 'actions', label: '', width: '96px', render: () => placeholderButton('다운로드') },
          ],
          rows,
        }),
      })}
    </div>`;
}
