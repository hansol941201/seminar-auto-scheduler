/** 시공실적 서비스 — 업체 경계를 넘는 평면 조회용. */
import { getListCompanies } from './companyService.js';

export function performanceRows({ companyId = null, year = null, region = '', workType = '', status = '' } = {}) {
  const rows = [];
  for (const company of getListCompanies()) {
    if (companyId && company.id !== companyId) continue;
    for (const performance of company.performances || []) {
      if (year && performance.year !== year) continue;
      if (region && performance.region !== region) continue;
      if (workType && performance.workType !== workType) continue;
      if (status && performance.status !== status) continue;
      rows.push({ ...performance, company });
    }
  }
  return rows.sort((a, b) => (a.year === b.year ? a.siteName.localeCompare(b.siteName, 'ko') : b.year - a.year));
}

export function performanceYears() {
  const years = new Set();
  for (const company of getListCompanies()) {
    for (const performance of company.performances || []) years.add(performance.year);
  }
  return [...years].sort((a, b) => b - a);
}
