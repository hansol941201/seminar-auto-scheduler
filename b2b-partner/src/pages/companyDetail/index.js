/**
 * 업체 상세화면 — 한 화면에서 최대한 많은 정보를 보는 구조.
 *   상단  : 업체 기본 식별정보 + 요약 지표
 *   본문  : 3열 (기본정보·최근활동 / 미팅·MOU / 매출·실적·메모)
 *   하단  : 세부 탭 10종
 * 서브 탭은 DETAIL_TABS 배열에 항목을 추가하면 확장된다.
 */
import { esc, cx } from '../../utils/dom.js';
import { card, badge, codeChip, placeholderButton, emptyState, deflist } from '../../components/ui.js';
import { dataTable } from '../../components/table.js';
import { activityTimeline } from '../../components/timeline.js';
import { meetingCard } from '../../components/meetingCard.js';
import {
  COMPANY_TYPE, COMPANY_STATUS, MOU_STATUS, SALES_STAGE, SALES_STAGE_ORDER,
  PERFORMANCE_STATUS, REVENUE_TYPE, CURRENT_YEAR, meta,
} from '../../data/constants.js';
import {
  businessNumber as fmtBizNo, date as fmtDate, wonShort, won, relativeDay,
} from '../../utils/format.js';
import {
  getCompanyById, yearRevenue, performanceCount, lastActivity, upcomingMeeting,
} from '../../services/companyService.js';
import { companyTotalsByYear } from '../../services/revenueService.js';
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

/* ------------------------------ 상단 ------------------------------ */

function metaItem(label, value) {
  return `<span class="dm"><span class="dm-k">${esc(label)}</span>${value}</span>`;
}

function detailHeader(company) {
  const meeting = upcomingMeeting(company);
  const activity = lastActivity(company);
  const stageNumber = SALES_STAGE_ORDER.indexOf(company.salesStage) + 1;

  return `
    <div class="detail-head">
      <div>
        <div class="breadcrumb"><a href="#/companies">업체</a> <span>›</span> <span>${esc(company.name)}</span></div>
        <div class="detail-title">
          <h1>${esc(company.name)}</h1>
          ${codeChip(company.companyCode)}
          ${badge(meta(COMPANY_TYPE, company.companyType))}
          ${badge(meta(COMPANY_STATUS, company.status), { dot: true })}
        </div>
        <div class="detail-meta">
          ${metaItem('대표자', esc(company.representative || '—'))}
          ${metaItem('담당자', esc(company.contactName || '—'))}
          ${metaItem('연락처', `${esc(company.phone || '—')}${company.email ? ` · <a href="mailto:${esc(company.email)}">${esc(company.email)}</a>` : ''}`)}
          ${metaItem('사업자번호', `<span class="mono">${esc(fmtBizNo(company.businessNumber))}</span>`)}
          ${metaItem('주소', `${esc(company.address || '—')}`)}
          ${metaItem('MOU', `${badge(meta(MOU_STATUS, company.mou?.status || 'NONE'))}${company.mou?.signedDate ? ` <span class="xs muted">체결 ${fmtDate(company.mou.signedDate)}</span>` : ''}`)}
        </div>
      </div>

      <div class="col" style="gap:10px;align-items:flex-end">
        <div class="row">
          ${placeholderButton('정보 수정')}
          ${placeholderButton('활동 등록')}
          ${placeholderButton('삭제', { variant: 'btn-danger' })}
        </div>
        <div class="detail-summary">
          <div class="ds-cell">
            <div class="ds-label">최근활동</div>
            <div class="ds-value">${activity ? fmtDate(activity.date) : '—'}</div>
            <div class="xs">${activity ? esc(activity.content.slice(0, 12)) : '기록 없음'}</div>
          </div>
          <div class="ds-cell">
            <div class="ds-label">${CURRENT_YEAR} 매출</div>
            <div class="ds-value">${wonShort(yearRevenue(company))}</div>
            <div class="xs">전체 ${(company.revenues || []).length}건</div>
          </div>
          <div class="ds-cell">
            <div class="ds-label">시공실적</div>
            <div class="ds-value">${performanceCount(company)}건</div>
            <div class="xs">누적 기준</div>
          </div>
          <div class="ds-cell">
            <div class="ds-label">진행상태</div>
            <div class="ds-value" style="font-size:var(--fs-sm)">${badge(meta(SALES_STAGE, company.salesStage))}</div>
            <div class="xs">${meeting ? `${esc(meeting.label)} ${esc(relativeDay(meeting.plannedDate))}` : `6단계 중 ${stageNumber}단계`}</div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ------------------------------ 개요 3열 ------------------------------ */

function basicCard(company) {
  return card({
    title: '기본정보',
    actions: placeholderButton('수정'),
    body: deflist([
      ['업체코드', codeChip(company.companyCode)],
      ['사업자번호', `<span class="mono">${esc(fmtBizNo(company.businessNumber))}</span>`],
      ['대표자', esc(company.representative || '—')],
      ['담당자', esc(company.contactName || '—')],
      ['전화번호', esc(company.phone || '—')],
      ['지역', esc(company.region || '—')],
      ['주소', esc(company.address || '—')],
      ['업체유형', badge(meta(COMPANY_TYPE, company.companyType))],
      ['등록일', fmtDate(company.createdAt)],
      ['비고', esc(company.note || '—')],
    ]),
  });
}

function activityCard(company) {
  const activities = (company.activities || []).slice(0, 5);
  return card({
    title: '최근활동',
    subtitle: `${(company.activities || []).length}건`,
    actions: placeholderButton('등록'),
    body: activities.length ? activityTimeline(activities) : emptyState('활동 이력이 없습니다'),
  });
}

function mouCard(company) {
  const mou = company.mou || { status: 'NONE' };
  return card({
    title: 'MOU',
    actions: badge(meta(MOU_STATUS, mou.status || 'NONE')),
    body: deflist([
      ['체결일', fmtDate(mou.signedDate)],
      ['협약기간', mou.periodFrom ? `${fmtDate(mou.periodFrom)} ~ ${fmtDate(mou.periodTo)}` : '—'],
      ['담당자', esc(mou.owner || '—')],
      ['특허번호', (mou.patentNumbers || []).length ? mou.patentNumbers.map((patent) => `<span class="badge badge-outline mono">${esc(patent)}</span>`).join(' ') : '—'],
      ['관련 현장', (mou.relatedSites || []).length ? esc(mou.relatedSites.join(', ')) : '—'],
      ['문서', `${(mou.documents || []).length}건`],
    ]),
  });
}

function revenueCard(company) {
  const totals = companyTotalsByYear(company);
  const rows = (company.revenues || []).slice().sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1)).slice(0, 5);
  return card({
    title: '매출',
    subtitle: `${CURRENT_YEAR} ${wonShort(yearRevenue(company))}`,
    actions: `<a class="btn btn-sm" href="#/revenue">매출 화면</a>`,
    body: `
      <div class="row" style="gap:6px;margin-bottom:10px">
        ${totals.map((total) => `
          <span class="badge ${total.year === CURRENT_YEAR ? 'badge-blue' : 'badge-outline'}">
            ${total.year} ${wonShort(total.amount)}
          </span>`).join('')}
      </div>
      ${rows.length ? dataTable({
        compact: true,
        columns: [
          { key: 'issuedAt', label: '발행일', width: '84px', render: (row) => fmtDate(row.issuedAt) },
          { key: 'type', label: '유형', width: '76px', render: (row) => badge(meta(REVENUE_TYPE, row.type)) },
          { key: 'amount', label: '금액', align: 'right', render: (row) => `<span class="strong">${won(row.amount)}</span>` },
        ],
        rows,
      }) : emptyState('등록된 매출이 없습니다')}`,
  });
}

function performanceCard(company) {
  const rows = (company.performances || []).slice().sort((a, b) => b.year - a.year).slice(0, 5);
  return card({
    title: '시공실적',
    subtitle: `${performanceCount(company)}건`,
    body: rows.length ? dataTable({
      compact: true,
      columns: [
        { key: 'siteName', label: '현장명', render: (row) => `<span class="cell-main">${esc(row.siteName)}</span>` },
        { key: 'workType', label: '공종', width: '72px', render: (row) => `<span class="badge badge-outline">${esc(row.workType)}</span>` },
        { key: 'year', label: '연도', width: '52px', align: 'right', render: (row) => row.year },
        { key: 'status', label: '상태', width: '62px', render: (row) => badge(meta(PERFORMANCE_STATUS, row.status)) },
      ],
      rows,
    }) : emptyState('등록된 실적이 없습니다'),
  });
}

function memoCard(company) {
  const memos = (company.memos || []).slice(0, 4);
  return card({
    title: '메모',
    subtitle: `${(company.memos || []).length}건`,
    actions: placeholderButton('작성'),
    body: memos.length
      ? `<div>${memos.map((memo) => `
          <div class="memo ${memo.important ? 'is-pinned' : ''}">
            <div class="m-head">
              <span class="small strong">${fmtDate(memo.createdAt)}</span>
              <span class="small muted">${esc(memo.author)}</span>
              ${memo.important ? '<span class="badge badge-amber">중요</span>' : ''}
            </div>
            <div>${esc(memo.content)}</div>
          </div>`).join('')}</div>`
      : emptyState('메모가 없습니다'),
  });
}

function overview(company) {
  return `
    <div class="grid grid-detail">
      <div class="stack">
        ${basicCard(company)}
        ${activityCard(company)}
      </div>
      <div class="stack">
        ${meetingCard('FIRST', company.firstMeeting)}
        ${meetingCard('SECOND', company.secondMeeting)}
        ${mouCard(company)}
      </div>
      <div class="stack">
        ${revenueCard(company)}
        ${performanceCard(company)}
        ${memoCard(company)}
      </div>
    </div>`;
}

/* ------------------------------ 하단 세부 탭 ------------------------------ */

function subTabs(company, activeKey) {
  return `
    <div class="subtabs">
      ${DETAIL_TABS.map((tab) => {
        const count = tab.count ? tab.count(company) : null;
        return `
          <button type="button" class="${cx('subtab', tab.key === activeKey && 'is-active')}"
                  data-action="detailTab" data-tab="${tab.key}">
            ${esc(tab.label)}${count ? `<span class="badge">${count}</span>` : ''}
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
        ${overview(company)}
        <div class="stack">
          ${subTabs(company, activeKey)}
          <div>${activeTab.render(company)}</div>
        </div>
      </div>
    </div>`;
}
