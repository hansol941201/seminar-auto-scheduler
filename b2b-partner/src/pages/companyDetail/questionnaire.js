/** 업체 상세 > 질문지 */
import { esc, list } from '../../utils/dom.js';
import { card, badge, placeholderButton, emptyState, deflist } from '../../components/ui.js';
import { QUESTIONNAIRE_STATUS, meta } from '../../data/constants.js';
import { date as fmtDate } from '../../utils/format.js';

export function questionnaireTab(company) {
  const questionnaire = company.questionnaire || { status: 'NOT_SENT', items: [] };
  const statusMeta = meta(QUESTIONNAIRE_STATUS, questionnaire.status);
  const items = questionnaire.items || [];

  return `
    <div class="stack">
      ${card({
        title: '질문지',
        subtitle: '미발송 → 발송 → 회신대기 → 회신완료',
        actions: `
          ${badge(statusMeta)}
          ${placeholderButton('질문지 발송')}
          ${placeholderButton('회신 등록')}`,
        body: deflist([
          ['상태', badge(statusMeta)],
          ['발송일', fmtDate(questionnaire.sentAt)],
          ['회신일', fmtDate(questionnaire.repliedAt)],
          ['담당자', esc(questionnaire.owner || '—')],
          ['문항 수', `${items.length}개`],
        ], { twoCol: true }),
      })}
      ${card({
        title: '질문 / 답변',
        body: items.length
          ? list(items, (item) => `
              <div class="qa">
                <div class="q">Q. ${esc(item.q)}</div>
                <div class="a ${item.a ? '' : 'is-empty'}">${item.a ? `A. ${esc(item.a)}` : '회신 대기'}</div>
              </div>`)
          : emptyState('등록된 문항이 없습니다', '질문지 템플릿은 관리 메뉴에서 정의할 예정입니다.'),
      })}
    </div>`;
}
