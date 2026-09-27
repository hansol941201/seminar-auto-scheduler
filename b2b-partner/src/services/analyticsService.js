/** 분석 서비스 — 순위/전환/분포. 실제 지표 정의는 추후 확정, 여기서는 단순 집계. */
import { CURRENT_YEAR, SALES_STAGE_ORDER, SALES_STAGE, meta } from '../data/constants.js';
import { getListCompanies, performanceCount, yearRevenue } from './companyService.js';
import { revenueRanking, risingCompanies } from './revenueService.js';

export { revenueRanking, risingCompanies };

export function performanceRanking(limit = 10) {
  return getListCompanies()
    .map((company) => ({ company, count: performanceCount(company) }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * 종합순위 — 매출(60%) + 실적(40%)을 각각 최대값 대비 정규화한 임시 산식.
 * 가중치는 확정 전이며, 화면에서 산식을 명시해 오해를 막는다.
 */
export const COMPOSITE_FORMULA = '매출 정규화 × 0.6 + 실적 정규화 × 0.4 (임시 산식)';

export function compositeRanking(limit = 10) {
  const companies = getListCompanies();
  const maxRevenue = Math.max(1, ...companies.map((c) => yearRevenue(c, CURRENT_YEAR)));
  const maxPerformance = Math.max(1, ...companies.map(performanceCount));

  return companies
    .map((company) => {
      const revenue = yearRevenue(company, CURRENT_YEAR);
      const count = performanceCount(company);
      const score = (revenue / maxRevenue) * 0.6 + (count / maxPerformance) * 0.4;
      return { company, revenue, count, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 영업 단계별 업체 수 (퍼널) */
export function stageFunnel() {
  const companies = getListCompanies();
  return SALES_STAGE_ORDER.map((stage, index) => {
    const reached = companies.filter(
      (company) => SALES_STAGE_ORDER.indexOf(company.salesStage) >= index,
    ).length;
    return { stage, label: meta(SALES_STAGE, stage).label, reached };
  });
}

/** MOU 전환현황 */
export function mouConversion() {
  const companies = getListCompanies();
  const contacted = companies.length;
  const secondDone = companies.filter((c) => c.secondMeeting?.status === 'DONE').length;
  const progress = companies.filter((c) => c.mou?.status === 'PROGRESS').length;
  const signed = companies.filter((c) => c.mou?.status === 'SIGNED').length;
  const ended = companies.filter((c) => c.mou?.status === 'ENDED').length;
  return {
    contacted, secondDone, progress, signed, ended,
    signedRate: contacted ? signed / contacted : 0,
    secondToSignedRate: secondDone ? signed / secondDone : 0,
  };
}

/** 미팅 전환현황 */
export function meetingConversion() {
  const companies = getListCompanies();
  const firstDone = companies.filter((c) => c.firstMeeting?.status === 'DONE').length;
  const secondDone = companies.filter((c) => c.secondMeeting?.status === 'DONE').length;
  const firstPlanned = companies.filter((c) => c.firstMeeting?.status === 'PLANNED').length;
  const secondPlanned = companies.filter((c) => c.secondMeeting?.status === 'PLANNED').length;
  return {
    firstDone, secondDone, firstPlanned, secondPlanned,
    firstToSecondRate: firstDone ? secondDone / firstDone : 0,
  };
}

/** 지역별 분포 */
export function regionDistribution() {
  const totals = {};
  for (const company of getListCompanies()) {
    totals[company.region] = (totals[company.region] || 0) + 1;
  }
  return Object.entries(totals)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

/** 지역별 시공실적 분포 */
export function sitesByRegion() {
  const totals = {};
  for (const company of getListCompanies()) {
    for (const performance of company.performances || []) {
      totals[performance.region] = (totals[performance.region] || 0) + 1;
    }
  }
  return Object.entries(totals)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}
