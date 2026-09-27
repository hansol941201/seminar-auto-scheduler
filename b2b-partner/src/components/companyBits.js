/** 업체 관련 공용 셀/요약 조각. */
import { esc } from '../utils/dom.js';
import {
  COMPANY_TYPE, COMPANY_STATUS, SALES_STAGE, MOU_STATUS, MEETING_STATUS, meta,
} from '../data/constants.js';
import { badge, codeChip } from './ui.js';
import { businessNumber as fmtBizNo, date as fmtDate, wonShort } from '../utils/format.js';
import { lastActivity, yearRevenue, performanceCount } from '../services/companyService.js';

export function companyNameCell(company) {
  return `
    <div class="col" style="gap:0">
      <span class="cell-main">${esc(company.name)}</span>
      <span class="cell-sub">${esc(company.region)} · ${esc(meta(COMPANY_TYPE, company.companyType).label)}</span>
    </div>`;
}

export function typeBadge(company) { return badge(meta(COMPANY_TYPE, company.companyType)); }
export function statusBadge(company) { return badge(meta(COMPANY_STATUS, company.status), { dot: true }); }
export function stageBadge(company) { return badge(meta(SALES_STAGE, company.salesStage)); }
export function mouBadge(company) { return badge(meta(MOU_STATUS, company.mou?.status || 'NONE')); }

export function meetingCell(meeting) {
  if (!meeting || !meeting.status || meeting.status === 'NONE') {
    return `<span class="muted">—</span>`;
  }
  return `
    <div class="col" style="gap:1px">
      ${badge(meta(MEETING_STATUS, meeting.status))}
      <span class="cell-sub">${fmtDate(meeting.plannedDate)}</span>
    </div>`;
}

export function lastActivityCell(company) {
  const activity = lastActivity(company);
  if (!activity) return '<span class="muted">—</span>';
  return `
    <div class="col" style="gap:1px">
      <span>${fmtDate(activity.date)}</span>
      <span class="cell-sub">${esc(activity.content.slice(0, 22))}${activity.content.length > 22 ? '…' : ''}</span>
    </div>`;
}

export function companyCodeCell(company) {
  return codeChip(company.companyCode);
}

export function bizNoCell(company) {
  return `<span class="mono small">${esc(fmtBizNo(company.businessNumber))}</span>`;
}

export function revenueCell(company) {
  const amount = yearRevenue(company);
  return amount ? `<span class="strong">${wonShort(amount)}</span>` : '<span class="muted">—</span>';
}

export function performanceCell(company) {
  const count = performanceCount(company);
  return count ? `${count}건` : '<span class="muted">—</span>';
}
