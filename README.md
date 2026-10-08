# Team1Schedule — 유통1팀 근무표 (토요근무 · 조출)

정적 웹 + Supabase. 서버 코드 없이 GitHub Pages 에서 바로 동작합니다.

- 누구나: 전체 일정 달력, 월별 목록, 내 일정(이름 선택 → 본인 것만, D-day)
- 팀장 모드(비밀번호): 토요일/조출 배정·삭제, 자동 배정, 팀원 관리, 팀명·안내문구·비밀번호 변경

## 구조

```
index.html                 화면
css/style.css              스타일 (탁상달력 디자인)
js/app.js                  화면 로직 — 서버 호출은 window.API 만 사용
js/api.js                  데이터 계층 (Supabase 읽기 + duty_* RPC)
config.js                  Supabase URL / publishable 키
vendor/supabase.js         @supabase/supabase-js 2.117.3 UMD (CDN 의존 없음)
supabase/migrations/       DB 스키마 + RLS + 함수 + 초기 데이터 (이미 적용됨)
```

## Supabase

프로젝트 **woori-001's Project** (`omdyyvqkxxigilxjysbz`, ap-northeast-2) 에 적용되어 있습니다.
다른 앱과 섞이지 않도록 모든 객체는 `duty_` 접두어를 씁니다.

| 테이블 | 용도 | anon 권한 |
|---|---|---|
| `duty_members` | 팀원 (이름, 활성, 순서) | 읽기 |
| `duty_saturday` | 토요근무 (날짜별 담당자) | 읽기 |
| `duty_early` | 조출 (주 시작 월요일, 시작~종료 요일) | 읽기 |
| `duty_settings` | 팀명, 안내문구 | 읽기 |
| `duty_auth` | 팀장 비밀번호 bcrypt 해시 | 없음 |
| `duty_sessions` | 팀장 모드 토큰 (8시간) | 없음 |

**쓰기는 테이블 직접 접근이 RLS 로 전부 막혀 있고**, `duty_login` 으로 받은 토큰을 검사하는
`SECURITY DEFINER` 함수(`duty_save_saturday`, `duty_save_early`, `duty_save_members`,
`duty_save_settings`, `duty_change_password`)를 통해서만 가능합니다.
그래서 publishable 키가 코드에 공개되어 있어도 비밀번호 없이는 아무것도 바꿀 수 없습니다.

Supabase 보안 어드바이저가 "anon 이 SECURITY DEFINER 함수를 실행할 수 있다"고 경고하는데,
이건 의도된 설계입니다(함수 안에서 토큰 검사). 같은 프로젝트의 `reception_*` 앱도 같은 방식입니다.

## 배포 (GitHub Pages)

1. 이 저장소를 push
2. GitHub 저장소 → Settings → Pages → Source: **Deploy from a branch**, Branch: `main` / `(root)` → Save
3. 1~2분 뒤 `https://woori-001.github.io/Team1Schedule/` 에서 접속

## 첫 사용

- 오른쪽 위 **팀장 모드** → 기본 비밀번호 `1234`
- **설정** 탭에서 비밀번호를 바꾼 뒤 팀장님께 전달

## 비밀번호를 잊었을 때

Supabase 대시보드 → SQL Editor:

```sql
select public.duty_reset_password('1234');
```

(모든 팀장 세션도 함께 해제됩니다)

## 데이터 직접 수정

Supabase 대시보드 → Table Editor 에서 `duty_*` 테이블을 고치고 웹을 새로고침하면 반영됩니다.
`duty_early.week_start` 는 반드시 **월요일** 날짜여야 합니다(제약조건).

## 로컬 확인

```
npx serve .     # 또는 python3 -m http.server
```

파일을 직접 열면(file://) 동작하지 않습니다. 간단한 정적 서버로 띄우세요.
