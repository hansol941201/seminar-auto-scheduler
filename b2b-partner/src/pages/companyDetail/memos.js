/** 업체 상세 > 메모 */
import { esc, list } from '../../utils/dom.js';
import { card, placeholderButton, emptyState, textareaField } from '../../components/ui.js';
import { date as fmtDate } from '../../utils/format.js';

export function memosTab(company) {
  const memos = (company.memos || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return `
    <div class="stack">
      ${card({
        title: '메모 작성',
        body: `
          ${textareaField({ name: 'newMemo', label: '내용', placeholder: '업체 관련 메모를 입력합니다. (저장 기능 미연결)' })}
          <div class="row" style="margin-top:10px">
            <label class="row small"><input type="checkbox" disabled> 중요표시</label>
            <span class="spacer"></span>
            ${placeholderButton('메모 저장', { variant: 'btn-primary' })}
          </div>`,
      })}
      ${card({
        title: '메모',
        subtitle: `${memos.length}건 · 최신순`,
        body: memos.length
          ? `<div class="stack-sm">${list(memos, (memo) => `
              <div class="memo ${memo.important ? 'is-pinned' : ''}">
                <div class="m-head">
                  <span class="small strong">${fmtDate(memo.createdAt)}</span>
                  <span class="small muted">${esc(memo.author)}</span>
                  ${memo.important ? '<span class="badge badge-amber">중요</span>' : ''}
                  <span class="spacer"></span>
                  ${placeholderButton('수정')}
                </div>
                <div>${esc(memo.content)}</div>
              </div>`)}</div>`
          : emptyState('메모가 없습니다'),
      })}
    </div>`;
}
