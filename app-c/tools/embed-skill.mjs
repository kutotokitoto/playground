/* AI 변환 스킬(.md)을 index.html의 SKILL_B64 상수로 다시 임베드한다.
   스킬 문서를 수정한 뒤 실행:  node app-c/tools/embed-skill.mjs
   (index.html의 다운로드 버튼은 이 base64를 디코드해 파일로 내려준다 — 오프라인/사내망 대비 자립형) */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = path.join(appDir, '마법사마법사_변환스킬.md');
const htmlPath = path.join(appDir, 'index.html');

const md = fs.readFileSync(mdPath);                 // 원문 바이트(UTF-8)
const b64 = md.toString('base64');
let html = fs.readFileSync(htmlPath, 'utf8');

// 기존 값이든 플레이스홀더든 SKILL_B64 리터럴을 새 base64로 교체
const re = /const SKILL_B64='[^']*';/;
if (!re.test(html)) throw new Error('SKILL_B64 상수를 찾지 못했습니다');
html = html.replace(re, "const SKILL_B64='" + b64 + "';");

// 왕복 검증
if (Buffer.from(b64, 'base64').toString('utf8') !== md.toString('utf8'))
  throw new Error('base64 왕복 불일치');

fs.writeFileSync(htmlPath, html);
console.log(`스킬 임베드 완료: ${md.length}B → base64 ${b64.length}자`);
