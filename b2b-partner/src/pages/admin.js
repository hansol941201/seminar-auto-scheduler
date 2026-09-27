/** 관리 — 코드/중복/정합화/업로드/이전/삭제·종료/설정. */
import { esc, cx } from '../utils/dom.js';
import { pageHead, card, kpi, badge, notice, deflist, placeholderButton, emptyState, codeChip } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { codeOverview } from '../services/codeService.js';
import { mockDuplicateReviews, DUPLICATE_CRITERIA } from '../services/duplicateService.js';
import { reconciliationRows } from '../services/nameService.js';
import { mockUploadHistory } from '../services/uploadService.js';
import { getDeletedCompanies, getTerminatedCompanies, getListCompanies } from '../services/companyService.js';
import {
  CODE_STATUS, DUPLICATE_STATUS, NAME_MATCH_STATUS, COMPANY_STATUS, CODE_RULE, meta,
} from '../data/constants.js';
import { businessNumber as fmtBizNo, date as fmtDate, num } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

export const ADMIN_SECTIONS = [
  { key: 'code', label: '업체코드 관리' },
  { key: 'duplicates', label: '업체 중복검토' },
  { key: 'names', label: '업체명 정합화' },
  { key: 'uploads', label: 'Excel 업로드 관리' },
  { key: 'migration', label: '데이터 이전' },
  { key: 'deleted', label: '삭제업체' },
  { key: 'terminated', label: '종료업체' },
  { key: 'settings', label: '시스템 설정' },
];

function codeSection() {
  const overview = codeOverview();
  return `
    <div class="stack">
      <div class="grid grid-kpi">
        ${kpi({ label: '부여된 코드', value: num(overview.assigned), unit: '개', accent: 'navy' })}
        ${kpi({ label: '미부여', value: num(overview.missing), unit: '개', accent: overview.missing ? 'amber' : '' })}
        ${kpi({ label: '현재 최대번호', value: num(overview.maxSequence), accent: 'blue' })}
        ${kpi({ label: '다음 코드', value: `<span style="font-size:var(--fs-lg)">${esc(overview.nextCode)}</span>`, accent: 'green' })}
        ${kpi({ label: '결번', value: num(overview.gaps.length), unit: '개', foot: overview.gaps.join(', ') || '없음' })}
      </div>
      ${card({
        title: '코드 규칙',
        body: deflist([
          ['형식', `<span class="mono">${esc(CODE_RULE.prefix)}</span> + ${CODE_RULE.digits}자리 순번 (예: ${esc(CODE_RULE.example)})`],
          ['부여 절차', '현재 최대번호 확인 → 다음 번호 생성 → 중복검사 → 저장'],
          ['성격', CODE_RULE.description],
          ['코드 상태', Object.values(CODE_STATUS).map((statusMeta) => badge(statusMeta)).join(' ')],
        ]),
        foot: '코드 재부여·수동 지정 기능은 다음 단계에서 연결합니다.',
      })}
      ${card({
        title: '코드 부여 현황',
        flush: true,
        actions: placeholderButton('코드 재정렬'),
        body: dataTable({
          compact: true,
          rowAction: 'openCompany',
          rowDataset: (row) => ({ id: row.company.id }),
          columns: [
            { key: 'sequence', label: '순번', width: '64px', align: 'right', render: (row) => row.sequence },
            { key: 'code', label: '업체코드', width: '104px', render: (row) => codeChip(row.company.companyCode) },
            { key: 'name', label: '업체명', render: (row) => esc(row.company.name) },
            { key: 'bizNo', label: '사업자번호', width: '120px', render: (row) => `<span class="mono small">${esc(fmtBizNo(row.company.businessNumber))}</span>` },
            { key: 'createdAt', label: '등록일', width: '104px', render: (row) => fmtDate(row.company.createdAt) },
            { key: 'status', label: '상태', width: '88px', render: (row) => badge(meta(COMPANY_STATUS, row.company.status)) },
            { key: 'codeStatus', label: '코드 상태', width: '96px', render: () => badge(meta(CODE_STATUS, 'ASSIGNED')) },
          ],
          rows: overview.rows,
        }),
      })}
    </div>`;
}

function duplicatesSection() {
  return `
    <div class="stack">
      ${notice('중복 판정 로직은 미구현입니다. 아래 목록은 검토 대기 상태를 보여주기 위한 가상 데이터입니다.', 'warn')}
      ${card({
        title: '검사 기준',
        body: dataTable({
          compact: true,
          columns: [
            { key: 'label', label: '기준', width: '140px', render: (row) => `<span class="strong">${esc(row.label)}</span>` },
            { key: 'weight', label: '구분', width: '72px', render: (row) => `<span class="badge badge-outline">${esc(row.weight)}</span>` },
            { key: 'desc', label: '비교 방식', render: (row) => esc(row.desc) },
          ],
          rows: DUPLICATE_CRITERIA,
        }),
      })}
      ${card({
        title: '중복 검토 대기',
        subtitle: `${mockDuplicateReviews.length}건`,
        flush: true,
        body: dataTable({
          columns: [
            { key: 'status', label: '판정', width: '124px', render: (row) => badge(meta(DUPLICATE_STATUS, row.status)) },
            { key: 'criterion', label: '기준', width: '120px', render: (row) => esc(DUPLICATE_CRITERIA.find((criterion) => criterion.key === row.criterion)?.label || row.criterion) },
            { key: 'left', label: '업체 A', render: (row) => `<span class="strong">${esc(row.left.name)}</span><div class="cell-sub mono">${esc(row.left.code)} · ${esc(row.left.businessNumber)}</div>` },
            { key: 'right', label: '업체 B', render: (row) => `<span class="strong">${esc(row.right.name)}</span><div class="cell-sub mono">${esc(row.right.code)} · ${esc(row.right.businessNumber)}</div>` },
            { key: 'note', label: '메모', render: (row) => `<span class="small muted">${esc(row.note)}</span>` },
            { key: 'detectedAt', label: '감지일', width: '104px', render: (row) => fmtDate(row.detectedAt) },
            { key: 'actions', label: '', width: '150px', render: () => `${placeholderButton('병합')}${placeholderButton('별도 유지')}` },
          ],
          rows: mockDuplicateReviews,
        }),
      })}
    </div>`;
}

function namesSection() {
  const rows = reconciliationRows();
  return `
    <div class="stack">
      <div class="grid grid-kpi">
        ${Object.values(NAME_MATCH_STATUS).map((statusMeta) => kpi({
          label: statusMeta.label,
          value: num(rows.filter((row) => row.status === statusMeta.key).length),
          unit: '개',
          accent: statusMeta.key === 'SAME' ? 'green' : statusMeta.key === 'CHECK' ? 'amber' : '',
        })).join('')}
      </div>
      ${card({
        title: '업체명 정합화',
        subtitle: '현재 업체명 / 사업자번호 / 구상호 / 별칭 / 과거표기',
        flush: true,
        body: dataTable({
          rowAction: 'openCompany',
          rowDataset: (row) => ({ id: row.company.id }),
          columns: [
            { key: 'current', label: '현재 업체명', render: (row) => `<span class="cell-main">${esc(row.current)}</span><div class="cell-sub mono">${esc(row.normalized)}</div>` },
            { key: 'bizNo', label: '사업자번호', width: '120px', render: (row) => `<span class="mono small">${esc(fmtBizNo(row.businessNumber))}</span>` },
            { key: 'formerNames', label: '구상호', render: (row) => (row.formerNames.length ? row.formerNames.map((name) => `<span class="badge badge-outline">${esc(name)}</span>`).join(' ') : '<span class="muted">—</span>') },
            { key: 'aliases', label: '별칭', render: (row) => (row.aliases.length ? row.aliases.map((name) => `<span class="badge badge-outline">${esc(name)}</span>`).join(' ') : '<span class="muted">—</span>') },
            { key: 'pastLabels', label: '과거표기 수', width: '96px', align: 'right', render: (row) => `${row.pastLabels.length}건` },
            { key: 'status', label: '판정상태', width: '116px', render: (row) => badge(meta(NAME_MATCH_STATUS, row.status)) },
            { key: 'reviewedAt', label: '검토', width: '150px', render: (row) => (row.reviewedAt ? `${fmtDate(row.reviewedAt)} · ${esc(row.reviewer)}` : '<span class="muted">미검토</span>') },
          ],
          rows,
        }),
      })}
      ${notice('판정 변경(동일업체 확정 / 확인 필요 / 별도 업체)은 다음 단계에서 저장 기능과 함께 연결합니다.', 'info')}
    </div>`;
}

function uploadsSection() {
  return `
    <div class="stack">
      ${card({
        title: 'Excel 업로드 관리',
        actions: `<a class="btn btn-sm btn-primary" href="#/revenue/upload">새 업로드</a>`,
        flush: true,
        body: dataTable({
          columns: [
            { key: 'fileName', label: '파일명', render: (row) => `📄 ${esc(row.fileName)}` },
            { key: 'uploadedAt', label: '업로드일', width: '110px', render: (row) => fmtDate(row.uploadedAt) },
            { key: 'uploader', label: '업로더', width: '88px', render: (row) => esc(row.uploader) },
            { key: 'rows', label: '행 수', width: '72px', align: 'right', render: (row) => `${row.rows}` },
            { key: 'applied', label: '반영', width: '72px', align: 'right', render: (row) => `${row.applied}` },
            { key: 'skipped', label: '보류', width: '72px', align: 'right', render: (row) => `${row.skipped}` },
            { key: 'state', label: '상태', width: '96px', render: (row) => badge({ label: row.state, tone: row.state === '반영완료' ? 'green' : 'amber' }) },
            { key: 'actions', label: '', width: '108px', render: () => placeholderButton('상세 보기') },
          ],
          rows: mockUploadHistory,
        }),
      })}
      ${notice('업로드 이력·되돌리기(rollback) 기능은 데이터 계층 연결 후 구현합니다.', 'info')}
    </div>`;
}

function migrationSection() {
  return `
    <div class="stack">
      ${card({
        title: '데이터 이전',
        body: `
          ${notice('외부 데이터 반입 기능은 아직 구현하지 않았습니다. 이전 절차만 정의된 상태입니다.', 'warn')}
          <div style="margin-top:12px">
            ${deflist([
              ['1단계', '원본 파일 업로드 (업체 / 매출 / 실적 각각)'],
              ['2단계', '컬럼 매핑 — 원본 헤더 ↔ 시스템 필드'],
              ['3단계', '업체명 정규화 및 사업자번호 기준 매칭'],
              ['4단계', '중복검사 및 업체코드 부여'],
              ['5단계', 'Preview 검토 → 반영'],
            ])}
          </div>
          <div class="row" style="margin-top:14px">
            ${placeholderButton('업체 데이터 이전')}
            ${placeholderButton('매출 데이터 이전')}
            ${placeholderButton('실적 데이터 이전')}
          </div>`,
      })}
    </div>`;
}

function companyStateSection(rows, { title, desc, emptyText }) {
  return `
    <div class="stack">
      ${notice(desc, 'info')}
      ${card({
        title,
        subtitle: `${rows.length}개`,
        flush: true,
        body: rows.length ? dataTable({
          rowAction: 'openCompany',
          rowDataset: (company) => ({ id: company.id }),
          columns: [
            { key: 'name', label: '업체명', render: (company) => `<span class="cell-main">${esc(company.name)}</span>` },
            { key: 'code', label: '업체코드', width: '104px', render: (company) => codeChip(company.companyCode) },
            { key: 'bizNo', label: '사업자번호', width: '120px', render: (company) => `<span class="mono small">${esc(fmtBizNo(company.businessNumber))}</span>` },
            { key: 'status', label: '상태', width: '96px', render: (company) => badge(meta(COMPANY_STATUS, company.status), { dot: true }) },
            { key: 'updatedAt', label: '처리일', width: '104px', render: (company) => fmtDate(company.updatedAt) },
            { key: 'note', label: '사유 / 비고', render: (company) => esc(company.note || '—') },
            { key: 'actions', label: '', width: '150px', render: () => `${placeholderButton('복원')}${placeholderButton('영구 삭제', { variant: 'btn-danger' })}` },
          ],
          rows,
        }) : emptyState(emptyText),
      })}
    </div>`;
}

function settingsSection() {
  return `
    <div class="stack">
      ${card({
        title: '시스템 설정',
        body: deflist([
          ['제품명', 'B2B Partner Management / B2B 업체관리'],
          ['데이터 소스', `<span class="badge badge-amber">mock data (메모리)</span> — 외부 연결 없음`],
          ['업체코드 규칙', `<span class="mono">${esc(CODE_RULE.prefix)}</span> + ${CODE_RULE.digits}자리`],
          ['매출 관리 연도', '2024 / 2025 / 2026'],
          ['등록 업체 수', `${getListCompanies().length}개`],
          ['기준일', '2026.09.27 (mock 고정값)'],
        ]),
        foot: '사용자·권한·알림 설정은 다음 단계에서 추가합니다.',
      })}
      ${card({
        title: '설정 항목 (예정)',
        body: `<div class="row wrap" style="gap:6px">
          ${['사용자 관리', '권한 그룹', '알림 규칙', '질문지 템플릿', '매출유형 관리', '공종 관리', '지역 관리', '문서 분류 관리']
            .map((label) => `<span class="badge badge-outline">${esc(label)}</span>`).join('')}
        </div>`,
      })}
    </div>`;
}

export function adminPage(section) {
  const activeKey = ADMIN_SECTIONS.some((item) => item.key === section) ? section : uiState.adminSection;

  const bodies = {
    code: codeSection,
    duplicates: duplicatesSection,
    names: namesSection,
    uploads: uploadsSection,
    migration: migrationSection,
    deleted: () => companyStateSection(getDeletedCompanies(), {
      title: '삭제업체',
      desc: '삭제는 soft delete로 처리합니다. 데이터는 유지되며 목록에서만 제외됩니다. (삭제·복원 기능 미구현)',
      emptyText: '삭제된 업체가 없습니다',
    }),
    terminated: () => companyStateSection(getTerminatedCompanies(), {
      title: '종료업체',
      desc: '협약기간 만료 또는 중도 종료된 업체입니다. 이력과 매출은 그대로 보존됩니다.',
      emptyText: '협약종료 업체가 없습니다',
    }),
    settings: settingsSection,
  };

  return `
    <div class="page">
      ${pageHead({
        title: '관리',
        desc: '코드·중복·정합화·업로드·데이터 상태를 관리합니다.',
      })}
      <div class="stack">
        <div class="subtabs" style="border:1px solid var(--line-200);border-radius:var(--r-md)">
          ${ADMIN_SECTIONS.map((item) => `
            <a class="${cx('subtab', item.key === activeKey && 'is-active')}" href="#/admin/${item.key}">${esc(item.label)}</a>`).join('')}
        </div>
        ${(bodies[activeKey] || codeSection)()}
      </div>
    </div>`;
}
