'use strict';
const Core=SchedulerCore;
const SOURCE='https://test-168a4-default-rtdb.asia-southeast1.firebasedatabase.app';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let saved={};try{saved=JSON.parse(localStorage.getItem('seminarLiveV1')||'{}');}catch{}
const live={roster:[],events:[],months:[],mapping:saved.mapping||{},confirmed:saved.confirmed||[],proposals:[],last:0,state:'미연결',error:'',raw:null,busy:false,dirty:false,streams:[],vacationSync:null,changes:0,travelSettings:saved.travelSettings||{sameRegionMinutes:45,routes:[]}};
const demoCompanies=companies.map(c=>({...c,testData:true}));
const demoEvents=events.map(e=>({...e,testData:true}));
function regionOf(address){const m=String(address||'').match(/(?:^|\s)([가-힣]+(?:시|군|구))(?=\s|$)/g);return m?.map(x=>x.trim()).join(' ')||null;}
function travelEstimate(a,b){const from=regionOf(a.address),to=regionOf(b.address);if(!from||!to)return null;const minutes=from===to?live.travelSettings.sameRegionMinutes:live.travelSettings.routes.find(r=>r.from===from&&r.to===to)?.minutes;return Number.isFinite(minutes)?{minutes,estimated:true}:null;}
companies.splice(0,companies.length,...(saved.companies||[]));events.splice(0);staff=[];
function persistLive(){localStorage.setItem('seminarLiveV1',JSON.stringify({mapping:live.mapping,confirmed:live.confirmed,companies,travelSettings:live.travelSettings}));}
function context(){return {region:regionOf,travel:travelEstimate,events:live.events,months:live.months,linkedIds:[...new Set(Object.values(live.mapping))],fresh:live.state==='동기화 성공'&&Date.now()-live.last<90000,vacationFresh:Number.isFinite(Date.parse(live.vacationSync))&&Date.now()-Date.parse(live.vacationSync)<36*3600000&&Date.parse(live.vacationSync)<=Date.now()+300000};}
async function read(path){const r=await fetch(SOURCE+'/'+path,{cache:'no-store',signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('일정 조회 실패 ('+r.status+')');return r.json();}
async function syncNow(){
 if(live.busy){live.dirty=true;return false;}live.busy=true;live.state='동기화 중';drawStatus();
 const revision=live.revision||0;
 try{
  const values=await Promise.all([...Core.paths.map(p=>read(p+'.json')),read('hiworks_vacation_sync/data.json'),read('hiworks_vacation_sync/meta.json'),read('users.json?shallow=true')]);
  const keys=values[10];if(!keys||typeof keys!=='object'||Array.isArray(keys))throw Error('담당자 목록 확인 실패');
  const roster=await Promise.all(Object.keys(keys).map(async id=>{const name=await read('users/'+encodeURIComponent(id)+'/name.json');return{id,name:typeof name==='string'&&name?name:'이름 확인 필요 ('+id+')'};}));
  const raw=Object.fromEntries(Core.paths.map((p,i)=>[p,values[i]]));raw.hiworks_vacation_sync={data:values[8],meta:values[9]};
  const normalized=Core.normalize(raw,roster,live.mapping);if(normalized.issues.length)throw Error(normalized.issues.join('; '));
  const before=new Map(live.events.map(e=>[e.id,JSON.stringify(e)]));
  live.changes=normalized.events.filter(e=>before.get(e.id)!==JSON.stringify(e)).length+live.events.filter(e=>!normalized.events.some(n=>n.id===e.id)).length;
  Object.assign(live,{raw,roster,...normalized,last:Date.now(),state:'동기화 성공',error:''});
  if(revision!==(live.revision||0)){live.state='변경 확인 중';live.dirty=true;}
  rebuildProposals();renderAll();return live.state==='동기화 성공';
 }catch(e){live.state='동기화 실패';live.error=e.message;live.proposals=[];renderAll();return false;}
 finally{live.busy=false;drawStatus();if(live.dirty){live.dirty=false;queueMicrotask(syncNow);}}
}
let debounce;
function startStreams(){
 if(!window.firebase){live.error='변경 알림 모듈 로드 실패 · 60초 주기 조회 사용';drawStatus();return;}
 const reader=firebase.initializeApp({databaseURL:SOURCE},'seminar-read-only').database();
 for(const path of [...Core.paths,'hiworks_vacation_sync/data','hiworks_vacation_sync/meta']){
  const stream=reader.ref(path);
  const changed=()=>{live.revision=(live.revision||0)+1;live.state='변경 확인 중';drawStatus();clearTimeout(debounce);debounce=setTimeout(syncNow,800);};
  stream.on('value',changed,()=>{live.state='동기화 실패';live.error='원본 읽기 권한 변경';drawStatus();});live.streams.push(stream);
 }
}
function rebuildProposals(){live.proposals=Core.plan(companies,live.roster,context(),live.confirmed);}
function renderAssessments(){
 const node=document.getElementById('assessmentList');if(!node)return;node.replaceChildren();
 for(const c of companies.filter(c=>c.status!=='X'&&!live.confirmed.some(e=>e.companyId===c.id))){
  const proposal=live.proposals.find(e=>e.companyId===c.id);let result=proposal?{status:proposal.assessment,reasons:proposal.warnings}:null;
  if(!result){const checks=[];for(const date of c.preferences||[])for(const p of live.roster.filter(p=>!c.fixedStaffId||p.id===c.fixedStaffId))for(const start of c.slots||[])checks.push(Core.check({date,start,end:start+c.duration,address:c.address,fixedStaffId:c.fixedStaffId},p,context(),live.confirmed));result=checks.find(r=>r.ok)||checks.find(r=>r.status==='확인 필요')||checks[0]||{status:'확인 필요',reasons:['담당자·희망일자 확인 필요']};if(result.ok)result={status:'조건부 가능',reasons:['다른 업체와 배정 경합 · 현재 최적화안에 포함되지 않음']};}
  const row=document.createElement('p');row.textContent=c.name+' · '+result.status+' · '+result.reasons.join(' / ');node.append(row);
 }
}
function sourceName(id){return live.roster.find(p=>p.id===id)?.name||id;}
function conflicts(){return live.confirmed.map(e=>({event:e,result:Core.check(e,live.roster.find(p=>p.id===e.staffId),context(),live.confirmed)})).filter(x=>!x.result.ok);}
function drawStatus(){
 const node=document.getElementById('liveStatus');if(!node)return;
 node.textContent=live.state+' · 마지막 성공 '+(live.last?new Date(live.last).toLocaleString('ko-KR'):'없음')+(live.error?' · '+live.error:'');
 document.getElementById('syncNow').disabled=live.busy;
 document.querySelectorAll('[data-confirm]').forEach(b=>b.disabled=!context().fresh);
}
function renderAll(){
 renderPartners();renderSchedule();renderStaff();renderAssessments();prepareRequestForm();drawStatus();
 const kpis=[['전체 담당자',live.roster.length],['오늘 기존 일정',live.events.filter(e=>e.date===today()).length],['배정 가능한 담당자',new Set(live.proposals.map(e=>e.staffId)).size],['세미나 확정 / 제안',live.confirmed.length+' / '+live.proposals.length],['충돌 / 검증 필요',conflicts().length],['마지막 동기화',live.last?new Date(live.last).toLocaleTimeString('ko-KR'):'미연결']];
 document.getElementById('liveKpis').innerHTML=kpis.map(([k,v])=>`<div class="kpi"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
 document.getElementById('liveSummary').textContent=`기존 일정 ${live.events.length}건 · 이번 변경 ${live.changes}건 · 담당자 미연결 ${live.events.filter(e=>e.unresolved).length}건 · 종료시간 미확인 ${live.events.filter(e=>e.unknownTime).length}건. 배정 가능 인원은 현재 신청의 검증된 제안 기준입니다.`;
 document.getElementById('liveSummary').textContent+=` 휴가 원본 수집: ${live.vacationSync?new Date(live.vacationSync).toLocaleString('ko-KR'):'미확인'} · 조회 월: ${live.months.join(', ')||'미확인'}${context().vacationFresh?'':' · 원본 휴가 갱신 필요(36시간 초과 시 확정 차단)'}`;
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
 if(!confirm('확정 세미나를 표시된 대체 일정으로 변경 승인하시겠습니까?'))return;
 if(!await syncNow())return alert('동기화 실패로 변경을 차단했습니다.');
 const result=Core.check(alt,live.roster.find(p=>p.id===alt.staffId),context(),live.confirmed.filter(e=>e.id!==old.id));
 if(!result.ok)return alert(result.reasons.join('\n'));
 if(result.status==='조건부 가능'&&!confirm('조건부 가능: '+result.warnings.join(' / ')+'\n관리자로서 예상 종료·이동시간을 확인하고 변경을 승인합니까?'))return;
 if(!await syncNow())return alert('최신 동기화를 다시 확인해주세요.');
 const finalCheck=Core.check(alt,live.roster.find(p=>p.id===alt.staffId),context(),live.confirmed.filter(e=>e.id!==old.id));
 if(!finalCheck.ok||JSON.stringify(finalCheck)!==JSON.stringify(result))return alert('검증 결과가 바뀌었습니다. 변경안을 다시 확인해주세요.');
 live.confirmed=live.confirmed.map(e=>e.id===old.id?{...alt,id:old.id,status:'confirmed',approvedAt:new Date().toISOString(),previous:e}:e);persistLive();rebuildProposals();renderAll();
}
async function confirmProposal(id){
 const previous=live.proposals.find(e=>e.id===id);if(!previous)return;
 if(!await syncNow())return alert('동기화 실패로 확정을 차단했습니다.');
 const current=live.proposals.find(e=>e.id===id);if(!current||JSON.stringify(current)!==JSON.stringify(previous))return alert('배정안이 변경되었습니다. 최신 배정안을 다시 확인하세요.');
 const result=Core.check(current,live.roster.find(p=>p.id===current.staffId),context(),live.confirmed);if(!result.ok)return alert(result.reasons.join('\n'));
 if(result.status==='조건부 가능'&&!confirm('조건부 가능: '+result.warnings.join(' / ')+'\n관리자로서 예상 종료·이동시간을 확인하고 확정합니까?'))return;
 if(!await syncNow())return alert('최신 동기화를 다시 확인해주세요.');
 const finalCheck=Core.check(current,live.roster.find(p=>p.id===current.staffId),context(),live.confirmed);
 if(!finalCheck.ok||JSON.stringify(finalCheck)!==JSON.stringify(result))return alert('검증 결과가 바뀌었습니다. 배정안을 다시 확인해주세요.');
 live.confirmed.push({...current,status:'confirmed',approvedAt:new Date().toISOString()});persistLive();rebuildProposals();renderAll();
}
autoAssign=function(){rebuildProposals();renderAll();goPage('schedule');if(!live.proposals.length)alert('검증된 배정안이 없습니다. 담당자 연결, 희망일자, 종료시간, 휴가 조회 범위와 이동시간을 확인하세요.');};
renderSchedule=function(){
 const picker=document.getElementById('viewer'),selected=picker.value;
 picker.innerHTML='<option value="all">전체 담당자</option>'+live.roster.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');picker.value=live.roster.some(p=>p.id===selected)?selected:'all';
 const date=document.getElementById('liveDate')?.value||today(),who=picker.value;
 document.getElementById('scheduleTitle').textContent='담당자 통합 일정';
 const existing=live.events.filter(e=>(!e.date||e.date===date)&&(who==='all'||e.staffIds.includes(who)||e.unresolved));
 const seminars=[...live.confirmed,...live.proposals].filter(e=>e.date===date&&(who==='all'||e.staffId===who));
 const grid=document.getElementById('scheduleGrid');grid.innerHTML=`<div class="day"><div class="day-head">기존 업무 · 읽기 전용 (${existing.length})</div>${existing.map(e=>`<div class="event existing"><strong>${esc(e.title)}</strong><p>${esc(e.labels.join(', ')||e.staffIds.map(sourceName).join(', '))}</p><p>${esc(e.date||'날짜 미정')} · ${e.unknownTime?'시간 미확인 · 당일 배정 제한':e.allDay?'종일':fmt(e.start)+'–'+fmt(e.end)+(e.estimatedEnd?' · 예상 종료':'')}</p><p>${esc(e.address||'장소 미제공')} · ${esc(e.status)}</p><small>${esc(e.id)}${e.unresolved?' · 담당자 연결 필요':''}</small></div>`).join('')||'<p>조회된 일정 없음</p>'}</div><div class="day"><div class="day-head">세미나 (${seminars.length})</div>${seminars.map(e=>`<div class="event"><strong>${esc(companies.find(c=>c.id===e.companyId)?.name||e.companyId)}</strong><p>${esc(sourceName(e.staffId))} · ${fmt(e.start)}–${fmt(e.end)}</p><p>${esc((e.warnings||[]).join(' / '))}</p><p>${e.status==='confirmed'?'확정':esc(e.assessment)+' · '+(e.rank+1)+'순위'}</p>${e.status==='draft'?`<button class="btn" data-confirm data-id="${esc(e.id)}">이 배정안 확정</button>`:''}</div>`).join('')||'<p>해당 날짜 세미나 없음</p>'}</div>`;
 grid.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>confirmProposal(b.dataset.id));
 for(const [i,e] of seminars.entries()){const card=grid.querySelectorAll('.day:last-child .event')[i];const button=document.createElement('button');button.className='btn';button.textContent='참석·자료·주소 상세';button.onclick=()=>openEvent(e);card.append(button);}
 const proposals=document.getElementById('proposalList');if(proposals)proposals.innerHTML=live.proposals.map(e=>`<p>${esc(companies.find(c=>c.id===e.companyId)?.name)} · ${esc(e.date)} ${fmt(e.start)} · ${esc(sourceName(e.staffId))}</p>`).join('')||'검증된 제안 없음';
};
renderStaff=function(){
 const grid=document.getElementById('staffGrid');grid.replaceChildren();
 const p=document.createElement('p');p.textContent='원본 일정의 이름을 실제 담당자 ID에 직접 연결하세요. 동명이인·미등록 담당자는 연결 전까지 배정에서 제외됩니다. 계정이 있다는 사실만으로 일정이 없다고 판단하지 않습니다.';grid.append(p);
 const names=[...new Set(live.events.flatMap(e=>e.labels))].sort();
 const suggest=document.createElement('button');suggest.className='btn';suggest.textContent='이름이 유일하게 일치하는 ID 연결 검토';suggest.onclick=()=>{const pairs=names.filter(n=>!live.mapping[n]).map(n=>[n,live.roster.filter(p=>p.name===n)]).filter(([,p])=>p.length===1).map(([n,p])=>[n,p[0].id]);if(!pairs.length)return alert('확실히 일치하는 미연결 이름이 없습니다.');if(!confirm('다음 담당자 ID 대응표를 확인하고 승인하세요. 동명이인 여부도 확인하세요.\n'+pairs.map(([n,id])=>n+' → '+id).join('\n')))return;Object.assign(live.mapping,Object.fromEntries(pairs));persistLive();if(live.raw)Object.assign(live,Core.normalize(live.raw,live.roster,live.mapping));rebuildProposals();renderAll();};grid.append(suggest);
 for(const name of names){const label=document.createElement('label');label.className='staff';label.append(document.createTextNode(name+' → '));const select=document.createElement('select');select.className='btn';select.innerHTML='<option value="">연결 미확인</option>'+live.roster.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.id)})</option>`).join('');select.value=live.mapping[name]||'';select.onchange=()=>{if(select.value)live.mapping[name]=select.value;else delete live.mapping[name];persistLive();if(live.raw)Object.assign(live,Core.normalize(live.raw,live.roster,live.mapping));rebuildProposals();renderAll();};label.append(select);grid.append(label);}
 const list=document.createElement('p');list.textContent='원본 계정: '+live.roster.map(p=>p.name+' ('+p.id+')').join(', ');grid.append(list);
};
addStaff=function(){alert('원본 담당자 목록을 읽기 전용으로 조회합니다. 신규 담당자는 원본 관리자에게 등록을 요청하세요.');};
prepareRequestForm=function(){const sel=document.getElementById('reqFixedStaff'),old=sel.value;sel.innerHTML='<option value="">자동배정</option>'+live.roster.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.id)})</option>`).join('');if(live.roster.some(p=>p.id===old))sel.value=old;};
const originalGoPage=goPage;goPage=function(id){originalGoPage(id);if(id==='request')prepareRequestForm();};
renderPartners=function(list=companies){
 const tb=document.querySelector('#partnerTable tbody');tb.innerHTML=list.map(c=>{const ev=live.confirmed.find(e=>e.companyId===c.id);return `<tr><td>${esc(c.name)}<div class="sub">${esc(c.address)}</div></td><td>${esc(c.id)}</td><td>${esc(c.region||'')}</td><td>${esc((c.preferences||[]).join(' / '))}</td><td><select class="btn" data-fixed="${esc(c.id)}" ${ev?'disabled':''}><option value="">자동배정</option>${live.roster.map(p=>`<option value="${esc(p.id)}" ${c.fixedStaffId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></td><td>${ev?esc(ev.date)+' '+fmt(ev.start)+' · '+esc(sourceName(ev.staffId)):'미확정'}</td><td>${esc(c.status)}</td><td><button class="btn" data-stop="${esc(c.id)}">진행 안 함</button></td></tr>`;}).join('');
 tb.querySelectorAll('[data-fixed]').forEach(s=>s.onchange=()=>{companies.find(c=>c.id===s.dataset.fixed).fixedStaffId=s.value;persistLive();rebuildProposals();renderAll();});
 tb.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>{const c=companies.find(c=>c.id===b.dataset.stop);if(live.confirmed.some(e=>e.companyId===c.id))return alert('확정된 세미나는 유지됩니다. 관리자 변경 승인이 필요합니다.');c.status='X';persistLive();rebuildProposals();renderAll();});
 updateCounts();
};
saveRequest=function(){
 const val=id=>document.getElementById(id).value.trim();const name=val('reqCompanyName'),address=val('reqAddress'),preferences=['d1','d2','d3'].map(val),people=+val('people');
 const start=Core.minute(val('seminarStart')),duration=+val('seminarDuration');
 if(!name||!address||!val('reqContactName')||!val('reqPhone')||preferences.some(d=>!Core.dayOK(d))||new Set(preferences).size!==3||!Number.isInteger(people)||people<3||start===null||!Number.isFinite(duration)||duration<15||start+duration>1440)return alert('필수 정보, 서로 다른 희망일자 3개, 참여인원, 세미나 시간을 확인하세요.');
 const slots=document.getElementById('flexibleTime').checked?[540,600,660,780,840,900,960].filter(t=>t+duration<=1080):[start];
 companies.push({id:'FORM-'+crypto.randomUUID(),name,address,contactName:val('reqContactName'),phone:val('reqPhone'),people,preferences,choices:3,status:'대기',fixedStaffId:val('reqFixedStaff'),fixedStaff:'',slots,duration,region:'',assign:'-'});persistLive();rebuildProposals();renderAll();alert('신청을 이 브라우저에 저장했습니다.');
};
markRequestX=function(){alert('협력사 리스트에서 해당 신청을 선택해 진행 안 함으로 처리하세요.');};
let detailSeminar=null;
openEvent=function(e){detailSeminar=e;const c=companies.find(c=>c.id===e.companyId);document.getElementById('modalName').textContent=c?.name||e.companyId;document.getElementById('modalDate').textContent=e.date+' '+fmt(e.start)+'–'+fmt(e.end)+' · '+sourceName(e.staffId);document.getElementById('modalPeople').textContent=(c?.people||0)+'명';document.getElementById('modalMaterial').textContent=(c?.people||0)+'부';document.getElementById('modalAddress').textContent='주소: '+e.address;document.getElementById('substituteArea').textContent='';document.getElementById('detailModal').classList.add('show');};
findSubstitute=function(){const area=document.getElementById('substituteArea');area.replaceChildren();const e=detailSeminar,c=companies.find(c=>c.id===e?.companyId);if(!e||!c)return;const options=Core.plan([c],live.roster,context(),live.confirmed.filter(x=>x.id!==e.id)).filter(x=>x.staffId!==e.staffId||x.date!==e.date||x.start!==e.start);if(!options.length){area.textContent='현재 조건에서 검증된 대체 일정이 없습니다.';return;}for(const alt of options){const b=document.createElement('button');b.className='btn';b.textContent=sourceName(alt.staffId)+' · '+alt.date+' '+fmt(alt.start)+' · '+alt.assessment;b.onclick=()=>{if(e.status!=='confirmed')return alert('미확정 일정은 자동배정 다시 계산을 사용하세요.');approveReplacement(e,alt);};area.append(b);}};
// Keep mail-template editing and Google Form preparation. Resolve mail data from real records.
renderMailPreview=function(){const c=companies.find(c=>c.id===document.getElementById('mailCompany')?.value),e=live.confirmed.find(e=>e.companyId===c?.id);const values={'{업체명}':c?.name,'{지역}':c?.region,'{세미나일자}':e?.date,'{세미나시간}':e?fmt(e.start):null,'{방문담당자}':e?sourceName(e.staffId):null,'{참석인원}':c?c.people+'명':null,'{신청링크}':document.getElementById('mailApplyLink')?.value};const apply=s=>Object.entries(values).reduce((v,[k,val])=>val?v.split(k).join(val):v,s||'');document.getElementById('mailPreviewSubject').textContent=apply(document.getElementById('mailSubject').value);document.getElementById('mailPreviewBody').textContent=apply(document.getElementById('mailBody').value);};
function mountLive(){
 const dash=document.getElementById('dashboard');dash.querySelector('.kpis').id='legacyCounts';dash.querySelector('.kpis').hidden=true;
 const panel=document.createElement('div');panel.innerHTML='<div class="sync-bar"><div><strong>기존 일정 실시간 연동</strong><p id="liveStatus" role="status" aria-live="polite"></p></div><button class="btn primary" id="syncNow">지금 동기화</button></div><div class="kpis" id="liveKpis"></div><p class="notice" id="liveSummary"></p><div class="notice">세미나 신청·담당자 연결·승인은 이 브라우저에 저장됩니다. 공동 관리자 저장소와 이동시간 API는 아직 연결되지 않았습니다. 일반 업무 종료시간 누락 시 기본 2시간(예상 종료)을 적용하며, 휴가 수집 범위 밖 날짜는 확정할 수 없습니다.</div><div class="panel"><div class="panel-head"><strong>확정 일정 충돌 · 검증 필요</strong></div><div class="panel-body" id="liveConflicts"></div></div>';
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
 document.getElementById('saveRoutes').onclick=()=>{try{const same=Number(document.getElementById('sameRegion').value),routes=JSON.parse(document.getElementById('routeSettings').value);if(!Number.isFinite(same)||same<0||!Array.isArray(routes)||routes.some(r=>!r||typeof r.from!=='string'||typeof r.to!=='string'||!r.from||!r.to||!Number.isFinite(r.minutes)||r.minutes<0))throw Error('지역명과 0 이상의 분 값을 확인하세요.');live.travelSettings={sameRegionMinutes:same,routes};persistLive();rebuildProposals();renderAll();alert('예상 이동시간 설정을 저장했습니다.');}catch(e){alert(e.message);}};
 const demo=document.createElement('details');demo.className='notice';demo.innerHTML='<summary>기존 시안 데이터 보기 · 테스트 전용</summary><p>이전 시안 업체 '+demoCompanies.length+'개, 일정 '+demoEvents.length+'건. 실제 배정에서 제외됩니다.</p><pre></pre>';demo.querySelector('pre').textContent=JSON.stringify({companies:demoCompanies,events:demoEvents},null,2);dash.append(demo);
 renderAll();prepareRequestForm();renderMailManager();document.body.classList.remove('booting');document.getElementById('bootNotice').remove();syncNow();startStreams();setInterval(syncNow,60000);setInterval(drawStatus,10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow();});window.addEventListener('online',syncNow);window.addEventListener('offline',()=>{live.state='동기화 실패';live.error='네트워크 연결 없음';live.proposals=[];renderAll();});
}
mountLive();


