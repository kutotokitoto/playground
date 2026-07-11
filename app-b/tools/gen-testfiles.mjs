// 테스트용 xlsx 생성기 — 라이브러리 없이 최소 xlsx(zip stored + CRC32)를 만든다.
// 사용: node app-b/tools/gen-testfiles.mjs  → app-b/테스트파일/*.xlsx 생성
// 앱의 자체 xlsx 리더(unzipXlsx: method 0 지원)와 Excel 양쪽에서 열린다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '테스트파일');
mkdirSync(OUT, { recursive: true });

/* ── CRC32 ── */
const CRC = (() => { const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
})();

/* ── ZIP (stored, method 0) ── */
function zip(entries) {   // entries: [{name, data:Buffer}]
  const parts = [], central = []; let off = 0;
  for (const { name, data } of entries) {
    const n = Buffer.from(name, 'utf8'), crc = CRC(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(n.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, n, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(off, 42);
    central.push(ch, n);
    off += lh.length + n.length + data.length;
  }
  const cd = Buffer.concat(central), body = Buffer.concat(parts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(body.length, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([body, cd, eocd]);
}

/* ── xlsx 조립 ── */
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = c => { let s = ''; c++; while (c > 0) { c--; s = String.fromCharCode(65 + c % 26) + s; c = Math.floor(c / 26); } return s; };

// rows: 2차원 배열(undefined/'' = 빈 칸). emptyRowsExplicit: 빈 행도 <row>로 명시(오프셋 케이스).
function sheetXML(rows, { shared = null, emptyRowsExplicit = false } = {}) {
  let body = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    let cells = '';
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v == null || v === '') continue;
      const ref = colName(c) + (r + 1);
      if (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) && !/^0[0-9]/.test(v))) {
        cells += `<c r="${ref}"><v>${Number(v)}</v></c>`;
      } else if (shared) {
        let idx = shared.map.get(String(v));
        if (idx == null) { idx = shared.list.length; shared.list.push(String(v)); shared.map.set(String(v), idx); }
        cells += `<c r="${ref}" t="s"><v>${idx}</v></c>`;
      } else {
        cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      }
    }
    if (cells === '' && !emptyRowsExplicit) continue;
    body += `<row r="${r + 1}">${cells}</row>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function xlsx(sheets, { useShared = false, emptyRowsExplicit = false } = {}) {   // sheets: [{name, rows}]
  const shared = useShared ? { list: [], map: new Map() } : null;
  const entries = [];
  const B = s => Buffer.from(s, 'utf8');
  const sheetXmls = sheets.map(s => sheetXML(s.rows, { shared, emptyRowsExplicit }));
  let ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`;
  sheets.forEach((_, i) => { ct += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; });
  if (shared) ct += `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`;
  ct += `</Types>`;
  entries.push({ name: '[Content_Types].xml', data: B(ct) });
  entries.push({ name: '_rels/.rels', data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) });
  let wbSheets = '', wbRels = '';
  sheets.forEach((s, i) => {
    wbSheets += `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
    wbRels += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
  });
  if (shared) wbRels += `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`;
  entries.push({ name: 'xl/workbook.xml', data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheets}</sheets></workbook>`) });
  entries.push({ name: 'xl/_rels/workbook.xml.rels', data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>`) });
  sheetXmls.forEach((x, i) => entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: B(x) }));
  if (shared) entries.push({ name: 'xl/sharedStrings.xml', data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.list.length}" uniqueCount="${shared.list.length}">${shared.list.map(t => `<si><t xml:space="preserve">${xmlEsc(t)}</t></si>`).join('')}</sst>`) });
  return zip(entries);
}

/* ── 결정적 더미 데이터 (음수 좌표 포함 — 실무 유사) ── */
const r2 = x => Math.round(x * 100) / 100;
function makePts(n) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const col = (i - 1) % 10, row = Math.floor((i - 1) / 10);
    const rx = r2(-100 + col * 8), ry = r2(8 + row * 9);
    const mx = r2(rx + ((i % 5) - 2) * 0.05), my = r2(ry + ((i % 7) - 3) * 0.04);
    const rate = r2(((i * 7) % 50) / 2);   // 0 ~ 24.5, 결정적
    pts.push({ pos: i, mx, my, rx, ry, rate });
  }
  return pts;
}
const DESC = '도면좌표 불량률 템플릿 — 오리진(X,Y)과 포인트별 좌표·불량률(%)을 채우세요. 측정면을 비우면 기준면 좌표를 사용합니다.';
const HDR = ['포인트', '측정면 X', '측정면 Y', '기준면 X', '기준면 Y', '불량률(%)'];
const dataRow = p => [p.pos, p.mx, p.my, p.rx, p.ry, p.rate];

const files = [];

/* 01 정상: 템플릿 그대로 50pt */
{
  const rows = [[DESC], ['오리진', 5, 7], [], HDR, ...makePts(50).map(dataRow)];
  files.push(['테스트01_정상.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 02 오프셋: 위 3행 빈 행 + 제목 행 + 전체 2열 오른쪽 시프트 */
{
  const sh = r => ['', '', ...r];
  const rows = [[], [], [], sh(['6월 측정 결과 (오프셋 테스트)']), sh(['오리진', 5, 7]), [], sh(HDR), ...makePts(50).map(p => sh(dataRow(p)))];
  files.push(['테스트02_오프셋.xlsx', xlsx([{ name: 'Sheet1', rows }], { emptyRowsExplicit: true })]);
}
/* 03 가로배치: 전치 (라벨이 첫 열, 포인트가 열 방향) — 오리진 없음(0,0) */
{
  const pts = makePts(30);
  const rows = [
    ['포인트', ...pts.map(p => p.pos)],
    ['측정면 X', ...pts.map(p => p.mx)],
    ['측정면 Y', ...pts.map(p => p.my)],
    ['기준면 X', ...pts.map(p => p.rx)],
    ['기준면 Y', ...pts.map(p => p.ry)],
    ['불량률(%)', ...pts.map(p => p.rate)],
  ];
  files.push(['테스트03_가로배치.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 04 헤더없음: 숫자만, 템플릿 열 순서 */
{
  const rows = [['오리진', 5, 7], ...makePts(40).map(dataRow)];
  files.push(['테스트04_헤더없음.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 05 결측: 측정면 빈칸 8행(4,9,14,19,24,29,34,39) + 불량률 빈칸 5행(6,12,18,26,33) + 기준면 없는 행 3(41,42,43) */
{
  const pts = makePts(50);
  const rows = [[DESC], ['오리진', 5, 7], [], HDR];
  for (const p of pts) {
    const r = dataRow(p);
    if ([4, 9, 14, 19, 24, 29, 34, 39].includes(p.pos)) { r[1] = ''; r[2] = ''; }
    if ([6, 12, 18, 26, 33].includes(p.pos)) r[5] = '';
    if ([41, 42, 43].includes(p.pos)) { r[3] = ''; r[4] = ''; }
    rows.push(r);
  }
  files.push(['테스트05_결측.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 06 병합헤더: 2행 그룹 헤더 — 기준면 그룹을 먼저 둬서(비템플릿 순서) 위치 가정으로는 역할이 뒤바뀌게 함 */
{
  const pts = makePts(30);
  const rows = [
    ['오리진', 5, 7], [],
    ['포인트', '기준면', '', '측정면', '', '불량률(%)'],
    ['', 'X', 'Y', 'X', 'Y', ''],
    ...pts.map(p => [p.pos, p.rx, p.ry, p.mx, p.my, p.rate]),
  ];
  files.push(['테스트06_병합헤더.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 07 다중시트: 시트1 데이터(20pt, sharedStrings 경로) + 시트2 잡동사니 */
{
  const rows1 = [[DESC], ['오리진', 5, 7], [], HDR, ...makePts(20).map(dataRow)];
  const rows2 = [['메모'], ['이 시트는 데이터가 아님'], ['잡동사니', 123]];
  files.push(['테스트07_다중시트.xlsx', xlsx([{ name: '데이터', rows: rows1 }, { name: '메모', rows: rows2 }], { useShared: true })]);
}
/* 08 정사각형: 6pt × 6열, 헤더 없음 — 방향 모호(미리보기 발동 케이스) */
{
  const pts = makePts(6);
  const rows = pts.map(dataRow);
  files.push(['테스트08_정사각형.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}
/* 09 잡행단위: 20pt + 단위 문자("-99.9 mm", "5.5%", "1,234.5") + 하단 합계/평균 행 */
{
  const pts = makePts(20);
  const rows = [[DESC], ['오리진', 5, 7], [], HDR];
  for (const p of pts) {
    const r = dataRow(p);
    if (p.pos === 3) r[1] = p.mx + ' mm';           // 단위 붙은 측정면
    if (p.pos === 7) r[5] = p.rate + '%';           // % 붙은 불량률
    if (p.pos === 11) r[3] = '1,234.5';             // 천단위 쉼표 기준면 X
    rows.push(r);
  }
  const sum = a => r2(a.reduce((x, y) => x + y, 0));
  rows.push(['합계', '', '', sum(pts.map(p => p.rx)), sum(pts.map(p => p.ry)), sum(pts.map(p => p.rate))]);
  rows.push(['평균', '', '', r2(sum(pts.map(p => p.rx)) / 20), r2(sum(pts.map(p => p.ry)) / 20), r2(sum(pts.map(p => p.rate)) / 20)]);
  files.push(['테스트09_잡행단위.xlsx', xlsx([{ name: 'Sheet1', rows }])]);
}

for (const [name, buf] of files) { writeFileSync(join(OUT, name), buf); console.log('생성:', name, buf.length + 'B'); }
console.log('완료 →', OUT);
