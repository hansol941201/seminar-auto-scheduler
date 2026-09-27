/**
 * 업체 조회/집계 서비스.
 * 지금은 mock 배열을 읽지만, 이후 Firestore/REST 연동 시 이 파일의 함수 시그니처만 유지하면
 * 화면 코드는 수정하지 않는다. (읽기 전용 — 저장 기능은 아직 없음)
 */
import { mockCompanies } from '../data/mockCompanies.js';
import { CURRENT_YEAR, SALES_STAGE_ORDER } from '../data/constants.js';
import { TODAY, daysFromToday } from '../utils/format.js';

/** 업체명 정규화 — 정합화/중복검사 기준값 생성 규칙 */
export function normalizeName(name) {
  return String(name || '')
    .replace(/\(주\)|\(유\)|주식회사|유한회사/g, '')
    .replace(/[\s.,·\-_()]/g, '')
    .toLowerCase();
}

/** 정상 상태 업체만 (삭제·종료 제외) */
export function getActiveCompanies() {
  return mockCompanies.filter((c) => !c.deleted && c.status === 'ACTIVE');
}

/** 목록 화면 기본 집합 (삭제 제외, 협약종료 포함) */
export function getListCompanies() {
  return mockCompanies.filter((c) => !c.deleted);
}

export function getAllCompanies() {
  return mockCompanies.slice();
}

export function getDeletedCompanies() {
  return mockCompanies.filter((c) => c.deleted || c.status === 'DELETED');
}

export function getTerminatedCompanies() {
  return mockCompanies.filter((c) => c.status === 'TERMINATED');
}

export function getCompanyById(id) {
  return mockCompanies.find((c) => c.id === id) || null;
}

export function getCompanyByCode(code) {
  return mockCompanies.find((c) => c.companyCode === code) || null;
}

/* ------------------------------ 파생값 ------------------------------ */

export function yearRevenue(company, year = CURRENT_YEAR) {
  return (company.revenues || [])
    .filter((r) => r.year === year)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function totalRevenue(company) {
  return (company.revenues || []).reduce((sum, r) => sum + r.amount, 0);
}

export function performanceCount(company) {
  return (company.performances || []).length;
}

export function lastActivity(company) {
  const activities = (company.activities || [])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return activities[0] || null;
}

export function stageIndex(company) {
  return SALES_STAGE_ORDER.indexOf(company.salesStage);
}

/** 다가오는 미팅 1건 (1차/2차 중 예정 상태이며 오늘 이후) */
export function upcomingMeeting(company) {
  const candidates = [
    { kind: 'FIRST', label: '1차 미팅', ...(company.firstMeeting || {}) },
    { kind: 'SECOND', label: '2차 미팅', ...(company.secondMeeting || {}) },
  ].filter((m) => m.status === 'PLANNED' && m.plannedDate && m.plannedDate >= TODAY);
  candidates.sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : 1));
  return candidates[0] || null;
}

/** 전 업체의 예정 미팅 목록 */
export function upcomingMeetings(kind = null) {
  const rows = [];
  for (const company of getListCompanies()) {
    for (const [k, label, meeting] of [
      ['FIRST', '1차 미팅', company.firstMeeting],
      ['SECOND', '2차 미팅', company.secondMeeting],
    ]) {
      if (!meeting || meeting.status !== 'PLANNED' || !meeting.plannedDate) continue;
      if (kind && kind !== k) continue;
      rows.push({
        kind: k, kindLabel: label, company,
        date: meeting.plannedDate, time: meeting.time,
        place: meeting.place, owner: meeting.internalOwner,
        dday: daysFromToday(meeting.plannedDate),
      });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 최근 활동 통합 피드 */
export function recentActivities(limit = 8) {
  const rows = [];
  for (const company of getListCompanies()) {
    for (const activity of company.activities || []) {
      rows.push({ ...activity, company });
    }
  }
  rows.sort((a, b) => (`${a.date}${a.time}` < `${b.date}${b.time}` ? 1 : -1));
  return rows.slice(0, limit);
}

/** 최근 등록 업체 */
export function recentlyRegistered(limit = 5) {
  return getListCompanies()
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

/* ------------------------------ 검색 / 필터 / 정렬 ------------------------------ */

export const SORT_OPTIONS = [
  { key: 'updatedAt', label: '최근 수정순' },
  { key: 'createdAt', label: '등록 최신순' },
  { key: 'name', label: '업체명순' },
  { key: 'code', label: '업체코드순' },
  { key: 'revenue', label: '올해 매출순' },
  { key: 'performance', label: '시공실적순' },
];

/**
 * @param {object} query { keyword, region, companyType, salesStage, mouStatus, status, sort }
 */
export function queryCompanies(query = {}) {
  const {
    keyword = '', region = '', companyType = '', salesStage = '',
    mouStatus = '', status = '', sort = 'updatedAt', includeDeleted = false,
  } = query;

  const needle = normalizeName(keyword);
  let rows = includeDeleted ? getAllCompanies() : getListCompanies();

  rows = rows.filter((c) => {
    if (region && c.region !== region) return false;
    if (companyType && c.companyType !== companyType) return false;
    if (salesStage && c.salesStage !== salesStage) return false;
    if (mouStatus && c.mou?.status !== mouStatus) return false;
    if (status && c.status !== status) return false;
    if (!needle) return true;
    const haystack = [
      c.name, c.normalizedName, c.companyCode, c.businessNumber,
      c.representative, c.contactName, c.phone, c.address,
      ...(c.aliases || []), ...(c.formerNames || []),
    ].map(normalizeName).join('|');
    return haystack.includes(needle);
  });

  const comparators = {
    updatedAt: (a, b) => (a.updatedAt < b.updatedAt ? 1 : -1),
    createdAt: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    name: (a, b) => a.name.localeCompare(b.name, 'ko'),
    code: (a, b) => a.companyCode.localeCompare(b.companyCode),
    revenue: (a, b) => yearRevenue(b) - yearRevenue(a),
    performance: (a, b) => performanceCount(b) - performanceCount(a),
  };
  return rows.sort(comparators[sort] || comparators.updatedAt);
}

/** 전체 검색(헤더) — 업체 기준 상위 N건 */
export function globalSearch(keyword, limit = 6) {
  if (!keyword || !keyword.trim()) return [];
  return queryCompanies({ keyword, includeDeleted: true, sort: 'name' }).slice(0, limit);
}

/* ------------------------------ 대시보드 집계 ------------------------------ */

export function dashboardStats() {
  const list = getListCompanies();
  const active = getActiveCompanies();
  const newThisQuarter = list.filter((c) => c.createdAt >= '2026-07-01');
  const mouSigned = list.filter((c) => c.mou?.status === 'SIGNED');
  const mouProgress = list.filter((c) => c.mou?.status === 'PROGRESS');
  const first = upcomingMeetings('FIRST');
  const second = upcomingMeetings('SECOND');
  const revenueThisYear = list.reduce((sum, c) => sum + yearRevenue(c, CURRENT_YEAR), 0);
  const revenueLastYear = list.reduce((sum, c) => sum + yearRevenue(c, CURRENT_YEAR - 1), 0);
  const performances = list.reduce((sum, c) => sum + performanceCount(c), 0);

  return {
    totalCompanies: list.length,
    activeCompanies: active.length,
    newCompanies: newThisQuarter.length,
    mouSigned: mouSigned.length,
    mouProgress: mouProgress.length,
    firstMeetingPlanned: first.length,
    secondMeetingPlanned: second.length,
    revenueThisYear,
    revenueLastYear,
    revenueGrowth: revenueLastYear ? (revenueThisYear - revenueLastYear) / revenueLastYear : null,
    performances,
    deleted: getDeletedCompanies().length,
    terminated: getTerminatedCompanies().length,
  };
}
