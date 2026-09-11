/* ============================================
 * game-hospital.js — 自 index.html 行 7058-7408 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================================================================
     第三章 · 儿保归档（嫌疑人）
     ================================================================ */
  Object.assign(NOTES, {
    c3_place_kindergarten: { cat: '地点', title: '合德镇中心幼儿园', desc: '现存最早的原始档案（2000 年入园体检表）出自合德镇中心幼儿园，检查医师陈桂英，家长签字王秀兰，编号 czda_0127。', src: '儿保归档·入园体检表' },
    c3_anomaly_followup: { cat: '异常', title: '成年后随访仍未停止', desc: '入园体检表本身正常，但 2008 转档后的随访一直续到 2026 年：骨骺闭合（2015 成年）后身高仍以约 0.2cm/年被续长，最新一行写入时间与你进入当天同步，状态“未停止”，操作账号 0126。', src: '儿保归档·随访记录' },
    c3_anomaly_voice: { cat: '异常', title: '同段录音两次内容不同', desc: '同一段家庭生日录音，第 1 次播放波形正常，第 2 次播放末尾多出 1.2 秒未知人声“你也来了……”。音轨由 0126 在凌晨 02:13 覆盖。', src: '儿保归档·听力语言随访' },
    c3_whisper14: { cat: '异常', title: '随访录音14·第14天', desc: '被标记为“设备杂音”的随访录音 14，杂音底部可辨一句人声：“第 14 天了，还差一点。”写入账号同为 0126。', src: '儿保归档·听力语言随访' },
    c3_anomaly_curve: { cat: '异常', title: '生长曲线末端分叉', desc: '身高曲线在 2015 年成年后没有像参考线那样趋平，反而继续上扬；末端出现非平滑的细丝状分叉，形态接近植物卷须。', src: '儿保归档·生长曲线' },
    c3_city: { cat: '地点', title: '人在消失，城市在长', desc: '同一坐标：桥南街、合德老街（2008 年前）与原地新建的清华园小区（2015 年后）。系统数据备注：人在消失，城市在长。', src: '儿保归档·生长曲线' },
    c3_time_2013: { cat: '时间线', title: '2013 年开始改动', desc: '操作日志显示，0126 最早于 2013-03-14 解除本归档的只读封存并开始续填；这一年也正是档案主人自述“第一次开始整段忘事”的年份。', src: '儿保归档·操作日志/转档' },
    c3_person_0126trace: { cat: '人物', title: '0126 的篡改痕迹', desc: '删除残片显示，标注为 0126（林远）的账号持续“补完”档案、阻止封存，并称“第十四个”“0128 已经在门外”。本系统全部写入、覆盖、续长记录均标注来自 0126。', src: '儿保归档·操作日志' },
    c3_key_transfer: { cat: '关键线索', title: '2008 转档链路', desc: '2008 年学龄前档案转入成长档案项目，转档接收操作员登记为 0126；但 2008 年操作员名册中查无此人——该编号的出现早于日志所称"首次出现"的 2013 年。', src: '儿保归档·离园转档记录' },
    c3_person_linyuan: { cat: '人物', icon: '👤', title: '0126 = 林远', desc: '操作账号身份核验确认：0126 的使用者是林远。所有篡改、覆盖、续长、阻止封存行为均来自此人。林远是拾光客空间的最近访客，长期监视拾光客。', src: '儿保归档·管理员操作日志' },
    c3_link_c1_visitor: { cat: '线索串联', title: '林远一直在监视', desc: '第一章拾光客空间最近访客中有林远。结合第三章证据，林远长期以访客身份监视拾光客的空间动态。', src: 'QQ空间·访客 + 儿保归档' },
    c3_link_c2_dv: { cat: '线索串联', title: 'DV「他不是人」= 林远', desc: '第二章DV录像带中闪现的「他不是人」帧，操作账号同为0126。此时可确认是林远的威胁。', src: '成长档案·DV + 儿保归档' },
    c3_link_c2_login: { cat: '线索串联', title: '登录异常 = 林远阻止', desc: '第二章登录时密码框自动多打字符、页面标题短暂变成「快逃」，均为0126账号操作——林远在试图阻止玩家进入。', src: '成长档案·登录 + 儿保归档' }
  });

  var c3ModTitles = { intake:'入园体检表', hearing:'听力语言随访', curve:'生长发育曲线', audit:'管理员操作日志', transfer:'离园转档记录' };
  var c3UrlMap = {
    intake: 'www.syeb-archive.cn/record/czda_0127/intake',
    hearing: 'www.syeb-archive.cn/record/czda_0127/hearing',
    curve: 'www.syeb-archive.cn/record/czda_0127/curve',
    audit: 'www.syeb-archive.cn/record/czda_0127/audit',
    transfer: 'www.syeb-archive.cn/record/czda_0127/transfer'
  };
  var C3_MODS_KEY='grow_c3_mods_v1', C3_DONE_KEY='grow_c3_done_v1', C3_GATE_KEY='grow_c3_gate_v1',
      C3_FRAG_KEY='grow_c3_frag_v1', C3_SUM_KEY='grow_c3_sum_v1', C3_BPLAY_KEY='grow_c3_bplay_v1', C3_ANOM_KEY='grow_c3_anom_v1';
  var C3_AUDIO_B1='media/wav/voice-2009-home.wav';
  var C3_AUDIO_B2='media/wav/ch3-audio-b2.wav';
  var C3_AUDIO_C ='media/wav/ch3-audio-c.wav';
  var c3CurrentMod='intake', c3Bound=false, c3Anom=0, c3BPlay=0, c3Which='';
  try { c3Anom=parseInt(localStorage.getItem(C3_ANOM_KEY)||'0')||0; c3BPlay=parseInt(localStorage.getItem(C3_BPLAY_KEY)||'0')||0; } catch(e){}
  function c3Save(k,v){ try{localStorage.setItem(k,v);}catch(e){} }
  function c3Paid(k){ try{ return !!JSON.parse(localStorage.getItem(PAID_KEY)||'{}')[k]; }catch(e){ return false; } }
  function c3AnomInc(){ c3Anom++; c3Save(C3_ANOM_KEY,String(c3Anom)); var n=document.getElementById('hpAnomNum'); if(n) n.textContent=c3Anom; }
  function updateHpSync(){
    var pct=document.getElementById('hpSyncPct'), fill=document.getElementById('hpSyncFill'), meta=document.getElementById('hpSyncMeta');
    var c=getConsent(), h=Math.round(getHarvest());
    if(fill) fill.style.width=(c==='1'?h:0)+'%';
    if(pct) pct.textContent=(c==='1'?h:0)+'%';
    if(meta) meta.textContent = c==='1' ? '已授权 · 档案同步随探索增长' : (c==='0'?'您已拒绝授权 · 成长值锁定 0%':'尚未授权 · 探索时将请求协议确认');
    var an=document.getElementById('hpAnomNum'); if(an) an.textContent=c3Anom;
  }

  /* ---- 生长曲线（确定性 SVG 自绘） ---- */
  function c3DrawCurve(){
    var svg=document.getElementById('hpCurveSvg');
    if(!svg || svg.dataset.drawn) return;
    var W=560,H=300,L=48,R=20,T=16,B=36,pw=W-L-R,ph=H-T-B;
    function X(y){ return L+(y-1998)/28*pw; }
    function Y(h){ return T+ph*(1-(h-88)/100); }
    function path(pts){ return 'M'+pts.map(function(p){return X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1);}).join(' L'); }
    var ref=[[1998,96],[2000,110],[2003,130],[2006,150],[2009,166],[2012,174],[2015,175],[2018,175],[2021,175],[2024,175],[2026,175]];
    var real=[[1998,96],[2000,109.5],[2003,128],[2006,148],[2009,165],[2012,175],[2015,178]];
    var abn=[[2015,178],[2018,179.2],[2021,181],[2024,183],[2026,184.5]];
    var s='';
    [90,110,130,150,170].forEach(function(h){ s+='<line x1="'+L+'" y1="'+Y(h)+'" x2="'+(W-R)+'" y2="'+Y(h)+'" stroke="#e2e0cf"/>'; s+='<text x="'+(L-6)+'" y="'+(Y(h)+3)+'" text-anchor="end" font-size="9" fill="#8a8a78">'+h+'</text>'; });
    [1998,2001,2004,2007,2010,2013,2016,2019,2022,2025].forEach(function(y){ s+='<line x1="'+X(y)+'" y1="'+T+'" x2="'+X(y)+'" y2="'+(H-B)+'" stroke="#efeede"/>'; s+='<text x="'+X(y)+'" y="'+(H-B+13)+'" text-anchor="middle" font-size="9" fill="#8a8a78">'+y+'</text>'; });
    s+='<line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" stroke="#9a9a86"/>';
    s+='<line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="#9a9a86"/>';
    s+='<text x="'+(W-R)+'" y="'+(H-B+26)+'" text-anchor="end" font-size="9" fill="#6a6a58">年份</text>';
    s+='<text x="'+L+'" y="'+(T-4)+'" font-size="9" fill="#6a6a58">身高 cm</text>';
    s+='<path d="'+path(ref)+'" fill="none" stroke="#9a9a8a" stroke-width="1.4" stroke-dasharray="5 4"/>';
    s+='<path d="'+path(real)+'" fill="none" stroke="#4a6a32" stroke-width="2"/>';
    s+='<path d="'+path(abn)+'" fill="none" stroke="#a0311f" stroke-width="2"/>';
    real.concat(abn.slice(1)).forEach(function(p){ s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="2.2" fill="#4a6a32"/>'; });
    var ex=X(2026), ey=Y(184.5);
    s+='<g class="hp-crawl">';
    s+='<path d="M'+ex.toFixed(1)+' '+ey.toFixed(1)+' q10 -2 16 -9" fill="none" stroke="#a0311f" stroke-width="1" opacity="0.7"/>';
    s+='<path d="M'+ex.toFixed(1)+' '+ey.toFixed(1)+' q11 3 17 10" fill="none" stroke="#a0311f" stroke-width="1" opacity="0.55"/>';
    s+='<circle cx="'+ex.toFixed(1)+'" cy="'+ey.toFixed(1)+'" r="4" fill="#a0311f"><title>2026：184.5cm · 骨骺闭合后第 11 年仍在增长</title></circle>';
    s+='<text x="'+(ex-4)+'" y="'+(ey-8)+'" text-anchor="end" font-size="9.5" fill="#a0311f">2026 · 184.5 · 未停止</text>';
    s+='</g>';
    svg.innerHTML=s;
    svg.dataset.drawn='1';
    var _fc = !c3Paid('c3_curve');
    onceHarvest('c3_curve',0.5);
    addNote('c3_anomaly_curve'); if(_fc) c3AnomInc(); beep(700,0.1);
  }

  /* ---- 模块切换 ---- */
  var c3Visited={};
  try{ JSON.parse(localStorage.getItem(C3_MODS_KEY)||'[]').forEach(function(m){c3Visited[m]=1;}); }catch(e){}
  function c3MarkMod(mod,noPush){
    if (typeof c3ModTitles === 'undefined') return;
    if(!c3ModTitles[mod]) mod='intake';
    c3CurrentMod=mod;
    try{ browser.setAttribute('url',c3UrlMap[mod]); }catch(e){}
    bwUpdateTabTitle('儿保归档 - '+c3ModTitles[mod],2);
    if(!noPush) bwPushHistory({zone:'hospital',mod:mod});
    var cr=document.getElementById('hpCrumb'); if(cr) cr.textContent=c3ModTitles[mod];
    document.querySelectorAll('#view-hospital .hp-nav-item').forEach(function(n){
      n.className = n.getAttribute('data-hpmod')===mod ? 'hp-nav-item on' : 'hp-nav-item';
    });
    ['intake','hearing','curve','audit','transfer'].forEach(function(m){
      var el=document.getElementById('hpmod-'+m); if(el) el.hidden=(m!==mod);
    });
    if(!c3Visited[mod]){
      c3Visited[mod]=1;
      try{ var a=JSON.parse(localStorage.getItem(C3_MODS_KEY)||'[]'); if(a.indexOf(mod)<0){a.push(mod);localStorage.setItem(C3_MODS_KEY,JSON.stringify(a));} }catch(e){}
      onceHarvest('c3_mod_'+mod,0.3); beep();
    }
    if(mod==='curve') c3DrawCurve();
    updateHpSync();
    c3CheckComplete();
  }

  /* ---- 状态恢复（刷新/切回不丢进度） ---- */
  function c3RestoreState(){
    if(localStorage.getItem(C3_GATE_KEY)==='1'){
      var fw=document.getElementById('hpFollowWrap'); if(fw) fw.hidden=false;
      var msg=document.getElementById('hpGateMsg'), inp=document.getElementById('hpGateInput'), btn=document.getElementById('hpGateBtn');
      if(msg){ msg.className='hp-gate-ok'; msg.textContent='编号核验通过，已解密 2008 年后随访记录。'; }
      if(inp) inp.disabled=true; if(btn) btn.disabled=true;
    }
    var fn=parseInt(localStorage.getItem(C3_FRAG_KEY)||'0')||0;
    c3RenderFrags(fn,true);
    if(localStorage.getItem(C3_SUM_KEY)==='1'){
      var box=document.getElementById('hpSummaryBox'); if(box){ box.hidden=false; box.innerHTML=c3SummaryText(); }
      var sb=document.getElementById('hpSummaryBtn'); if(sb) sb.disabled=true;
    }
    if(localStorage.getItem('grow_c3_identity_v1')==='1'){
      var ig=document.getElementById('hpIdentityGate'); if(ig) ig.hidden=true;
      var ir=document.getElementById('hpIdentityResult'); if(ir) ir.hidden=false;
    }
  }

  /* ---- 录音 ---- */
  (function(){
    var goH2=document.getElementById('goHospital2');
    if(goH2) goH2.addEventListener('click',function(e){
      e.stopPropagation(); beep(700,0.1);
      if(localStorage.getItem('grow_c2_done_v1')!=='1'){ bwAlert('该离线归档链路已锁定：请先把当前成长档案恢复完整。','warn'); return; }
      location.hash='#/hospital/intake';
    });
  })();

  /* ---- 录音 ---- */
  function c3BindAudio(){
    var au=document.getElementById('hpAudio');
    if(!au) return;
    function waveFill(id,on){ var w=document.getElementById(id); if(w) w.style.width=(on?'100%':'0'); }
    au.addEventListener('ended',function(){
      waveFill('hpBWave',false); waveFill('hpCWave',false);
      var bp=document.getElementById('hpBPlay'), cp=document.getElementById('hpCPlay');
      if(bp) bp.textContent='▶'; if(cp) cp.textContent='▶';
      if(c3Which==='C'){
        var m=document.getElementById('hpCMeta');
        if(m){ m.innerHTML='归档备注：本段被标记为“设备底噪”。<span class="hp-warn">但杂音底部可辨一句人声：“第14天了，还差一点……”。该音轨同样由 0126 写入。</span>'; }
        onceHarvest('c3_whisper14',0.5); addNote('c3_whisper14'); c3AnomInc(); beep(88,0.4);
      }
    });
    au.addEventListener('timeupdate',function(){
      if(!au.duration) return;
      var pct=Math.min(100,au.currentTime/au.duration*100)+'%';
      if(c3Which==='B'){ var w=document.getElementById('hpBWave'); if(w) w.style.width=pct; }
      if(c3Which==='C'){ var w2=document.getElementById('hpCWave'); if(w2) w2.style.width=pct; }
    });
    var bp=document.getElementById('hpBPlay');
    if(bp) bp.addEventListener('click',function(){
      c3BPlay++; c3Save(C3_BPLAY_KEY,String(c3BPlay)); c3Which='B';
      try{ au.pause(); }catch(e){}
      var meta=document.getElementById('hpBMeta');
      if(c3BPlay===1){
        au.src=C3_AUDIO_B1;
        if(meta){ meta.className='hp-audio-meta'; meta.textContent='第 1 次播放 · 波形校验：正常，未发现异常音轨。'; }
      } else {
        au.src=C3_AUDIO_B2;
        if(meta){ meta.className='hp-audio-meta hp-warn'; meta.textContent='第 '+c3BPlay+' 次播放 · 与首次比对：波形一致度 99.6%，末尾多出 1.2 秒未知人声（“你也来了……”）。'; }
        onceHarvest('c3_voice',0.8); addNote('c3_anomaly_voice'); c3AnomInc(); beep(220,0.4);
      }
      try{ applyMusicVol(); au.play().catch(function(){}); }catch(e){}
      bp.textContent='❚❚';
    });
    var cp=document.getElementById('hpCPlay');
    if(cp) cp.addEventListener('click',function(){
      c3Which='C';
      try{ au.pause(); }catch(e){}
      au.src=C3_AUDIO_C;
      var m=document.getElementById('hpCMeta'); if(m){ m.className='hp-audio-meta'; m.textContent='播放中……底噪之下似乎有人声，建议佩戴耳机。'; }
      try{ applyMusicVol(); au.play().catch(function(){}); }catch(e){}
      cp.textContent='❚❚';
    });
  }

  /* ---- 操作日志残片 ---- */
  var c3Frags=[
    '残片 1 · 2013-03-14 02:20 [0126 → 本机]："他开始记事了。不能让他想起来。"',
    '残片 2 · 2015-06-30 02:41 [0126 → 本机]："第127个，快完成了。还差最后一点。"',
    '残片 3 · 2026-09-03 02:52 [0126 → 本机]："0128已经在门外。准备让他进来。"'
  ];
  function c3RenderFrags(n,silent){
    var t=document.getElementById('hpFragText'), c=document.getElementById('hpFragCount'), b=document.getElementById('hpFragBtn');
    if(t){ var head='删除队列中检测到 3 段未被完全清除的本地消息残片（账号 0126 → 本机）。'; t.innerHTML=head+(n>0?'<br><br>'+c3Frags.slice(0,n).join('<br>'):''); }
    if(c) c.textContent='已恢复 '+n+' / 3';
    if(b&&n>=3) b.disabled=true;
    if(!silent&&n>0){ onceHarvest('c3_logrb_'+(n-1),0.2); if(n===3){ addNote('c3_person_0126trace'); c3AnomInc(); beep(88,0.35); } }
  }

  /* ---- 溯源小结 ---- */
  function c3SummaryText(){
    return '<b>嫌疑人画像 · 林远（账号 0126）</b><br>'+
      '<div style="margin:5px 0;">✓ 2008年 冒用操作员身份完成转档（操作员名册查无此人）</div>'+
      '<div style="margin:5px 0;">✓ 2013年 解除本归档只读封存，开始持续篡改</div>'+
      '<div style="margin:5px 0;">✓ 2015年 骨骺闭合后仍续长身高，主站关停当夜唤醒归档</div>'+
      '<div style="margin:5px 0;">✓ 2026年 覆盖家庭生日录音，插入未知人声"你也来了"</div>'+
      '<div style="margin:5px 0;">✓ 2026年 篡改2000年入园体检原始数据（四舍上调）</div>'+
      '<div style="margin:5px 0;">✓ 持续阻止档案封存，测量从未停止</div>'+
      '<span class="hp-warn" style="display:block;margin-top:8px;">结论：林远自2013年起有计划地篡改本档案，动机未知，仍在进行中。下一个目标：czda_0128（你）。</span>';
  }

  /* ---- 通关 ---- */
  function c3PaidAll(){
    return c3Paid('c3_followup') && c3Paid('c3_voice') && c3Paid('c3_whisper14') &&
           c3Paid('c3_curve') && c3Paid('c3_logrb_2') && c3Paid('c3_transfer') && c3Paid('c3_identity');
  }
  var c3TransShown=false;
  function c3LinYuanThreat(){
    var overlay=document.getElementById('hpLinThreat');
    if(!overlay) return;
    overlay.hidden=false;
    beep(55,0.8);
    var origTitle=document.title;
    document.title='林远';
    try{ bwUpdateTabTitle('林远',2); }catch(e){}
    setTimeout(function(){
      overlay.hidden=true;
      document.title=origTitle;
      try{ bwUpdateTabTitle('儿保归档 - 溯源小结',2); }catch(e){}
    },6000);
  }
  function c3CheckComplete(){
    if(c3TransShown) return;
    if(!c3PaidAll()) return;
    c3TransShown=true;
    c3Save(C3_DONE_KEY,'1');
    onceHarvest('c3_done',1.0);
    c3LinYuanThreat();
    setTimeout(function(){
      var card=document.getElementById('hpTrans'); if(!card) return;
      card.hidden=false;
      document.getElementById('hpTransBody').textContent=
        '……他发现你了。刚才那一下，不是系统故障——是他。\n'+
        '我对照过了。2000 年那张入园表是真的，我五岁时就是 109.5 公分。是林远，一年一年，把我后面的记录改掉、续上，连我成年、骨头已经长定了都不肯停。\n'+
        '0126 就是林远。他从 2013 年开始动手——也是那一年，我第一次发现自己会无缘无故忘掉整段整段的事。\n'+
        '他不是在删我，他是在"补"我。我越想越怕：他到底想把我补成一个什么东西？\n'+
        '你能不能再帮我查查 2013 年？那一年之前和之后，我像两个人。';
      var link=document.createElement('div');
      link.className='hp-mail-link';
      link.textContent='→ 回到成长档案，从 2013 年继续追查';
      link.addEventListener('click',function(){ beep(700,0.12); location.hash='#/archive'; });
      var note=document.createElement('div');
      note.style.cssText='margin-top:10px;font-size:11px;color:#8a7a4a;';
      note.textContent='第三章 · 完。相关线索已写入探查笔记。下一次自动备份 02:13，请勿在备份期间离开。';
      card.appendChild(link); card.appendChild(note);
      updateHpSync();
    },6500);
  }

  function c3BindOnce(){
    if(c3Bound) return; c3Bound=true;
    document.querySelectorAll('#view-hospital .hp-nav-item').forEach(function(n){
      n.addEventListener('click',function(){ beep(); c3MarkMod(n.getAttribute('data-hpmod')); });
    });
    var back=document.getElementById('hpBackArc');
    if(back) back.addEventListener('click',function(){ beep(700,0.1); location.hash='#/archive'; });
    var gb=document.getElementById('hpGateBtn');
    if(gb) gb.addEventListener('click',function(){
      var v=(document.getElementById('hpGateInput').value||'').trim();
      var msg=document.getElementById('hpGateMsg');
      if(v==='0127'){
        c3Save(C3_GATE_KEY,'1');
        document.getElementById('hpFollowWrap').hidden=false;
        if(msg){ msg.className='hp-gate-ok'; msg.textContent='编号核验通过，已解密 2008 年后随访记录。'; }
        document.getElementById('hpGateInput').disabled=true; gb.disabled=true;
        onceHarvest('c3_codegate',0.3); addNote('c3_place_kindergarten'); beep(820,0.12);
      } else {
        if(msg){ msg.className='hp-gate-err'; msg.textContent='编号不符。提示：后 4 位与成长档案编号一致（czda_01__）。'; }
        beep(180,0.18);
      }
    });
    document.querySelectorAll('#hpmod-intake .hp-row-click').forEach(function(r){
      r.addEventListener('click',function(){
        var d=document.getElementById('hprow'+r.getAttribute('data-hprow'));
        if(d) d.classList.toggle('show');
        beep(700,0.08);
        if(r.getAttribute('data-hprow')==='2026' && !c3Paid('c3_followup')){
          onceHarvest('c3_followup',0.8); addNote('c3_anomaly_followup'); c3AnomInc(); beep(88,0.35);
        }
      });
    });
    c3BindAudio();
    bindLightbox(document.getElementById('hpmod-curve'));
    document.querySelectorAll('#hpmod-curve .hp-compare img').forEach(function(im){
      im.addEventListener('click',function(){ onceHarvest('c3_city',0.3); addNote('c3_city'); });
    });
    var ib=document.getElementById('hpIdentityBtn');
    if(ib) ib.addEventListener('click',function(){
      var v=(document.getElementById('hpIdentityInput').value||'').trim();
      var msg=document.getElementById('hpIdentityMsg');
      if(v==='林远'){
        c3Save('grow_c3_identity_v1','1');
        document.getElementById('hpIdentityGate').hidden=true;
        document.getElementById('hpIdentityResult').hidden=false;
        if(msg) msg.textContent='';
        onceHarvest('c3_identity',0.3);
        addNote('c3_person_linyuan'); addNote('c3_link_c1_visitor'); addNote('c3_link_c2_dv'); addNote('c3_link_c2_login');
        c3AnomInc();
        beep(88,0.5);
        var hp=document.getElementById('view-hospital');
        if(hp){ hp.style.filter='invert(1)'; setTimeout(function(){hp.style.filter='';},150); }
        c3CheckComplete();
      } else {
        if(msg){ msg.className='hp-gate-err'; msg.textContent='身份不符。提示：拾光客空间最近访客列表里的那个人。'; }
        beep(180,0.18);
      }
    });
    var fb=document.getElementById('hpFragBtn');
    if(fb) fb.addEventListener('click',function(){
      var n=parseInt(localStorage.getItem(C3_FRAG_KEY)||'0')||0;
      if(n>=3) return;
      n++; c3Save(C3_FRAG_KEY,String(n)); c3RenderFrags(n,false); beep(640,0.1); c3CheckComplete();
    });
    var sb=document.getElementById('hpSummaryBtn');
    if(sb) sb.addEventListener('click',function(){
      c3Save(C3_SUM_KEY,'1');
      var box=document.getElementById('hpSummaryBox');
      if(box){ box.hidden=false; box.innerHTML=c3SummaryText(); }
      sb.disabled=true;
      addNote('c3_key_transfer'); addNote('c3_time_2013');
      /* 实机修复：补 c3_transfer 埋点（原缺失致 c3PaidAll 恒 false，第三章无法通关） */
      try{ onceHarvest('c3_transfer',0.5); }catch(e){}
      beep(700,0.12); c3CheckComplete();
    });
  }

  function c3Enter(mod){
    c3BindOnce();
    c3RestoreState();
    c3MarkMod(mod||'intake',true);
    updateHpSync();
    setTimeout(function(){ if(typeof syncRealWorldTime==='function') syncRealWorldTime(); },60);
  }
  function c3Refresh(){
    try{ var au=document.getElementById('hpAudio'); if(au) au.pause(); }catch(e){}
    document.querySelectorAll('#hpmod-intake .hp-detail.show').forEach(function(d){ d.classList.remove('show'); });
    c3RestoreState();
    var svg=document.getElementById('hpCurveSvg'); if(svg) delete svg.dataset.drawn;
    c3MarkMod(c3CurrentMod,true);
    beep(600,0.12);
  }

