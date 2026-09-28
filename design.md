# Habit Tracker — Design Rules

> 매일 여는 도구. 흑백 작업 화면 위에서 단 하나의 형광 노랑(#e4f222)이 "지금 할 일"과 "오늘 해낸 것"만 표시한다.

이 문서는 첨부된 에디토리얼 금융 스타일 레퍼런스(흑백 + 단일 형광색, 단일 굵기, 헤어라인)를 **로그인 후 매일 쓰는 습관 추적 앱**에 맞게 옮긴 규칙이다. 토큰은 `src/index.css`의 `@theme` 블록에 있으며 Tailwind 유틸리티(`bg-ink`, `text-heading-sm`, `rounded-input` 등)로 쓴다.

---

## 1. 원칙

1. **도구이지 소개 페이지가 아니다.** 히어로, 슬로건, 동기부여 문구, 큰 헤드라인을 쓰지 않는다. 화면의 첫 줄은 항상 페이지 제목과 오늘의 상태다.
2. **현재 작업 · 상태 · 다음 행동은 항상 보인다.** 어느 페이지에 있든 상단 상태 바가 `완료 수 / 전체`, 진행 막대, `Next: 다음 습관`, `Mark done` 버튼을 보여준다.
3. **페이지당 제목 하나.** `<h1>`은 상단 바의 페이지 이름(Today / Calendar / Statistics / Settings) 하나뿐이다. 카드 안의 구분은 작은 대문자 라벨(`.eyebrow`)로 한다.
4. **하나의 강조색.** 무채색(Bone · Paper · Ink · Ash) 위에서 노랑은 *다음 행동과 달성*에만 쓴다.
5. **단일 굵기, 헤어라인, 좌측 정렬.** 글자는 모두 400. 입체감은 1px 테두리로. 텍스트는 왼쪽 정렬.
6. **움직임은 상태 변화만.** 색·배경·테두리·너비 전환(0.3s ease-out). 확대·회전·튕김 금지.

---

## 2. 색상

| 토큰 | 값 | Tailwind | 이 앱에서의 역할 |
|---|---|---|---|
| Highlighter Yellow | `#e4f222` | `bg-highlighter` | `Mark done` · `Add habit` 등 주 행동 버튼, 현재 페이지 내비 표시, 완료 체크, 진행 막대, 달력 "전부 완료" 날, 통계 강조 막대 |
| Ink | `#0c0a08` | `text-ink` | 본문·제목, 외곽선 버튼, 완료된 습관 카드 테두리, 차트 막대, 오늘 날짜 테두리 |
| Obsidian | `#1a1919` | `bg-obsidian` | 예약(현재 앱 화면에서는 사용하지 않음). 반전 영역이 필요할 때만 |
| Paper | `#ffffff` | `bg-paper` | 카드, 상단 바, 사이드바, 하단 탭 바, 입력 필드 |
| Bone | `#f4f2f0` | `bg-bone` | 페이지 캔버스, 아바타, 미완료 체크 토글, hover 배경 |
| Ash | `#6d6c6b` | `text-ash` | 보조 텍스트, 라벨, 완료된 습관 이름 |
| Hairline | `#e5e7eb` | `border-hairline` | 카드·바 테두리, 구분선 |
| Smoke | `#d3d3d3` | `bg-smoke` | 기록 없음 점, 빈 막대 |

**대비 규칙**
- 노랑 위 글자는 항상 Ink. 흰 배경 위의 작은 노랑(점·얇은 막대)에는 1px Ink 테두리.
- 상태는 색만으로 구분하지 않는다: 채움 + 테두리 + 텍스트(`2/3`, `Next:`, `All done`)를 함께.

**의미색 없음:** 초록·빨강 등 추가 색 금지. 파괴적 동작(삭제·초기화)은 외곽선/고스트 버튼 + 확인 대화상자 + 설명으로 무게를 준다.

**한 화면에 노랑 버튼은 하나.** 상태 바의 `Mark done`(또는 습관이 없을 때 `Add habit`)이 주 행동이다. 상단 바의 `New habit`은 외곽선 버튼이다.

---

## 3. 타이포그래피

- **서체:** `Inter` (레퍼런스의 lausanne 대체), 대체 `ui-sans-serif, system-ui`. `"ss01" on` 전역 적용.
- **굵기:** 400만. `font-bold` / `font-semibold` / `font-medium` 금지.
- **숫자:** 카운트·비율은 `tabular-nums`로 자릿수 흔들림 방지.

| 역할 | 크기 / 행간 | Tailwind | 사용처 |
|---|---|---|---|
| page title | 24px / 1.17 | `text-heading-sm` | 상단 바 `<h1>` (페이지당 하나), 로그인 카드 제목 |
| metric | 28px / 1.14 | `text-heading` | 통계 지표 수치 |
| subheading | 20px / 1.3 | `text-subheading` | 앱 이름, 달력 월 |
| body | 16px / 1.5 | `text-base` | 습관 이름, 설정 항목, 입력, 버튼 |
| small | 14px | `text-sm` | 설명, 스트릭, 상태 바, 요약 줄 |
| label | 11px 대문자, 자간 0.05em | `.eyebrow` / `text-caption` | 카드 구분 라벨, 필드 라벨, 요일, 하단 탭 라벨 |

- `text-display`(64px)·`text-heading-lg`(40px)는 앱 화면에서 쓰지 않는다(소개 페이지 문법).

---

## 4. 간격

기본 단위 4px, 앱 화면은 **촘촘하게**: 8 / 12 / 16px 중심.

| 값 | Tailwind | 용도 |
|---|---|---|
| 8px | `2` | 목록 항목 간, 버튼 그룹 |
| 12px | `3` | 습관 카드 패딩(모바일), 카드 내부 요소 간 |
| 16px | `4` | 페이지 좌우 여백(모바일), 카드 간, 카드 패딩 |
| 20px | `5` | 카드 패딩(≥640px) |
| 24px | `6` | 페이지 좌우 여백(≥640px) |

---

## 5. 형태 (Radius · Elevation)

| 요소 | 반경 | Tailwind |
|---|---|---|
| 버튼, 내비 항목, 태그, 아바타, 달력 칸 | 6px | `rounded-md` |
| 입력 필드, 체크 토글, 프로필 목록 | 10px | `rounded-input` |
| 지표 카드 | 12px | `rounded-xl` |
| 콘텐츠 카드, 습관 카드 | 16px | `rounded-2xl` |

- 그 외 반경·알약형 금지(지름 12px 이하 상태 점만 원형 허용).
- `box-shadow` 금지. 예외: 상단 바의 `shadow-subtle`(흰 inset 하이라이트).

---

## 6. 앱 구조

```
로그인 전:  [Sign in 카드]
로그인 후:
┌───────────┬───────────────────────────────────────┐
│ Sidebar   │ Top bar:  <h1>Today</h1> Mon, Sep 28   [New habit] │  ← sticky
│  Today 2/3│ Status:   2/3 done ▓▓░  | Next: Run   [Mark done]  │  ← sticky
│  Calendar ├───────────────────────────────────────┤
│  Stats    │ 페이지 콘텐츠 (max 960px)                │
│  Settings │                                         │
│ ───────── │                                         │
│ TU Name ⇥ │                                         │
└───────────┴───────────────────────────────────────┘
(< 768px: 사이드바 대신 하단 탭 바, 상단 바 오른쪽에 아바타 → Settings)
```

### 로그인 (Sign in)
- 이 앱에는 서버가 없으므로 **이 브라우저에 저장되는 비밀번호 없는 프로필**이다. 화면에 그 사실을 한 줄로 명시한다.
- 카드 하나: 제목 `Sign in` → (있으면) "Profiles on this device" 목록(아바타 + 이름 + →) → 새 프로필 이름 입력 + `Create profile`.
- 프로필이 없을 때 `Create profile`은 노랑, 목록이 있을 때는 외곽선(기존 프로필 선택이 주 행동).
- 각 프로필의 데이터는 `habits:<id>` / `completions:<id>` 키에 분리 저장. 프로필 도입 전 데이터는 첫 프로필로 이전.

### 사이드바 (≥ 768px)
Paper, 너비 240px, 오른쪽 1px Hairline, 화면 높이 고정. 위: 앱 아이콘 + 이름. 가운데: 내비 항목(20px 선 아이콘 + 라벨, 높이 40px). 현재 페이지는 노랑 채움 + `aria-current="page"`. `Today` 항목 오른쪽에 `완료/전체` 카운트. 아래: 설치 버튼(가능할 때), 아바타 + 이름 + 로그아웃 아이콘 버튼.

### 하단 탭 바 (< 768px)
하단 고정, Paper 95% + blur, 상단 1px Hairline, safe-area 여백. 4칸 균등, [24px 선 아이콘 + 11px 라벨]. 현재 칸은 아이콘 뒤 56×32px 노랑 표시.

### 상단 바
Sticky, Paper 95% + blur, 하단 Hairline, `shadow-subtle`. 높이 56px / 64px(≥768px). 왼쪽: `<h1>` 페이지 이름 + (≥640px) 짧은 날짜(Ash). 오른쪽: 페이지 행동(Today의 `New habit` 외곽선 버튼), 모바일에서는 아바타(→ Settings).

### 상태 바 (항상 표시)
상단 바 바로 아래, 같은 sticky 헤더 안. 높이 56px, 위 Hairline.
| 상태 | 왼쪽 | 가운데 | 오른쪽 |
|---|---|---|---|
| 습관 없음 | `0/0` + 빈 막대 | `No habits yet` | `Add habit` (노랑) |
| 진행 중 | `2/3 done today` + 막대 | `Next: <첫 미완료 습관>` | `Mark done` (노랑) |
| 모두 완료 | `3/3` + 가득 찬 막대 | `All done · longest streak N days` | — |
- 모바일에서는 `done today` 텍스트를 숨기고 막대를 48px로 줄인다. 다음 습관 이름은 한 줄 말줄임.
- `aria-live="polite"`로 상태 변화를 보조기기에 알린다.

---

## 7. 컴포넌트

### 버튼
| 종류 | 스타일 | 사용처 |
|---|---|---|
| Primary | 노랑 채움, Ink 글자, 6px, 높이 36px(`btn-sm`)/44px | Mark done, Add habit, Save |
| Outlined | 투명, 1px Ink, 6px | New habit, Export, Choose file, Clear, Sign out, Today(달력) |
| Ghost | 투명, hover 시 Bone | Edit, Delete, Cancel, 월 이동, 로그아웃 아이콘 |
- 모든 버튼 `transition-colors 0.3s ease-out`, 포커스 시 2px Ink 아웃라인.

### 입력 필드
Paper, 1px `rgba(33,33,33,0.1)`, 10px 반경, 높이 44px, 글자 16px(iOS 확대 방지), 포커스 시 테두리 Ink. 라벨은 위에 `.eyebrow`.

### 습관 카드 (한 줄)
Paper, 1px Hairline(완료 시 Ink), 16px 반경, 패딩 12px / 16px(≥640px).
`[체크 토글 44px] [이름 / 설명 · N days streak · 7+·30+ days] [Edit] [Delete]`
- 미완료 토글: Bone + Hairline + 흑백 아이콘. 완료 토글: 노랑 + Ink 테두리 + ✓.
- 완료된 이름: Ash + 취소선. 긴 텍스트는 잘라내지 않고 줄바꿈.
- 수정은 카드 자리에서 인라인 폼으로(Save 노랑 / Cancel 고스트).

### 새 습관 폼
상단 바 `New habit` 또는 상태 바 `Add habit`으로 열리는 인라인 카드. 목록 위에 표시, 이름 필드 자동 포커스. ≥640px에서 이름·설명 2열. 추가하면 닫힌다.

### 요약 줄
습관 목록 위 한 줄 `Habits 3 · Total streaks 2 · Longest 1 day` (라벨 Ash, 값 Ink, 14px). 별도 제목을 달지 않는다.

### 빈 상태
카드 하나: `No habits yet` + 한 줄 설명. 행동 버튼은 상태 바에만 둔다(중복 버튼 금지).

### 지표 카드 (Statistics)
Paper, 1px Hairline, 12px 반경, 패딩 16px. `.eyebrow` 라벨 + 28px 수치(+ Ash 단위). 모바일 2열, ≥1024px 4열.

### 설정 목록 (Settings)
카드 안의 행 목록(행 사이 Hairline). 각 행: 제목(16px) + 설명(14px Ash) + 오른쪽 외곽선 버튼. 섹션: `Account`(아바타, 이름, 가입일, Sign out), `Data · stored in this browser`(Export / Import / Clear).

### 달력
카드 안: 월 이름(20px) + [← Today →]. 전부 완료 = 칸 노랑 채움, 일부 = 노랑 점 + Ink 테두리, 없음 = Smoke 점, 오늘 = 1px Ink 테두리. 범례 4항목(모바일 2열).

### 차트 (최근 14일)
Bone 워시 위 Ink 막대, 강조 막대 하나만 노랑 + Ink 테두리, 기록 없는 날 Smoke. 축 라벨 11px.

---

## 8. 반응형

| 구간 | 너비 | 동작 |
|---|---|---|
| Phone | < 640px | 하단 탭 바, 상단 바에 제목 + 행동 + 아바타, 상태 바 축약, 좌우 16px, 습관 카드 패딩 12px, 지표 2열 |
| Large phone | 640–767px | 하단 탭 바 유지, 상단 바에 날짜 표시, 폼 필드 2열 |
| Tablet | 768–1023px | 사이드바 240px 등장, 하단 탭 바·상단 아바타 숨김 |
| Desktop | ≥ 1024px | 콘텐츠 최대 960px, 지표 4열, 통계 하단 2열 |

- 페이지 가로 스크롤 금지. 터치 대상 최소 44px(체크 토글·하단 탭), 보조 버튼 36px.
- 페이지를 바꾸면 맨 위로 스크롤한다.

---

## 9. 앱 셸 (PWA)

- **설치:** `public/manifest.webmanifest` — `display: standalone`, `theme_color #ffffff`, `background_color #f4f2f0`. 아이콘은 노랑 타일 + Ink 체크(192/512, maskable 512, Apple 180).
- **오프라인:** `public/sw.js`가 앱 셸과 폰트를 캐시(페이지는 네트워크 우선, 정적 파일은 캐시 우선). 프로덕션 빌드에서만 등록. 캐시 구조를 바꾸면 `CACHE` 버전을 올린다.
- **안전 영역:** 상단 바 `safe-area-inset-top`, 하단 탭 바와 본문 하단 여백 `safe-area-inset-bottom`.
- **네이티브 감각:** 탭 하이라이트 제거, `touch-action: manipulation`, 설치된 앱에서 overscroll 튕김 제거.

---

## 10. 해야 할 것 (Do)

- 모든 로그인 화면에 상단 바 + 상태 바를 유지한다.
- 페이지 제목은 상단 바의 `<h1>` 하나. 카드 구분은 `.eyebrow` 라벨.
- 라벨은 짧고 동사/명사 그대로: `Mark done`, `New habit`, `Export`, `Sign out`, `Next:`.
- 노랑 버튼은 화면당 하나(다음 행동).
- 상태는 숫자 + 막대 + 텍스트로 함께 표현.
- 파괴적 동작은 확인 대화상자를 거친다.

## 11. 하지 말아야 할 것 (Don't)

- 히어로, 큰 헤드라인, 슬로건, 동기부여 문구, 이모지 장식 금지.
- 같은 정보를 제목으로 반복하지 않기(예: 페이지 제목 "Statistics" 아래 "Statistics Dashboard").
- 같은 행동 버튼을 한 화면에 두 번 두지 않기.
- 추가 색, 그라디언트, 그림자, 굵은 글자, 확대 애니메이션 금지.
- 6 / 10 / 12 / 16px 외의 반경, 알약형 버튼 금지.
- 중앙 정렬 텍스트 금지(로그인 카드는 가운데 배치하되 내부 텍스트는 왼쪽 정렬).
