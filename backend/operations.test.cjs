const {test}=require('node:test'),assert=require('node:assert/strict');
const {emptyState,prepareUpdate,viewFor}=require('./policy.cjs');
const {createKakao,assess}=require('./routing.cjs');
const {createHandler}=require('./api.cjs');
const {createStore}=require('./firestore-store.cjs');
const {createServer}=require('node:http');
const person={id:'fixture-staff',name:'가상 담당자'};
function state(){const s=emptyState();s.mapping={[person.name]:person.id};s.mappingMeta={[person.name]:{staffId:person.id,nameAtApproval:person.name,reviewedAt:'2026-10-12'}};s.vacationPolicy={enabled:true,startDate:'2099-01-01',endDate:'2099-01-31',approvedAt:'2026-10-12'};s.companies=[{id:'fixture',name:'가상업체',address:'가상시 가상로 1',contactName:'가상',phone:'테스트',status:'대기',preferences:['2099-01-15','2099-01-16','2099-01-17'],slots:[780],duration:120,people:3}];return s;}
const candidate={id:'proposal/fixture',companyId:'fixture',staffId:person.id,date:'2099-01-15',start:780,end:900,address:'가상시 가상로 1'};
const snapshot=()=>({roster:[person],events:[],months:[],vacationHealth:{fresh:false},readAt:Date.now()});
test('기간 설정 저장은 기존 신청과 확정 세미나를 수정하거나 삭제하지 않음',async()=>{
 const current=state();current.confirmed=[{...candidate,status:'confirmed'}];const before=JSON.stringify(current),next=structuredClone(current);
 next.vacationPolicy={enabled:false,startDate:'2026-12-01',endDate:'',approvedAt:'2026-10-12'};
 const result=await prepareUpdate({current,next,sourceLoader:async()=>{throw Error('기간 저장만으로 원본 변경/재승인 불필요');}});
 assert.deepEqual(result.confirmed,current.confirmed);assert.deepEqual(result.companies,current.companies);assert.equal(JSON.stringify(current),before);
});
test('서버는 승인 때 최신 업무 재조회, 휴가 예외만 허용',async()=>{
 const current=state(),next=structuredClone(current);next.confirmed=[candidate];let reads=0;
 const result=await prepareUpdate({current,next,approval:{type:'confirm'},sourceLoader:async()=>{reads++;return snapshot();}});assert.equal(reads,1);assert.equal(result.confirmed[0].vacationExceptionApplied,true);
 for(const event of [{vacation:true,start:0,end:1440},{start:780,end:900}]){
 const n=structuredClone(current);n.confirmed=[candidate];await assert.rejects(prepareUpdate({current,next:n,approval:{type:'confirm'},sourceLoader:async()=>({...snapshot(),events:[{...event,id:'busy',date:candidate.date,staffIds:[person.id],labels:[person.name],title:'기존'}]})}),/중복/);
 }
});
test('서버는 조건부 미승인·고정 담당자·휴가 기간 밖 확정을 차단',async()=>{
 const current=state(),next=structuredClone(current);next.confirmed=[candidate];
 const sourceLoader=async()=>({...snapshot(),events:[{id:'busy',date:candidate.date,staffIds:[person.id],labels:[person.name],title:'업무',start:540,end:660,address:'가상시 가상로 2'}]});
 await assert.rejects(prepareUpdate({current,next,approval:{type:'confirm'},sourceLoader}),/조건부/);
 assert.equal((await prepareUpdate({current,next,approval:{type:'confirm',conditionalAccepted:true},sourceLoader})).confirmed[0].assessment,'조건부 가능');
 const s=state();s.vacationPolicy.enabled=false;const n=structuredClone(s);n.confirmed=[candidate];await assert.rejects(prepareUpdate({current:s,next:n,approval:{type:'confirm'},sourceLoader:async()=>snapshot()}),/휴가|동기화/);
 const fixed=state();fixed.companies[0].fixedStaffId='other';const f=structuredClone(fixed);f.confirmed=[candidate];await assert.rejects(prepareUpdate({current:fixed,next:f,approval:{type:'confirm'},sourceLoader}),/일치/);
});
test('직원 응답에는 본인 일정만, 연락처와 다른 담당자 매칭 제외',()=>{
 const s=state();s.confirmed=[candidate,{...candidate,id:'other',staffId:'other'}];const v=viewFor(s,{role:'staff',staffId:person.id});assert.equal(v.confirmed.length,1);assert.equal(v.companies[0].phone,undefined);assert.deepEqual(v.mapping,{});
});
test('지도 API는 서버 인증, 초→분 변환, 미래 예측 표시, 호출 캐시',async()=>{
 const a={address:'가상시 가상로 1',date:'2099-01-15',end:660},b={address:'가상시 가상로 2'};let calls=0,charged=0;
 const provider=createKakao({key:'fixture-not-real',consume:async()=>charged++,fetcher:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'KakaoAK fixture-not-real');return{ok:true,json:async()=>url.hostname==='dapi.kakao.com'?{meta:{total_count:1},documents:[{address_name:url.searchParams.get('query'),x:'127',y:'37'}]}:{routes:[{result_code:0,summary:{duration:1801,distance:10000}}]}};}});
 const route=await provider.route(a,b);assert.equal(route.minutes,31);assert.equal(route.estimated,true);assert.equal(route.verified,false);await provider.route(a,b);assert.equal(calls,3);assert.equal(charged,3);
});
test('주소 모호·API 오류는 예상값으로 숨기지 않고 확정 차단',async()=>{
 const provider=createKakao({key:'fixture',fetcher:async()=>({ok:true,json:async()=>({meta:{total_count:2},documents:[{},{}]})})});
 await assert.rejects(provider.route({address:'가상시 가상로 1',date:'2099-01-15',end:660},{address:'가상시 가상로 2'}),/둘 이상/);
 const s=state(),ctx={events:[{date:candidate.date,staffIds:[person.id],labels:[person.name],start:540,end:660,address:'가상시 가상로 2'}],fresh:true,vacationFresh:false,vacationPolicy:s.vacationPolicy,months:[],linkedIds:[person.id],settings:s.travelSettings};const result=await assess(candidate,person,ctx,[],provider);assert.equal(result.ok,false);assert.equal(result.routeErrors.length,1);
});
test('HTTP API 인증·역할·동시 수정·재전송 검증',async t=>{
 let version=0,data=state(),commits=0;const receipts=new Map();
 const store={member:async uid=>({active:true,role:uid==='admin'?'admin':'staff',staffId:person.id}),read:async()=>({version,state:structuredClone(data)}),receipt:async id=>receipts.get(id),commit:async args=>{if(args.expectedVersion!==version)throw Object.assign(Error('conflict'),{status:409});commits++;data=args.next;version++;receipts.set(args.requestId,{uid:args.uid,hash:args.hash,version});return{version};}};
 const server=createServer(createHandler({store,authenticate:async token=>{if(!['admin','staff'].includes(token))throw Object.assign(Error('unauthorized'),{status:401});return token;},sourceLoader:async()=>snapshot(),provider:{enabled:false},clientConfig:{projectId:'fixture'},allowedOrigin:'https://fixture.example'}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/state')).status,401);
 assert.equal((await fetch(base+'/history',{headers:{Authorization:'staff'}})).status,403);
 assert.equal((await fetch(base+'/state',{headers:{Authorization:'admin',Origin:'https://wrong.example'}})).status,403);
 const body={requestId:'fixture-request-0001',expectedVersion:0,state:data},put=(v,auth='admin')=>fetch(base+'/state',{method:'PUT',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(v)});
 assert.equal((await put(body,'staff')).status,403);assert.equal((await put(body)).status,200);assert.equal((await put(body)).status,200);assert.equal(commits,1);
 assert.equal((await put({...body,requestId:'fixture-request-0002'})).status,409);
 assert.equal((await put({...body,state:{...data,vacationPolicy:{enabled:false}}})).status,409);
});
test('Firestore transaction rechecks member and version, preserves audit and receipt',async()=>{
 const docs=new Map(),path='seminarWorkspaces/seminar',ref=p=>({path:p,collection:n=>ref(p+'/'+n),doc:n=>ref(p+'/'+n),get:async()=>snap(p)}),snap=p=>({exists:docs.has(p),data:()=>docs.get(p)});let creates=0;
 const db={collection:n=>ref(n),runTransaction:async fn=>fn({get:async r=>snap(r.path),set:(r,v)=>docs.set(r.path,v),create:(r,v)=>{creates++;docs.set(r.path,v);}})};
 docs.set(path+'/members/admin',{active:true,role:'admin'});const store=createStore(db),args={uid:'admin',expectedVersion:0,requestId:'fixture-request-0001',hash:'fixture-hash',next:state(),preparedAt:Date.now()};
 assert.equal((await store.commit(args)).version,1);assert.equal((await store.commit(args)).replayed,true);assert.equal(creates,2);assert.equal(docs.get(path+'/history/'+args.requestId).before.confirmed.length,0);
 await assert.rejects(store.commit({...args,requestId:'fixture-request-0002'}),/다른 직원/);
 docs.set(path+'/members/admin',{active:false,role:'admin'});await assert.rejects(store.commit({...args,expectedVersion:1}),/권한/);
});
