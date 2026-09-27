/** 영업 — 단계별 현황, 미팅 예정, 활동 피드. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, barList, placeholderButton, emptyState, badge } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { meetingTimeline, activityTimeline } from '../components/timeline.js';
import { companyNameCell, companyCodeCell, stageBadge, mouBadge, meetingCell } from '../components/companyBits.js';
import { getListCompanies, upcomingMeetings, recentActivities } from '../services/companyService.js';
import { stageFunnel, meetingConversion } from '../services/analyticsService.js';
import { SALES_STAGE, SALES_STAGE_ORDER, meta } from '../data/constants.js';
import { num, percent, date as fmtDate, relativeDay } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

export function salesPage() {
  const companies = getListCompanies();
  const stageFilter = uiState.salesStageFilter;
  const rows = stageFilter ? companies.filter((company) => company.salesStage === stageFilter) : companies;
  const funnel = stageFunnel();
  const conversion = meetingConversion();
  const firstMeetings = upcomingMeetings('FIRST');
  const secondMeetings = upcomingMeetings('SECOND');

  return `
    <div class="page">
      ${pageHead({
        title: '영업',
        desc: '업체별 영업 진행단계와 미팅 일정을 한 화면에서 관리합니다.',
        actions: `${placeholderButton('일정 등록')}<button type="button" class="btn btn-primary" data-action="openNewCompany">+ 신규 업체 등록</button>`,
      })}

      <div class="stack">
        <div class="grid grid-kpi">
          ${kpi({ label: '영업 대상 업체', value: num(companies.length), unit: '개' })}
          ${kpi({ label: '1차 미팅 완료', value: num(conversion.firstDone), unit: '개', foot: `예정 ${conversion.firstPlanned}건` })}
          ${kpi({ label: '2차 미팅 완료', value: num(conversion.secondDone), unit: '개', foot: `예정 ${conversion.secondPlanned}건` })}
          ${kpi({ label: 'L2 → L3 전환률', value: percent(conversion.firstToSecondRate), foot: '1차 → 2차 미팅', accent: 'blue' })}
        </div>

        <div class="toolbar">
          <span class="small muted">영업단계</span>
          <button type="button" class="btn btn-sm ${stageFilter ? '' : 'is-active'}" data-action="salesStage" data-stage="">전체 ${companies.length}</button>
          ${SALES_STAGE_ORDER.map((stage) => {
            const count = companies.filter((company) => company.salesStage === stage).length;
            return `<button type="button" class="btn btn-sm ${stageFilter === stage ? 'is-active' : ''}" data-action="salesStage" data-stage="${stage}">
              ${esc(meta(SALES_STAGE, stage).label)} ${count}</button>`;
          }).join('')}
          <span class="spacer"></span>
          <span class="filter-summary">${rows.length}개 표시</span>
        </div>

        <div class="grid grid-2-1">
          ${card({
            title: '업체별 영업 진행',
            subtitle: stageFilter ? meta(SALES_STAGE, stageFilter).label : '전체',
            flush: true,
            body: dataTable({
              compact: true,
              rowAction: 'openCompany',
              rowDataset: (company) => ({ id: company.id }),
              columns: [
                { key: 'name', label: '업체명', render: companyNameCell },
                { key: 'code', label: '업체코드', width: '92px', render: companyCodeCell },
                { key: 'stage', label: '영업단계', width: '92px', render: stageBadge },
                { key: 'first', label: '1차 미팅', width: '92px', render: (company) => meetingCell(company.firstMeeting) },
                { key: 'second', label: '2차 미팅', width: '92px', render: (company) => meetingCell(company.secondMeeting) },
                { key: 'mou', label: 'MOU', width: '74px', render: mouBadge },
                { key: 'owner', label: '담당자', width: '80px', render: (company) => esc(company.firstMeeting?.internalOwner || company.salesPipeline?.[0]?.owner || '—') },
                { key: 'next', label: '다음 일정', width: '132px', render: (company) => {
                  const next = [company.firstMeeting, company.secondMeeting]
                    .filter((meeting) => meeting && meeting.status === 'PLANNED' && meeting.plannedDate)
                    .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : 1))[0];
                  return next
                    ? `${fmtDate(next.plannedDate)} ${badge({ label: relativeDay(next.plannedDate), tone: 'outline' })}`
                    : '<span class="muted">—</span>';
                } },
              ],
              rows,
            }),
          })}

          <div class="stack">
            ${card({
              title: '1차 미팅 예정',
              subtitle: `${firstMeetings.length}건`,
              body: firstMeetings.length ? meetingTimeline(firstMeetings) : emptyState('예정된 1차 미팅이 없습니다'),
            })}
            ${card({
              title: '2차 미팅 예정',
              subtitle: `${secondMeetings.length}건`,
              body: secondMeetings.length ? meetingTimeline(secondMeetings) : emptyState('예정된 2차 미팅이 없습니다'),
            })}
          </div>
        </div>

        <div class="grid grid-2-1">
          ${card({
            title: '최근 활동',
            subtitle: '전 업체 통합',
            body: activityTimeline(recentActivities(8), { showCompany: true }),
          })}
          ${card({
            title: '단계별 도달 업체',
            subtitle: '해당 단계 이상',
            body: barList(funnel.map((row) => ({ label: row.label, value: row.reached })), { formatter: (value) => `${value}개` }),
          })}
        </div>
      </div>
    </div>`;
}
