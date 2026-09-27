/**
 * 1차 / 2차 미팅 카드 — 업체 상세에서 바로 눈에 띄는 형태.
 * 완료는 진한 블루 배지, 예정은 연한 톤. (표시 전용 — 상태 전환 로직 없음)
 */
import { esc } from '../utils/dom.js';
import { MEETING_STATUS, meta } from '../data/constants.js';
import { date as fmtDate, relativeDay } from '../utils/format.js';
import { meetingBadge } from './companyBits.js';
import { placeholderButton } from './ui.js';

function row(label, value, { empty = '미입력' } = {}) {
  const filled = value !== undefined && value !== null && value !== '';
  return `
    <div class="mc-row">
      <span class="k">${esc(label)}</span>
      <span class="v ${filled ? '' : 'is-empty'}">${filled ? esc(value) : empty}</span>
    </div>`;
}

/**
 * @param {'FIRST'|'SECOND'} kind
 */
export function meetingCard(kind, meeting) {
  const isFirst = kind === 'FIRST';
  const title = isFirst ? '1차 미팅' : '2차 미팅';
  const status = meeting?.status || 'NONE';
  const state = status === 'DONE' ? 'is-done' : status === 'PLANNED' ? 'is-planned' : 'is-todo';

  if (status === 'NONE') {
    return `
      <div class="meeting-card is-todo">
        <div class="mc-head">
          <span class="mc-title">${title}</span>
          <span class="badge badge-todo">미진행</span>
          <span class="mc-actions">${placeholderButton('일정 등록')}</span>
        </div>
        <div class="mc-body">
          <div class="small muted">아직 등록된 일정이 없습니다.</div>
        </div>
      </div>`;
  }

  const dday = status === 'PLANNED' && meeting.plannedDate ? relativeDay(meeting.plannedDate) : '';
  const actions = isFirst
    ? ['일정 수정', '완료', '후속조치 등록']
    : ['일정 수정', '완료', 'MOU 진행'];

  const body = isFirst
    ? `
      ${row('예정일', `${fmtDate(meeting.plannedDate)} ${meeting.time || ''}`.trim())}
      ${row('담당자', [meeting.internalOwner, meeting.attendees].filter(Boolean).join(' / '))}
      ${row('장소', meeting.place)}
      ${row('미팅내용', meeting.content)}
      ${row('고객반응', meeting.customerReaction)}
      ${row('후속조치', meeting.followUp)}`
    : `
      ${row('예정일', `${fmtDate(meeting.plannedDate)} ${meeting.time || ''}`.trim())}
      ${row('담당자', [meeting.internalOwner, meeting.attendees].filter(Boolean).join(' / '))}
      ${row('장소', meeting.place)}
      ${row('협의내용', meeting.discussion)}
      ${row('MOU 협의', meeting.mouDiscussion, { empty: '미협의' })}
      ${row('후속조치', meeting.followUp)}`;

  return `
    <div class="meeting-card ${state}">
      <div class="mc-head">
        <span class="mc-title">${title}</span>
        ${meetingBadge(status)}
        <span class="mc-date">${fmtDate(meeting.plannedDate)}${dday ? ` · ${esc(dday)}` : ''}</span>
        <span class="mc-actions">${actions.map((label) => placeholderButton(label)).join('')}</span>
      </div>
      <div class="mc-body">${body}</div>
    </div>`;
}

export function meetingStatusLabel(status) {
  return meta(MEETING_STATUS, status || 'NONE').label;
}
