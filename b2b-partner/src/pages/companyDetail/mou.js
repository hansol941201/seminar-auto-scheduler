/** 업체 상세 > MOU */
import { esc, list } from '../../utils/dom.js';
import { card, readonlyField, badge, placeholderButton, emptyState, deflist } from '../../components/ui.js';
import { MOU_STATUS, meta } from '../../data/constants.js';
import { date as fmtDate } from '../../utils/format.js';

export function mouTab(company) {
  const mou = company.mou || { status: 'NONE' };
  const statusMeta = meta(MOU_STATUS, mou.status || 'NONE');
  const actionByStatus = {
    NONE: ['MOU 진행 시작'],
    PROGRESS: ['체결 처리', '초안 업로드'],
    SIGNED: ['협약 갱신', '협약 종료 처리'],
    ENDED: ['재협약 진행'],
  }[mou.status || 'NONE'] || [];

  return `
    <div class="stack">
      ${card({
        title: 'MOU',
        subtitle: '미체결 → 진행중 → 체결 → 종료',
        actions: `${badge(statusMeta)}${actionByStatus.map((label) => placeholderButton(label)).join('')}`,
        body: `
          <div class="ro-grid">
            ${readonlyField({ label: 'MOU 상태', value: statusMeta.label })}
            ${readonlyField({ label: 'MOU 체결일', value: fmtDate(mou.signedDate) })}
            ${readonlyField({ label: '협약기간', value: mou.periodFrom ? `${fmtDate(mou.periodFrom)} ~ ${fmtDate(mou.periodTo)}` : '' })}
            ${readonlyField({ label: '담당자', value: mou.owner })}
            ${readonlyField({ label: '관련 특허번호', value: (mou.patentNumbers || []).join(', '), span: true })}
            ${readonlyField({ label: '관련 현장', value: (mou.relatedSites || []).join(', '), span: true })}
            ${readonlyField({ label: '비고', value: mou.note, span: true })}
          </div>`,
      })}
      ${card({
        title: '관련문서',
        actions: placeholderButton('문서 업로드'),
        body: (mou.documents || []).length
          ? `<ul class="stack-sm">${list(mou.documents, (name) => `
              <li class="row-between" style="border:1px solid var(--line-200);border-radius:var(--r-md);padding:8px 12px">
                <span>📄 ${esc(name)}</span>
                ${placeholderButton('다운로드')}
              </li>`)}</ul>`
          : emptyState('등록된 관련문서가 없습니다'),
      })}
      ${card({
        title: '상태 전환 규칙',
        body: deflist([
          ['미체결', '2차 미팅 완료 전 기본 상태'],
          ['진행중', 'MOU 초안 발송 ~ 검토 단계'],
          ['체결', '체결일·협약기간 확정 시'],
          ['종료', '협약기간 만료 또는 중도 종료 시 (업체 상태는 협약종료로 전환)'],
        ]),
        foot: '전환 처리는 다음 단계에서 연결합니다.',
      })}
    </div>`;
}
