/** MOU — 상태별 현황과 협약 목록. */
import { esc } from '../utils/dom.js';
import { pageHead, card, kpi, badge, placeholderButton, barList } from '../components/ui.js';
import { dataTable } from '../components/table.js';
import { companyNameCell, companyCodeCell } from '../components/companyBits.js';
import { getListCompanies } from '../services/companyService.js';
import { mouConversion } from '../services/analyticsService.js';
import { MOU_STATUS, meta } from '../data/constants.js';
import { num, percent, date as fmtDate } from '../utils/format.js';
import { uiState } from '../services/uiState.js';

export function mouPage() {
  const companies = getListCompanies();
  const filter = uiState.mouStatusFilter;
  const rows = (filter ? companies.filter((company) => (company.mou?.status || 'NONE') === filter) : companies)
    .slice()
    .sort((a, b) => (b.mou?.signedDate || '').localeCompare(a.mou?.signedDate || ''));
  const conversion = mouConversion();
  const countOf = (key) => companies.filter((company) => (company.mou?.status || 'NONE') === key).length;

  return `
    <div class="page">
      ${pageHead({
        title: 'MOU',
        desc: '협약 상태·기간·관련 특허/현장을 관리합니다.',
        actions: `${placeholderButton('협약 문서 업로드')}${placeholderButton('MOU 등록', { variant: 'btn-primary', size: '' })}`,
      })}

      <div class="stack">
        <div class="grid grid-kpi">
          ${kpi({ label: 'MOU 체결', value: num(conversion.signed), unit: '개', foot: `전체 대비 ${percent(conversion.signedRate)}`, accent: 'green' })}
          ${kpi({ label: '진행중', value: num(conversion.progress), unit: '개', accent: 'amber' })}
          ${kpi({ label: '미체결', value: num(countOf('NONE')), unit: '개', accent: '' })}
          ${kpi({ label: '종료', value: num(conversion.ended), unit: '개', accent: 'navy' })}
          ${kpi({ label: '2차 미팅 → 체결 전환율', value: percent(conversion.secondToSignedRate), accent: 'blue' })}
        </div>

        <div class="grid grid-2">
          ${card({
            title: '상태 분포',
            body: barList(Object.values(MOU_STATUS).map((statusMeta) => ({
              label: statusMeta.label, value: countOf(statusMeta.key),
            })), { formatter: (value) => `${value}개` }),
          })}
          ${card({
            title: '상태 필터',
            body: `
              <div class="row wrap" style="gap:6px">
                <button type="button" class="btn btn-sm ${filter ? '' : 'is-active'}" data-action="mouStatus" data-status="">전체 ${companies.length}</button>
                ${Object.values(MOU_STATUS).map((statusMeta) => `
                  <button type="button" class="btn btn-sm ${filter === statusMeta.key ? 'is-active' : ''}" data-action="mouStatus" data-status="${statusMeta.key}">
                    ${esc(statusMeta.label)} ${countOf(statusMeta.key)}</button>`).join('')}
              </div>`,
          })}
        </div>

        ${card({
          title: 'MOU 목록',
          subtitle: `${rows.length}개`,
          flush: true,
          body: dataTable({
            compact: true,
            rowAction: 'openCompanyTab',
            rowDataset: (company) => ({ id: company.id, tab: 'mou' }),
            columns: [
              { key: 'name', label: '업체명', render: companyNameCell },
              { key: 'code', label: '업체코드', width: '96px', render: companyCodeCell },
              { key: 'status', label: 'MOU 상태', width: '88px', render: (company) => badge(meta(MOU_STATUS, company.mou?.status || 'NONE')) },
              { key: 'signedDate', label: '체결일', width: '104px', render: (company) => fmtDate(company.mou?.signedDate) },
              { key: 'period', label: '협약기간', width: '188px', render: (company) => (company.mou?.periodFrom ? `${fmtDate(company.mou.periodFrom)} ~ ${fmtDate(company.mou.periodTo)}` : '<span class="muted">—</span>') },
              { key: 'owner', label: '담당자', width: '88px', render: (company) => esc(company.mou?.owner || '—') },
              { key: 'patents', label: '관련 특허번호', render: (company) => ((company.mou?.patentNumbers || []).length ? company.mou.patentNumbers.map((patent) => `<span class="badge badge-outline mono">${esc(patent)}</span>`).join(' ') : '<span class="muted">—</span>') },
              { key: 'sites', label: '관련 현장', width: '160px', render: (company) => ((company.mou?.relatedSites || []).length ? `${esc(company.mou.relatedSites[0])}${company.mou.relatedSites.length > 1 ? ` 외 ${company.mou.relatedSites.length - 1}` : ''}` : '<span class="muted">—</span>') },
              { key: 'docs', label: '문서', width: '64px', align: 'right', render: (company) => `${(company.mou?.documents || []).length}건` },
            ],
            rows,
          }),
        })}
      </div>
    </div>`;
}
