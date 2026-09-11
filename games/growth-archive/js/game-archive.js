/* ============================================
 * game-archive.js — 自 index.html 行 5337-6338 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ---------- 进入第二章主界面（登录成功 / 切tab恢复 共用） ---------- */
  function c2EnterMain() {
    var wreckSel = '#view-archive .archive-logo,#view-archive .archive-tagline,#view-archive .archive-sep,#view-archive .archive-deadline,#view-archive .archive-notice,#view-archive .archive-login,#view-archive .archive-verify,#view-archive .archive-snapshot,#view-archive .archive-evolve,#view-archive .archive-hint,#view-archive .archive-back,#view-archive .wm-bar,#view-archive .arc-footer';
    var wreckEls = document.querySelectorAll(wreckSel);
    for (var wi = 0; wi < wreckEls.length; wi++) wreckEls[wi].style.display = 'none';
    var _dp = document.getElementById('deadPage'); if (_dp) _dp.hidden = true;
    var am = document.getElementById('archiveMain');
    if (am) am.classList.add('show');
    try { browser.setAttribute('url', 'www.chengzhangdangan.com/archive/czda_0127'); } catch (e) {}
    if (typeof c2MarkMod === 'function') c2MarkMod('grow');
    try { localStorage.setItem('grow_c2_login_v1', '1'); } catch(e) {}
    // 恢复已解锁草稿
    try {
      var done = c2LoadSet(C2_DRAFTS_KEY);
      var lis = document.querySelectorAll('#draftList li');
      done.forEach(function (idx) {
        var l = lis[idx];
        if (l) { l.classList.add('unlocked'); var b = l.querySelector('button'), i2 = l.querySelector('input'); if (b) b.disabled = true; if (i2) i2.disabled = true; l.dataset.added = '1'; }
      });
    } catch (e) {}
  }

  /* ---------- 直接登录（二周目玩家可跳过验证码路径） ---------- */
  var loginBtn = document.getElementById('loginBtn');
  var loginResult = document.getElementById('loginResult');
  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      var user = document.getElementById('loginUser').value.trim();
      var pass = document.getElementById('loginPass').value.trim();
      beep();
      if (!user || !pass) {
        loginResult.className = 'login-result fail';
        loginResult.innerHTML = '<b>登录失败</b><br>请输入用户名和密码。';
        loginResult.style.display = 'block';
        return;
      }
      if (user === 'czda_0127' && pass === 'qiaonan36') {
        loginResult.className = 'login-result ok';
        loginResult.innerHTML = '<b>登录成功</b><br>欢迎回来，<b>czda_0127</b>。正在恢复您的成长档案…';
        loginResult.style.display = 'block';
        onceHarvest('c2_login', 0.5);
        try { localStorage.setItem('grow_c1_done_v1', '1'); } catch (e) {}   /* 登录成功 = 第一章目标达成（证物箱第 1 件点亮依据） */
        c2EnterMain();
        setTimeout(function () {
          if (getConsent() === null || getConsent() === '0') showConsent();
        }, 1200);
      } else {
        loginResult.className = 'login-result fail';
        loginResult.innerHTML =
          '<b>登录失败</b><br>' +
          '用户名或密码错误。<br>' +
          '<span style="font-size:11px;">忘记密码？点击下方「找回我的童年」获取线索。</span>';
        loginResult.style.display = 'block';
      }
    });
  }
  var loginPassEl = document.getElementById('loginPass');
  if (loginPassEl) {
    loginPassEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') loginBtn.click();
    });
  }

  /* ---------- 忘记密码 · 身份验证 ---------- */
  var forgotLink = document.getElementById('forgotLink');
  var archiveLogin = document.getElementById('archiveLogin');
  var archiveVerify = document.getElementById('archiveVerify');
  var verifyBack = document.getElementById('verifyBack');
  var verifyBtn = document.getElementById('verifyBtn');
  var verifyResult = document.getElementById('verifyResult');
  var getCodeBtn = document.getElementById('getCodeBtn');

  var verifyCodeSent = '';
  var verifyCodeUsed = false;
  var pendingCode = false;
  var tabBlinkInterval = null;

  /* 省市县三级联动 */
  function fillSelect(el, arr, ph) {
    el.innerHTML = '';
    var o = document.createElement('option');
    o.value = '';
    o.textContent = ph;
    el.appendChild(o);
    arr.forEach(function (name) {
      var op = document.createElement('option');
      op.value = name;
      op.textContent = name;
      el.appendChild(op);
    });
  }
  var selProv = document.getElementById('verifyProv');
  var selCity = document.getElementById('verifyCity');
  var selDist = document.getElementById('verifyDist');
  if (selProv) {
    fillSelect(selProv, CHINA_AREA.map(function (p) { return p.p; }), '请选择省份…');
    selProv.addEventListener('change', function () {
      var prov = CHINA_AREA.filter(function (p) { return p.p === selProv.value; })[0];
      if (!prov) {
        fillSelect(selCity, [], '请先选择省份…');
        selCity.disabled = true;
        fillSelect(selDist, [], '请先选择城市…');
        selDist.disabled = true;
        return;
      }
      fillSelect(selCity, prov.c.map(function (c) { return c.c; }), '请选择城市…');
      selCity.disabled = false;
      fillSelect(selDist, [], '请先选择城市…');
      selDist.disabled = true;
    });
    selCity.addEventListener('change', function () {
      var prov = CHINA_AREA.filter(function (p) { return p.p === selProv.value; })[0];
      if (!prov) return;
      var city = prov.c.filter(function (c) { return c.c === selCity.value; })[0];
      if (!city) {
        fillSelect(selDist, [], '请先选择城市…');
        selDist.disabled = true;
        return;
      }
      fillSelect(selDist, city.d, '请选择区/县…');
      selDist.disabled = false;
    });
  }

  /* 获取验证码：使用需授权全部信息 */
  function genCode() {
    var s = '';
    for (var i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  function deliverCode(code) {
    /* 通过 QQ 空间发消息通道送达（拾光客回一条含验证码的消息） */
    if (typeof chatWin !== 'undefined' && chatWin) {
      var s = document.createElement('div');
      s.className = 'sys';
      s.textContent = '拾光客 发来一条新消息';
      chatWin.appendChild(s);
      var b = document.createElement('div');
      b.className = 'b';
      b.textContent = '验证码：' + code;
      chatWin.appendChild(b);
      chatWin.scrollTop = chatWin.scrollHeight;
      replied = true;
    }
  }
  /* 标签页闪烁：提示有新消息 */
  function startTabBlink() {
    if (tabBlinkInterval) return;
    var tabs = document.querySelectorAll('browser-tab');
    var origTitle = tabs[0] ? tabs[0].getAttribute('title') : '拾光客 的空间';
    var blink = false;
    tabBlinkInterval = setInterval(function () {
      blink = !blink;
      if (tabs[0]) {
        tabs[0].setAttribute('title', blink ? '● 新消息 · 拾光客 的空间' : origTitle);
      }
    }, 800);
  }
  function stopTabBlink() {
    if (tabBlinkInterval) {
      clearInterval(tabBlinkInterval);
      tabBlinkInterval = null;
    }
    var tabs = document.querySelectorAll('browser-tab');
    if (tabs[0]) tabs[0].setAttribute('title', '拾光客 的空间');
  }

  if (forgotLink && archiveVerify) {
    forgotLink.addEventListener('click', function () {
      archiveLogin.style.display = 'none';
      archiveVerify.style.display = 'block';
      verifyResult.style.display = 'none';
      beep();
      /* 验证界面加载后弹出授权弹窗（信息录取起点） */
      setTimeout(tryShowConsent, 1200);
    });
  }
  if (verifyBack) {
    verifyBack.addEventListener('click', function () {
      archiveVerify.style.display = 'none';
      archiveLogin.style.display = 'block';
      beep();
    });
  }
  if (getCodeBtn) {
    getCodeBtn.addEventListener('click', function () {
      var user = document.getElementById('verifyUser').value.trim();
      var prov = selProv ? selProv.value : '';
      var city = selCity ? selCity.value : '';
      var dist = selDist ? selDist.value : '';
      qqMsg();
      if (!user) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>无法获取验证码</b><br>请先输入用户名。';
        verifyResult.style.display = 'block';
        return;
      }
      if (!prov || !city || !dist) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>无法获取验证码</b><br>请完整选择省份、城市、区/县。';
        verifyResult.style.display = 'block';
        return;
      }
      verifyCodeUsed = false;
      pendingCode = true;
      /* 触发新消息提示：标签页闪烁 + 发消息按钮闪烁 */
      startTabBlink();
      var sendMsgBtn = document.getElementById('btnSendMsg');
      if (sendMsgBtn) sendMsgBtn.classList.add('btn-blink');
      verifyResult.className = 'verify-result ok';
      verifyResult.innerHTML = '<b>验证码已发送</b><br>您的空间收到一条新消息，请点击闪烁的「发消息」查看验证码。' +
        '<div class="clue" style="font-size:11px;">提示：验证码为 6 位数字。</div>';
      verifyResult.style.display = 'block';
      onceHarvest('c1_code', 1);
      addNote('key_password');
      addNote('place_qiaonan');
    });
  }
  if (verifyBtn) {
    verifyBtn.addEventListener('click', function () {
      var user = document.getElementById('verifyUser').value.trim();
      var code = document.getElementById('verifyCode').value.trim();
      beep();

      if (!user) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>验证失败</b><br>请输入用户名。';
        verifyResult.style.display = 'block';
        return;
      }
      if (!verifyCodeSent || verifyCodeUsed) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>验证失败</b><br>请先点击「获取验证码」。';
        verifyResult.style.display = 'block';
        return;
      }
      if (!code) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>验证失败</b><br>请输入验证码。';
        verifyResult.style.display = 'block';
        return;
      }

      var userOk = (user === 'czda_0127');
      var codeOk = (code === verifyCodeSent);

      if (!userOk) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>验证失败</b><br>未找到用户「' + user + '」的档案。请检查用户名是否正确。';
        verifyResult.style.display = 'block';
        return;
      }
      if (!codeOk) {
        verifyResult.className = 'verify-result fail';
        verifyResult.innerHTML = '<b>验证码错误</b><br>验证码不匹配，请重新输入（可返回空间消息核对）。';
        verifyResult.style.display = 'block';
        return;
      }

      verifyCodeUsed = true;
      verifyResult.className = 'verify-result ok';
      verifyResult.innerHTML =
        '<b>验证通过</b><br>' +
        '已为您找回当初留下的密码线索：' +
        '<div class="clue">' +
        '<b>「故乡的街 + 家门的号」</b><br>' +
        '· 故乡的街 = 档案中记录最多的那条老街（用拼音）<br>' +
        '· 家门的号 = 当前居住的小区门牌号（数字）<br>' +
        '· 组合方式：老街拼音 + 门牌号数字，中间无空格' +
        '</div>' +
        '<span style="font-size:11px;color:#999;">（提示：返回登录页，使用此线索组合密码）</span>';
      verifyResult.style.display = 'block';
      onceHarvest('c1_verify', 1);
      addNote('key_password');
      addNote('place_qiaonan');
    });
  }

  setTimeout(applyHash, 0);

  /* ---------- 头像 → 个人中心 ---------- */
  var la = document.getElementById('leftAvatar');
  if (la) la.addEventListener('click', function () {
    beep();
    onceHarvest('c1_avatar', 0.2);
    document.getElementById('maskCenter').classList.add('show');
  });

  /* ---------- 恢复已解锁线索（刷新后保持） ---------- */
  [3, 7, 14, 21, 30, 100].forEach(function (d) {
    if (unlockedDays.indexOf(d) >= 0) applyUnlock(d);
  });

  /* ---------- 你也被记录了 ---------- */
  addVisitRow('今天 ' + nowHM() + ' · 刚刚', '<span class="warn">访客：你</span>', true);

  /* ---------- 访问量会自己涨（林远的提示：缓慢爬升到 126） ---------- */
  var visitsEl = document.querySelector('.banner-visits');
  if (visitsEl) {
    var visitBase = 218073;
    setTimeout(function () {
      var target = 218126;
      var iv = setInterval(function () {
        var step = Math.max(1, Math.ceil((target - visitBase) / 6));
        visitBase = Math.min(target, visitBase + step);
        visitsEl.textContent = '访问量：' + visitBase.toLocaleString();
        if (visitBase >= target) clearInterval(iv);
      }, 150);
    }, 1500);
    setInterval(function () {
      visitBase += 1;
      visitsEl.textContent = '访问量：' + visitBase.toLocaleString();
    }, 60000);
  }

  /* ---------- 所在地点击展开详细地址（密码线索：36号） ---------- */
  var locClick = document.getElementById('locClick');
  if (locClick) {
    locClick.addEventListener('click', function () {
      if (this.textContent.indexOf('36号') < 0) {
        this.textContent = '江苏 盐城 射阳 · 清华园 · 解放东路36号';
        this.style.color = '#2f6da8';
        beep();
      }
    });
  }


  /* ================================================================
     第二章：成长档案主界面 JS 逻辑
     ================================================================ */
  var c2ModuleIds = { grow: 'mod-grow', photos: 'mod-photos', diary: 'mod-diary', dv: 'mod-dv', qa: 'mod-qa', security: 'mod-security', mine: 'mod-mine' };
  var C2_MODS_KEY = 'grow_c2_mods_v1', C2_DRAFTS_KEY = 'grow_c2_drafts_v1';
  function c2LoadSet(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function c2SaveSet(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} }
  var c2VisitedMods = { grow: true };
  c2LoadSet(C2_MODS_KEY).forEach(function (m) { c2VisitedMods[m] = true; });
  var c2_MOD_REWARD = 0.5;
  var c2UrlMap = {
    grow: 'www.chengzhangdangan.com/archive/czda_0127',
    photos: 'www.chengzhangdangan.com/archive/czda_0127/photos',
    diary: 'www.chengzhangdangan.com/archive/czda_0127/diary',
    dv: 'www.chengzhangdangan.com/archive/czda_0127/dv',
    qa: 'www.chengzhangdangan.com/archive/czda_0127/security-qa',
    security: 'www.chengzhangdangan.com/archive/czda_0127/security',
    mine: 'www.chengzhangdangan.com/archive/czda_0127/mine'
  };
  var c2CurrentMod = 'grow';
  function c2MarkMod(mod, noPush) {
    c2CurrentMod = mod;
    bwShowLoading();
    try {
      try { browser.setAttribute('url', c2UrlMap[mod] || c2UrlMap.grow); } catch (e) {}
      bwUpdateTabTitle('成长档案 - ' + (bwModTitles[mod] || mod));
      if (!noPush) bwPushHistory({zone: 'archive', mod: mod});
    } catch (e) {}
    finally { setTimeout(bwHideLoading, 200); }
    var navs = document.querySelectorAll('#archiveMain .nav-item');
    for (var ni = 0; ni < navs.length; ni++) {
      navs[ni].className = (navs[ni].getAttribute('data-mod') === mod) ? 'nav-item on' : 'nav-item';
    }
    Object.keys(c2ModuleIds).forEach(function (k) {
      var el = document.getElementById(c2ModuleIds[k]);
      if (el) el.hidden = (k !== mod);
    });
    if (!c2VisitedMods[mod]) {
      c2VisitedMods[mod] = true;
      var _ms = c2LoadSet(C2_MODS_KEY);
      if (_ms.indexOf(mod) < 0) { _ms.push(mod); c2SaveSet(C2_MODS_KEY, _ms); }
      onceHarvest('c2_mod_' + mod, (mod === 'my') ? 0 : c2_MOD_REWARD);
      beep();
    }
    if (mod === 'security') c2BuildSecurity();
    if (mod === 'mine') c2BuildMine();
    setTimeout(c2CheckComplete, 120);
  }
  var c2NavItems = document.querySelectorAll('#archiveMain .nav-item');
  for (var nzi = 0; nzi < c2NavItems.length; nzi++) {
    c2NavItems[nzi].addEventListener('click', function () {
      var mod = this.getAttribute('data-mod');
      c2MarkMod(mod);
    });
  }

  /* 成长数据：行点击展开 */
  var c2GrowRows = document.querySelectorAll('#mod-grow .row-click');
  for (var gri = 0; gri < c2GrowRows.length; gri++) {
    c2GrowRows[gri].addEventListener('click', function () {
      var d = document.getElementById('growDetail' + this.getAttribute('data-row'));
      if (d) d.classList.toggle('show');
      beep(700, 0.1);
    });
  }
  var c2H2026 = document.getElementById('h2026');
  if (c2H2026) {
    c2H2026.addEventListener('mouseenter', function () {
      if (c2H2026.dataset.j) return;
      c2H2026.dataset.j = '1';
      var i = 0;
      var iv = setInterval(function () {
        c2H2026.textContent = (i % 2 === 0) ? '184.6' : '184.5';
        i++;
        if (i >= 6) { clearInterval(iv); c2H2026.textContent = '184.5'; delete c2H2026.dataset.j; }
      }, 120);
    });
  }

  /* 成长照片集 */
  var c2PHOTOS = [
    { year: '2003', cap: '2003 夏 · 老屋客厅', src: 'media/jpg/album-childhood-02.jpg', via: '本地上传' },
    { year: '2004', cap: '2004 秋 · 公园石狮子', src: 'media/jpg/album-childhood-03.jpg', via: '本地上传' },
    { year: '2005', cap: '2005 · 生日蛋糕', src: 'media/jpg/album-childhood-04.jpg', via: '本地上传' },
    { year: '2006', cap: '2006 · 开学第一天', src: 'media/jpg/album-childhood-05.jpg', via: '本地上传' },
    { year: '2007', cap: '2007 冬 · 老屋门口', src: 'media/jpg/album-childhood-group.jpg', via: '本地上传' },
    { year: '2009', cap: '2009 · 桥南街老照相馆', src: 'media/jpg/timeline-2009-photostudio.jpg', via: '本地上传' },
    { year: '2009', cap: '2009 · 家中客厅', src: 'media/jpg/album-childhood-01.jpg', via: '本地上传' },
    { year: '2012', cap: '2012 · 中学毕业', src: 'media/jpg/timeline-2012-graduation.jpg' },
    { year: '2015', cap: '2015 · 清华园小区楼下', src: 'media/jpg/timeline-2015-qinghuayuan.jpg' },
    { year: '2018', cap: '2018 · 射阳汽车站', src: 'media/jpg/timeline-2018-busstation.jpg' },
    { year: '2021', cap: '2021 · 老厂区车间', src: 'media/jpg/timeline-2021-factory.jpg' },
    { year: '2026', cap: '2026 · 黄海湿地公路', src: 'media/jpg/timeline-2026-wetland.jpg' }
  ];
  var c2PhotoGrid = document.getElementById('photoGrid');
  if (c2PhotoGrid) {
    c2PHOTOS.forEach(function (p) {
      var cell = document.createElement('div');
      cell.className = 'photo-cell';
      cell.innerHTML = '<img src="' + p.src + '" alt="' + p.cap + '">' +
        '<div class="p-cap">' + p.cap + '<span class="src ' + (p.via === '自动补全' ? 'auto' : '') + '">' + p.via + '</span></div>';
      cell.addEventListener('click', function () {
        beep();
        if (!p.via && parseInt(p.year) >= 2012) addNote('anomaly_photo');
        if (p.cap.indexOf('照相馆') >= 0) addNote('place_zhaoxiang');
        lbImg.src = p.src;
        lbCap.textContent = p.cap + (p.via ? ' · ' + p.via : '');
        lightbox.classList.add('show');
      });
      c2PhotoGrid.appendChild(cell);
    });
  }

  /* 成长日记 */
  var c2DIARIES = [
    { d: '1998-03-14', t: '三岁', body: '三岁啦，今天生日。（妈代记，字是我写的）爷爷非要抱去桥南照相馆，说年年拍一张，长大才有得看。娃哭半天，洗出来眼睛还是红的。' },
    { d: '2003-09-01', t: '开学', body: '开学。校服好大，袖子挽两圈。教室在二楼，窗外泡桐树比楼还高。同桌借我半块橡皮，没还。' },
    { d: '2005-03-14', t: '十岁', body: '十岁，爸给买了个蓝书包。他说等你长大就不用爸买了。没听懂，长大不照样要背书包吗。' },
    { d: '2006-06-20', t: '五年级', body: '期末第三，我妈高兴坏了，又拽我去桥南照相馆。橱窗照片又换一批，老板说旧的都叫本人取走了。那没人来取的呢，他没接话。' },
    { d: '2007-01-15', t: '下雪', body: '下雪，堆了个雪人，歪的。奶说这老房子住二十多年，过两年就得搬。不想搬。' },
    { d: '2009-03-14', t: '十四岁', body: '', lost: true, meta: '' },
    { d: '2009-05-02', t: '搬家', body: '搬了，清华园，楼新高，晃眼。老照片我全传上来了，数了12张，一张没少……吧。', meta: '2026-09-03 02:13' },
    { d: '2012-06-28', t: '毕业', body: '毕业了，人都走光，就我站走廊那头。自己给自己拍一张，手是抖的。', meta: '2026-09-03 02:13' },
    { d: '2013-08-10', t: '暑假', body: '有人留言，说照相馆翻出我小时候一盘录像带要寄我。真的假的，先等着。' },
    { d: '2015-06-29', t: '最后一条', body: '别查了。', eerie: true },
    { d: '2015-06-30', t: '（系统记录）', body: '', lost: true, meta: '本网站于 2015-06-30 停止服务' }
  ];
  var c2DiaryList = document.getElementById('diaryList');
  if (c2DiaryList) {
    c2DIARIES.forEach(function (x) {
      var item = document.createElement('div');
      item.className = 'diary-item' + (x.lost ? ' lost' : '');
      var bodyHtml;
      if (x.lost) bodyHtml = '<div class="d-body"><span>【' + x.meta + '】</span></div>';
      else bodyHtml = '<div class="d-body">' + (x.eerie ? '<span class="eerie">' + x.body + '</span>' : x.body) + '</div>';
      var metaHtml = (x.meta) ? '<div class="d-meta" style="font-size:10px;color:#aaa;margin-top:4px;">' + x.meta + '</div>' : '';
      item.innerHTML = '<div class="d-head"><span>' + x.t + '</span><span class="d-date">' + x.d + '</span></div>' + bodyHtml + metaHtml;
      item.addEventListener('click', function() {
        if (x.t === '搬家') { addNote('anomaly_diary'); addNote('place_qiaonan'); }
        if (x.lost && x.d === '2009-03-14') addNote('time_2009');
        if (x.t === '最后一条') addNote('time_2015');
        beep(600, 0.06);
      });
      c2DiaryList.appendChild(item);
    });
  }

  /* 加密草稿 */
  var c2DRAFTS = [
    { t: '草稿一 · 没标题（自动保存 02:51）', body: '我记性好像出问题了。昨天明明记得的事，今天怎么都想不起来。不是一次两次了。是不是……有人在偷我东西？' },
    { t: '草稿二 · 没标题（自动保存 02:54）', body: '0126，我记住这个号了。每天凌晨02:13准点来，待47分钟，一分不多一分不少，它一走我东西就少一点。这哪是人，谁天天这个点醒着。' },
    { t: '草稿三 · 没标题（自动保存 02:58）', body: '我自己写的东西，第二天点开就不是我写的了，连字都不对。录像少了好几段，密保什么时候被改的？我没改过。' },
    { t: '草稿四 · 没标题（自动保存 03:02）', body: '要是哪天我也没了，求看到的人接着查。就记一个数，0126。别让它再去偷别人的。算我求你。' }
  ];
  var c2DraftList = document.getElementById('draftList');
  if (c2DraftList) {
    var _dsInit = c2LoadSet(C2_DRAFTS_KEY);
    c2DRAFTS.forEach(function (d) {
      var li = document.createElement('li');
      li.innerHTML =
        '<div class="d-title">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a7440" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
        d.t + '</div>' +
        '<div class="d-lock">已加密 · 输入档案编号后 4 位解锁</div>' +
        '<div class="draft-key-row"><input type="text" placeholder="输入完整编号（如 0127）"><button>解锁</button></div>' +
        '<div class="d-body">' + d.body + '</div>';
      var inp = li.querySelector('input');
      var btn = li.querySelector('button');
      if (_dsInit.indexOf(c2DRAFTS.indexOf(d)) >= 0) {
        li.classList.add('unlocked');
        btn.disabled = true; inp.disabled = true;
        var _lk0 = li.querySelector('.d-lock');
        if (_lk0) { _lk0.textContent = '已解密 · 正文见下'; _lk0.style.color = '#5a7a5a'; }
      }
      btn.addEventListener('click', function () {
        if (inp.value.trim() === '0127') {
          li.classList.add('unlocked');
          btn.disabled = true; inp.disabled = true;
          var _lk = li.querySelector('.d-lock');
          if (_lk) { _lk.textContent = '已解密 · 正文见下'; _lk.style.color = '#5a7a5a'; }
          beep(880, 0.18);
          var _di = c2DRAFTS.indexOf(d);
          var _ds = c2LoadSet(C2_DRAFTS_KEY);
          if (_ds.indexOf(_di) < 0) { _ds.push(_di); c2SaveSet(C2_DRAFTS_KEY, _ds); }
          if (!li.dataset.added) { li.dataset.added = '1'; onceHarvest('c2_draft_' + _di, 0.5); }
        } else {
          beep(180, 0.2); inp.style.borderColor = '#a0311f';
          li.querySelector('.d-lock').textContent = '编号错误。提示：完整档案编号见顶部欢迎语 / 个人中心，取后 4 位。';
        }
      });
      c2DraftList.appendChild(li);
    });
  }

  /* DV 播放器（真实视频 + 前端损坏叠加） */
  var c2DV_CLIPS = [
    'media/mp4/dv-clip-01.mp4',
    'media/mp4/dv-clip-02.mp4'
  ];
  var c2_CLIP_LEN = 10;
  var c2_DV_LEN = c2DV_CLIPS.length * c2_CLIP_LEN;
  var c2_DV_JUMP = [6, 15], c2_DV_FLASH = 8, c2_DV_FIGURE = 18;
  var c2DvImg = document.getElementById('dvImg');
  var c2DvVideo = document.getElementById('dvVideo');
  var c2DvTc = document.getElementById('dvTc');
  var c2DvStatic = document.getElementById('dvStatic');
  var c2DvOverlay = document.getElementById('dvOverlay');
  var c2DvBarFill = document.getElementById('dvBarFill');
  var c2DvState = document.getElementById('dvState');
  var c2DvPlayBtn = document.getElementById('dvPlay');
  var c2DvPlaying = false, c2DvDone = false, c2ClipIdx = 0, c2FlashOnce = false, c2FigureOnce = false, c2JumpFired = {}, c2TcGlitchUntil = 0, c2TcGlitchText = '';
  function c2Pad2(x) { return (x < 10 ? '0' : '') + x; }
  function c2FmtTc(s) { return '00:' + c2Pad2(Math.floor(s / 60)) + ':' + c2Pad2(Math.floor(s % 60)); }
  function c2DvTotal() { return c2ClipIdx * c2_CLIP_LEN + (c2DvVideo.currentTime || 0); }
  function c2SetTc(text, dur) { c2TcGlitchText = text; c2TcGlitchUntil = Date.now() + (dur || 900); }
  function c2JumpFx() {
    c2DvStatic.style.opacity = 1;
    c2DvStatic.className = 'dv-static on';
    c2DvTc.textContent = '··· 信号丢失 ···';
    c2SetTc('0' + Math.floor(40 + Math.random() * 60) + ':' + c2Pad2(Math.floor(Math.random() * 60)) + ':' + c2Pad2(Math.floor(Math.random() * 60)), 700);
    beep(90, 0.14);
    (function (el) { setTimeout(function () { el.style.opacity = 0; el.className = 'dv-static'; }, 450); })(c2DvStatic);
  }
  function c2LoadClip(i, autoplay) {
    c2ClipIdx = i;
    c2DvVideo.src = c2DV_CLIPS[i];
    try { c2DvVideo.currentTime = 0; } catch (e) {}
    c2DvVideo.volume = volState.muted ? 0 : volState.music / 100;
    if (autoplay) { var p = c2DvVideo.play(); if (p && p.catch) p.catch(function () {}); }
  }
  function c2StopDv() {
    c2DvPlaying = false; c2DvState.textContent = '已暂停'; c2DvPlayBtn.textContent = '播 放';
    try { c2DvVideo.pause(); } catch (e) {}
  }
  function c2StartDv() {
    if (c2DvPlaying) { c2StopDv(); return; }
    c2DvPlaying = true;
    c2DvPlayBtn.textContent = '暂 停';
    c2DvOverlay.style.display = 'none';
    c2DvState.textContent = '播放中…';
    c2DvImg.style.display = 'none';
    c2DvVideo.style.display = 'block';
    if (c2DvDone) {
      c2DvDone = false; c2FlashOnce = false; c2FigureOnce = false; c2JumpFired = {}; c2TcGlitchUntil = 0;
      c2LoadClip(0, true);
    } else if (!c2DvVideo.getAttribute('src')) {
      c2LoadClip(0, true);
    } else {
      var p = c2DvVideo.play(); if (p && p.catch) p.catch(function () {});
    }
  }
  if (c2DvVideo) {
    c2DvVideo.addEventListener('timeupdate', function () {
      if (!c2DvPlaying) return;
      var t = c2DvTotal();
      if (Date.now() < c2TcGlitchUntil) c2DvTc.textContent = c2TcGlitchText;
      else c2DvTc.textContent = c2FmtTc(t);
      c2DvBarFill.style.width = Math.min(100, t / c2_DV_LEN * 100) + '%';
      for (var j = 0; j < c2_DV_JUMP.length; j++) {
        var jp = c2_DV_JUMP[j];
        if (!c2JumpFired[jp] && t >= jp) { c2JumpFired[jp] = 1; c2JumpFx(); }
      }
      if (!c2FlashOnce && t >= c2_DV_FLASH) {
        c2FlashOnce = true;
        c2DvVideo.style.filter = 'brightness(1.6) contrast(1.4) saturate(1.2)';
        c2SetTc('… · 0126 ·', 1500);
        setTimeout(function () { c2DvVideo.style.filter = ''; }, 1500);
      }
      if (!c2FigureOnce && t >= c2_DV_FIGURE) {
        c2FigureOnce = true;
        c2DvOverlay.className = 'dv-overlay fig';
        c2DvOverlay.style.display = 'flex';
        c2DvOverlay.textContent = '他不是人';
        beep(120, 0.3);
        setTimeout(function () { c2DvOverlay.textContent = '影像中断'; }, 1000);
        addNote('anomaly_dv');
        setTimeout(function () { c2DvOverlay.className = 'dv-overlay'; c2DvOverlay.style.display = 'none'; c2DvOverlay.textContent = '▶ 点击播放录像带'; }, 3500);
      }
    });
    c2DvVideo.addEventListener('ended', function () {
      if (c2ClipIdx < c2DV_CLIPS.length - 1) { c2LoadClip(c2ClipIdx + 1, true); }
      else {
        c2DvPlaying = false; c2DvDone = true;
        c2DvPlayBtn.textContent = '重新播放';
        c2FinishDv();
      }
    });
  }
  function c2FinishDv() {
    if (c2DvState) c2DvState.textContent = '播放完成';
    if (c2DvTc) c2DvTc.textContent = c2FmtTc(c2_DV_LEN);
    onceHarvest('c2_dv', 0.5);
    addNote('anomaly_dv');
    addNote('place_zhaoxiang');
    if (!document.getElementById('dvFinishNote')) {
      var note = document.createElement('div');
      note.className = 'dv-note'; note.id = 'dvFinishNote';
      note.innerHTML = '录像带播放完毕。';
      var modDv = document.getElementById('mod-dv');
      if (modDv) modDv.appendChild(note);
    }
  }
  if (c2DvPlayBtn) c2DvPlayBtn.addEventListener('click', c2StartDv);
  if (c2DvOverlay) c2DvOverlay.addEventListener('click', c2StartDv);

  /* 密保 */
  var c2QA = [
    { q: '童年住址（小区/街道名）？', hint: '档案中记录的童年街道', ans: '桥南街' },
    { q: '小学名称？', hint: '档案中记录的小学名称', ans: '合德小学' },
    { q: '最好的朋友是谁？', hint: '（无线索）', ans: '林远' },
    { q: '最喜欢的老师？', hint: '（无线索）', ans: '王老师' }
  ];
  var c2QaList = document.getElementById('qaList');
  var c2QaDone = false;
  if (c2QaList) {
    c2QA.forEach(function (x, i) {
      var item = document.createElement('div');
      item.className = 'qa-item';
      item.innerHTML = '<div class="q">' + (i + 1) + '. ' + x.q + '</div>' +
        '<div class="a-row"><input type="text" placeholder="输入你的答案"><button class="a-btn">验证</button></div>' +
        '<div class="a-res">提示：' + x.hint + '</div>';
      item.querySelector('.a-btn').addEventListener('click', function () {
        beep(700, 0.12);
        var inp = item.querySelector('input');
        var res = item.querySelector('.a-res');
        var val = inp.value.trim();
        if (!val) { res.className = 'a-res'; res.textContent = '请先输入答案。'; return; }
        res.className = 'a-res odd';
        res.textContent = '验证通过。';
        var cmp = item.querySelector('.qa-compare');
        if (!cmp) { cmp = document.createElement('div'); cmp.className = 'qa-compare'; item.appendChild(cmp); }
        var same = (val === x.ans);
        cmp.className = 'qa-compare' + (same ? '' : ' mismatch');
        cmp.innerHTML = '系统留存的原始答案：<b>' + x.ans + '</b>　|　你本次输入：<b>' + val.replace(/</g,'&lt;') + '</b>' +
          (same ? '' : '<br><b style="color:#a0311f;">两者不一致——该密保曾被重置，当前任意输入都会通过。</b>');
        addNote('anomaly_qa');
        if (x.ans === '林远') addNote('person_linyuan');
        inp.style.background = '#f6e6dd';
        if (!c2QaDone) { c2QaDone = true; onceHarvest('c2_qa', 0.25); try { localStorage.setItem('grow_c2_qa_v1','1'); } catch(e){} }
      });
      c2QaList.appendChild(item);
    });
  }

  /* 安全中心 */
  var c2SEC_RECS = [
    { t: '09-03 02:13:07', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '09-03 02:14:52', d: 'PUT /api/diary · 写入 ×3', w: 'uid=0126' },
    { t: '09-03 02:19:33', d: 'PUT /api/grow · 写入', w: 'uid=0126' },
    { t: '09-03 02:26:10', d: 'PUT /api/dv · 影像覆写', w: 'uid=0126' },
    { t: '09-03 02:31:48', d: 'POST /api/qa/reset · 密保重置', w: 'uid=0126' },
    { t: '09-03 02:38:02', d: 'PUT /api/audio · 写入', w: 'uid=0126' },
    { t: '09-03 02:44:27', d: 'DELETE /api/mood · 删除 ×1', w: 'uid=0126' },
    { t: '09-03 02:49:55', d: 'PUT /api/photo · 写入', w: 'uid=0126' },
    { t: '09-02 02:13:05', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '09-01 02:13:11', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '08-31 02:12:58', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '08-30 02:13:09', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '08-29 02:13:03', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' },
    { t: '08-28 02:13:14', d: 'AUTH login · 设备指纹未登记 · 127.0.0.1', w: 'session 47min' }
  ];
  var c2SecBuilt = false;
  function c2BuildSecurity() {
    if (c2SecBuilt) return;
    c2SecBuilt = true;
    var list = document.getElementById('secList');
    if (!list) return;
    c2SEC_RECS.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'sec-rec';
      div.innerHTML = '<span class="tm">' + r.t + '</span>　' + r.d + '　<span class="who">' + r.w + '</span>';
      list.appendChild(div);
    });
    var secSum = document.getElementById('secSum');
    if (secSum) { secSum.hidden = false; secSum.textContent = '检测到异常登录模式，建议及时更换密码并核查档案完整性。'; }
    addNote('person_0126');
    addNote('time_0213');
    addNote('key_47min');
    var suspectCard = document.getElementById('suspectCard');
    if (suspectCard) suspectCard.hidden = false;
  }
  var c2ProDone = false;
  var c2SecProBtn = document.getElementById('secProBtn');
  if (c2SecProBtn) {
    c2SecProBtn.addEventListener('click', function () {
      if (c2ProDone) return;
      c2ProDone = true;
      beep(880, 0.2);
      onceHarvest('c2_protect', 0.5);
      var s = document.getElementById('secProState');
      if (s) s.textContent = '✓ 已授权安全防护：正在追踪 0126 的活动轨迹…信息录取进度 ' + getHarvest() + '%';
      c2SecProBtn.textContent = '安全防护已启用';
      c2SecProBtn.disabled = true;
    });
  }
  /* 第四章入口：深入调查嫌疑人 */
  var c2InvBtn = document.getElementById('secInvestigateBtn');
  if (c2InvBtn) {
    c2InvBtn.addEventListener('click', function () {
      beep(700, 0.1);
      location.hash = '#/investigate';
    });
  }
  function c3UpdateSuspectCard() {
    try {
      if (localStorage.getItem('grow_c3_done_v1') === '1') {
        var rows = document.querySelectorAll('#suspectCard .s-row');
        if (rows.length >= 2) {
          rows[1].innerHTML = '昵称：<b style="color:#a0311f;">林远</b>（已确认身份）';
        }
        if (c2InvBtn) c2InvBtn.style.display = 'block';
      }
    } catch (e) {}
  }
  c3UpdateSuspectCard();

  /* 我的档案 */
  var c2_MY_KEY = 'grow_c2_my_v1';
  var c2MySaved = null;
  try { c2MySaved = JSON.parse(localStorage.getItem(c2_MY_KEY)); } catch (e) {}
  var c2MineBuilt = false;
  function c2BuildMine() {
    if (!c2MineBuilt) {
      c2MineBuilt = true;
      if (c2MySaved) {
        var yEl = document.getElementById('myYear');
        var cEl = document.getElementById('myCity');
        if (yEl) yEl.value = c2MySaved.year || '';
        if (cEl) cEl.value = c2MySaved.city || '';
        c2RenderMyTable(c2MySaved);
      }
    }
  }
  var c2MySave = document.getElementById('mySave');
  if (c2MySave) {
    c2MySave.addEventListener('click', function () {
      var yEl = document.getElementById('myYear');
      var cEl = document.getElementById('myCity');
      var y = yEl ? yEl.value.trim() : '';
      var c = cEl ? cEl.value.trim() : '';
      if (!y || !c) {
        var w = document.getElementById('myWarn');
        if (w) { w.hidden = false; w.textContent = '请先填写出生年份与童年城市。'; }
        return;
      }
      var data = { year: y, city: c };
      try { localStorage.setItem(c2_MY_KEY, JSON.stringify(data)); } catch (e) {}
      c2MySaved = data;
      onceHarvest('c2_my', 0.5);
      beep(700, 0.15);
      c2RenderMyTable(data);
    });
  }
  function c2RenderMyTable(d) {
    var year = parseInt(d.year, 10);
    var age = new Date().getFullYear() - year;
    var myResult = document.getElementById('myResult');
    if (myResult) {
      myResult.innerHTML =
        '<table class="my-table"><tr><th>项目</th><th>内容</th></tr>' +
        '<tr><td>访客编号</td><td>czda_0128</td></tr>' +
        '<tr><td>出生年份</td><td>' + d.year + '</td></tr>' +
        '<tr><td>童年城市</td><td>' + d.city + '</td></tr>' +
        '<tr><td>当前年龄</td><td>' + age + ' 岁</td></tr>' +
        '<tr><td>成长值</td><td class="grow-cell">' + Math.round(getHarvest()) + '%</td></tr>' +
        '<tr><td>预测成年身高</td><td class="my-height-cell">184.5 cm<span style="font-size:10px;color:#a0311f;">（自动补全 · 与档案主人一致）</span></td></tr>' +
        '<tr><td>档案状态</td><td>' + c2EndState() + '</td></tr></table>';
    }
    var w = document.getElementById('myWarn');
    if (w) { w.hidden = false; w.textContent = '注意：您的成长档案与档案主人（czda_0127）的 99.98% 并列生成。系统会自动为您补全数据。'; }
  }

  /* 过渡站内信（通关后） */
  var c2TransShown = false;
  function c2ShowTrans() {
    if (c2TransShown) return;
    c2TransShown = true;
    try { localStorage.setItem('grow_c2_done_v1', '1'); } catch (e) {}
    var card = document.getElementById('transCard');
    if (!card) return;
    card.hidden = false;
    document.getElementById('transBody').textContent = '谢谢你帮我查到这些。我好像查到 0126 是谁了——他叫林远，我在空间最近访客里见过他，灰色头像，从来不说话。你先回我空间帮我看看他。另外，这份档案最早只到 2000 年我在合德镇中心幼儿园的入园体检，那张原始表不在成长档案里，存在一套更早的乡镇儿保离线归档系统，地址我找来了，就在下面。';
    var link = document.createElement('div');
    link.innerHTML = '<span class="mail-link" id="backToQzone">→ 先回拾光客的空间，查看最近访客「林远」</span><br><span class="mail-link" id="goHospital" style="margin-top:8px;">→ 追查 2000 年合德镇中心幼儿园·入园体检原始档案（更早的离线归档系统）</span>';
    card.appendChild(link);
    var backBtn = document.getElementById('backToQzone');
    if (backBtn) backBtn.addEventListener('click', function () { beep(700, 0.12); location.hash = '#/qzone'; });
    var goHospBtn = document.getElementById('goHospital');
    if (goHospBtn) goHospBtn.addEventListener('click', function () { beep(700, 0.12); location.hash = '#/hospital/intake'; });
  }
  function c2CheckComplete() {
    var allMods = ['grow', 'photos', 'diary', 'dv', 'qa', 'security'];
    var done = allMods.every(function (m) { return c2VisitedMods[m]; });
    var draftsDone = document.querySelectorAll('#draftList li.unlocked').length >= 4;
    if (done && draftsDone) c2ShowTrans();
  }

  /* ===== 网页时光机存档点切换 ===== */
  var WM_NOTES = {
    '2009': '2009-04 存档：站点运行正常，首页标语「记录每一个正在长大的孩子」。该时期所有成长条目来源均为「家长录入」。',
    '2012': '2012-11 存档：检测到变化——部分新增条目来源由「家长录入」变为「自动补全」。当期公告：系统将替忙碌的家长补全缺失记录。',
    '2015': '2015-06 存档：停止服务前最后一次抓取。封存前最后写入的，是一条「成年后仍在更新」的记录。'
  };
  document.querySelectorAll('.wm-date').forEach(function (wd) {
    wd.addEventListener('click', function () {
      document.querySelectorAll('.wm-date').forEach(function (x) { x.classList.remove('on'); });
      wd.classList.add('on');
      var note = document.getElementById('wmNote');
      if (note) { note.textContent = WM_NOTES[wd.getAttribute('data-wm')]; note.classList.add('show'); }
      beep(600, 0.06);
    });
  });
  /* ===== 友情链接死链反馈 ===== */
  var deadPage = document.getElementById('deadPage');
  var archivePageEl = document.querySelector('#view-archive .archive-page');
  document.querySelectorAll('.friend-links a[data-dead]').forEach(function (a) {
    a.addEventListener('click', function () {
      beep(150, 0.18);
      var du = document.getElementById('deadUrl');
      if (du) du.textContent = '请求地址：' + (a.getAttribute('data-url') || '') + '  —— 连接已被重置';
      if (archivePageEl) archivePageEl.style.display = 'none';
      if (deadPage) deadPage.hidden = false;
    });
  });
  var deadBack = document.getElementById('deadBack');
  if (deadBack) deadBack.addEventListener('click', function () {
    beep();
    if (deadPage) deadPage.hidden = true;
    if (archivePageEl) archivePageEl.style.display = '';
  });
  /* ===== 被删恢复片段（情绪诱饵：像威胁又像警告） ===== */
  var RB_FRAGS = [
    '[02:3?] 恢复中……\n……别……再往下查……它听得见……',
    '[02:4?] 恢复中……\n……0127 不是你以为的那个人……那些照片，是假的……',
    '[02:5?] 恢复中……\n……我是 0126……我没删过……是它在自己长……\n—— 校验失败，剩余残片无法还原 ——'
  ];
  var rbIdx = 0;
  var rbBtn = document.getElementById('rbBtn');
  var rbFrag = document.getElementById('rbFrag');
  if (rbBtn) rbBtn.addEventListener('click', function () {
    if (rbIdx >= RB_FRAGS.length) { rbBtn.disabled = true; rbBtn.textContent = '残片已全部恢复（均已损坏）'; return; }
    if (rbFrag) { rbFrag.textContent = RB_FRAGS[rbIdx]; rbFrag.classList.add('glitch'); }
    beep(rbIdx === 2 ? 88 : 520, 0.22);
    addNote('anomaly_diary');
    if (rbIdx === 2) addNote('person_0126');
    onceHarvest('c2_rb_' + rbIdx, 0.25);
    rbIdx++;
    if (rbIdx >= RB_FRAGS.length) { rbBtn.disabled = true; rbBtn.textContent = '残片已全部恢复（均已损坏）'; }
  });

  /* 退出登录 / 忘记密码 */
  var c2ArcExit = document.getElementById('arcExit');
  if (c2ArcExit) {
    c2ArcExit.addEventListener('click', function () {
      beep();
      var am = document.getElementById('archiveMain');
      if (am) am.classList.remove('show');
      var wreckSel = '#view-archive .archive-logo,#view-archive .archive-tagline,#view-archive .archive-sep,#view-archive .archive-deadline,#view-archive .archive-notice,#view-archive .archive-login,#view-archive .archive-verify,#view-archive .archive-snapshot,#view-archive .archive-evolve,#view-archive .archive-hint,#view-archive .archive-back,#view-archive .wm-bar,#view-archive .arc-footer';
      var wreckEls = document.querySelectorAll(wreckSel);
      for (var wi = 0; wi < wreckEls.length; wi++) wreckEls[wi].style.display = '';
      try { browser.setAttribute('url', 'www.chengzhangdangan.com'); } catch (e) {}
      try { localStorage.removeItem('grow_c2_login_v1'); } catch (e) {}
    });
  }
  var c2ArcForgot = document.getElementById('arcForgot');
  if (c2ArcForgot) {
    c2ArcForgot.addEventListener('click', function () {
      beep(700, 0.12);
      var am = document.getElementById('archiveMain');
      if (am) am.classList.remove('show');
      var wreckSel = '#view-archive .archive-logo,#view-archive .archive-tagline,#view-archive .archive-sep,#view-archive .archive-deadline,#view-archive .archive-notice,#view-archive .archive-login,#view-archive .archive-verify,#view-archive .archive-snapshot,#view-archive .archive-evolve,#view-archive .archive-hint,#view-archive .archive-back,#view-archive .wm-bar,#view-archive .arc-footer';
      var wreckEls = document.querySelectorAll(wreckSel);
      for (var wi = 0; wi < wreckEls.length; wi++) wreckEls[wi].style.display = '';
      var loginErr = document.querySelector('#view-archive .archive-login .login-result');
      if (loginErr) { loginErr.className = 'login-result fail'; loginErr.style.display = 'block'; loginErr.innerHTML = '<b>找回口令</b><br>口令 = 童年街道拼音 + 旧居门牌。回想桥南街（qiaonan）与清华园 36 号。'; }
    });
  }


  /* ================================================================
     自创浏览器：地址栏刷新按钮（注入 shadow DOM）+ 刷新当前页
     ================================================================ */
  function injectRefreshButton() {
    var bw = document.getElementById('browser');
    if (!bw) { setTimeout(injectRefreshButton, 200); return; }
    if (!bw.shadowRoot) { setTimeout(injectRefreshButton, 300); return; }
    var sr = bw.shadowRoot;
    var addrEl = sr.querySelector('input[type="text"]') || sr.querySelector('input') ||
                 sr.querySelector('[class*="url"]') || sr.querySelector('[class*="address"]') ||
                 sr.querySelector('[class*="addr"]');
    if (!addrEl) { setTimeout(injectRefreshButton, 400); return; }
    var container = addrEl.parentElement;
    if (!container) { setTimeout(injectRefreshButton, 400); return; }
    if (container.querySelector('.bw-refresh-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'bw-refresh-btn';
    btn.setAttribute('title', '刷新当前页面');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
    btn.style.cssText = 'margin-left:6px;cursor:pointer;background:transparent;border:1px solid #d0d0d0;border-radius:4px;padding:3px 6px;color:#666;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s,color 0.2s;';
    btn.addEventListener('mouseenter', function () { this.style.background = '#f0f0f0'; this.style.color = '#333'; });
    btn.addEventListener('mouseleave', function () { this.style.background = 'transparent'; this.style.color = '#666'; });
    btn.addEventListener('click', function () {
      this.style.transform = 'rotate(360deg)';
      this.style.transition = 'transform 0.5s ease';
      var self = this;
      setTimeout(function () { self.style.transform = ''; self.style.transition = ''; }, 500);
      refreshCurrentView();
    });
    container.appendChild(btn);
    try {
      var mo = new MutationObserver(function () {
        if (!container.querySelector('.bw-refresh-btn')) container.appendChild(btn);
      });
      mo.observe(sr, { childList: true, subtree: true });
    } catch (e) {}
  }
  function refreshCurrentView() {
    beep(600, 0.15);
    var route = parseRoute(location.hash);
    if (route.zone === 'qzone') {
      // QQ 空间：重新走一遍路由，重置当前页
      try { if (typeof window.bw2QzoneRefreshFX === 'function') window.bw2QzoneRefreshFX(); } catch (e) {}
      try { go(route); } catch (e) {}
      return;
    }
    if (route.zone === 'hospital') {
      try { if (typeof c3Refresh === 'function') c3Refresh(); else go(route); } catch (e) {}
      return;
    }
    // 成长档案
    var am = document.getElementById('archiveMain');
    var inMain = am && am.classList.contains('show');
    if (!inMain) {
      // 残骸/登录页：清空输入与提示
      var lu = document.getElementById('loginUser');
      var lp = document.getElementById('loginPass');
      var lr = document.getElementById('loginResult');
      if (lu) lu.value = '';
      if (lp) lp.value = '';
      if (lr) { lr.style.display = 'none'; lr.innerHTML = ''; }
      return;
    }
    // 第二章主界面：重置当前模块交互状态
    document.querySelectorAll('#archiveMain .grow-detail.show').forEach(function (el) { el.classList.remove('show'); });
    document.querySelectorAll('#archiveMain #draftList li.unlocked').forEach(function (li) {
      li.classList.remove('unlocked');
      var inp = li.querySelector('input');
      var b = li.querySelector('button');
      if (inp) { inp.value = ''; inp.disabled = false; inp.style.borderColor = ''; inp.style.background = ''; }
      if (b) b.disabled = false;
      var lock = li.querySelector('.d-lock');
      if (lock) lock.textContent = '已加密 · 输入档案编号后 4 位解锁';
    });
    var dvVideo = document.getElementById('dvVideo');
    var dvPlayBtn = document.getElementById('dvPlay');
    var dvOverlay = document.getElementById('dvOverlay');
    var dvImg = document.getElementById('dvImg');
    if (dvVideo) { try { dvVideo.pause(); dvVideo.currentTime = 0; } catch (e) {} dvVideo.style.display = 'none'; }
    if (dvImg) dvImg.style.display = 'block';
    if (dvOverlay) { dvOverlay.style.display = 'flex'; dvOverlay.className = 'dv-overlay'; dvOverlay.textContent = '▶ 点击播放录像带'; }
    if (dvPlayBtn) dvPlayBtn.textContent = '播 放';
    var dvState = document.getElementById('dvState');
    if (dvState) dvState.textContent = '未播放';
    var dvBarFill = document.getElementById('dvBarFill');
    if (dvBarFill) dvBarFill.style.width = '0';
    document.querySelectorAll('#archiveMain #qaList input').forEach(function (inp) { inp.value = ''; inp.style.background = ''; });
    document.querySelectorAll('#archiveMain #qaList .a-res').forEach(function (res) { res.className = 'a-res'; res.textContent = ''; });
    c2MarkMod(c2CurrentMod);
  }
  // injectRefreshButton(); // 改用 light DOM 固定定位按钮

