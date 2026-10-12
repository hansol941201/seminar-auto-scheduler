(function(root){
'use strict';
const client={active:false,ready:false,member:null,version:0,state:null,base:'',error:'',busy:false,pending:null,auth:null};
async function call(path,{method='GET',body,authorized=true}={}){
 const headers={};if(body)headers['Content-Type']='application/json';if(authorized){if(!client.auth?.currentUser)throw Error('회사 계정 로그인이 필요합니다.');headers.Authorization='Bearer '+await client.auth.currentUser.getIdToken();}
 const r=await fetch(client.base+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'공용 서버 오류'),{status:r.status});return data;
}
client.prepare=async url=>{
 if(client.active)throw Error('먼저 공용 모드에서 로그아웃하세요.');client.ready=false;const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.search||parsed.hash||parsed.username||parsed.password||parsed.hostname.endsWith('firebasedatabase.app'))throw Error('세미나 전용 HTTPS 서버 주소를 입력하세요.');client.base=parsed.href.replace(/\/$/,'');
 const config=await call('/config',{authorized:false});if(config.schema!==1||config.firebase?.projectId==='test-168a4'||!config.firebase?.projectId)throw Error('별도 세미나 서버 설정이 아닙니다.');
 if(!root.firebase?.auth)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';s.onload=resolve;s.onerror=()=>reject(Error('로그인 모듈 로드 실패'));document.head.append(s);});
 const name='seminar-shared-'+config.firebase.projectId;const app=firebase.apps.find(a=>a.name===name)||firebase.initializeApp(config.firebase,name);client.auth=app.auth();await client.auth.setPersistence(firebase.auth.Auth.Persistence.NONE);client.ready=true;client.providerConnected=config.providerConnected;return config;
};
client.login=async()=>{if(!client.ready)throw Error('먼저 서버 연결을 확인하세요.');await client.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());const data=await client.load();client.active=true;return data;};
client.load=async()=>{const data=await call('/state');client.version=data.version;client.state=data.state;client.member=data.member;client.error='';return data;};
client.snapshot=()=>call('/snapshot');
client.history=()=>call('/history');
client.assess=candidate=>call('/assessment',{method:'POST',body:{companyId:candidate.companyId,date:candidate.date,start:candidate.start,staffId:candidate.staffId}});
client.save=async(state,approval={})=>{
 if(client.busy)throw Error('다른 저장이 진행 중입니다.');if(client.member?.role!=='admin')throw Error('관리자만 공용 데이터를 변경할 수 있습니다.');client.busy=true;
 const payload={expectedVersion:client.version,requestId:crypto.randomUUID(),state,approval};client.pending=payload;
 try{let result;try{result=await call('/state',{method:'PUT',body:payload});}catch(e){if(e.status)throw e;result=await call('/state',{method:'PUT',body:payload});}await client.load();client.pending=null;return result;}
 catch(e){client.error=e.message;try{await client.load();}catch{}throw e;}finally{client.busy=false;}
};
client.logout=async()=>{if(client.busy)throw Error('저장이 끝난 뒤 로그아웃하세요.');if(client.auth)await client.auth.signOut();client.active=false;client.member=null;client.state=null;client.ready=false;client.pending=null;client.error='';};
root.SharedClient=client;
})(globalThis);
