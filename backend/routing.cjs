'use strict';
const Core=require('../scheduler-core.js');
function regionOf(address){const m=String(address||'').match(/(?:^|\s)([가-힣]+(?:시|군|구))(?=\s|$)/g);return m?.map(s=>s.trim()).join(' ')||null;}
const routeKey=(a,b)=>JSON.stringify([a.address,b.address,a.date,a.end]);
function estimate(a,b,settings){const from=regionOf(a.address),to=regionOf(b.address);if(!from||!to)return null;const minutes=from===to?settings.sameRegionMinutes:settings.routes.find(r=>r.from===from&&r.to===to)?.minutes;return Number.isFinite(minutes)?{minutes,estimated:true,verified:false}:null;}
function createKakao({key,fetcher=fetch,now=Date.now,consume=async()=>{}}={}){
 const cache=new Map();
 async function request(url){if(!key)throw Error('지도 API 키 미설정');await consume();const r=await fetcher(url,{method:'GET',headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('지도 API 조회 실패 ('+r.status+')');return r.json();}
 async function geocode(address){
  if(typeof address!=='string'||address.length<6||address.length>300||!/[0-9]/.test(address))throw Error('상세 주소 확인 필요');
  const url=new URL('https://dapi.kakao.com/v2/local/search/address.json');url.searchParams.set('query',address);url.searchParams.set('analyze_type','exact');
  const data=await request(url);if(data.meta?.total_count!==1||data.documents?.length!==1)throw Error('주소가 없거나 둘 이상으로 검색됨');
  const doc=data.documents[0],normalize=s=>String(s||'').replace(/\s/g,'');const names=[doc.address_name,doc.road_address?.address_name,doc.address?.address_name];
  if(!names.some(s=>normalize(s)===normalize(address)))throw Error('입력 주소와 지도 주소 일치 확인 필요');
  const x=Number(doc.x),y=Number(doc.y);if(!Number.isFinite(x)||!Number.isFinite(y)||x<124||x>132||y<32||y>40)throw Error('주소 좌표 확인 필요');return{x,y};
 }
 async function route(a,b){
  if(!Core.dayOK(a.date)||!Number.isFinite(a.end)||a.end<0||a.end>=1440)throw Error('이동 출발시각 오류');
  const departure=Date.parse(a.date+'T'+String(Math.floor(a.end/60)).padStart(2,'0')+':'+String(a.end%60).padStart(2,'0')+':00+09:00');
  if(departure<=now())throw Error('미래 출발시각만 조회할 수 있습니다.');
  const k=routeKey(a,b),hit=cache.get(k);if(hit&&now()-hit.at<300000)return hit.value;
  const origin=await geocode(a.address),destination=await geocode(b.address);
  const url=new URL('https://apis-navi.kakaomobility.com/v1/future/directions');url.searchParams.set('origin',origin.x+','+origin.y);url.searchParams.set('destination',destination.x+','+destination.y);url.searchParams.set('departure_time',a.date.replaceAll('-','')+String(Math.floor(a.end/60)).padStart(2,'0')+String(a.end%60).padStart(2,'0'));url.searchParams.set('summary','true');url.searchParams.set('priority','TIME');
  const data=await request(url),r=data.routes?.find(r=>r.result_code===0);if(!r||!Number.isFinite(r.summary?.duration)||r.summary.duration<0)throw Error('자동차 경로 확인 실패');
  const value={minutes:Math.ceil(r.summary.duration/60),distanceMeters:r.summary.distance,provider:'kakao-future',estimated:true,verified:false,queriedAt:new Date(now()).toISOString(),departureAt:new Date(departure).toISOString(),origin,destination};
  if(cache.size>500)cache.clear();cache.set(k,{at:now(),value});return value;
 }
 return{route,enabled:!!key};
}
async function assess(candidate,person,ctx,confirmed,provider){
 const values=new Map();const pending=new Map();
 const first=Core.check(candidate,person,{...ctx,region:regionOf,travel:(a,b)=>{pending.set(routeKey(a,b),[a,b]);return estimate(a,b,ctx.settings);}},confirmed);
 if(provider?.enabled)for(const [key,[a,b]] of pending){try{values.set(key,await provider.route(a,b));}catch(e){values.set(key,{error:e.message});}}
 const final=Core.check(candidate,person,{...ctx,region:regionOf,travel:(a,b)=>{const result=values.get(routeKey(a,b));if(result)return result.error?null:result;return estimate(a,b,ctx.settings);}},confirmed);
 return {...final,routeErrors:[...values.values()].filter(r=>r.error).map(r=>r.error),providerConnected:!!provider?.enabled};
}
module.exports={regionOf,routeKey,estimate,createKakao,assess};
