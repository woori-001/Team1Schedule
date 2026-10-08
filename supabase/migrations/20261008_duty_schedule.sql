-- 유통1팀 근무표 (토요근무·조출) — Supabase 스키마
-- 프로젝트 "woori-001's Project" 에 2026-10-08 적용 완료. 다른 앱과 섞이지 않도록 모든 객체는 duty_ 접두어.
--
-- 보안 모델
--   읽기 : anon 이 4개 공개 테이블을 select 로 직접 읽음 (RLS: select 만 허용)
--   쓰기 : 테이블 직접 쓰기는 RLS 로 전부 차단. duty_* RPC(SECURITY DEFINER)만 쓰기 가능하며,
--          각 함수가 duty_login 으로 발급된 8시간짜리 토큰을 duty_sessions 에서 검사함.
--   비밀 : duty_auth(비밀번호 bcrypt 해시), duty_sessions(토큰)은 정책이 없어 anon/authenticated 접근 전면 거부.
--
-- 비밀번호 초기화 : SQL 편집기에서  select public.duty_reset_password('1234');

-- ───────────── 테이블 ─────────────
create table public.duty_members (
  id         bigint generated always as identity primary key,
  name       text not null unique check (length(trim(name)) > 0),
  active     boolean not null default true,
  sort_order int not null default 999,
  memo       text not null default ''
);
comment on table public.duty_members is '근무표 팀원 : 이름 = 화면 표시 호칭';

create table public.duty_saturday (
  duty_date date primary key,
  name      text not null,
  memo      text not null default ''
);
comment on table public.duty_saturday is '근무표 토요근무 : 날짜별 담당자';

create table public.duty_early (
  week_start date primary key check (extract(isodow from week_start) = 1),
  name       text not null,
  start_dow  text not null default '월' check (start_dow in ('월','화','수','목','금')),
  end_dow    text not null default '금' check (end_dow in ('월','화','수','목','금')),
  memo       text not null default ''
);
comment on table public.duty_early is '근무표 조출 : 주(월요일 시작)별 담당자';

create table public.duty_settings (
  key   text primary key,
  value text not null default ''
);
comment on table public.duty_settings is '근무표 설정 : 팀명, 안내문구';

create table public.duty_auth (
  id      int primary key default 1 check (id = 1),
  pw_hash text not null
);
comment on table public.duty_auth is '근무표 팀장 비밀번호 해시 (anon 접근 불가)';

create table public.duty_sessions (
  token      uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null
);
comment on table public.duty_sessions is '근무표 팀장 모드 세션 토큰 (anon 접근 불가)';

-- ───────────── RLS ─────────────
alter table public.duty_members  enable row level security;
alter table public.duty_saturday enable row level security;
alter table public.duty_early    enable row level security;
alter table public.duty_settings enable row level security;
alter table public.duty_auth     enable row level security;
alter table public.duty_sessions enable row level security;

create policy "duty public read" on public.duty_members  for select to anon, authenticated using (true);
create policy "duty public read" on public.duty_saturday for select to anon, authenticated using (true);
create policy "duty public read" on public.duty_early    for select to anon, authenticated using (true);
create policy "duty public read" on public.duty_settings for select to anon, authenticated using (true);
-- duty_auth / duty_sessions : 정책 없음 = 전면 거부

-- ───────────── 내부 함수 (anon 호출 불가) ─────────────
create or replace function public.duty_is_leader(p_token uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from duty_sessions where token = p_token and expires_at > now());
$$;
revoke all on function public.duty_is_leader(uuid) from public, anon, authenticated;

create or replace function public.duty_require_leader(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from duty_sessions where expires_at <= now();
  if not duty_is_leader(p_token) then
    raise exception '팀장 모드가 아니거나 세션이 만료되었습니다. 다시 로그인해 주세요.';
  end if;
end $$;
revoke all on function public.duty_require_leader(uuid) from public, anon, authenticated;

create or replace function public.duty_reset_password(p_new text default '1234')
returns void language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  insert into duty_auth (id, pw_hash) values (1, crypt(p_new, gen_salt('bf')))
  on conflict (id) do update set pw_hash = excluded.pw_hash;
  for t in select token from duty_sessions loop
    delete from duty_sessions where token = t;
  end loop;
end $$;
revoke all on function public.duty_reset_password(text) from public, anon, authenticated;

-- ───────────── 공개 RPC ─────────────
create or replace function public.duty_login(p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_token uuid;
begin
  select pw_hash into v_hash from duty_auth where id = 1;
  if v_hash is null or crypt(coalesce(p_password,''), v_hash) <> v_hash then
    perform pg_sleep(0.5);
    return jsonb_build_object('ok', false, 'message', '비밀번호가 맞지 않습니다.');
  end if;
  insert into duty_sessions (expires_at) values (now() + interval '8 hours') returning token into v_token;
  return jsonb_build_object('ok', true, 'token', v_token);
end $$;

create or replace function public.duty_logout(p_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  delete from duty_sessions where token = p_token;
  select jsonb_build_object('ok', true);
$$;

create or replace function public.duty_check_token(p_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('ok', duty_is_leader(p_token));
$$;

create or replace function public.duty_change_password(p_token uuid, p_old text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  perform duty_require_leader(p_token);
  select pw_hash into v_hash from duty_auth where id = 1;
  if crypt(coalesce(p_old,''), v_hash) <> v_hash then
    return jsonb_build_object('ok', false, 'message', '현재 비밀번호가 맞지 않습니다.');
  end if;
  if p_new is null or length(p_new) < 4 then
    return jsonb_build_object('ok', false, 'message', '새 비밀번호는 4자 이상이어야 합니다.');
  end if;
  update duty_auth set pw_hash = crypt(p_new, gen_salt('bf')) where id = 1;
  return jsonb_build_object('ok', true);
end $$;

-- 토요근무 1건 저장 (이름 비면 삭제)
create or replace function public.duty_save_saturday(p_token uuid, p_date date, p_name text, p_memo text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform duty_require_leader(p_token);
  if coalesce(trim(p_name),'') = '' then
    delete from duty_saturday where duty_date = p_date;
  else
    insert into duty_saturday (duty_date, name, memo) values (p_date, trim(p_name), coalesce(p_memo,''))
    on conflict (duty_date) do update set name = excluded.name, memo = excluded.memo;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 조출 1주 저장 (이름 비면 삭제)
create or replace function public.duty_save_early(p_token uuid, p_week_start date, p_name text, p_start_dow text default '월', p_end_dow text default '금', p_memo text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform duty_require_leader(p_token);
  if coalesce(trim(p_name),'') = '' then
    delete from duty_early where week_start = p_week_start;
  else
    insert into duty_early (week_start, name, start_dow, end_dow, memo)
    values (p_week_start, trim(p_name), coalesce(p_start_dow,'월'), coalesce(p_end_dow,'금'), coalesce(p_memo,''))
    on conflict (week_start) do update set name = excluded.name, start_dow = excluded.start_dow, end_dow = excluded.end_dow, memo = excluded.memo;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 팀원 목록 전체 교체 (배열 순서 = 정렬 순서, 목록에 없는 팀원은 삭제)
create or replace function public.duty_save_members(p_token uuid, p_members jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m jsonb; i int := 0; n text; keep text[] := '{}'; old text;
begin
  perform duty_require_leader(p_token);
  for m in select value from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) loop
    n := trim(coalesce(m->>'name', ''));
    if n <> '' and not (n = any(keep)) then
      i := i + 1;
      keep := keep || n;
      insert into duty_members (name, active, sort_order, memo)
      values (n, coalesce((m->>'active')::boolean, true), i, coalesce(m->>'memo', ''))
      on conflict (name) do update set active = excluded.active, sort_order = excluded.sort_order, memo = excluded.memo;
    end if;
  end loop;
  for old in select name from duty_members loop
    if not (old = any(keep)) then
      delete from duty_members where name = old;
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.duty_save_settings(p_token uuid, p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform duty_require_leader(p_token);
  insert into duty_settings (key, value)
  select key, value from jsonb_each_text(coalesce(p_settings,'{}'::jsonb))
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  public.duty_login(text), public.duty_logout(uuid), public.duty_check_token(uuid),
  public.duty_change_password(uuid, text, text),
  public.duty_save_saturday(uuid, date, text, text),
  public.duty_save_early(uuid, date, text, text, text, text),
  public.duty_save_members(uuid, jsonb), public.duty_save_settings(uuid, jsonb)
to anon, authenticated;

-- ───────────── 초기 데이터 ─────────────
select public.duty_reset_password('1234');

insert into public.duty_members (name, sort_order) values
  ('성환',1),('승현',2),('채영',3),('동준',4),('재원',5),('가현',6),('하은',7),('조희',8),('은경',9);

insert into public.duty_saturday (duty_date, name) values
  ('2026-08-01','성환'),('2026-08-08','승현'),('2026-08-22','채영'),('2026-08-29','동준'),
  ('2026-09-05','재원'),('2026-09-12','가현'),('2026-09-19','하은'),('2026-10-10','조희'),
  ('2026-10-17','은경'),('2026-10-24','성환'),('2026-10-31','승현'),('2026-11-07','채영');

insert into public.duty_early (week_start, name, start_dow, end_dow, memo) values
  ('2026-08-31','재원','월','금',''),('2026-09-07','채영','월','금',''),('2026-09-14','동준','월','금',''),
  ('2026-09-21','하은','월','수','추석 연휴'),('2026-09-28','가현','월','금','');

insert into public.duty_settings (key, value) values
  ('팀명','유통1팀'),('안내문구','모두 수고 많으세요! 늘 응원합니다 ♡');
