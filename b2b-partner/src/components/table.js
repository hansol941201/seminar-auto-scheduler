/**
 * 데이터 테이블 컴포넌트.
 * columns: [{ key, label, align, width, render(row), className }]
 */
import { esc, cx, list } from '../utils/dom.js';
import { emptyState } from './ui.js';

export function dataTable({
  columns, rows, rowKey = (row, index) => index,
  rowAction = null,        // 클릭 시 위임할 data-action 이름
  rowDataset = null,       // (row) => ({ key: value }) — data-* 속성
  rowClass = null,
  footer = '',
  compact = false,
  emptyTitle = '데이터가 없습니다',
  emptyDesc = '',
}) {
  if (!rows.length) return emptyState(emptyTitle, emptyDesc);

  const head = columns.map((column) => `
    <th class="${cx(column.align === 'right' && 'num', column.align === 'center' && 'center')}"
        ${column.width ? `style="width:${column.width}"` : ''}>${esc(column.label)}</th>`).join('');

  const body = list(rows, (row, index) => {
    const dataset = rowDataset ? rowDataset(row) : {};
    const attrs = Object.entries(dataset).map(([key, value]) => `data-${key}="${esc(value)}"`).join(' ');
    return `
      <tr class="${cx(rowAction && 'is-clickable', rowClass && rowClass(row))}"
          ${rowAction ? `data-action="${esc(rowAction)}"` : ''} ${attrs} data-key="${esc(rowKey(row, index))}">
        ${columns.map((column) => `
          <td class="${cx(column.align === 'right' && 'num', column.align === 'center' && 'center', column.className)}">
            ${column.render(row, index)}
          </td>`).join('')}
      </tr>`;
  });

  return `
    <div class="table-wrap">
      <table class="${cx('table', compact && 'compact')}">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        ${footer ? `<tfoot>${footer}</tfoot>` : ''}
      </table>
    </div>`;
}

export function tableFoot(text, right = '') {
  return `<div class="table-foot"><span>${text}</span><span class="spacer"></span><span>${right}</span></div>`;
}
