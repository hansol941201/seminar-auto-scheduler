/** 대시보드 — KPI 6종 + 최근 흐름 / MOU 진행현황 / 미팅 예정 / 최근 등록업체. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, placeholderButton, emptyState, badge } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { activityTimeline, meetingTimeline } from '../components/timeline.js';
import { companyNameCell, mouBadge, stageBadge, companyCodeCell } from '../components/companyBits.js';
import {
  dashboardStats, recentActivities, recentlyRegistered, upcomingMeetings, getListCompanies,
} from '../services/companyService.js';
import { risingCompanies } from '../services/revenueService.js';
import { meetingConversion } from '../services/analyticsService.js';
import { CURRENT_YEAR, MOU_STATUS, meta } from '../data/constants.js';
import { num, wonShort, date as fmtDate, percent } from '../utils/format.js';

function kpiRow(stats) {
  const riser = risingCompanies(1)[0];
  const conversion = meetingConversion();
  return `
    <div class="grid grid-kpi">
      ${kpi({ label: '전체 업체', value: num(stats.totalCompanies), unit: '개', foot: `정상 ${stats.activeCompanies} · 종료 ${stats.terminated}` })}
      ${kpi({ label: 'MOU 체결', value: num(stats.mouSigned), unit: '개', foot: `체결률 ${percent(stats.mouSigned / Math.max(1, stats.totalCompanies))}` })}
      ${kpi({ label: 'MOU 진행', value: num(stats.mouProgress), unit: '개', foot: '초안·검토 단계' })}
      ${kpi({
        label: '최근 상승업체',
        value: riser ? `<span style="font-size:var(--fs-lg)">${esc(riser.company.name)}</span>` : '—',
        foot: riser ? `전년 대비 +${wonShort(riser.delta)}` : '',
      })}
      ${kpi({ label: 'L2 → L3 전환률', value: percent(conversion.firstToSecondRate), foot: `1차 ${conversion.firstDone} → 2차 ${conversion.secondDone}` })}
      ${kpi({ label: `${CURRENT_YEAR} 매출`, value: wonShort(stats.revenueThisYear), foot: '전년 대비', delta: stats.revenueGrowth, accent: 'blue' })}
    </div>`;
}

function mouTable() {
  const rows = getListCompanies()
    .filter((company) => ['SIGNED', 'PROGRESS'].includes(company.mou?.status))
    .sort((a, b) => (a.mou.status === b.mou.status ? 0 : a.mou.status === 'PROGRESS' ? -1 : 1));

  return dataTable({
    compact: true,
    rowAction: 'openCompanyTab',
    rowDataset: (company) => ({ id: company.id, tab: 'mou' }),
    emptyTitle: '진행 중인 MOU가 없습니다',
    columns: [
      { key: 'name', label: '업체명', render: (company) => `<span class="cell-main">${esc(company.name)}</span>` },
      { key: 'status', label: '상태', width: '72px', render: (company) => badge(meta(MOU_STATUS, company.mou.status)) },
      { key: 'date', label: '체결일', width: '92px', render: (company) => fmtDate(company.mou.signedDate) },
      { key: 'owner', label: '담당자', width: '72px', render: (company) => esc(company.mou.owner || '—') },
    ],
    rows,
  });
}

export function dashboardPage() {
  const stats = dashboardStats();
  const meetings = upcomingMeetings().slice(0, 6);
  const activities = recentActivities(8);
  const registered = recentlyRegistered(5);

  return `
    <div class="page">
      ${pageHead({
        title: '대시보드',
        desc: '기준일 2026.09.27 · UI 확인용 가상 데이터',
        actions: `
          ${placeholderButton('기간 필터')}
          <button type="button" class="btn btn-primary" data-action="openNewCompany">+ 신규 업체 등록</button>`,
      })}

      <div class="stack">
        ${kpiRow(stats)}

        <div class="grid grid-2-1">
          ${card({
            title: '최근 흐름',
            subtitle: '전 업체 활동',
            actions: `<a class="btn btn-sm" href="#/sales">영업 화면</a>`,
            body: activities.length ? activityTimeline(activities, { showCompany: true }) : emptyState('활동 이력이 없습니다'),
          })}
          <div class="stack">
            ${card({
              title: '미팅 예정',
              subtitle: `${meetings.length}건`,
              body: meetings.length ? meetingTimeline(meetings) : emptyState('예정된 미팅이 없습니다'),
            })}
            ${card({
              title: 'MOU 진행현황',
              actions: `<a class="btn btn-sm" href="#/mou">전체 보기</a>`,
              flush: true,
              body: mouTable(),
            })}
          </div>
        </div>

        <div>
          ${card({
            title: '최근 등록업체',
            actions: `<a class="btn btn-sm" href="#/companies">업체 목록</a>`,
            flush: true,
            body: dataTable({
              compact: true,
              rowAction: 'openCompany',
              rowDataset: (company) => ({ id: company.id }),
              columns: [
                { key: 'name', label: '업체명', render: companyNameCell },
                { key: 'code', label: '업체코드', width: '88px', render: companyCodeCell },
                { key: 'stage', label: '영업단계', width: '88px', render: stageBadge },
                { key: 'mou', label: 'MOU', width: '72px', render: mouBadge },
                { key: 'createdAt', label: '등록일', width: '92px', render: (company) => fmtDate(company.createdAt) },
              ],
              rows: registered,
            }),
          })}
        </div>
      </div>
    </div>`;
}
