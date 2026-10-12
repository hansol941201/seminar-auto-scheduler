const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('./scheduler-core.js'),Reader=require('./source-reader.js');
const person={id:'fixture-person',name:'가상 담당자'};
const policy={enabled:true,startDate:'2099-01-01',endDate:'2099-01-31',approvedAt:'2026-10-12T00:00:00Z'};
const candidate={id:'proposal/fixture',companyId:'fixture',staffId:person.id,date:'2099-01-15',start:780,end:900,address:'가상시 가상로 1'};
const context=()=>({fresh:true,vacationFresh:false,months:[],vacationPolicy:policy,nowDate:'2099-01-01',events:[],linkedIds:[person.id],region:()=> '가상시',travel:()=>({minutes:30,estimated:true}),bufferMinutes:15});
const leave=(props={})=>({id:'vacation/fixture',date:candidate.date,start:0,end:1440,vacation:true,staffIds:[person.id],labels:[person.name],title:'휴가',...props});
test('한국시간 자정·연말 경계는 기기 시간대와 무관하게 실제 날짜 사용',()=>{
 assert.equal(C.seoulDate('2026-11-30T14:59:59Z'),'2026-11-30');
 assert.equal(C.seoulDate('2026-11-30T15:00:00Z'),'2026-12-01');
 assert.equal(C.seoulDate('2026-12-31T15:00:00Z'),'2027-01-01');
});
test('12월 시작일은 표시 제안만 제공하며 저장 상태·종료일·확정 일정 변경 없음',()=>{
 const state={vacationPolicy:{enabled:false},confirmed:[candidate],events:[leave()]},before=JSON.stringify(state);
 assert.deepEqual(C.operationPeriodDraft(state.vacationPolicy),{enabled:false,startDate:'2026-12-01',endDate:'',suggested:true});
 assert.equal(JSON.stringify(state),before);
 assert.equal(C.vacationException(state.vacationPolicy,'2026-12-01','2026-10-12'),false);
 const existing={enabled:true,startDate:'2026-12-10',endDate:'2026-12-20',approvedAt:'2026-10-12'};
 assert.equal(C.operationPeriodDraft(existing).startDate,existing.startDate);
 assert.equal(C.operationPeriodDraft(existing).endDate,existing.endDate);
});
test('관리자 활성화·양쪽 날짜·승인이 모두 있어야 휴가 예외 적용',()=>{
 const approved={enabled:true,startDate:'2026-12-01',endDate:'2026-12-20',approvedAt:'2026-10-12'};
 for(const patch of [{enabled:false},{startDate:''},{endDate:''},{approvedAt:''}])assert.equal(C.vacationException({...approved,...patch},'2026-12-01','2026-10-12'),false);
 assert.equal(C.vacationException(approved,'2026-12-01','2026-10-12'),true);
});
test('휴가 예외는 승인된 기간에만 적용하고 종료 다음 날 자동 복귀',()=>{
 assert.equal(C.check(candidate,person,context()).ok,true);
 for(const date of ['2098-12-31','2099-02-01'])assert.equal(C.check({...candidate,date},person,context()).ok,false);
 assert.equal(C.check(candidate,person,{...context(),nowDate:'2099-02-01'}).ok,false);
 for(const p of [{...policy,enabled:false},{...policy,approvedAt:''},{...policy,startDate:'2099-02-01'}])assert.equal(C.check(candidate,person,{...context(),vacationPolicy:p}).ok,false);
});
test('휴가 예외에서도 실제 휴가·일반 동기화·매칭·고정 담당자 차단 유지',()=>{
 for(const patch of [{events:[leave()]},{fresh:false},{linkedIds:[]}])assert.equal(C.check(candidate,person,{...context(),...patch}).ok,false);
 assert.equal(C.check({...candidate,fixedStaffId:'other'},person,context()).ok,false);
});
test('종일·오전·오후·시간 휴가와 불명확 반차 구분',()=>{
 assert.deepEqual([C.vacationInterval({allDay:true}).start,C.vacationInterval({allDay:true}).end],[0,1440]);
 assert.equal(C.vacationInterval({title:'오전 반차'}).end,720);
 assert.equal(C.vacationInterval({title:'오후 반차'}).start,720);
 assert.equal(C.vacationInterval({title:'반차'}).unknownTime,true);
 const t=C.vacationInterval({type:'hours',start_time:'13:30:00',end_time:'15:30:00'});assert.deepEqual([t.start,t.end],[810,930]);
 assert.equal(C.vacationInterval({type:'hours',start_time:'13:00'}).unknownTime,true);
 const morning=leave(C.vacationInterval({title:'오전 반차'}));assert.equal(C.check(candidate,person,{...context(),events:[morning]}).status,'조건부 가능');
 assert.equal(C.check(candidate,person,{...context(),events:[leave(C.vacationInterval({title:'오후 반차'}))]}).ok,false);
});
test('앞뒤 이동 모두 여유시간 포함, 예외로 이동 부족 해제 불가',()=>{
 const work={...leave(),vacation:false,address:'가상시 가상로 2',start:600,end:740};
 assert.equal(C.check(candidate,person,{...context(),events:[work]}).ok,false);
 assert.equal(C.check(candidate,person,{...context(),events:[{...work,start:940,end:1000}]}).ok,false);
 assert.equal(C.check(candidate,person,{...context(),events:[{...work,end:735}]}).status,'조건부 가능');
});
test('담당자 관리자 검토·이름 변경·중복 이름·존재하지 않는 ID 검사',()=>{
 const roster=[person],mapping={[person.name]:person.id},meta={[person.name]:{staffId:person.id,nameAtApproval:person.name,reviewedAt:'2026-10-12'}};
 assert.deepEqual(C.verifiedMapping(roster,[],mapping,{}),{});
 assert.deepEqual(C.verifiedMapping(roster,[],mapping,meta),mapping);
 assert.deepEqual(C.verifiedMapping([{...person,name:'변경됨'}],[{labels:[person.name]}],mapping,meta),{});
 assert.deepEqual(C.verifiedMapping([...roster,{...person,id:'duplicate'}],[],mapping,meta),{});
 assert.deepEqual(C.verifiedMapping([], [{labels:[person.name]}],mapping,meta),{});
 assert.deepEqual(C.labels({assignee:'가상 A/가상 B',ptAssignee:'가상 C,가상 A'}),['가상 A','가상 B','가상 C']);
});
test('휴가 최신성은 수집 메타와 실제 월 데이터 교집합만 인정',()=>{
 const now=Date.parse('2026-10-12T00:00:00Z'),meta={lastSync:'2026-10-12T00:00:00Z',syncedMonths:['2026-10','2026-11']};
 const h=C.vacationHealth({'2026-09':[],'2026-10':[]},meta,now);assert.deepEqual(h.months,['2026-10']);assert.deepEqual(h.missing,['2026-11']);
 assert.equal(C.vacationHealth({'2026-10':[]},meta,now+37*3600000).fresh,false);
});
function fixture(){return {...Object.fromEntries(C.paths.map(p=>[p+'.json',null])), 'pt.json':{a:{date:'2099-01-15',assignee:person.name,time:'09:00'}},'users.json?shallow=true':{[person.id]:true},['users/'+person.id+'/name.json']:person.name,'hiworks_vacation_sync/data.json':{'2099-01':[]},'hiworks_vacation_sync/meta.json':{lastSync:'2099-01-01T00:00:00Z',syncedMonths:['2099-01']}};}
test('휴가 조회 실패·잘못된 응답에도 일반 업무 동기화 및 기존 휴가 보존',async()=>{
 for(const bad of ['network','malformed']){
 const data=fixture();data['vacation.json']='invalid';const calls=[];
 const fetcher=async(url,options)=>{assert.equal(options.method,'GET');const path=url.slice(Reader.SOURCE.length+1);calls.push(path);if(bad==='network'&&path.includes('hiworks'))throw Error('offline');return{ok:true,json:async()=>data[path]};};
 const source=await Reader.snapshot({fetcher,previousRaw:{vacation:{v:{date:candidate.date,assignee:person.name,title:'종일 휴가'}},hiworks_vacation_sync:{data:{'2099-01':[]},meta:{}}},now:Date.parse('2099-01-01')});
 assert.equal(source.events.some(e=>e.type==='pt'),true);assert.equal(source.events.some(e=>e.type==='vacation'),true);assert.equal(source.vacationHealth.fresh,false);
 assert.equal(calls.some(p=>p==='users.json'||p.endsWith('/password.json')),false);
 }
});
test('업무 조회 실패는 휴가 예외와 무관하게 실패 처리',async()=>{
 const data=fixture();await assert.rejects(Reader.snapshot({fetcher:async url=>{const p=url.slice(Reader.SOURCE.length+1);if(p==='pt.json')throw Error('work failure');return{ok:true,json:async()=>data[p]};}}),/work failure/);
});
test('확인된 휴가 취소는 최신 스냅샷에서 제외',()=>{
 const raw={...Object.fromEntries(C.paths.map(p=>[p,null])),hiworks_vacation_sync:{data:{'2099-01':[{office_user_no:1,user_name:person.name,date:candidate.date,type:'days',approval_status:'결재완료'}]}}};
 assert.equal(C.normalize(raw,[person],{[person.name]:person.id}).events.length,1);
 raw.hiworks_vacation_sync.data['2099-01'][0].approval_status='취소완료';assert.equal(C.normalize(raw,[person],{[person.name]:person.id}).events.length,0);
});
