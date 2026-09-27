/** 모달 셸 + 전역 모달 컨트롤러. */
import { esc, cx } from '../utils/dom.js';

let container = null;

export function initModalHost(element) {
  container = element;
  container.addEventListener('click', (event) => {
    if (event.target === container) closeModal();
    if (event.target.closest('[data-action="closeModal"]')) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

export function openModal(html) {
  if (!container) return;
  container.innerHTML = html;
  container.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusable = container.querySelector('input, select, textarea, button');
  if (focusable) focusable.focus();
}

export function closeModal() {
  if (!container) return;
  container.innerHTML = '';
  container.hidden = true;
  document.body.style.overflow = '';
}

export function isModalOpen() {
  return Boolean(container && !container.hidden);
}

export function modalShell({ title, subtitle = '', body, foot = '', wide = false }) {
  return `
    <div class="modal-backdrop">
      <div class="${cx('modal', wide && 'wide')}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          ${subtitle ? `<span class="small muted">${esc(subtitle)}</span>` : ''}
          <button type="button" class="btn btn-sm close" data-action="closeModal" aria-label="닫기">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`;
}
