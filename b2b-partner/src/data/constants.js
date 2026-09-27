/**
 * 도메인 열거값(enum) 정의.
 * 모든 상태값은 코드(key) + 표시명(label) + 배지 톤(tone)으로 관리한다.
 * 화면은 label/tone만 사용하고, 저장·연산은 key로만 한다. (향후 DB 연동 시 그대로 사용)
 */

const build = (entries) => {
  const map = {};
  for (const [key, label, tone] of entries) map[key] = { key, label, tone };
  return Object.freeze(map);
};

export const COMPANY_TYPE = build([
  ['CONSTRUCTOR', '시공사', 'blue'],
  ['PARTNER', '협력업체', 'violet'],
  ['OTHER', '기타', 'gray'],
]);

export const COMPANY_STATUS = build([
  ['ACTIVE', '정상', 'green'],
  ['TERMINATED', '협약종료', 'gray'],
  ['DELETED', '삭제됨', 'red'],
]);

/** 영업 진행단계 — 배열 순서가 곧 진행 순서 */
export const SALES_STAGE_ORDER = [
  'NEW_CONTACT', 'CONSULTING', 'FIRST_MEETING', 'SECOND_MEETING', 'MOU_PROGRESS', 'MOU_SIGNED',
];

export const SALES_STAGE = build([
  ['NEW_CONTACT', '신규접촉', 'gray'],
  ['CONSULTING', '상담', 'blue'],
  ['FIRST_MEETING', '1차 미팅', 'blue'],
  ['SECOND_MEETING', '2차 미팅', 'violet'],
  ['MOU_PROGRESS', 'MOU 진행', 'amber'],
  ['MOU_SIGNED', 'MOU 체결', 'green'],
]);

export const MOU_STATUS = build([
  ['NONE', '미체결', 'gray'],
  ['PROGRESS', '진행중', 'amber'],
  ['SIGNED', '체결', 'green'],
  ['ENDED', '종료', 'outline'],
]);

export const MEETING_STATUS = build([
  ['NONE', '미진행', 'gray'],
  ['PLANNED', '예정', 'amber'],
  ['DONE', '완료', 'green'],
  ['CANCELED', '취소', 'outline'],
]);

export const ACTIVITY_TYPE = build([
  ['CALL', '전화', 'blue'],
  ['SMS', '문자', 'gray'],
  ['KAKAO', '카카오톡', 'amber'],
  ['EMAIL', '이메일', 'blue'],
  ['MEETING', '미팅', 'violet'],
  ['DOC_REQUEST', '자료요청', 'gray'],
  ['SITE_REGISTER', '현장등록', 'green'],
  ['TECH_CONSULT', '기술자문', 'violet'],
  ['ETC', '기타', 'gray'],
]);

export const QUESTIONNAIRE_STATUS = build([
  ['NOT_SENT', '미발송', 'gray'],
  ['SENT', '발송', 'blue'],
  ['WAITING', '회신대기', 'amber'],
  ['DONE', '회신완료', 'green'],
]);

export const REVENUE_TYPE = build([
  ['MATERIAL', '자재', 'blue'],
  ['ROYALTY', '특허료', 'violet'],
  ['TECH_FEE', '기술자문료', 'amber'],
  ['CONSULTING', '컨설팅', 'gray'],
  ['SOLUTION', '솔루션', 'blue'],
  ['CONSTRUCTION', '공사', 'green'],
]);

export const REVENUE_STATUS = build([
  ['ISSUED', '발행', 'blue'],
  ['PAID', '수금완료', 'green'],
  ['UNPAID', '미수', 'red'],
]);

export const PERFORMANCE_STATUS = build([
  ['COMPLETED', '준공', 'green'],
  ['ONGOING', '진행중', 'blue'],
  ['PLANNED', '예정', 'amber'],
]);

/** 업체명 정합화 판정상태 */
export const NAME_MATCH_STATUS = build([
  ['SAME', '동일업체 확정', 'green'],
  ['CHECK', '확인 필요', 'amber'],
  ['SEPARATE', '별도 업체', 'gray'],
]);

/** 신규 등록 시 중복검사 결과 상태 */
export const DUPLICATE_STATUS = build([
  ['NONE', '중복 없음', 'green'],
  ['SIMILAR', '유사 업체 있음', 'amber'],
  ['BIZNO_DUP', '사업자번호 중복', 'red'],
  ['CHECK', '확인 필요', 'violet'],
]);

/** 업체코드 상태 */
export const CODE_STATUS = build([
  ['ASSIGNED', '부여 완료', 'green'],
  ['RESERVED', '자동생성 예정', 'blue'],
  ['PENDING', '미부여', 'gray'],
  ['CONFLICT', '중복 확인 필요', 'red'],
]);

/** 매출 Excel 업로드 Preview 행 상태 */
export const UPLOAD_ROW_STATUS = build([
  ['NEW', '신규', 'green'],
  ['DUPLICATE', '중복', 'gray'],
  ['UPDATE_CANDIDATE', '수정 후보', 'blue'],
  ['ISSUE_DATE_CHECK', '발행일 확인 필요', 'amber'],
  ['OTHER_YEAR_DUP', '타연도 중복', 'gray'],
  ['OTHER_YEAR_CHECK', '타연도 확인 필요', 'amber'],
  ['COMPANY_CHECK', '업체 확인 필요', 'violet'],
  ['NOT_REGISTERED', '미등록 업체', 'red'],
]);

export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

/** 공종 예시 (보수공법 관련) */
export const WORK_TYPES = [
  '외벽보수', '방수', '단열보강', '구조보강', '균열보수', '도장', '리모델링', '기타',
];

/** 매출 관리 대상 연도 */
export const REVENUE_YEARS = [2024, 2025, 2026];
export const CURRENT_YEAR = 2026;

/** 업체코드 규칙 */
export const CODE_RULE = Object.freeze({
  prefix: 'B2B',
  digits: 3,
  example: 'B2B001',
  description: '접두어(B2B) + 3자리 순번. 업체명과 무관하게 업체를 추적하는 내부 식별자.',
});

/** enum 조회 헬퍼 — 알 수 없는 키도 화면이 깨지지 않게 방어 */
export function meta(map, key) {
  return map[key] || { key, label: key || '—', tone: 'gray' };
}
