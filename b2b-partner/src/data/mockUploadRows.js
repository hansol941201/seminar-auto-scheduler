/**
 * 매출 Excel 업로드 Preview mock.
 * 실제 파일 파싱은 하지 않고, "분석 결과가 이렇게 생겼다"는 형태만 고정한다.
 */

export const mockUploadFile = {
  fileName: '2026_매출내역_샘플.xlsx',
  sheetName: '매출내역',
  rowCount: 12,
  analyzedAt: '2026-09-27 10:14',
  targetYear: 2026,
};

export const mockUploadRows = [
  { line: 2,  issuedAt: '2026-09-30', rawCompanyName: '대한건설산업(주)', matchedCode: 'B2B001', siteName: '성남 판교 B타워', type: 'MATERIAL', amount: 64000000, status: 'NEW', reason: '동일 업체·현장·발행일 조합이 없습니다.' },
  { line: 3,  issuedAt: '2026-09-30', rawCompanyName: '대한건설산업', matchedCode: 'B2B001', siteName: '성남 판교 B타워', type: 'ROYALTY', amount: 8000000, status: 'NEW', reason: '별칭으로 업체 매칭됨.' },
  { line: 4,  issuedAt: '2026-08-31', rawCompanyName: '대한건설산업(주)', matchedCode: 'B2B001', siteName: '서울 강남 A오피스', type: 'MATERIAL', amount: 184000000, status: 'DUPLICATE', reason: '기존 매출과 발행일·금액이 동일합니다.' },
  { line: 5,  issuedAt: '2026-09-20', rawCompanyName: '금호외장보수(주)', matchedCode: 'B2B006', siteName: '여수 웅천 L상가', type: 'SOLUTION', amount: 21000000, status: 'UPDATE_CANDIDATE', reason: '동일 건이나 금액이 다릅니다(19,000,000 → 21,000,000).' },
  { line: 6,  issuedAt: '',           rawCompanyName: '금호외장보수(주)', matchedCode: 'B2B006', siteName: '전주 덕진 K단지', type: 'MATERIAL', amount: 33000000, status: 'ISSUE_DATE_CHECK', reason: '발행일이 비어 있습니다.' },
  { line: 7,  issuedAt: '2025-12-26', rawCompanyName: '금호외장보수(주)', matchedCode: 'B2B006', siteName: '목포 하당 N상가', type: 'CONSTRUCTION', amount: 42000000, status: 'OTHER_YEAR_DUP', reason: '2025년 매출과 동일한 건입니다.' },
  { line: 8,  issuedAt: '2025-12-31', rawCompanyName: '성진이엔씨(주)', matchedCode: 'B2B002', siteName: '용인 기흥 F공장', type: 'MATERIAL', amount: 12000000, status: 'OTHER_YEAR_CHECK', reason: '업로드 대상연도(2026)와 발행일 연도가 다릅니다.' },
  { line: 9,  issuedAt: '2026-07-31', rawCompanyName: '성진기업', matchedCode: 'B2B002', siteName: '수원 광교 E현장', type: 'CONSULTING', amount: 5000000, status: 'COMPANY_CHECK', reason: '구상호로 매칭됨. 동일업체 확정 필요.' },
  { line: 10, issuedAt: '2026-09-10', rawCompanyName: '정우구조엔지니어링', matchedCode: 'B2B004', siteName: '대전 둔산 I빌딩', type: 'TECH_FEE', amount: 6000000, status: 'DUPLICATE', reason: '기존 매출과 동일합니다.' },
  { line: 11, issuedAt: '2026-06-30', rawCompanyName: '동해특수건설', matchedCode: '', siteName: '강릉 교동 P단지', type: 'MATERIAL', amount: 27000000, status: 'NOT_REGISTERED', reason: '등록된 업체가 없습니다. 신규 업체 등록 후 반영 필요.' },
  { line: 12, issuedAt: '2026-05-29', rawCompanyName: '새길이엔지', matchedCode: '', siteName: '원주 무실 Q빌딩', type: 'SOLUTION', amount: 9000000, status: 'COMPANY_CHECK', reason: '유사 상호 업체(새길엔지니어링)가 존재합니다.' },
  { line: 13, issuedAt: '2026-09-15', rawCompanyName: '한빛방수기술', matchedCode: 'B2B003', siteName: '부산 해운대 G아파트', type: 'CONSTRUCTION', amount: 18000000, status: 'NEW', reason: '신규 매출 건입니다.' },
];

/** 업로드 이력 (관리 메뉴) */
export const mockUploadHistory = [
  { id: 'u1', fileName: '2026_매출내역_1H.xlsx', uploadedAt: '2026-07-03', uploader: '김영업', rows: 48, applied: 41, skipped: 7, state: '반영완료' },
  { id: 'u2', fileName: '2025_매출내역_최종.xlsx', uploadedAt: '2026-01-09', uploader: '김영업', rows: 96, applied: 96, skipped: 0, state: '반영완료' },
  { id: 'u3', fileName: '2026_매출내역_샘플.xlsx', uploadedAt: '2026-09-27', uploader: '김영업', rows: 12, applied: 0, skipped: 0, state: '검토중' },
];
