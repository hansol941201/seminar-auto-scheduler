/** 지도 — placeholder. 실제 지도 SDK는 다음 단계에서 연결한다. */
import { esc } from '../utils/dom.js';
import { pageHead, card, notice, badge, barList, placeholderButton } from '../components/ui.js';
import { getListCompanies } from '../services/companyService.js';
import { regionDistribution, sitesByRegion } from '../services/analyticsService.js';
import { COMPANY_TYPE, meta } from '../data/constants.js';
import { uiState } from '../services/uiState.js';

/** 시공실적 핀은 업체 좌표 주변에 분산 배치한 가상 좌표를 사용한다. */
function sitePins(companies) {
  const pins = [];
  companies.forEach((company) => {
    (company.performances || []).forEach((performance, index) => {
      pins.push({
        label: performance.siteName,
        x: Math.min(96, Math.max(4, company.mapPoint.x + ((index % 3) - 1) * 4)),
        y: Math.min(94, Math.max(6, company.mapPoint.y + (index % 2 ? 5 : -5))),
      });
    });
  });
  return pins;
}

export function mapPage() {
  const companies = getListCompanies();
  const layer = uiState.mapLayer;
  const pins = layer === 'sites' ? sitePins(companies) : companies.map((company) => ({
    label: `${company.name} (${company.companyCode})`,
    x: company.mapPoint.x, y: company.mapPoint.y,
  }));

  return `
    <div class="page">
      ${pageHead({
        title: '지도',
        desc: '업체 위치와 시공실적 위치를 지도에서 확인합니다. (지도 SDK 미연결)',
        actions: placeholderButton('현재 지역으로 이동'),
      })}

      <div class="stack">
        ${notice('실제 지도 연동(좌표 지오코딩, 지도 SDK, 클러스터링)은 다음 단계 작업입니다. 현재는 배치 구조와 레이어 전환만 확인할 수 있습니다.', 'warn')}

        <div class="toolbar">
          <span class="small muted">레이어</span>
          <div class="btn-group">
            <button type="button" class="btn btn-sm ${layer === 'companies' ? 'is-active' : ''}" data-action="mapLayer" data-layer="companies">업체 위치</button>
            <button type="button" class="btn btn-sm ${layer === 'sites' ? 'is-active' : ''}" data-action="mapLayer" data-layer="sites">시공실적 위치</button>
          </div>
          <span class="sep"></span>
          ${placeholderButton('근처 업체 찾기')}
          ${placeholderButton('근처 현장 찾기')}
          ${placeholderButton('지역분포 보기')}
          <span class="spacer"></span>
          <span class="filter-summary">${pins.length}개 지점</span>
        </div>

        <div class="map-canvas">
          <div class="map-overlay">
            <div class="strong small">범례</div>
            <div class="row small" style="margin-top:6px"><span class="map-pin" style="position:static"><span class="p-dot"></span></span> 업체 위치</div>
            <div class="row small" style="margin-top:4px"><span class="map-pin type-site" style="position:static"><span class="p-dot"></span></span> 시공실적 위치</div>
            <div class="small muted" style="margin-top:8px">좌표는 가상값입니다.</div>
          </div>
          ${pins.map((pin) => `
            <div class="map-pin ${layer === 'sites' ? 'type-site' : ''}" style="left:${pin.x}%;top:${pin.y}%">
              <span class="p-label">${esc(pin.label)}</span>
              <span class="p-dot"></span>
            </div>`).join('')}
        </div>

        <div class="grid grid-2">
          ${card({
            title: '지역별 업체 분포',
            body: barList(regionDistribution().map((row) => ({ label: row.region, value: row.count })), { formatter: (value) => `${value}개` }),
          })}
          ${card({
            title: '지역별 현장 분포',
            body: barList(sitesByRegion().map((row) => ({ label: row.region, value: row.count })), { formatter: (value) => `${value}건` }),
          })}
        </div>

        ${card({
          title: '지점 목록',
          body: `<div class="row wrap" style="gap:6px">${companies.map((company) => `
            <a class="badge badge-outline" href="#/companies/${company.id}">
              ${esc(company.name)} · ${esc(company.region)} · ${esc(meta(COMPANY_TYPE, company.companyType).label)}
            </a>`).join('')}</div>`,
        })}
      </div>
    </div>`;
}
