/* ============================================
 * game-qzone.js — 自 index.html 行 4628-5336 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ---------- 加好友 ---------- */
  var addMask = document.getElementById('maskAdd');
  var addBody = document.getElementById('addBody');
  document.getElementById('btnAddFriend').addEventListener('click', function () {
    beep();
    addBody.innerHTML = '<div>已向 <span class="ok">拾光客</span> 发出好友申请。</div>';
    addMask.classList.add('show');
    setTimeout(function () {
      if (!addMask.classList.contains('show')) return;
      qqKnock();
      addBody.innerHTML =
        '<div><span class="ok">对方已同意你的好友申请。</span></div>' +
        '<div class="eerie-note">（你的好友列表里，好像多了一个人。头像灰色，昵称空白，点不开。）</div>';
      onceHarvest('c1_addfriend', 0.3);
    }, 3000);
  });

  /* ---------- 发消息 ---------- */
  var msgMask = document.getElementById('maskMsg');
  var chatWin = document.getElementById('chatWin');
  var chatInput = document.getElementById('chatInput');
  var chatSend = document.getElementById('chatSend');
  var replied = false;
  function addBubble(text, cls) {
    var d = document.createElement('div');
    d.className = 'b ' + (cls || '');
    d.textContent = text;
    chatWin.appendChild(d);
    chatWin.scrollTop = chatWin.scrollHeight;
  }
  document.getElementById('btnSendMsg').addEventListener('click', function () {
    beep();
    /* 如果有未读验证码，先显示验证码消息 */
    if (pendingCode) {
      verifyCodeSent = genCode();
      pendingCode = false;
      qqMsg();
      stopTabBlink();
      var sendMsgBtn = document.getElementById('btnSendMsg');
      if (sendMsgBtn) sendMsgBtn.classList.remove('btn-blink');
      chatWin.innerHTML = '';
      var sys = document.createElement('div');
      sys.className = 'sys';
      sys.textContent = '拾光客 发来一条新消息';
      chatWin.appendChild(sys);
      addBubble('验证码：' + verifyCodeSent);
      var sys2 = document.createElement('div');
      sys2.className = 'sys';
      sys2.textContent = '（此验证码 10 分钟内有效）';
      chatWin.appendChild(sys2);
      chatWin.scrollTop = chatWin.scrollHeight;
      replied = true;
    } else if (!replied) {
      chatWin.innerHTML = '';
      addBubble('在吗？我看到你发的求助了。', 'mine');
    }
    msgMask.classList.add('show');
  });
  function sendChat() {
    var t = chatInput.value.trim();
    if (!t) return;
    addBubble(t, 'mine');
    chatInput.value = '';
    if (!replied) {
      replied = true;
      var s = document.createElement('div');
      s.className = 'sys';
      s.textContent = '对方正在输入…';
      chatWin.appendChild(s);
      chatWin.scrollTop = chatWin.scrollHeight;
      setTimeout(function () {
        if (s.parentNode) s.parentNode.removeChild(s);
        addBubble('你也来了。录像带在 ChengZhangDangAn.com 里，你去看看。');
        onceHarvest('c1_msg', 0.3);
        var n = document.createElement('div');
        n.className = 'sys';
        n.textContent = '对方暂时离开';
        chatWin.appendChild(n);
        chatWin.scrollTop = chatWin.scrollHeight;
      }, 2200);
    }
  }
  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChat(); });

  /* ---------- 留言板 ---------- */
  document.getElementById('gbSubmit').addEventListener('click', function () {
    var v = document.getElementById('gbInput').value.trim();
    if (!v) return;
    beep();
    onceHarvest('c1_gb', 0.3);
    document.getElementById('gbInput').value = '';
    var hint = document.createElement('p');
    hint.innerHTML = '<b>我：</b><span class="dim">留言已提交，等待审核。</span>';
    document.getElementById('gbList').appendChild(hint);
    setTimeout(function () {
      var y = document.getElementById('gbYours');
      if (y) y.style.display = 'block';
      var p = document.createElement('p');
      p.innerHTML = '<b>我：</b>我好像来过这里。<span class="m-time">' + gameToday() + '</span>';
      document.getElementById('gbList').appendChild(p);
    }, 2600);
  });

  /* ---------- 音乐盒 ---------- */
  var bgm = document.getElementById('bgm');
  var musicName = document.getElementById('musicName');
  var musicState = document.getElementById('musicState');
  var musicCover = document.getElementById('musicCover');
  var eqs = document.querySelectorAll('.music-list .eq');
  var currentLi = null;
  var birthdayPlayCount = 0;
  function stopAllEq() { eqs.forEach(function (e) { e.style.display = 'none'; }); }
  var musicItems = document.querySelectorAll('.music-list li');
  musicItems.forEach(function (li) {
    li.addEventListener('click', function () {
      var src = li.getAttribute('data-src');
      var name = li.getAttribute('data-name');
      if (!src) {
        beep();
        musicName.textContent = name;
        musicState.textContent = '无法播放 · 文件已损坏';
        stopAllEq();
        return;
      }
      bgm.src = src;
      bgm.play().catch(function () {});
      musicName.textContent = name;
      musicState.textContent = '播放中…';
      stopAllEq();
      var eq = li.querySelector('.eq');
      if (eq) eq.style.display = 'inline-flex';
      currentLi = li;
      /* 家庭录音：计入一次探索（声音差异留待后续档案） */
      if (name && name.indexOf('2009年3月14日') >= 0) {
        onceHarvest('c1_music', 0.5);
      }
    });
  });
  bgm.addEventListener('ended', function () { musicState.textContent = '已停止'; stopAllEq(); });

  /* ---------- 更多下拉 + 访问记录 ---------- */
  var moreMenu = document.getElementById('moreMenu');
  document.getElementById('moreNav').addEventListener('click', function (e) {
    e.stopPropagation();
    moreMenu.classList.toggle('show');
  });
  document.addEventListener('click', function () { moreMenu.classList.remove('show'); });
  moreMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  document.getElementById('miCenter').addEventListener('click', function () {
    beep();
    onceHarvest('c1_center', 0.4);
    moreMenu.classList.remove('show');
    document.getElementById('maskCenter').classList.add('show');
  });

  /* ---------- 每日签到（含隐藏线索解锁） ---------- */
  var CK_KEY = 'grow_ck_days_v1';
  var UK_KEY = 'grow_ck_unlocked_v1';
  var CK_LAST_KEY = 'grow_ck_last_v1';
  var checkinDays = 1; // 新访客从第 1 天起算，本次签到 = 第 2 天
  var unlockedDays = [];
  var checkedIn = false;
  try { checkinDays = parseInt(localStorage.getItem(CK_KEY)) || 1; } catch (e) {}
  try { unlockedDays = JSON.parse(localStorage.getItem(UK_KEY)) || []; } catch (e) {}
  function ckTodayStr() { var n = new Date(); return n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate()); }
  try { checkedIn = (localStorage.getItem(CK_LAST_KEY) === ckTodayStr()); } catch (e) {}

  function buildCheckinCal() {
    var grid = document.getElementById('ckCal');
    if (grid.dataset.built) return;
    grid.dataset.built = '1';
    var html = '<div class="d wk">日</div><div class="d wk">一</div><div class="d wk">二</div><div class="d wk">三</div><div class="d wk">四</div><div class="d wk">五</div><div class="d wk">六</div>';
    var _now = new Date();
    var first = new Date(_now.getFullYear(), _now.getMonth(), 1).getDay();
    var _dim = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
    for (var i = 0; i < first; i++) html += '<div class="d off"></div>';
    for (var d = 1; d <= _dim; d++) {
      html += '<div class="' + (d <= Math.min(checkinDays, _dim) ? 'd on' : 'd') + '">' + d + '</div>';
    }
    grid.innerHTML = html;
  }
  function pad2(x) { return (x < 10 ? '0' : '') + x; }
  function nowHM() {
    var n = new Date();
    return pad2(n.getHours()) + ':' + pad2(n.getMinutes());
  }
  function addVisitRow(time, who, prepend) {
    var row = document.createElement('div');
    row.className = 'visit-row';
    var t = document.createElement('span'); t.textContent = time;
    var w = document.createElement('span');
    if (who.indexOf('<') === 0) { w.innerHTML = who; } else { w.textContent = who; }
    row.appendChild(t); row.appendChild(w);
    var body = document.getElementById('maskVisits').querySelector('.modal-body');
    if (prepend && body.firstChild) body.insertBefore(row, body.firstChild);
    else body.appendChild(row);
  }
  function saveCheckin() {
    try { localStorage.setItem(CK_KEY, String(checkinDays)); localStorage.setItem(UK_KEY, JSON.stringify(unlockedDays)); } catch (e) {}
  }
  function applyUnlock(d) {
    if (d === 3) {
      var rp = document.getElementById('removedPost');
      if (rp && !rp.dataset.unlocked) {
        rp.dataset.unlocked = '1';
        rp.style.cursor = 'pointer';
        rp.title = '点击查看已移除内容';
        rp.addEventListener('click', function () {
          beep();
          var t = rp.querySelector('.m-text');
          if (t.textContent.indexOf('别信他') >= 0) {
            t.textContent = '（本条说说内容已移除）';
            rp.style.background = '';
          } else {
            t.innerHTML = '<span style="color:#8a3a3a;">别信他。我是林远。0126。</span>';
            rp.style.background = '#f7f0f0';
          }
        });
      }
      return;
    }
    if (d === 7) {
      var s = LOGS.summer.body;
      if (s.indexOf('p.s.') < 0) {
        LOGS.summer.body = s + '<p class="removed">p.s. 我妈后来翻出胶卷盒，说那年暑假还拍了好多，只是大部分都洗坏了，找不回来了。</p>';
      }
      /* 第7天：残骸网站链接高亮 */
      var _links = document.querySelectorAll('#qzone-logs a[href*="#/archive"]');
      _links.forEach(function (a) { a.style.color = '#a0311f'; a.style.fontWeight = '700'; a.style.textDecoration = 'underline'; });
      return;
    }
    if (d === 14) {
      if (!document.getElementById('liTrackRepaired')) {
        var li = document.createElement('li');
        li.id = 'liTrackRepaired';
        li.setAttribute('data-src', 'media/wav/voice-whisper-14days.wav');
        li.setAttribute('data-name', '第14天了，还差一点（低语）');
        li.innerHTML = '<span><span class="eq" style="display:none"><i></i><i></i><i></i><i></i></span>第14天了，还差一点（低语）</span><span class="play">播放</span>';
        var ref = document.querySelector('.music-list li[data-src=""]');
        var ml = document.querySelector('.music-list');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(li, ref.nextSibling);
        else if (ml) ml.appendChild(li);
        li.addEventListener('click', function () {
          var src = li.getAttribute('data-src');
          var name = li.getAttribute('data-name');
          bgm.src = src;
          bgm.play().catch(function () {});
          musicName.textContent = name;
          musicState.textContent = '播放中…';
          stopAllEq();
          var eq = li.querySelector('.eq');
          if (eq) eq.style.display = 'inline-flex';
          currentLi = li;
        });
      }
      return;
    }
    if (d === 21) {
      var dup = false;
      var rows = document.querySelectorAll('#maskVisits .visit-row');
      for (var i = 0; i < rows.length; i++) if (rows[i].textContent.indexOf('还差 79 天') >= 0) dup = true;
      if (!dup) addVisitRow(gameToday() + ' 02:13', '未知访客 · 停留47分钟 · 还差 79 天');
      return;
    }
    if (d === 30) {
      var c = ALBUMS.childhood;
      if (c && c.imgs.indexOf('media/jpg/album-lahede-street.jpg') < 0) {
        c.imgs.push('media/jpg/album-lahede-street.jpg');
        c.note = '整理旧照片时翻出来的一张合影，很多人都记不清名字了。时间过得真快。';
      }
      return;
    }
    if (d === 100) {
      var fill = document.querySelector('#maskCenter .grow-fill');
      if (fill) {
        fill.style.width = '100%';
        var m = document.querySelector('#maskCenter .grow-meta');
        if (m) m.innerHTML = '当前成长值 <b>100,000 / 100,000</b> · 档案已完成';
        var e = document.querySelector('#maskCenter .eerie-note');
        if (e) e.textContent = '空间等级已满 · 感谢陪伴';
      }
      return;
    }
  }
  var UNLOCK_MSGS = {
    3: '解锁了一条隐藏说说。',
    7: '日志《那年暑假》里多了一行字。',
    14: '音乐盒解锁了一首钢琴曲。',
    21: '访问记录里多了一条。',
    30: '相册"童年"里多了一张照片。',
    100: '空间等级已满 · 感谢陪伴'
  };
  function openCheckin() {
    buildCheckinCal();
    var res = document.getElementById('ckResult');
    var unlockBox = document.getElementById('ckUnlock');
    if (!checkedIn) {
      checkedIn = true;
      checkinDays += 1;
      var newUnlocks = [];
      [3, 7, 14, 21, 30, 100].forEach(function (d) {
        if (checkinDays >= d && unlockedDays.indexOf(d) < 0) { unlockedDays.push(d); newUnlocks.push(d); }
      });
      saveCheckin();
      try { localStorage.setItem(CK_LAST_KEY, ckTodayStr()); } catch (e) {}
      addHarvest(1);
      res.innerHTML = '<div class="ck-badge">✓</div><div class="ck-title">签到成功</div><div class="ck-sub">已连续签到 <b>' + checkinDays + '</b> 天 · 今日成长值 <b>+1</b></div>';
      var n = new Date();
      addVisitRow(n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate()) + ' ' + nowHM(), '我：每日签到 · 连续第 ' + checkinDays + ' 天');
      newUnlocks.forEach(function (d) { applyUnlock(d); onceHarvest('c1_unlock_' + d, 0.3); });
      if (newUnlocks.length) {
        unlockBox.hidden = false;
        var html = '<div class="ck-unlock-tip">本次解锁 ' + newUnlocks.length + ' 条线索</div>';
        for (var j = 0; j < newUnlocks.length; j++) html += '<div class="ck-unlock-item">' + UNLOCK_MSGS[newUnlocks[j]] + '</div>';
        unlockBox.innerHTML = html;
        beep(); beep();
      } else {
        unlockBox.hidden = true;
      }
    } else {
      res.innerHTML = '<div class="ck-badge">✓</div><div class="ck-title">今日已签到</div><div class="ck-sub">已连续签到 <b>' + checkinDays + '</b> 天 · 明天继续，成长值 +1/天</div>';
      unlockBox.hidden = true;
    }
    document.getElementById('maskCheckin').classList.add('show');
    buildCheckinCal();
  }
  document.getElementById('miCheckin').addEventListener('click', function () {
    beep();
    moreMenu.classList.remove('show');
    openCheckin();
  });
  document.getElementById('miVisits').addEventListener('click', function () {
    beep();
    moreMenu.classList.remove('show');
    document.getElementById('maskVisits').classList.add('show');
  });

  /* ---------- 通用：关闭模态 ---------- */
  var closers = document.querySelectorAll('[data-close]');
  closers.forEach(function (c) {
    c.addEventListener('click', function () {
      var m = document.getElementById(c.getAttribute('data-close'));
      if (m) m.classList.remove('show');
    });
  });
  [].forEach.call(document.querySelectorAll('.modal-mask'), function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m) m.classList.remove('show');
    });
  });

  /* ---------- 日志阅读 ---------- */
  var logsList = document.getElementById('logsList');
  var logDetail = document.getElementById('logDetail');
  var LOGS = {
    anyijie: {
      title: '《桥南街的传说》',
      meta: '2026-08-28 · 阅读 3,102 · 评论 47',
      body:
        '<p>老合德县城里，有一条桥南街。街尾有一家早就关了门的照相馆。传说只要你把“自己”留在那里——一张照片、一段录像、一件贴身的旧物——它就会替你继续“生长”。</p>' +
        '<p>桥南街是老县城最出名的老街——青砖铺地，宽不过三四米，横穿半个老县城，从小洋河上的朝阳桥一路往南，两边是鳞次栉比的青砖小瓦房。北边那条桥北街，1946年为纪念陈发鸿烈士改叫发鸿街；再往东是朝阳街、兴南街。后来城市改造，拆的拆、改的改。如今你在任何地图软件上搜“合德老街”，还能看到它的位置，但当年的青砖巷子，早就不在了。</p>' +
        '<p>那家照相馆到底是什么，说法也不一。有人说是陈洋中学南边那家建华照相馆一带的老馆子，有人说是1992年开的海城照像馆，还有人一口咬定它没有门面，只在逢年过节支个摊。你去问老射阳人，十个人有十个答案。</p>' +
        '<p>传说本身也有好几个版本。有人说留了张照片，照片里的人越来越不像他；有人说留了件旧衣服，衣服里长出了东西；还有人信誓旦旦，说那不是照相馆，是一个网站——你在上面填了童年，你的记录就开始自己长。我甚至去查过，真有那么个域名，叫 ChengZhangDangAn.com，2015年就关停了。</p>' +
        '<p class="quote">我问过好几个人，版本都不一样。可越是这样，越说明有人真的见过。</p>' +
        '<p>我后来又去了一趟桥南街。街尾那家照相馆，卷帘门半开着，里面黑漆漆的。我喊了几声，没人应。柜台上落了一层灰，但有一个位置，灰是新的——好像有人不久前刚在那里放过什么东西。</p>' +
        '<p>但是前两天，我收到了一个包裹。里面是一盒旧录像带。带子上的人，是我。可我不记得自己拍过这个。</p>' +
        '<p>我试过自己去查。可每次查到一半，就会觉得有人在盯着我，晚上睡不着，白天恍恍惚惚。我害怕再查下去，会撞见什么不该撞见的东西。所以我想拜托你——帮我把这段没长大的记忆，找回来。</p>'
    },
    summer: {
      title: '《那年暑假》',
      meta: '2026-07-12 · 阅读 987 · 评论 12',
      body:
        '<p>2009年暑假，我十四岁。那年我住在解放路的老房子里，对面就是街角的照相馆。我妈给我拍了很多照片，说多拍点，以后长大看。</p>' +
        '<p>现在回看，那些照片大部分都不见了。硬盘坏过一次，导出来就没剩几张。</p>' +
        '<p class="removed">（本日志原有 5 张照片，现仅存 2 张。其余文件已损坏。）</p>'
    },
    move: {
      title: '《搬家那天》',
      meta: '2025-11-03 · 阅读 640 · 评论 8',
      body:
        '<p>搬家那天收拾老屋，柜子顶上掉下来一个纸箱，落了一地灰。里面全是小时候的东西：磁带、照片、一只旧玩具。</p>' +
        '<p>我一张张看，发现有一张合影，我站在最边上。可我完全不记得和这些人拍过照。我妈说：那不是你。</p>' +
        '<p>可照片里那个人，明明是我。</p>'
    }
  };
  document.querySelectorAll('[data-log]').forEach(function (item) {
    item.addEventListener('click', function () {
      var key = item.getAttribute('data-log');
      var l = LOGS[key];
      if (!l) return;
      logsList.hidden = true;
      logDetail.hidden = false;
      logDetail.innerHTML =
        '<h2>' + l.title + '</h2>' +
        '<div class="d-meta">' + l.meta + '</div>' +
        '<div class="d-body">' + l.body + '</div>' +
        '<span class="back-link" id="logBack">← 返回日志列表</span>';
      document.getElementById('logBack').addEventListener('click', function () {
        logDetail.hidden = true;
        logsList.hidden = false;
      });
      location.hash = '#/qzone/logs';
    });
  });

  /* ---------- 相册 ---------- */
  var albumsGrid = document.getElementById('albumsGrid');
  var albumOpen = document.getElementById('albumOpen');
  var ALBUMS = {
    childhood: {
      title: '童年',
      count: '6 张',
      imgs: ['media/jpg/album-childhood-01.jpg', 'media/jpg/album-childhood-02.jpg', 'media/jpg/album-childhood-03.jpg', 'media/jpg/album-childhood-04.jpg', 'media/jpg/album-childhood-05.jpg', 'media/jpg/album-childhood-group.jpg'],
      note: '这张说是“合影”，可放大看，里面只有我一个人。'
    },
    oldstreet: {
      title: '桥南街',
      count: '5 张',
      imgs: ['media/jpg/album-chenyang-street.jpg', 'media/jpg/page-bg.jpg', 'media/jpg/album-lahede-street.jpg', 'media/jpg/album-cover-2009-jiefanglu.jpg', 'assets/doorplate-facade.jpg'],
      note: '老照片上的桥南街与陈洋老街，青砖小瓦房。后来都拆了。最后一张是街尾一间老门面，木门半掩，砖墙上钉着白底蓝字的搪瓷门牌「桥南36号」——旁边还挂着「华兴照相馆」的旧招牌。拍的时候没多想，回去翻出来才发觉：我家不在这条街上，可这门牌，我好像在哪儿见过。'
    },
    oldhome: {
      title: '老家·射阳',
      count: '4 张',
      imgs: ['media/jpg/album-lahede-street.jpg', 'media/jpg/album-oldhouse-02.jpg', 'media/jpg/album-oldhouse-03.jpg', 'media/jpg/album-oldhouse-36.jpg'],
      note: '老房子在解放路36号，我从小在那长大。后来拆了，原地盖了清华园小区。'
    },
    street2009: {
      title: '2009年 解放路',
      count: '4 张',
      imgs: ['media/jpg/album-cover-2009-jiefanglu.jpg', 'media/jpg/page-bg.jpg', 'media/jpg/album-chenyang-street.jpg', 'media/jpg/album-oldhouse-02.jpg'],
      note: '2009年夏天，解放路还没拓宽。那年我十四岁，总觉得那个夏天特别长。'
    },
    random: {
      title: '随手拍',
      count: '7 张',
      imgs: ['media/jpg/album-childhood-01.jpg', 'media/jpg/album-oldhouse-03.jpg', 'media/jpg/album-chenyang-street.jpg', 'media/jpg/album-daily-01.jpg', 'media/jpg/album-oldhouse-36.jpg', 'media/jpg/page-bg.jpg', 'media/jpg/album-daily-02.jpg'],
      note: '日常。老街、旧物、随手拍的风景。'
    },
    era: {
      title: '时代',
      count: '4 张',
      imgs: ['media/jpg/album-lahede-street.jpg', 'media/jpg/album-chenyang-street.jpg', 'media/jpg/album-cover-era.jpg', 'media/jpg/album-era-01.jpg'],
      note: '桥南街拆了，原地盖起了清华园。老城在变，新楼一栋接一栋。住进去的人多了，记得从前的人少了。'
    }
  };
  document.querySelectorAll('[data-album]').forEach(function (item) {
    item.addEventListener('click', function () {
      var key = item.getAttribute('data-album');
      var a = ALBUMS[key];
      if (!a) return;
      albumsGrid.hidden = true;
      albumOpen.hidden = false;
      var html = '<div class="a-title">' + a.title + '</div><div class="a-grid">';
      a.imgs.forEach(function (src) { html += '<img class="zoomable" src="' + src + '" alt="' + a.title + '">'; });
      html += '</div><div class="a-note">' + a.note + '</div>' +
        '<span class="back-link" id="albumBack">← 返回相册列表</span>';
      albumOpen.innerHTML = html;
      bindLightbox(albumOpen);
      document.getElementById('albumBack').addEventListener('click', function () {
        albumOpen.hidden = true;
        albumsGrid.hidden = false;
      });
    });
  });

  /* ---------- 图片灯箱 ---------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  function openLightbox(img) {
    lbImg.src = img.src;
    lbCap.textContent = img.getAttribute('alt') || '';
    var lbHidden = document.getElementById('lbHidden');
    if (img.src.indexOf('gwVUV07ydw') >= 0) lbHidden.classList.add('show');
    else lbHidden.classList.remove('show');
    if (img.src.indexOf('doorplate-facade') >= 0) { addNote('place_doorplate'); beep(660, 0.12); }
    lightbox.classList.add('show');
  }
  function bindLightbox(scope) {
    [].forEach.call(scope.querySelectorAll('.zoomable'), function (img) {
      img.addEventListener('click', function () { openLightbox(img); });
    });
  }
  document.getElementById('lbClose').addEventListener('click', function () { lightbox.classList.remove('show'); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) lightbox.classList.remove('show');
  });
  bindLightbox(document);

  
  /* ---------- 林远渐进式线索：访问记录悬停显名 ---------- */
  function bindLinHover() {
    var linNames = document.querySelectorAll('.lin-name');
    linNames.forEach(function (el) {
      var orig = el.textContent;
      el.addEventListener('mouseenter', function () {
        el.textContent = '林远';
        beep(88, 0.08);
      });
      el.addEventListener('mouseleave', function () {
        el.textContent = orig;
      });
    });
  }
  bindLinHover();

  /* ---------- 林远渐进式线索：头像点击计数解锁隐藏留言 ---------- */
  var linClickCount = 0;
  var linAvatar = document.querySelector('.v-offline[data-visitor="林远"]');
  if (linAvatar) {
    linAvatar.addEventListener('click', function () {
      linClickCount++;
      if (linClickCount === 3) {
        // 第三次点击林远头像时，留言板短暂出现一条隐藏留言
        var gbList = document.getElementById('gbList');
        if (gbList) {
          var p = document.createElement('p');
          p.id = 'linHiddenMsg';
          p.style.cssText = 'color:#a0311f;font-size:11px;opacity:0;transition:opacity 0.5s;';
          p.innerHTML = '<b>林远：</b>02:13。47分钟。<span class="m-time">刚刚</span>';
          gbList.insertBefore(p, gbList.firstChild);
          setTimeout(function () { p.style.opacity = '1'; }, 100);
          setTimeout(function () {
            p.style.opacity = '0';
            setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 500);
          }, 4000);
          addNote('person_linyuan');
          beep(88, 0.2);
        }
      }
    });
  }

  /* ---------- 地址栏可输入 ---------- */
  function handleAddressInput(url) {
    if (!url) return;
    var u = url.toLowerCase();
    if (u.indexOf('chrome://history') >= 0 || u.indexOf('history') === 0) {
      if (typeof window.bw2ShowHistory === 'function') { window.bw2ShowHistory(); }
      return;
    }
    if (u.indexOf('qzone') >= 0 || u.indexOf('qq.com') >= 0 || u.indexOf('7788166') >= 0 || u.indexOf('拾光客') >= 0) {
      location.hash = '#/qzone';
      return;
    }
    if (u.indexOf('chengzhang') >= 0 || u.indexOf('dangan') >= 0 || u.indexOf('archive') >= 0 || u.indexOf('成长') >= 0 || u.indexOf('档案') >= 0) {
      /* 渐进式：第二章未解锁时，模拟网站无法访问 */
      if (typeof window.isChapterUnlocked === 'function' && !window.isChapterUnlocked('archive')) {
        if (typeof window.bw2ShowDNS === 'function') { window.bw2ShowDNS(url); }
        return;
      }
      location.hash = '#/archive';
      return;
    }
    if (u.indexOf('hospital') >= 0 || u.indexOf('syeb') >= 0 || u.indexOf('医院') >= 0 || u.indexOf('儿保') >= 0) {
      /* 渐进式：第三章未解锁时，模拟网站无法访问 */
      if (typeof window.isChapterUnlocked === 'function' && !window.isChapterUnlocked('hospital')) {
        if (typeof window.bw2ShowDNS === 'function') { window.bw2ShowDNS(url); }
        return;
      }
      location.hash = '#/hospital/intake';
      return;
    }
    if (u.indexOf('newtab') >= 0 || u.indexOf('新标签') >= 0) {
      if (typeof window.bw2ShowNewtab === 'function') { window.bw2ShowNewtab(); }
      return;
    }
    if (/^[\w-]+(\.[\w-]+)+/.test(u) || u.indexOf('.') >= 0) {
      if (typeof window.bw2ShowDNS === 'function') { window.bw2ShowDNS(url); }
      return;
    }
    if (typeof window.bw2ShowSearch === 'function') { window.bw2ShowSearch(url); }
  }
  window.handleAddressInput = handleAddressInput;
  function enableAddressBar() {
    var bw = document.getElementById('browser');
    if (!bw || !bw.shadowRoot) { setTimeout(enableAddressBar, 500); return; }
    var toolbar = bw.shadowRoot.querySelector('browser-toolbar');
    if (!toolbar) { setTimeout(enableAddressBar, 500); return; }

    function patch() {
      if (!toolbar.shadowRoot) return;
      var spans = toolbar.shadowRoot.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        var s = spans[i];
        var st = s.getAttribute('style') || '';
        if (st.indexOf('flex:1') >= 0 && !s.dataset.patched) {
          s.dataset.patched = '1';
          var input = document.createElement('input');
          input.type = 'text';
          input.value = s.textContent;
          input.style.cssText = 'flex:1;color:#e8eaed;font-size:13px;font-family:system-ui,sans-serif;background:transparent;border:none;outline:none;padding:0;caret-color:#e8eaed;';
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); handleAddressInput(this.value.trim()); }
          });
          input.addEventListener('focus', function () { this.select(); });
          s.parentNode.replaceChild(input, s);
          return;
        }
      }
    }

    patch();

    if (!toolbar._addrObs) {
      toolbar._addrObs = new MutationObserver(function () { setTimeout(patch, 30); });
      if (toolbar.shadowRoot) toolbar._addrObs.observe(toolbar.shadowRoot, { childList: true, subtree: true });
    }
    if (!bw._urlObs) {
      bw._urlObs = new MutationObserver(function () { setTimeout(patch, 80); });
      bw._urlObs.observe(bw, { attributes: true, attributeFilter: ['url'] });
    }
  }
  setTimeout(enableAddressBar, 800);

  /* ---------- 最近访客点击交互 ---------- */
  var VISITORS = {
    '晚风': { qq: '34****56', time: '昨天 18:32', sign: '生活就是这样', status: '在线', avatar: '晚' },
    '陌上花开': { qq: '56****78', time: '09-02 21:15', sign: '花开堪折直须折', status: '在线', avatar: '陌' },
    '青灯古卷': { qq: '78****90', time: '09-01 14:20', sign: '青灯古卷，岁月静好', status: '离线', avatar: '青' },
    '南巷': { qq: '90****12', time: '08-31 19:45', sign: '南巷清风', status: '在线', avatar: '南' },
    '归途': { qq: '12****34', time: '08-30 22:10', sign: '归途漫漫', status: '离线', avatar: '归' },
    '月下独酌': { qq: '34****56', time: '08-29 20:30', sign: '举杯邀明月', status: '在线', avatar: '月' },
    '空心菜': { qq: '56****78', time: '08-28 16:00', sign: '我是空心菜', status: '在线', avatar: '空' },
    '_低语_': { qq: '78****90', time: '08-27 23:45', sign: '...', status: '离线', avatar: '?_' },
    '林远': { qq: '12****26', time: '今天 02:13', sign: '……', status: '离线', avatar: '林', special: true }
  };
  var maskVisitor = document.getElementById('maskVisitor');
  var viAvatar = document.getElementById('viAvatar');
  var viName = document.getElementById('viName');
  var viQq = document.getElementById('viQq');
  var viStatus = document.getElementById('viStatus');
  var viTime = document.getElementById('viTime');
  var viSign = document.getElementById('viSign');
  var viSendMsg = document.getElementById('viSendMsg');
  var viClose = document.getElementById('viClose');
  var viMsgResult = document.getElementById('viMsgResult');
  document.querySelectorAll('.v-click').forEach(function (el) {
    el.addEventListener('click', function () {
      beep();
      var name = el.getAttribute('data-visitor');
      var v = VISITORS[name];
      if (!v) return;
      viAvatar.textContent = v.avatar;
      viName.textContent = name;
      viQq.textContent = 'QQ：' + v.qq;
      viStatus.textContent = v.status;
      viStatus.className = 'vi-status ' + (v.status === '在线' ? 'online' : 'offline');
      viTime.textContent = v.time;
      var linDone = false;
      try { linDone = v.special && localStorage.getItem('grow_c2_done_v1') === '1'; } catch (e) {}
      viSign.textContent = linDone ? '……我知道你看到哪一页了。' : v.sign;
      viTime.textContent = linDone ? '刚刚（信号不稳定）' : v.time;
      viMsgResult.style.display = 'none';
      viMsgResult.innerHTML = '';
      maskVisitor.classList.add('show');
    });
  });
  if (viClose) {
    viClose.addEventListener('click', function () {
      maskVisitor.classList.remove('show');
    });
  }
  if (viSendMsg) {
    viSendMsg.addEventListener('click', function () {
      beep();
      var name = viName.textContent;
      var v = VISITORS[name];
      var linDone = false;
      try { linDone = v && v.special && localStorage.getItem('grow_c2_done_v1') === '1'; } catch (e) {}
      if (linDone) {
        viMsgResult.style.display = 'block';
        var n = 0;
        viMsgResult.innerHTML = '<b>对方正在输入.</b>';
        var ti = setInterval(function () {
          n = (n + 1) % 4;
          viMsgResult.innerHTML = '<b>对方正在输入' + '.'.repeat(n) + '</b>';
        }, 280);
        setTimeout(function () {
          clearInterval(ti);
          viMsgResult.innerHTML =
            '<b style="color:#a0311f;">林远：</b>……你也进来了。<br>' +
            '你点过的每一页，我都看得到。<br>' +
            '02:13 之前，离开。<br>' +
            '别填密保。「我的档案」里，别填你真实的出生年份。<br>' +
            '……否则，它会记住你。<br>' +
            '<span style="color:#a0311f;">—— 信号中断，对方头像重新变灰 ——</span>';
          addNote('person_linyuan');
          addNote('time_0213');
          beep(88, 0.3);
        }, 2300);
        return;
      }
      if (v.status === '离线') {
        viMsgResult.innerHTML = '<b>发送失败</b><br>对方已下线，无法发送消息。' +
          (v.special ? '<br><span style="font-size:11px;">（对方似乎很久没有上线了…）</span>' : '');
      } else {
        var _replies = {
          '晚风': '晚风：桥南街？我小时候也住那附近。街尾那个老照相馆……还有36号的老门牌，你问这个干嘛？',
          '陌上花开': '陌上花开：空间好冷清，回踩一个。对了，你最近有没有收到奇怪的包裹？',
          '归途': '归途：兄弟，那个传说我也听过，别当真。不过解放东路36号确实拆了，原地盖了清华园。',
          '青灯古卷': '青灯古卷：（对方已读，未回复）',
          '南巷': '南巷：桥南街？早就拆了啊。你问这个做什么？',
          '月下独酌': '月下独酌：你更新的频率越来越低了，还好吗？',
          '空心菜': '空心菜：（对方已读，未回复）',
          '_低语_': '_低语_：……（对方头像闪烁了一下，没有回复）'
        };
        var _reply = _replies[name] || ('您向 ' + name + ' 发送了一条消息。<br><span style="font-size:11px;">（对方暂时未回复）</span>');
        viMsgResult.innerHTML = '<b>消息已发送</b><br>' + _reply;
      }
      viMsgResult.style.display = 'block';
    });
  }
