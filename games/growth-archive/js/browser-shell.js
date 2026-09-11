/* ============================================
 * browser-shell.js — 自 index.html 行 6339-7057 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================================================================
     自创浏览器真实化（14项）
     ================================================================ */
  var bwQzoneTitles = { home:'拾光客的空间 - 主页', logs:'拾光客的空间 - 日志', moments:'拾光客的空间 - 说说', albums:'拾光客的空间 - 相册', guestbook:'拾光客的空间 - 留言板', music:'拾光客的空间 - 音乐盒' };
  var bwModTitles = { grow:'成长数据', photos:'成长照片', diary:'成长日记', dv:'DV影像', qa:'密保设置', security:'安全中心', mine:'我的档案' };

  /* ---- 辅助：shadow DOM 操作 ---- */
  var bwShadowReady = false, bwReadyCbs = [];
  function bwWhenReady(cb) {
    if (bwShadowReady) { cb(); return; }
    bwReadyCbs.push(cb);
    var n = 0;
    (function poll() {
      var bw = document.getElementById('browser');
      if (bw && bw.shadowRoot && bw.shadowRoot.querySelector('input')) {
        bwShadowReady = true;
        bwReadyCbs.forEach(function(f){ try{f();}catch(e){} });
        bwReadyCbs = [];
      } else if (n < 40) { n++; setTimeout(poll, 150); }
    })();
  }
  function bwAddrInput() {
    var sr = document.getElementById('browser').shadowRoot;
    if (!sr) return null;
    return sr.querySelector('input[type="text"]') || sr.querySelector('input') || sr.querySelector('[class*="url"]') || sr.querySelector('[class*="address"]');
  }
  function bwAddrWrap() {
    var inp = bwAddrInput();
    return inp ? inp.parentElement : null;
  }

  /* ---- 1. 加载过渡 ---- */
  var bwLoadingEl = null;
  function bwShowLoading() {
    document.querySelectorAll('.bw-loading').forEach(function(old){ if(old.parentNode) old.parentNode.removeChild(old); });
    bwLoadingEl = document.createElement('div');
    bwLoadingEl.className = 'bw-loading';
    bwLoadingEl.innerHTML = '<div class="bw-loading-spinner"></div><div class="bw-loading-bar"><i></i></div><div class="bw-loading-text">正在加载…</div>';
    document.body.appendChild(bwLoadingEl);
  }
  function bwHideLoading() {
    var els = document.querySelectorAll('.bw-loading');
    els.forEach(function(el) {
      el.classList.add('hide');
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    });
    bwLoadingEl = null;
  }

  /* ---- 4. tab 标题更新 ---- */
  function bwUpdateTabTitle(t, idx) {
    try {
      var tabs = document.querySelectorAll('browser-tab');
      var _ti = (typeof idx === 'number') ? idx : 0;
      if (tabs[_ti]) tabs[_ti].setAttribute('title', t);
      var sr = document.getElementById('browser').shadowRoot;
      if (sr) {
        var _tels = sr.querySelectorAll('[class*="title"]'); var titleEl = _tels[_ti] || _tels[0] || sr.querySelector('[class*="tab"]');
        if (titleEl && titleEl.textContent) titleEl.textContent = t;
      }
    } catch (e) {}
    document.title = t;
  }

  /* ---- 14. 前进/后退 + 历史 ---- */
  var bwHistory = [], bwHistIdx = -1, bwNavBack = null, bwNavFwd = null;
  function bwPushHistory(route) {
    if (!Array.isArray(bwHistory)) bwHistory = [];
    if (typeof bwHistIdx !== 'number' || bwHistIdx < -1) bwHistIdx = -1;
    bwHistory = bwHistory.slice(0, bwHistIdx + 1);
    bwHistory.push(route);
    bwHistIdx = bwHistory.length - 1;
    bwUpdateNavBtns();
  }
  function bwUpdateNavBtns() {
    var hi = (typeof bwHistIdx === 'number') ? bwHistIdx : -1;
    var hl = Array.isArray(bwHistory) ? bwHistory.length : 0;
    if (bwNavBack) bwNavBack.style.opacity = hi > 0 ? '1' : '0.35';
    if (bwNavFwd) bwNavFwd.style.opacity = hi < hl - 1 ? '1' : '0.35';
  }
  function bwGoBack() {
    if (!Array.isArray(bwHistory) || bwHistIdx <= 0) return;
    bwHistIdx--;
    var r = bwHistory[bwHistIdx];
    if (r && r.zone === 'archive' && r.mod && typeof c2MarkMod === 'function') { c2MarkMod(r.mod, true); }
    else if (r && r.zone === 'hospital' && r.mod && typeof c3MarkMod === 'function') { c3MarkMod(r.mod, true); }
    else if (r && r.zone) { go(r); }
    bwUpdateNavBtns();
  }
  function bwGoForward() {
    if (!Array.isArray(bwHistory) || bwHistIdx >= bwHistory.length - 1) return;
    bwHistIdx++;
    var r = bwHistory[bwHistIdx];
    if (r && r.zone === 'archive' && r.mod && typeof c2MarkMod === 'function') { c2MarkMod(r.mod, true); }
    else if (r && r.zone === 'hospital' && r.mod && typeof c3MarkMod === 'function') { c3MarkMod(r.mod, true); }
    else if (r && r.zone) { go(r); }
    bwUpdateNavBtns();
  }

  /* ---- 2+3+5+14: shadow DOM 注入（favicon/协议头/安全锁/前进后退/全选） ---- */
  bwWhenReady(function() {
    var wrap = bwAddrWrap();
    if (!wrap) return;
    var inp = bwAddrInput();
    // 前进按钮
    bwNavBack = document.createElement('button');
    bwNavBack.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
    bwNavBack.style.cssText = 'background:none;border:none;cursor:pointer;color:#777;padding:2px 4px;margin-right:2px;opacity:0.35;display:inline-flex;align-items:center;';
    bwNavBack.title = '后退';
    bwNavBack.addEventListener('click', bwGoBack);
    // 后退按钮
    bwNavFwd = document.createElement('button');
    bwNavFwd.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    bwNavFwd.style.cssText = 'background:none;border:none;cursor:pointer;color:#777;padding:2px 4px;margin-right:4px;opacity:0.35;display:inline-flex;align-items:center;';
    bwNavFwd.title = '前进';
    bwNavFwd.addEventListener('click', bwGoForward);
    // 安全锁/协议头容器
    var secBox = document.createElement('span');
    secBox.id = 'bwSecBox';
    secBox.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-right:6px;color:#555;font-size:12px;font-family:Arial;flex-shrink:0;';
    // favicon
    var favi = document.createElement('span');
    favi.id = 'bwFavicon';
    favi.style.cssText = 'display:inline-flex;align-items:center;margin-right:4px;';
    // 插入到 input 前面
    wrap.insertBefore(bwNavBack, inp);
    wrap.insertBefore(bwNavFwd, inp);
    wrap.insertBefore(favi, inp);
    wrap.insertBefore(secBox, inp);
    // 5. 地址栏点击全选
    inp.addEventListener('focus', function() { try { this.select(); } catch(e) {} });
    // 刷新按钮（如果之前没注入）
    if (!wrap.querySelector('.bw-refresh-btn')) {
      var rbtn = document.createElement('button');
      rbtn.className = 'bw-refresh-btn';
      rbtn.title = '刷新';
      rbtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
      rbtn.style.cssText = 'margin-left:6px;cursor:pointer;background:transparent;border:1px solid #d0d0d0;border-radius:4px;padding:3px 6px;color:#666;display:inline-flex;align-items:center;';
      rbtn.addEventListener('click', function() {
        this.style.transform='rotate(360deg)'; this.style.transition='transform 0.5s';
        var s=this; setTimeout(function(){s.style.transform='';s.style.transition='';},500);
        if (typeof refreshCurrentView === 'function') refreshCurrentView();
      });
      wrap.appendChild(rbtn);
    }
    bwUpdateSecBox();
    bwUpdateNavBtns();
  });
  function bwUpdateSecBox() {
    var secBox = document.getElementById('bwSecBox');
    var favi = document.getElementById('bwFavicon');
    if (!secBox) return;
    var url = '';
    try { url = browser.getAttribute('url') || ''; } catch(e) {}
    var isArchive = url.indexOf('chengzhangdangan') >= 0;
    var isHosp = url.indexOf('syeb-archive') >= 0;
    if (isArchive) {
      secBox.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:-1px;"><path d="M12 3 2 20h20z" fill="#db4437"/><rect x="11" y="9.5" width="2" height="6" fill="#fff"/><circle cx="12" cy="17.6" r="1.1" fill="#fff"/></svg><span style="color:#db4437;">http://</span><span style="color:#db4437;font-size:11px;">不安全</span>';
      favi.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a7a2a" stroke-width="2"><path d="M12 22c-4-3-7-7-7-11a7 7 0 0 1 14 0c0 4-3 8-7 11z"/><path d="M12 8v6M9 11h6"/></svg>';
    } else if (isHosp) {
      secBox.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:-1px;"><path d="M12 3 2 20h20z" fill="#db4437"/><rect x="11" y="9.5" width="2" height="6" fill="#fff"/><circle cx="12" cy="17.6" r="1.1" fill="#fff"/></svg><span style="color:#db4437;">http://</span><span style="color:#db4437;font-size:11px;">不安全</span>';
      favi.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6a52" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 9h16M12 12v5M9.5 14.5h5"/></svg>';
    } else {
      secBox.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a8a0a" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span style="color:#0a8a0a;">https://</span>';
      favi.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#12b7f5"><circle cx="12" cy="12" r="10"/><path d="M8 14c0-2 1.5-3 4-3s4 1 4 3" stroke="#fff" stroke-width="1.5" fill="none"/><circle cx="9" cy="10" r="1.2" fill="#fff"/><circle cx="15" cy="10" r="1.2" fill="#fff"/></svg>';
    }
  }
  // 监听 URL 变化更新安全标识
  setInterval(function() {
    try {
      var u = browser.getAttribute('url');
      if (u !== bwLastUrl) { bwLastUrl = u; bwUpdateSecBox(); }
    } catch(e) {}
  }, 300);
  var bwLastUrl = '';

  /* ---- 6. 右键菜单 ---- */
  var bwCtxMenu = null;
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (bwCtxMenu) { document.body.removeChild(bwCtxMenu); }
    bwCtxMenu = document.createElement('div');
    bwCtxMenu.className = 'bw-context-menu';
    bwCtxMenu.style.left = e.clientX + 'px';
    bwCtxMenu.style.top = e.clientY + 'px';
    bwCtxMenu.innerHTML =
      '<div class="bw-context-menu-item" data-act="refresh">刷新</div>' +
      '<div class="bw-context-menu-sep"></div>' +
      '<div class="bw-context-menu-item" data-act="history">历史记录</div>' +
      '<div class="bw-context-menu-item" data-act="source">查看网页源代码</div>' +
      '<div class="bw-context-menu-item" data-act="inspect">检查</div>';
    document.body.appendChild(bwCtxMenu);
    bwCtxMenu.querySelectorAll('.bw-context-menu-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var act = this.getAttribute('data-act');
        if (bwCtxMenu) { document.body.removeChild(bwCtxMenu); bwCtxMenu = null; }
        if (act === 'refresh') { if (typeof refreshCurrentView === 'function') refreshCurrentView(); }
        if (act === 'history') { if (typeof window.bw2ShowHistory === 'function') window.bw2ShowHistory(); }
        if (act === 'source') bwShowSource();
        if (act === 'inspect') bwShowDevtools();
      });
    });
  });
  document.addEventListener('click', function() {
    if (bwCtxMenu) { document.body.removeChild(bwCtxMenu); bwCtxMenu = null; }
  });

  /* ---- 6b. 仿真源代码页（藏线索） ---- */
  function bwShowSource() {
    var el = document.createElement('div');
    el.className = 'bw-source-view';
    var code = '<span class="tag"><!DOCTYPE</span> <span class="attr">html</span><span class="tag">></span>\n' +
      '<span class="tag"><head></span>\n  <span class="tag"><title></span>成长档案<span class="tag"></title></span>\n' +
      '  <span class="cm"><!-- 站点维护：2008-2015 · 关停日期 2015-06-30 --></span>\n' +
      '  <span class="cm"><!-- 自动补全系统 v2.7 · 最后同步 2026-09-03 02:13 --></span>\n' +
      '<span class="tag"></head></span>\n<span class="tag"><body></span>\n' +
      '  <span class="tag"><div</span> <span class="attr">id</span>=<span class="str">"archive"</span><span class="tag">></span>\n' +
      '    <span class="tag"><div</span> <span class="attr">class</span>=<span class="str">"record"</span> <span class="attr">data-user</span>=<span class="str">"czda_0127"</span><span class="tag">></span>\n' +
      '      <span class="cm"><!-- 记录所有者：拾光客 · 虚拟人格 #127 --></span>\n' +
      '      <span class="cm"><!-- 关联样本：czda_0126 [林远] · 状态：已吸收 --></span>\n' +
      '      <span class="cm"><!-- 下一个目标：czda_0128 [待标记] --></span>\n' +
      '      <span class="red"><span class="cm"><!-- LINE DELETED at 02:13 by 0126: "我不想消失" --></span></span>\n' +
      '    <span class="tag"></div></span>\n  <span class="tag"></div></span>\n<span class="tag"></body></span>\n<span class="tag"></html></span>';
    el.innerHTML = '<div class="bw-source-bar"><span>成长档案_源代码 · view-source:www.chengzhangdangan.com/archive/czda_0127</span><span class="bw-source-close" id="bwSrcClose">×</span></div><div class="bw-source-code">' + code + '</div>';
    document.body.appendChild(el);
    document.getElementById('bwSrcClose').addEventListener('click', function() { document.body.removeChild(el); });
  }

  /* ---- 6c. 仿真 DevTools（Console 藏线索） ---- */
  function bwShowDevtools() {
    var el = document.createElement('div');
    el.className = 'bw-devtools';
    el.innerHTML =
      '<div class="bw-devtools-bar">' +
      '<span class="bw-devtools-tab on">Console</span>' +
      '<span class="bw-devtools-tab">Elements</span>' +
      '<span class="bw-devtools-tab">Network</span>' +
      '<span class="bw-devtools-tab">Application</span>' +
      '<span class="bw-devtools-close" id="bwDevClose">×</span></div>' +
      '<div class="bw-devtools-content" id="bwDevContent"></div>';
    document.body.appendChild(el);
    var c = document.getElementById('bwDevContent');
    var lines = [
      {t:'info', msg:'DevTools 启动 · 正在检查 www.chengzhangdangan.com'},
      {t:'warn', msg:'[警告] 该证书已过期 · 签发者：0126 · 有效期至：2015-06-30'},
      {t:'error', msg:'[错误] 02:13:14 · Connection to backup server lost (47min timeout)'},
      {t:'error', msg:'[错误] 02:13:15 · Account 0126 modified 3 records in /archive/czda_0127'},
      {t:'warn', msg:'[警告] Memory leak detected: 47 minutes of data missing from user 0127'},
      {t:'error', msg:'[错误] Uncaught ReferenceError: 林远 is not defined at 02:13:47'},
      {t:'info', msg:'[信息] 自动补全系统 v2.7 运行中 · 当前补全进度：99.98%'},
      {t:'warn', msg:'[警告] 检测到新访客 czda_0128 · 标记中…'},
      {t:'error', msg:'[错误] 0126: "别查了。" — message intercepted and deleted'},
    ];
    lines.forEach(function(l) {
      var d = document.createElement('div');
      d.className = 'bw-console-line bw-console-' + l.t;
      d.innerHTML = '<span class="bw-console-ts">02:' + (13 + Math.floor(Math.random()*5)) + ':' + Math.floor(Math.random()*60) + '</span>' + l.msg;
      c.appendChild(d);
    });
    document.getElementById('bwDevClose').addEventListener('click', function() { document.body.removeChild(el); });
  }

  /* ---- 7. F12 控制台彩蛋 ---- */
  try {
    console.error('%c[ERROR] 02:13:14 · Connection to backup server lost', 'color:#f44747;font-weight:bold;');
    console.warn('%c[WARN] Certificate expired · issuer: 0126 · valid until 2015-06-30', 'color:#ce9178;');
    console.error('%c[ERROR] Account 0126 modified 3 records in /archive/czda_0127', 'color:#f44747;');
    console.log('%c\n  ╔══ 生长 ══╗\n  ║  藤蔓  ║\n  ║  已连接 ║\n  ╚════════╝\n  补全进度：99.98%\n  下一个：czda_0128', 'color:#4a7a2a;font-family:monospace;');
    console.warn('%c[WARN] 林远: "别查了。" — message intercepted', 'color:#ce9178;');
  } catch(e) {}

  /* ---- 8. 左下角状态栏 ---- */
  function bwInjectStatusBar() {
    [viewQzone, viewArchive].forEach(function(view) {
      if (!view || view.querySelector('.bw-status-bar')) return;
      var bar = document.createElement('div');
      bar.className = 'bw-status-bar';
      bar.id = 'bwStatusBar';
      bar.textContent = '完成';
      view.style.position = view.style.position || 'relative';
      view.appendChild(bar);
    });
  }
  bwInjectStatusBar();
  document.addEventListener('mouseover', function(e) {
    var bar = document.getElementById('bwStatusBar');
    if (!bar) return;
    var a = e.target.closest('a[data-route], a[href]');
    if (a) {
      var route = a.getAttribute('data-route');
      if (route) {
        var url = route.indexOf('archive') >= 0 ? 'www.chengzhangdangan.com' : 'user.qzone.qq.com/7788166' + route.replace('#/qzone','');
        bar.textContent = url;
      } else {
        bar.textContent = a.getAttribute('href') || '';
      }
    } else {
      bar.textContent = '完成';
    }
  });

  /* ---- 9. 私密连接拦截页 ---- */
  function bwShowSSL() {
    var existing = document.getElementById('bwSSL');
    if (existing) { existing.style.display = 'flex'; return; }
    var el = document.createElement('div');
    el.className = 'bw-ssl';
    el.id = 'bwSSL';
    el.innerHTML =
      '<div class="bw-ssl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div>' +
      '<div class="bw-ssl-title">您的连接不是私密连接</div>' +
      '<div class="bw-ssl-desc">攻击者可能会在 <b>www.chengzhangdangan.com</b> 上窃取您的信息（例如密码、通讯内容或信用卡信息）。<br>该网站的安全证书已过期，且由未知机构签发。通常这意味着该网站已停止维护，或有人试图伪造该网站。</div>' +
      '<div class="bw-ssl-code">NET::ERR_CERT_AUTHORITY_INVALID · 签发者：0126 · 有效期至：2015-06-30</div>' +
      '<div class="bw-ssl-advanced"><button class="bw-ssl-advanced-btn" id="bwSSLAdv">高级</button></div>' +
      '<div class="bw-ssl-proceed-wrap" id="bwSSLProceed"><button class="bw-ssl-proceed" id="bwSSLGo">继续前往 www.chengzhangdangan.com（不安全）</button></div>';
    viewArchive.style.position = 'relative';
    viewArchive.appendChild(el);
    document.getElementById('bwSSLAdv').addEventListener('click', function() {
      document.getElementById('bwSSLProceed').classList.add('show');
    });
    document.getElementById('bwSSLGo').addEventListener('click', function() {
      el.style.display = 'none';
      beep(600, 0.15);
    });
  }

  /* ---- 10. 浏览器崩溃页 ---- */
  function bwCrash(callback) {
    var el = document.createElement('div');
    el.className = 'bw-crash';
    el.id = 'bwCrash';
    el.innerHTML =
      '<div class="bw-crash-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="14.5" stroke-linecap="round"/><circle cx="12" cy="17.4" r="0.7" fill="#b0b0b0" stroke="none"/></svg></div>' +
      '<div class="bw-crash-title">Aw, Snap!</div>' +
      '<div class="bw-crash-desc">此页面已崩溃。正在尝试恢复…</div>' +
      '<button class="bw-crash-reload" id="bwCrashReload">重新加载</button>';
    viewArchive.style.position = 'relative';
    viewArchive.appendChild(el);
    beep(150, 0.3);
    var recovered = false;
    function recover() {
      if (recovered) return;
      recovered = true;
      if (el.parentNode) el.parentNode.removeChild(el);
      if (callback) callback();
    }
    document.getElementById('bwCrashReload').addEventListener('click', recover);
    setTimeout(recover, 2800);
  }

  /* ---- 11. 老式 XP 弹窗 ---- */
  var XP_ICONS = {
    info: "<svg width='28' height='28' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='#3a93ff'/><rect x='11' y='10' width='2' height='7' fill='#fff' rx='0.5'/><circle cx='12' cy='7.4' r='1.15' fill='#fff'/></svg>",
    warn: "<svg width='28' height='28' viewBox='0 0 24 24'><path d='M12 3 2 20h20z' fill='#f5b400' stroke='#c88700' stroke-width='0.8' stroke-linejoin='round'/><rect x='11' y='9.5' width='2' height='6' fill='#3a2e00' rx='0.5'/><circle cx='12' cy='17.6' r='1.1' fill='#3a2e00'/></svg>",
    mail: "<svg width='28' height='28' viewBox='0 0 24 24'><rect x='3' y='5' width='18' height='14' rx='2' fill='#3a93ff'/><path d='M4 7.2l8 5.8 8-5.8' stroke='#fff' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>"
  };
  function bwAlert(msg, icon, cb) {
    icon = (icon === 'warn') ? 'warn' : ((icon === 'mail') ? 'mail' : 'info');
    var mask = document.createElement('div');
    mask.className = 'bw-xp-mask';
    var el = document.createElement('div');
    el.className = 'bw-xp-alert';
    el.innerHTML =
      '<div class="bw-xp-title"><span>来自网页的消息</span><span class="bw-xp-title-x" id="bwXPClose">×</span></div>' +
      '<div class="bw-xp-body"><span class="bw-xp-body-icon">' + XP_ICONS[icon] + '</span><span>' + msg + '</span></div>' +
      '<div class="bw-xp-ok-row"><button class="bw-xp-ok" id="bwXPOk">确定</button></div>';
    document.body.appendChild(mask);
    document.body.appendChild(el);
    beep(800, 0.1);
    function close() {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      if (cb) cb();
    }
    document.getElementById('bwXPOk').addEventListener('click', close);
    document.getElementById('bwXPClose').addEventListener('click', close);
  }

  /* ---- 12. 下载栏 ---- */
  function bwTriggerDownload() {
    var existing = document.getElementById('bwDLBar');
    if (existing) { existing.style.display = 'flex'; return; }
    var bar = document.createElement('div');
    bar.className = 'bw-download-bar';
    bar.id = 'bwDLBar';
    bar.innerHTML =
      '<span class="bw-download-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" style="vertical-align:-3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>' +
      '<span class="bw-download-name">成长档案_安全日志_20260903.txt</span>' +
      '<span class="bw-download-status">已下载</span>' +
      '<span class="bw-download-actions"><span id="bwDLOpen">打开</span><span id="bwDLFolder">在文件夹中显示</span></span>' +
      '<span class="bw-download-close" id="bwDLClose">×</span>';
    viewArchive.style.position = 'relative';
    viewArchive.appendChild(bar);
    beep(1000, 0.1);
    document.getElementById('bwDLClose').addEventListener('click', function() { bar.style.display = 'none'; });
    document.getElementById('bwDLOpen').addEventListener('click', function() {
      bwAlert('安全日志内容：\n\n[2026-09-03 02:13:14] 账号 0126 登录\n[2026-09-03 02:13:15] 修改成长记录 ×3\n[2026-09-03 02:14:02] 剪辑DV影像 ×2\n[2026-09-03 02:58:47] 登出（停留47分钟）\n\n— 日志结束 —', 'info');
    });
    document.getElementById('bwDLFolder').addEventListener('click', function() {
      bwAlert('无法打开文件夹：该文件位于虚拟下载目录。', 'warn');
    });
  }
  // 在安全中心注入"导出日志"按钮
  setTimeout(function() {
    var secCard = document.querySelector('#mod-security .arc-card') || document.getElementById('mod-security');
    if (secCard && !document.getElementById('bwExportBtn')) {
      var btn = document.createElement('button');
      btn.id = 'bwExportBtn';
      btn.textContent = '导出安全日志（.txt）';
      btn.style.cssText = 'margin-top:10px;padding:7px 14px;cursor:pointer;background:linear-gradient(180deg,#d8c69a,#bfa96f);border:1px solid #8a7440;color:#4a3c18;font-family:inherit;font-size:12px;';
      btn.addEventListener('click', bwTriggerDownload);
      secCard.appendChild(btn);
    }
  }, 1500);

  /* ---- 13. 02:13 花屏 ---- */
  function bwGlitch() {
    document.body.classList.add('bw-glitch');
    var overlay = document.createElement('div');
    overlay.className = 'bw-glitch-overlay';
    document.body.appendChild(overlay);
    beep(80, 0.25);
    setTimeout(function() {
      document.body.classList.remove('bw-glitch');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 1000);
  }
  // 检测真实时间 02:13 或在成长档案停留 3 分钟后随机触发
  var bwGlitchFired = false;
  setInterval(function() {
    if (bwGlitchFired) return;
    var now = new Date();
    var inArchive = !viewArchive.hidden;
    if (inArchive && ((now.getHours() === 2 && now.getMinutes() >= 10 && now.getMinutes() <= 16) || Math.random() < 0.02)) {
      bwGlitchFired = true;
      window.bwGlitch();
      // 花屏后弹老式弹窗
      setTimeout(function() {
        bwAlert('系统检测到异常访问。\n账号 0126 正在尝试连接…', 'warn');
      }, 1200);
    }
  }, 10000);

  /* ---- 登录成功后弹老式弹窗（未读消息） ---- */
  var bwLoginAlertFired = false;
  var origLoginCheck = setInterval(function() {
    var am = document.getElementById('archiveMain');
    if (am && am.classList.contains('show') && !bwLoginAlertFired) {
      bwLoginAlertFired = true;
      clearInterval(origLoginCheck);
      setTimeout(function() {
        bwAlert('您有 1 条未读消息。\n\n发件人：未知（0126）\n主题：别查了\n时间：2026-09-03 02:13', 'mail');
      }, 1800);
    }
  }, 500);


  /* ---- 全局兜底：任何情况下 3 秒后强制清除 loading，防止卡死 ---- */
  setTimeout(function () {
    document.querySelectorAll('.bw-loading').forEach(function (el) {
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 100);
    });
  }, 3000);
  /* 兜底2：每 1.5 秒检查一次，如果 loading 存在超过 5 秒则强制移除 */
  setInterval(function () {
    var els = document.querySelectorAll('.bw-loading');
    if (els.length > 0) {
      els.forEach(function (el) {
        if (!el._bwBorn) el._bwBorn = Date.now();
        if (Date.now() - el._bwBorn > 4000) {
          el.style.opacity = '0';
          var e = el;
          setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 100);
        }
      });
    }
  }, 1500);


  /* ===== 探查笔记系统 ===== */
  var CAT_ICON = {
    '人物': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><circle cx='12' cy='8' r='3.2'/><path d='M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6'/></svg>",
    '地点': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'><path d='M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z'/><circle cx='12' cy='11' r='2.2'/></svg>",
    '时间线': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><circle cx='12' cy='12' r='8.5'/><path d='M12 7.5V12l3 2'/></svg>",
    '异常': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round'><path d='M12 3.5 2.8 19.5h18.4z'/><line x1='12' y1='10' x2='12' y2='14' stroke-linecap='round'/><circle cx='12' cy='17' r='0.8' fill='currentColor' stroke='none'/></svg>",
    '关键线索': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><circle cx='8' cy='12' r='3.4'/><path d='M11.4 12H21M18 12v3M15 12v2.5'/></svg>",
    '_locked': "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='8.5'/><path d='M9.4 9.6a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.1.9-1.1 1.8' stroke-linecap='round'/><circle cx='12' cy='16.6' r='0.7' fill='currentColor' stroke='none'/></svg>"
  };
  var NOTES = {
    person_linyuan: { cat: '人物', title: '林远', desc: '密保问题「最好的朋友」的答案。QQ空间最近访客中出现，签名「别信他。」，状态离线。', src: '成长档案·密保 / QQ空间·访客' },
    person_0126: { cat: '人物', title: '编号 0126', desc: '安全日志中频繁出现的操作账号，每天凌晨02:13登录，停留47分钟。', src: '成长档案·安全中心' },
    place_qiaonan: { cat: '地点', title: '桥南街', desc: '日记和照片中反复出现的老街，老照相馆所在地。QQ空间个人中心记录的地址是清华园·解放东路36号。', src: '成长档案·日记 / QQ空间·个人中心' },
    place_zhaoxiang: { cat: '地点', title: '老照相馆', desc: '桥南街的老照相馆，2009年照片和DV录像的关键场景。', src: '成长档案·照片 / DV影像' },
    time_0213: { cat: '时间线', title: '02:13', desc: '每天凌晨2点13分，账号0126登录，停留恰好47分钟后登出。QQ空间最后登录时间也是02:13。', src: '成长档案·安全中心 / QQ空间·个人中心' },
    time_2009: { cat: '时间线', title: '2009年空白', desc: '2009-03-14（14岁生日）的日记条目为空，无法读取。同年5月记录了搬家。', src: '成长档案·成长日记' },
    time_2015: { cat: '时间线', title: '2015-06-30', desc: '本网站停止服务日。此后再无人工录入。最后一条日记写着「别查了。」', src: '成长档案·成长日记' },
    time_2026: { cat: '时间线', title: '档案仍在更新', desc: '身高体重表在你进入当天（与现实时间同步）仍有写入记录。成年后身高不应继续增长。', src: '成长档案·成长数据' },
    anomaly_grow: { cat: '异常', title: '成年后仍在生长', desc: '身高体重表显示，2020年（25岁）后身高仍在持续更新，2026年达到184.5cm。成年人身高不应继续增长。', src: '成长档案·成长数据' },
    anomaly_diary: { cat: '异常', title: '搬家记录矛盾', desc: '成长日记写2009年搬进清华园小区，但QQ空间早期日志和照片都在桥南街老照相馆。两处记录的时间线和地点存在矛盾。', src: '成长档案·成长日记 / QQ空间' },
    anomaly_dv: { cat: '异常', title: 'DV影像异常', desc: '录像播放过程中出现跳帧、信号中断，时间码乱码。', src: '成长档案·DV影像' },
    anomaly_photo: { cat: '异常', title: '照片来源缺失', desc: '2012年及之后的照片没有「本地上传」来源标注，与2012年前的照片不一致。', src: '成长档案·成长照片' },
    anomaly_qa: { cat: '异常', title: '密保验证异常', desc: '密保问题验证通过，但系统记录的答案与输入内容不一致。', src: '成长档案·密保设置' },
    place_doorplate: { cat: '地点', title: '桥南36号门面', desc: '桥南街相册最后一张照片：街尾一间老门面，木门半掩，砖墙上钉着白底蓝字搪瓷门牌「桥南36号」，旁有「华兴照相馆」旧招牌。拾光客说「我家不在这条街上，可这门牌我好像在哪儿见过」。', src: 'QQ空间·相册·桥南街' },
    key_password: { cat: '关键线索', title: '密码构成', desc: '已推导出密码构成：故乡老街的拼音 + 家门牌号数字，线索来自桥南街尾的搪瓷门牌。', src: '成长档案·忘记密码验证 / QQ空间·相册' },
    key_47min: { cat: '关键线索', title: '47分钟', desc: '账号0126每次登录恰好停留47分钟。QQ空间未知访客的停留时间也是47分钟。', src: '成长档案·安全中心 / QQ空间·访问记录' },
    key_memory: { cat: '关键线索', title: '记忆在消失', desc: '档案主人的草稿中写道：「我的记忆在一点点变少。昨天记得的事，今天就想不起来了。」', src: '成长档案·加密草稿' },
    c1_acrostic: { cat: '异常', title: '历史留言的首字', desc: '把 2009–2015 年旧留言的第一个字连起来读：「别信他，我还在。」这些留言不是给空间主人的，是留给后来者的。', src: 'QQ空间·留言板' },
    c3_rail: { cat: '关键线索', title: '栅栏密文', desc: '操作日志里无法解析的字段 02inx18set，按 02:13 提示做奇/偶位重排后读作「0128 is next」——下一个人，是你。', src: '儿保归档·操作日志' },
    c5_rev_whisper: { cat: '异常', title: '低语倒放', desc: '低语样本倒放后听出：「别信它，我还醒着。」——录音里藏着求救。', src: '第五章·低语样本' },
    c6_rev_lowdub: { cat: '异常', title: '底层低语倒放', desc: '最底层低语倒放后听出：「别告诉它，我在哪。」与第六章的忠告一致。', src: '第六章·底层低语' },
  };
  var NOTE_KEY = 'grow_notes_v1';
  function getNotes() { try { return JSON.parse(localStorage.getItem(NOTE_KEY) || '[]'); } catch(e) { return []; } }
  function setNotes(arr) { try { localStorage.setItem(NOTE_KEY, JSON.stringify(arr)); } catch(e) {} }
  function addNote(id) {
    if (!NOTES[id]) return;
    var found = getNotes();
    if (found.indexOf(id) >= 0) return;
    found.push(id);
    setNotes(found);
    showNoteToast(NOTES[id].title);
    if (notePanel && notePanel.classList.contains('open')) renderNotes();
    updateNoteBadge();
  }
  function showNoteToast(title) {
    var t = document.createElement('div');
    t.className = 'note-toast';
    t.innerHTML = '<span class="nt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#e8c87a" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>新线索已记录：<b>' + title + '</b>';
    document.body.appendChild(t);
    setTimeout(function() { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 300); }, 2800);
  }
  var notePanel = null, noteMask = null;
  function buildNotePanel() {
    if (notePanel) return;
    noteMask = document.createElement('div');
    noteMask.className = 'note-panel-mask';
    noteMask.addEventListener('click', toggleNotePanel);
    document.body.appendChild(noteMask);
    notePanel = document.createElement('div');
    notePanel.className = 'note-panel';
    notePanel.innerHTML =
      '<div class="note-panel-header">' +
      '<span class="title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>探查笔记</span>' +
      '<span class="count" id="noteCount">0 / ' + Object.keys(NOTES).length + '</span>' +
      '<span class="note-panel-close" id="noteClose">✕</span></div>' +
      '<div class="note-panel-body" id="noteBody"></div>';
    document.body.appendChild(notePanel);
    document.getElementById('noteClose').addEventListener('click', toggleNotePanel);
    renderNotes();
  }
  function renderNotes() {
    var body = document.getElementById('noteBody');
    if (!body) return;
    var found = getNotes();
    document.getElementById('noteCount').textContent = found.length + ' / ' + Object.keys(NOTES).length;
    var cats = {};
    Object.keys(NOTES).forEach(function(id) {
      var n = NOTES[id];
      if (!cats[n.cat]) cats[n.cat] = [];
      cats[n.cat].push({ id: id, n: n });
    });
    var html = '';
    try {
      var _modsDone = (typeof c2VisitedMods !== 'undefined') ? Object.keys(c2VisitedMods).filter(function(m){return c2VisitedMods[m];}).length : 0;
      var _draftsDone = document.querySelectorAll('#draftList li.unlocked').length;
      html += '<div style="padding:8px 10px;margin-bottom:10px;background:rgba(201,167,232,0.12);border-radius:8px;font-size:11px;color:#555;line-height:1.7;">' +
        '<b>第二章进度</b><br>模块探索：' + Math.min(_modsDone,6) + ' / 6　·　加密草稿：' + _draftsDone + ' / 4　·　成长值：' + Math.round(getHarvest()) + '%<br>' +
        '<span style="color:#888;">通关条件：6 个模块全部查看 + 4 篇加密草稿全部解锁（编号见顶部欢迎语）</span></div>';
    } catch(e) {}
    Object.keys(cats).forEach(function(cat) {
      html += '<div class="note-category">' + cat + '</div>';
      cats[cat].forEach(function(item) {
        var isFound = found.indexOf(item.id) >= 0;
        if (isFound) {
          html += '<div class="note-card"><div class="nc-head"><span class="nc-icon">' + (CAT_ICON[item.n.cat]||'') + '</span><span class="nc-title">' + item.n.title + '</span></div>' +
            '<div class="nc-desc">' + item.n.desc + '</div>' +
            '<div class="nc-meta">来源：' + item.n.src + '</div></div>';
        } else {
          html += '<div class="note-card locked"><div class="nc-head"><span class="nc-icon">' + CAT_ICON._locked + '</span><span class="nc-title">未发现的线索</span></div>' +
            '<div class="nc-desc">继续探查，相关线索将自动记录在此。</div></div>';
        }
      });
    });
    body.innerHTML = html;
  }
  function toggleNotePanel() {
    buildNotePanel();
    notePanel.classList.toggle('open');
    noteMask.classList.toggle('show');
    if (notePanel.classList.contains('open')) renderNotes();
  }
  function updateNoteBadge() {
    var btn = document.getElementById('noteBtnInjected');
    if (!btn) return;
    var found = getNotes();
    var badge = btn.querySelector('.note-badge');
    if (found.length > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'note-badge';
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;font-size:9px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;';
        btn.appendChild(badge);
      }
      badge.textContent = found.length > 9 ? '9+' : found.length;
    }
  }
  /* 注入探查笔记按钮到 shadow DOM */
  bwWhenReady(function() {
    var wrap = bwAddrWrap();
    if (!wrap || wrap.querySelector('#noteBtnInjected')) return;
    var btn = document.createElement('button');
    btn.id = 'noteBtnInjected';
    btn.title = '探查笔记';
    btn.style.cssText = 'position:relative;margin-left:4px;cursor:pointer;background:transparent;border:1px solid #d0d0d0;border-radius:4px;padding:3px 6px;color:#666;display:inline-flex;align-items:center;';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
    btn.addEventListener('click', function() { beep(800, 0.08); toggleNotePanel(); });
    wrap.appendChild(btn);
    updateNoteBadge();
  });



  /* ===== 地址栏按钮（light DOM 固定定位，覆盖在 browser-window 地址栏右侧） ===== */
  (function() {
    function buildBtnBar() {
      if (document.getElementById('bwAddrBtnBar')) return;
      var bar = document.createElement('div');
      bar.id = 'bwAddrBtnBar';
      bar.style.cssText = 'position:fixed;top:37px;right:34px;z-index:99999;display:flex;gap:3px;align-items:center;pointer-events:auto;';

      // 刷新按钮
      var rbtn = document.createElement('button');
      rbtn.id = 'bwLightRefreshBtn';
      rbtn.title = '刷新当前页面';
      rbtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
      rbtn.style.cssText = 'width:24px;height:24px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);color:#ccc;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
      rbtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.25)'; this.style.color = '#fff'; });
      rbtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.12)'; this.style.color = '#ccc'; });
      rbtn.addEventListener('click', function() {
        this.style.transform = 'rotate(360deg)'; this.style.transition = 'transform 0.5s ease';
        var s = this; setTimeout(function() { s.style.transform = ''; s.style.transition = ''; }, 500);
        if (typeof refreshCurrentView === 'function') refreshCurrentView();
      });
      bar.appendChild(rbtn);

      // 笔记按钮
      var nbtn = document.createElement('button');
      nbtn.id = 'bwLightNoteBtn';
      nbtn.title = '探查笔记';
      nbtn.style.cssText = 'width:24px;height:24px;border-radius:50%;border:none;background:rgba(255,255,255,0.12);color:#ccc;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;position:relative;';
      nbtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
      nbtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.25)'; this.style.color = '#fff'; });
      nbtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.12)'; this.style.color = '#ccc'; });
      nbtn.addEventListener('click', function() { beep(800, 0.08); toggleNotePanel(); });
      bar.appendChild(nbtn);

      // 证物箱按钮
      var ebtn = document.createElement('button');
      ebtn.id = 'bwLightEvBtn';
      ebtn.title = '证物箱';
      ebtn.style.cssText = nbtn.style.cssText;
      ebtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>';
      ebtn.addEventListener('click', function() { beep(800, 0.08); openEvidence(); });
      bar.appendChild(ebtn);

      // 探查提示按钮
      var hbtn = document.createElement('button');
      hbtn.id = 'bwLightHintBtn';
      hbtn.title = '探查提示';
      hbtn.style.cssText = nbtn.style.cssText;
      hbtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>';
      hbtn.addEventListener('click', function() { beep(800, 0.08); openHint(); });
      bar.appendChild(hbtn);

      // 笔记角标
      var badge = document.createElement('span');
      badge.id = 'bwNoteBadge';
      badge.style.cssText = 'position:absolute;top:-3px;right:-3px;background:#c0392b;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:none;align-items:center;justify-content:center;line-height:1;';
      nbtn.appendChild(badge);

      document.body.appendChild(bar);
      updateNoteBadge();
    }
    // 等 browser-window 渲染后再建
    if (document.readyState === 'complete') buildBtnBar();
    else window.addEventListener('load', function() { setTimeout(buildBtnBar, 300); });
    setTimeout(buildBtnBar, 800); // 兜底
  })();

  /* ===== 游戏内时间与现实世界同步 ===== */
  function gameToday() {
    var n = new Date();
    return n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate());
  }
  function gameTodayShort() {
    var n = new Date();
    return pad2(n.getMonth() + 1) + '-' + pad2(n.getDate());
  }
  function syncRealWorldTime() {
    try {
      var today = gameToday();
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (nd) {
          var p = nd.parentNode;
          if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) return NodeFilter.FILTER_REJECT;
          return (nd.nodeValue && nd.nodeValue.indexOf('2026-09-03') >= 0) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }, false);
      var nodes = [];
      var nd;
      while (nd = walker.nextNode()) nodes.push(nd);
      nodes.forEach(function (n) { n.nodeValue = n.nodeValue.replace(/2026-09-03/g, today); });
      var ckTitle = document.getElementById('ckMonthTitle');
      if (ckTitle) { var _n = new Date(); ckTitle.textContent = _n.getFullYear() + '年' + (_n.getMonth() + 1) + '月'; }
    } catch (e) {}
  }
  if (document.readyState === 'complete') syncRealWorldTime();
  else window.addEventListener('load', function () { setTimeout(syncRealWorldTime, 100); });
  setTimeout(syncRealWorldTime, 500);
