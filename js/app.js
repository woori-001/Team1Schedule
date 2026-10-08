/* 유통1팀 근무표 — 화면 로직. 서버 호출은 전부 window.API (js/api.js) 를 통함. */

// ───────────── 상태 ─────────────
var S = { members: [], saturday: [], early: [], settings: {}, today: '', token: null, leader: false, me: '', view: null };
var DOW = ['일','월','화','수','목','금','토'];
var DOW_EN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
var WEEKDOW = ['월','화','수','목','금'];
var PALETTE = 10;
var MONTH_EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
var TAB_COLORS = ['#e9a3b5','#e7a9b9','#e4afbc','#e1b5bf','#dcbcc3','#b9d6cb','#a8d4c3','#94cfb9','#84c9ae','#73c2a3','#66bb9b','#5bb493'];

// ───────────── 라인 아이콘 (SVG) ─────────────
var ICONS = {
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M12 20.5C9.5 18.6 2 13.6 2 8.6 2 5.6 4.4 3.5 7 3.5c2.1 0 3.9 1.2 5 3 1.1-1.8 2.9-3 5-3 2.6 0 5 2.1 5 5.1 0 5-7.5 10-10 11.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l3 3"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function ico(name, size) { return '<svg class="ic" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>'; }
document.querySelectorAll('[data-ico]').forEach(function (el) { el.insertAdjacentHTML('afterbegin', ico(el.dataset.ico, el.dataset.icoSize)); });

// ───────────── 서버 호출 ─────────────
function api(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  return window.API[fn].apply(null, args);
}
function fail(e) { toast(ico('alert', 14) + ' ' + esc(e && e.message ? e.message : e), true); console.error(e); }

// ───────────── 유틸 ─────────────
function pad(n){return (n<10?'0':'')+n}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function md(s){var d=parse(s);return (d.getMonth()+1)+'/'+d.getDate()}
function mdDow(s){return md(s)+' ('+DOW[parse(s).getDay()]+')'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function member(name){for(var i=0;i<S.members.length;i++)if(S.members[i].name===name)return S.members[i];return null}
function colorIdx(name){var i=S.members.findIndex(function(m){return m.name===name});return i<0?9:i%PALETTE}
function pillStyle(name){var i=colorIdx(name);return 'background:var(--c'+i+');color:var(--c'+i+'t)'}
function activeMembers(){return S.members.filter(function(m){return m.active})}
function satMap(){var o={};S.saturday.forEach(function(s){o[s.date]=s});return o}
function earlyMap(){var o={};S.early.forEach(function(e){o[e.weekStart]=e});return o}
function toast(msg,isHtml){var t=document.getElementById('toast');if(isHtml)t.innerHTML=msg;else t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('show')},2200)}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}

// ───────────── 초기화 ─────────────
function init() {
  S.me = lsGet('duty_me') || '';
  var t = parse(S.today || iso(new Date()));
  S.view = new Date(t.getFullYear(), t.getMonth(), 1);
  document.getElementById('loading').style.display = 'none';
  var savedTok = lsGet('duty_token');
  if (savedTok) {
    api('checkToken', savedTok).then(function (r) { if (r.ok) { S.token = savedTok; setLeader(true); } else lsDel('duty_token'); }).catch(function(){});
  }
  renderAll();
  setLeader(false);
  showTab('all');
}
function load() {
  api('getAll').then(function (d) { Object.assign(S, d); init(); }).catch(function (e) {
    document.getElementById('loading').innerHTML = '<div class="error-box">데이터를 불러오지 못했습니다.<br><small>' + esc(e && e.message ? e.message : e) + '</small></div>';
  });
}

// ───────────── 탭 ─────────────
function showTab(name) {
  ['all','mine','members','settings'].forEach(function (t) {
    document.getElementById('tab-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
  if (name === 'mine') renderMine();
  if (name === 'members') renderMembers();
  if (name === 'settings') renderSettings();
}
function renderAll() {
  document.getElementById('brand').innerHTML = esc(S.settings['팀명'] || '우리팀') + ' 근무표<small>토요근무 · 조출</small>';
  document.getElementById('notice').textContent = S.settings['안내문구'] || '';
  document.getElementById('noticeBar').hidden = !(S.settings['안내문구'] || '').trim();
  renderCalendar();
  renderMonthLists();
  renderMeSelect();
}

// ───────────── 팀장 모드 ─────────────
function setLeader(on) {
  S.leader = on;
  var b = document.getElementById('btnLeader');
  b.innerHTML = on ? ico('unlock', 14) + ' 팀장 모드 ON' : ico('lock', 14) + ' 팀장 모드';
  b.classList.toggle('leader-on', on);
  document.getElementById('leaderTools').style.display = on ? '' : 'none';
  document.getElementById('tabMembers').style.display = on ? '' : 'none';
  document.getElementById('tabSettings').style.display = on ? '' : 'none';
  document.getElementById('memberAddRow').style.display = on ? '' : 'none';
  renderCalendar(); renderMembers();
}
function toggleLeader() {
  if (S.leader) { logout(); return; }
  openModal('팀장 로그인', '<label>팀장 비밀번호</label><input type="password" id="pwIn" autocomplete="current-password">', [
    { label: '취소' },
    { label: '로그인', primary: true, keep: true, onClick: function () {
        var pw = document.getElementById('pwIn').value;
        api('login', pw).then(function (r) {
          if (!r.ok) { toast(r.message); return; }
          S.token = r.token; lsSet('duty_token', r.token); closeModal(); setLeader(true); toast('팀장 모드가 켜졌습니다.');
        }).catch(fail);
      } }
  ]);
  setTimeout(function(){var i=document.getElementById('pwIn'); if(i){i.focus(); i.addEventListener('keydown',function(e){if(e.key==='Enter')document.querySelector('.modal .primary').click()})}},50);
}
function logout() {
  if (S.token) api('logout', S.token).catch(function(){});
  S.token = null; lsDel('duty_token'); setLeader(false); showTab('all'); toast('팀장 모드를 해제했습니다.');
}
function requireLeader() { if (!S.leader) { toast('팀장 모드에서만 편집할 수 있습니다.'); return false; } return true; }
function handleAuthError(e) {
  if (e && /팀장 모드|만료/.test(e.message || '')) { S.token = null; lsDel('duty_token'); setLeader(false); }
  fail(e);
}

// ───────────── 달력 ─────────────
function moveMonth(n) { S.view = new Date(S.view.getFullYear(), S.view.getMonth() + n, 1); renderCalendar(); renderMonthLists(); }
function goMonth(i) { S.view = new Date(S.view.getFullYear(), i, 1); renderCalendar(); renderMonthLists(); }
function goToday() { var t = parse(S.today); S.view = new Date(t.getFullYear(), t.getMonth(), 1); renderCalendar(); renderMonthLists(); }

function renderCalendar() {
  var y = S.view.getFullYear(), m = S.view.getMonth();
  document.getElementById('calYear').textContent = y;
  document.getElementById('calMonthNum').textContent = pad(m + 1);
  document.getElementById('calMonthEn').textContent = MONTH_EN[m];
  document.getElementById('calMonthKr').textContent = (m + 1) + '월';
  document.getElementById('mtabs').innerHTML = MONTH_EN.map(function (en, i) {
    return '<button class="mtab' + (i === m ? ' active' : '') + '" style="background:' + TAB_COLORS[i] + '" onclick="goMonth(' + i + ')"><b class="num">' + (i + 1) + '</b>' + en.slice(0, 3) + '</button>';
  }).join('');
  var act = document.querySelector('.mtab.active'); if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });

  var first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  var start = addDays(first, -first.getDay());
  var sm = satMap(), em = earlyMap();
  var html = DOW_EN.map(function (d, i) { return '<div class="dow num ' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + d + '</div>'; }).join('');
  for (var w = start; w <= last; w = addDays(w, 7)) {
    html += '<div class="week">';
    for (var i = 0; i < 7; i++) {
      var d = addDays(w, i), ds = iso(d), other = d.getMonth() !== m;
      var cls = 'day' + (other ? ' other' : '') + (i === 0 ? ' sun' : '') + (i === 6 ? ' sat' : '') + (ds === S.today ? ' today' : '') + (i === 6 && S.leader ? ' editable' : '');
      html += '<div class="' + cls + '"' + (i === 6 && S.leader ? ' onclick="editSat(\'' + ds + '\')"' : '') + '>';
      html += '<div class="n num">' + (d.getDate() === 1 || (i === 0 && w.getTime() === start.getTime()) ? (d.getMonth() + 1) + '/' : '') + d.getDate() + '</div>';
      if (i === 6) {
        var s = sm[ds];
        if (s && s.name) html += '<span class="pill" style="' + pillStyle(s.name) + '" title="' + esc(s.memo) + '">' + esc(s.name) + '</span>';
        else if (S.leader && !other) html += '<span class="pill empty">+ 배정</span>';
      }
      html += '</div>';
    }
    var ws = iso(addDays(w, 1)), e = em[ws];
    html += '<div class="weekdays">';
    if (e && e.name) {
      var si = Math.max(0, WEEKDOW.indexOf(e.startDow)), ei = WEEKDOW.indexOf(e.endDow); if (ei < 0) ei = 4;
      var left = (si + 1) / 7 * 100, width = (ei - si + 1) / 7 * 100;
      html += '<div class="bar' + (S.leader ? ' editable' : '') + '" style="left:calc(' + left + '% + 4px);width:calc(' + width + '% - 8px);' + pillStyle(e.name) + '"' + (S.leader ? ' onclick="editEarly(\'' + ws + '\')"' : '') + ' title="' + esc(e.memo) + '">' + ico('heart', 13) + ' ' + esc(e.name) + ' 조출' + (e.memo ? ' · ' + esc(e.memo) : '') + '</div>';
    } else if (S.leader && addDays(w, 5) >= first && addDays(w, 1) <= last) {
      html += '<div class="bar empty editable" style="left:calc(' + (1/7*100) + '% + 4px);width:calc(' + (5/7*100) + '% - 8px)" onclick="editEarly(\'' + ws + '\')">+ 조출 배정</div>';
    }
    html += '</div></div>';
  }
  document.getElementById('cal').innerHTML = html;
  document.getElementById('legend').innerHTML = activeMembers().map(function (mm) { return '<span class="pill" style="' + pillStyle(mm.name) + '">' + esc(mm.name) + '</span>'; }).join('');
}

function renderMonthLists() {
  var y = S.view.getFullYear(), m = S.view.getMonth();
  var pre = y + '-' + pad(m + 1);
  document.getElementById('satMonthLabel').textContent = (m + 1) + '월';
  document.getElementById('earlyMonthLabel').textContent = (m + 1) + '월';
  var sats = S.saturday.filter(function (s) { return s.date.indexOf(pre) === 0; });
  document.getElementById('satList').innerHTML = sats.length ? '<table><tr><th>날짜</th><th>담당자</th><th>비고</th></tr>' + sats.map(function (s) {
    return '<tr class="' + (s.date < S.today ? 'past' : '') + (s.name === S.me ? ' mine' : '') + '"><td>' + mdDow(s.date) + '</td><td><span class="pill" style="' + pillStyle(s.name) + '">' + esc(s.name) + '</span></td><td class="muted">' + esc(s.memo) + '</td></tr>';
  }).join('') + '</table>' : '<p class="muted">이 달에 배정된 토요근무가 없습니다.</p>';
  var last = new Date(y, m + 1, 0);
  var earls = S.early.filter(function (e) { var d = parse(e.weekStart); return addDays(d, 4) >= new Date(y, m, 1) && d <= last; });
  document.getElementById('earlyList').innerHTML = earls.length ? '<table><tr><th>주간</th><th>담당자</th><th>비고</th></tr>' + earls.map(function (e) {
    var d = parse(e.weekStart), ei = WEEKDOW.indexOf(e.endDow); if (ei < 0) ei = 4; var si = Math.max(0, WEEKDOW.indexOf(e.startDow));
    return '<tr class="' + (iso(addDays(d, ei)) < S.today ? 'past' : '') + (e.name === S.me ? ' mine' : '') + '"><td>' + md(iso(addDays(d, si))) + ' ~ ' + md(iso(addDays(d, ei))) + ' (' + e.startDow + '~' + e.endDow + ')</td><td><span class="pill" style="' + pillStyle(e.name) + '">' + esc(e.name) + '</span></td><td class="muted">' + esc(e.memo) + '</td></tr>';
  }).join('') + '</table>' : '<p class="muted">이 달에 배정된 조출이 없습니다.</p>';
}

// ───────────── 편집 모달 ─────────────
function memberOptions(sel) {
  var list = activeMembers().slice();
  if (sel && !list.some(function (m) { return m.name === sel; })) { list.push(member(sel) || { name: sel }); }
  return '<option value="">(미배정)</option>' + list.map(function (m) { return '<option value="' + esc(m.name) + '"' + (m.name === sel ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
}
function editSat(ds) {
  if (!requireLeader()) return;
  var cur = satMap()[ds] || {};
  openModal('토요근무 · ' + mdDow(ds),
    '<label>담당자</label><select id="fName">' + memberOptions(cur.name) + '</select>' +
    '<label>비고</label><input type="text" id="fMemo" value="' + esc(cur.memo || '') + '" placeholder="예: 재고조사">',
    [ { label: '취소' },
      cur.name ? { label: '배정 삭제', danger: true, onClick: function () { saveSat(ds, '', ''); } } : null,
      { label: '저장', primary: true, onClick: function () { saveSat(ds, document.getElementById('fName').value, document.getElementById('fMemo').value); } } ]);
}
function saveSat(ds, name, memo) {
  api('saveSaturday', S.token, ds, name, memo).then(function (r) { S.saturday = r.saturday; renderCalendar(); renderMonthLists(); toast('저장했습니다.'); }).catch(handleAuthError);
}
function editEarly(ws) {
  if (!requireLeader()) return;
  var cur = earlyMap()[ws] || {};
  var dowSel = function (id, v) { return '<select id="' + id + '">' + WEEKDOW.map(function (d) { return '<option' + (d === v ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>'; };
  openModal('조출 · ' + md(ws) + ' ~ ' + md(iso(addDays(parse(ws), 4))) + ' 주',
    '<label>담당자</label><select id="fName">' + memberOptions(cur.name) + '</select>' +
    '<div class="row" style="gap:12px"><div style="flex:1"><label>시작 요일</label>' + dowSel('fStart', cur.startDow || '월') + '</div><div style="flex:1"><label>종료 요일</label>' + dowSel('fEnd', cur.endDow || '금') + '</div></div>' +
    '<label>비고</label><input type="text" id="fMemo" value="' + esc(cur.memo || '') + '" placeholder="예: 추석 연휴">',
    [ { label: '취소' },
      cur.name ? { label: '배정 삭제', danger: true, onClick: function () { saveEarly(ws, '', '월', '금', ''); } } : null,
      { label: '저장', primary: true, onClick: function () {
          var s = document.getElementById('fStart').value, e = document.getElementById('fEnd').value;
          if (WEEKDOW.indexOf(s) > WEEKDOW.indexOf(e)) { toast('종료 요일이 시작 요일보다 빠릅니다.'); return; }
          saveEarly(ws, document.getElementById('fName').value, s, e, document.getElementById('fMemo').value);
        } } ]);
}
function saveEarly(ws, name, s, e, memo) {
  api('saveEarly', S.token, ws, name, s, e, memo).then(function (r) { S.early = r.early; renderCalendar(); renderMonthLists(); toast('저장했습니다.'); }).catch(handleAuthError);
}

// 자동 배정: 마지막 배정자의 다음 순번부터 (활성 팀원, 이번 달 이미 배정된 사람은 한 바퀴 건너뜀)
function autoFill(kind) {
  if (!requireLeader()) return;
  var ms = activeMembers(); if (!ms.length) { toast('활성 팀원이 없습니다.'); return; }
  var y = S.view.getFullYear(), m = S.view.getMonth(), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  var targets = [], existing, key;
  if (kind === 'sat') {
    existing = S.saturday; key = 'date';
    for (var d = first; d <= last; d = addDays(d, 1)) if (d.getDay() === 6 && !satMap()[iso(d)]) targets.push(iso(d));
  } else {
    existing = S.early; key = 'weekStart';
    for (var d2 = addDays(first, (1 - first.getDay() + 7) % 7); d2 <= last; d2 = addDays(d2, 7)) if (!earlyMap()[iso(d2)]) targets.push(iso(d2));
  }
  if (!targets.length) { toast('빈 칸이 없습니다.'); return; }
  var prev = existing.filter(function (x) { return x[key] < targets[0] && x.name; }).pop();
  var idx = prev ? ms.findIndex(function (mm) { return mm.name === prev.name; }) : -1;
  var pre = y + '-' + pad(m + 1), taken = {};
  existing.forEach(function (x) { if (x[key].indexOf(pre) === 0 && x.name) taken[x.name] = 1; });
  var plan = targets.map(function (t) {
    for (var k = 0; k < ms.length; k++) { idx = (idx + 1) % ms.length; if (!taken[ms[idx].name]) break; }
    taken[ms[idx].name] = 1;
    return { t: t, name: ms[idx].name };
  });
  openModal((kind === 'sat' ? '토요근무' : '조출') + ' 자동 배정 미리보기',
    '<p class="hint">' + (prev ? '마지막 배정(' + esc(prev.name) + ') 다음 순번부터 채웁니다.' : '팀원 순서 첫 번째부터 채웁니다.') + '</p>' +
    '<table>' + plan.map(function (p) { return '<tr><td>' + (kind === 'sat' ? mdDow(p.t) : md(p.t) + ' 주') + '</td><td><span class="pill" style="' + pillStyle(p.name) + '">' + esc(p.name) + '</span></td></tr>'; }).join('') + '</table>',
    [ { label: '취소' }, { label: '이대로 배정', primary: true, onClick: function () {
        var chain = Promise.resolve();
        plan.forEach(function (p) {
          chain = chain.then(function () { return kind === 'sat' ? api('saveSaturday', S.token, p.t, p.name, '') : api('saveEarly', S.token, p.t, p.name, '월', '금', ''); })
            .then(function (r) { if (r.saturday) S.saturday = r.saturday; if (r.early) S.early = r.early; });
        });
        chain.then(function () { renderCalendar(); renderMonthLists(); toast(plan.length + '건 배정했습니다.'); }).catch(handleAuthError);
      } } ]);
}

// ───────────── 내 일정 ─────────────
function renderMeSelect() {
  var sel = document.getElementById('meSelect');
  sel.innerHTML = '<option value="">선택하세요</option>' + S.members.filter(function (m) { return m.active || m.name === S.me; }).map(function (m) { return '<option value="' + esc(m.name) + '"' + (m.name === S.me ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
}
function setMe(v) { S.me = v; lsSet('duty_me', v); renderMine(); renderMonthLists(); }
function renderMine() {
  var el = document.getElementById('mineBody');
  if (!S.me) { el.innerHTML = '<div class="card muted">이름을 선택하면 본인 일정만 모아서 보여드립니다.</div>'; return; }
  var sats = S.saturday.filter(function (s) { return s.name === S.me; });
  var earls = S.early.filter(function (e) { return e.name === S.me; });
  var upSat = sats.filter(function (s) { return s.date >= S.today; }), upEarly = earls.filter(function (e) { return iso(addDays(parse(e.weekStart), 4)) >= S.today; });
  var next = [].concat(upSat.map(function (s) { return { d: s.date, label: '토요근무 ' + mdDow(s.date) }; }), upEarly.map(function (e) { return { d: e.weekStart, label: '조출 ' + md(e.weekStart) + ' 주 (' + e.startDow + '~' + e.endDow + ')' }; })).sort(function (a, b) { return a.d < b.d ? -1 : 1; })[0];
  el.innerHTML =
    '<div class="card dots"><h3>' + ico('user') + '<span class="pill" style="' + pillStyle(S.me) + '">' + esc(S.me) + '</span> 님의 일정<em>MY SCHEDULE</em></h3>' +
    '<div class="stat"><div><b>' + upSat.length + '</b><span>남은 토요근무</span></div><div><b>' + upEarly.length + '</b><span>남은 조출 주</span></div><div><b>' + esc(next ? next.label : '없음') + '</b><span>다음 일정</span></div></div></div>' +
    '<div class="two">' +
    '<div class="card"><h3>' + ico('cal') + '토요일 근무<em>SATURDAY DUTY</em></h3>' + (sats.length ? '<table>' + sats.map(function (s) { return '<tr class="' + (s.date < S.today ? 'past' : '') + '"><td>' + mdDow(s.date) + '</td><td class="muted">' + esc(s.memo) + '</td><td class="muted" style="text-align:right">' + (s.date < S.today ? '완료' : 'D-' + Math.round((parse(s.date) - parse(S.today)) / 864e5)) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted">배정된 토요근무가 없습니다.</p>') + '</div>' +
    '<div class="card"><h3>' + ico('heart') + '주중 조출<em>EARLY SHIFT</em></h3>' + (earls.length ? '<table>' + earls.map(function (e) { var d = parse(e.weekStart), ei = WEEKDOW.indexOf(e.endDow); if (ei < 0) ei = 4; var si = Math.max(0, WEEKDOW.indexOf(e.startDow)); var done = iso(addDays(d, ei)) < S.today; return '<tr class="' + (done ? 'past' : '') + '"><td>' + md(iso(addDays(d, si))) + ' ~ ' + md(iso(addDays(d, ei))) + ' (' + e.startDow + '~' + e.endDow + ')</td><td class="muted">' + esc(e.memo) + '</td><td class="muted" style="text-align:right">' + (done ? '완료' : (e.weekStart <= S.today ? '진행 중' : 'D-' + Math.round((d - parse(S.today)) / 864e5))) + '</td></tr>'; }).join('') + '</table>' : '<p class="muted">배정된 조출이 없습니다.</p>') + '</div>' +
    '</div>';
}

// ───────────── 팀원 관리 ─────────────
var draft = null;
function renderMembers() {
  var el = document.getElementById('memberList');
  document.getElementById('memberHint').textContent = S.leader ? '(편집 후 저장을 누르세요)' : '(편집은 팀장 모드에서)';
  if (!S.leader) {
    draft = null;
    el.innerHTML = S.members.map(function (m) {
      var satN = S.saturday.filter(function (s) { return s.name === m.name; }).length, eN = S.early.filter(function (e) { return e.name === m.name; }).length;
      return '<div class="member-row' + (m.active ? '' : ' off') + '"><span class="swatch" style="background:var(--c' + colorIdx(m.name) + 't)"></span><span style="flex:1">' + esc(m.name) + (m.active ? '' : ' <span class="muted">· 비활성</span>') + '</span><span class="hint">토 ' + satN + ' · 조출 ' + eN + '</span></div>';
    }).join('') || '<p class="muted">등록된 팀원이 없습니다.</p>';
    return;
  }
  if (!draft) draft = S.members.map(function (m) { return Object.assign({}, m); });
  el.innerHTML = draft.map(function (m, i) {
    return '<div class="member-row' + (m.active ? '' : ' off') + '">' +
      '<span class="swatch" style="background:var(--c' + (i % PALETTE) + 't)"></span>' +
      '<input type="text" value="' + esc(m.name) + '" placeholder="이름" oninput="draft[' + i + '].name=this.value">' +
      '<button class="btn sm" onclick="draft[' + i + '].active=!draft[' + i + '].active;renderMembers()" title="활성/비활성">' + (m.active ? '활성' : '비활성') + '</button>' +
      '<button class="btn icon sm" onclick="moveMember(' + i + ',-1)" ' + (i === 0 ? 'disabled' : '') + '>' + ico('up', 13) + '</button>' +
      '<button class="btn icon sm" onclick="moveMember(' + i + ',1)" ' + (i === draft.length - 1 ? 'disabled' : '') + '>' + ico('down', 13) + '</button>' +
      '<button class="btn icon sm danger" onclick="removeMember(' + i + ')">' + ico('x', 13) + '</button></div>';
  }).join('') || '<p class="muted">팀원을 추가하세요.</p>';
}
function moveMember(i, n) { var j = i + n; if (j < 0 || j >= draft.length) return; var t = draft[i]; draft[i] = draft[j]; draft[j] = t; renderMembers(); }
function removeMember(i) {
  var m = draft[i], n = S.saturday.filter(function (s) { return s.name === m.name; }).length + S.early.filter(function (e) { return e.name === m.name; }).length;
  if (n && !confirm(m.name + ' 님은 배정된 일정이 ' + n + '건 있습니다. 일정은 그대로 남고 팀원 목록에서만 빠집니다. (배정만 막으려면 "비활성"을 쓰세요) 삭제할까요?')) return;
  draft.splice(i, 1); renderMembers();
}
function addMember() {
  var n = document.getElementById('newName').value.trim();
  if (!n) { toast('이름을 입력하세요.'); return; }
  if (draft.some(function (m) { return m.name === n; })) { toast('이미 있는 이름입니다.'); return; }
  draft.push({ name: n, active: true, memo: '' });
  document.getElementById('newName').value = '';
  renderMembers();
}
function saveMembers() {
  if (!requireLeader()) return;
  api('saveMembers', S.token, draft).then(function (r) { S.members = r.members; draft = null; renderAll(); renderMembers(); toast('팀원 목록을 저장했습니다.'); }).catch(handleAuthError);
}

// ───────────── 설정 ─────────────
function renderSettings() {
  document.getElementById('setTeam').value = S.settings['팀명'] || '';
  document.getElementById('setNotice').value = S.settings['안내문구'] || '';
}
function saveSettings() {
  if (!requireLeader()) return;
  api('saveSettings', S.token, { '팀명': document.getElementById('setTeam').value, '안내문구': document.getElementById('setNotice').value })
    .then(function (r) { S.settings = r.settings; renderAll(); toast('설정을 저장했습니다.'); }).catch(handleAuthError);
}
function changePassword() {
  if (!requireLeader()) return;
  var o = document.getElementById('pwOld').value, n = document.getElementById('pwNew').value, n2 = document.getElementById('pwNew2').value;
  if (n !== n2) { toast('새 비밀번호가 서로 다릅니다.'); return; }
  api('changePassword', S.token, o, n).then(function (r) {
    if (!r.ok) { toast(r.message); return; }
    ['pwOld','pwNew','pwNew2'].forEach(function (id) { document.getElementById(id).value = ''; });
    toast('비밀번호를 변경했습니다.');
  }).catch(handleAuthError);
}

// ───────────── 모달 ─────────────
function openModal(title, body, buttons) {
  var host = document.getElementById('modalHost');
  host.innerHTML = '<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><h3>' + esc(title) + '</h3>' + body + '<div class="actions"></div></div></div>';
  var act = host.querySelector('.actions');
  buttons.filter(Boolean).forEach(function (b) {
    var el = document.createElement('button');
    el.className = 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '');
    el.textContent = b.label;
    if (b.primary) el.style.marginLeft = 'auto';
    el.onclick = function () { if (b.onClick) b.onClick(); if (!b.keep) closeModal(); };
    act.appendChild(el);
  });
}
function closeModal() { document.getElementById('modalHost').innerHTML = ''; }

load();
