/** 분석 — 순위/전환/분포. 산식은 임시이며 화면에 명시한다. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, barList, meter, placeholderButton, notice } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import {
  revenueRanking, performanceRanking, compositeRanking, risingCompanies,
  mouConversion, meetingConversion, regionDistribution, stageFunnel, COMPOSITE_FORMULA,
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
      { key: 'rank', label: '#', width: '40px', align: 'right', render: (row, index) => `<span class="strong">${index + 1}</span>` },
      { key: 'name', label: '업체명', render: (row) => `<span class="cell-main">${esc(row.company.name)}</span>` },
      { key: 'code', label: '코드', width: '88px', render: (row) => `<span class="mono small">${esc(row.company.companyCode)}</span>` },
      { key: 'value', label: valueLabel, width: '124px', align: 'right', render: valueRender },
    ],
    rows,
  });
}

export function analyticsPage() {
  const year = uiState.analyticsYear;
  const revenue = revenueRanking(year, 8);
  const performance = performanceRanking(8);
  const composite = compositeRanking(8);
  const risers = risingCompanies(6);
  const mou = mouConversion();
  const meeting = meetingConversion();
  const regions = regionDistribution();
  const funnel = stageFunnel();

  return `
    <div class="page">
      ${pageHead({
        title: '분석',
        desc: '순위·전환율·분포를 확인합니다. 지표 정의는 확정 전이며 임시 산식으로 표시됩니다.',
        actions: `${placeholderButton('리포트 내보내기')}`,
      })}

      <div class="stack">
        ${notice(`종합순위 산식: <b>${esc(COMPOSITE_FORMULA)}</b> — 가중치는 확정되지 않았습니다.`, 'warn')}

        <div class="toolbar">
          <span class="small muted">기준 연도</span>
          <div class="btn-group">
            ${REVENUE_YEARS.map((option) => `
              <button type="button" class="btn btn-sm ${option === year ? 'is-active' : ''}" data-action="analyticsYear" data-year="${option}">${option}</button>`).join('')}
          </div>
          <span class="spacer"></span>
          <span class="filter-summary">${year}년 기준 집계</span>
        </div>

        <div class="grid grid-kpi">
          ${kpi({ label: 'MOU 체결률', value: percent(mou.signedRate), foot: `체결 ${mou.signed} / 전체 ${mou.contacted}`, accent: 'green' })}
          ${kpi({ label: '2차 미팅 → 체결', value: percent(mou.secondToSignedRate), foot: `2차 완료 ${mou.secondDone}개`, accent: 'blue' })}
          ${kpi({ label: '1차 → 2차 전환', value: percent(meeting.firstToSecondRate), foot: `1차 완료 ${meeting.firstDone}개`, accent: 'violet' })}
          ${kpi({ label: '상승 업체', value: num(risers.length), unit: '개', foot: '전년 대비 증가', accent: 'amber' })}
        </div>

        <div class="grid grid-3">
          ${card({ title: `매출순위 (${year})`, flush: true, body: rankingTable(revenue, '매출', (row) => `<span class="strong">${wonShort(row.amount)}</span>`) })}
          ${card({ title: '실적순위', flush: true, body: rankingTable(performance, '실적', (row) => `${row.count}건`) })}
          ${card({ title: '종합순위', flush: true, body: rankingTable(composite, '점수', (row) => row.score.toFixed(3)) })}
        </div>

        <div class="grid grid-2">
          ${card({
            title: '최근 상승 업체',
            subtitle: `${CURRENT_YEAR - 1} → ${CURRENT_YEAR}`,
            flush: true,
            body: dataTable({
              compact: true,
              rowAction: 'openCompany',
              rowDataset: (row) => ({ id: row.company.id }),
              emptyTitle: '상승 업체가 없습니다',
              columns: [
                { key: 'name', label: '업체명', render: (row) => esc(row.company.name) },
                { key: 'previous', label: `${CURRENT_YEAR - 1}`, align: 'right', width: '100px', render: (row) => wonShort(row.previous) },
                { key: 'current', label: `${CURRENT_YEAR}`, align: 'right', width: '100px', render: (row) => `<span class="strong">${wonShort(row.current)}</span>` },
                { key: 'delta', label: '증감', align: 'right', width: '100px', render: (row) => `<span style="color:var(--green-600)">+${wonShort(row.delta)}</span>` },
                { key: 'rate', label: '증감률', align: 'right', width: '84px', render: (row) => (row.rate === null ? '<span class="badge badge-blue">신규</span>' : percent(row.rate, 0)) },
              ],
              rows: risers,
            }),
          })}
          ${card({
            title: '영업 단계 퍼널',
            body: `<div class="stack-sm">${funnel.map((row) => `
              <div>
                <div class="row-between small"><span>${esc(row.label)}</span><span class="strong">${row.reached}개</span></div>
                ${meter(row.reached / Math.max(1, funnel[0].reached))}
              </div>`).join('')}</div>`,
          })}
        </div>

        <div class="grid grid-2">
          ${card({
            title: 'MOU 전환현황',
            body: barList([
              { label: '접촉 업체', value: mou.contacted },
              { label: '2차 미팅 완료', value: mou.secondDone },
              { label: 'MOU 진행중', value: mou.progress },
              { label: 'MOU 체결', value: mou.signed },
              { label: 'MOU 종료', value: mou.ended },
            ], { formatter: (value) => `${value}개` }),
          })}
          ${card({
            title: '미팅 전환현황',
            body: barList([
              { label: '1차 미팅 완료', value: meeting.firstDone },
              { label: '1차 미팅 예정', value: meeting.firstPlanned },
              { label: '2차 미팅 완료', value: meeting.secondDone },
              { label: '2차 미팅 예정', value: meeting.secondPlanned },
            ], { formatter: (value) => `${value}건` }),
          })}
        </div>

        ${card({
          title: '지역별 분포',
          body: barList(regions.map((row) => ({ label: row.region, value: row.count })), { formatter: (value) => `${value}개` }),
          foot: `${regions.length}개 지역 · 총 ${regions.reduce((sum, row) => sum + row.count, 0)}개 업체`,
        })}
      </div>
    </div>`;
}
