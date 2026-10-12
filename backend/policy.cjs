'use strict';
const Core=require('../scheduler-core.js');
const {assess}=require('./routing.cjs');
const emptyState=()=>({seminarPeriod:null,companies:[],mapping:{},mappingMeta:{},confirmed:[],vacationPolicy:{enabled:false},travelSettings:{sameRegionMinutes:45,bufferMinutes:15,routes:[]}});
function failure(message,status=400){return Object.assign(Error(message),{status});}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const text=(s,max=300)=>typeof s==='string'&&s.length<=max;
function validateState(s){
 if(!s||typeof s!=='object'||Buffer.byteLength(JSON.stringify(s))>250000)throw failure('저장 용량 또는 형식 오류');
 if(!Array.isArray(s.companies)||!Array.isArray(s.confirmed)||!s.mapping||!s.mappingMeta||Array.isArray(s.mapping)||Array.isArray(s.mappingMeta))throw failure('공용 데이터 형식 오류');
 if(s.companies.length>500||s.confirmed.length>1000)throw failure('단일 운영 공간 저장 한도를 초과했습니다.');
 const ids=new Set();for(const c of s.companies){if(!c||!text(c.id,100)||!c.id||ids.has(c.id)||!text(c.name)||!c.name||!text(c.address)||!c.address||!text(c.contactName)||!text(c.phone)||!['대기','O','X'].includes(c.status)||!Array.isArray(c.preferences)||c.preferences.length!==3||new Set(c.preferences).size!==3||!c.preferences.every(Core.dayOK)||!Array.isArray(c.slots)||!c.slots.length||c.slots.length>24||!c.slots.every(n=>Number.isInteger(n)&&n>=0&&n+c.duration<=1440)||!Number.isInteger(c.duration)||c.duration<15||c.duration>720||!Number.isInteger(c.people)||c.people<3||!text(c.fixedStaffId||'',100))throw failure('신청 데이터 검증 실패');ids.add(c.id);}
 for(const [name,id] of Object.entries(s.mapping)){if(!text(name,100)||!name||!text(id,100)||!id||['__proto__','constructor','prototype'].includes(name))throw failure('담당자 대응표 형식 오류');const m=s.mappingMeta[name];if(!m||m.staffId!==id||!text(m.nameAtApproval,100)||!Number.isFinite(Date.parse(m.reviewedAt))||!text(m.reason||'',500))throw failure('담당자 검증 기록이 필요합니다.');}
 const t=s.travelSettings;if(!t||!Number.isFinite(t.sameRegionMinutes)||t.sameRegionMinutes<0||t.sameRegionMinutes>1440||!Number.isFinite(t.bufferMinutes)||t.bufferMinutes<0||t.bufferMinutes>180||!Array.isArray(t.routes)||t.routes.length>300||t.routes.some(r=>!r||!text(r.from,100)||!r.from||!text(r.to,100)||!r.to||!Number.isFinite(r.minutes)||r.minutes<0||r.minutes>1440))throw failure('이동 설정 검증 실패');
 if(s.seminarPeriod!=null&&!Core.periodValid(s.seminarPeriod))throw failure('세미나 기간 설정 오류');
 const p=s.vacationPolicy;if(!p||typeof p.enabled!=='boolean'||p.enabled&&(!Core.dayOK(p.startDate)||!Core.dayOK(p.endDate)||p.startDate>p.endDate||!Number.isFinite(Date.parse(p.approvedAt))))throw failure('휴가 미사용 기간 설정 오류');
 return JSON.parse(JSON.stringify(s));
}
async function prepareUpdate({current,next,approval={},sourceLoader,provider,now=Date.now()}){
 validateState(next);
 for(const c of next.companies){const old=current.companies.find(o=>o.id===c.id);if((!old||!eq(old.preferences,c.preferences))&&!c.preferences.every(d=>Core.inPeriod(d,next.seminarPeriod)))throw failure('희망일자는 설정된 세미나 기간 안에서 선택하세요.');}
 if(current.companies.some(c=>!next.companies.some(n=>n.id===c.id)))throw failure('기존 신청 삭제는 허용하지 않습니다.');
 const differences=next.confirmed.filter(e=>!current.confirmed.some(old=>eq(old,e)));
 if(current.confirmed.some(e=>!next.confirmed.some(n=>n.id===e.id)))throw failure('확정 일정 임의 삭제 금지');
 const cids=next.confirmed.map(e=>e.id),companyIds=next.confirmed.map(e=>e.companyId);if(new Set(cids).size!==cids.length||new Set(companyIds).size!==companyIds.length)throw failure('중복 확정 금지');
 for(const e of current.confirmed){const old=current.companies.find(c=>c.id===e.companyId),n=next.companies.find(c=>c.id===e.companyId);if(!eq(old,n))throw failure('확정된 신청의 조건은 변경 승인 절차가 필요합니다.');}
 if(!differences.length)return next;
 if(differences.length!==1||!['confirm','replace'].includes(approval.type))throw failure('한 건씩 관리자 승인해야 합니다.');
 if(!eq(current.seminarPeriod,next.seminarPeriod)||!eq(current.mapping,next.mapping)||!eq(current.mappingMeta,next.mappingMeta)||!eq(current.travelSettings,next.travelSettings)||!eq(current.companies,next.companies)||!eq(current.vacationPolicy,next.vacationPolicy))throw failure('승인과 다른 정보 수정을 분리하세요.');
 const proposed=differences[0],previous=current.confirmed.find(e=>e.id===proposed.id),c=next.companies.find(c=>c.id===proposed.companyId);
 if((approval.type==='replace')!==!!previous||previous&&previous.companyId!==proposed.companyId)throw failure('변경 대상 불일치');
 if(!c||c.status==='X'||!c.preferences.includes(proposed.date)||!c.slots.includes(proposed.start)||proposed.end!==proposed.start+c.duration||proposed.address!==c.address||c.fixedStaffId&&proposed.staffId!==c.fixedStaffId)throw failure('신청 조건과 배정 결과가 일치하지 않습니다.');
 if(Date.parse(proposed.date+'T'+String(Math.floor(proposed.start/60)).padStart(2,'0')+':'+String(proposed.start%60).padStart(2,'0')+':00+09:00')<=now)throw failure('과거 일정 확정 불가');
 const source=await sourceLoader({mapping:next.mapping,mappingMeta:next.mappingMeta});
 const ctx={seminarPeriod:next.seminarPeriod,events:source.events,months:source.months,fresh:Date.now()-source.readAt<90000,vacationFresh:source.vacationHealth.fresh,vacationPolicy:next.vacationPolicy,linkedIds:Object.values(Core.verifiedMapping(source.roster,source.events,next.mapping,next.mappingMeta)),bufferMinutes:next.travelSettings.bufferMinutes,settings:next.travelSettings};
 const canonical={id:previous?.id||'proposal/'+c.id,companyId:c.id,staffId:proposed.staffId,date:proposed.date,start:proposed.start,end:proposed.end,address:c.address,people:c.people,fixedStaffId:c.fixedStaffId||'',rank:c.preferences.indexOf(proposed.date),status:'confirmed'};
 const check=await assess(canonical,source.roster.find(p=>p.id===canonical.staffId),ctx,current.confirmed.filter(e=>e.id!==previous?.id),provider);
 if(!check.ok)throw failure(check.reasons.join(' / '),409);
 if(check.status==='조건부 가능'&&approval.conditionalAccepted!==true)throw failure('조건부 가능 일정의 관리자 확인이 필요합니다.',409);
 const approved={...canonical,assessment:check.status,warnings:check.warnings,legs:check.legs,vacationExceptionApplied:check.vacationExceptionApplied,approvedAt:new Date(now).toISOString(),conditionalAccepted:approval.conditionalAccepted===true,sourceReadAt:new Date(source.readAt).toISOString()};
 next.confirmed=next.confirmed.map(e=>e.id===proposed.id?approved:e);return next;
}
function viewFor(state,member){if(member.role==='admin')return state;const confirmed=state.confirmed.filter(e=>e.staffId===member.staffId);return{...emptyState(),seminarPeriod:state.seminarPeriod||null,confirmed,companies:state.companies.filter(c=>confirmed.some(e=>e.companyId===c.id)).map(c=>({id:c.id,name:c.name,address:c.address,people:c.people,preferences:[],status:c.status}))};}
module.exports={emptyState,failure,validateState,prepareUpdate,viewFor};
