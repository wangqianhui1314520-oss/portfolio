/* ============================================
 * browser-fx.js — 自 index.html 行 8817-9812 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
/* ================================================================
   自创浏览器真实化二期（bw2）· 全部新功能

   书签栏 / 新标签页 / 假搜索页 / 历史记录页 / DNS错误页 / 断网模拟 /
   地址栏自动补全 / 快捷键 / 标签关闭+新建 / 自开标签事件 / 刷新微变 / SDK重注入
   ================================================================ */
(function () {
  if (window.__bw2Loaded) return;
  window.__bw2Loaded = true;

  /* ---- 主脚本函数别名（从 window 取，规避 IIFE 作用域隔离） ---- */
  var bwGoBack = window.bwGoBack, bwGoForward = window.bwGoForward,
      bwUpdateNavBtns = window.bwUpdateNavBtns, bwUpdateSecBox = window.bwUpdateSecBox,
      refreshCurrentView = window.refreshCurrentView, bwAlert = window.bwAlert,
      beep = window.beep, go = window.go, parseRoute = window.parseRoute,
      bwShowSSL = window.bwShowSSL, bwHistory = window.bwHistory,
      c3ModTitles = window.c3ModTitles, c3CurrentMod = window.c3CurrentMod,
      bwUpdateTabTitle = window.bwUpdateTabTitle, bwGlitch = window.bwGlitch,
      bwShowLoading = window.bwShowLoading, bwHideLoading = window.bwHideLoading,
      bwTriggerDownload = window.bwTriggerDownload, bwShowSource = window.bwShowSource,
      bwShowDevtools = window.bwShowDevtools, bwEnsureTab = window.bwEnsureTab,
      bwPushHistory = window.bwPushHistory, setFavicon = window.setFavicon;


  function bw() { return document.getElementById('browser'); }
  function esc2(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bw2ActiveView() {
    var q = document.getElementById('view-qzone');
    var a = document.getElementById('view-archive');
    var h = document.getElementById('view-hospital');
    if (q && !q.hidden) return q;
    if (a && !a.hidden) return a;
    if (h && !h.hidden) return h;
    return null;
  }
  function bw2RemoveOverlay(view, id) {
    if (!view) return;
    var old = document.getElementById(id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  /* ========== SDK 稳定性：shadow 每次重绘后重注入 ========== */
  function bw2PatchSDK() {
    try {
      if (typeof customElements === 'undefined') return;
      var W = customElements.get('browser-window');
      var TB = customElements.get('browser-tab');
      var TBar = customElements.get('browser-toolbar');
      if (W && !W.prototype.__bw2WPatched) {
        var ow = W.prototype._render;
        W.prototype._render = function () {
          ow.call(this);
          var self = this;
          setTimeout(function () { try { bw2ReinjectAll(self); } catch (e) {} }, 0);
        };
        W.prototype.__bw2WPatched = true;
      }
      if (TBar && !TBar.prototype.__bw2TPatched) {
        var ot = TBar.prototype._render;
        TBar.prototype._render = function () {
          ot.call(this);
          var self = this;
          setTimeout(function () { try { bw2ReinjectToolbar(self); } catch (e) {} }, 0);
        };
        TBar.prototype.__bw2TPatched = true;
      }
      if (TB && !TB.prototype.__bw2TabPatched) {
        var oT = TB.prototype._render;
        TB.prototype._render = function () {
          oT.call(this);
          var self = this;
          setTimeout(function () { try { bw2AddTabClose(self); } catch (e) {} }, 0);
        };
        TB.prototype.__bw2TabPatched = true;
      }
    } catch (e) {}
  }

  /* 地址栏注入（幂等：SDK 重绘后元素丢失会重建） */
  function bw2ReinjectToolbar(toolbarEl) {
    try {
      if (!toolbarEl || !toolbarEl.shadowRoot) return;
      var sr = toolbarEl.shadowRoot;
      var spans = sr.querySelectorAll('span');
      var urlSpan = null;
      for (var i = 0; i < spans.length; i++) {
        var st = spans[i].getAttribute('style') || '';
        if (st.indexOf('flex:1') >= 0 && st.indexOf('color') >= 0) { urlSpan = spans[i]; break; }
      }
      if (!urlSpan) return;
      var wrap = urlSpan.parentElement;
      if (!wrap) return;
      // 输入框
      var inp = wrap.querySelector('input[type="text"]');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'text';
        inp.value = urlSpan.textContent;
        inp.style.cssText = 'flex:1;color:#e8eaed;font-size:13px;font-family:system-ui,sans-serif;background:transparent;border:none;outline:none;padding:0;caret-color:#e8eaed;';
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); bw2HideSuggest(); if (typeof window.handleAddressInput === 'function') window.handleAddressInput(this.value.trim()); }
        });
        inp.addEventListener('focus', function () { try { this.select(); } catch (e) {} });
        inp.addEventListener('input', bw2OnAddrInput);
        urlSpan.parentNode.replaceChild(inp, urlSpan);
      } else if (!inp.__bw2Bound) {
        inp.__bw2Bound = 1;
        inp.addEventListener('input', bw2OnAddrInput);
      }
      // 前进按钮
      if (!document.getElementById('bwNavBack')) {
        var bk = document.createElement('button');
        bk.id = 'bwNavBack';
        bk.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
        bk.style.cssText = 'background:none;border:none;cursor:pointer;color:#777;padding:2px 4px;margin-right:2px;opacity:0.35;display:inline-flex;align-items:center;';
        bk.title = '后退';
        bk.addEventListener('click', function () { if (typeof bwGoBack === 'function') bwGoBack(); });
        wrap.insertBefore(bk, inp);
        window.bwNavBack = bk;
      }
      // 后退按钮
      if (!document.getElementById('bwNavFwd')) {
        var fw = document.createElement('button');
        fw.id = 'bwNavFwd';
        fw.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        fw.style.cssText = 'background:none;border:none;cursor:pointer;color:#777;padding:2px 4px;margin-right:4px;opacity:0.35;display:inline-flex;align-items:center;';
        fw.title = '前进';
        fw.addEventListener('click', function () { if (typeof bwGoForward === 'function') bwGoForward(); });
        wrap.insertBefore(fw, inp);
        window.bwNavFwd = fw;
      }
      // favicon + 安全标识容器
      if (!document.getElementById('bwFavicon')) {
        var favi = document.createElement('span');
        favi.id = 'bwFavicon';
        favi.style.cssText = 'display:inline-flex;align-items:center;margin-right:4px;';
        wrap.insertBefore(favi, inp);
      }
      if (!document.getElementById('bwSecBox')) {
        var secBox = document.createElement('span');
        secBox.id = 'bwSecBox';
        secBox.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-right:6px;color:#555;font-size:12px;font-family:Arial;flex-shrink:0;';
        wrap.insertBefore(secBox, inp);
      }
      // 刷新按钮
      if (!wrap.querySelector('.bw-refresh-btn')) {
        var rbtn = document.createElement('button');
        rbtn.className = 'bw-refresh-btn';
        rbtn.title = '刷新';
        rbtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
        rbtn.style.cssText = 'margin-left:6px;cursor:pointer;background:transparent;border:1px solid #d0d0d0;border-radius:4px;padding:3px 6px;color:#666;display:inline-flex;align-items:center;flex-shrink:0;';
        rbtn.addEventListener('click', function () {
          this.style.transform = 'rotate(360deg)'; this.style.transition = 'transform 0.5s';
          var s = this; setTimeout(function () { s.style.transform = ''; s.style.transition = ''; }, 500);
          if (typeof refreshCurrentView === 'function') refreshCurrentView();
        });
        wrap.appendChild(rbtn);
      }
      // 状态同步
      if (typeof bwUpdateSecBox === 'function') bwUpdateSecBox();
      if (typeof bwUpdateNavBtns === 'function') bwUpdateNavBtns();
    } catch (e) {}
  }

  /* 标签关闭按钮（注入 shadow） */
  function bw2AddTabClose(tabEl) {
    try {
      if (!tabEl || !tabEl.shadowRoot) return;
      var sr = tabEl.shadowRoot;
      var frame = sr.querySelector('div');
      if (!frame || frame.querySelector('.bw-tab-close')) return;
      var x = document.createElement('span');
      x.className = 'bw-tab-close';
      x.textContent = '×';
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        var all = document.querySelectorAll('browser-tab');
        var idx = Array.prototype.indexOf.call(all, tabEl);
        bw2CloseTab(idx);
      });
      frame.appendChild(x);
      frame.addEventListener('mouseenter', function () { x.style.display = 'inline-flex'; });
      frame.addEventListener('mouseleave', function () { x.style.display = 'none'; });
    } catch (e) {}
  }

  /* 标签栏 + 号（注入 shadow） */
  function bw2RebuildTabBar(winEl) {
    try {
      if (!winEl || !winEl.shadowRoot) return;
      var sr = winEl.shadowRoot;
      var bar = null;
      var divs = sr.querySelectorAll('div');
      for (var i = 0; i < divs.length; i++) {
        var st = divs[i].getAttribute('style') || '';
        if (st.indexOf('height:44px') >= 0) { bar = divs[i]; break; }
      }
      if (!bar || bar.querySelector('.bw-tab-new')) return;
      var plus = document.createElement('span');
      plus.className = 'bw-tab-new';
      plus.textContent = '+';
      plus.title = '新建标签页 (Ctrl+T)';
      plus.addEventListener('click', function () { bw2NewTab(); });
      bar.appendChild(plus);
    } catch (e) {}
  }

  function bw2ReinjectAll(winEl) {
    winEl = winEl || bw();
    if (!winEl || !winEl.shadowRoot) return;
    bw2RebuildTabBar(winEl);
    var tb = winEl.shadowRoot.querySelector('browser-toolbar');
    if (tb) bw2ReinjectToolbar(tb);
  }

  /* ========== 浏览器级视图：书签栏 / 新标签页 / 搜索页 / 历史页 ========== */
  var bw2Zone = '';
  var bw2LastQuery = '';

  function bw2EnsureViews() {
    var host = bw();
    if (!host) { setTimeout(bw2EnsureViews, 200); return; }
    if (document.getElementById('bwViewNewtab')) return;
    var firstView = host.querySelector('section.view, .view');
    // 书签栏
    var bm = document.createElement('div');
    bm.className = 'bw-bookmark-bar';
    bm.id = 'bwBookmarkBar';
    bm.innerHTML = '<span class="bw-bm-label">书签栏</span>' +
      '<span class="bw-bm-item" data-bm="qzone"><span class="bw-bm-fav" style="background:#2f5d92;">Q</span>QQ空间</span>' +
      '<span class="bw-bm-item" data-bm="archive" data-zone="archive" style="display:none;"><span class="bw-bm-fav" style="background:#6a8a3a;">档</span>成长档案</span>' +
      '<span class="bw-bm-item" data-bm="history" data-zone="history" style="display:none;"><span class="bw-bm-fav" style="background:#70757a;">历</span>历史记录</span>';
    // 新标签页
    var nt = document.createElement('div');
    nt.className = 'bw-newtab';
    nt.id = 'bwViewNewtab';
    nt.hidden = true;
    nt.innerHTML =
      '<div class="nt-logo">新标签页</div>' +
      '<div class="nt-voidline" style="display:none;"></div>' +
      '<div class="nt-search"><input id="ntInput" type="text" placeholder="搜索或输入网址"><button class="nt-sbtn" id="ntBtn">搜索</button></div>' +
      '<div class="nt-shortcuts">' +
      '<div class="nt-shortcut" data-bm="qzone"><div class="nt-ic" style="background:#dbe7f6;color:#2f5d92;">Q</div>QQ空间</div>' +
      '<div class="nt-shortcut" data-bm="archive" data-zone="archive" style="display:none;"><div class="nt-ic" style="background:#e6eeda;color:#6a8a3a;">档</div>成长档案</div>' +
      '<div class="nt-shortcut" data-bm="history" data-zone="history" style="display:none;"><div class="nt-ic" style="background:#ececec;color:#70757a;">历</div>历史记录</div>' +
      '</div>' +
      '<div class="nt-foot">浏览器由「生长档案」提供 · Ctrl+T 新标签 / Ctrl+W 关闭</div>';
    // 搜索页
    var sc = document.createElement('div');
    sc.className = 'bw-search';
    sc.id = 'bwViewSearch';
    sc.hidden = true;
    sc.innerHTML =
      '<div class="s-head"><div class="s-logo">搜索</div>' +
      '<div class="s-box"><input id="sInput" type="text"><button class="s-sbtn" id="sBtn">搜索</button></div></div>' +
      '<div id="sBody"></div>';
    // 历史页
    var hv = document.createElement('div');
    hv.className = 'bw-history';
    hv.id = 'bwViewHistory';
    hv.hidden = true;
    hv.innerHTML = '<div class="h-title">历史记录</div><div class="h-sub">chrome://history</div><span class="h-clear" id="hClear">清除浏览数据</span><div id="hBody"></div>';
    // 插入（书签栏在最上，然后浏览器级 view，再游戏 view）
    host.insertBefore(hv, firstView);
    host.insertBefore(sc, firstView);
    host.insertBefore(nt, firstView);
    host.insertBefore(bm, firstView);
    // 书签点击
    bm.addEventListener('click', function (e) {
      var it = e.target.closest('.bw-bm-item');
      if (it) bw2GoBookmark(it.getAttribute('data-bm'));
    });
    // 新标签页交互
    var ntInp = document.getElementById('ntInput');
    if (ntInp) {
      ntInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); bw2ShowSearch(this.value.trim()); }
      });
      document.getElementById('ntBtn').addEventListener('click', function () { bw2ShowSearch(ntInp.value.trim()); });
      nt.querySelectorAll('.nt-shortcut').forEach(function (s) {
        s.addEventListener('click', function () { bw2GoBookmark(this.getAttribute('data-bm')); });
      });
    }
    // 搜索页交互
    var sInp = document.getElementById('sInput');
    if (sInp) {
      sInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); bw2ShowSearch(this.value.trim()); }
      });
      document.getElementById('sBtn').addEventListener('click', function () { bw2ShowSearch(sInp.value.trim()); });
    }
    // 清除历史
    document.getElementById('hClear').addEventListener('click', function () {
      if (typeof bwAlert === 'function') bwAlert('清除浏览数据\n\n正在清除 ' + (document.querySelectorAll('#hBody .h-row').length || 12) + ' 条记录…\n\n[失败] 有 2 条记录被锁定，无法清除。\n（这些记录正在被写入。）', 'warn');
      bw2RenderHistory();
    });
  }

  /* 渐进式刷新书签栏和新标签页快捷方式：只显示已解锁章节 */
  function bw2RefreshBookmarks() {
    try {
      var unlocked = (typeof window.getUnlockedChapters === 'function') ? window.getUnlockedChapters() : ['qzone'];
      function _showZone(el) {
        var zone = el.getAttribute('data-zone');
        if (zone === 'history') {
          /* 历史记录：进入第二章后才显示 */
          el.style.display = (unlocked.indexOf('archive') >= 0) ? '' : 'none';
        } else {
          el.style.display = (unlocked.indexOf(zone) >= 0) ? '' : 'none';
        }
      }
      /* 书签栏 */
      var bm = document.getElementById('bwBookmarkBar');
      if (bm) {
        var items = bm.querySelectorAll('.bw-bm-item[data-zone]');
        for (var i = 0; i < items.length; i++) _showZone(items[i]);
      }
      /* 新标签页快捷方式 */
      var nt = document.getElementById('bwViewNewtab');
      if (nt) {
        var scs = nt.querySelectorAll('.nt-shortcut[data-zone]');
        for (var j = 0; j < scs.length; j++) _showZone(scs[j]);
      }
    } catch (e) {}
  }

  function bw2GoBookmark(kind) {
    if (kind === 'qzone') { location.hash = '#/qzone'; }
    else if (kind === 'archive') { location.hash = '#/archive'; }
    else if (kind === 'history') { bw2ShowHistory(); }
    else if (kind === 'void') { if (typeof bwAlert === 'function') bwAlert('无法打开书签。\n\n目标地址已不存在。', 'warn'); }
  }

  function bw2SetZone(zone) {
    bw2Zone = zone;
    var nt = document.getElementById('bwViewNewtab');
    var sc = document.getElementById('bwViewSearch');
    var hv = document.getElementById('bwViewHistory');
    if (nt) nt.hidden = zone !== 'newtab';
    if (sc) sc.hidden = zone !== 'search';
    if (hv) hv.hidden = zone !== 'history';
    var gv = [document.getElementById('view-qzone'), document.getElementById('view-archive'), document.getElementById('view-hospital')];
    for (var gi = 0; gi < gv.length; gi++) {
      if (gv[gi]) gv[gi].hidden = (zone === 'newtab' || zone === 'search' || zone === 'history');
    }
    var b = bw();
    if (!b) return;
    if (zone === 'newtab') { b.setAttribute('url', '新标签页'); bw2SetTabTitle('新标签页'); }
    else if (zone === 'search') { b.setAttribute('url', 'search.growth-archive.cn/s?wd=' + encodeURIComponent(bw2LastQuery || '')); bw2SetTabTitle('搜索 - ' + (bw2LastQuery || '')); }
    else if (zone === 'history') { b.setAttribute('url', 'chrome://history'); bw2SetTabTitle('历史记录'); }
    else if (typeof go === 'function' && typeof parseRoute === 'function') {
      try { go(parseRoute(location.hash)); } catch (e) {}
    }
  }

  function bw2SetZoneVoid() {
    bw2Zone = 'newtab';
    var nt = document.getElementById('bwViewNewtab');
    if (nt) { nt.hidden = false; nt.classList.add('void'); var vl = nt.querySelector('.nt-voidline'); if (vl) { vl.style.display = 'block'; vl.textContent = '你还在这里吗'; } }
    var sc = document.getElementById('bwViewSearch'); if (sc) sc.hidden = true;
    var hv = document.getElementById('bwViewHistory'); if (hv) hv.hidden = true;
    var q2 = document.getElementById('view-qzone'); if (q2) q2.hidden = true;
    var a2 = document.getElementById('view-archive'); if (a2) a2.hidden = true;
    var h2 = document.getElementById('view-hospital'); if (h2) h2.hidden = true;
    var b = bw(); if (b) { b.setAttribute('url', '新标签页'); }
    bw2SetTabTitle('…');
  }

  function bw2SetTabTitle(t, idx) {
    try {
      var tabs = document.querySelectorAll('browser-tab');
      var i = (typeof idx === 'number') ? idx : parseInt(bw().getAttribute('active-index') || '0', 10);
      if (tabs[i]) tabs[i].setAttribute('title', t);
      if (typeof bwUpdateTabTitle === 'function') bwUpdateTabTitle(t, i);
    } catch (e) {}
  }

  function bw2EnsureBrowserTab(title, zone) {
    var tabs = document.querySelectorAll('browser-tab');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-bw2zone') === zone) return i;
    }
    var t = document.createElement('browser-tab');
    t.setAttribute('title', title);
    t.setAttribute('data-bw2zone', zone);
    bw().appendChild(t);
    return document.querySelectorAll('browser-tab').length - 1;
  }

  function bw2ShowNewtab() {
    var idx = bw2EnsureBrowserTab('新标签页', 'newtab');
    bw().setAttribute('active-index', String(idx));
    bw2SetZone('newtab');
  }
  function bw2NewTab() { bw2ShowNewtab(); }
  function bw2ShowSearch(q) {
    bw2LastQuery = q || '';
    var idx = bw2EnsureBrowserTab('搜索 - ' + bw2LastQuery, 'search');
    bw().setAttribute('active-index', String(idx));
    bw2SetZone('search');
    bw2RenderSearch(bw2LastQuery);
    var inp = document.getElementById('sInput');
    if (inp) inp.value = bw2LastQuery;
  }
  function bw2ShowHistory() {
    var idx = bw2EnsureBrowserTab('历史记录', 'history');
    bw().setAttribute('active-index', String(idx));
    bw2SetZone('history');
    bw2RenderHistory();
  }

  /* 标签关闭 */
  function bw2CloseTab(idx) {
    var tabs = document.querySelectorAll('browser-tab');
    if (!tabs[idx]) return;
    var active = parseInt(bw().getAttribute('active-index') || '0', 10);
    bw().removeChild(tabs[idx]);
    var after = document.querySelectorAll('browser-tab');
    if (after.length === 0) {
      var t = document.createElement('browser-tab');
      t.setAttribute('title', '新标签页');
      t.setAttribute('data-bw2zone', 'newtab');
      bw().appendChild(t);
      bw().setAttribute('active-index', '0');
      bw2SetZone('newtab');
      return;
    }
    if (idx < active) { bw().setAttribute('active-index', String(active - 1)); }
    else if (idx === active) {
      var ni = Math.min(active, after.length - 1);
      bw().setAttribute('active-index', String(ni));
      var t2 = after[ni];
      var z = t2.getAttribute('data-bw2zone');
      if (z === 'newtab') bw2SetZone('newtab');
      else if (z === 'search') bw2SetZone('search');
      else if (z === 'history') bw2SetZone('history');
      else if (z === 'void') bw2SetZoneVoid();
      else {
        var route = ni === 0 ? '#/qzone' : (ni === 1 ? '#/archive' : '#/hospital/' + ((typeof c3CurrentMod !== 'undefined' && c3CurrentMod) ? c3CurrentMod : 'intake'));
        bw2Zone = '';
        var nx = document.getElementById('bwViewNewtab'); if (nx) nx.hidden = true;
        var sx = document.getElementById('bwViewSearch'); if (sx) sx.hidden = true;
        var hx = document.getElementById('bwViewHistory'); if (hx) hx.hidden = true;
        var qx = document.getElementById('view-qzone'); if (qx) qx.hidden = false;
        var ax = document.getElementById('view-archive'); if (ax) ax.hidden = false;
        var hpx = document.getElementById('view-hospital'); if (hpx) hpx.hidden = false;
        if (location.hash === route) {
          var r2 = null; try { r2 = parseRoute(route); } catch (e) {}
          if (r2 && typeof go === 'function') { try { go(r2); } catch (e) {} }
        } else {
          location.hash = route;
        }
      }
    }
  }

  /* ========== 新标签页 / 搜索 / 历史渲染 ========== */
  function bw2PageName(p) {
    return { home: '主页', logs: '日志', moments: '说说', albums: '相册', guestbook: '留言板', music: '音乐' }[p] || p;
  }
  function bw2RenderSearch(q) {
    var body = document.getElementById('sBody');
    if (!body) return;
    var u = (q || '').toLowerCase();
    var nRes = (u.indexOf('拾光客') >= 0 || u.indexOf('林远') >= 0 || u.indexOf('档案') >= 0 || u.indexOf('成长') >= 0) ? 4 : 0;
    var html = '<div class="s-meta">约 ' + nRes + ' 条结果（0.03 秒） · 搜索“' + esc2(q) + '”</div>';
    if (u.indexOf('拾光客') >= 0 || u.indexOf('7788166') >= 0 || u.indexOf('qzone') >= 0) {
      html += '<div class="s-result"><div class="s-url">user.qzone.qq.com/7788166</div><div class="s-title">拾光客 的空间 - QQ空间</div><div class="s-desc">有些事，不说出来，就永远没人知道了。最近更新：2026-09-03</div></div>';
      html += '<div class="s-result"><div class="s-url">tieba.baidu.com/f?kw=射阳</div><div class="s-title">【讨论】有人在找“拾光客”吗？</div><div class="s-desc">最后回复：2026-09-03 02:13 · “别找了。”</div></div>';
      html += '<div class="s-result eerie"><div class="s-url">www.chengzhangdangan.com/archive/czda_0127</div><div class="s-title">成长档案 - 记录 #0127（已关停）</div><div class="s-desc">该站点已停止服务。页面快照显示最后修改时间：2026-09-03 02:13:14</div></div>';
      html += '<div class="s-warn">提示：搜索结果中有 1 条记录与你无关，但已被标记为“已读”。</div>';
    } else if (u.indexOf('林远') >= 0 || u.indexOf('linyuan') >= 0) {
      html += '<div class="s-result eerie"><div class="s-url">user.qzone.qq.com/7788166</div><div class="s-title">林远 - 搜索结果（1 条已删除）</div><div class="s-desc">该用户的所有公开记录均已被删除。最近一条：2026-09-03 02:13 “我不想消失”</div></div>';
      html += '<div class="s-warn">警告：搜索词已被记录。浏览此页面的行为将被同步。</div>';
    } else if (u.indexOf('chengzhang') >= 0 || u.indexOf('dangan') >= 0 || u.indexOf('成长档案') >= 0) {
      html += '<div class="s-result"><div class="s-url">www.chengzhangdangan.com</div><div class="s-title">成长档案 - 历史存档查询系统</div><div class="s-desc">站点已关停（2015-06-30）。备案信息：苏ICP备2008****号</div></div>';
      html += '<div class="s-result eerie"><div class="s-url">www.syeb-archive.cn/record/czda_0127</div><div class="s-title">儿保归档 - 入园体检表（续）</div><div class="s-desc">随访记录持续至 2026 年。账号 0126 最近一次写入：今天</div></div>';
    } else if (u.indexOf('成长') >= 0 || u.indexOf('档案') >= 0) {
      html += '<div class="s-result eerie"><div class="s-url">www.chengzhangdangan.com</div><div class="s-title">成长档案</div><div class="s-desc">（已关停）</div></div>';
    } else {
      html += '<div class="s-none">没有找到与“' + esc2(q) + '”相关的结果。<br>建议：检查关键词，或换一个说法再试。</div>';
      html += '<div class="s-warn">（系统记录：本词条 0 结果。你确定你搜的是这个词吗？）</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll('.s-result .s-title').forEach(function (t) {
      t.addEventListener('click', function () {
        var ue = (this.parentNode.querySelector('.s-url').textContent || '').toLowerCase();
        if (ue.indexOf('qzone') >= 0) location.hash = '#/qzone';
        else if (ue.indexOf('chengzhang') >= 0) location.hash = '#/archive';
        else if (ue.indexOf('syeb') >= 0) location.hash = '#/hospital/intake';
      });
    });
  }

  function bw2RenderHistory() {
    var body = document.getElementById('hBody');
    if (!body) return;
    var now = new Date();
    var hm = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    var html = '<div class="h-day">今天</div>';
    var hist = (typeof bwHistory !== 'undefined' && Array.isArray(bwHistory)) ? bwHistory : [];
    hist.forEach(function (r) {
      var name = '', url = '', ic = '🌐', route = '#/qzone';
      if (r.zone === 'qzone') { name = '拾光客的空间' + (r.page && r.page !== 'home' ? ' - ' + bw2PageName(r.page) : ''); url = 'user.qzone.qq.com/7788166' + (r.page && r.page !== 'home' ? '/' + r.page : ''); ic = 'Q'; route = '#/qzone' + (r.page && r.page !== 'home' ? '/' + r.page : ''); }
      else if (r.zone === 'archive') { name = '成长档案 - 历史存档查询'; url = 'www.chengzhangdangan.com'; ic = '档'; route = '#/archive'; }
      else if (r.zone === 'hospital') { name = '儿保归档 - ' + ((typeof c3ModTitles !== 'undefined' && c3ModTitles[r.mod]) || '入园体检表'); url = 'www.syeb-archive.cn/record/czda_0127'; ic = '医'; route = '#/hospital/' + (r.mod || 'intake'); }
      html += '<div class="h-row" data-route="' + route + '"><div class="h-ic">' + ic + '</div><div class="h-name">' + esc2(name) + '</div><div class="h-url">' + esc2(url) + '</div><div class="h-time">' + hm + '</div></div>';
    });
    html += '<div class="h-row locked" data-route="#/archive"><div class="h-ic">?</div><div class="h-name">未知访客 · 停留 47 分钟</div><div class="h-url">www.chengzhangdangan.com/archive/czda_0127</div><div class="h-time">02:13</div></div>';
    html += '<div class="h-row locked" data-route="#/archive"><div class="h-ic">林</div><div class="h-name">林远（已注销）</div><div class="h-url">user.qzone.qq.com/77****26</div><div class="h-time">02:13</div></div>';
    body.innerHTML = html;
    body.querySelectorAll('.h-row[data-route]').forEach(function (r) {
      r.addEventListener('click', function () { location.hash = this.getAttribute('data-route'); });
    });
  }


  /* ========== DNS 错误页 / 断网模拟 ========== */
  function bw2ShowDNS(url) {
    bw2HideSuggest();
    var view = bw2ActiveView();
    if (!view) {
      var zids = ['bwViewNewtab', 'bwViewSearch', 'bwViewHistory'];
      for (var zi = 0; zi < zids.length; zi++) {
        var zv = document.getElementById(zids[zi]);
        if (zv && !zv.hidden) { view = zv; break; }
      }
    }
    if (!view) return;
    bw2RemoveOverlay(view, 'bw2-dns');
    var el = document.createElement('div');
    el.className = 'bw-dns';
    el.id = 'bw2-dns';
    el.innerHTML =
      '<div class="dns-icon">⚠</div>' +
      '<div class="dns-title">无法访问此网站</div>' +
      '<div class="dns-host">' + esc2(url) + '</div>' +
      '<div class="dns-desc">未找到该网站的服务器 IP 地址。请检查您的网络连接，或确认网址拼写是否正确。</div>' +
      '<div class="dns-code">ERR_NAME_NOT_RESOLVED</div>' +
      '<div class="dns-btn-row"><button class="dns-btn" id="bw2DnsReload">重新加载</button><button class="dns-btn ghost" id="bw2DnsCheck">检查网络连接</button></div>';
    view.appendChild(el);
    var b = bw();
    if (b) b.setAttribute('url', url);

    document.getElementById('bw2DnsReload').addEventListener('click', function () {
      bw2RemoveOverlay(view, 'bw2-dns');
      if (typeof window.handleAddressInput === 'function') window.handleAddressInput(url);
    });
    document.getElementById('bw2DnsCheck').addEventListener('click', function () {
      if (typeof bwAlert === 'function') bwAlert('网络诊断完成\n\n未发现问题。\n（该网站确实不存在。）', 'warn');
    });
    try { if (typeof beep === 'function') beep(300, 0.12); } catch (e) {}
  }

  function bw2ShowOffline(view) {
    if (!view) {
      var zids2 = ['bwViewNewtab', 'bwViewSearch', 'bwViewHistory'];
      for (var zi2 = 0; zi2 < zids2.length; zi2++) {
        var zv2 = document.getElementById(zids2[zi2]);
        if (zv2 && !zv2.hidden) { view = zv2; break; }
      }
    }
    if (!view) return;
    bw2RemoveOverlay(view, 'bw2-offline');
    var el = document.createElement('div');
    el.className = 'bw-offline';
    el.id = 'bw2-offline';
    el.innerHTML =
      '<div class="off-dino"><svg viewBox="0 0 88 88"><rect x="10" y="40" width="8" height="24" fill="#6f6f6f"/><rect x="18" y="32" width="8" height="32" fill="#6f6f6f"/><rect x="26" y="28" width="8" height="40" fill="#6f6f6f"/><rect x="34" y="24" width="16" height="44" fill="#6f6f6f"/><rect x="50" y="32" width="8" height="36" fill="#6f6f6f"/><rect x="58" y="28" width="8" height="40" fill="#6f6f6f"/><rect x="66" y="32" width="8" height="32" fill="#6f6f6f"/><rect x="74" y="40" width="6" height="20" fill="#6f6f6f"/><circle cx="26" cy="18" r="6" fill="#6f6f6f"/><circle cx="26" cy="18" r="2.5" fill="#fff"/><rect x="16" y="68" width="10" height="6" fill="#6f6f6f"/><rect x="58" y="68" width="10" height="6" fill="#6f6f6f"/><rect x="8" y="74" width="72" height="4" fill="#c8ccd0"/></svg></div>' +
      '<div class="off-title">您尚未连接到互联网</div>' +
      '<div class="off-desc">请检查网络连接，然后重试。<br>离线小游戏：点击小恐龙</div>' +
      '<button class="off-btn" id="bw2OffReload">重新加载</button>' +
      '<div class="off-hint">ERR_INTERNET_DISCONNECTED</div>';
    view.appendChild(el);
    var dino = el.querySelector('.off-dino');
    dino.style.cursor = 'pointer';
    dino.addEventListener('click', function () {
      this.style.transition = 'transform 0.2s';
      this.style.transform = 'translateY(-14px)';
      var d = this;
      setTimeout(function () { d.style.transform = ''; }, 280);
      try { if (typeof beep === 'function') beep(880, 0.08); } catch (e) {}
    });
    document.getElementById('bw2OffReload').addEventListener('click', function () {
      bw2RemoveOverlay(view, 'bw2-offline');
      if (typeof bwShowSSL === 'function') bwShowSSL();
      try { if (typeof beep === 'function') beep(600, 0.15); } catch (e) {}
    });
  }

  /* ========== 地址栏自动补全 / 搜索建议 ========== */
  function bw2HideSuggest() {
    var s = document.getElementById('bw2Suggest');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }
  function bw2OnAddrInput(e) {
    try {
      var v = e.target.value.trim();
      if (!v) { bw2HideSuggest(); return; }
      var rect = e.target.getBoundingClientRect();
      var u = v.toLowerCase();
      var items = [];
      var sites = [
        { k: 'qzone', kw: ['qzone', 'qq', '7788166', '拾光客'], url: 'user.qzone.qq.com/7788166', name: '拾光客的空间' },
        { k: 'archive', kw: ['chengzhang', 'dangan', 'archive', '成长', '档案'], url: 'www.chengzhangdangan.com', name: '成长档案' },
        { k: 'hospital', kw: ['hospital', 'syeb', '医院', '儿保'], url: 'www.syeb-archive.cn', name: '儿保归档' }
      ];
      /* 渐进式：地址栏补全只提示已解锁的站点 */
      var _unlocked = (typeof window.getUnlockedChapters === 'function') ? window.getUnlockedChapters() : ['qzone'];
      sites = sites.filter(function (s) { return _unlocked.indexOf(s.k) >= 0; });
      var matched = null;
      for (var i = 0; i < sites.length && !matched; i++) {
        for (var j = 0; j < sites[i].kw.length; j++) {
          if (u.indexOf(sites[i].kw[j]) >= 0) { matched = sites[i]; break; }
        }
      }
      if (matched) items.push({ icon: '↗', text: matched.name, url: matched.url, go: matched.k });
      if (/^[\w-]+(\.[\w-]+)+/.test(u)) items.push({ icon: '↗', text: '访问 ' + v, url: v, dns: true });
      items.push({ icon: '🔍', text: '搜索 “' + v + '”', search: true });
      var sug = document.getElementById('bw2Suggest');
      if (!sug) {
        sug = document.createElement('div');
        sug.className = 'bw-suggest';
        sug.id = 'bw2Suggest';
        document.body.appendChild(sug);
      }
      sug.innerHTML = '';
      items.forEach(function (it) {
        var d = document.createElement('div');
        d.className = 'sg-item';
        d.innerHTML = '<span class="sg-ic">' + it.icon + '</span><span>' + esc2(it.text) + '</span>' + (it.url ? '<span class="sg-url">' + esc2(it.url) + '</span>' : '');
        d.addEventListener('click', function () {
          bw2HideSuggest();
          if (it.search) { if (typeof bw2ShowSearch === 'function') bw2ShowSearch(v); }
          else if (it.dns) { if (typeof bw2ShowDNS === 'function') bw2ShowDNS(v); }
          else if (it.go === 'qzone') location.hash = '#/qzone';
          else if (it.go === 'archive') location.hash = '#/archive';
          else if (it.go === 'hospital') location.hash = '#/hospital/intake';
        });
        sug.appendChild(d);
      });
      var w = Math.max(rect.width, 340);
      sug.style.width = w + 'px';
      sug.style.left = Math.min(rect.left, window.innerWidth - w - 8) + 'px';
      sug.style.top = (rect.bottom + 6) + 'px';
    } catch (err) {}
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#bw2Suggest')) return;
    bw2HideSuggest();
  });

  /* ========== 快捷键 ========== */
  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    var k = (e.key || '').toLowerCase();
    if (k === 'l') { e.preventDefault(); bw2FocusAddr(); }
    else if (k === 'r') { e.preventDefault(); if (typeof refreshCurrentView === 'function') refreshCurrentView(); }
    else if (k === 't') { e.preventDefault(); bw2NewTab(); }
    else if (k === 'w') { e.preventDefault(); bw2CloseActiveTab(); }
    else if (k === 'd') { e.preventDefault(); bw2AddGhostBookmark(); }
  });
  function bw2FocusAddr() {
    var b = bw();
    if (!b || !b.shadowRoot) return;
    var tb = b.shadowRoot.querySelector('browser-toolbar');
    var inp = tb && tb.shadowRoot ? tb.shadowRoot.querySelector('input[type="text"]') : null;
    if (inp) { inp.focus(); try { inp.select(); } catch (e) {} }
  }
  function bw2CloseActiveTab() {
    var ai = parseInt(bw().getAttribute('active-index') || '0', 10);
    bw2CloseTab(ai);
  }
  function bw2AddGhostBookmark() {
    var bar = document.getElementById('bwBookmarkBar');
    if (!bar) return;
    var existing = bar.querySelector('.bw-bm-item.ghost');
    if (existing) {
      if (typeof bwAlert === 'function') bwAlert('此页面已被收藏。', 'info');
      return;
    }
    var it = document.createElement('span');
    it.className = 'bw-bm-item ghost';
    it.setAttribute('data-bm', 'void');
    it.innerHTML = '<span class="bw-bm-fav">…</span>未命名书签';
    bar.appendChild(it);
    try { if (typeof beep === 'function') beep(); } catch (e) {}
  }

  /* ========== 自开标签事件（花屏后幽灵标签） ========== */
  function bw2GhostTab() {
    try {
      var tabs = document.querySelectorAll('browser-tab');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('data-bw2zone') === 'void') return;
      }
      var ai = parseInt(bw().getAttribute('active-index') || '0', 10);
      var t = document.createElement('browser-tab');
      t.setAttribute('title', '…');
      t.setAttribute('data-bw2zone', 'void');
      bw().appendChild(t);
      var idx = document.querySelectorAll('browser-tab').length - 1;
      bw().setAttribute('active-index', String(idx));
      var nt = document.getElementById('bwViewNewtab');
      if (nt) {
        bw2SetZoneVoid();
      }
      setTimeout(function () {
        bw().setAttribute('active-index', String(ai));
        if (nt) {
          nt.classList.remove('void');
          var vl = nt.querySelector('.nt-voidline');
          if (vl) { vl.style.display = 'none'; vl.textContent = ''; }
        }
        var r = null;
        try { r = parseRoute(location.hash); } catch (e) {}
        if (r && r.zone && typeof go === 'function') { try { go(r); } catch (e) {} }
      }, 1200);
    } catch (e) {}
  }
  try {
    if (typeof bwGlitch === 'function' && !window.__bw2GlitchWrapped) {
      var og = bwGlitch;
      window.bwGlitch = function () {
        og.apply(this, arguments);
        setTimeout(bw2GhostTab, 500);
      };
      window.__bw2GlitchWrapped = true;
    }
  } catch (e) {}

  /* ========== 刷新内容微变（QQ 空间"活"的） ========== */
  function bw2QzoneRefreshFX() {
    try {
      var visits = document.querySelector('.banner-visits');
      if (visits) {
        var m = visits.textContent.match(/([\d,]+)/);
        if (m) {
          var n = parseInt(m[1].replace(/,/g, ''), 10) + 1 + Math.floor(Math.random() * 3);
          visits.textContent = '访问量：' + n.toLocaleString('en-US');
        }
      }
      var cnt = 0;
      try { cnt = parseInt(localStorage.getItem('grow_refresh_qzone') || '0', 10) || 0; } catch (e) {}
      cnt++;
      try { localStorage.setItem('grow_refresh_qzone', String(cnt)); } catch (e) {}
      if (cnt === 2) {
        var gb = document.getElementById('gbList');
        if (gb && !document.getElementById('gbDeletedLine')) {
          var li = document.createElement('p');
          li.id = 'gbDeletedLine';
          li.style.cssText = 'color:#999;font-size:12px;border-left:2px solid #ddd;padding-left:8px;margin:6px 0;';
          li.textContent = '（该留言已被删除） · 访客 47***21 于 02:13 留言后删除';
          gb.insertBefore(li, gb.firstChild);
        }
      }
    } catch (e) {}
  }

  /* ========== 标签点击（bw2 标签，捕获阶段先处理） ========== */
  var hostEl = bw();
  if (hostEl) {
    hostEl.addEventListener('click', function (e) {
      var tab = e.target.closest ? e.target.closest('browser-tab') : null;
      if (!tab) return;
      e.stopPropagation();
      var all = document.querySelectorAll('browser-tab');
      var idx = Array.prototype.indexOf.call(all, tab);
      var zone = tab.getAttribute('data-bw2zone');
      bw().setAttribute('active-index', String(idx));
      if (zone === 'newtab') { bw2SetZone('newtab'); return; }
      if (zone === 'search') { bw2SetZone('search'); return; }
      if (zone === 'history') { bw2SetZone('history'); return; }
      if (zone === 'void') { bw2SetZoneVoid(); return; }
      /* 游戏 tab：按标题恢复对应章节视图 */
      var ttl = tab.getAttribute('title') || '';
      var groute = null;
      if (ttl.indexOf('拾光客') >= 0 || ttl.indexOf('空间') >= 0) groute = '#/qzone';
      else if (ttl.indexOf('成长档案') >= 0) groute = '#/archive';
      else if (ttl.indexOf('儿保') >= 0 || ttl.indexOf('医院') >= 0 || ttl.indexOf('归档') >= 0) groute = '#/hospital/' + ((typeof c3CurrentMod !== 'undefined' && c3CurrentMod) ? c3CurrentMod : 'intake');
      else if (ttl.indexOf('信号') >= 0 || ttl.indexOf('系统通告') >= 0) groute = (localStorage.getItem('grow_c5_done_v1') === '1') ? '#/ending' : '#/signal';
      if (!groute) return;
      bw2Zone = '';
      var nx = document.getElementById('bwViewNewtab'); if (nx) nx.hidden = true;
      var sx = document.getElementById('bwViewSearch'); if (sx) sx.hidden = true;
      var hx = document.getElementById('bwViewHistory'); if (hx) hx.hidden = true;
      var qx = document.getElementById('view-qzone'); if (qx) qx.hidden = false;
      var ax = document.getElementById('view-archive'); if (ax) ax.hidden = false;
      var hpx = document.getElementById('view-hospital'); if (hpx) hpx.hidden = false;
      if (location.hash === groute) {
        var r2 = null; try { r2 = parseRoute(groute); } catch (e) {}
        if (r2 && typeof go === 'function') { try { go(r2); } catch (e) {} }
      } else {
        location.hash = groute;
      }
    }, true);
  }

  /* ========== 游戏路由恢复时收起浏览器级 view ========== */
  window.addEventListener('hashchange', function () {
    if (bw2Zone !== '') {
      bw2Zone = '';
      var nt = document.getElementById('bwViewNewtab'); if (nt) nt.hidden = true;
      var sc = document.getElementById('bwViewSearch'); if (sc) sc.hidden = true;
      var hv = document.getElementById('bwViewHistory'); if (hv) hv.hidden = true;
    }
  });

  /* ========== 第二章首次进入：断网模拟 ========== */
  var bw2OfflineDone = false;
  try { bw2OfflineDone = localStorage.getItem('grow_bw2_offline_v1') === '1'; } catch (e) {}
  window.addEventListener('hashchange', function () {
    var h = location.hash;
    if (h.indexOf('#/archive') === 0 && !bw2OfflineDone) {
      var am = document.getElementById('archiveMain');
      var loggedIn = false;
      try { loggedIn = localStorage.getItem('grow_c2_login_v1') === '1'; } catch (e) {}
      if (!loggedIn) {
        bw2OfflineDone = true;
        try { localStorage.setItem('grow_bw2_offline_v1', '1'); } catch (e) {}
        setTimeout(function () { bw2ShowOffline(document.getElementById('view-archive')); }, 600);
      }
    }
  });

  /* ========== 全局点击音效（轻） ========== */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-route]') : null;
    if (a && typeof beep === 'function') { try { beep(); } catch (err) {} }
  }, true);

  /* ========== 导出到 window（主脚本补丁经 typeof 检查后调用） ========== */
  window.bw2ShowNewtab = bw2ShowNewtab;
  window.bw2NewTab = bw2NewTab;
  window.bw2ShowSearch = bw2ShowSearch;
  window.bw2ShowHistory = bw2ShowHistory;
  window.bw2CloseTab = bw2CloseTab;
  window.bw2ShowDNS = bw2ShowDNS;
  window.bw2ShowOffline = bw2ShowOffline;
  window.bw2QzoneRefreshFX = bw2QzoneRefreshFX;
  window.bw2RefreshBookmarks = bw2RefreshBookmarks;
  window.bw2GoBookmark = bw2GoBookmark;
  window.bw2SetZone = bw2SetZone;
  window.bw2FocusAddr = bw2FocusAddr;
  window.bw2HideSuggest = bw2HideSuggest;
  window.bw2RenderHistory = bw2RenderHistory;
  window.bw2RenderSearch = bw2RenderSearch;
  window.bw2OnAddrInput = bw2OnAddrInput;
  /* ========== 初始化 ========== */
  /* 加载时若直接落在第二章(#/archive)且未登录，也触发一次断网模拟 */
  setTimeout(function () {
    var h0 = location.hash;
    if (h0.indexOf('#/archive') === 0 && !bw2OfflineDone) {
      var lg = false;
      try { lg = localStorage.getItem('grow_c2_login_v1') === '1'; } catch (e) {}
      if (!lg) {
        bw2OfflineDone = true;
        try { localStorage.setItem('grow_bw2_offline_v1', '1'); } catch (e) {}
        setTimeout(function () { bw2ShowOffline(document.getElementById('view-archive')); }, 600);
      }
    }
  }, 400);
  document.documentElement.classList.add('bw2-scroll');
  bw2PatchSDK();
  bw2EnsureViews();
  bw2RefreshBookmarks();
  setTimeout(function () {
    try {
      var b = bw();
      if (b && b.shadowRoot) bw2ReinjectAll(b);
    } catch (e) {}
  }, 600);
  setTimeout(function () {
    try { bw2ReinjectAll(); } catch (e) {}
  }, 1500);
})();

/* ================================================================
   越界行为层（bw3）· 浏览器开始不听话
   地址栏自输入 / 历史幽灵记录 / 标签自开自关 / 访问量自跳 / 标题闪烁 / 下载异变
   全部事件有冷却与去重，低概率触发，不干扰正常操作
   ================================================================ */
(function () {
  if (window.__bw3Loaded) return;
  window.__bw3Loaded = true;

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function bw() { return document.getElementById('browser'); }
  function addrInput() {
    var b = bw(); if (!b) return null;
    var tb = b.shadowRoot && b.shadowRoot.querySelector('browser-toolbar');
    if (!tb) return null;
    return tb.shadowRoot && tb.shadowRoot.querySelector('input[type=text]');
  }
  function qzoneVisible() {
    var q = document.getElementById('view-qzone');
    return q && !q.hidden;
  }
  function forceRerender() {
    var b = bw(); if (!b) return;
    try {
      var cur = b.getAttribute('active-index') || '0';
      b.setAttribute('active-index', cur === '0' ? '1' : '0');
      b.setAttribute('active-index', cur);
    } catch (e) {}
  }

  /* ---- 1. 地址栏自输入：QQ 空间停留 > 90s 后逐字输入访客 URL ---- */
  var typingDone = LS.get('grow_bw3_typing_v1') === '1';
  var qzoneStayStart = Date.now();
  setInterval(function () {
    if (typingDone) return;
    if (!qzoneVisible()) { qzoneStayStart = Date.now(); return; }
    if (Date.now() - qzoneStayStart < 90000) return;
    var inp = addrInput();
    if (inp && inp === document.activeElement) return;
    typingDone = true;
    LS.set('grow_bw3_typing_v1', '1');
    var target = 'user.qzone.qq.com/7788166?visitor=0126';
    var i = 0;
    var iv = setInterval(function () {
      var inp2 = addrInput();
      if (!inp2) { clearInterval(iv); return; }
      inp2.value = target.slice(0, ++i);
      if (i >= target.length) {
        clearInterval(iv);
        setTimeout(function () {
          var inp3 = addrInput();
          if (inp3 && inp3.value === target) inp3.value = '';
        }, 2200);
      }
    }, 85);
  }, 5000);

  /* ---- 2. 历史幽灵记录：打开历史页时 30% 概率插入"你没有访问过这里" ---- */
  var ghostHistDone = LS.get('grow_bw3_ghosthist_v1') === '1';
  var histCheck = setInterval(function () {
    var hv = document.getElementById('bwViewHistory');
    if (!hv || hv.hidden) return;
    if (ghostHistDone) { clearInterval(histCheck); return; }
    if (Math.random() > 0.3) return;
    ghostHistDone = true;
    LS.set('grow_bw3_ghosthist_v1', '1');
    var body = document.getElementById('hBody');
    if (!body) return;
    var row = document.createElement('div');
    row.className = 'h-row locked';
    row.setAttribute('data-route', 'void');
    row.innerHTML = '<div class="h-time">02:13</div><div class="h-title">林远的空间 — 你没有访问过这里</div><div class="h-url">user.qzone.qq.com/linyuan</div>';
    body.insertBefore(row, body.firstChild);
  }, 2000);

  /* ---- 3. 标签自开自关：余光可见，不切换 active ---- */
  var selfTabCooldown = 0;
  setInterval(function () {
    if (Date.now() < selfTabCooldown) return;
    if (Math.random() > 0.015) return;
    selfTabCooldown = Date.now() + 120000;
    var b = bw(); if (!b) return;
    var nt = document.createElement('browser-tab');
    nt.setAttribute('title', '…');
    nt.setAttribute('data-bw2zone', 'void');
    b.appendChild(nt);
    forceRerender();
    setTimeout(function () {
      if (nt.parentNode) nt.parentNode.removeChild(nt);
      forceRerender();
    }, 2200);
  }, 10000);

  /* ---- 4. 访问量自跳：不刷新时偶尔 +1 ---- */
  setInterval(function () {
    if (!qzoneVisible()) return;
    if (Math.random() > 0.08) return;
    var v = document.querySelector('.banner-visits');
    if (!v) return;
    var m = v.textContent.match(/([\d,]+)/);
    if (!m) return;
    var n = parseInt(m[1].replace(/,/g, ''), 10) + 1;
    v.textContent = '访问量：' + n.toLocaleString();
  }, 15000);

  /* ---- 5. 标题闪烁：第一个标签标题偶尔变 … ---- */
  var titleCooldown = 0;
  setInterval(function () {
    if (Date.now() < titleCooldown) return;
    if (Math.random() > 0.02) return;
    titleCooldown = Date.now() + 90000;
    var b = bw(); if (!b) return;
    var tab0 = b.querySelectorAll('browser-tab')[0];
    if (!tab0) return;
    var orig = tab0.getAttribute('title');
    if (!orig || orig === '…') return;
    tab0.setAttribute('title', '…');
    setTimeout(function () {
      if (tab0.getAttribute('title') === '…') tab0.setAttribute('title', orig);
    }, 1200);
  }, 8000);

  /* ---- 6. 下载内容异变：第二次下载安全日志多一行 ---- */
  if (typeof window.bwTriggerDownload === 'function' && !window.__bw3DlWrapped) {
    var origDl = window.bwTriggerDownload;
    var dlCount = 0;
    window.bwTriggerDownload = function () {
      dlCount++;
      if (dlCount >= 2) {
        var content = '安全日志导出\n导出时间：' + new Date().toLocaleString() +
          '\n\n[已加密]\n账号 0126：你也是。\n（此文件在你上次打开后被修改过。）\n';
        try {
          var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'security_log.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } catch (e) {}
        return;
      }
      origDl.apply(this, arguments);
    };
    window.__bw3DlWrapped = true;
  }

})();
