/**
 * 아주 얇은 렌더링 유틸.
 * 각 페이지는 HTML 문자열을 반환하고, 상호작용은 data-action 위임으로 처리한다.
 * (프레임워크 도입 시에도 페이지/컴포넌트 경계는 그대로 유지된다.)
 */

/** 사용자 입력·mock 문자열을 안전하게 삽입 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 조건부 클래스 이름 조합 */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** 배열 → HTML 문자열 */
export function list(items, renderer) {
  return items.map(renderer).join('');
}

/** 값이 없을 때 대체 표기 */
export function dash(value, placeholder = '—') {
  if (value === null || value === undefined || value === '') return placeholder;
  return esc(value);
}

export function mount(root, html) {
  root.innerHTML = html;
  root.scrollTop = 0;
}

/** 클릭 위임: [data-action] 요소를 찾아 핸들러 맵으로 전달 */
export function delegateClick(root, handlers) {
  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    const handler = handlers[target.dataset.action];
    if (!handler) return;
    event.preventDefault();
    handler(target.dataset, target, event);
  });
}

/** input/change 위임 */
export function delegateInput(root, handlers, eventName = 'input') {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest('[data-field]');
    if (!target) return;
    const handler = handlers[target.dataset.field];
    if (handler) handler(target.value, target);
  });
}
