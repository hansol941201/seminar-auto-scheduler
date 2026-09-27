/** 업체명 정합화 서비스 — 현재 상호/구상호/별칭/과거표기 관리. */
import { getAllCompanies, normalizeName } from './companyService.js';

export function reconciliationRows() {
  return getAllCompanies().map((company) => ({
    company,
    current: company.name,
    normalized: company.normalizedName || normalizeName(company.name),
    businessNumber: company.businessNumber,
    formerNames: company.formerNames || [],
    aliases: company.aliases || [],
    pastLabels: [...(company.formerNames || []), ...(company.aliases || [])],
    status: company.nameReconciliation?.status || 'CHECK',
    reviewedAt: company.nameReconciliation?.reviewedAt || '',
    reviewer: company.nameReconciliation?.reviewer || '',
  }));
}

export function needsReview() {
  return reconciliationRows().filter((row) => row.status === 'CHECK');
}
