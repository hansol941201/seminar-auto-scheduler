(function(root){
'use strict';
const Core=typeof module!=='undefined'&&module.exports?require('./scheduler-core.js'):root.SchedulerCore;
const SOURCE='https://test-168a4-default-rtdb.asia-southeast1.firebasedatabase.app';
async function snapshot({fetcher=fetch,previousRaw=null,mapping={},mappingMeta={},now=Date.now()}={}){
 const read=async path=>{const r=await fetcher(SOURCE+'/'+path,{method:'GET',cache:'no-store',signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('원본 조회 실패 ('+r.status+')');return r.json();};
 const results=await Promise.allSettled([...Core.paths.map(p=>read(p+'.json')),read('hiworks_vacation_sync/data.json'),read('hiworks_vacation_sync/meta.json'),read('users.json?shallow=true')]);
 const raw={},vacationErrors=[];
 for(const [i,path] of Core.paths.entries()){
  if(results[i].status==='fulfilled')raw[path]=results[i].value;
  else if(path==='vacation'){raw[path]=previousRaw?.vacation??null;vacationErrors.push('기존 휴가 조회 실패');}
  else throw results[i].reason;
 }
 if(results[10].status==='rejected')throw Error('담당자 목록 조회 실패');
 const ids=results[10].value;if(!ids||typeof ids!=='object'||Array.isArray(ids))throw Error('담당자 목록 형식 오류');
 const roster=await Promise.all(Object.keys(ids).map(async id=>{const name=await read('users/'+encodeURIComponent(id)+'/name.json');return{id,name:typeof name==='string'?name:'',missingName:typeof name!=='string'||!name.trim()};}));
 const validNative=value=>{try{return Core.normalize({...Object.fromEntries(Core.paths.map(p=>[p,null])),vacation:value},roster,{}, {includeVacation:false}).issues.length===0;}catch{return false;}};
 if(!validNative(raw.vacation)){vacationErrors.push('기존 휴가 응답 형식 오류');raw.vacation=validNative(previousRaw?.vacation??null)?previousRaw?.vacation??null:null;}
 const unlinked=Core.normalize(raw,roster,{}, {includeVacation:false});
 if(unlinked.issues.length)throw Error(unlinked.issues.join('; '));
 const effective=Core.verifiedMapping(roster,unlinked.events,mapping,mappingMeta);
 let payload=results[8].status==='fulfilled'&&results[9].status==='fulfilled'?{data:results[8].value,meta:results[9].value}:null;
 if(!payload)vacationErrors.push('하이웍스 휴가 조회 실패');
 raw.hiworks_vacation_sync=payload||previousRaw?.hiworks_vacation_sync;
 let normalized;
 try{normalized=Core.normalize(raw,roster,effective);}catch(e){vacationErrors.push(e.message);raw.hiworks_vacation_sync=previousRaw?.hiworks_vacation_sync;try{normalized=Core.normalize(raw,roster,effective);}catch{normalized=Core.normalize(raw,roster,effective,{includeVacation:false});}}
 if(normalized.issues.length)throw Error(normalized.issues.join('; '));
 const health=Core.vacationHealth(payload?.data,payload?.meta,now);
 health.errors.push(...vacationErrors);health.fresh=health.fresh&&vacationErrors.length===0;
 return {raw,roster,events:normalized.events,mappingAudit:Core.mappingAudit(roster,normalized.events,mapping,mappingMeta),vacationHealth:health,months:health.months,vacationSync:health.lastSync,readAt:now};
}
const api={snapshot,SOURCE};root.SourceReader=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
