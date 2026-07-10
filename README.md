# 웹앱 플레이그라운드 (playground)

임시로 만드는 웹앱들을 한곳에 모아 두는 저장소입니다. 최상위 포털([`index.html`](index.html))에서 각 앱(A–F)으로 들어갈 수 있습니다.

- **설치·서버·빌드 불필요.** 각 앱은 독립적인 단일 `index.html`. 브라우저로 파일을 직접 열면 동작합니다.
- **정적 호스팅 친화적.** 저장소 루트를 그대로 GitHub Pages 등에 올리면 됩니다.

---

## 폴더 구조

```
playground/
├─ index.html          ← 포털(홈). app-a … app-f 카드 그리드
├─ README.md           ← 이 파일
├─ HISTORY.md          ← 변경 이력(작업할 때마다 갱신)
├─ app-a/              ← 측정 QC 데이터 분석 (완성)
│  ├─ index.html
│  ├─ docs/개발노트.md  ← app-a 상세 아키텍처 문서
│  └─ 테스트_시나리오*.xlsx  ← 업로드 기능 테스트용 샘플
├─ app-b/index.html    ← 준비 중(placeholder)
├─ app-c/index.html    ← 준비 중
├─ app-d/index.html    ← 준비 중
├─ app-e/index.html    ← 준비 중
└─ app-f/index.html    ← 준비 중
```

## 앱 목록

| 슬롯 | 이름 | 상태 | 강조색 | 설명 |
|---|---|---|---|---|
| **A** | 측정 데이터 분석 | ✅ 사용 가능 | `#107C41` | 엑셀형 웹 스프레드시트 + 품질측정(QC) 분석. 직접 구현한 수식 엔진·SVG 차트(정규분포/산점도/박스플롯)·라이브러리 없는 xlsx 읽기. → [상세 개발노트](app-a/docs/개발노트.md) |
| **B** | (미정) | 🚧 준비 중 | `#2a78d6` | 자리만 준비됨 |
| **C** | (미정) | 🚧 준비 중 | `#eb6834` | 자리만 준비됨 |
| **D** | (미정) | 🚧 준비 중 | `#7c4dff` | 자리만 준비됨 |
| **E** | (미정) | 🚧 준비 중 | `#d03b8c` | 자리만 준비됨 |
| **F** | (미정) | 🚧 준비 중 | `#0ca3a3` | 자리만 준비됨 |

---

## 작성 규칙 (앞으로 파일을 만들 때)

새 앱을 만들거나 기존 앱을 손볼 때 아래 관습을 따릅니다. 저장소 전체가 한 가지 시스템처럼 보이게 하기 위한 것입니다.

### 기본 원칙
- **한 앱 = 한 폴더 = 하나의 `app-x/index.html`.** 가능하면 외부 라이브러리·빌드 도구 없이 순수 HTML/CSS/JS로. (app-a도 수식 엔진·차트·xlsx 파서를 직접 구현)
- **언어:** `<html lang="ko">`, UI 텍스트는 한국어.
- **문자셋:** `<meta charset="UTF-8">` + `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- **파비콘:** 앱 강조색을 배경으로 한 인라인 SVG data-URI (포털·app-a 참고).

### 테마 (라이트/다크 대응)
CSS 변수 + `prefers-color-scheme`로 두 테마를 모두 지원합니다. 사용자 토글이 필요하면 `:root[data-theme="light|dark"]`가 미디어쿼리를 이깁니다.

```css
:root{ --bg:#f4f6f8; --card:#fff; --text:#141821; --muted:#6b7280; --line:#e6e8ec; }
@media (prefers-color-scheme: dark){
  :root{ --bg:#0e1014; --card:#171a21; --text:#e9ebef; --muted:#98a0ab; --line:#262b34; }
}
:root[data-theme="dark"]{ /* 위 dark 값과 동일 — 토글 시 미디어쿼리보다 우선 */ }
```

### 폰트
```
font-family:"Pretendard","Pretendard Variable","Segoe UI","Malgun Gothic",system-ui,sans-serif;
```
Pretendard가 없어도 시스템 폰트로 자연스럽게 폴백됩니다.

### 앱별 강조색(`--acc`)
포털 카드와 각 앱이 같은 색을 씁니다. A `#107C41` · B `#2a78d6` · C `#eb6834` · D `#7c4dff` · E `#d03b8c` · F `#0ca3a3`.

### 새 앱을 실제 기능으로 채우는 절차
1. `app-x/index.html`을 실제 앱으로 교체 (placeholder는 뒤로 가기 링크 `../index.html`가 있는 "준비 중" 카드).
2. 포털 [`index.html`](index.html)에서 해당 카드의 `soon` 클래스를 제거하고, 배지 pill을 `준비 중` → `사용 가능`(`pill live`)으로 바꾸고, `<h2>`·`.desc`를 실제 이름/설명으로 교체.
3. 앱이 복잡하면 `app-x/docs/`에 개발노트를 남깁니다(app-a 방식 참고).
4. [HISTORY.md](HISTORY.md)에 한 줄 추가.

### 검증
브라우저 자동화가 없으므로, 로직은 인라인 `<script>`를 잘라 Node로 순수 함수 단위 검증하고(문법은 `node --check`), 실제 렌더/파일 IO/클립보드는 브라우저에서 수동 확인합니다. (app-a 개발노트 §10 참고)

---

## 로컬에서 열기

파일을 더블클릭하거나, 정적 서버로 띄웁니다.

```bash
# 예: 파이썬 내장 서버
python -m http.server 8000
# → http://localhost:8000/ (포털) → 원하는 앱으로 이동
```

> 참고: app-a의 xlsx 읽기는 브라우저 내장 `DecompressionStream('deflate-raw')`을 사용하므로 최신 Chrome/Edge/Firefox/Safari가 필요합니다.
