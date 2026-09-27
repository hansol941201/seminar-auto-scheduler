/** 매출 집계 서비스 — 연도별 합계, 유형별 구성, 업체별 순위. */
import { REVENUE_YEARS, CURRENT_YEAR, REVENUE_TYPE } from '../data/constants.js';
import { getListCompanies, yearRevenue } from './companyService.js';

/** 전체 연도별 합계 */
export function totalsByYear(companies = getListCompanies()) {
  return REVENUE_YEARS.map((year) => ({
    year,
    amount: companies.reduce((sum, company) => sum + yearRevenue(company, year), 0),
  }));
}

/** 한 업체의 연도별 합계 */
export function companyTotalsByYear(company) {
  return REVENUE_YEARS.map((year) => ({ year, amount: yearRevenue(company, year) }));
}

/** 유형별 구성 (연도 지정) */
export function totalsByType(year = CURRENT_YEAR, companies = getListCompanies()) {
  const totals = {};
  for (const company of companies) {
    for (const revenue of company.revenues || []) {
      if (revenue.year !== year) continue;
      totals[revenue.type] = (totals[revenue.type] || 0) + revenue.amount;
    }
  }
  return Object.keys(REVENUE_TYPE)
    .map((key) => ({ type: key, amount: totals[key] || 0 }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** 거래내역 평면 목록 (매출 탭 / 업체 상세 공용) */
export function revenueRows({ year = CURRENT_YEAR, companyId = null } = {}) {
  const rows = [];
  for (const company of getListCompanies()) {
    if (companyId && company.id !== companyId) continue;
    for (const revenue of company.revenues || []) {
      if (year && revenue.year !== year) continue;
      rows.push({ ...revenue, company });
    }
  }
  return rows.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
}

/** 업체별 매출 순위 */
export function revenueRanking(year = CURRENT_YEAR, limit = 10) {
  return getListCompanies()
    .map((company) => ({ company, amount: yearRevenue(company, year) }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/** 전년 대비 상승 업체 */
export function risingCompanies(limit = 5) {
  return getListCompanies()
    .map((company) => {
      const current = yearRevenue(company, CURRENT_YEAR);
      const previous = yearRevenue(company, CURRENT_YEAR - 1);
      return {
        company, current, previous,
        delta: current - previous,
        rate: previous ? (current - previous) / previous : null,
      };
    })
    .filter((row) => row.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

export function unpaidRows(year = CURRENT_YEAR) {
  return revenueRows({ year }).filter((row) => row.status === 'UNPAID');
}
