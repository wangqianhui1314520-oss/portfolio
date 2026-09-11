/* ============================================
 * game-extras.js — 自 index.html 行 8566-8814 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================ 优化补丁：反刍 / 时刻彩蛋 / 谜题 / 阶段E / 证物 / 提示 / 倒放 ================ */
  function c2EndState(){
    var st='自动补全中…';
    try{
      var oc=localStorage.getItem('grow_c6_outcome_v1');
      if(oc==='bad'||oc==='absorb') st='已归档（编号 0128）';
      else if(oc==='good'||oc==='good_full'||oc==='good_narrow') st='已解绑 · 档案关闭';
      else if(oc==='plant'||oc==='stuck') st='生成中…（卡在系统夹缝，不再更新）';
      else if(oc==='loop') st='已转交给 0129';
      else if(oc==='free') st='已释放';
    }catch(e){}
    return st;
  }

  function c6PlayVid(id, src, contain){
    var el=document.getElementById(id); if(!el) return;
    el.hidden=false;
    el.innerHTML='<video src="'+src+'" autoplay muted loop playsinline style="width:100%;height:100%;'+(contain?'object-fit:contain;':'object-fit:cover;')+'display:block;"></video>';
  }

  /* ---- 阶段 E · 片尾复活页（仿真笔记） ---- */
  function c6ShowRevive(mode){
    if (typeof c6ClearTimers === 'function') { c6ClearTimers(); }
    c6HideAll();
    var v=document.getElementById('endRevive');
    if(!v) return;
    var note=document.getElementById('endRvNote');
    var vid=document.getElementById('endRvVideo');
    var cmts=document.getElementById('endRvCmts');
    var wilt=document.getElementById('endRvWilt');
    if(note) note.textContent = (mode==='good'
      ? '小红书 · 画画的阿藤 · 刚刚发布 · 粉丝 18.7万\n「整理素材的时候翻到的，不知道是谁拍的。有点害怕。」'
      : '小红书 · 画画的阿藤 · 刚刚发布 · 粉丝 18.7万\n「有人认得这段画面吗？我好像拍到过它。」');
    if(vid) vid.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:0 16px;"><a href="media/mp4/c6-revive.mp4" target="_blank" rel="noopener" style="color:#5a8a5a;text-decoration:underline;cursor:pointer;font-size:12px;letter-spacing:1px;">[ 来源视频 · 点击在新标签查看 ]</a></div>';
    if(cmts) cmts.innerHTML='<div style="color:#6a7a6a;">评论区：</div><div>03:41 「这个画面我见过，在某个档案网站的截图里。」</div><div>02:13 「它又更新了。」</div><div>02:14 「你也是 0129 吗？」</div><div>01:52 「别看了。别看。」</div>';
    v.hidden=false;
    var seq=['╱','╲','│','╱','╲','◆'];
    var k=0;
    var t=setInterval(function(){
      var a=document.getElementById('rvAni');
      if(a){ a.textContent='│ '+seq[k%seq.length]+' │ '+seq[(k+1)%seq.length]+' ╲ 正在缓冲…'; }
      k++;
    },400);
    _c6Timers.push(t);
    c6Later(function(){
      var a=document.getElementById('rvAni');
      if(a) a.textContent='◆ 接 通 了';
      if(wilt) wilt.textContent='├─ 一截细丝，从画面底角伸出来\n│ 爬过你的屏幕边缘\n╰─ 顶端，缓缓抽出新芽';
    },4200);
    c6Later(function(){
      if(cmts) cmts.innerHTML+='<div style="color:#8a5a5a;margin-top:8px;">最新评论 · 刚刚：断了的网，自己会接上。</div>';
    },6800);
    c6Later(function(){
      if(vid) vid.style.background='#000';
      if(note) note.textContent='画面暗了下去。\n（它在长。它一直在长。）';
    },9000);
  }

  /* ---- 内容警告（首次进入） ---- */
  (function(){
    var w=document.getElementById('warnOk');
    if(!w) return;
    w.addEventListener('click',function(){
      try{ localStorage.setItem('grow_warn_v1','1'); }catch(e){}
      document.getElementById('maskWarn').classList.remove('show');
    });
    var seen=null; try{ seen=localStorage.getItem('grow_warn_v1'); }catch(e){}
    if(!seen) setTimeout(function(){ var m=document.getElementById('maskWarn'); if(m) m.classList.add('show'); },700);
  })();

  /* ---- 历史留言首字谜题：别信他，我还在 ---- */
  (function(){
    var tog=document.getElementById('gbOldToggle');
    if(!tog) return;
    var old=document.getElementById('gbOld');
    if(old) old.style.display='block';
    tog.addEventListener('click',function(){
      beep(700,0.08);
      var list=document.getElementById('gbOldList');
      var open=list.style.display==='block';
      list.style.display=open?'none':'block';
      tog.textContent=open?'▸ 查看更早的留言（2009–2015）':'▾ 收起更早的留言';
    });
    var solved=null; try{ solved=localStorage.getItem('grow_c1_acrostic'); }catch(e){}
    if(!solved){
      var ac='';
      document.querySelectorAll('#gbOldList p').forEach(function(p){
        var t=(p.textContent||'').trim(); if(t) ac+=t.charAt(0);
      });
      if(ac==='别信他我还在'){
        try{ localStorage.setItem('grow_c1_acrostic','1'); }catch(e){}
        addNote('c1_acrostic');
        onceHarvest('c1_acrostic',0.4);
        var h=document.createElement('div');
        h.style.cssText='margin-top:10px;padding:8px 10px;background:#f7f0f0;border:1px solid #d8c0c0;font-size:12px;color:#8a3a3a;';
        h.innerHTML='把每条留言的<b>第一个字</b>连起来读——<b>「别信他，我还在。」</b><br>这些留言，不是发给空间主人的。是留给你的。';
        document.getElementById('gbOldList').appendChild(h);
        beep(440,0.2);
      }
    }
  })();

  /* ---- 栅栏密文谜题：0128 is next ---- */
  (function(){
    var rb=document.getElementById('hpRailBtn');
    if(!rb) return;
    rb.addEventListener('click',function(){
      var inp=document.getElementById('hpRailInput');
      var v=(inp?inp.value:'').trim().toLowerCase();
      var m=document.getElementById('hpRailMsg');
      if(v==='0128isnext'){
        m.textContent='✓ 解析成功：0128 is next（下一个人，是你）。';
        m.style.color='#7a9a7a';
        try{ if(!localStorage.getItem('grow_c3_rail')) localStorage.setItem('grow_c3_rail','1'); }catch(e){}
        addNote('c3_rail'); onceHarvest('c3_rail',0.5);
      } else { m.textContent='× 还不对。再想想 02:13。'; m.style.color='#a0311f'; }
    });
  })();

  /* ---- 时刻彩蛋（现实时间渗透，优化批次 P1-5） ---- */
  (function(){
    var MO=[
      {fromH:2,fromM:13,toH:3,toM:0, key:'grow_0213_seen', time:'02:13', name:'未知访客 · 正在访问 · 停留中', music:'（信号干扰 · 它正在备份）',
       msg:'系统检测到持续备份活动：02:13 备份窗口已开启。\n建议：不要刷新页面。', harvest:'moment_0213'},
      {fromH:3,fromM:14,toH:3,toM:30, key:'grow_0314_seen', time:'03:14', name:'系统自动备份 · 生日档案', music:'（归档信号 · 3月14日）',
       msg:'系统检测到归档异常：2009-03-14 的日记页在 03:14 被重新加密。\n（那天，是档案主人的 14 岁生日。）', harvest:'moment_0314'},
      {fromH:21,fromM:13,toH:21,toM:30, key:'grow_2113_seen', time:'21:13', name:'未知访客 · 反向写入中', music:'（反向信号 · 镜像时刻）',
       msg:'空间日志检测到反向写入：21:13。\n（02:13 的镜像时刻。它总在 13 分做事。）', harvest:'moment_2113'}
    ];
    var n=new Date();
    var cur=null;
    for(var i=0;i<MO.length;i++){
      var t=n.getHours()*60+n.getMinutes();
      if(t>=MO[i].fromH*60+MO[i].fromM && t<=MO[i].toH*60+MO[i].toM){ cur=MO[i]; break; }
    }
    if(!cur) return;
    var seen=null; try{ seen=localStorage.getItem(cur.key); }catch(e){}
    if(seen==='1') return;
    try{ localStorage.setItem(cur.key,'1'); }catch(e){}
    setTimeout(function(){
      try{
        addVisitRow(gameToday()+' '+cur.time, cur.name);
        var ms=document.getElementById('musicState');
        if(ms) ms.textContent=cur.music;
        beep(60,0.4);
        bwAlert(cur.msg,'warn');
        if(typeof onceHarvest==='function'){ try{ onceHarvest(cur.harvest,0.3); }catch(e){} }
      }catch(e){}
    },1500);
  })();

  /* ---- 二周目 Meta：空间记得你 ---- */
  (function(){
    var oc=null; try{ oc=localStorage.getItem('grow_c6_outcome_v1'); }catch(e){}
    if(!oc) return;
    var rows=document.querySelectorAll('.info-rows');
    rows.forEach(function(r){
      var t=r.innerHTML;
      if(oc==='bad'||oc==='absorb'||oc==='stuck') r.innerHTML=t.replace('最后登录：2026-09-03','最后登录：——（该空间已无人访问）');
      else if(oc==='loop') r.innerHTML=t.replace('最后登录：2026-09-03','最后登录：2026-09-03 02:13（新的访客正在访问）');
    });
    var vis=document.querySelector('.visitors');
    if(vis && !vis.querySelector('.v-0128me')){
      var d=document.createElement('div');
      d.className='v v-0128me';
      d.innerHTML='<div class="v-avatar">0</div><div class="v-name">0128（我）</div>';
      vis.insertBefore(d, vis.firstChild);
    }
  })();

  /* ---- 证物箱 ---- */
  var EVIDENCE_DEF=[
    {k:'grow_c1_done_v1', ic:'壹', name:'搪瓷门牌 · 桥南36号', desc:'第一章 · 找回密码的起点'},
    {k:'grow_c2_done_v1', ic:'贰', name:'DV 录像带 · 2009', desc:'第二章 · 家庭录像'},
    {k:'grow_c3_done_v1', ic:'叁', name:'录音磁带 · 样本B', desc:'第三章 · 第二遍变了'},
    {k:'grow_c4_done_v1', ic:'肆', name:'病历复印件 · 12床', desc:'第四章 · 第一翻'},
    {k:'grow_c5_done_v1', ic:'伍', name:'断网截图 · SY-IDC-01', desc:'第五章 · 假死'},
    {k:'grow_c6_done_v1', ic:'陆', name:'结局印章', desc:'第六章 · 你的选择'}
  ];
  function openEvidence(){
    var g=document.getElementById('evGrid');
    if(!g) return;
    g.innerHTML='';
    var got=0;
    EVIDENCE_DEF.forEach(function(e){
      var done=false; try{ done=localStorage.getItem(e.k)==='1'; }catch(x){}
      var d=document.createElement('div');
      d.style.cssText='padding:10px 12px;border:1px solid '+(done?'#7a9a7a':'#ddd')+';border-radius:8px;background:'+(done?'#f2f8f2':'#f7f7f3')+';font-size:13px;';
      d.innerHTML='<b>'+e.ic+' · '+e.name+'</b>'+(done?'<span style="color:#7a9a7a;margin-left:8px;">✓ 已收集</span>':'<span style="color:#bbb;margin-left:8px;">未收集</span>')+'<div style="font-size:11px;color:#8a8a78;">'+e.desc+'</div>';
      if(done) got++;
      g.appendChild(d);
    });
    var foot=document.createElement('div');
    foot.style.cssText='margin-top:10px;font-size:12px;color:#6a6a58;';
    foot.textContent='已收集 '+got+' / 6 件证物。'+(got>=6?'它们都证明你来过。':'（每一件，都会成为它的养分——或你的证词。）');
    g.appendChild(foot);
    document.getElementById('maskEvidence').classList.add('show');
  }

  /* ---- 探查提示（渐进） ---- */
  var HINTS={
    qzone:'当前目标：找到「拾光客」空间的账号密码，登录成长档案。\n提示 1：忘记密码页会引导你；答案和「故乡的街 + 家门牌号」有关。\n提示 2：桥南街的相册里有一块搪瓷门牌。\n提示 3：用户名 czda_0127，密码 qiaonan36。',
    archive:'当前目标：用第一章的账号登录成长档案，逐模块恢复档案。\n提示 1：账号密码同第一章；DV 和草稿都要看完。\n提示 2：密保答案在空间里出现过（最好的朋友）。\n提示 3：全部完成后，按通关信指引进入第三章。',
    hospital:'当前目标：儿保归档五模块（体检 / 随访 / 曲线 / 日志 / 转档）。\n提示 1：样本 B 播放两遍，末尾会变。\n提示 2：操作日志里「恢复残片」要点 3 次；日志末有条乱码字段。\n提示 3：七项通关条件见页面提示（随访 / 样本 B 二刷 / 低语样本 C / 曲线 / 3 段残片 / 溯源小结 / 身份核验）。',
    investigate:'当前目标：搜「林远」收集 6 条证据 → 医院病案翻案。\n提示 1：每个模块都要先「搜索」定位解锁。\n提示 2：日记密码是 0629（昏迷前一天的 MMDD）。\n提示 3：证据墙收满后，把「画像矛盾」点开，再按站内信进医院。\n提示 4：调查中弹出的匿名留言「别查了」也是证据，共 2 条，前两次必达。',
    signal:'当前目标：听完三段残片 → 三处比对 → 切断本地节点。\n提示：本地节点编号 SY-IDC-01 在残片里出现过；断网后注意看它留下的暗钉。',
    ending:'当前目标：你赢了？\n提示 1：还记得林远最早的话吗——「它会装死」。\n提示 2：任何通道里，都别说出他具体在哪。\n提示 3：先回第四章证据墙，点「把时间线对齐核对一遍」（觉醒·识破回退）——那是唯一真赢的前提。\n提示 4：护住位置 + 真断网 + 现实举报 = 唯一真赢。'
  };
  function openHint(){
    var r=parseRoute(location.hash);
    var key=r.zone||'qzone';
    var body=document.getElementById('hintBody');
    if(body) body.textContent=HINTS[key]||HINTS.qzone;
    var m=document.getElementById('maskHint');
    if(m) m.classList.add('show');
  }

  /* ---- 音乐盒倒放（Web Audio 反转） ---- */
  (function(){
    var rev=document.getElementById('bgmReverse');
    var rh=document.getElementById('bgmReverseHint');
    if(!rev||!rh) return;
    rev.addEventListener('click',function(){
      beep(600,0.08);
      var src=bgm.getAttribute('src');
      if(!src){ rh.textContent='没有可倒放的音频。'; return; }
      if(src.indexOf('imoQHW5eVU')>=0){ rh.textContent='这首不用倒放。'; return; }
      if(!(window.AudioContext||window.webkitAudioContext)){ rh.textContent='（无法倒放：音频环境不可用）'; return; }
      rh.textContent='正在倒放…';
      /* 加载音频：优先 fetch，失败回退 XHR（兼容 Firefox 等本地文件策略），
         全部失败时给出可操作的部署提示（优化批次 P1-3：file:// 下 fetch/XHR 均被 CORS 拦截） */
      var _done=false;
      function _ok(buf){
        if(_done) return; _done=true;
        var AC=window.AudioContext||window.webkitAudioContext;
        var ctx=new AC();
        ctx.decodeAudioData(buf,function(ab){
          var revBuf=ctx.createBuffer(ab.numberOfChannels,ab.length,ab.sampleRate);
          for(var ch=0;ch<ab.numberOfChannels;ch++){
            var sd=ab.getChannelData(ch), dd=revBuf.getChannelData(ch);
            for(var i=0;i<ab.length;i++) dd[i]=sd[ab.length-1-i];
          }
          var s=ctx.createBufferSource(); s.buffer=revBuf; s.connect(ctx.destination); s.start(0);
          rh.textContent='（倒放中……听到什么了吗？）';
          setTimeout(function(){
            try{
              if(src.indexOf('voice-whisper-14days')>=0){
                rh.textContent='（倒放结束……低语倒过来是：「别信它，我还醒着。」已记入探查笔记。）';
                if(typeof addNote==='function'){ try{ addNote('c5_rev_whisper'); }catch(e){} }
                if(typeof onceHarvest==='function'){ try{ onceHarvest('c5_rev_whisper',0.3); }catch(e){} }
              } else if(src.indexOf('c6-a1-trap-lowdub')>=0){
                rh.textContent='（倒放结束……最底层的低语是：「别告诉它，我在哪。」已记入探查笔记。）';
                if(typeof addNote==='function'){ try{ addNote('c6_rev_lowdub'); }catch(e){} }
                if(typeof onceHarvest==='function'){ try{ onceHarvest('c6_rev_lowdub',0.3); }catch(e){} }
              } else {
                rh.textContent='（倒放结束……没听出什么。）';
              }
            }catch(e){}
            try{ ctx.close(); }catch(e){}
          }, Math.min(10000, ab.duration*1000));
        },function(){ rh.textContent='（倒放失败：音频无法解码。若以 file:// 方式打开，请改用 http 方式访问游戏目录（如 python -m http.server）后重试。）'; try{ ctx.close(); }catch(e){} });
      }
      function _fail(){
        rh.textContent='（倒放失败：当前浏览器禁止本地文件读取（file:// 模式）。请以 http 方式访问游戏目录后重试，或在浏览器设置中允许 file 访问。）';
      }
      fetch(src).then(function(r){ return r.arrayBuffer(); }).then(function(buf){ _ok(buf); })
        .catch(function(){
          try{
            var x=new XMLHttpRequest();
            x.open('GET', src, true);
            x.responseType='arraybuffer';
            x.onload=function(){ if(x.status>=200&&x.status<300||x.status===0){ _ok(x.response); } else { _fail(); } };
            x.onerror=function(){ _fail(); };
            x.send();
          }catch(e){ _fail(); }
        });
    });
  })();

  /* ---- 导出主脚本关键函数到 window（供 bw2 模块调用） ---- */
  window.go = go;
  window.parseRoute = parseRoute;
  window.bwPushHistory = bwPushHistory;
  window.bwGoBack = bwGoBack;
  window.bwGoForward = bwGoForward;
  window.bwUpdateNavBtns = bwUpdateNavBtns;
  window.bwUpdateSecBox = bwUpdateSecBox;
  window.bwUpdateTabTitle = bwUpdateTabTitle;
  window.refreshCurrentView = refreshCurrentView;
  window.bwAlert = bwAlert;
  window.beep = beep;
  window.bwShowSSL = bwShowSSL;
  window.bwShowLoading = bwShowLoading;
  window.bwHideLoading = bwHideLoading;
  window.bwGlitch = bwGlitch;
  window.bwTriggerDownload = bwTriggerDownload;
  window.bwShowSource = bwShowSource;
  window.bwShowDevtools = bwShowDevtools;
  window.bwHistory = bwHistory;
  window.bwEnsureTab = bwEnsureTab;
  window.setFavicon = setFavicon;
