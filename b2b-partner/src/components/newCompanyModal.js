/**
 * 신규 업체 등록 모달.
 * 저장 기능 없음 — 입력 UI / 업체코드 UI / 중복검사 UI 구조만 확정한다.
 */
import { esc } from '../utils/dom.js';
import { modalShell } from './modal.js';
import {
  card, notice, inputField, textareaField, selectField, badge,
  placeholderButton,
} from './ui.js';
import { dataTable } from './table.js';
import {
  COMPANY_TYPE, REGIONS, CODE_STATUS, DUPLICATE_STATUS, CODE_RULE, meta,
} from '../data/constants.js';
import { nextCode, maxSequence } from '../services/codeService.js';
import { DUPLICATE_CRITERIA, emptyCheckResult } from '../services/duplicateService.js';

function codeSection() {
  const reserved = nextCode();
  return card({
    title: '업체 고유코드',
    subtitle: CODE_RULE.description,
    body: `
      <div class="field-grid">
        <div class="field">
          <label>현재 업체코드</label>
          <div class="input" style="background:var(--bg-subtle)">${badge(meta(CODE_STATUS, 'PENDING'))} <span class="muted small">저장 전에는 부여되지 않습니다</span></div>
        </div>
        <div class="field">
          <label>자동생성 예정 코드</label>
          <div class="input readonly-code">${esc(reserved)}</div>
          <span class="hint">현재 최대번호 ${maxSequence()} → 다음 번호 ${maxSequence() + 1}</span>
        </div>
        <div class="field">
          <label>코드 상태</label>
          <div class="input" style="background:var(--bg-subtle)">${badge(meta(CODE_STATUS, 'RESERVED'))}</div>
          <span class="hint">저장 시 중복검사 후 확정</span>
        </div>
      </div>
      <div style="margin-top:12px">
        ${notice(`부여 절차: <b>현재 최대번호 확인 → 다음 번호 생성 → 중복검사 → 저장</b>. 코드는 업체명과 별개인 내부 식별자로, 업체명이 바뀌어도 유지됩니다.`, 'info')}
      </div>`,
  });
}

function duplicateSection() {
  const result = emptyCheckResult();
  const statusChips = Object.values(DUPLICATE_STATUS)
    .map((statusMeta) => badge(statusMeta)).join(' ');

  return card({
    title: '중복검사',
    subtitle: '기준 6종 / 판정상태 4종',
    actions: placeholderButton('중복검사 실행', { variant: 'btn-primary' }),
    body: `
      ${notice('중복검사 로직은 아직 연결되지 않았습니다. 기준·판정상태·표시 위치만 확정된 상태입니다.', 'warn')}
      <div class="row wrap small" style="margin-top:10px;gap:6px">
        <span class="muted">판정상태:</span> ${statusChips}
      </div>
      <div style="margin-top:12px">
        ${dataTable({
          compact: true,
          columns: [
            { key: 'label', label: '검사 기준', render: (row) => `<span class="strong">${esc(row.label)}</span>` },
            { key: 'weight', label: '구분', width: '72px', render: (row) => `<span class="badge badge-outline">${esc(row.weight)}</span>` },
            { key: 'desc', label: '비교 방식', render: (row) => `<span class="small muted">${esc(row.desc)}</span>` },
            { key: 'result', label: '결과', width: '96px', render: () => badge({ label: '미검사', tone: 'gray' }) },
            { key: 'candidates', label: '후보', width: '64px', align: 'right', render: () => '<span class="muted">—</span>' },
          ],
          rows: DUPLICATE_CRITERIA,
        })}
      </div>
      <div class="small muted" style="margin-top:8px">현재 판정: ${badge(result.statusMeta)}</div>`,
  });
}

export function newCompanyModal() {
  const body = `
    <div class="stack">
      ${card({
        title: '기본정보',
        body: `
          <div class="field-grid">
            ${inputField({ name: 'name', label: '업체명', required: true, placeholder: '예) 대한건설산업(주)' })}
            ${inputField({ name: 'businessNumber', label: '사업자번호', required: true, placeholder: '000-00-00000', hint: '중복검사 1순위 기준' })}
            ${inputField({ name: 'representative', label: '대표자', placeholder: '예) 박정호' })}
            ${inputField({ name: 'contactName', label: '담당자', placeholder: '예) 이수현 과장' })}
            ${inputField({ name: 'phone', label: '전화번호', placeholder: '02-000-0000' })}
            ${inputField({ name: 'email', label: '이메일', type: 'email', placeholder: 'name@company.co.kr' })}
            ${inputField({ name: 'address', label: '주소', span: true, placeholder: '시·도 / 시·군·구 / 도로명' })}
            ${selectField({ name: 'region', label: '지역', options: REGIONS, placeholder: '선택' })}
            ${selectField({
              name: 'companyType', label: '업체유형', placeholder: '선택',
              options: Object.values(COMPANY_TYPE).map((type) => ({ value: type.key, label: type.label })),
            })}
            ${textareaField({ name: 'note', label: '비고', placeholder: '내부 참고 사항' })}
          </div>`,
      })}
      ${codeSection()}
      ${duplicateSection()}
    </div>`;

  const foot = `
    <span class="small muted">저장 기능은 이번 단계에서 연결하지 않았습니다.</span>
    <span class="spacer"></span>
    <button type="button" class="btn" data-action="closeModal">취소</button>
    ${placeholderButton('저장', { variant: 'btn-primary', size: '' })}`;

  return modalShell({
    title: '신규 업체 등록',
    subtitle: '기본정보 → 업체코드 → 중복검사',
    body, foot, wide: true,
  });
}
