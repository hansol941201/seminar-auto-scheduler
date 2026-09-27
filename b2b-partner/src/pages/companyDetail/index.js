/**
 * 업체 상세화면 — 상단 요약 + 10개 서브 탭.
 * 서브 탭은 아래 DETAIL_TABS 배열에 항목을 추가하면 확장된다.
 */
import { esc, cx } from '../../utils/dom.js';
import { badge, codeChip, placeholderButton, emptyState, deflist } from '../../components/ui.js';
import {
  COMPANY_TYPE, COMPANY_STATUS, MOU_STATUS, SALES_STAGE, CURRENT_YEAR, meta,
} from '../../data/constants.js';
import { businessNumber as fmtBizNo, date as fmtDate, wonShort, relativeDay } from '../../utils/format.js';
import {
  getCompanyById, yearRevenue, performanceCount, lastActivity, upcomingMeeting,
} from '../../services/companyService.js';
import { uiState } from '../../services/uiState.js';

import { basicTab } from './basic.js';
import { salesTab } from './salesProgress.js';
import { meetingsTab } from './meetings.js';
import { mouTab } from './mou.js';
import { activitiesTab } from './activities.js';
import { memosTab } from './memos.js';
import { questionnaireTab } from './questionnaire.js';
import { performanceTab } from './performance.js';
import { revenueTab } from './revenue.js';
import { documentsTab } from './documents.js';

export const DETAIL_TABS = [
  { key: 'basic', label: '기본정보', render: basicTab },
  { key: 'sales', label: '영업진행', render: salesTab },
  { key: 'meetings', label: '미팅', render: meetingsTab, count: (c) => [c.firstMeeting, c.secondMeeting].filter((m) => m && m.status !== 'NONE').length },
  { key: 'mou', label: 'MOU', render: mouTab },
  { key: 'activities', label: '활동이력', render: activitiesTab, count: (c) => (c.activities || []).length },
  { key: 'memos', label: '메모', render: memosTab, count: (c) => (c.memos || []).length },
  { key: 'questionnaire', label: '질문지', render: questionnaireTab },
  { key: 'performance', label: '시공실적', render: performanceTab, count: (c) => (c.performances || []).length },
  { key: 'revenue', label: '매출', render: revenueTab, count: (c) => (c.revenues || []).length },
  { key: 'documents', label: '문서', render: documentsTab, count: (c) => (c.documents || []).length },
];

function detailHeader(company) {
  const meeting = upcomingMeeting(company);
  const activity = lastActivity(company);

  return `
    <div class="detail-head">
      <div class="row-between">
        <div class="col" style="gap:6px">
          <div class="breadcrumb"><a href="#/companies">업체</a> <span>›</span> <span>${esc(company.name)}</span></div>
          <div class="detail-title">
            <h1>${esc(company.name)}</h1>
            ${codeChip(company.companyCode)}
            ${badge(meta(COMPANY_TYPE, company.companyType))}
            ${badge(meta(COMPANY_STATUS, company.status), { dot: true })}
            ${badge(meta(MOU_STATUS, company.mou?.status || 'NONE'))}
          </div>
        </div>
        <div class="actions row wrap">
          ${placeholderButton('정보 수정')}
          ${placeholderButton('활동 등록')}
          ${placeholderButton('삭제', { variant: 'btn-danger' })}
        </div>
      </div>

      <div style="margin-top:12px">
        ${deflist([
          ['대표자', esc(company.representative || '—')],
          ['담당자', esc(company.contactName || '—')],
          ['연락처', `${esc(company.phone || '—')}${company.email ? ` · <a href="mailto:${esc(company.email)}">${esc(company.email)}</a>` : ''}`],
          ['사업자번호', `<span class="mono">${esc(fmtBizNo(company.businessNumber))}</span>`],
          ['주소', `${esc(company.address || '—')} <span class="badge badge-outline">${esc(company.region)}</span>`],
          ['MOU 상태', `${badge(meta(MOU_STATUS, company.mou?.status || 'NONE'))}${company.mou?.signedDate ? ` <span class="small muted">체결 ${fmtDate(company.mou.signedDate)}</span>` : ''}`],
        ], { twoCol: true })}
      </div>

      <div class="detail-summary">
        <div class="ds-cell">
          <div class="ds-label">최근 활동</div>
          <div class="ds-value">${activity ? fmtDate(activity.date) : '—'}</div>
          <div class="xs muted">${activity ? esc(activity.content.slice(0, 18)) : '기록 없음'}</div>
        </div>
        <div class="ds-cell">
          <div class="ds-label">${CURRENT_YEAR} 매출</div>
          <div class="ds-value">${wonShort(yearRevenue(company))}</div>
          <div class="xs muted">전체 ${(company.revenues || []).length}건</div>
        </div>
        <div class="ds-cell">
          <div class="ds-label">시공실적</div>
          <div class="ds-value">${performanceCount(company)}건</div>
          <div class="xs muted">누적 기준</div>
        </div>
        <div class="ds-cell">
          <div class="ds-label">영업단계</div>
          <div class="ds-value" style="font-size:var(--fs-md)">${badge(meta(SALES_STAGE, company.salesStage))}</div>
          <div class="xs muted">6단계 중 ${['NEW_CONTACT', 'CONSULTING', 'FIRST_MEETING', 'SECOND_MEETING', 'MOU_PROGRESS', 'MOU_SIGNED'].indexOf(company.salesStage) + 1}단계</div>
        </div>
        <div class="ds-cell">
          <div class="ds-label">최근 미팅</div>
          <div class="ds-value" style="font-size:var(--fs-md)">
            ${meeting ? `${esc(meeting.label)} ${fmtDate(meeting.plannedDate)}` : (company.secondMeeting?.status === 'DONE' ? `2차 완료 ${fmtDate(company.secondMeeting.plannedDate)}` : (company.firstMeeting?.status === 'DONE' ? `1차 완료 ${fmtDate(company.firstMeeting.plannedDate)}` : '—'))}
          </div>
          <div class="xs muted">${meeting ? esc(relativeDay(meeting.plannedDate)) : '예정 없음'}</div>
        </div>
      </div>
    </div>`;
}

function subTabs(company, activeKey) {
  return `
    <div class="subtabs">
      ${DETAIL_TABS.map((tab) => {
        const count = tab.count ? tab.count(company) : null;
        return `
          <button type="button" class="${cx('subtab', tab.key === activeKey && 'is-active')}"
                  data-action="detailTab" data-tab="${tab.key}">
            ${esc(tab.label)}${count ? `<span class="badge badge-outline">${count}</span>` : ''}
          </button>`;
      }).join('')}
    </div>`;
}

export function companyDetailPage(companyId) {
  const company = getCompanyById(companyId);
  if (!company) {
    return `<div class="page">${emptyState('업체를 찾을 수 없습니다', `요청한 식별자: ${companyId}`, '<a class="btn btn-primary" href="#/companies">업체 목록으로</a>')}</div>`;
  }

  const activeKey = DETAIL_TABS.some((tab) => tab.key === uiState.companyDetailTab)
    ? uiState.companyDetailTab : 'basic';
  const activeTab = DETAIL_TABS.find((tab) => tab.key === activeKey);

  return `
    <div class="page">
      <div class="stack">
        ${detailHeader(company)}
        <div>
          ${subTabs(company, activeKey)}
          <div style="padding-top:16px">${activeTab.render(company)}</div>
        </div>
      </div>
    </div>`;
}
