/** 업체 상세 > 기본정보 (+ 업체명 정합화 요약) */
import { esc } from '../../utils/dom.js';
import { card, deflist, badge, codeChip, placeholderButton, notice } from '../../components/ui.js';
import { COMPANY_TYPE, COMPANY_STATUS, NAME_MATCH_STATUS, meta } from '../../data/constants.js';
import { businessNumber as fmtBizNo, date as fmtDate } from '../../utils/format.js';

export function basicTab(company) {
  const reconciliation = company.nameReconciliation || {};
  const chips = (values) => (values && values.length
    ? values.map((value) => `<span class="badge badge-outline">${esc(value)}</span>`).join(' ')
    : '<span class="muted">—</span>');

  return `
    <div class="stack">
      <div class="grid grid-2">
        ${card({
          title: '기본정보',
          actions: placeholderButton('정보 수정'),
          body: deflist([
            ['업체명', `<span class="strong">${esc(company.name)}</span>`],
            ['업체코드', codeChip(company.companyCode)],
            ['사업자번호', `<span class="mono">${esc(fmtBizNo(company.businessNumber))}</span>`],
            ['대표자', esc(company.representative || '—')],
            ['담당자', esc(company.contactName || '—')],
            ['전화번호', esc(company.phone || '—')],
            ['이메일', company.email ? `<a href="mailto:${esc(company.email)}">${esc(company.email)}</a>` : '—'],
            ['주소', esc(company.address || '—')],
            ['지역', esc(company.region || '—')],
            ['업체유형', badge(meta(COMPANY_TYPE, company.companyType))],
            ['상태', badge(meta(COMPANY_STATUS, company.status), { dot: true })],
            ['비고', esc(company.note || '—')],
          ]),
        })}
        <div class="stack-sm">
          ${card({
            title: '업체명 정합화',
            subtitle: '동일업체 판정 기준',
            actions: `<a class="btn btn-sm" href="#/admin/names">관리 화면</a>`,
            body: `
              ${deflist([
                ['현재 업체명', esc(company.name)],
                ['정규화 업체명', `<span class="mono small">${esc(company.normalizedName)}</span>`],
                ['사업자번호', `<span class="mono">${esc(fmtBizNo(company.businessNumber))}</span>`],
                ['구상호', chips(company.formerNames)],
                ['별칭', chips(company.aliases)],
                ['과거표기', chips([...(company.formerNames || []), ...(company.aliases || [])])],
                ['판정상태', badge(meta(NAME_MATCH_STATUS, reconciliation.status || 'CHECK'))],
                ['검토', reconciliation.reviewedAt ? `${fmtDate(reconciliation.reviewedAt)} · ${esc(reconciliation.reviewer || '')}` : '<span class="muted">미검토</span>'],
              ])}
              <div style="margin-top:12px" class="row">
                ${placeholderButton('동일업체 확정')}
                ${placeholderButton('별도 업체로 분리')}
              </div>`,
          })}
          ${card({
            title: '이력',
            body: deflist([
              ['등록일', fmtDate(company.createdAt)],
              ['최근 수정', fmtDate(company.updatedAt)],
              ['삭제 여부', company.deleted ? badge({ label: '삭제됨(soft delete)', tone: 'red' }) : '<span class="muted">정상</span>'],
            ]),
            foot: '삭제는 soft delete로 처리되며, 실제 데이터는 유지됩니다. (삭제 기능 미구현)',
          })}
        </div>
      </div>
      ${notice('이 화면의 모든 값은 읽기 전용입니다. 저장·수정 기능은 다음 단계에서 연결합니다.', 'info')}
    </div>`;
}
