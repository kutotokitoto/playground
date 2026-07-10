# 변경 이력 (HISTORY)

이 저장소의 작업 기록입니다. 최신 항목이 위로 오도록 추가합니다. 날짜는 절대 표기(YYYY-MM-DD).

---

## 2026-07-10
- app-b: 앱 A를 그대로 복제해 시작점 마련(`app-b/index.html` = `app-a/index.html`). 포털 카드 B를 "준비 중" → "사용 가능"으로 갱신. 이후 app-b는 A와 독립적으로 발전 예정.
- 저장소 개요 문서 정리: 루트 [README.md](README.md)(구조·작성 규칙·테마/폰트/강조색 관습·새 앱 추가 절차)와 이 [HISTORY.md](HISTORY.md) 추가.
- app-a: 스프레드시트 헤더 sticky 테두리를 `box-shadow`(inset)로 보정하고, 시트 탭 활성 표시선을 상단→하단으로 이동하는 CSS 정리.

## 2026-07-09
- **포털 구조로 재편성**(`Restructure into per-app folders with a top-level portal`): 최상위 [`index.html`](index.html)을 A–F 카드 그리드 포털로 만들고, 각 앱을 `app-a` … `app-f` 폴더로 분리. B–F는 "준비 중" placeholder로 채움.
- **측정 QC 분석 웹앱 최초 추가**(`Add measurement QC analysis web app`): app-a 완성 — 엑셀형 웹 스프레드시트, 직접 구현한 수식 엔진(40+ 함수), SVG 차트(정규분포·산점도·박스플롯), 라이브러리 없는 xlsx 읽기, 튜토리얼 위저드. 상세 문서 [app-a/docs/개발노트.md](app-a/docs/개발노트.md).

---

### 기록 방법
- 새 작업을 하면 맨 위 날짜 블록에 한 줄 요약을 추가합니다(무엇을·왜).
- 앱을 placeholder에서 실제 기능으로 바꾸면 그 사실과 함께 포털 카드도 갱신했는지 남깁니다.
