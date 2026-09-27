/** 업체 상세 > 영업진행 — 단계 timeline (전환 로직 없음) */
import { card, placeholderButton, notice, badge } from '../../components/ui.js';
import { stageFlow } from '../../components/timeline.js';
import { dataTable } from '../../components/table.js';
import { SALES_STAGE, MEETING_STATUS, meta } from '../../data/constants.js';
import { esc } from '../../utils/dom.js';
import { date as fmtDate } from '../../utils/format.js';

export function salesTab(company) {
  return `
    <div class="stack">
      ${card({
        title: '영업 진행단계',
        subtitle: '신규접촉 → 상담 → 1차 미팅 → 2차 미팅 → MOU 진행 → MOU 체결',
        actions: `${placeholderButton('단계 변경')}${placeholderButton('일정 등록')}`,
        body: `
          <div class="row" style="margin-bottom:12px">
            <span class="small muted">현재 단계</span>
            ${badge(meta(SALES_STAGE, company.salesStage))}
          </div>
          ${stageFlow(company)}`,
      })}
      ${card({
        title: '단계별 상세',
        flush: true,
        body: dataTable({
          compact: true,
          columns: [
            { key: 'stage', label: '단계', width: '120px', render: (step) => `<span class="strong">${esc(meta(SALES_STAGE, step.stage).label)}</span>` },
            { key: 'status', label: '상태', width: '88px', render: (step) => badge(meta(MEETING_STATUS, step.status || 'NONE')) },
            { key: 'plannedAt', label: '예정일', width: '104px', render: (step) => fmtDate(step.plannedAt) },
            { key: 'completedAt', label: '완료일', width: '104px', render: (step) => fmtDate(step.completedAt) },
            { key: 'owner', label: '담당자', width: '96px', render: (step) => esc(step.owner || '—') },
            { key: 'memo', label: '메모', render: (step) => esc(step.memo || '—') },
          ],
          rows: company.salesPipeline || [],
        }),
      })}
      ${notice('단계 전환(자동 승격) 로직은 구현하지 않았습니다. 단계 데이터 구조와 표시만 확정된 상태입니다.', 'info')}
    </div>`;
}
