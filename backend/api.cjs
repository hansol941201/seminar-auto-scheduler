'use strict';
const {createHash}=require('node:crypto');
const {failure,prepareUpdate,viewFor}=require('./policy.cjs');
const {assess}=require('./routing.cjs');
const Core=require('../scheduler-core.js');
function createHandler({store,authenticate,sourceLoader,provider,clientConfig,allowedOrigin}){
 const inFlight=new Map();
 return async function(req,res){
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   if(req.headers.origin&&req.headers.origin!==allowedOrigin)throw failure('허용되지 않은 웹사이트',403);
   res.setHeader('Access-Control-Allow-Origin',allowedOrigin);res.setHeader('Vary','Origin');
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});return res.end();}
   const path=new URL(req.url,'http://api.local').pathname;
   if(path==='/config'&&req.method==='GET')return send(200,{firebase:clientConfig,providerConnected:provider.enabled,storage:'firestore',schema:1});
   const uid=await authenticate(req.headers.authorization||'');const member=await store.member(uid);
   if(req.method==='GET'&&path==='/state'){const data=await store.read();return send(200,{...data,state:viewFor(data.state,member),member:{role:member.role,staffId:member.staffId||null},uid});}
   if(req.method==='GET'&&path==='/snapshot'){
    const {state}=await store.read();const source=await sourceLoader({mapping:state.mapping,mappingMeta:state.mappingMeta});
    const filtered=member.role==='admin'?source.events:source.events.filter(e=>!e.unresolved&&e.staffIds.includes(member.staffId));
    return send(200,{events:filtered,roster:member.role==='admin'?source.roster:source.roster.filter(p=>p.id===member.staffId),months:source.months,vacationSync:source.vacationSync,vacationHealth:source.vacationHealth,readAt:source.readAt});
   }
   if(req.method==='GET'&&path==='/history'){if(member.role!=='admin')throw failure('관리자 권한 필요',403);return send(200,{history:await store.history()});}
   if(!['PUT','POST'].includes(req.method)||!['/state','/assessment'].includes(path))throw failure('지원하지 않는 요청',404);
   if(member.role!=='admin')throw failure('관리자 권한 필요',403);
   if(inFlight.has(uid))throw failure('저장 또는 검증이 진행 중입니다.',429);inFlight.set(uid,true);
   try{
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>300000)throw failure('요청 크기 초과',413);}
    let payload;try{payload=JSON.parse(body);}catch{throw failure('JSON 형식 오류');}
    const current=await store.read();
    if(path==='/assessment'){
     const c=current.state.companies.find(c=>c.id===payload.companyId);if(!c||!c.preferences.includes(payload.date)||!c.slots.includes(payload.start))throw failure('신청 조건 확인 필요');
     const source=await sourceLoader({mapping:current.state.mapping,mappingMeta:current.state.mappingMeta});const candidate={id:'proposal/'+c.id,companyId:c.id,date:payload.date,start:payload.start,end:payload.start+c.duration,address:c.address,staffId:payload.staffId,fixedStaffId:c.fixedStaffId||''};
     const ctx={seminarPeriod:current.state.seminarPeriod,events:source.events,months:source.months,fresh:Date.now()-source.readAt<90000,vacationFresh:source.vacationHealth.fresh,vacationPolicy:current.state.vacationPolicy,linkedIds:Object.values(Core.verifiedMapping(source.roster,source.events,current.state.mapping,current.state.mappingMeta)),bufferMinutes:current.state.travelSettings.bufferMinutes,settings:current.state.travelSettings};
     const result=await assess(candidate,source.roster.find(p=>p.id===candidate.staffId),ctx,current.state.confirmed.filter(e=>e.companyId!==c.id),provider);return send(200,{...result,version:current.version,candidate});
    }
    if(!Number.isInteger(payload.expectedVersion)||!/^[-a-zA-Z0-9]{16,80}$/.test(payload.requestId||''))throw failure('버전 또는 요청 ID 오류');
    const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex'),receipt=await store.receipt(payload.requestId);
    if(receipt){if(receipt.uid!==uid||receipt.hash!==hash)throw failure('중복 요청 ID 내용 불일치',409);return send(200,{version:receipt.version,replayed:true});}
    if(current.version!==payload.expectedVersion)throw failure('동시 수정 충돌. 최신 상태를 다시 확인하세요.',409);
    const preparedAt=Date.now(),next=await prepareUpdate({current:current.state,next:payload.state,approval:payload.approval,sourceLoader,provider});
    const result=await store.commit({uid,expectedVersion:payload.expectedVersion,requestId:payload.requestId,hash,next,preparedAt});return send(200,result);
   }finally{inFlight.delete(uid);}
  }catch(e){send(e.status||503,{error:e.status?e.message:'연결 또는 검증을 완료하지 못했습니다. 저장 여부를 다시 확인하세요.'});}
 };
}
module.exports={createHandler};
