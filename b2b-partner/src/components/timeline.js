/** 영업단계 timeline(수평) + 활동이력 timeline(수직). */
import { esc, list, cx } from '../utils/dom.js';
import { date as fmtDate, relativeDay } from '../utils/format.js';
import { SALES_STAGE, MEETING_STATUS, ACTIVITY_TYPE, meta } from '../data/constants.js';
import { badge } from './ui.js';

/** 영업 진행단계 — 단계 UI만 제공 (전환 로직 없음) */
export function stageFlow(company) {
  const pipeline = company.salesPipeline || [];
  return `<div class="stage-flow">${list(pipeline, (step, index) => {
    const stageMeta = meta(SALES_STAGE, step.stage);
    const isCurrent = company.salesStage === step.stage;
    const state = step.status === 'DONE' ? 'is-done' : isCurrent || step.status === 'PLANNED' ? 'is-current' : 'is-todo';
    return `
      <div class="${cx('stage-node', state)}">
        <div class="row">
          <span class="s-index">${index + 1}</span>
          <span class="s-name">${esc(stageMeta.label)}</span>
        </div>
        <div class="row" style="margin-top:6px">${badge(meta(MEETING_STATUS, step.status || 'NONE'))}</div>
        <div class="s-meta">
          <span>예정일 ${fmtDate(step.plannedAt)}</span>
          <span>완료일 ${fmtDate(step.completedAt)}</span>
          <span>담당자 ${step.owner ? esc(step.owner) : '—'}</span>
          <span>${step.memo ? esc(step.memo) : ''}</span>
        </div>
      </div>`;
  })}</div>`;
}

/** 활동이력 timeline */
export function activityTimeline(activities, { showCompany = false } = {}) {
  return `<div class="timeline">${list(activities, (activity) => `
    <div class="tl-item">
      <div class="tl-head">
        ${badge(meta(ACTIVITY_TYPE, activity.type))}
        <span class="tl-date">${fmtDate(activity.date)} ${esc(activity.time || '')}</span>
        <span class="small muted">${esc(activity.owner || '')}</span>
        ${showCompany && activity.company ? `<a class="small" href="#/companies/${activity.company.id}">${esc(activity.company.name)}</a>` : ''}
      </div>
      <div class="tl-body">${esc(activity.content)}</div>
      ${activity.followUp ? `<div class="tl-followup">후속조치 · ${esc(activity.followUp)}</div>` : ''}
    </div>`)}</div>`;
}

/** 미팅 예정 timeline */
export function meetingTimeline(rows) {
  return `<div class="timeline">${list(rows, (row) => `
    <div class="tl-item is-plan">
      <div class="tl-head">
        <span class="badge badge-blue">${esc(row.kindLabel)}</span>
        <span class="tl-date">${fmtDate(row.date)} ${esc(row.time || '')}</span>
        <span class="badge badge-outline">${esc(relativeDay(row.date))}</span>
      </div>
      <div class="tl-body">
        <a href="#/companies/${row.company.id}" class="strong">${esc(row.company.name)}</a>
        <span class="small muted"> · ${esc(row.place || '장소 미정')}</span>
      </div>
      <div class="small muted">내부 담당자 ${esc(row.owner || '—')}</div>
    </div>`)}</div>`;
}
