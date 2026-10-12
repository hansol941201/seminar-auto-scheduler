(function(root){
'use strict';
const paths=['pt','briefing','personal','seminar','asq','vacation','meetings','sales'];
const dayOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function minute(s){const text=String(s??'').trim().replace(/시\s*/,':').replace(/분$/,'');const m=/^(\d{1,2})(?::(\d{2})?(?::\d{2})?)?$/.exec(text);return m&&+m[1]<24&&+(m[2]||0)<60?+m[1]*60 + +(m[2]||0):null;}
function interval(r){
 const parts=String(r.time||'').split(/\s*[~～–-]\s*/);
 const a=minute(r.startTime||parts[0]),b=minute(r.endTime||parts[1]);
 if(r.allDay||/종일|출장|휴가|연차|반차/.test([r.type,r.title,r.siteName].join(' ')))return a!==null&&b!==null&&b>a?{start:a,end:b,unknownTime:false,estimatedEnd:false}:{start:0,end:1440,unknownTime:false,estimatedEnd:false,allDay:true};
 if(a!==null&&b!==null&&b>a)return {start:a,end:b,unknownTime:false,estimatedEnd:false};
 if(a!==null&&!r.endTime&&!parts[1]&&a+120<=1440)return {start:a,end:a+120,unknownTime:false,estimatedEnd:true};
 return {start:0,end:1440,unknownTime:true,estimatedEnd:false};
}
function vacationInterval(r){
 const parts=String(r.time||'').split(/\s*[~～–-]\s*/);
 const a=minute(r.start_time??r.startTime??parts[0]),b=minute(r.end_time??r.endTime??parts[1]);
 const title=[r.vacation_type_title,r.title,r.siteName,r.dayType,r.period].filter(Boolean).join(' ');
 const timed=r.type==='hours'||r.dayType==='hours';
 if(a!==null&&b!==null&&b>a&&!r.allDay)return {start:a,end:b,unknownTime:false,estimatedEnd:false,vacation:true};
 if(timed)return {start:0,end:1440,unknownTime:true,estimatedEnd:false,vacation:true};
 if(/오전|\bam\b/i.test(title))return {start:0,end:720,unknownTime:false,estimatedEnd:false,vacation:true,halfDay:'am'};
 if(/오후|\bpm\b/i.test(title))return {start:720,end:1440,unknownTime:false,estimatedEnd:false,vacation:true,halfDay:'pm'};
 if(/반차/.test(title)||Number(r.days)>0&&Number(r.days)<1)return {start:0,end:1440,unknownTime:true,estimatedEnd:false,vacation:true};
 return {start:0,end:1440,unknownTime:false,estimatedEnd:false,allDay:true,vacation:true};
}
function labels(r){return [...new Set([r.assignee,r.ptAssignee,r.userName,...(Array.isArray(r.assignees)?r.assignees:[]),...(Array.isArray(r.attendees)?r.attendees:[])].filter(x=>typeof x==='string').flatMap(x=>x.split(/[\/,]/)).map(x=>x.trim()).filter(Boolean))];}
function mappingAudit(roster,events,mapping,meta={}){
 const names=[...new Set([...roster.map(p=>p.name),...events.flatMap(e=>e.labels)])].sort();
 return names.map(name=>{const matches=roster.filter(p=>p.name===name),id=mapping[name],target=roster.find(p=>p.id===id),approval=meta[name];
  let status='미연결';if(id&&!target)status='대상 ID 없음';else if(target?.missingName)status='담당자 이름 미확인';else if(target){status=approval?.staffId===id&&approval?.nameAtApproval===target.name&&approval?.reviewedAt?'연결 확인':'재검토 필요';if(matches.length>1&&!approval?.duplicateResolved)status='동명이인 확인 필요';}
  else if(matches.length>1)status='동명이인 확인 필요';
  return {name,id:id||'',target:target?.name||'',matches:matches.map(p=>p.id),status,count:events.filter(e=>e.labels.includes(name)).length,reviewedAt:approval?.reviewedAt||null};
 });
}
function verifiedMapping(roster,events,mapping,meta){return Object.fromEntries(mappingAudit(roster,events,mapping,meta).filter(r=>r.status==='연결 확인').map(r=>[r.name,r.id]));}
function vacationHealth(data,meta,now=Date.now()){
 const stamp=Date.parse(meta?.lastSync),errors=[];
 if(!Number.isFinite(stamp))errors.push('원본 휴가 수집 시각 없음');else if(now-stamp>36*3600000||stamp>now+300000)errors.push('원본 휴가 수집 시각 지연 또는 오류');
 const available=Object.keys(data||{});const declared=Array.isArray(meta?.syncedMonths)?meta.syncedMonths:[];
 // A historical cached month is not fresh just because another month was collected.
 const months=available.filter(m=>declared.includes(m)&&Array.isArray(data[m]));
 if(!months.length)errors.push('최근 수집이 확인된 월 데이터 없음');
 const missing=declared.filter(m=>!available.includes(m));
 return {fresh:errors.length===0,months,available,missing,errors,lastSync:meta?.lastSync||null};
}
function vacationException(policy,date,nowDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 return policy?.enabled===true&&dayOK(policy.startDate)&&dayOK(policy.endDate)&&policy.startDate<=policy.endDate&&dayOK(date)&&date>=policy.startDate&&date<=policy.endDate&&nowDate<=policy.endDate&&Number.isFinite(Date.parse(policy.approvedAt));
}
function normalize(raw,roster,mapping,{includeVacation=true}={}){
 const out=[],issues=[];const ids=new Set(roster.map(x=>x.id));
 function add(path,key,r){
  if(!r||typeof r!=='object'||Array.isArray(r)){issues.push(path+': 일정 형식 오류');return;}
  if(r.deleted||['취소','cancelled','canceled','deleted'].includes(r.status))return;
  const names=labels(r);const direct=[r.assigneeId,...(Array.isArray(r.assigneeIds)?r.assigneeIds:[])].filter(Boolean);
  const staffIds=[...new Set([...direct,...names.map(n=>mapping[n]).filter(Boolean)])];
  const unresolved=(!names.length&&!direct.length)||names.some(n=>!mapping[n])||staffIds.some(id=>!ids.has(id));
  const validDate=dayOK(r.date);
  out.push({id:path+'/'+key,sourceId:r.id??key,type:path,date:validDate?r.date:null,rawDate:r.date||'',...(path==='vacation'||path==='hiworks'?vacationInterval(r):interval(r)),labels:names,staffIds,unresolved,title:r.siteName||r.title||r.company||'기존 업무',address:r.address||r.location||'',status:r.status||r.dateType||'상태 미제공'});
 }
 for(const path of paths){const data=raw[path];if(data!==null&&(!data||typeof data!=='object'||Array.isArray(data)))throw Error(path+': 응답 형식 오류');for(const [key,r] of Object.entries(data||{}))add(path,key,r);}
 if(!includeVacation)return {events:out,issues};
 const hw=raw.hiworks_vacation_sync;
 const knownNames=new Set([...roster.map(p=>p.name),...out.flatMap(e=>e.labels),...Object.keys(mapping)]);
 if(!hw?.data||typeof hw.data!=='object'||Array.isArray(hw.data))throw Error('하이웍스 휴가 응답 형식 오류');
 for(const [month,rows] of Object.entries(hw.data)){
  if(!/^\d{4}-\d{2}$/.test(month)||!Array.isArray(rows))throw Error('하이웍스 월별 형식 오류');
  for(const r of rows){if(!r||!dayOK(r.date)||r.office_user_no==null)throw Error('하이웍스 식별자/날짜 오류');if(['취소','취소완료','반려','결재반려','회수','cancelled','canceled'].includes(r.approval_status)||!knownNames.has(r.user_name))continue;
   if(!['결재완료','결재중'].includes(r.approval_status))throw Error('알 수 없는 휴가 승인 상태');
   add('hiworks',`${r.office_user_no}/${r.date}/${r.start_time}`,{...r,assignee:r.user_name,title:'휴가 · '+(r.type==='hours'?'시간 단위':/반차/.test(r.vacation_type_title||'')?'반차':'종일'),vacation_type_title:r.vacation_type_title,status:r.approval_status});
  }
 }
 return {events:[...new Map(out.map(e=>[e.id,e])).values()],issues,months:Object.keys(hw.data),vacationSync:hw.meta?.lastSync||null};
}
function check(candidate,person,ctx,assigned=[]){
 const reasons=[],warnings=[],legs=[];let travel=0;const buffer=ctx.bufferMinutes??15;
 if(!Number.isFinite(buffer)||buffer<0)reasons.push('이동 여유시간 설정 오류');
 if(!ctx.fresh)reasons.push('동기화 실패 또는 최신 확인 필요');
 if(!person||!ctx.linkedIds.includes(person.id))reasons.push('담당자 연결 미확인');
 if(!dayOK(candidate.date)||!Number.isFinite(candidate.start)||!Number.isFinite(candidate.end)||candidate.end<=candidate.start||candidate.start<0||candidate.end>1440)reasons.push('세미나 시간 오류');
 const vacationExceptionApplied=vacationException(ctx.vacationPolicy,candidate.date,ctx.nowDate);
 if(!vacationExceptionApplied&&!ctx.months.includes(candidate.date?.slice(0,7)))reasons.push('해당 월 휴가 조회 범위 미확인');
 if(!vacationExceptionApplied&&!ctx.vacationFresh)reasons.push('하이웍스 원본 동기화 시각 확인 필요');
 if(candidate.fixedStaffId&&candidate.fixedStaffId!==person?.id)reasons.push('지정 담당자 조건');
 if(!candidate.address||!ctx.region?.(candidate.address))reasons.push('세미나 주소/지역 확인 필요');
 const relevant=ctx.events.filter(e=>!e.date||e.date===candidate.date);
 if(relevant.some(e=>e.unresolved))reasons.push('날짜/담당자 미연결 기존 일정 존재');
 const busy=relevant.filter(e=>e.staffIds.includes(person?.id));
 if(busy.some(e=>!e.date))reasons.push('날짜 미정 기존 업무 존재');
 const seminars=assigned.filter(e=>e.id!==candidate.id&&e.staffId===person?.id&&e.date===candidate.date);
 if(seminars.length>=2)reasons.push('하루 최대 2건');
 const timeline=[...busy,...seminars];
 for(const e of timeline)if(candidate.start<e.end&&e.start<candidate.end)reasons.push(e.unknownTime?'기존 일정 종료시간 미확인: '+e.title:'시간 중복: '+(e.title||e.companyId));
 const spatial=timeline.filter(e=>!e.vacation);
 let previous=spatial.filter(e=>e.end<=candidate.start).sort((a,b)=>b.end-a.end)[0];
 let next=spatial.filter(e=>e.start>=candidate.end).sort((a,b)=>a.start-b.start)[0];
 const beforeLeave=timeline.filter(e=>e.vacation&&e.end<=candidate.start).sort((a,b)=>b.end-a.end)[0];
 const afterLeave=timeline.filter(e=>e.vacation&&e.start>=candidate.end).sort((a,b)=>a.start-b.start)[0];
 if(beforeLeave&&(!previous||beforeLeave.end>previous.end)){warnings.push('휴가 후 출발 위치 관리자 확인 필요');if(previous)previous={...previous,end:beforeLeave.end};}
 if(afterLeave&&(!next||afterLeave.start<next.start)){warnings.push('휴가 전 이동 위치 관리자 확인 필요');if(next)next={...next,start:afterLeave.start};}
 for(const [a,b] of [[previous,candidate],[candidate,next]])if(a&&b){
  const route=a.address&&b.address&&a.address===b.address?{minutes:0,estimated:false}:ctx.travel?.(a,b);
  const minutes=typeof route==='number'?route:route?.minutes;
  if(!Number.isFinite(minutes)||minutes<0)reasons.push('이동시간 API 미연결 / 장소 확인 필요');
  else {travel+=minutes;const verified=route?.verified===true&&route?.estimated===false||a.address&&a.address===b.address;if(!verified)warnings.push(route?.provider?'지도 API 예측 이동시간 · 관리자 확인 필요':'예상 이동시간 적용');if(a.end+minutes+buffer>b.start)reasons.push('이동시간 부족 (여유시간 포함)');legs.push({from:a.address,to:b.address,departure:a.end,arrival:a.end+minutes+buffer,deadline:b.start,minutes,buffer,estimated:!verified,provider:route?.provider||null});}
  if(a.estimatedEnd||b.estimatedEnd)warnings.push('기존 업무 기본 2시간 · 예상 종료 적용');
 }
 const status=reasons.length?(reasons.some(s=>/중복|최대 2건|이동시간 부족|지정 담당자/.test(s))?'배정 불가':'확인 필요'):warnings.length?'조건부 가능':'배정 가능';
 return {ok:reasons.length===0,reasons:[...new Set(reasons)],warnings:[...new Set(warnings)],status,travel,legs,vacationExceptionApplied};
}
// Bounded beam search: maximize placed requests, then preference, travel and workload.
function plan(requests,people,ctx,confirmed){
 let beam=[{items:[],cost:0}];const targets=requests.filter(c=>c.status!=='X'&&!c.testData&&!confirmed.some(e=>e.companyId===c.id)).sort((a,b)=>Number(!!b.fixedStaffId)-Number(!!a.fixedStaffId)||a.preferences.length-b.preferences.length);
 for(const c of targets){const next=[];
  for(const state of beam){next.push(state);for(const [rank,date] of c.preferences.entries())for(const person of people)for(const start of c.slots||[]){
   const candidate={id:'proposal/'+c.id,companyId:c.id,staffId:person.id,date,start,end:start+c.duration,address:c.address,people:c.people,fixedStaffId:c.fixedStaffId||'',rank,status:'draft'};
   const assigned=[...confirmed,...state.items];const result=check(candidate,person,ctx,assigned);if(!result.ok)continue;
   const load=assigned.filter(e=>e.staffId===person.id).length;
   candidate.assessment=result.status;candidate.warnings=result.warnings;candidate.legs=result.legs;candidate.vacationExceptionApplied=result.vacationExceptionApplied;
   next.push({items:[...state.items,candidate],cost:state.cost+rank*100+result.travel+load*25});
  }}
  beam=next.sort((a,b)=>b.items.length-a.items.length||a.cost-b.cost).slice(0,80);
 }
 return beam[0]?.items||[];
}
const api={paths,dayOK,minute,interval,vacationInterval,labels,mappingAudit,verifiedMapping,vacationHealth,vacationException,normalize,check,plan};root.SchedulerCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
