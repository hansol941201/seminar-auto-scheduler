/** 업체 상세 > 미팅 — 1차/2차 미팅을 각각 독립된 데이터 구조로 표시 */
import { card, readonlyField, badge, placeholderButton, emptyState, notice } from '../../components/ui.js';
import { MEETING_STATUS, meta } from '../../data/constants.js';
import { date as fmtDate, relativeDay } from '../../utils/format.js';
import { esc } from '../../utils/dom.js';

function meetingHeader(meeting) {
  const statusMeta = meta(MEETING_STATUS, meeting.status || 'NONE');
  const dday = meeting.status === 'PLANNED' && meeting.plannedDate ? relativeDay(meeting.plannedDate) : '';
  return `${badge(statusMeta)}${dday ? ` <span class="badge badge-outline">${esc(dday)}</span>` : ''}`;
}

function firstMeetingCard(meeting) {
  if (!meeting || meeting.status === 'NONE') {
    return card({
      title: '1차 미팅',
      actions: placeholderButton('일정 등록', { variant: 'btn-primary' }),
      body: emptyState('1차 미팅이 아직 등록되지 않았습니다', '일정을 등록하면 상세 항목이 표시됩니다.'),
    });
  }
  return card({
    title: '1차 미팅',
    subtitle: `${fmtDate(meeting.plannedDate)} ${esc(meeting.time || '')}`,
    actions: `
      ${meetingHeader(meeting)}
      ${placeholderButton('일정 수정')}
      ${placeholderButton('완료')}
      ${placeholderButton('후속조치 등록')}`,
    body: `
      <div class="ro-grid">
        ${readonlyField({ label: '예정일', value: fmtDate(meeting.plannedDate) })}
        ${readonlyField({ label: '시간', value: meeting.time })}
        ${readonlyField({ label: '장소', value: meeting.place })}
        ${readonlyField({ label: '참석자', value: meeting.attendees })}
        ${readonlyField({ label: '내부 담당자', value: meeting.internalOwner })}
        ${readonlyField({ label: '상태', value: meta(MEETING_STATUS, meeting.status).label })}
        ${readonlyField({ label: '미팅 내용', value: meeting.content, span: true })}
        ${readonlyField({ label: '고객 반응', value: meeting.customerReaction, span: true })}
        ${readonlyField({ label: '요청사항', value: meeting.requests, span: true })}
        ${readonlyField({ label: '특이사항', value: meeting.remarks, span: true })}
        ${readonlyField({ label: '후속조치', value: meeting.followUp, span: true })}
        ${readonlyField({ label: '다음 일정', value: fmtDate(meeting.nextSchedule) })}
        ${readonlyField({ label: '내부 메모', value: meeting.internalMemo, span: true })}
      </div>`,
  });
}

function secondMeetingCard(meeting) {
  if (!meeting || meeting.status === 'NONE') {
    return card({
      title: '2차 미팅',
      actions: placeholderButton('일정 등록', { variant: 'btn-primary' }),
      body: emptyState('2차 미팅이 아직 등록되지 않았습니다', '1차 미팅 완료 후 진행합니다.'),
    });
  }
  return card({
    title: '2차 미팅',
    subtitle: `${fmtDate(meeting.plannedDate)} ${esc(meeting.time || '')}`,
    actions: `
      ${meetingHeader(meeting)}
      ${placeholderButton('일정 수정')}
      ${placeholderButton('완료')}
      ${placeholderButton('MOU 진행')}`,
    body: `
      <div class="ro-grid">
        ${readonlyField({ label: '예정일', value: fmtDate(meeting.plannedDate) })}
        ${readonlyField({ label: '시간', value: meeting.time })}
        ${readonlyField({ label: '장소', value: meeting.place })}
        ${readonlyField({ label: '참석자', value: meeting.attendees })}
        ${readonlyField({ label: '내부 담당자', value: meeting.internalOwner })}
        ${readonlyField({ label: '상태', value: meta(MEETING_STATUS, meeting.status).label })}
        ${readonlyField({ label: '협의내용', value: meeting.discussion, span: true })}
        ${readonlyField({ label: '요청자료', value: meeting.requestedDocs, span: true })}
        ${readonlyField({ label: '고객 의견', value: meeting.customerOpinion, span: true })}
        ${readonlyField({ label: 'MOU 협의내용', value: meeting.mouDiscussion, span: true })}
        ${readonlyField({ label: '후속조치', value: meeting.followUp, span: true })}
        ${readonlyField({ label: '내부 메모', value: meeting.internalMemo, span: true })}
      </div>`,
  });
}

export function meetingsTab(company) {
  return `
    <div class="stack">
      ${firstMeetingCard(company.firstMeeting)}
      ${secondMeetingCard(company.secondMeeting)}
      ${notice('1차·2차 미팅은 서로 다른 필드 집합을 가진 독립 데이터로 관리됩니다. (firstMeeting / secondMeeting)', 'info')}
    </div>`;
}
