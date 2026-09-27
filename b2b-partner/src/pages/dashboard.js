/** 대시보드 — 전체 업무 상황 요약. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, sparkColumns, barList, placeholderButton, emptyState } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { activityTimeline, meetingTimeline } from '../components/timeline.js';
import { companyNameCell, mouBadge, stageBadge, companyCodeCell } from '../components/companyBits.js';
import {
  dashboardStats, recentActivities, recentlyRegistered, upcomingMeetings, getListCompanies,
} from '../services/companyService.js';
import { totalsByYear, risingCompanies } from '../services/revenueService.js';
import { CURRENT_YEAR, MOU_STATUS, meta } from '../data/constants.js';
import { num, wonShort, date as fmtDate, percent } from '../utils/format.js';

function kpiRow(stats) {
  const riser = risingCompanies(1)[0];
  return `
    <div class="grid grid-kpi">
      ${kpi({ label: '전체 업체 수', value: num(stats.totalCompanies), unit: '개', foot: `정상 ${stats.activeCompanies} · 종료 ${stats.terminated}`, accent: 'navy' })}
      ${kpi({ label: '신규 업체', value: num(stats.newCompanies), unit: '개', foot: '2026년 3분기 등록', accent: 'blue' })}
      ${kpi({ label: 'MOU 체결', value: num(stats.mouSigned), unit: '개', foot: `체결률 ${percent(stats.mouSigned / Math.max(1, stats.totalCompanies))}`, accent: 'green' })}
      ${kpi({ label: 'MOU 진행중', value: num(stats.mouProgress), unit: '개', foot: '초안·검토 단계', accent: 'amber' })}
      ${kpi({ label: '1차 미팅 예정', value: num(stats.firstMeetingPlanned), unit: '건', foot: '오늘 이후 일정', accent: 'blue' })}
      ${kpi({ label: '2차 미팅 예정', value: num(stats.secondMeetingPlanned), unit: '건', foot: '오늘 이후 일정', accent: 'violet' })}
      ${kpi({ label: `${CURRENT_YEAR} 매출`, value: wonShort(stats.revenueThisYear), foot: '전년 대비', accent: 'navy', delta: stats.revenueGrowth })}
      ${kpi({ label: '시공실적', value: num(stats.performances), unit: '건', foot: '전체 누적', accent: 'green' })}
      ${kpi({
        label: '최근 상승 업체',
        value: riser ? `<span style="font-size:var(--fs-lg)">${esc(riser.company.name)}</span>` : '—',
        foot: riser ? `전년 대비 +${wonShort(riser.delta)}` : '',
        accent: 'violet',
      })}
    </div>`;
}

function mouProgressCard() {
  const companies = getListCompanies();
  const rows = ['SIGNED', 'PROGRESS', 'NONE', 'ENDED'].map((key) => ({
    label: meta(MOU_STATUS, key).label,
    value: companies.filter((company) => (company.mou?.status || 'NONE') === key).length,
  }));
  const inProgress = companies.filter((company) => company.mou?.status === 'PROGRESS');

  return card({
    title: 'MOU 진행현황',
    actions: `<a class="btn btn-sm" href="#/mou">전체 보기</a>`,
    body: `
      ${barList(rows, { formatter: (value) => `${value}개` })}
      <div style="margin-top:14px" class="small muted">진행중 업체</div>
      ${inProgress.length ? `<ul class="stack-sm" style="margin-top:6px">${inProgress.map((company) => `
        <li class="row-between">
          <a href="#/companies/${company.id}">${esc(company.name)}</a>
          <span class="small muted">${esc(company.mou.note || '')}</span>
        </li>`).join('')}</ul>` : '<div class="small muted" style="margin-top:6px">진행중인 MOU가 없습니다.</div>'}`,
  });
}

function revenueChangeCard() {
  const totals = totalsByYear();
  const risers = risingCompanies(4);
  return card({
    title: '매출 변화',
    subtitle: '연도별 합계',
    actions: `<a class="btn btn-sm" href="#/revenue">매출 화면</a>`,
    body: `
      ${sparkColumns(totals, CURRENT_YEAR)}
      <div class="small muted" style="margin:14px 0 6px">전년 대비 상승 업체</div>
      ${risers.length ? dataTable({
        compact: true,
        columns: [
          { key: 'name', label: '업체명', render: (row) => `<a href="#/companies/${row.company.id}">${esc(row.company.name)}</a>` },
          { key: 'previous', label: `${CURRENT_YEAR - 1}`, align: 'right', render: (row) => wonShort(row.previous) },
          { key: 'current', label: `${CURRENT_YEAR}`, align: 'right', render: (row) => `<span class="strong">${wonShort(row.current)}</span>` },
          { key: 'delta', label: '증감', align: 'right', render: (row) => `<span style="color:var(--green-600)">+${wonShort(row.delta)}</span>` },
        ],
        rows: risers,
      }) : emptyState('상승 업체가 없습니다')}`,
  });
}

export function dashboardPage() {
  const stats = dashboardStats();
  const meetings = upcomingMeetings().slice(0, 6);
  const activities = recentActivities(7);
  const registered = recentlyRegistered(5);

  return `
    <div class="page">
      ${pageHead({
        title: '대시보드',
        desc: `기준일 2026.09.27 · 표시되는 값은 모두 UI 확인용 가상 데이터입니다.`,
        actions: `
          ${placeholderButton('기간 필터', { size: '' })}
          <button type="button" class="btn btn-primary" data-action="openNewCompany">+ 신규 업체 등록</button>`,
      })}

      <div class="stack">
        ${kpiRow(stats)}

        <div class="grid grid-2-1">
          ${card({
            title: '최근 활동',
            subtitle: '전 업체 통합',
            actions: `<a class="btn btn-sm" href="#/sales">영업 화면</a>`,
            body: activities.length ? activityTimeline(activities, { showCompany: true }) : emptyState('활동 이력이 없습니다'),
          })}
          ${card({
            title: '미팅 예정',
            subtitle: '1차 · 2차',
            body: meetings.length ? meetingTimeline(meetings) : emptyState('예정된 미팅이 없습니다'),
          })}
        </div>

        <div class="grid grid-2">
          ${mouProgressCard()}
          ${revenueChangeCard()}
        </div>

        ${card({
          title: '최근 등록 업체',
          flush: true,
          actions: `<a class="btn btn-sm" href="#/companies">업체 목록</a>`,
          body: dataTable({
            rowAction: 'openCompany',
            rowDataset: (company) => ({ id: company.id }),
            columns: [
              { key: 'name', label: '업체명', render: companyNameCell },
              { key: 'code', label: '업체코드', width: '104px', render: companyCodeCell },
              { key: 'stage', label: '영업단계', width: '104px', render: stageBadge },
              { key: 'mou', label: 'MOU', width: '84px', render: mouBadge },
              { key: 'contact', label: '담당자', width: '132px', render: (company) => esc(company.contactName || '—') },
              { key: 'createdAt', label: '등록일', width: '104px', render: (company) => fmtDate(company.createdAt) },
            ],
            rows: registered,
          }),
        })}
      </div>
    </div>`;
}
