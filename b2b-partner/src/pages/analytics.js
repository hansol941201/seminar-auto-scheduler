/** 분석 — 숫자 + 표 + 간단한 막대. 차트 남발하지 않는다. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, barList, placeholderButton, notice } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import {
  revenueRanking, performanceRanking, compositeRanking, risingCompanies,
  mouConversion, meetingConversion, regionDistribution, COMPOSITE_FORMULA,
} from '../services/analyticsService.js';
import { CURRENT_YEAR, REVENUE_YEARS } from '../data/constants.js';
import { wonShort, percent, num } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

function rankingTable(rows, valueLabel, valueRender) {
  return dataTable({
    compact: true,
    rowAction: 'openCompany',
    rowDataset: (row) => ({ id: row.company.id }),
    emptyTitle: '데이터가 없습니다',
    columns: [
      { key: 'rank', label: '#', width: '34px', align: 'right', render: (row, index) => `<span class="strong">${index + 1}</span>` },
      { key: 'name', label: '업체명', render: (row) => `<span class="cell-main">${esc(row.company.name)}</span>` },
      { key: 'code', label: '코드', width: '84px', render: (row) => `<span class="mono small muted">${esc(row.company.companyCode)}</span>` },
      { key: 'value', label: valueLabel, width: '108px', align: 'right', render: valueRender },
    ],
    rows,
  });
}

export function analyticsPage() {
  const year = uiState.analyticsYear;
  const mou = mouConversion();
  const meeting = meetingConversion();
  const risers = risingCompanies(6);

  return `
    <div class="page">
      ${pageHead({
        title: '분석',
        desc: '순위·전환율·분포. 지표 정의는 확정 전이며 임시 산식으로 표시됩니다.',
        actions: `
          <div class="btn-group">
            ${REVENUE_YEARS.map((option) => `
              <button type="button" class="btn btn-sm ${option === year ? 'is-active' : ''}" data-action="analyticsYear" data-year="${option}">${option}</button>`).join('')}
          </div>
          ${placeholderButton('리포트 내보내기')}`,
      })}

      <div class="stack">
        <div class="grid grid-kpi">
          ${kpi({ label: 'MOU 체결률', value: percent(mou.signedRate), foot: `체결 ${mou.signed} / 전체 ${mou.contacted}`, accent: 'blue' })}
          ${kpi({ label: 'MOU 진행', value: num(mou.progress), unit: '개', foot: `종료 ${mou.ended}개` })}
          ${kpi({ label: 'L2 → L3 전환률', value: percent(meeting.firstToSecondRate), foot: `1차 ${meeting.firstDone} → 2차 ${meeting.secondDone}` })}
          ${kpi({ label: '2차 → 체결', value: percent(mou.secondToSignedRate), foot: `2차 완료 ${meeting.secondDone}개` })}
          ${kpi({ label: '최근 상승업체', value: num(risers.length), unit: '개', foot: `${CURRENT_YEAR - 1} → ${CURRENT_YEAR}` })}
        </div>

        <div class="grid grid-3">
          ${card({ title: `매출순위 · ${year}`, flush: true, body: rankingTable(revenueRanking(year, 8), '매출', (row) => `<span class="strong">${wonShort(row.amount)}</span>`) })}
          ${card({ title: '실적순위', flush: true, body: rankingTable(performanceRanking(8), '실적', (row) => `<span class="strong">${row.count}건</span>`) })}
          ${card({ title: '종합순위', subtitle: '임시 산식', flush: true, body: rankingTable(compositeRanking(8), '점수', (row) => row.score.toFixed(3)) })}
        </div>

        <div class="grid grid-2-1">
          ${card({
            title: '최근 상승업체',
            subtitle: `${CURRENT_YEAR - 1} → ${CURRENT_YEAR}`,
            flush: true,
            body: dataTable({
              compact: true,
              rowAction: 'openCompany',
              rowDataset: (row) => ({ id: row.company.id }),
              emptyTitle: '상승 업체가 없습니다',
              columns: [
                { key: 'name', label: '업체명', render: (row) => `<span class="cell-main">${esc(row.company.name)}</span>` },
                { key: 'previous', label: `${CURRENT_YEAR - 1}`, align: 'right', width: '96px', render: (row) => wonShort(row.previous) },
                { key: 'current', label: `${CURRENT_YEAR}`, align: 'right', width: '96px', render: (row) => `<span class="strong">${wonShort(row.current)}</span>` },
                { key: 'delta', label: '증감', align: 'right', width: '96px', render: (row) => `<span style="color:var(--green)">+${wonShort(row.delta)}</span>` },
                { key: 'rate', label: '증감률', align: 'right', width: '80px', render: (row) => (row.rate === null ? badge({ label: '신규', tone: 'blue' }) : percent(row.rate, 0)) },
              ],
              rows: risers,
            }),
          })}
          ${card({
            title: '지역별 분포',
            body: barList(regionDistribution().map((row) => ({ label: row.region, value: row.count })), { formatter: (value) => `${value}개` }),
          })}
        </div>

        ${notice(`종합순위 산식: <b>${esc(COMPOSITE_FORMULA)}</b> — 가중치는 확정되지 않았습니다.`, 'info')}
      </div>
    </div>`;
}
