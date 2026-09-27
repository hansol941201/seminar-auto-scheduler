/**
 * 중복업체 검사 서비스 (UI 계약만 정의 — 실제 매칭 로직은 아직 구현하지 않음).
 *
 * 검사 기준 6종을 고정하고, 각 기준의 판정 결과를 같은 형태로 반환한다.
 * 이후 실제 구현 시 checkDuplicates() 내부만 교체하면 화면은 그대로 동작한다.
 */
import { DUPLICATE_STATUS, meta } from '../data/constants.js';

export const DUPLICATE_CRITERIA = [
  { key: 'businessNumber', label: '사업자번호', desc: '완전일치 — 일치 시 즉시 중복으로 판정', weight: '필수' },
  { key: 'normalizedName', label: '정규화 업체명', desc: '(주)·공백·특수문자 제거 후 비교', weight: '필수' },
  { key: 'companyCode', label: '업체코드', desc: '수동 입력 시에만 검사', weight: '보조' },
  { key: 'representative', label: '대표자', desc: '업체명 유사 시 가중치로 사용', weight: '보조' },
  { key: 'phone', label: '전화번호', desc: '숫자만 추출 후 비교', weight: '보조' },
  { key: 'address', label: '주소', desc: '시·군·구 + 도로명 단위 비교', weight: '참고' },
];

/** 아직 판정하지 않은 초기 상태 */
export function emptyCheckResult() {
  return {
    status: 'CHECK',
    statusMeta: meta(DUPLICATE_STATUS, 'CHECK'),
    checkedAt: null,
    criteria: DUPLICATE_CRITERIA.map((criterion) => ({
      ...criterion, result: 'NOT_RUN', resultLabel: '미검사', candidates: [],
    })),
    candidates: [],
  };
}

/**
 * 중복검사 실행 (미구현 stub).
 * 반환 형태만 확정해 두고, 실제 비교는 다음 단계에서 붙인다.
 */
export function checkDuplicates(/* draft */) {
  return {
    ...emptyCheckResult(),
    status: 'CHECK',
    statusMeta: meta(DUPLICATE_STATUS, 'CHECK'),
    note: '중복검사 로직은 아직 연결되지 않았습니다. (UI/구조만 준비된 단계)',
  };
}

/** 관리 > 업체 중복검토 화면용 검토 대기 목록 (mock 기준 수동 지정) */
export const mockDuplicateReviews = [
  {
    id: 'dr1',
    status: 'BIZNO_DUP',
    criterion: 'businessNumber',
    left: { code: 'B2B003', name: '한빛방수기술', businessNumber: '5109923388' },
    right: { code: 'B2B009', name: '삼정테크(주)', businessNumber: '8018811193' },
    note: '사업자번호 표기 충돌 의심. 원본 서류 확인 필요.',
    detectedAt: '2026-08-21',
  },
  {
    id: 'dr2',
    status: 'SIMILAR',
    criterion: 'normalizedName',
    left: { code: 'B2B007', name: '새길엔지니어링', businessNumber: '7038890021' },
    right: { code: '—', name: '새길이엔지 (매출 파일 표기)', businessNumber: '—' },
    note: '업체명 유사. 별도 업체로 판정됨(2026-09-19).',
    detectedAt: '2026-09-19',
  },
  {
    id: 'dr3',
    status: 'CHECK',
    criterion: 'normalizedName',
    left: { code: 'B2B002', name: '성진이엔씨(주)', businessNumber: '3148702233' },
    right: { code: '—', name: '성진기업 (구상호)', businessNumber: '3148702233' },
    note: '구상호 매출 이력 존재. 동일업체 확정 처리 필요.',
    detectedAt: '2026-09-02',
  },
];
