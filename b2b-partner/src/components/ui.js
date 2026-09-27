/** 재사용 UI 조각 — 모두 HTML 문자열을 반환한다. */
import { esc, cx, list } from '../utils/dom.js';
import { num, wonShort } from '../utils/format.js';

/* ------------------------------- 배지 / 칩 ------------------------------- */

export function badge(metaObj, { dot = false, extraClass = '' } = {}) {
  if (!metaObj) return '';
  return `<span class="${cx('badge', `badge-${metaObj.tone}`, dot && 'badge-dot', extraClass)}">${esc(metaObj.label)}</span>`;
}

export function plainBadge(label, tone = 'gray') {
  return `<span class="badge badge-${tone}">${esc(label)}</span>`;
}

export function codeChip(code, { ghost = false } = {}) {
  if (!code) return '<span class="muted">—</span>';
  return `<span class="${cx('code-chip', ghost && 'ghost')}">${esc(code)}</span>`;
}

/* ------------------------------- 레이아웃 ------------------------------- */

export function pageHead({ title, desc = '', actions = '', breadcrumb = '' }) {
  return `
    <div class="page-head">
      <div class="titles">
        ${breadcrumb ? `<div class="breadcrumb">${breadcrumb}</div>` : ''}
        <h1>${esc(title)}</h1>
        ${desc ? `<div class="page-desc">${esc(desc)}</div>` : ''}
      </div>
      ${actions ? `<div class="actions">${actions}</div>` : ''}
    </div>`;
}

export function card({ title = '', subtitle = '', actions = '', body = '', foot = '', flush = false, className = '' }) {
  return `
    <section class="${cx('card', className)}">
      ${title ? `
        <div class="card-head">
          <h3>${esc(title)}</h3>
          ${subtitle ? `<span class="small muted">${esc(subtitle)}</span>` : ''}
          ${actions ? `<div class="head-actions">${actions}</div>` : ''}
        </div>` : ''}
      <div class="${cx('card-body', flush && 'flush')}">${body}</div>
      ${foot ? `<div class="card-foot">${foot}</div>` : ''}
    </section>`;
}

export function kpi({ label, value, unit = '', foot = '', accent = '', delta = null }) {
  const deltaHtml = delta === null || delta === undefined ? '' : `
    <span class="k-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(1)}%</span>`;
  return `
    <div class="${cx('kpi', accent && `accent-${accent}`)}">
      <span class="k-label">${esc(label)}</span>
      <span class="k-value">${value}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</span>
      <span class="k-foot">${foot} ${deltaHtml}</span>
    </div>`;
}

export function deflist(rows, { twoCol = false } = {}) {
  return `<dl class="${cx('deflist', twoCol && 'two-col')}">${
    rows.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${value ?? '<span class="muted">—</span>'}</dd>`).join('')
  }</dl>`;
}

export function notice(text, kind = '') {
  return `<div class="${cx('notice', kind)}">${text}</div>`;
}

export function emptyState(title, desc = '', action = '') {
  return `
    <div class="empty">
      <div class="e-title">${esc(title)}</div>
      ${desc ? `<div class="small">${esc(desc)}</div>` : ''}
      ${action ? `<div style="margin-top:12px">${action}</div>` : ''}
    </div>`;
}

/* ------------------------------- 수치 시각화 ------------------------------- */

export function meter(ratio, tone = '') {
  const width = Math.max(0, Math.min(1, ratio || 0)) * 100;
  return `<div class="meter ${tone}"><span style="width:${width.toFixed(1)}%"></span></div>`;
}

export function barList(rows, { formatter = (v) => num(v) } = {}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return `<div class="bars">${list(rows, (row) => `
    <div class="bar-row">
      <span class="b-label" title="${esc(row.label)}">${esc(row.label)}</span>
      ${meter(row.value / max, row.tone || '')}
      <span class="b-value">${formatter(row.value)}</span>
    </div>`)}</div>`;
}

/** 연도별 막대 (매출 변화) */
export function sparkColumns(rows, currentKey) {
  const max = Math.max(1, ...rows.map((row) => row.amount));
  return `<div class="spark">${list(rows, (row) => `
    <div class="sp-col ${row.year === currentKey ? 'is-current' : ''}">
      <span class="xs muted">${wonShort(row.amount)}</span>
      <span class="sp-bar" style="height:${((row.amount / max) * 100).toFixed(1)}%"></span>
      <span class="sp-label">${row.year}</span>
    </div>`)}</div>`;
}

/** 업로드 플로우 단계 표시 */
export function stepFlow(steps, activeKey) {
  const activeIndex = steps.findIndex((step) => step.key === activeKey);
  return `<div class="steps">${steps.map((step, index) => {
    const state = index < activeIndex ? 'is-done' : index === activeIndex ? 'is-active' : '';
    return `${index ? '<span class="step-arrow">→</span>' : ''}
      <span class="step ${state}"><span class="s-n">${index + 1}</span>${esc(step.label)}</span>`;
  }).join('')}</div>`;
}

/** 동작이 아직 연결되지 않은 버튼 자리 */
export function placeholderButton(label, { variant = '', size = 'btn-sm', title = '이번 단계에서는 동작하지 않습니다 (UI 자리)' } = {}) {
  return `<button type="button" class="${cx('btn', size, variant, 'is-placeholder')}" title="${esc(title)}" data-action="notImplemented" data-label="${esc(label)}">${esc(label)}</button>`;
}

export function selectField({ name, label, options, value = '', placeholder = '전체', hint = '', required = false, disabled = false }) {
  const opts = [
    placeholder !== null ? `<option value="">${esc(placeholder)}</option>` : '',
    ...options.map((option) => {
      const optionValue = option.value ?? option;
      const optionLabel = option.label ?? option;
      return `<option value="${esc(optionValue)}" ${String(optionValue) === String(value) ? 'selected' : ''}>${esc(optionLabel)}</option>`;
    }),
  ].join('');
  return `
    <div class="field">
      <label for="f-${esc(name)}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
      <select class="select" id="f-${esc(name)}" name="${esc(name)}" data-field="${esc(name)}" ${disabled ? 'disabled' : ''}>${opts}</select>
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>`;
}

export function inputField({ name, label, value = '', placeholder = '', hint = '', required = false, disabled = false, readonlyCode = false, span = false, type = 'text' }) {
  return `
    <div class="field ${span ? 'span-2' : ''}">
      <label for="f-${esc(name)}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
      <input class="input ${readonlyCode ? 'readonly-code' : ''}" type="${esc(type)}" id="f-${esc(name)}" name="${esc(name)}"
             data-field="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${disabled ? 'disabled' : ''}>
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>`;
}

export function textareaField({ name, label, value = '', placeholder = '', hint = '', span = true, rows = 3 }) {
  return `
    <div class="field ${span ? 'span-2' : ''}">
      <label for="f-${esc(name)}">${esc(label)}</label>
      <textarea class="textarea" id="f-${esc(name)}" name="${esc(name)}" data-field="${esc(name)}"
                rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>`;
}

/** 읽기 전용 값 표시 — 입력창이 아니라 라벨/값 행으로 보여준다 */
export function readonlyField({ label, value, span = false, hint = '' }) {
  return `
    <div class="rofield ${span ? 'span-2' : ''}">
      <span class="ro-label">${esc(label)}</span>
      <div>
        <div class="ro-value ${value ? '' : 'is-empty'}">${value ? esc(value) : '—'}</div>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>
    </div>`;
}
