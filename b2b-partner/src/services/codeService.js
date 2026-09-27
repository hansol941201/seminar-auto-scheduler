/**
 * 업체 고유코드 서비스.
 * 코드는 업체명과 무관한 내부 식별자이며, 아래 순서로 부여된다.
 *
 *   1) 현재 최대번호 확인   → maxSequence()
 *   2) 다음 번호 생성       → nextCode()
 *   3) 중복검사             → isCodeTaken()
 *   4) 저장                 → (미구현: 저장 단계에서 트랜잭션으로 재확인)
 *
 * 지금 단계에서는 1~3의 "읽기" 부분만 mock 기준으로 동작하고, 4는 연결하지 않는다.
 */
import { CODE_RULE } from '../data/constants.js';
import { getAllCompanies } from './companyService.js';

export function formatCode(sequence) {
  return `${CODE_RULE.prefix}${String(sequence).padStart(CODE_RULE.digits, '0')}`;
}

export function parseCode(code) {
  const pattern = new RegExp(`^${CODE_RULE.prefix}(\\d{${CODE_RULE.digits},})$`);
  const matched = pattern.exec(String(code || '').trim().toUpperCase());
  return matched ? Number(matched[1]) : null;
}

/** 1) 현재 최대번호 */
export function maxSequence() {
  return getAllCompanies().reduce((max, company) => {
    const sequence = parseCode(company.companyCode);
    return sequence && sequence > max ? sequence : max;
  }, 0);
}

/** 2) 다음 번호 (자동생성 예정 코드) */
export function nextCode() {
  return formatCode(maxSequence() + 1);
}

/** 3) 중복검사 */
export function isCodeTaken(code) {
  const target = String(code || '').trim().toUpperCase();
  return getAllCompanies().some((company) => company.companyCode === target);
}

/** 코드 부여 현황 요약 (관리 > 업체코드 관리) */
export function codeOverview() {
  const companies = getAllCompanies();
  const used = companies
    .map((company) => ({ company, sequence: parseCode(company.companyCode) }))
    .filter((row) => row.sequence)
    .sort((a, b) => a.sequence - b.sequence);

  const sequences = used.map((row) => row.sequence);
  const gaps = [];
  for (let i = 1; i <= maxSequence(); i += 1) {
    if (!sequences.includes(i)) gaps.push(formatCode(i));
  }

  return {
    rule: CODE_RULE,
    assigned: used.length,
    missing: companies.length - used.length,
    maxSequence: maxSequence(),
    nextCode: nextCode(),
    gaps,
    rows: used,
  };
}
