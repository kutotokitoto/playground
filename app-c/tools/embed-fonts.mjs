// 임베딩 폰트 재생성 도구 — 폰트를 바꾸거나 서브셋을 넓힐 때만 실행하면 된다.
// 사용: 작업 폴더에서  npm i subset-font  후  node embed-fonts.mjs <index.html 경로>
// 1) 아래 URL에서 원본을 받고  2) KS X 1001 2,350자+ASCII+기호로 서브셋  3) base64 @font-face를
//    index.html의 /*FONTS_START*/ ~ /*FONTS_END*/ 사이에 주입한다. 전부 SIL OFL 폰트.
import fs from 'node:fs';
import subsetFont from 'subset-font';

const APP=process.argv[2]||'../index.html';
const SRC=[   // [저장 파일명, 폰트 패밀리, font-weight, 다운로드 URL]
  ['PretendardVariable.woff2','Pretendard','100 900','https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2'],
  ['Jua.ttf','Jua','400','https://github.com/google/fonts/raw/main/ofl/jua/Jua-Regular.ttf'],
  ['BlackHanSans.ttf','Black Han Sans','400','https://github.com/google/fonts/raw/main/ofl/blackhansans/BlackHanSans-Regular.ttf'],
  ['NanumPen.ttf','Nanum Pen Script','400','https://github.com/google/fonts/raw/main/ofl/nanumpenscript/NanumPenScript-Regular.ttf'],
];

// 서브셋 문자: ASCII + KS X 1001 한글 2,350자(EUC-KR 디코드로 생성) + 기호 + 앱 소스에 쓰인 음절
let hangul=''; const dec=new TextDecoder('euc-kr');
for(let hi=0xB0;hi<=0xC8;hi++) for(let lo=0xA1;lo<=0xFE;lo++){
  const ch=dec.decode(new Uint8Array([hi,lo])); if(ch&&ch!=='�') hangul+=ch;
}
let ascii=''; for(let i=0x20;i<=0x7E;i++) ascii+=String.fromCharCode(i);
const extra='·※…—–―•→←↑↓↔⇒✓✔✕★☆○●◎□■△▲▽▼「」『』〈〉《》±×÷≤≥≠™©®℃₩¥€£§';
const appSrc=fs.readFileSync(APP,'utf8');
const appChars=[...new Set(appSrc)].filter(c=>c.charCodeAt(0)>=0xAC00&&c.charCodeAt(0)<=0xD7A3).join('');
const TEXT=[...new Set(ascii+hangul+extra+appChars)].join('');
console.log('서브셋 문자 수:', TEXT.length);

let css='';
for(const [file,fam,weight,url] of SRC){
  if(!fs.existsSync(file)){
    console.log('다운로드:', url);
    const res=await fetch(url,{redirect:'follow'});
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const buf=fs.readFileSync(file);
  const out=await subsetFont(buf, TEXT, {targetFormat:'woff2'});
  console.log(fam.padEnd(18), (buf.length/1024).toFixed(0)+'KB →', (out.length/1024).toFixed(0)+'KB');
  css+="@font-face{font-family:'"+fam+"';src:url(data:font/woff2;base64,"+out.toString('base64')+") format('woff2');font-weight:"+weight+";font-display:swap}\n";
}
const S='/*FONTS_START*/', E='/*FONTS_END*/';
const i=appSrc.indexOf(S), j=appSrc.indexOf(E);
if(i<0||j<0) throw new Error('index.html에 FONTS 마커가 없습니다');
fs.writeFileSync(APP, appSrc.slice(0,i+S.length)+'\n'+css+appSrc.slice(j));
console.log('주입 완료 → '+APP);
