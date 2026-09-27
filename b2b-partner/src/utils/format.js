/** 표시 포맷 유틸 — 화면 표기 규칙을 한 곳에 모아둔다. */

const nf = new Intl.NumberFormat('ko-KR');

export function num(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return nf.format(value);
}

/** 원 단위 금액 → "1,250,000원" */
export function won(value) {
  if (value === null || value === undefined) return '—';
  return `${nf.format(Math.round(value))}원`;
}

/** 원 단위 금액 → "1.25억" / "3,400만" (카드·요약용 축약 표기) */
export function wonShort(value) {
  if (!value) return '0';
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2).replace(/\.00$/, '')}억`;
  if (abs >= 10000) return `${nf.format(Math.round(value / 10000))}만`;
  return nf.format(value);
}

/** "2026-03-14" → "2026.03.14" */
export function date(value) {
  if (!value) return '—';
  return String(value).replaceAll('-', '.');
}

/** "2026-03-14" + "14:00" → "2026.03.14 14:00" */
export function dateTime(day, time) {
  if (!day) return '—';
  return time ? `${date(day)} ${time}` : date(day);
}

/** 오늘(고정 기준일) 대비 남은 일수 — mock 환경이므로 기준일을 상수로 고정 */
export const TODAY = '2026-09-27';

export function daysFromToday(value) {
  if (!value) return null;
  const diff = new Date(`${value}T00:00:00`) - new Date(`${TODAY}T00:00:00`);
  return Math.round(diff / 86400000);
}

export function relativeDay(value) {
  const d = daysFromToday(value);
  if (d === null) return '';
  if (d === 0) return '오늘';
  if (d > 0) return `D-${d}`;
  return `${Math.abs(d)}일 전`;
}

export function percent(value, digits = 0) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** 사업자번호 표기 정규화 */
export function businessNumber(value) {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function phone(value) {
  return value || '—';
}
