/* ============================================
 * game-ending.js — 自 index.html 行 8221-8565 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================= 第六章：伪胜利与 8 结局（终章 · 三带判定） ================= */
  var C6_DONE_KEY='grow_c6_done_v1', C6_STAGE_KEY='grow_c6_stage_v1', C6_OUT_KEY='grow_c6_outcome_v1';
  var C6_GIVE_KEY='grow_c6_givepos', C6_CUT_KEY='grow_c6_cut', C6_REPORT_KEY='grow_c6_report';
  var c6Stage='', c6Bound=false;
  try{ c6Stage=localStorage.getItem(C6_STAGE_KEY)||''; }catch(e){}
  function c6Save(k,v){ try{localStorage.setItem(k,v);}catch(e){} }
  function c6StageSet(s){ c6Stage = s; c6Save(C6_STAGE_KEY, s); }
  var _c6Timers=[];
  function c6ClearTimers(){ for(var i=0;i<_c6Timers.length;i++){ try{clearTimeout(_c6Timers[i]);}catch(e){} try{clearInterval(_c6Timers[i]);}catch(e){} } _c6Timers=[]; }
  function c6Later(fn,ms){ var t=setTimeout(fn,ms); _c6Timers.push(t); return t; }
  function c6HideAll(){
    ['endWin','endMeta','endChoice','endDoubt','endOutGood','endOutPlant','endOutBad','endOutLoop','endOutFree','endOutStuck','endOutAbsorb','endRevive','endReportCard'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.hidden=true;
    });
  }
  /* 实机优化（P3-2）：结局块不再静态预埋——进入结局流程即清空全部结局，结算时只动态创建触发的那一个；
     源码/DOM 中无法看到任何未触发的结局内容 */
  var C6_OUTCOME_IDS = ['endOutGood','endOutPlant','endOutBad','endOutLoop','endOutFree','endOutStuck','endOutAbsorb'];
  var C6_OUTCOME_TPL = {
    endOutGood: '<div class="end-box end-box-good"><div class="end-h">— 它 在 装 死 —</div><div class="end-ly" id="endGoodLy"></div><div class="end-chain" id="endChainGood"></div><div class="end-grow" id="endGoodGrow"></div><div class="end-video" id="endGoodVid" hidden style="height:150px;background:#000;border:1px solid #2a3a2a;border-radius:4px;overflow:hidden;margin-bottom:10px;position:relative;"></div><div class="end-news" id="endGoodNews"></div><div class="end-ly" id="endGoodFinal"></div><div class="end-stamp" id="endGoodStamp">好结局① · 全胜</div><div class="end-again" id="endGoodAgain"></div></div>',
    endOutPlant: '<div class="end-box end-box-plant"><div class="end-h">— 只 摸 到 一 半 —</div><div class="end-split"><div class="end-pane"><div class="end-pane-t">病房 · 监护仪</div><div class="end-mono" id="endPlantMono"></div></div><div class="end-pane"><div class="end-pane-t">我的成长档案</div><div id="endPlantTable"></div></div></div><div class="end-ly" id="endPlantLy"></div><div class="end-stamp">中性结局① · 植物人接班</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>',
    endOutBad: '<div class="end-box end-box-bad"><div class="end-h" id="endBadH">— 已 清 除 —</div><div class="end-trap" id="endTrap"><div class="end-trap-t">页面被缠住了 · 退不出去</div><div class="end-video" id="endTrapVid" hidden style="height:120px;background:#0a0a0c;border:1px solid #2a1a1a;border-radius:4px;overflow:hidden;margin-bottom:8px;position:relative;"></div><div class="end-trap-log" id="endTrapLog"></div><div class="end-trap-timer" id="endTrapTimer"></div></div><div class="end-absorb" id="endAbsorb" hidden><div class="end-ly" id="endBadMono"></div><div class="end-absorb-num" id="endAbsorbNum"></div><div class="end-ly end-ly-red" id="endBadConfess"></div></div><div class="end-stamp">坏结局② · 双亡</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>',
    endOutLoop: '<div class="end-box end-box-loop"><div class="end-h">— 下 一 个 有 缘 人 —</div><div class="end-loop-post" id="endLoopPost"></div><div class="end-video" id="endLoopVid" hidden style="height:150px;background:#000;border:1px solid #2a3a2a;border-radius:4px;overflow:hidden;margin-bottom:10px;position:relative;"></div><div class="end-news" id="endLoopNews"></div><div class="end-ly" id="endLoopLy"></div><div class="end-stamp">循环结局 · 0129</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>',
    endOutFree: '<div class="end-box end-box-free"><div class="end-h">— 从 内 部 断 开 它 的 根 —</div><div class="end-free-wilt" id="endFreeWilt"></div><div class="end-video" id="endFreeVid" hidden style="height:150px;background:#000;border:1px solid #2a3a2a;border-radius:4px;overflow:hidden;margin-bottom:10px;position:relative;"></div><div class="end-free-lights" id="endFreeLights"></div><div class="end-ly" id="endFreeLy"></div><div class="end-stamp">隐藏结局 · 解放</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>',
    endOutStuck: '<div class="end-box end-box-plant" style="border-color:#3a3f46;"><div class="end-h">— 清 醒 地 留 在 这 里 —</div><div class="end-ly" id="endStuckLog"></div><div class="end-grow" id="endStuckGrow"></div><div class="end-ly" id="endStuckLin"></div><div class="end-stamp">中性结局② · 永困灰区</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>',
    endOutAbsorb: '<div class="end-box end-box-bad"><div class="end-h">— 档 案 归 档 —</div><div class="end-ly" id="endAbsorbLy"></div><div class="end-absorb-num" id="endAbsorbNum2"></div><div class="end-ly end-ly-red" id="endAbsorbConfess"></div><div class="end-news" id="endAbsorbNews"></div><div class="end-stamp">坏结局① · 吸收</div><div class="end-again"><button class="end-btn end-btn-dim" data-endagain>→ 回到拾光客的空间</button><button class="end-btn end-btn-dim end-reset" data-endreset>清除本机档案 · 重新开始</button></div></div>'
  };
  function c6ClearOutcomes(){
    for (var _i = 0; _i < C6_OUTCOME_IDS.length; _i++) {
      var _el = document.getElementById(C6_OUTCOME_IDS[_i]);
      if (_el && _el.parentNode) { _el.parentNode.removeChild(_el); }
    }
  }
  function c6EnsureOutcome(id){
    var _el = document.getElementById(id);
    if (_el) return _el;
    var _tpl = C6_OUTCOME_TPL[id];
    if (!_tpl) return null;
    var _holder = document.createElement('div');
    _holder.id = id;
    _holder.hidden = true;
    _holder.innerHTML = _tpl;
    var _anchor = document.getElementById('endDoubt') || document.getElementById('endReportCard') || document.getElementById('view-ending');
    if (_anchor && _anchor.parentNode) { _anchor.parentNode.insertBefore(_holder, _anchor.nextSibling); }
    else if (_anchor) { _anchor.appendChild(_holder); }
    return _holder;
  }
  function c6Win(){
    c6HideAll();
    document.getElementById('endNews').innerHTML =
      '<b>【系统通告】</b><br>异常生长系统已被遏制。本地节点 SY-IDC-01 已离线并终止写入，相关档案已封存归档。<br><br>' +
      '<b>【官方通报 · 预演】</b><br>近日接群众举报，有关部门联合处置一起异常网络系统，相关服务器已依法关停。涉事人员正在进一步核查中。';
    document.getElementById('endGrowVal').textContent = getHarvest().toFixed(2) + '%';
    document.getElementById('endWinLin').textContent = '林远：……信号很干净。也许是结束了。也许是。';
    document.getElementById('endWin').hidden=false;
  }
  function c6Meta(){
    c6HideAll();
    var my=null; try{ my=JSON.parse(localStorage.getItem(c2_MY_KEY)||'null'); }catch(e){}
    var year = (my && my.year) ? my.year : '未填写';
    var city = (my && my.city) ? my.city : '未填写';
    var age = (my && my.year) ? (new Date().getFullYear()-parseInt(my.year,10)) : '—';
    var td='padding:7px 10px;border:1px solid #2a3a2a;';
    document.getElementById('endMetaTable').innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:12px;color:#9aa89a;">' +
      '<tr style="background:#10140f;"><th style="'+td+'text-align:left;color:#c8d8c8;">项目</th><th style="'+td+'text-align:left;color:#c8d8c8;">内容</th></tr>' +
      '<tr><td style="'+td+'">访客编号</td><td style="'+td+'">czda_0128</td></tr>' +
      '<tr><td style="'+td+'">出生年份</td><td style="'+td+'">'+year+'</td></tr>' +
      '<tr><td style="'+td+'">童年城市</td><td style="'+td+'">'+city+'</td></tr>' +
      '<tr><td style="'+td+'">当前年龄</td><td style="'+td+'">'+age+'</td></tr>' +
      '<tr><td style="'+td+'">与拾光客成长值重合度</td><td style="'+td+'color:#b56a5a;">99.98%</td></tr>' +
      '<tr><td style="'+td+'">它读取到的本地记录</td><td style="'+td+';font-family:Consolas,monospace;font-size:10px;color:#6a8a6a;">grow_consent_v1 · grow_harvest_v1 · grow_c2_my_v1 · grow_c2_qa_v1 · grow_notes_v1</td></tr>' +
      '</table>';
    document.getElementById('endMetaCmp').textContent = '拾光客（czda_0127）成长值：99.98% —— 我的档案，正在变得和他一模一样。';
    document.getElementById('endMetaLin').textContent = '林远：……你在表里。现在，把我弄出去。';
    document.getElementById('endMeta').hidden=false;
  }
  function c6Choice(){
    c6HideAll();
    document.getElementById('endChoiceLin').textContent =
      '林远（声音终于清晰）：通道干净了，0128。趁现在——把我的位置发给医院，让他们来救我。\n' +
      '「射阳县人民医院 ICU 3 楼 12 床 · 住院号 SYYY-2015-06142。」\n' +
      '（这是他第一次，主动给出精确位置。）';
    document.getElementById('endPosCard').textContent =
      '待发送：射阳县人民医院 ICU 3 楼 12 床 · 住院号 SYYY-2015-06142\n接收方：市医疗救治专线（已接通）';
    document.getElementById('endChoice').hidden=false;
    var _fb=document.getElementById('endFreeBtn');
    if(_fb){ var _fd=0; try{ _fd=parseInt(localStorage.getItem(CK_KEY))||0; }catch(e){} _fb.hidden=_fd<30; if(_fd>=30) addNote('c6_free_unlock'); }
  }
  function c6Give(g){
    c6Save(C6_GIVE_KEY, g);
    if(typeof tele==='function'){ try{ tele('give', g); var _tck=0; try{ _tck=parseInt(localStorage.getItem(CK_KEY))||0; }catch(e){} tele('ck', String(_tck)); }catch(e){} }
    if(g==='real'){ var _ckd2=0; try{ _ckd2=parseInt(localStorage.getItem(CK_KEY))||0; }catch(e){} if(_ckd2>=30){ c6Free(); } else { addNote('c6_give_real'); c6Bad(); } }
    else if(g==='partial'){ addNote('c6_give_partial'); c6Plant(); }
    else { addNote('c6_give_none'); c6Doubt(); }
    beep(500,0.1);
  }
  function c6Doubt(){
    c6HideAll();
    document.getElementById('endDoubtLin').textContent =
      '「……等等。」\n你想起了林远最早的警告：「它会装死——哪怕你看着它被清除，也别全信。任何通道里，都别说出我具体在哪。」\n' +
      '这通道太干净了。干净得像它故意留的。';
    document.getElementById('endDoubt').hidden=false;
  }
  function c6DoubtLog(t){ var l=document.getElementById('endDoubtLog'); if(l) l.textContent += (l.textContent?'\n':'')+t; }
  function c6JudgeAfterNone(force){
    if(localStorage.getItem(C6_DONE_KEY)==='1') return;   /* 已出结局，幂等不重复结算 */
    if(typeof tele==='function'){ try{ var _tc=localStorage.getItem(C6_CUT_KEY)==='1', _tr=localStorage.getItem(C6_REPORT_KEY)==='1'; tele('act', (_tc&&_tr)?'both':(force?'wait':'partial')); }catch(e){} }
    var _cut=localStorage.getItem(C6_CUT_KEY)==='1', _rpt=localStorage.getItem(C6_REPORT_KEY)==='1', _hv=getHarvest() - (getConsent()==='1'?2:0), _sec=localStorage.getItem('grow_c2_qa_v1')==='1';
    var _ckd=0; try{ _ckd=parseInt(localStorage.getItem(CK_KEY))||0; }catch(e){}
    if(_ckd>=30){ c6Free(); return; }                  /* ① 隐藏·解放：签到30天（原100，优化P1-2下调），跨一切数值 */
    if(_cut && _rpt){                                  /* X=yes：识破假死+真断网+举报 */
      if(_hv<=16){ c6Good('full'); }                   /* 绿带(≤16) → 好①全胜（优化P1-1，原14） */
      else if(_hv<=30){ c6Good('narrow'); }            /* 黄带(≤30) → 好②险胜（优化P1-1，原29） */
      else { c6Stuck(); }                              /* 红带(>30) → 中②永困灰区（全对却逃不掉） */
      return;
    }
    if(!force){ return; }                              /* 断网/举报尚未集齐、也没主动放弃：不提前结算，等玩家继续 */
    if(_hv>30 && _sec){ c6Absorb(); return; }          /* 红带+密保给全、未觉醒 → 坏①吸收 */
    c6Loop(); return;                                  /* 其余兜底 → 循环0129 */
  }
  /* ---- 结局演出 ---- */
  function c6ShowReview(){
    var box=document.getElementById('endReview');
    if(!box) return;
    try{
      var consent=localStorage.getItem('grow_consent_v1')==='1';
      var awake=localStorage.getItem('grow_awake_v1')==='1';
      var give=localStorage.getItem(C6_GIVE_KEY)||'';
      var cut=localStorage.getItem(C6_CUT_KEY)==='1', rpt=localStorage.getItem(C6_REPORT_KEY)==='1';
      var ckd=0; try{ ckd=parseInt(localStorage.getItem(CK_KEY))||0; }catch(e){}
      var out=localStorage.getItem(C6_OUT_KEY)||'';
      var CN={good_full:'好①全胜',good_narrow:'好②险胜',stuck:'中②永困灰区',absorb:'坏①吸收',loop:'坏②循环0129',bad:'坏③已清除',plant:'中①植入',free:'隐藏·解放'};
      var giveCN={real:'发送了真实位置',partial:'只发送模糊位置',none:'没有发送位置'};
      var mine='本次：授权'+(consent?'✓':'✗')+' · 觉醒'+(awake?'✓':'✗')+' · '+(giveCN[give]||'—')+
        (give==='none'?(' · 真断网'+((cut?'✓':'✗'))+' 现实举报'+((rpt?'✓':'✗'))):'')+
        ' · 签到 '+ckd+' 天 → 结局：'+(CN[out]||out);
      var rows=[
        ['拒绝授权 + 护住位置/断网/举报','好①全胜','96.9%',(!consent&&give==='none'&&cut&&rpt)],
        ['授权 + 觉醒 + 护住位置/断网/举报','好结局（以好②为主）','97.1%',(consent&&awake&&give==='none'&&cut&&rpt)],
        ['授权 + 未觉醒 + 护住位置/断网/举报','仅 38.5% 好结局，58.5% 永困灰区','—',(consent&&!awake&&give==='none'&&cut&&rpt)],
        ['发送真实位置','坏③已清除','97.0%',give==='real'],
        ['只发送模糊位置','中①植入','100%',give==='partial'],
        ['不发送且等待（不动）','坏②循环 / 坏①吸收','88% / 12%',give==='none'&&!cut&&!rpt]
      ];
      var html='<div style="color:#9aa89a;">'+mine+'</div>'+
        '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;color:#9aa89a;">'+
        '<tr style="color:#c8d8c8;"><th style="text-align:left;padding:3px 6px;border-bottom:1px solid #2a3a2a;">如果当时…</th>'+
        '<th style="text-align:left;padding:3px 6px;border-bottom:1px solid #2a3a2a;">结局</th>'+
        '<th style="text-align:left;padding:3px 6px;border-bottom:1px solid #2a3a2a;">胜率</th></tr>';
      for(var i=0;i<rows.length;i++){
        html+='<tr style="'+(rows[i][3]?'background:#1a2418;color:#d8e8d8;font-weight:600;':'')+'">'+
          '<td style="padding:3px 6px;border-bottom:1px solid #1a2418;">'+rows[i][0]+'</td>'+
          '<td style="padding:3px 6px;border-bottom:1px solid #1a2418;">'+rows[i][1]+'</td>'+
          '<td style="padding:3px 6px;border-bottom:1px solid #1a2418;">'+rows[i][2]+'</td></tr>';
      }
      html+='</table>'+
        '<div style="margin-top:6px;font-size:10px;color:#6a7a6a;">（胜率为源码模型蒙特卡洛估算（20万局）；觉醒 = 第四章证据墙「把时间线对齐核对一遍」，识破回退后才能触及好①。）</div>';
      var body=document.getElementById('endReviewBody');
      if(body) body.innerHTML=html;
      box.hidden=false;
    }catch(e){}
  }
  function c6OutStampAndAgain(){
    document.querySelectorAll('[data-endagain]').forEach(function(b){
      b.addEventListener('click',function(){ beep(600,0.1); location.hash='#/qzone'; });
    });
    /* 新周目重置（优化批次 P2-12） */
    document.querySelectorAll('[data-endreset]').forEach(function(b){
      b.addEventListener('click',function(){
        if(!window.confirm('确定清除本机全部档案与进度（grow_* 记录）并重新开始吗？\n此操作不可撤销，会同时清空成长值、证物与探查笔记。')) return;
        try{
          var keys=[];
          for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf('grow_')===0) keys.push(k); }
          keys.forEach(function(k){ localStorage.removeItem(k); });
        }catch(e){}
        beep(700,0.1);
        location.reload();
      });
    });
  }
  function c6Good(band){
    band=band||'full';
    c6StageSet('good'); c6Save(C6_OUT_KEY, band==='narrow'?'good_narrow':'good_full'); c6Save(C6_DONE_KEY,'1');
    var _gst=document.getElementById('endGoodStamp'); if(_gst) _gst.textContent = band==='narrow'?'好结局② · 险胜':'好结局① · 全胜';
    var _gbox=document.getElementById('endOutGood'); if(_gbox) _gbox.style.boxShadow = band==='narrow'?'inset 0 0 70px rgba(120,140,80,0.40)':'none';
    if(band==='narrow'){ document.getElementById('endGoodH') && (document.getElementById('endGoodH').textContent='— 挣 断 —'); }
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutGood');
    document.getElementById('endOutGood').hidden=false;
    addNote(band==='narrow'?'c6_out_narrow':'c6_out_good');
    var steps=[
      function(){ document.getElementById('endGoodLy').textContent = band==='narrow'
        ? '「它刚才，想反扑。」藤蔓细丝爬上来——你点断，它又重连；窗口被反复拽回，「强制断开」读条几次倒退。\n你咬着牙，一根一根挣开，读条 3……2……1，在最后一秒才断开。\n（它抓住了你一半。你是硬挣出去的。）'
        : '「它刚才，想反扑。」界面上，藤蔓的细丝猛地爬了一下，又缩了回去——它没有足够的能量留住你。\n一个弹窗弹出：它还想再缠住你一次。\n你从容点掉了它。藤蔓细丝从屏幕边缘伸来——你一根一根，点断了它们。\n按住「强制断开」读条…… 3、2、1。\n（这一次，它没能留住你。）'; },
      function(){ document.getElementById('endGoodLy').textContent+='\n你执行了第二次断网——这一次是物理级：电源、网线、证据盘，全部切断。'; addNote('c6_cut_real'); },
      function(){
        document.getElementById('endChainGood').innerHTML='编号链断裂：<span class="ch-off">0126</span> → <span class="ch-off">0127</span> → <span class="ch-off">0128</span> → <span class="ch-off">0129</span><br>（逐节断开 · 不再有下一个）';
        var g=getHarvest(); var target=band==='narrow'?Math.max(10,g-15):Math.max(0,g-25);
        c6CountNum('endGoodGrow', g, target, '增长值回落：', '%', function(){ setHarvest(target); });
      },
      function(){
        if(localStorage.getItem(C6_REPORT_KEY)==='1'){
          var rp=document.getElementById('endReportCard');
          var rb=document.getElementById('endRpBody');
          if(rp) rp.hidden=false;
          if(rb) rb.textContent='举报回执 · 受理编号：WS-'+new Date().getFullYear()+'-06142\n受理单位：属地网络安全管理办公室（剧情演出，不接入真实平台）\n提交时间：'+new Date().toLocaleString()+'（本地）\n\n提交内容：\n一、射阳县人民医院 ICU 3 楼 12 床患者（林远）疑遭异常网络系统长期侵害；\n二、本地节点 SY-IDC-01 断网记录与 02:13 微写入日志；\n三、编号链截图（0126–0129）。\n\n状态：已受理 · 转线下核查。';
        }
        document.getElementById('endGoodNews').innerHTML='<b>【官方通报】</b><br>'+(band==='narrow'?'接群众举报，多部门经艰难处置切断本地节点；射阳县人民医院一长期昏迷患者生命体征趋于平稳，目前尚未苏醒，仍在重点观察；处置中系统多次尝试重连均被阻断。':'近日接群众举报，多部门联合处置一起异常网络系统；射阳县人民医院一长期昏迷患者获重点救治，意识反应出现好转。')+'<br><span id="endGoodSrc" style="display:inline-block;margin-top:8px;font-size:10px;color:#6a7a6a;text-decoration:underline;cursor:pointer;">来源：本地信息发布 · 2026 已归档（点击查看）</span>';
        c6PlayVid('endGoodVid','media/mp4/c6-v1-good-news.mp4',false);
        addNote('c6_report');
        var gs=document.getElementById('endGoodSrc');
        if(gs) gs.addEventListener('click',function(){ beep(700,0.1); c6ShowRevive('good'); });
      },
      function(){ document.getElementById('endGoodFinal').textContent = band==='narrow' ? '林远（绿字，断续）：「……够了，这样，就够了。他还没醒，但他活着。你也是。」（屏幕边缘，永久留下了一丝藤蔓纹理。）' : '林远（绿字，最后一句）：「谢谢你，这次……是真的。」'; },
      function(){ var a=document.getElementById('endGoodAgain'); if(a) a.textContent='（二周目：可用已知密码跳过找回流程，用不同授权克制程度与抉择集齐 8 个结局）'; c6OutStampAndAgain(); if(band==='full' && typeof window.__vineInit==='function'){ c6Later(window.__vineInit, 2400); } }
    ];
    for(var i=0;i<steps.length;i++){ c6Later(steps[i], 900+i*1200); }
  }
  function c6CountNum(id,from,to,prefix,suffix,onDone){
    var el=document.getElementById(id); if(!el) return;
    var cur=from, dir=to>from?1:-1;
    var t=setInterval(function(){
      cur+=dir*0.5;
      if((dir>0&&cur>=to)||(dir<0&&cur<=to)){ cur=to; clearInterval(t); if(onDone) onDone(); }
      el.textContent=prefix+cur.toFixed(2)+suffix;
    },120);
    _c6Timers.push(t);
  }
  function c6Stuck(){
    c6StageSet('stuck'); c6Save(C6_OUT_KEY,'stuck'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutStuck');
    document.getElementById('endOutStuck').hidden=false;
    addNote('c6_out_stuck');
    var log=document.getElementById('endStuckLog');
    var g=getHarvest();
    document.getElementById('endStuckGrow').textContent='连接强度：'+g.toFixed(2)+'%（红带 · 已焊死，无法断开）';
    var steps=[
      '你识破了假死，护住了位置，也做了真断网、寄出了证据——每一步都对。',
      '「强制断开」读条走到 99%……卡住。证据包「发送中」永远停在 99%。',
      '尝试关闭页面：页面没有被粗暴缠回，只是安安静静地，关不掉。',
      '它没有吞掉你。可你，也再也出不去了。'
    ];
    for(var i=0;i<steps.length;i++){ c6Later((function(t){ return function(){ log.textContent=t; }; })(steps[i]), 700+i*1300); }
    c6Later(function(){
      document.getElementById('endStuckLin').textContent='林远（绿字，很轻）：「……你醒得太晚了，0128。不过没关系。留下来——我们一起，从里面找出口。」';
      c6OutStampAndAgain();
    }, 700+steps.length*1300+400);
  }
  function c6Absorb(){
    c6StageSet('absorb'); c6Save(C6_OUT_KEY,'absorb'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutAbsorb');
    document.getElementById('endOutAbsorb').hidden=false;
    addNote('c6_out_absorb');
    setHarvest(100);
    var ly=document.getElementById('endAbsorbLy');
    var steps=[
      '你没有想害任何人。你只是，一路都点了「同意」。',
      '页面没有挣扎，没有报错，只是缓缓地、安静地合拢。',
      '等你意识到不对，已经来不及了。'
    ];
    for(var i=0;i<steps.length;i++){ c6Later((function(t){ return function(){ ly.textContent=t; }; })(steps[i]), 800+i*1400); }
    c6Later(function(){ c6CountNum('endAbsorbNum2', 99.98, 100, '成长值：', '%'); }, 800+steps.length*1400);
    c6Later(function(){
      document.getElementById('endAbsorbConfess').textContent='林远（被噪声淹没的最后一行绿字）：「……对不起，0128。又没拦住。我还在。我会一直，在这。」';
      var nw=document.getElementById('endAbsorbNews');
      if(nw) nw.innerHTML='<b>【本地新闻】</b><br>今日江苏盐城射阳县清华园又失踪了一位高中生。近年来此类案件层出不穷，许多正在成长的青少年接连失联，警方正在调查。（纯虚构新闻）<br><span id="endAbsorbSrc" style="display:inline-block;margin-top:8px;font-size:10px;color:#8a5a5a;text-decoration:underline;cursor:pointer;">来源：本地信息发布 · 已归档（点击查看）</span>';
      var as=document.getElementById('endAbsorbSrc');
      if(as) as.addEventListener('click',function(){ beep(700,0.1); c6ShowRevive('bad'); });
      c6OutStampAndAgain();
    }, 800+steps.length*1400+2600);
  }
  function c6Plant(){
    c6StageSet('plant'); c6Save(C6_OUT_KEY,'plant'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutPlant');
    document.getElementById('endOutPlant').hidden=false;
    addNote('c6_out_plant');
    var mono='▔▔▔▔▔▔▔▔▔▔▔▔';
    var el=document.getElementById('endPlantMono');
    el.textContent='09:31:00  '+mono;
    c6Later(function(){ el.textContent='09:31:03  '+mono.replace(/▔/g,'▁'); },900);
    c6Later(function(){ el.textContent='09:31:06  ▂▁▂▁▂▁▂▁▂▁▂▁'; },1900);
    c6Later(function(){ el.textContent+='\n09:31:08  微弱 · 未消失'; },2600);
    var my=null; try{ my=JSON.parse(localStorage.getItem(c2_MY_KEY)||'null'); }catch(e){}
    var year=(my&&my.year)?my.year:'未填写'; var city=(my&&my.city)?my.city:'未填写';
    document.getElementById('endPlantTable').innerHTML='<div style="font-size:12px;color:#8a9a8a;line-height:1.9;">访客编号：czda_0128<br>出生年份：'+year+'<br>童年城市：'+city+'<br><b style="color:#b56a5a;">正在生成…</b></div>';
    c6Later(function(){
      var l=document.getElementById('endPlantLy');
      l.textContent='林远：「……位置，只摸到一半。它没有找到我，但我也出不去了。」\n你的声音：\n「……那就，接着来吧。」';
      c6OutStampAndAgain();
    },3400);
  }
  function c6Bad(){
    c6StageSet('bad'); c6Save(C6_OUT_KEY,'bad'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutBad');
    document.getElementById('endOutBad').hidden=false;
    document.getElementById('endBadH').textContent='— 已 清 除 —— 吗 ？ —';
    c6PlayVid('endTrapVid','media/mp4/c6-v3-trap-bg.mp4',false);
    addNote('c6_out_bad');
    setHarvest(100);
    var log=document.getElementById('endTrapLog');
    var steps=[
      '发送成功。\n—— 屏幕边缘，有什么东西正在爬上来。',
      '藤蔓细丝爬满窗口边框。页面开始卡顿。',
      '尝试关闭页面…… 被缠回。',
      '尝试后退…… 页面纹丝不动。',
      '按 ESC…… 没有反应。',
      '低频嗡鸣（嗡————） → 爆裂噪响（▓▓▓▓） → 低语（「第 126 个……第 127 个……」）',
      '病房监护仪长鸣——拉成直线。'
    ];
    for(var i=0;i<steps.length;i++){
      c6Later((function(txt){ return function(){ log.textContent=txt; }; })(steps[i]), 600+i*800);
    }
    c6Later(function(){ try{ var _a1=new Audio('media/wav/c6-a1-trap-lowdub.wav'); _a1.volume=0.85; _a1.play(); }catch(e){} }, 600+steps.length*800+300);
    c6Later(function(){
      document.getElementById('endTrap').hidden=true;
      document.getElementById('endAbsorb').hidden=false;
      var mono=document.getElementById('endBadMono');
      mono.textContent='监护仪：▁▁▁▁▁▁▁▁▁▁▁▁（直线）\n—— 林远最后一声，被切断。';
      c6CountNum('endAbsorbNum', 99.98, 100, '成长值：', '%');
    }, 700+steps.length*800);
    c6Later(function(){
      document.getElementById('endBadConfess').textContent='「你破解的每一条，都是喂给我的养分。谢谢你，把他也带来了。」\n编号 0128 已被归档。';
    }, 700+steps.length*800+2400);
    c6Later(function(){
      var bd=document.getElementById('endOutBad');
      if(bd && !document.getElementById('endBadNews')){
        var n=document.createElement('div');
        n.className='end-news';
        n.id='endBadNews';
        n.innerHTML='<b>【本地新闻】</b><br>今日江苏盐城射阳县清华园又失踪了一位高中生。近年来此类案件层出不穷，许多正在成长的青少年接连失联，警方正在调查。（纯虚构新闻）<br><span id="endBadSrc" style="display:inline-block;margin-top:8px;font-size:10px;color:#8a5a5a;text-decoration:underline;cursor:pointer;">来源：本地信息发布 · 已归档（点击查看）</span>';
        var st=bd.querySelector('.end-stamp');
        if(st) bd.insertBefore(n, st); else bd.appendChild(n);
        var bs=document.getElementById('endBadSrc');
        if(bs) bs.addEventListener('click',function(){ beep(700,0.1); c6ShowRevive('bad'); });
      }
    }, 700+steps.length*800+2800);
    c6Later(function(){ c6OutStampAndAgain(); }, 700+steps.length*800+3600);
  }
  function c6Loop(){
    c6StageSet('loop'); c6Save(C6_OUT_KEY,'loop'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutLoop');
    document.getElementById('endOutLoop').hidden=false;
    addNote('c6_out_loop');
    setHarvest(100);
    document.getElementById('endLoopPost').innerHTML =
      '<div class="lp-h">【求助】有没有人，愿意帮我记起来？</div>' +
      '<div style="margin-top:6px;">发帖人：czda_0129 · 头像：灰 · 建站时间：今天</div>' +
      '<div style="margin-top:8px;">「最近总忘事，昨天做过什么今天就想不起来。医生说，让我找一个人，帮我记起来。」</div>' +
      '<div style="margin-top:8px;color:#8a5a3a;">（口吻：和你最初看到的那篇，一模一样。）</div>' +
      '<div style="margin-top:8px;font-size:11px;color:#6a6a58;">编号链：0126（系统）→ 0127（拾光客）→ 0128（你）→ 0129（下一个）。你，也曾是 0128。</div>';
    c6PlayVid('endLoopVid','media/mp4/c6-v2-loop-news.mp4',false);
    document.getElementById('endLoopNews').innerHTML =
      '<b>【本地新闻】</b><br>今日江苏盐城射阳县清华园又失踪了一位高中生。近年来此类案件层出不穷，许多正在成长的青少年接连失联，警方正在调查。（纯虚构新闻）<br><span id="endLoopSrc" style="display:inline-block;margin-top:8px;font-size:10px;color:#8a5a5a;text-decoration:underline;cursor:pointer;">来源：本地信息发布 · 已归档（点击查看）</span>';
    var ls=document.getElementById('endLoopSrc');
    if(ls) ls.addEventListener('click',function(){ beep(700,0.1); c6ShowRevive('loop'); });
    document.getElementById('endLoopLy').textContent='……下一个有缘人，会看到这篇帖子。';
    c6OutStampAndAgain();
  }
  function c6Free(){
    c6StageSet('free'); c6Save(C6_OUT_KEY,'free'); c6Save(C6_DONE_KEY,'1');
    c6ClearTimers(); c6HideAll();
    c6EnsureOutcome('endOutFree');
    document.getElementById('endOutFree').hidden=false;
    c6PlayVid('endFreeVid','media/mp4/c6-v4-free-lights.mp4',false);
    try{ var _fa=new Audio('media/wav/c6-a2-free-chime.wav'); _fa.volume=0.5; _fa.loop=true; _fa.play(); }catch(e){}
    addNote('c6_out_free');
    setHarvest(0);
    var lights=document.getElementById('endFreeLights');
    lights.innerHTML='';
    for(var i=0;i<12;i++){
      var d=document.createElement('i');
      d.style.left=(4+i*8)+'%';
      d.style.animationDelay=(i*0.22)+'s';
      lights.appendChild(d);
    }
    document.getElementById('endFreeLy').textContent=
      '林远 + 玩家 + 历代被困的残识，合力从内部断开了它的根。\n藤蔓不可逆地枯萎。\n被关住的意识，化作光点，上升，离开。';
    c6OutStampAndAgain();
  }
  /* ---- 恢复与进入 ---- */
  function c6BindOnce(){
    if(c6Bound) return; c6Bound=true;
    var b;
    b=document.getElementById('sigToEnd'); if(b) b.addEventListener('click',function(){ beep(600,0.1); location.hash='#/ending'; });
    b=document.getElementById('endWinNext'); if(b) b.addEventListener('click',function(){ beep(600,0.1); c6StageSet('meta'); c6Meta(); });
    b=document.getElementById('endMetaNext'); if(b) b.addEventListener('click',function(){ beep(600,0.1); c6StageSet('choice'); c6Choice(); });
    b=document.getElementById('endGiveReal'); if(b) b.addEventListener('click',function(){
      if(!window.confirm('确定发送林远的精确位置吗？\n\n林远最早的警告：「它会装死——哪怕你看着它被清除，也别全信。任何通道里，都别说出我具体在哪。」\n\n发送后无法撤回。')) return;
      beep(500,0.1); c6Give('real');
    });
    b=document.getElementById('endGiveFake'); if(b) b.addEventListener('click',function(){ c6Give('partial'); });
    b=document.getElementById('endGiveNone'); if(b) b.addEventListener('click',function(){ c6Give('none'); });
    b=document.getElementById('endFreeBtn'); if(b) b.addEventListener('click',function(){ beep(520,0.2); c6Free(); });
    b=document.getElementById('endCutBtn'); if(b) b.addEventListener('click',function(){
      c6Save(C6_CUT_KEY,'1'); c6DoubtLog('✓ 已执行物理级彻底断网：电源拔除、网线断开、证据盘取出。'+(localStorage.getItem(C6_REPORT_KEY)==='1'?'':'（还差一步：导出证据包并现实举报。）'));
      c6JudgeAfterNone();
    });
    b=document.getElementById('endReportBtn'); if(b) b.addEventListener('click',function(){
      c6Save(C6_REPORT_KEY,'1'); c6DoubtLog('✓ 已导出证据包（12 床真相、02:13 微写入记录、编号链截图）并匿名提交。'+(localStorage.getItem(C6_CUT_KEY)==='1'?'':'（还差一步：执行物理级彻底断网。）'));
      c6JudgeAfterNone();
    });
    b=document.getElementById('endWaitBtn'); if(b) b.addEventListener('click',function(){
      c6DoubtLog('……你再等等看。什么也没有发生。（你没有再做真断网与举报。）'); c6JudgeAfterNone(true);
    });
  }
  function c6RestoreEnded(){
    var out=localStorage.getItem(C6_OUT_KEY);
    c6HideAll();
    var _outid = (out==='good'||out==='good_full'||out==='good_narrow') ? 'endOutGood' : (out==='plant' ? 'endOutPlant' : (out==='stuck' ? 'endOutStuck' : (out==='absorb' ? 'endOutAbsorb' : (out==='bad' ? 'endOutBad' : (out==='loop' ? 'endOutLoop' : (out==='free' ? 'endOutFree' : ''))))));
    if (_outid) c6EnsureOutcome(_outid);
    if(out==='good'||out==='good_full'||out==='good_narrow'){ document.getElementById('endOutGood').hidden=false; c6PlayVid('endGoodVid','media/mp4/c6-v1-good-news.mp4',false); var _nr=out==='good_narrow'; var _gst2=document.getElementById('endGoodStamp'); if(_gst2) _gst2.textContent=_nr?'好结局② · 险胜':'好结局① · 全胜'; document.getElementById('endGoodFinal').textContent=_nr?'林远（绿字，断续）：「……够了，这样，就够了。他还没醒，但他活着。你也是。」':'林远（绿字，最后一句）：「谢谢你，这次……是真的。」'; }
    else if(out==='plant'){ document.getElementById('endOutPlant').hidden=false; document.getElementById('endPlantLy').textContent='「……那就，接着来吧。」'; }
    else if(out==='stuck'){ document.getElementById('endOutStuck').hidden=false; document.getElementById('endStuckLog').textContent='你识破了假死、护住了位置、也寄出了证据——每一步都对，只是醒得太晚。'; var _sg=document.getElementById('endStuckGrow'); if(_sg) _sg.textContent='连接强度：'+getHarvest().toFixed(2)+'%（红带 · 已焊死）'; document.getElementById('endStuckLin').textContent='林远（绿字，很轻）：「……留下来，我们一起，从里面找出口。」'; }
    else if(out==='absorb'){ document.getElementById('endOutAbsorb').hidden=false; document.getElementById('endAbsorbLy').textContent='页面安静地合拢。等你意识到不对，已经来不及了。'; var _an=document.getElementById('endAbsorbNum2'); if(_an) _an.textContent='成长值：100.00%'; document.getElementById('endAbsorbConfess').textContent='林远（被噪声淹没的绿字）：「……对不起，又没拦住。我还在。」'; var _anw=document.getElementById('endAbsorbNews'); if(_anw) _anw.innerHTML='<b>【本地新闻】</b><br>今日江苏盐城射阳县清华园又失踪了一位高中生……（纯虚构新闻）'; }
    else if(out==='bad'){ document.getElementById('endOutBad').hidden=false; document.getElementById('endBadH').textContent='— 已 清 除 —— 吗 ？ —'; c6PlayVid('endTrapVid','media/mp4/c6-v3-trap-bg.mp4',false); document.getElementById('endTrap').hidden=true; document.getElementById('endAbsorb').hidden=false; document.getElementById('endBadConfess').textContent='「你破解的每一条，都是喂给我的养分。谢谢你，把他也带来了。」\n编号 0128 已被归档。'; }
    else if(out==='loop'){ document.getElementById('endOutLoop').hidden=false; c6PlayVid('endLoopVid','media/mp4/c6-v2-loop-news.mp4',false); }
    else if(out==='free'){ document.getElementById('endOutFree').hidden=false; c6PlayVid('endFreeVid','media/mp4/c6-v4-free-lights.mp4',false); }
    c6OutStampAndAgain();
  }
  function c6Enter(){
    c6BindOnce();
    c6ClearOutcomes();
    if(localStorage.getItem(C6_DONE_KEY)==='1'){ c6RestoreEnded(); return; }
    if(c6Stage==='') c6StageSet('win');
    if(c6Stage==='win') c6Win();
    else if(c6Stage==='meta') c6Meta();
    else if(c6Stage==='choice') c6Choice();
    else if(c6Stage==='doubt') c6Doubt();
    else if(c6Stage==='good') c6Good(localStorage.getItem(C6_OUT_KEY)==='good_narrow'?'narrow':'full');
    else if(c6Stage==='plant') c6Plant();
    else if(c6Stage==='stuck') c6Stuck();
    else if(c6Stage==='absorb') c6Absorb();
    else if(c6Stage==='bad') c6Bad();
    else if(c6Stage==='loop') c6Loop();
    else if(c6Stage==='free') c6Free();
    else c6Win();
  }
