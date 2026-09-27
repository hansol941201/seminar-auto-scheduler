/**
 * 매출 Excel 업로드 서비스 (UI 계약만 — 실제 파일 파싱/반영은 하지 않음).
 *
 * 흐름: 파일 선택 → 분석 → Preview → 확인 → 반영
 * 각 단계는 상태값으로만 관리하고, analyze()는 고정된 mock 결과를 돌려준다.
 */
import { mockUploadFile, mockUploadRows, mockUploadHistory } from '../data/mockUploadRows.js';
import { UPLOAD_ROW_STATUS } from '../data/constants.js';

export const UPLOAD_STEPS = [
  { key: 'select', label: '파일 선택' },
  { key: 'analyze', label: '분석' },
  { key: 'preview', label: 'Preview' },
  { key: 'confirm', label: '확인' },
  { key: 'apply', label: '반영' },
];

export { mockUploadHistory };

/** 분석 결과 (mock) */
export function analyze() {
  return { file: mockUploadFile, rows: mockUploadRows };
}

/** 상태별 건수 요약 */
export function summarize(rows) {
  const counts = {};
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  return Object.keys(UPLOAD_ROW_STATUS)
    .map((key) => ({ status: key, count: counts[key] || 0 }))
    .filter((row) => row.count > 0);
}

/** 반영 대상 / 보류 대상 구분 규칙 */
export const APPLY_TARGET_STATUSES = ['NEW', 'UPDATE_CANDIDATE'];

export function applyTargets(rows) {
  return rows.filter((row) => APPLY_TARGET_STATUSES.includes(row.status));
}

export function holdTargets(rows) {
  return rows.filter((row) => !APPLY_TARGET_STATUSES.includes(row.status));
}
