// 검증용 xlsx 픽스처 생성기 — 라이브러리 없이 최소 xlsx(ZIP+XML)를 직접 만든다.
// 실행: node app-a/docs/make-fixtures.mjs  → app-a/docs/fixtures/F01…F12.xlsx 생성
// 앱의 unzipXlsx가 method 0(무압축)·8(deflate) 둘 다 지원하므로 픽스처도 섞어서 양 경로를 검증한다.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
fs.mkdirSync(OUT, { recursive: true });

/* ── 결정적 난수(시드 고정 → 항상 같은 픽스처) ── */
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ── QC 데이터셋: P포인트 × N시료, 규격 내 위주 + 가끔 NG + 옵션 결측 ── */
function makeQC(P, N, seed, opts={}){
  const r = rng(seed);
  const names = [...Array(P)].map((_,i)=>opts.names ? opts.names[i] : 'P'+String(i+1).padStart(2,'0'));
  const spec=[], usl=[], lsl=[];
  for(let i=0;i<P;i++){
    const s = opts.sameNominal!=null ? opts.sameNominal : opts.nominals ? opts.nominals[i] : +(5+r()*20).toFixed(3);
    const tol = (opts.sameNominal!=null||opts.nominals) ? 0.35 : +(0.15+r()*0.4).toFixed(3);
    spec.push(+s.toFixed(3)); usl.push(+(s+tol).toFixed(3)); lsl.push(+(s-tol).toFixed(3));
  }
  const data=[];
  for(let n=0;n<N;n++){ const row=[];
    for(let i=0;i<P;i++){
      let v = spec[i] + (r()*2-1)*(usl[i]-spec[i])*0.55;
      if(r()<0.03) v = spec[i] + (r()<0.5?1:-1)*(usl[i]-spec[i])*(1.1+r()*0.5);   // 가끔 규격 이탈
      let val = +v.toFixed(3);
      if(opts.missRate && r()<opts.missRate) val = null;                          // 미측정 칸
      row.push(val);
    }
    data.push(row);
  }
  return { names, spec, usl, lsl, data };
}

/* ── 행렬 → sheetN.xml (문자열은 inlineStr 또는 sharedStrings) ── */
function colName(c){ let s=''; c++; while(c>0){ c--; s=String.fromCharCode(65+c%26)+s; c=Math.floor(c/26); } return s; }
const xmlEsc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function sheetXML(matrix, shared){   // shared: null이면 inlineStr, 배열이면 sharedStrings 인덱스 사용
  let body='';
  matrix.forEach((row, ri)=>{
    let cells='';
    (row||[]).forEach((v, ci)=>{
      if(v==null || v==='') return;
      const ref = colName(ci)+(ri+1);
      if(typeof v==='number') cells += `<c r="${ref}"><v>${v}</v></c>`;
      else if(shared){ let i=shared.indexOf(String(v)); if(i<0){ i=shared.length; shared.push(String(v)); } cells += `<c r="${ref}" t="s"><v>${i}</v></c>`; }
      else cells += `<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>`;
    });
    if(cells) body += `<row r="${ri+1}">${cells}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

/* ── 최소 xlsx 패키지 (엑셀에서도 열리는 유효한 구조) ── */
function xlsxBuffer(sheets, { useShared=false, store=false }={}){   // sheets: 행렬 배열(시트 1~n)
  const shared = useShared ? [] : null;
  const sheetXmls = sheets.map(m=>sheetXML(m, shared));
  const n = sheets.length;
  const entries = [];
  const put=(name,xml)=>entries.push({ name, data:Buffer.from(xml,'utf8') });
  put('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`+
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`+
    sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+
    (shared?`<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`:'')+
    `</Types>`);
  put('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  put('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+
    sheets.map((_,i)=>`<sheet name="Sheet${i+1}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+`</sheets></workbook>`);
  put('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
    sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+
    (shared?`<Relationship Id="rId${n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`:'')+
    `</Relationships>`);
  sheetXmls.forEach((xml,i)=>put(`xl/worksheets/sheet${i+1}.xml`, xml));
  if(shared) put('xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">`+
    shared.map(s=>`<si><t>${xmlEsc(s)}</t></si>`).join('')+`</sst>`);
  return zip(entries, store);
}

/* ── ZIP 작성 (local headers + central directory + EOCD) ── */
function zip(entries, store){
  const locals=[], centrals=[]; let off=0;
  for(const e of entries){
    const name=Buffer.from(e.name,'utf8');
    const crc=zlib.crc32(e.data)>>>0;
    const comp= store ? e.data : zlib.deflateRawSync(e.data);
    const method= store ? 0 : 8;
    const lh=Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0,6); lh.writeUInt16LE(method,8);
    lh.writeUInt16LE(0,10); lh.writeUInt16LE(0,12);                       // 시간/날짜 0
    lh.writeUInt32LE(crc,14); lh.writeUInt32LE(comp.length,18); lh.writeUInt32LE(e.data.length,22);
    lh.writeUInt16LE(name.length,26); lh.writeUInt16LE(0,28);
    locals.push(lh,name,comp);
    const ch=Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(0,8); ch.writeUInt16LE(method,10);
    ch.writeUInt16LE(0,12); ch.writeUInt16LE(0,14);
    ch.writeUInt32LE(crc,16); ch.writeUInt32LE(comp.length,20); ch.writeUInt32LE(e.data.length,24);
    ch.writeUInt16LE(name.length,28); ch.writeUInt16LE(0,30); ch.writeUInt16LE(0,32);
    ch.writeUInt16LE(0,34); ch.writeUInt16LE(0,36); ch.writeUInt32LE(0,38); ch.writeUInt32LE(off,42);
    centrals.push(ch,name);
    off += 30+name.length+comp.length;
  }
  const cd=Buffer.concat(centrals), cdOff=off;
  const eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(0,4); eocd.writeUInt16LE(0,6);
  eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10);
  eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(cdOff,16); eocd.writeUInt16LE(0,20);
  return Buffer.concat([...locals, cd, eocd]);
}

/* ══════════════ 시나리오 행렬 정의 ══════════════ */
const F = {};

/* F01 표준 가로 템플릿 (대조군, sharedStrings 경로) */
{
  const q = makeQC(8, 40, 101);
  F['F01-standard'] = { useShared:true, sheets:[[
    ['■ 측정 데이터'],
    ['포인트 No', ...q.names],
    ['스펙 치수', ...q.spec],
    ['상한(USL)', ...q.usl],
    ['하한(LSL)', ...q.lsl],
    ['시리얼 No', ...q.names],
    ...q.data.map((row,i)=>[i+1, ...row]),
  ]], expect:{ path:'label', P:8, N:40 } };
}

/* F02 앞 2행·2열 비움 + 제목 행 (무압축 ZIP) */
{
  const q = makeQC(6, 30, 102);
  const pad = r => ['','',...r];
  F['F02-offset'] = { store:true, sheets:[[
    [], [],
    pad(['측정 결과 (오프셋 배치)']),
    pad(['포인트 No', ...q.names]),
    pad(['스펙 치수', ...q.spec]),
    pad(['상한(USL)', ...q.usl]),
    pad(['하한(LSL)', ...q.lsl]),
    ...q.data.map((row,i)=>pad([i+1, ...row])),
  ]], expect:{ path:'label', P:6, N:30 } };
}

/* F03 전치(포인트=행) + 라벨 있음 — 라벨 행 발견 → 전치 후 기존 파서 */
{
  const q = makeQC(10, 36, 103);
  F['F03-transposed-labeled'] = { sheets:[[
    ['포인트', '스펙', '상한', '하한', ...q.data.map((_,i)=>i+1)],
    ...q.names.map((nm,p)=>[nm, q.spec[p], q.usl[p], q.lsl[p], ...q.data.map(row=>row[p])]),
  ]], expect:{ path:'label-transposed', P:10, N:36 } };
}

/* F04 No.(1..N) 열 + 텍스트 시리얼 열 동시 존재 → 추론 (라벨이 B열이라 라벨 파서 실패) */
{
  const q = makeQC(5, 32, 104, { names:['좌상단','우상단','중앙','좌하단','우하단'] });
  F['F04-index-and-serial-cols'] = { store:true, sheets:[[
    ['No.', '시리얼 번호', ...q.names],
    ['', '규격', ...q.spec],
    ['', '최대', ...q.usl],
    ['', '최소', ...q.lsl],
    ...q.data.map((row,i)=>[i+1, 'SN-10'+String(i+1).padStart(2,'0'), ...row]),
  ]], expect:{ path:'infer', P:5, N:32, textSerials:true } };
}

/* F05 표준 + 결측 ~8% → 미측정 NG 처리 */
{
  const q = makeQC(8, 40, 105, { missRate:0.08 });
  F['F05-missing-cells'] = { sheets:[[
    ['포인트 No', ...q.names],
    ['스펙 치수', ...q.spec],
    ['상한(USL)', ...q.usl],
    ['하한(LSL)', ...q.lsl],
    ...q.data.map((row,i)=>[i+1, ...row]),
  ]], expect:{ path:'label', P:8, N:40, miss:q.data.flat().filter(v=>v==null).length } };
}

/* F06 스펙 3행 무명 + 순서 뒤섞임(하한·스펙·상한) → 값 크기로 역할 배정 */
{
  const q = makeQC(7, 34, 106);
  F['F06-unnamed-shuffled-specs'] = { sheets:[[
    ['포인트', ...q.names],
    ['', ...q.lsl],
    ['', ...q.spec],
    ['', ...q.usl],
    ...q.data.map((row,i)=>[i+1, ...row]),
  ]], expect:{ path:'infer', P:7, N:34 } };
}

/* F07 12×14 정사각형에 가까움 + 무헤더 → 모호 → 미리보기
   (1·3번 포인트 공칭치수가 나머지를 감싸도록 배치해 전치 해석도 구조적으로 유효하게 만든 악조건) */
{
  const q = makeQC(12, 14, 107, { nominals:[5,10,15,6,7,8,9,11,12,13,14,10.5] });
  F['F07-ambiguous-square'] = { sheets:[[
    q.spec, q.usl, q.lsl, ...q.data,
  ]], expect:{ path:'preview', P:12, N:14 } };
}

/* F08 시트 2개 → 첫 시트만 + 안내 */
{
  const q = makeQC(5, 20, 108);
  F['F08-two-sheets'] = { sheets:[
    [
      ['포인트 No', ...q.names],
      ['스펙 치수', ...q.spec],
      ['상한(USL)', ...q.usl],
      ['하한(LSL)', ...q.lsl],
      ...q.data.map((row,i)=>[i+1, ...row]),
    ],
    [ ['메모'], ['이 시트는 무시되어야 합니다'] ],
  ], expect:{ path:'label', P:5, N:20, sheets:2 } };
}

/* F09 헤더·시리얼 없는 순수 숫자 + 스펙 3행 (무압축) → 자동 명명 01,02… */
{
  const q = makeQC(10, 30, 109);
  F['F09-headerless'] = { store:true, sheets:[[
    q.spec, q.usl, q.lsl, ...q.data,
  ]], expect:{ path:'infer', P:10, N:30, autoNames:true } };
}

/* F10 데이터 뒤 평균/판정 요약 잡행 → 무시 */
{
  const q = makeQC(6, 28, 110);
  const avg = q.names.map((_,p)=>+(q.data.reduce((a,row)=>a+row[p],0)/q.data.length).toFixed(3));
  F['F10-footer-junk'] = { sheets:[[
    ['포인트 No', ...q.names],
    ['스펙 치수', ...q.spec],
    ['상한(USL)', ...q.usl],
    ['하한(LSL)', ...q.lsl],
    ...q.data.map((row,i)=>[i+1, ...row]),
    ['평균', ...avg],
    ['판정', ...q.names.map(()=> '확인')],
  ]], expect:{ path:'label', P:6, N:28 } };
}

/* F11 전치 + 오프셋 + 결측 + 비표준 라벨(목표/MAX/MIN) + 텍스트 시리얼 → 추론(전치) */
{
  const q = makeQC(12, 30, 111, { missRate:0.06,
    names:['좌상R','우상R','좌하R','우하R','상변폭','하변폭','좌변폭','우변폭','대각1','대각2','두께A','두께B'] });
  const pad = r => ['', ...r];
  F['F11-transposed-offset-missing'] = { sheets:[[
    [],
    pad(['측정부위', '목표', 'MAX', 'MIN', ...q.data.map((_,i)=>'SN-'+String(i+1).padStart(2,'0'))]),
    ...q.names.map((nm,p)=>pad([nm, q.spec[p], q.usl[p], q.lsl[p], ...q.data.map(row=>row[p])])),
  ]], expect:{ path:'infer-transposed', P:12, N:30 } };
}

/* F12 스펙 행 없음 → 명확한 실패 사유 */
{
  const q = makeQC(8, 25, 112);
  F['F12-no-specs'] = { sheets:[[
    ['시리얼', ...q.names],
    ...q.data.map((row,i)=>[i+1, ...row]),
  ]], expect:{ path:'fail-no-spec' } };
}

/* ══════════════ 생성 ══════════════ */
const readme = ['# 업로드 방어 테스트 픽스처', '', '`node app-a/docs/make-fixtures.mjs` 로 재생성. 시드 고정이라 항상 동일.', '',
  '| 파일 | 내용 | 기대 동작 |', '|---|---|---|'];
const DESC = {
  'F01-standard':'표준 가로 템플릿 (sharedStrings)|라벨 경로, 8P×40N',
  'F02-offset':'앞 2행·2열 비움 + 제목 행 (무압축 ZIP)|정규화 후 라벨 경로, 6P×30N',
  'F03-transposed-labeled':'전치 + 라벨(포인트/스펙/상한/하한이 1행에)|라벨 행 감지 → 전치 해석, 10P×36N',
  'F04-index-and-serial-cols':'No.(1..N) 열 + 텍스트 시리얼 열|추론: 인덱스 열 제외, 시리얼=SN-10xx, 5P×32N',
  'F05-missing-cells':'측정값 ~8% 빈칸|라벨 경로 + 빈칸=미측정 NG',
  'F06-unnamed-shuffled-specs':'스펙 3행 무명 + 하한·스펙·상한 순서 뒤섞임|추론: 값 크기로 역할 배정, 7P×34N',
  'F07-ambiguous-square':'12P×14N 무헤더 + 동일 공칭치수|모호 → 가져오기 미리보기 표시',
  'F08-two-sheets':'시트 2개|첫 시트만 사용 + 안내 토스트, 5P×20N',
  'F09-headerless':'헤더·시리얼 없는 숫자 행렬 + 스펙 3행 (무압축)|추론: 포인트 01,02… 자동 명명, 10P×30N',
  'F10-footer-junk':'데이터 뒤 평균/판정 요약 행|잡행 무시, 6P×28N',
  'F11-transposed-offset-missing':'전치 + 오프셋 + 결측 + 비표준 라벨(목표/MAX/MIN)|추론: 전치 해석 + 미측정 NG, 12P×30N',
  'F12-no-specs':'상한/하한 규격 행 없음|명확한 실패 사유 토스트',
};
for(const [name, def] of Object.entries(F)){
  const buf = xlsxBuffer(def.sheets, { useShared:def.useShared, store:def.store });
  fs.writeFileSync(path.join(OUT, name+'.xlsx'), buf);
  const [d,e]=DESC[name].split('|');
  readme.push(`| ${name}.xlsx | ${d} | ${e} |`);
  console.log(name+'.xlsx', buf.length+'B', def.store?'(store)':'(deflate)');
}
fs.writeFileSync(path.join(OUT,'README.md'), readme.join('\n')+'\n');
console.log('완료: '+Object.keys(F).length+'개 → '+OUT);

/* 기대값을 검증 스크립트에서 재사용할 수 있게 JSON도 남긴다 */
fs.writeFileSync(path.join(OUT,'expectations.json'),
  JSON.stringify(Object.fromEntries(Object.entries(F).map(([k,v])=>[k,v.expect])), null, 1));
