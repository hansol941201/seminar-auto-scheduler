/**
 * 매출 Excel 업로드 화면 (UI만).
 * 파일 선택 → 분석 → Preview → 확인 → 반영
 */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, notice, stepFlow, placeholderButton, emptyState } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import {
  UPLOAD_STEPS, analyze, summarize, applyTargets, holdTargets,
} from '../services/uploadService.js';
import { UPLOAD_ROW_STATUS, REVENUE_TYPE, meta } from '../data/constants.js';
import { won, date as fmtDate } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

function selectStep() {
  return card({
    title: '1. 파일 선택',
    body: `
      <div class="dropzone">
        <div class="strong">매출 Excel 파일을 선택하세요</div>
        <div class="small muted" style="margin:6px 0 14px">.xlsx / .xls · 시트 1개 기준 · 대상연도 2026</div>
        <button type="button" class="btn btn-primary" data-action="uploadNext" data-step="analyze">파일 선택 (샘플 불러오기)</button>
        <div class="small muted" style="margin-top:10px">실제 파일 파싱은 연결되지 않았습니다. 버튼을 누르면 고정된 샘플 분석 결과가 표시됩니다.</div>
      </div>`,
  });
}

function analyzeStep(file) {
  return card({
    title: '2. 분석',
    body: `
      <div class="grid grid-4">
        ${kpi({ label: '파일명', value: `<span style="font-size:var(--fs-md)">${esc(file.fileName)}</span>`, accent: 'navy' })}
        ${kpi({ label: '시트', value: `<span style="font-size:var(--fs-md)">${esc(file.sheetName)}</span>` })}
        ${kpi({ label: '행 수', value: file.rowCount, unit: '행', accent: 'blue' })}
        ${kpi({ label: '대상연도', value: file.targetYear, accent: 'amber' })}
      </div>
      <div class="row" style="margin-top:14px">
        ${notice(`분석 완료 · ${esc(file.analyzedAt)} 기준. 업체 매칭은 사업자번호 → 정규화 업체명 → 별칭/구상호 순으로 시도합니다.`, 'info')}
      </div>
      <div class="row" style="margin-top:14px">
        <button type="button" class="btn" data-action="uploadNext" data-step="select">← 파일 다시 선택</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-action="uploadNext" data-step="preview">Preview 보기 →</button>
      </div>`,
  });
}

function previewTable(rows) {
  return dataTable({
    compact: true,
    columns: [
      { key: 'line', label: '행', width: '48px', align: 'right', render: (row) => row.line },
      { key: 'issuedAt', label: '발행일', width: '100px', render: (row) => (row.issuedAt ? fmtDate(row.issuedAt) : '<span class="badge badge-amber">없음</span>') },
      { key: 'rawCompanyName', label: '파일 업체명', render: (row) => esc(row.rawCompanyName) },
      { key: 'matchedCode', label: '매칭 코드', width: '96px', render: (row) => (row.matchedCode ? `<span class="mono small">${esc(row.matchedCode)}</span>` : '<span class="muted">미매칭</span>') },
      { key: 'siteName', label: '현장명', render: (row) => esc(row.siteName) },
      { key: 'type', label: '유형', width: '96px', render: (row) => badge(meta(REVENUE_TYPE, row.type)) },
      { key: 'amount', label: '금액', width: '124px', align: 'right', render: (row) => won(row.amount) },
      { key: 'status', label: '판정', width: '124px', render: (row) => badge(meta(UPLOAD_ROW_STATUS, row.status)) },
      { key: 'reason', label: '판정 사유', render: (row) => `<span class="small muted">${esc(row.reason)}</span>` },
    ],
    rows,
  });
}

function previewStep(rows) {
  const summary = summarize(rows);
  return `
    <div class="stack">
      ${card({
        title: '3. Preview',
        subtitle: `${rows.length}행 판정 완료`,
        actions: placeholderButton('상태별 필터'),
        body: `
          <div class="row wrap" style="gap:6px">
            ${summary.map((row) => `${badge(meta(UPLOAD_ROW_STATUS, row.status))} <span class="small">${row.count}건</span>`).join(' &nbsp; ')}
          </div>
          <div style="margin-top:12px">
            ${notice(`반영 대상은 <b>신규</b>·<b>수정 후보</b>이며(${applyTargets(rows).length}건), 나머지 ${holdTargets(rows).length}건은 확인 후 개별 처리합니다.`, 'warn')}
          </div>`,
      })}
      ${card({ flush: true, body: previewTable(rows) })}
      <div class="row">
        <button type="button" class="btn" data-action="uploadNext" data-step="analyze">← 분석 결과</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-action="uploadNext" data-step="confirm">확인 단계로 →</button>
      </div>
    </div>`;
}

function confirmStep(rows) {
  const apply = applyTargets(rows);
  const hold = holdTargets(rows);
  return `
    <div class="stack">
      ${card({
        title: '4. 확인',
        body: `
          <div class="grid grid-3">
            ${kpi({ label: '반영 대상', value: apply.length, unit: '건', foot: won(apply.reduce((sum, row) => sum + row.amount, 0)), accent: 'green' })}
            ${kpi({ label: '보류', value: hold.length, unit: '건', foot: '확인 후 개별 처리', accent: 'amber' })}
            ${kpi({ label: '전체', value: rows.length, unit: '건', accent: 'navy' })}
          </div>
          <div style="margin-top:14px">
            ${notice('반영을 실행하면 매출 데이터가 갱신됩니다. 이번 단계에서는 반영 처리가 연결되지 않았습니다.', 'warn')}
          </div>
          <div class="row" style="margin-top:14px">
            <button type="button" class="btn" data-action="uploadNext" data-step="preview">← Preview</button>
            <span class="spacer"></span>
            ${placeholderButton('반영 실행', { variant: 'btn-primary', size: '' })}
          </div>`,
      })}
      ${card({
        title: '보류 목록',
        flush: true,
        body: hold.length ? previewTable(hold) : emptyState('보류 건이 없습니다'),
      })}
    </div>`;
}

export function revenueUploadPage() {
  const step = uiState.uploadStep;
  const { file, rows } = analyze();

  const bodyByStep = {
    select: selectStep(),
    analyze: analyzeStep(file),
    preview: previewStep(rows),
    confirm: confirmStep(rows),
    apply: card({ title: '5. 반영', body: notice('반영 처리는 아직 연결되지 않았습니다.', 'warn') }),
  };

  return `
    <div class="page">
      ${pageHead({
        title: '매출 Excel 업로드',
        breadcrumb: `<a href="#/revenue">매출</a> <span>›</span> <span>Excel 업로드</span>`,
        desc: '파일 선택 → 분석 → Preview → 확인 → 반영',
      })}
      <div class="stack">
        ${card({ body: stepFlow(UPLOAD_STEPS, step) })}
        ${bodyByStep[step] || bodyByStep.select}
      </div>
    </div>`;
}
