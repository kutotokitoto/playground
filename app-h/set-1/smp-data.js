const NAMES=['CFRP 틸트','메인 UB 틸트','메인 리어 단차','서브 리어 단차','윙플레이트 단차','오픈각도(전)','오픈각도(후)','피캠 틸트'];
function rng(s){let t=s>>>0;return()=>{t=(t*1664525+1013904223)>>>0;return t/4294967296;};}
export function getData(){
  const r=rng(97);
  const spikes={'07.15':12.9,'07.08':8.4,'07.03':6.2,'07.19':5.6};
  const days=[];
  for(let i=0;i<30;i++){
    const dt=new Date(2026,5,24+i);
    const key=String(dt.getMonth()+1).padStart(2,'0')+'.'+String(dt.getDate()).padStart(2,'0');
    const defect=spikes[key]!==undefined?spikes[key]:+(1.7+r()*2.4).toFixed(1);
    const cpk=+Math.min(1.68,Math.max(0.62,1.58-defect*0.055+(r()-0.5)*0.1)).toFixed(2);
    days.push({key,day:dt.getDate(),month:dt.getMonth()+1,defect,cpk});
  }
  const ranking=[...days].sort((a,b)=>b.defect-a.defect).slice(0,8);
  const rates=[1.18,1.62,2.14,1.83,2.61,1.37,1.92,3.42];
  const cpks=[1.52,1.41,1.24,1.33,1.08,1.47,1.29,0.94];
  const devs=[0.021,-0.034,0.048,-0.019,0.062,0.012,-0.041,0.081];
  const items=NAMES.map((name,i)=>{
    const n=11800+Math.round(r()*900);
    const def=Math.round(n*rates[i]/100);
    const trend=Array.from({length:12},()=>+(rates[i]*(0.7+r()*0.6)).toFixed(2));
    return {name,cpk:cpks[i],n,def,rate:rates[i],dev:devs[i],tol:0.1,trend};
  });
  return {days,ranking,items,
    today:{rate:2.84,rateDelta:0.31,input:12480,errors:354,errDelta:-28,cpk:1.21,cpkDelta:-0.04},
    notices:[
      {d:'07.23',t:'2호기 피캠 틸트 상한 근접 — 지그 점검 요청'},
      {d:'07.22',t:'윙플레이트 단차 마스터 게이지 교체 완료'},
      {d:'07.21',t:'PV2-1 측정 레시피 v4.2 전 라인 배포'},
      {d:'07.20',t:'서브 리어 단차 CPK 1.3 회복 — 관찰 유지'}
    ]};
}
