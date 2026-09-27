/** 업체 상세 > 활동이력 */
import { card, placeholderButton, emptyState, badge } from '../../components/ui.js';
import { activityTimeline } from '../../components/timeline.js';
import { ACTIVITY_TYPE } from '../../data/constants.js';

export function activitiesTab(company) {
  const activities = (company.activities || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const counts = {};
  for (const activity of activities) counts[activity.type] = (counts[activity.type] || 0) + 1;

  return `
    <div class="stack">
      ${card({
        title: '활동이력',
        subtitle: `${activities.length}건 누적`,
        actions: placeholderButton('활동 등록', { variant: 'btn-primary' }),
        body: `
          <div class="row wrap" style="margin-bottom:14px;gap:6px">
            ${Object.values(ACTIVITY_TYPE).map((type) => `
              <span class="badge ${counts[type.key] ? `badge-${type.tone}` : 'badge-outline'}">
                ${type.label}${counts[type.key] ? ` ${counts[type.key]}` : ''}
              </span>`).join('')}
          </div>
          ${activities.length ? activityTimeline(activities) : emptyState('활동 이력이 없습니다', '전화·미팅·자료요청 등 모든 접촉을 누적합니다.')}`,
      })}
    </div>`;
}
