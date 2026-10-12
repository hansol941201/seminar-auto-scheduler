'use strict';
const {emptyState,failure}=require('./policy.cjs');
function createStore(db,workspace='seminar'){
 if(!/^[a-z0-9-]{1,60}$/.test(workspace))throw Error('운영 공간 ID 오류');
 const root=db.collection('seminarWorkspaces').doc(workspace),stateRef=root.collection('data').doc('state');
 const memberRef=uid=>root.collection('members').doc(uid);
 return{
  async member(uid){const m=(await memberRef(uid).get()).data();if(!m?.active||!['admin','staff'].includes(m.role)||m.role==='staff'&&!m.staffId)throw failure('등록된 회사 직원만 사용할 수 있습니다.',403);return m;},
  async read(){return (await stateRef.get()).data()||{version:0,state:emptyState()};},
  async receipt(id){return (await root.collection('receipts').doc(id).get()).data()||null;},
  async commit({uid,expectedVersion,requestId,hash,next,preparedAt}){
   return db.runTransaction(async tx=>{
    const receiptRef=root.collection('receipts').doc(requestId),historyRef=root.collection('history').doc(requestId);
    const [member,receipt,current]=await Promise.all([tx.get(memberRef(uid)),tx.get(receiptRef),tx.get(stateRef)]);
    if(!member.data()?.active||member.data()?.role!=='admin')throw failure('관리자 승인 권한이 없습니다.',403);
    if(receipt.exists){const r=receipt.data();if(r.uid!==uid||r.hash!==hash)throw failure('중복 요청 ID 내용 불일치',409);return{version:r.version,replayed:true};}
    const previous=current.data()||{version:0,state:emptyState()};if(previous.version!==expectedVersion)throw failure('다른 직원이 먼저 수정했습니다. 최신 상태를 다시 확인하세요.',409);
    if(Date.now()-preparedAt>30000)throw failure('검증 시간이 지났습니다. 다시 시도하세요.',409);
    const version=previous.version+1,at=new Date().toISOString();
    tx.set(stateRef,{version,state:next,updatedAt:at,updatedBy:uid});
    tx.create(historyRef,{version,at,uid,before:previous.state,after:next});
    tx.create(receiptRef,{uid,hash,version,at});return{version,replayed:false};
   });
  },
  async history(){const rows=await root.collection('history').orderBy('version','desc').limit(30).get();return rows.docs.map(d=>({id:d.id,...d.data()}));},
  async consumeRoute(limit){const day=new Date().toISOString().slice(0,10),ref=root.collection('usage').doc('maps-'+day);await db.runTransaction(async tx=>{const doc=await tx.get(ref),count=doc.data()?.count||0;if(count>=limit)throw failure('오늘 지도 API 호출 한도에 도달했습니다.',429);tx.set(ref,{count:count+1,day});});}
 };
}
module.exports={createStore};
