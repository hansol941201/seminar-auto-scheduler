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
function labels(r){return [...new Set([r.assignee,r.ptAssignee,...(Array.isArray(r.assignees)?r.assignees:[]),...(Array.isArray(r.attendees)?r.attendees:[])].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];}
function normalize(raw,roster,mapping){
 const out=[],issues=[];const ids=new Set(roster.map(x=>x.id));
 function add(path,key,r){
  if(!r||typeof r!=='object'||Array.isArray(r)){issues.push(path+': 일정 형식 오류');return;}
  if(r.deleted||['취소','cancelled','canceled','deleted'].includes(r.status))return;
  const names=labels(r);const direct=[r.assigneeId,...(Array.isArray(r.assigneeIds)?r.assigneeIds:[])].filter(Boolean);
  const staffIds=[...new Set([...direct,...names.map(n=>mapping[n]).filter(Boolean)])];
  const unresolved=(!names.length&&!direct.length)||names.some(n=>!mapping[n])||staffIds.some(id=>!ids.has(id));
  const validDate=dayOK(r.date);
  out.push({id:path+'/'+key,sourceId:r.id??key,type:path,date:validDate?r.date:null,rawDate:r.date||'',...interval({...r,allDay:r.allDay||path==='vacation'&& !r.endTime}),labels:names,staffIds,unresolved,title:r.siteName||r.title||r.company||'기존 업무',address:r.address||r.location||'',status:r.status||r.dateType||'상태 미제공'});
 }
 for(const path of paths){const data=raw[path];if(data!==null&&(!data||typeof data!=='object'||Array.isArray(data)))throw Error(path+': 응답 형식 오류');for(const [key,r] of Object.entries(data||{}))add(path,key,r);}
 const hw=raw.hiworks_vacation_sync;
 const knownNames=new Set([...roster.map(p=>p.name),...out.flatMap(e=>e.labels),...Object.keys(mapping)]);
 if(!hw?.data||typeof hw.data!=='object'||Array.isArray(hw.data))throw Error('하이웍스 휴가 응답 형식 오류');
 for(const [month,rows] of Object.entries(hw.data)){
  if(!/^\d{4}-\d{2}$/.test(month)||!Array.isArray(rows))throw Error('하이웍스 월별 형식 오류');
  for(const r of rows){if(!r||!dayOK(r.date)||r.office_user_no==null)throw Error('하이웍스 식별자/날짜 오류');if(!['결재완료','결재중'].includes(r.approval_status)||!knownNames.has(r.user_name))continue;
   add('hiworks',`${r.office_user_no}/${r.date}/${r.start_time}`,{date:r.date,assignee:r.user_name,title:r.vacation_type_title||'휴가',status:r.approval_status,startTime:r.type==='hours'?r.start_time:null,endTime:r.type==='hours'?r.end_time:null});
  }
 }
 return {events:[...new Map(out.map(e=>[e.id,e])).values()],issues,months:Object.keys(hw.data),vacationSync:hw.meta?.lastSync||null};
}
function check(candidate,person,ctx,assigned=[]){
 const reasons=[],warnings=[];let travel=0;
 if(!ctx.fresh)reasons.push('동기화 실패 또는 최신 확인 필요');
 if(!person||!ctx.linkedIds.includes(person.id))reasons.push('담당자 연결 미확인');
 if(!dayOK(candidate.date)||!Number.isFinite(candidate.start)||!Number.isFinite(candidate.end)||candidate.end<=candidate.start||candidate.start<0||candidate.end>1440)reasons.push('세미나 시간 오류');
 if(!ctx.months.includes(candidate.date?.slice(0,7)))reasons.push('해당 월 휴가 조회 범위 미확인');
 if(!ctx.vacationFresh)reasons.push('하이웍스 원본 동기화 시각 확인 필요');
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
 const previous=timeline.filter(e=>e.end<=candidate.start).sort((a,b)=>b.end-a.end)[0];
 const next=timeline.filter(e=>e.start>=candidate.end).sort((a,b)=>a.start-b.start)[0];
 for(const [a,b] of [[previous,candidate],[candidate,next]])if(a&&b){
  const route=a.address&&b.address&&a.address===b.address?{minutes:0,estimated:false}:ctx.travel?.(a,b);
  const minutes=typeof route==='number'?route:route?.minutes;
  if(!Number.isFinite(minutes)||minutes<0)reasons.push('이동시간 API 미연결 / 장소 확인 필요');
  else {travel+=minutes;if(route?.estimated)warnings.push('지역별 예상 이동시간 적용');if(a.end+minutes>b.start)reasons.push('이동시간 부족');}
  if(a.estimatedEnd||b.estimatedEnd)warnings.push('기존 업무 기본 2시간 · 예상 종료 적용');
 }
 const status=reasons.length?(reasons.some(s=>/중복|최대 2건|이동시간 부족|지정 담당자/.test(s))?'배정 불가':'확인 필요'):warnings.length?'조건부 가능':'배정 가능';
 return {ok:reasons.length===0,reasons:[...new Set(reasons)],warnings:[...new Set(warnings)],status,travel};
}
// Bounded beam search: maximize placed requests, then preference, travel and workload.
function plan(requests,people,ctx,confirmed){
 let beam=[{items:[],cost:0}];const targets=requests.filter(c=>c.status!=='X'&&!c.testData&&!confirmed.some(e=>e.companyId===c.id)).sort((a,b)=>Number(!!b.fixedStaffId)-Number(!!a.fixedStaffId)||a.preferences.length-b.preferences.length);
 for(const c of targets){const next=[];
  for(const state of beam){next.push(state);for(const [rank,date] of c.preferences.entries())for(const person of people)for(const start of c.slots||[]){
   const candidate={id:'proposal/'+c.id,companyId:c.id,staffId:person.id,date,start,end:start+c.duration,address:c.address,people:c.people,fixedStaffId:c.fixedStaffId||'',rank,status:'draft'};
   const assigned=[...confirmed,...state.items];const result=check(candidate,person,ctx,assigned);if(!result.ok)continue;
   const load=assigned.filter(e=>e.staffId===person.id).length;
   candidate.assessment=result.status;candidate.warnings=result.warnings;
   next.push({items:[...state.items,candidate],cost:state.cost+rank*100+result.travel+load*25});
  }}
  beam=next.sort((a,b)=>b.items.length-a.items.length||a.cost-b.cost).slice(0,80);
 }
 return beam[0]?.items||[];
}
const api={paths,dayOK,minute,interval,labels,normalize,check,plan};root.SchedulerCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
