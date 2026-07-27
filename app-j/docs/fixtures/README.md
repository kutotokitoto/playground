# 업로드 방어 테스트 픽스처

`node app-a/docs/make-fixtures.mjs` 로 재생성. 시드 고정이라 항상 동일.

| 파일 | 내용 | 기대 동작 |
|---|---|---|
| F01-standard.xlsx | 표준 가로 템플릿 (sharedStrings) | 라벨 경로, 8P×40N |
| F02-offset.xlsx | 앞 2행·2열 비움 + 제목 행 (무압축 ZIP) | 정규화 후 라벨 경로, 6P×30N |
| F03-transposed-labeled.xlsx | 전치 + 라벨(포인트/스펙/상한/하한이 1행에) | 라벨 행 감지 → 전치 해석, 10P×36N |
| F04-index-and-serial-cols.xlsx | No.(1..N) 열 + 텍스트 시리얼 열 | 추론: 인덱스 열 제외, 시리얼=SN-10xx, 5P×32N |
| F05-missing-cells.xlsx | 측정값 ~8% 빈칸 | 라벨 경로 + 빈칸=미측정 NG |
| F06-unnamed-shuffled-specs.xlsx | 스펙 3행 무명 + 하한·스펙·상한 순서 뒤섞임 | 추론: 값 크기로 역할 배정, 7P×34N |
| F07-ambiguous-square.xlsx | 12P×14N 무헤더 + 동일 공칭치수 | 모호 → 가져오기 미리보기 표시 |
| F08-two-sheets.xlsx | 시트 2개 | 첫 시트만 사용 + 안내 토스트, 5P×20N |
| F09-headerless.xlsx | 헤더·시리얼 없는 숫자 행렬 + 스펙 3행 (무압축) | 추론: 포인트 01,02… 자동 명명, 10P×30N |
| F10-footer-junk.xlsx | 데이터 뒤 평균/판정 요약 행 | 잡행 무시, 6P×28N |
| F11-transposed-offset-missing.xlsx | 전치 + 오프셋 + 결측 + 비표준 라벨(목표/MAX/MIN) | 추론: 전치 해석 + 미측정 NG, 12P×30N |
| F12-no-specs.xlsx | 상한/하한 규격 행 없음 | 명확한 실패 사유 토스트 |
