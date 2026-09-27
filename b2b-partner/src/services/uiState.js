/**
 * 화면 상태 저장소 (메모리 전용).
 * 필터/선택 연도/업로드 단계처럼 "화면에만 존재하는 값"을 모아둔다.
 * 서버 데이터와 분리해 두면, 이후 데이터 계층을 붙일 때 충돌이 없다.
 */
import { CURRENT_YEAR } from '../data/constants.js';

const listeners = new Set();

export const uiState = {
  companyFilter: {
    keyword: '', region: '', companyType: '', salesStage: '', mouStatus: '', status: '',
    sort: 'updatedAt', includeDeleted: false,
  },
  companyDetailTab: 'basic',
  salesStageFilter: '',
  mouStatusFilter: '',
  revenueYear: CURRENT_YEAR,
  revenueCompanyId: '',
  performanceFilter: { year: null, region: '', workType: '', status: '' },
  uploadStep: 'select',
  adminSection: 'code',
  analyticsYear: CURRENT_YEAR,
  mapLayer: 'companies',
  globalSearchKeyword: '',
};

export function patch(path, value) {
  const [head, key] = path.split('.');
  if (key) uiState[head][key] = value;
  else uiState[head] = value;
  notify();
}

export function resetCompanyFilter() {
  uiState.companyFilter = {
    keyword: '', region: '', companyType: '', salesStage: '', mouStatus: '', status: '',
    sort: 'updatedAt', includeDeleted: false,
  };
  notify();
}

export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}
