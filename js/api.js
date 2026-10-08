/* 유통1팀 근무표 — 데이터 계층 (Supabase)
 * 화면 코드(app.js)는 이 파일의 API 객체만 호출합니다.
 * 읽기: 공개 테이블 select (RLS: anon 읽기만 허용)
 * 쓰기: duty_* RPC 함수 (팀장 토큰 검사, SECURITY DEFINER) */
(function () {
  var cfg = window.DUTY_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || /PUT_YOUR/.test(cfg.SUPABASE_KEY)) {
    throw new Error('config.js 에 SUPABASE_URL / SUPABASE_KEY 를 채워주세요.');
  }
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: false } });

  function unwrap(p) {
    return p.then(function (r) { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; });
  }
  function rpc(fn, args) { return unwrap(sb.rpc(fn, args)); }
  function todayISO() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  window.API = {
    /** 전체 데이터 한 번에 */
    getAll: function () {
      return Promise.all([
        unwrap(sb.from('duty_members').select('name,active,sort_order,memo').order('sort_order')),
        unwrap(sb.from('duty_saturday').select('duty_date,name,memo').order('duty_date')),
        unwrap(sb.from('duty_early').select('week_start,name,start_dow,end_dow,memo').order('week_start')),
        unwrap(sb.from('duty_settings').select('key,value'))
      ]).then(function (r) {
        var settings = {}; (r[3] || []).forEach(function (s) { settings[s.key] = s.value; });
        return {
          members: (r[0] || []).map(function (m) { return { name: m.name, active: m.active !== false, order: m.sort_order, memo: m.memo || '' }; }),
          saturday: (r[1] || []).map(function (s) { return { date: s.duty_date, name: s.name, memo: s.memo || '' }; }),
          early: (r[2] || []).map(function (e) { return { weekStart: e.week_start, name: e.name, startDow: e.start_dow, endDow: e.end_dow, memo: e.memo || '' }; }),
          settings: settings,
          today: todayISO()
        };
      });
    },
    login: function (pw) { return rpc('duty_login', { p_password: pw }); },
    logout: function (t) { return rpc('duty_logout', { p_token: t }); },
    checkToken: function (t) { return rpc('duty_check_token', { p_token: t }); },
    changePassword: function (t, o, n) { return rpc('duty_change_password', { p_token: t, p_old: o, p_new: n }); },
    saveSaturday: function (t, date, name, memo) {
      return rpc('duty_save_saturday', { p_token: t, p_date: date, p_name: name || '', p_memo: memo || '' })
        .then(function () { return API.getAll(); }).then(function (d) { return { ok: true, saturday: d.saturday }; });
    },
    saveEarly: function (t, ws, name, s, e, memo) {
      return rpc('duty_save_early', { p_token: t, p_week_start: ws, p_name: name || '', p_start_dow: s || '월', p_end_dow: e || '금', p_memo: memo || '' })
        .then(function () { return API.getAll(); }).then(function (d) { return { ok: true, early: d.early }; });
    },
    saveMembers: function (t, members) {
      return rpc('duty_save_members', { p_token: t, p_members: (members || []).map(function (m) { return { name: m.name, active: m.active !== false, memo: m.memo || '' }; }) })
        .then(function () { return API.getAll(); }).then(function (d) { return { ok: true, members: d.members }; });
    },
    saveSettings: function (t, settings) {
      return rpc('duty_save_settings', { p_token: t, p_settings: settings || {} })
        .then(function () { return API.getAll(); }).then(function (d) { return { ok: true, settings: d.settings }; });
    }
  };
})();
