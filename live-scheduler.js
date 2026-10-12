'use strict';
const Core=SchedulerCore;
const SOURCE='https://test-168a4-default-rtdb.asia-southeast1.firebasedatabase.app';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const today=()=>Core.seoulDate();
let saved={};try{saved=JSON.parse(localStorage.getItem('seminarLiveV1')||'{}');}catch{}
const live={seminarPeriod:saved.seminarPeriod||null,roster:[],events:[],months:[],mapping:saved.mapping||{},mappingMeta:saved.mappingMeta||{},vacationPolicy:saved.vacationPolicy||{enabled:false},confirmed:saved.confirmed||[],proposals:[],last:0,state:'미연결',error:'',raw:null,busy:false,dirty:false,streams:[],vacationSync:null,vacationHealth:{fresh:false,errors:['미조회'],months:[],available:[],missing:[]},changes:0,travelSettings:{sameRegionMinutes:45,routes:[],...saved.travelSettings,bufferMinutes:saved.travelSettings?.bufferMinutes??15}};
const Shared=SharedClient;
function captureState(){return JSON.parse(JSON.stringify({seminarPeriod:live.seminarPeriod,mapping:live.mapping,mappingMeta:live.mappingMeta,vacationPolicy:live.vacationPolicy,confirmed:live.confirmed,companies,travelSettings:live.travelSettings}));}
function applyState(state){live.seminarPeriod=state.seminarPeriod||null;renderPeriodFields();companies.splice(0,companies.length,...state.companies);live.mapping=state.mapping;live.mappingMeta=state.mappingMeta||{};live.vacationPolicy=state.vacationPolicy||{enabled:false};live.confirmed=state.confirmed;live.travelSettings={...state.travelSettings,bufferMinutes:state.travelSettings.bufferMinutes??15};for(const [id,value] of [['sameRegion',live.travelSettings.sameRegionMinutes],['bufferMinutes',live.travelSettings.bufferMinutes],['routeSettings',JSON.stringify(live.travelSettings.routes,null,2)],['noVacationStart',Core.operationPeriodDraft(live.vacationPolicy).startDate],['noVacationEnd',live.vacationPolicy.endDate||'']]){const field=document.getElementById(id);if(field)field.value=value;}const enabled=document.getElementById('noVacation');if(enabled)enabled.checked=live.vacationPolicy.enabled===true;}
function canWrite(){if(Shared.active&&(Shared.busy||Shared.member?.role!=='admin')){alert('공용 저장은 로그인한 관리자만 사용할 수 있습니다. 진행 중인 저장이 있다면 기다려주세요.');return false;}return true;}
const demoCompanies=companies.map(c=>({...c,testData:true}));
const demoEvents=events.map(e=>({...e,testData:true}));
function regionOf(address){const m=String(address||'').match(/(?:^|\s)([가-힣]+(?:시|군|구))(?=\s|$)/g);return m?.map(x=>x.trim()).join(' ')||null;}
function travelEstimate(a,b){const from=regionOf(a.address),to=regionOf(b.address);if(!from||!to)return null;const minutes=from===to?live.travelSettings.sameRegionMinutes:live.travelSettings.routes.find(r=>r.from===from&&r.to===to)?.minutes;return Number.isFinite(minutes)?{minutes,estimated:true}:null;}
companies.splice(0,companies.length,...(saved.companies||[]));events.splice(0);staff=[];
async function persistLive(approval={}){try{if(Shared.active){await Shared.save(captureState(),approval);applyState(Shared.state);}else localStorage.setItem('seminarLiveV1',JSON.stringify(captureState()));return true;}catch(e){if(Shared.active&&Shared.state)applyState(Shared.state);rebuildProposals();renderAll();alert(e.message+'\n변경을 완료하지 못했습니다. 최신 상태를 확인하세요.');return false;}}
function context(){return {seminarPeriod:live.seminarPeriod,vacationPolicy:live.vacationPolicy,bufferMinutes:live.travelSettings.bufferMinutes,region:regionOf,travel:travelEstimate,events:live.events,months:live.months,linkedIds:[...new Set(Object.values(Core.verifiedMapping(live.roster,live.events,live.mapping,live.mappingMeta)))],fresh:live.state==='동기화 성공'&&Date.now()-live.last<90000,vacationFresh:live.vacationHealth.fresh&&Number.isFinite(Date.parse(live.vacationSync))&&Date.now()-Date.parse(live.vacationSync)<36*3600000};}
async function read(path){const r=await fetch(SOURCE+'/'+path,{cache:'no-store',signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('일정 조회 실패 ('+r.status+')');return r.json();}
async function syncNow(){
 if(live.busy){live.dirty=true;return false;}live.busy=true;live.state='동기화 중';drawStatus();
 const revision=live.revision||0;
 const generation=live.modeGeneration||0;
 try{
  const normalized=Shared.active?await Shared.snapshot():await SourceReader.snapshot({previousRaw:live.raw,mapping:live.mapping,mappingMeta:live.mappingMeta});
  if(generation!==(live.modeGeneration||0)){live.dirty=true;return false;}
  const before=new Map(live.events.map(e=>[e.id,JSON.stringify(e)]));
  live.changes=normalized.events.filter(e=>before.get(e.id)!==JSON.stringify(e)).length+live.events.filter(e=>!normalized.events.some(n=>n.id===e.id)).length;
  Object.assign(live,{...normalized,last:Date.now(),state:'동기화 성공',error:''});
  if(revision!==(live.revision||0)){live.state='변경 확인 중';live.dirty=true;}
  rebuildProposals();renderAll();return live.state==='동기화 성공';
 }catch(e){live.state='동기화 실패';live.error=e.message;live.proposals=[];renderAll();return false;}
 finally{live.busy=false;drawStatus();if(live.dirty){live.dirty=false;queueMicrotask(syncNow);}}
}
let debounce;
function startStreams(){
 if(Shared.active)return;
 if(!window.firebase){live.error='변경 알림 모듈 로드 실패 · 60초 주기 조회 사용';drawStatus();return;}
 const reader=(firebase.apps.find(a=>a.name==='seminar-read-only')||firebase.initializeApp({databaseURL:SOURCE},'seminar-read-only')).database();
 for(const path of [...Core.paths,'hiworks_vacation_sync/data','hiworks_vacation_sync/meta']){
  const stream=reader.ref(path);
  const changed=()=>{live.revision=(live.revision||0)+1;live.state='변경 확인 중';drawStatus();clearTimeout(debounce);debounce=setTimeout(syncNow,800);};
  stream.on('value',changed,()=>{if(path.includes('vacation')){live.vacationHealth.fresh=false;live.vacationHealth.errors=['휴가 변경 알림 권한 확인 필요'];}else{live.state='동기화 실패';live.error='원본 읽기 권한 변경';}drawStatus();});live.streams.push(stream);
 }
}
function rebuildProposals(){live.proposals=Shared.active&&Shared.member?.role!=='admin'?[]:Core.plan(companies,live.roster,context(),live.confirmed);}
function renderAssessments(){
 const node=document.getElementById('assessmentList');if(!node)return;node.replaceChildren();
 for(const c of companies.filter(c=>c.status!=='X'&&!live.confirmed.some(e=>e.companyId===c.id))){
  const proposal=live.proposals.find(e=>e.companyId===c.id);let result=proposal?{status:proposal.assessment,reasons:proposal.warnings}:null;
  if(!result){const checks=[];for(const date of c.preferences||[])for(const p of live.roster.filter(p=>!c.fixedStaffId||p.id===c.fixedStaffId))for(const start of c.slots||[])checks.push(Core.check({date,start,end:start+c.duration,address:c.address,fixedStaffId:c.fixedStaffId},p,context(),live.confirmed));result=checks.find(r=>r.ok)||checks.find(r=>r.status==='확인 필요')||checks[0]||{status:'확인 필요',reasons:['담당자·희망일자 확인 필요']};if(result.ok)result={status:'조건부 가능',reasons:['다른 업체와 배정 경합 · 현재 최적화안에 포함되지 않음']};}
  const row=document.createElement('p');row.textContent=c.name+' · '+result.status+' · '+result.reasons.join(' / ');node.append(row);
 }
}
function sourceName(id){return live.roster.find(p=>p.id===id)?.name||id;}
function conflicts(){if(Shared.active&&Shared.member?.role!=='admin')return [];return live.confirmed.map(e=>({event:e,result:Core.check(e,live.roster.find(p=>p.id===e.staffId),context(),live.confirmed)})).filter(x=>!x.result.ok);}
function drawStatus(){
 const node=document.getElementById('liveStatus');if(!node)return;
 node.textContent=live.state+' · 마지막 성공 '+(live.last?new Date(live.last).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'없음')+(live.error?' · '+live.error:'');
 document.getElementById('syncNow').disabled=live.busy;
 document.querySelectorAll('[data-confirm]').forEach(b=>b.disabled=!context().fresh);
 const policyStatus=document.getElementById('vacationPolicyStatus');const dateNode=document.getElementById('operationToday');if(dateNode)dateNode.textContent='현재 날짜: '+today()+' · 한국시간 (Asia/Seoul)';if(policyStatus)policyStatus.textContent=Core.vacationException(live.vacationPolicy,live.vacationPolicy.startDate)?'휴가 미사용 기간 적용 중 ('+live.vacationPolicy.startDate+' ~ '+live.vacationPolicy.endDate+')':'휴가 예외 미적용 · 휴가 최신성 검증 적용';
}
function renderAll(){
 renderPartners();renderSchedule();renderStaff();renderAssessments();prepareRequestForm();drawStatus();renderPeriodStatus();
 const kpis=[['전체 담당자',live.roster.length],['오늘 기존 일정',live.events.filter(e=>e.date===today()).length],['배정 가능한 담당자',new Set(live.proposals.map(e=>e.staffId)).size],['세미나 확정 / 제안',live.confirmed.length+' / '+live.proposals.length],['충돌 / 검증 필요',conflicts().length],['마지막 동기화',live.last?new Date(live.last).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'}):'미연결']];
 document.getElementById('liveKpis').innerHTML=kpis.map(([k,v])=>`<div class="kpi"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
 document.getElementById('liveSummary').textContent=`기존 일정 ${live.events.length}건 · 이번 변경 ${live.changes}건 · 담당자 미연결 ${live.events.filter(e=>e.unresolved).length}건 · 종료시간 미확인 ${live.events.filter(e=>e.unknownTime).length}건. 배정 가능 인원은 현재 신청의 검증된 제안 기준입니다.`;
 const sharing=document.getElementById('sharingStatus');if(sharing)sharing.textContent=Shared.active?'공용 저장소 연결 · '+(Shared.member.role==='admin'?'관리자':'직원 · 내 일정')+' · 버전 '+Shared.version+(Shared.error?' · '+Shared.error:''):'브라우저별 저장 모드 · 공용 서버 미연결';
 const target=document.getElementById('liveConflicts');target.replaceChildren();
 for(const {event,result} of conflicts()){
  const box=document.createElement('div');box.className='notice';
  const label=document.createElement('p');label.textContent=`${companies.find(c=>c.id===event.companyId)?.name||event.companyId} · ${event.date} ${fmt(event.start)} · ${sourceName(event.staffId)}: ${result.reasons.join(' / ')}`;box.append(label);
  const affected=live.events.filter(e=>(!e.date||e.date===event.date)&&(e.unresolved||e.staffIds.includes(event.staffId)));
  const detail=document.createElement('p');detail.textContent='관련 기존 일정: '+affected.map(e=>`${e.title} (${e.id}, ${e.unknownTime?'시간 미확인':fmt(e.start)+'–'+fmt(e.end)})`).join(' / ');box.append(detail);
  const request=companies.find(c=>c.id===event.companyId);
  const alternatives=request?Core.plan([request],live.roster,context(),live.confirmed.filter(e=>e.id!==event.id)):[];
  if(!alternatives.length){const p=document.createElement('p');p.textContent='검증된 대체 담당자·날짜·이동 경로 없음';box.append(p);}
  for(const alt of alternatives){const b=document.createElement('button');b.className='btn';b.dataset.confirm='';b.textContent=`변경 승인: ${sourceName(alt.staffId)} · ${alt.date} ${fmt(alt.start)} (시간·이동 검사 통과)`;b.onclick=()=>approveReplacement(event,alt);box.append(b);}
  target.append(box);
 }
 drawStatus();
}
async function approveReplacement(old,alt){
 if(!canWrite())return;
 if(Shared.active)return sharedApprove(alt,old);
 if(!confirm('확정 세미나를 표시된 대체 일정으로 변경 승인하시겠습니까?'))return;
 if(!await syncNow())return alert('동기화 실패로 변경을 차단했습니다.');
 const result=Core.check(alt,live.roster.find(p=>p.id===alt.staffId),context(),live.confirmed.filter(e=>e.id!==old.id));
 if(!result.ok)return alert(result.reasons.join('\n'));
 if(result.status==='조건부 가능'&&!confirm('조건부 가능: '+result.warnings.join(' / ')+'\n관리자로서 예상 종료·이동시간을 확인하고 변경을 승인합니까?'))return;
 if(!await syncNow())return alert('최신 동기화를 다시 확인해주세요.');
 const finalCheck=Core.check(alt,live.roster.find(p=>p.id===alt.staffId),context(),live.confirmed.filter(e=>e.id!==old.id));
 if(!finalCheck.ok||JSON.stringify(finalCheck)!==JSON.stringify(result))return alert('검증 결과가 바뀌었습니다. 변경안을 다시 확인해주세요.');
 live.confirmed=live.confirmed.map(e=>e.id===old.id?{...alt,id:old.id,status:'confirmed',approvedAt:new Date().toISOString(),previous:e}:e);if(!await persistLive({type:'replace',conditionalAccepted:result.status==='조건부 가능'}))return;rebuildProposals();renderAll();
}
async function confirmProposal(id){
 if(!canWrite())return;
 const previous=live.proposals.find(e=>e.id===id);if(!previous)return;
 if(Shared.active)return sharedApprove(previous);
 if(!await syncNow())return alert('동기화 실패로 확정을 차단했습니다.');
 const current=live.proposals.find(e=>e.id===id);if(!current||JSON.stringify(current)!==JSON.stringify(previous))return alert('배정안이 변경되었습니다. 최신 배정안을 다시 확인하세요.');
 const result=Core.check(current,live.roster.find(p=>p.id===current.staffId),context(),live.confirmed);if(!result.ok)return alert(result.reasons.join('\n'));
 if(result.status==='조건부 가능'&&!confirm('조건부 가능: '+result.warnings.join(' / ')+'\n관리자로서 예상 종료·이동시간을 확인하고 확정합니까?'))return;
 if(!await syncNow())return alert('최신 동기화를 다시 확인해주세요.');
 const finalCheck=Core.check(current,live.roster.find(p=>p.id===current.staffId),context(),live.confirmed);
 if(!finalCheck.ok||JSON.stringify(finalCheck)!==JSON.stringify(result))return alert('검증 결과가 바뀌었습니다. 배정안을 다시 확인해주세요.');
 live.confirmed.push({...current,status:'confirmed',approvedAt:new Date().toISOString()});if(!await persistLive({type:'confirm',conditionalAccepted:result.status==='조건부 가능'}))return;rebuildProposals();renderAll();
}
async function sharedApprove(candidate,previous=null){
 try{
  const checked=await Shared.assess(candidate);if(!checked.ok)return alert(checked.reasons.join('\n'));if(checked.version!==Shared.version)return alert('공용 데이터가 변경되었습니다. 새로 조회하세요.');
  const conditional=checked.status==='조건부 가능';if(!confirm(`${previous?'확정 일정 변경':'배정 확정'} · ${checked.status}\n${checked.warnings.join(' / ')}\n${checked.legs.map(l=>`${l.minutes}분 + 여유 ${l.buffer}분 (${l.provider||'예상 이동시간'})`).join('\n')}\n관리자로서 확인하고 승인합니까?`))return;
  const e={...candidate,...checked.candidate,id:previous?.id||'proposal/'+candidate.companyId,status:'confirmed',assessment:checked.status,warnings:checked.warnings,legs:checked.legs};
  if(previous)live.confirmed=live.confirmed.map(old=>old.id===previous.id?e:old);else live.confirmed.push(e);
  if(!await persistLive({type:previous?'replace':'confirm',conditionalAccepted:conditional}))return;rebuildProposals();renderAll();
 }catch(e){alert(e.message);}
}
autoAssign=function(){rebuildProposals();renderAll();goPage('schedule');if(!live.proposals.length)alert('검증된 배정안이 없습니다. 담당자 연결, 희망일자, 종료시간, 휴가 조회 범위와 이동시간을 확인하세요.');};
renderSchedule=function(){
 const picker=document.getElementById('viewer'),selected=picker.value;
 picker.innerHTML='<option value="all">전체 담당자</option>'+live.roster.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');picker.value=live.roster.some(p=>p.id===selected)?selected:'all';
 const date=document.getElementById('liveDate')?.value||today(),who=picker.value;
 document.getElementById('scheduleTitle').textContent='담당자 통합 일정';
 const existing=live.events.filter(e=>(!e.date||e.date===date)&&(who==='all'||e.staffIds.includes(who)||e.unresolved));
 const seminars=[...live.confirmed,...live.proposals].filter(e=>e.date===date&&(who==='all'||e.staffId===who));
 const grid=document.getElementById('scheduleGrid');grid.innerHTML=`<div class="day"><div class="day-head">기존 업무 · 읽기 전용 (${existing.length})</div>${existing.map(e=>`<div class="event existing"><strong>${esc(e.title)}</strong><p>${esc(e.labels.join(', ')||e.staffIds.map(sourceName).join(', '))}</p><p>${esc(e.date||'날짜 미정')} · ${e.unknownTime?'시간 미확인 · 당일 배정 제한':e.allDay?'종일':fmt(e.start)+'–'+fmt(e.end)+(e.estimatedEnd?' · 예상 종료':'')}</p><p>${esc(e.address||'장소 미제공')} · ${esc(e.status)}</p><small>${esc(e.id)}${e.unresolved?' · 담당자 연결 필요':''}</small></div>`).join('')||'<p>조회된 일정 없음</p>'}</div><div class="day"><div class="day-head">세미나 (${seminars.length})</div>${seminars.map(e=>`<div class="event"><strong>${esc(companies.find(c=>c.id===e.companyId)?.name||e.companyId)}</strong><p>${esc(sourceName(e.staffId))} · ${fmt(e.start)}–${fmt(e.end)}</p><p>${esc((e.warnings||[]).join(' / '))}</p><p>${e.status==='confirmed'?(!Core.inPeriod(e.date,live.seminarPeriod)?'확정 · 확인 필요 (세미나 기간 미설정/기간 밖)':'확정'):esc(e.assessment)+' · '+(e.rank+1)+'순위'}</p>${e.status==='draft'?`<button class="btn" data-confirm data-id="${esc(e.id)}">이 배정안 확정</button>`:''}</div>`).join('')||'<p>해당 날짜 세미나 없음</p>'}</div>`;
 grid.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>confirmProposal(b.dataset.id));
 for(const [i,e] of seminars.entries()){const card=grid.querySelectorAll('.day:last-child .event')[i];const button=document.createElement('button');button.className='btn';button.textContent='참석·자료·주소 상세';button.onclick=()=>openEvent(e);card.append(button);}
 const proposals=document.getElementById('proposalList');if(proposals)proposals.innerHTML=live.proposals.map(e=>`<p>${esc(companies.find(c=>c.id===e.companyId)?.name)} · ${esc(e.date)} ${fmt(e.start)} · ${esc(sourceName(e.staffId))}</p>`).join('')||'검증된 제안 없음';
};
renderStaff=function(){
 const grid=document.getElementById('staffGrid');grid.replaceChildren();
 const rows=Core.mappingAudit(live.roster,live.events,live.mapping,live.mappingMeta);
 const p=document.createElement('p');p.textContent=`전체 계정 ${live.roster.length}개 · 연결 확인 ${rows.filter(r=>r.status==='연결 확인').length}개 · 미연결/재검토 ${rows.filter(r=>r.status!=='연결 확인').length}개. 기존 연결은 보존하며 승인 기록을 다시 확인합니다.`;grid.append(p);
 const table=document.createElement('table');table.innerHTML='<thead><tr><th>원본 이름</th><th>일정 수</th><th>일치 ID / 중복</th><th>연결 대상</th><th>연결 상태</th><th>관리자 검증</th></tr></thead><tbody></tbody>';grid.append(table);
 for(const row of rows){const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(row.name||'이름 미제공')}</td><td>${row.count}</td><td>${esc(row.matches.join(', ')||'일치 없음')}${row.matches.length>1?' · 동명이인':''}</td><td><select aria-label="${esc(row.name)} 연결 담당자"><option value="">연결 안 함</option>${live.roster.filter(p=>!p.missingName).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.id)})</option>`).join('')}</select></td><td>${esc(row.status)}<br><small>${esc(row.reviewedAt?new Date(row.reviewedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'승인 기록 없음')}</small></td><td><input aria-label="${esc(row.name)} 확인 근거" placeholder="동명이인·별칭 확인 근거"><button class="btn">확인 후 저장</button></td>`;
  const select=tr.querySelector('select');select.value=row.id;
  tr.querySelector('button').onclick=async()=>{if(!canWrite())return;const id=select.value,target=live.roster.find(p=>p.id===id),reason=tr.querySelector('input').value.trim();if(target&&(row.matches.length>1||target.name!==row.name)&&!reason)return alert('동명이인 또는 다른 이름 연결에는 확인 근거를 입력하세요.');if(!confirm(`${row.name} → ${target?target.name+' ('+id+')':'연결 해제'}\n담당자 본인과 일치하는지 확인했습니까?`))return;if(target){live.mapping[row.name]=id;live.mappingMeta[row.name]={staffId:id,nameAtApproval:target.name,reviewedAt:new Date().toISOString(),duplicateResolved:row.matches.length>1,reason};}else{delete live.mapping[row.name];delete live.mappingMeta[row.name];}if(!await persistLive())return;await syncNow();};table.querySelector('tbody').append(tr);
 }
};
addStaff=function(){alert('원본 담당자 목록을 읽기 전용으로 조회합니다. 신규 담당자는 원본 관리자에게 등록을 요청하세요.');};
prepareRequestForm=function(){const sel=document.getElementById('reqFixedStaff'),old=sel.value;sel.innerHTML='<option value="">자동배정</option>'+live.roster.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.id)})</option>`).join('');if(live.roster.some(p=>p.id===old))sel.value=old;};
const originalGoPage=goPage;goPage=function(id){originalGoPage(id);if(id==='request')prepareRequestForm();};
renderPartners=function(list=companies){
 const tb=document.querySelector('#partnerTable tbody');tb.innerHTML=list.map(c=>{const ev=live.confirmed.find(e=>e.companyId===c.id);return `<tr><td>${esc(c.name)}<div class="sub">${esc(c.address)}</div></td><td>${esc(c.id)}</td><td>${esc(c.region||'')}</td><td>${esc((c.preferences||[]).join(' / '))}</td><td><select class="btn" data-fixed="${esc(c.id)}" ${ev?'disabled':''}><option value="">자동배정</option>${live.roster.map(p=>`<option value="${esc(p.id)}" ${c.fixedStaffId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></td><td>${ev?esc(ev.date)+' '+fmt(ev.start)+' · '+esc(sourceName(ev.staffId)):'미확정'}</td><td>${esc(c.status)}</td><td><button class="btn" data-stop="${esc(c.id)}">진행 안 함</button></td></tr>`;}).join('');
 tb.querySelectorAll('[data-fixed]').forEach(s=>s.onchange=async()=>{if(!canWrite())return;companies.find(c=>c.id===s.dataset.fixed).fixedStaffId=s.value;if(!await persistLive())return;rebuildProposals();renderAll();});
 tb.querySelectorAll('[data-stop]').forEach(b=>b.onclick=async()=>{if(!canWrite())return;const c=companies.find(c=>c.id===b.dataset.stop);if(live.confirmed.some(e=>e.companyId===c.id))return alert('확정된 세미나는 유지됩니다. 관리자 변경 승인이 필요합니다.');c.status='X';if(!await persistLive())return;rebuildProposals();renderAll();});
 updateCounts();
};
saveRequest=async function(){
 if(!canWrite())return;
 const val=id=>document.getElementById(id).value.trim();const name=val('reqCompanyName'),address=val('reqAddress'),preferences=['d1','d2','d3'].map(val),people=+val('people');
 const start=Core.minute(val('seminarStart')),duration=+val('seminarDuration');
 if(!Core.periodValid(live.seminarPeriod))return alert('세미나 기간을 먼저 설정하세요.');
 if(!preferences.every(d=>Core.inPeriod(d,live.seminarPeriod)))return alert('희망일자는 저장된 세미나 기간 안에서 선택하세요.');
 if(!name||!address||!val('reqContactName')||!val('reqPhone')||preferences.some(d=>!Core.dayOK(d))||new Set(preferences).size!==3||!Number.isInteger(people)||people<3||start===null||!Number.isFinite(duration)||duration<15||start+duration>1440)return alert('필수 정보, 서로 다른 희망일자 3개, 참여인원, 세미나 시간을 확인하세요.');
 const slots=document.getElementById('flexibleTime').checked?[540,600,660,780,840,900,960].filter(t=>t+duration<=1080):[start];
 companies.push({id:'FORM-'+crypto.randomUUID(),name,address,contactName:val('reqContactName'),phone:val('reqPhone'),people,preferences,choices:3,status:'대기',fixedStaffId:val('reqFixedStaff'),fixedStaff:'',slots,duration,region:'',assign:'-'});if(!await persistLive())return;rebuildProposals();renderAll();alert(Shared.active?'신청을 공용 저장소에 저장했습니다.':'신청을 이 브라우저에 저장했습니다.');
};
markRequestX=function(){alert('협력사 리스트에서 해당 신청을 선택해 진행 안 함으로 처리하세요.');};
let detailSeminar=null;
openEvent=function(e){detailSeminar=e;const c=companies.find(c=>c.id===e.companyId);document.getElementById('modalName').textContent=c?.name||e.companyId;document.getElementById('modalDate').textContent=e.date+' '+fmt(e.start)+'–'+fmt(e.end)+' · '+sourceName(e.staffId);document.getElementById('modalPeople').textContent=(c?.people||0)+'명';document.getElementById('modalMaterial').textContent=(c?.people||0)+'부';document.getElementById('modalAddress').textContent='주소: '+e.address;document.getElementById('substituteArea').textContent='';document.getElementById('detailModal').classList.add('show');};
findSubstitute=function(){const area=document.getElementById('substituteArea');area.replaceChildren();const e=detailSeminar,c=companies.find(c=>c.id===e?.companyId);if(!e||!c)return;const options=Core.plan([c],live.roster,context(),live.confirmed.filter(x=>x.id!==e.id)).filter(x=>x.staffId!==e.staffId||x.date!==e.date||x.start!==e.start);if(!options.length){area.textContent='현재 조건에서 검증된 대체 일정이 없습니다.';return;}for(const alt of options){const b=document.createElement('button');b.className='btn';b.textContent=sourceName(alt.staffId)+' · '+alt.date+' '+fmt(alt.start)+' · '+alt.assessment;b.onclick=()=>{if(e.status!=='confirmed')return alert('미확정 일정은 자동배정 다시 계산을 사용하세요.');approveReplacement(e,alt);};area.append(b);}};
// Keep mail-template editing and Google Form preparation. Resolve mail data from real records.
renderMailPreview=function(){const c=companies.find(c=>c.id===document.getElementById('mailCompany')?.value),e=live.confirmed.find(e=>e.companyId===c?.id);const values={'{업체명}':c?.name,'{지역}':c?.region,'{세미나일자}':e?.date,'{세미나시간}':e?fmt(e.start):null,'{방문담당자}':e?sourceName(e.staffId):null,'{참석인원}':c?c.people+'명':null,'{신청링크}':document.getElementById('mailApplyLink')?.value};const apply=s=>Object.entries(values).reduce((v,[k,val])=>val?v.split(k).join(val):v,s||'');document.getElementById('mailPreviewSubject').textContent=apply(document.getElementById('mailSubject').value);document.getElementById('mailPreviewBody').textContent=apply(document.getElementById('mailBody').value);};
function renderPeriodFields(){
 for(const [id,key] of [['seminarPeriodStart','startDate'],['seminarPeriodEnd','endDate']]){const node=document.getElementById(id);if(node)node.value=live.seminarPeriod?.[key]||'';}
}
function renderPeriodStatus(){
 const valid=Core.periodValid(live.seminarPeriod),node=document.getElementById('seminarPeriodSaved');if(node)node.textContent=valid?live.seminarPeriod.startDate+' ~ '+live.seminarPeriod.endDate:'미설정';
 for(const id of ['d1','d2','d3']){const input=document.getElementById(id);if(input){input.min=valid?live.seminarPeriod.startDate:'';input.max=valid?live.seminarPeriod.endDate:'';}}
 const save=document.getElementById('saveSeminarPeriod');if(save)save.disabled=Shared.active&&Shared.member?.role!=='admin';
}
function installPeriodSettings(){
 const nav=document.createElement('button');nav.className='nav';nav.dataset.page='seminarPeriod';nav.textContent='세미나 기간 설정';nav.onclick=()=>goPage('seminarPeriod');document.querySelector('aside').prepend(nav);
 const section=document.createElement('section');section.id='seminarPeriod';section.className='page';section.innerHTML='<h1>세미나 기간 설정</h1><div class="panel"><div class="panel-body"><p><label>시작일 <input type="date" id="seminarPeriodStart"></label></p><p><label>종료일 <input type="date" id="seminarPeriodEnd"></label></p><button class="btn primary" id="saveSeminarPeriod">저장</button><p>저장된 기간: <strong id="seminarPeriodSaved" role="status">미설정</strong></p><p id="seminarPeriodFeedback" role="status"></p></div></div>';document.querySelector('main').prepend(section);renderPeriodFields();renderPeriodStatus();
 document.getElementById('saveSeminarPeriod').onclick=async()=>{if(!canWrite())return;const period={startDate:document.getElementById('seminarPeriodStart').value,endDate:document.getElementById('seminarPeriodEnd').value},feedback=document.getElementById('seminarPeriodFeedback');if(!Core.periodValid(period)){feedback.textContent='시작일과 종료일을 선택하세요. 종료일은 시작일보다 빠를 수 없습니다.';return;}const previous=live.seminarPeriod;live.seminarPeriod=period;if(!await persistLive()){live.seminarPeriod=Shared.active?Shared.state.seminarPeriod||null:previous;renderPeriodFields();renderPeriodStatus();return;}rebuildProposals();renderAll();feedback.textContent='저장했습니다.';};
}
function installOperations(){
 const nav=document.createElement('div');nav.className='nav';nav.dataset.page='operations';nav.textContent='운영 설정';nav.onclick=()=>goPage('operations');document.querySelector('aside').append(nav);
 const section=document.createElement('section');section.id='operations';section.className='page';section.innerHTML=`<h1>운영 설정</h1><div class="panel"><div class="panel-head"><strong>휴가 미사용 예외 기간</strong><span id="vacationPolicyStatus"></span></div><div class="panel-body"><p id="operationToday"></p><label><input type="checkbox" id="noVacation"> 지정 기간에 휴가 미사용 전제 적용</label><p><label>시작일 <input type="date" id="noVacationStart"></label> <label>종료일 <input type="date" id="noVacationEnd"></label></p><p class="sub">해당 기간의 세미나에는 휴가 최신성만 예외로 적용합니다. 실제 확인된 휴가·업무 충돌·담당자 연결·이동 검사는 유지하며 종료일이 지나면 자동 해제됩니다.</p><button class="btn primary" id="saveVacationPolicy">기간 확인 후 저장</button><details><summary>휴가 연동 상세</summary><p id="vacationDetails"></p></details></div></div><div class="panel"><div class="panel-head"><strong>공용 저장소</strong><span id="sharingStatus"></span></div><div class="panel-body"><label>세미나 전용 서버 주소 <input type="url" id="sharedServer" placeholder="https://세미나-서버-주소" style="width:100%"></label><p><button class="btn" id="prepareShared">서버 확인</button> <button class="btn" id="loginShared" disabled>회사 계정 로그인</button> <button class="btn" id="logoutShared">공용 모드 로그아웃</button></p><p id="sharedFeedback" role="status">별도 서버가 배포된 후 연결할 수 있습니다. 연결 전 브라우저 데이터를 공용 데이터로 표시하지 않습니다.</p><p class="sub">로그인은 서버에서 등록한 직원만 허용합니다. 기존 브라우저 데이터는 보존되며 자동 업로드하지 않습니다.</p><button class="btn" id="loadHistory">공용 변경 이력 조회</button><div id="sharedHistory"></div></div></div>`;document.querySelector('main').append(section);
 function policyFields(){document.getElementById('noVacation').checked=live.vacationPolicy.enabled===true;document.getElementById('noVacationStart').value=Core.operationPeriodDraft(live.vacationPolicy).startDate;document.getElementById('noVacationEnd').value=live.vacationPolicy.endDate||'';}
 policyFields();document.getElementById('sharedServer').value=localStorage.getItem('seminarSharedServer')||'';
 document.getElementById('saveVacationPolicy').onclick=async()=>{if(!canWrite())return;const enabled=document.getElementById('noVacation').checked,startDate=document.getElementById('noVacationStart').value,endDate=document.getElementById('noVacationEnd').value;if((startDate&&!Core.dayOK(startDate))||(endDate&&!Core.dayOK(endDate))||(startDate&&endDate&&startDate>endDate))return alert('운영 시작일과 종료일을 확인하세요.');if(enabled&&(!Core.dayOK(startDate)||!Core.dayOK(endDate)||startDate>endDate||endDate<today()))return alert('적용 시작일과 종료일을 확인하세요.');if(!confirm(enabled?`${startDate} ~ ${endDate}에 휴가 미사용 전제를 승인합니까? 확인된 휴가는 계속 충돌 검사합니다.`:'운영 기간을 저장하고 휴가 미사용 예외는 끈 상태로 유지합니까?'))return;live.vacationPolicy={enabled,startDate,endDate,approvedAt:new Date().toISOString()};if(!await persistLive())return;rebuildProposals();renderAll();};
 const feedback=message=>document.getElementById('sharedFeedback').textContent=message;
 document.getElementById('prepareShared').onclick=async()=>{try{await Shared.prepare(document.getElementById('sharedServer').value.trim());document.getElementById('loginShared').disabled=false;feedback('서버 확인 완료. 회사 계정으로 로그인하세요.');}catch(e){feedback(e.message);}};
 function scopeMenus(){document.querySelectorAll('.nav').forEach(n=>n.hidden=Shared.active&&Shared.member?.role==='staff'&&!['schedule','operations'].includes(n.dataset.page));document.getElementById('saveVacationPolicy').disabled=Shared.active&&Shared.member?.role!=='admin';}
 document.getElementById('loginShared').onclick=async()=>{try{await Shared.login();localStorage.setItem('seminarSharedServer',Shared.base);live.modeGeneration=(live.modeGeneration||0)+1;live.streams.forEach(ref=>ref.off());live.streams=[];live.raw=null;live.events=[];live.roster=[];applyState(Shared.state);scopeMenus();policyFields();await syncNow();feedback('공용 저장소 연결 완료. 15초마다 다른 직원의 변경을 확인합니다.');if(Shared.member.role==='staff')goPage('schedule');}catch(e){feedback(e.message);}};
 document.getElementById('logoutShared').onclick=async()=>{try{await Shared.logout();live.modeGeneration=(live.modeGeneration||0)+1;const local=JSON.parse(localStorage.getItem('seminarLiveV1')||'null')||{companies:[],mapping:{},mappingMeta:{},confirmed:[],vacationPolicy:{enabled:false},travelSettings:{sameRegionMinutes:45,bufferMinutes:15,routes:[]}};applyState(local);live.raw=null;live.events=[];live.roster=[];scopeMenus();policyFields();await syncNow();startStreams();feedback('브라우저별 저장 모드로 돌아왔습니다.');}catch(e){feedback(e.message);}};
 document.getElementById('loadHistory').onclick=async()=>{try{if(!Shared.active)throw Error('공용 서버에 먼저 로그인하세요.');const {history}=await Shared.history(),node=document.getElementById('sharedHistory');node.replaceChildren();for(const item of history){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=`버전 ${item.version} · ${item.at} · 승인 사용자 ${item.uid}`;pre.textContent=JSON.stringify({before:item.before,after:item.after},null,2);details.append(summary,pre);node.append(details);}if(!history.length)node.textContent='변경 이력이 없습니다.';}catch(e){feedback(e.message);}};
 setInterval(async()=>{if(!Shared.active||Shared.busy||live.busy||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;try{const version=Shared.version;await Shared.load();if(Shared.version!==version){applyState(Shared.state);await syncNow();}drawStatus();}catch(e){Shared.error=e.message;feedback(e.message);}},15000);
 const originalDraw=drawStatus;drawStatus=function(){originalDraw();const node=document.getElementById('vacationDetails');node.textContent='원본 수집: '+(live.vacationSync?new Date(live.vacationSync).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미확인')+' · 최근 수집이 확인된 월: '+(live.months.join(', ')||'없음')+' · '+live.vacationHealth.errors.join(' / ')+(live.vacationHealth.missing.length?' · 실제 데이터 미제공 월: '+live.vacationHealth.missing.join(', '):'');};
 const routing=document.createElement('div');routing.className='panel';routing.innerHTML='<div class="panel-head"><strong>주소 기반 자동차 경로 검증</strong></div><div class="panel-body"><p>공용 서버와 지도 API가 연결되면 신청 주소로 조회합니다. 미래 교통 예측값은 관리자 확인 대상입니다.</p><label>신청 <select id="routeCompany"></select></label> <label>담당자 <select id="routePerson"></select></label> <label>희망일 <input type="date" id="routeDate"></label> <label>시작 <input type="time" id="routeStart" value="10:00"></label><button class="btn" id="checkRoute">자동차 경로 검사</button><div id="routeResult"></div></div>';document.getElementById('route').append(routing);
 document.getElementById('checkRoute').onclick=async()=>{try{if(!Shared.active)throw Error('운영 설정에서 공용 서버에 먼저 로그인하세요.');const candidate={id:'proposal/'+document.getElementById('routeCompany').value,companyId:document.getElementById('routeCompany').value,staffId:document.getElementById('routePerson').value,date:document.getElementById('routeDate').value,start:Core.minute(document.getElementById('routeStart').value)};const result=await Shared.assess(candidate),node=document.getElementById('routeResult');node.replaceChildren();const p=document.createElement('p');p.textContent=[result.status,...result.reasons,...result.warnings,...result.routeErrors].join(' / ');node.append(p);for(const leg of result.legs){const row=document.createElement('p');row.textContent=`${leg.from} → ${leg.to}: ${leg.minutes}분 + 여유 ${leg.buffer}분 · ${leg.provider?'지도 API 예측 이동시간':'예상 이동시간'}`;node.append(row);}if(result.ok){const b=document.createElement('button');b.className='btn';b.textContent='검사한 배정안 승인';b.onclick=()=>sharedApprove({...candidate,...result.candidate},live.confirmed.find(e=>e.companyId===candidate.companyId));node.append(b);}}catch(e){document.getElementById('routeResult').textContent=e.message;}};
 const previousRender=renderAll;renderAll=function(){previousRender();for(const [id,items] of [['routeCompany',companies.map(c=>({id:c.id,name:c.name}))],['routePerson',live.roster]]){const select=document.getElementById(id),value=select.value;select.innerHTML=items.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if(items.some(p=>p.id===value))select.value=value;}};
}
function mountLive(){
 const dash=document.getElementById('dashboard');dash.querySelector('.kpis').id='legacyCounts';dash.querySelector('.kpis').hidden=true;
 const panel=document.createElement('div');panel.innerHTML='<div class="sync-bar"><div><strong>기존 일정 실시간 연동</strong><p id="liveStatus" role="status" aria-live="polite"></p></div><button class="btn primary" id="syncNow">지금 동기화</button></div><div class="kpis" id="liveKpis"></div><p class="notice" id="liveSummary"></p><div class="notice">세미나 신청·담당자 연결·승인은 이 브라우저에 저장됩니다. 공용 모드와 휴가 운영 기간은 운영 설정에서 관리합니다. 일반 업무의 종료시간이 없으면 기본 2시간(예상 종료)을 적용합니다.</div><div class="panel"><div class="panel-head"><strong>확정 일정 충돌 · 검증 필요</strong></div><div class="panel-body" id="liveConflicts"></div></div>';
 dash.querySelector('.title-row').after(panel);document.getElementById('syncNow').onclick=syncNow;
 const tables=dash.querySelectorAll('.panel');for(const t of tables)if(t.textContent.includes('이번 배정 요약'))t.remove();
 const toolbar=document.createElement('div');toolbar.className='notice';toolbar.innerHTML='<label>조회 날짜 <input id="liveDate" type="date"></label><details open><summary>전체 미확정 배정안</summary><div id="proposalList"></div><div id="assessmentList"></div></details>';document.getElementById('scheduleGrid').before(toolbar);document.getElementById('liveDate').value=today();document.getElementById('liveDate').onchange=renderSchedule;
 const form=document.createElement('div');form.className='form-grid';form.innerHTML='<label><input id="flexibleTime" type="checkbox" checked> 방문 시간 자동 탐색 (09–18시)</label><label class="field">시간 지정 시 시작시간 <input type="time" id="seminarStart" value="10:00"></label><label class="field">소요시간(분) <input type="number" id="seminarDuration" min="15" max="720" value="120"></label>';document.getElementById('reqFixedStaff').closest('.form-grid').after(form);
 const route=document.getElementById('route');route.innerHTML='<h1>지역별 예상 이동시간</h1><div class="notice">지도 API 연결 전 설정값입니다. 실제 이동시간이 아닙니다. 동일 지역 기본 45분은 관리자가 조정할 수 있습니다. 다른 지역은 방향별 설정이 있을 때만 조건부 배정합니다.</div><label>같은 지역 예상 이동(분) <input type="number" min="0" id="sameRegion"></label><p>지역 이름은 주소에서 추출된 시·군·구 전체 문자열과 일치해야 합니다. 예: 경기도 수원시 팔달구 → 수원시 팔달구. 방향별 JSON 형식: [{"from":"수원시 팔달구","to":"화성시","minutes":60}]</p><textarea id="routeSettings" rows="10" style="width:100%" aria-label="지역별 예상 이동시간 설정"></textarea><button class="btn" id="saveRoutes">설정 저장</button>';
 document.querySelector('#schedule .desc').textContent='담당자와 날짜를 선택해 기존 업무·세미나 및 배정 검증 결과를 확인하세요.';document.querySelector('[data-page="route"]').textContent='이동시간 설정';
 document.querySelector('#staff .desc').textContent='원본 담당자 목록을 읽기 전용으로 조회하고 이름과 ID의 대응을 확인합니다.';
 const staffNotice=document.querySelector('#staff .notice');if(staffNotice)staffNotice.textContent='이름이 일치해도 관리자 확인 후 연결합니다. 원본 계정의 이름은 여기서 변경하지 않습니다.';
 const staffButton=document.querySelector('#staff .title-row button');if(staffButton){staffButton.textContent='담당자 목록 새로고침';staffButton.onclick=syncNow;}
 const requestNotice=document.querySelector('#request .notice');if(requestNotice)requestNotice.textContent='수동 신청은 이 브라우저에 저장됩니다. Google Form 응답 수집은 아직 연결되지 않았습니다.';
 document.getElementById('sameRegion').value=live.travelSettings.sameRegionMinutes;document.getElementById('routeSettings').value=JSON.stringify(live.travelSettings.routes,null,2);
 const bufferLabel=document.createElement('label');bufferLabel.innerHTML=' 이동 여유시간(분) <input id="bufferMinutes" type="number" min="0" max="180">';document.getElementById('sameRegion').parentElement.after(bufferLabel);document.getElementById('bufferMinutes').value=live.travelSettings.bufferMinutes;
 document.getElementById('saveRoutes').onclick=async()=>{if(!canWrite())return;try{const same=Number(document.getElementById('sameRegion').value),buffer=Number(document.getElementById('bufferMinutes').value),routes=JSON.parse(document.getElementById('routeSettings').value);if(!Number.isFinite(same)||same<0||!Number.isFinite(buffer)||buffer<0||buffer>180||!Array.isArray(routes)||routes.some(r=>!r||typeof r.from!=='string'||typeof r.to!=='string'||!r.from||!r.to||!Number.isFinite(r.minutes)||r.minutes<0))throw Error('지역명과 0 이상의 분 값을 확인하세요.');live.travelSettings={sameRegionMinutes:same,routes,bufferMinutes:buffer};if(!await persistLive())return;rebuildProposals();renderAll();alert('예상 이동시간과 여유시간 설정을 저장했습니다.');}catch(e){alert(e.message);}};
 const demo=document.createElement('details');demo.className='notice';demo.innerHTML='<summary>기존 시안 데이터 보기 · 테스트 전용</summary><p>이전 시안 업체 '+demoCompanies.length+'개, 일정 '+demoEvents.length+'건. 실제 배정에서 제외됩니다.</p><pre></pre>';demo.querySelector('pre').textContent=JSON.stringify({companies:demoCompanies,events:demoEvents},null,2);dash.append(demo);
 installPeriodSettings();installOperations();renderAll();goPage('seminarPeriod');prepareRequestForm();renderMailManager();document.body.classList.remove('booting');document.getElementById('bootNotice').remove();syncNow();startStreams();setInterval(syncNow,60000);setInterval(()=>drawStatus(),10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow();});window.addEventListener('online',syncNow);window.addEventListener('offline',()=>{live.state='동기화 실패';live.error='네트워크 연결 없음';live.proposals=[];renderAll();});
}
mountLive();


