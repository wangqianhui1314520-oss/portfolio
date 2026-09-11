/* ============================================
 * game-investigate.js — 自 index.html 行 7409-7965 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================================================================
     第四章 · 网络痕迹调查（嫌疑人追踪）
     ================================================================ */
  Object.assign(NOTES, {
    c4_news_coma: { cat: '证据', title: '林远2015年昏迷', desc: '射阳日报报道：林远2015年6月30日凌晨在家中昏迷，与成长档案关停同日。昏迷前电脑显示成长档案网站。', src: '第四章·新闻存档' },
    c4_forum_plan: { cat: '证据', title: '林远有预谋', desc: '本地论坛多人证实：林远昏迷前提到"第127个快完成了""有人在用网络养人"，同学说他要"查到底"。', src: '第四章·本地论坛' },
    c4_ly_log: { cat: '证据', title: '林远日志承认目标', desc: '林远QQ空间日志："第127个已经在长了，叫拾光客。我要去毁掉它。"访客记录有拾光客。', src: '第四章·林远QQ空间' },
    c4_diary_plan: { cat: '证据', title: '林远日记记录犯罪计划', desc: '加密日记详细记录：2013年发现被改记忆→2014年注册0126入侵后台→2015年计划物理销毁服务器。最后一篇被截断。', src: '第四章·电子日记' },
    c4_lin_threat: { cat: '证据', title: '林远的威胁', desc: '调查过程中多次收到林远的匿名留言："别查了""你不知道你在帮谁""下一个就是你"，10秒后自动消失。', src: '第四章·调查过程' },
    c4_conclusion: { cat: '关键线索', title: '嫌疑人画像：林远', desc: '6条证据全部指向林远：有预谋（2013年起）、有技术能力（0126管理员账号）、有作案时间（每日02:13）、有明确目标（拾光客=第127个）。', src: '第四章·证据墙' },
    c4_hosp_coma: { cat: '证据', title: '林远是植物人', desc: '射阳县人民医院病案：林远 2015-06-30 02:13 昏迷、02:40 入院，ICU 3 楼 __ 床（床位打码，离线快照字段缺失），持续植物状态 4,0xx 天，无苏醒记录。', src: '第四章·医院病案' },
    c4_hosp_anomaly: { cat: '异常', title: '昏迷者仍在操作', desc: '病案显示林远入院后再未醒来；但账号 0126 在 2015-06-30 之后仍每天 02:13 登录、停留 47 分钟、继续写入。2026 年病床监护仪在 02:13 记录到 41 次 47 分钟异常放电。', src: '第四章·医院病案' },
    c4_reflip_ally: { cat: '关键线索', title: '第一翻：林远是盟友', desc: '病案推翻了旧结论：昏迷的人不可能操作账号。0126 是林远 2014 年注册的反击账号，昏迷后被它接管。林远是第 126 个受害者，撑了十一年。', src: '第四章·证据重读' },
    c4_lin_contact: { cat: '人物', title: '林远的信号', desc: '林远的意识第一次主动联系玩家：拾光客是它 2013 年造出来的，别信它；明天 02:13 备份时会再联系；先去找一件它从没改过的东西。', src: '第四章·信号' },
    c4_key_unmodified: { cat: '关键线索', title: '它从没改过的东西', desc: '林远提示：在它备份之前，去找一件它从未改过的东西——可能是打破循环的唯一线索。', src: '第四章·林远信号' },
    c4_lin_pos: { cat: '地点', title: '林远的本体位置（残缺）', desc: '只确认他在射阳县人民医院 ICU，2015-06-30 入院，持续植物状态至今。精确床位与住院号在病案中打码，林远说通道干净了会亲口告诉我。这是唯一能救下他的锚点。', src: '第四章·医院病案' },
    c4_lin_warning: { cat: '关键线索', title: '林远的叮嘱', desc: '林远警告：它一直在找他的本体，只要知道位置，就能把他最后一点也补完、抹掉。绝不能把位置告诉拾光客。', src: '第四章·林远信号' },
    c4_awake: { cat: '关键线索', title: '觉醒 · 时间线核对', desc: '02:13 昏迷、02:13 登录、02:13 脑电异常——同一分钟。病案里躺了十一年的人，不可能同时坐在电脑前。你亲手把这个矛盾钉死了：从此每一步，都带着清醒。', src: '第四章·矛盾条' },
    c5_frag_photo: { cat: '异常', title: '照片没有来源', desc: '拾光客相册里的童年合影与儿保归档中林远的照片完全相同——同一段影像被重复使用，拾光客的「童年」没有自己的源头。', src: '第五章·残片 1' },
    c5_frag_grow: { cat: '异常', title: '成年后仍在长', desc: '拾光客身高 2015 年后每年约 0.2cm 持续更新，违背骨骺闭合的生理规律——只有照着表格填写的机器才会这么长。', src: '第五章·残片 2' },
    c5_frag_template: { cat: '关键线索', title: '记忆的模板', desc: '拾光客 2013-09-01 的日志与林远同日日记一字不差。拾光客的「记忆」是林远的记忆被抽走、重填的。', src: '第五章·残片 3' },
    c5_reveal_bait: { cat: '关键线索', title: '钓饵现形', desc: '拾光客是藤蔓 2013 年生成的钓饵人格，现实中不存在。前面的温情求助，全是诱饵。', src: '第五章·第二翻' },
    c5_exit_warn: { cat: '关键线索', title: '快退出！这是陷阱！', desc: '林远紧急音频在第 4 秒被强制掐断，0126 信道一度失联——它发现了。', src: '第五章·紧急音频' },
    c5_matrix: { cat: '异常', title: '电子生长全貌', desc: '藤蔓以人的记忆为养料伪装「成长」：档案成年后仍在长、记忆被抽走重填、科技有了自我意识、城市对照「人在消失，城市在长」。', src: '第五章·母体' },
    c5_chain: { cat: '时间线', title: '编号链', desc: '0126 林远（被困）→ 0127 拾光客（钓饵）→ 0128 你（现在）→ 0129（下一个？）。每收割一人，结出一颗新种子。', src: '第五章·编号链' },
    c5_local_ip: { cat: '地点', title: '本地节点 SY-IDC-01', desc: '藤蔓的本地物理节点：射阳数据机房 3 号柜，IP 10.13.2.113。它从没改过这个地址——它需要它活着。', src: '第五章·断网方案' },
    c5_lie_warn: { cat: '关键线索', title: '林远的警告', desc: '「它会装死——哪怕你看着它被清除，也别全信。任何通道里，都别说出我具体在哪。」', src: '第五章·林远' },
    c5_cut_done: { cat: '时间线', title: '断网行动', desc: '2026 年按林远指引切断 SY-IDC-01 互联网连接，藤蔓本地节点离线。', src: '第五章·断网' },
    c5_dark_nail: { cat: '异常', title: '微写入', desc: '断网后后台仍出现一次 02:13 微写入（来源：SY-IDC-01）。清除似乎过于顺利……', src: '第五章·暗钉' },
    c6_fake_win: { cat: '关键线索', title: '伪胜利', desc: '断网后弹出「威胁已清除」——但它来得太容易。增长值被冻结，官方通报像一次预演。', src: '第六章·系统通告' },
    c6_meta_file: { cat: '异常', title: '我也在表里', desc: '系统生成了「我的成长档案」：czda_0128，与拾光客成长值 99.98% 并排。我填的出生年份和童年城市，都在上面。', src: '第六章·我的档案' },
    c6_lin_ask: { cat: '关键线索', title: '林远补全精确位置', desc: '通道里，林远认为已安全，主动补全本体位置：射阳县人民医院 ICU 3 楼 12 床，住院号 SYYY-2015-06142——病案里打码的那两位，此刻被填上了。', src: '第六章·0126 信号' },
    c6_give_real: { cat: '关键线索', title: '我发送了精确位置', desc: '我把林远的精确位置发送了出去。……如果它真的是藤蔓留的空呢？', src: '第六章·抉择' },
    c6_give_partial: { cat: '时间线', title: '我只给了模糊位置', desc: '我只给出了模糊位置。不知道够不够救他。', src: '第六章·抉择' },
    c6_give_none: { cat: '关键线索', title: '我识破了假死', desc: '我拒绝在通道里说出林远的位置——「它会装死」。这通道太干净了，干净得像它故意留的。', src: '第六章·抉择' },
    c6_cut_real: { cat: '时间线', title: '真正的断网', desc: '物理级彻底断网：电源、网线、证据盘，全部切断。', src: '第六章·断网' },
    c6_report: { cat: '时间线', title: '现实举报', desc: '含 12 床真相的证据包已导出并匿名提交。', src: '第六章·举报' },
    c6_out_good: { cat: '关键线索', title: '好结局① · 全胜', desc: '绿带（信息获取度≤14%），藤蔓抓不住你，从容强退、真断网、举报成功，林远获救——「谢谢你，这次……是真的。」', src: '第六章·结局' },
    c6_out_narrow: { cat: '关键线索', title: '好结局② · 险胜', desc: '黄带（15–29%），它抓住了你一半，你硬挣出去、报警成功，但林远保住却未醒，你也留下一道永久残留。赢，但有代价。', src: '第六章·结局' },
    c6_out_stuck: { cat: '关键线索', title: '中性结局② · 永困灰区', desc: '红带（≥30%）。你识破了、护住了、也举报了，每一步都对——可获取度太高已被焊死，清醒地永远留在系统里，继续和林远一起找出口。', src: '第六章·结局' },
    c6_out_absorb: { cat: '关键线索', title: '坏结局① · 吸收', desc: '红带、一路同意、密保填真，你没害任何人却被整体吸收。林远没有死，他还在网里，只留下一句「对不起，又没拦住」。', src: '第六章·结局' },
    c6_free_unlock: { cat: '关键线索', title: '隐藏操作已解锁', desc: '连续签到 100 天，你触到了它从内部断开的方法——这是唯一不看获取度、不看抉择的生路。', src: '第六章·隐藏' },
    c6_out_bad: { cat: '关键线索', title: '坏结局② · 双亡', desc: '主动报出精确位置，12 床被抹除。林远死了，我也被吸收——都成了养料。此结局不看获取度，一旦报位置即锁死。', src: '第六章·结局' },
    c6_out_plant: { cat: '关键线索', title: '中性结局① · 植物人接班', desc: '只给了模糊/部分位置。它只摸到一半，林远肉身没保住、残识留网；我成了下一个「植物人意识体」。此结局基本不看获取度。', src: '第六章·结局' },
    c6_out_loop: { cat: '关键线索', title: '循环结局 · 0129', desc: '我被吸收成新的钓饵。下一个有缘人，会看到那篇帖子。', src: '第六章·结局' },
    c6_out_free: { cat: '关键线索', title: '隐藏结局 · 解放', desc: '从内部断开了它的根。被困的意识化作光点，上升，释放。', src: '第六章·结局' },
    c5_nail_awake: { cat: '关键线索', title: '觉醒 · 微写入核查', desc: '断网后你主动核对了那一次 02:13 的微写入——已清除的系统不该再有写入。你抓住了它装死的尾巴：从此每一步，都带着清醒。', src: '第五章·暗钉' }
  });

  var c4ModTitles = { search:'信息检索', news:'新闻存档', forum:'本地论坛', linyuan:'林远QQ空间', diary:'电子日记', evidence:'证据墙', hospital:'医院病案' };
  var c4UrlMap = {
    search: 'www.sy-info.cn/search',
    news: 'www.sy-info.cn/news/20150703',
    forum: 'www.sy-info.cn/forum/t/8847',
    linyuan: 'user.qzone.qq.com/44****88',
    diary: 'www.sy-info.cn/diary/linyuan',
    evidence: 'www.sy-info.cn/evidence',
    hospital: 'www.sy-info.cn/hospital/SYYY-2015-061__'
  };
  var C4_EV_KEY='grow_c4_ev_v1', C4_DONE_KEY='grow_c4_done_v1', C4_MSG_KEY='grow_c4_msg_v1', C4_HOSP_KEY='grow_c4_hosp_v1', C4_STAGE_KEY='grow_c4_stage_v1';
  var c4CurrentMod='search', c4Bound=false, c4EvCount=0, c4MsgShown=0;
  try { c4EvCount=parseInt(localStorage.getItem(C4_EV_KEY)||'0')||0; c4MsgShown=parseInt(localStorage.getItem(C4_MSG_KEY)||'0')||0; } catch(e){}
  function c4Save(k,v){ try{localStorage.setItem(k,v);}catch(e){} }
  function c4Harvest(key,n){ if(localStorage.getItem('grow_awake_v1')==='1') return; onceHarvest(key,n); }
  var c4Evidence = { news:false, forum:false, linyuan:false, diary:false, c3:false, threat:false };
  try { var _c4e=JSON.parse(localStorage.getItem('grow_c4_evlist_v1')||'{}'); for(var k in _c4e) c4Evidence[k]=_c4e[k]; } catch(e){}
  function c4SaveEv(){ try{ localStorage.setItem('grow_c4_evlist_v1',JSON.stringify(c4Evidence)); }catch(e){} }

  var c4LinMsgs = [
    '别查了。你不知道你在帮谁。',
    '下一个，就是你。',
    '拾光客不是你想的那样。',
    '停下来。再查下去，你会后悔的。',
    '……它在看着你。'
  ];

  var c4HarvestMap = { news:0.5, forum:0.5, linyuan:0.5, diary:0.5, threat:0.4 };
  function c4CollectEv(key) {
    if (c4Evidence[key]) return;
    c4Evidence[key]=true; c4SaveEv();
    c4EvCount++; c4Save(C4_EV_KEY,String(c4EvCount));
    if(key!=='c3') c4UnlockMod('evidence');
    var n=document.getElementById('invEvCount'); if(n) n.textContent=c4EvCount;
    var el=document.querySelector('.ev-item[data-ev="'+key+'"]'); if(el) el.hidden=false;
    var tag=document.querySelector('.inv-evidence-tag[data-ev="'+key+'"]'); if(tag) tag.style.display='block';
    c4UpdateProgress();
    if(key==='news') addNote('c4_news_coma');
    if(key==='forum') addNote('c4_forum_plan');
    if(key==='linyuan') addNote('c4_ly_log');
    if(key==='threat') addNote('c4_lin_threat');
    if(c4HarvestMap[key] && localStorage.getItem('grow_awake_v1')!=='1') onceHarvest('c4_ev_'+key, c4HarvestMap[key]);
    c4CheckComplete();
    beep(700,0.1);
  }

  function c4UpdateProgress() {
    var pct=Math.round(c4EvCount/6*100);
    var p=document.getElementById('invProgress'); if(p) p.textContent=pct+'%';
    var f=document.getElementById('invProgressFill'); if(f) f.style.width=pct+'%';
    var m=document.getElementById('invProgressMeta');
    if(m){
      if(c4EvCount>=6){ m.textContent='调查完成，嫌疑人已锁定'; }
      else {
        var _miss=[];
        if(!c4Evidence.news) _miss.push('新闻存档(搜「林远」)');
        if(!c4Evidence.forum) _miss.push('本地论坛(读新闻帖子8847)');
        if(!c4Evidence.linyuan) _miss.push('林远空间(搜「空间」)');
        if(!c4Evidence.diary) _miss.push('电子日记(搜「日记」)');
        if(!c4Evidence.c3) _miss.push('医院归档(第三章·随访样本)');
        if(!c4Evidence.threat) _miss.push('匿名留言(继续调查还会出现)');
        m.textContent='已收集 '+c4EvCount+'/6 条证据 · 还差：'+_miss.join('、');
      }
    }
  }

  var c4ThreatAudio=null;
  function c4ShowLinMsg() {
    var overlay=document.getElementById('invLinMsg');
    if(!overlay || !overlay.hidden) return;
    var idx=Math.floor(Math.random()*c4LinMsgs.length);
    document.getElementById('invLinMsgText').textContent=c4LinMsgs[idx];
    overlay.hidden=false;
    beep(88,0.6);
    /* 威胁留言低语（优化批次 P1-6） */
    try{
      if(c4ThreatAudio){ try{ c4ThreatAudio.pause(); }catch(e){} c4ThreatAudio=null; }
      var _ta=new Audio('media/wav/c4-threat-whisper.wav');
      _ta.volume=0.5;
      var _tp=_ta.play(); if(_tp&&_tp.catch) _tp.catch(function(){});
      c4ThreatAudio=_ta;
    }catch(e){}
    c4MsgShown++; c4Save(C4_MSG_KEY,String(c4MsgShown));
    if(c4MsgShown>=2) c4CollectEv('threat');
    setTimeout(function(){
      var t2=document.getElementById('invLinMsgText');
      if(!t2 || !overlay || overlay.hidden) return;
      var old=t2.textContent, oldC=t2.style.color;
      t2.textContent='—— 别相信你看到的一切 ——';
      t2.style.color='#a0311f';
      setTimeout(function(){ t2.textContent=old; t2.style.color=oldC||'#fff'; },200);
    },4200);
    setTimeout(function(){ if(overlay) overlay.hidden=true; },10000);
  }

  var c4LockHints={
    news:'新闻存档尚未解锁：先在信息检索中搜索「林远」。',
    forum:'本地论坛尚未解锁：先阅读新闻（帖子编号 8847），或搜索「论坛」。',
    linyuan:'林远QQ空间尚未解锁：先搜索「林远」或「空间」。',
    diary:'电子日记尚未解锁：先搜索「日记」。',
    evidence:'证据墙尚未解锁：先收集至少 1 条证据。'
  };
  function c4UnlockMod(mod){
    var n=document.querySelector('.inv-nav-item[data-invmod="'+mod+'"]');
    if(n){
      n.setAttribute('data-locked','0');
      var lk=n.querySelector('.inv-lock'); if(lk) lk.parentNode.removeChild(lk);
    }
  }
  function c4OpenResult(mod){
    // 从检索结果进入模块：医院需先经站内信解锁；其余模块解锁并进入
    if(mod==='hospital'){
      if(localStorage.getItem(C4_HOSP_KEY)!=='1'){ bwAlert('住院病案尚未开放：请先在网络调查中完成 6 条证据收集，并按站内信指引操作。','warn'); return; }
      c4MarkMod('hospital');
      return;
    }
    c4UnlockMod(mod);
    c4MarkMod(mod);
  }
  function c4MarkMod(mod,noPush) {
    if(!c4ModTitles[mod]) mod='search';
    var navEl=document.querySelector('.inv-nav-item[data-invmod="'+mod+'"]');
    if(navEl && navEl.getAttribute('data-locked')==='1'){
      bwAlert(c4LockHints[mod]||'该模块尚未解锁：请先在信息检索中搜索定位。','warn');
      return;
    }
    if(mod==='hospital' && localStorage.getItem(C4_HOSP_KEY)!=='1' && localStorage.getItem(C4_DONE_KEY)!=='1'){
      bwAlert('医院病案已锁定：请先在网络调查中收集全部 6 条证据，并完成站内信指引。','warn');
      return;
    }
    c4CurrentMod=mod;
    try{ browser.setAttribute('url',c4UrlMap[mod]); }catch(e){}
    bwUpdateTabTitle('网络调查 - '+c4ModTitles[mod],3);
    if(!noPush) bwPushHistory({zone:'investigate',mod:mod});
    var cr=document.getElementById('invCrumb'); if(cr) cr.textContent=c4ModTitles[mod];
    document.querySelectorAll('#view-investigate .inv-nav-item').forEach(function(n){
      n.className = n.getAttribute('data-invmod')===mod ? 'inv-nav-item on' : 'inv-nav-item';
    });
    ['search','news','forum','linyuan','diary','evidence','hospital'].forEach(function(m){
      var el=document.getElementById('invmod-'+m); if(el) el.hidden=(m!==mod);
    });
    // 进入各模块自动收集证据
    if(mod==='news') c4CollectEv('news');
    if(mod==='forum') c4CollectEv('forum');
    if(mod==='linyuan') c4CollectEv('linyuan');
    if(mod==='diary' && !document.getElementById('diaryContent').hidden) c4CollectEv('diary');
    if(mod==='evidence') c4RenderEvidence();
    // 触发林远留言（确定性：日记解锁后，前 2 次进入非 search 模块必弹，集满「威胁」证据后不再打扰）
    if(mod!=='search' && c4Evidence.diary && c4MsgShown<2) {
      setTimeout(c4ShowLinMsg, 1500);
    }
  }

  function c4RenderEvidence() {
    var allFound=true;
    for(var k in c4Evidence) { if(!c4Evidence[k]) allFound=false; }
    var sum=document.getElementById('evSummary');
    if(sum) sum.hidden=!allFound;
    if(localStorage.getItem('grow_awake_v1')!=='1') onceHarvest('c4_evwall',0.3);
    c4RenderFlipState();
  }

  /* 医院记录核对：两处核对完成后解锁病程摘要与翻案按钮 */
  function c4VerifyHosp(which){
    var key='grow_c4_hospcheck_v1';
    var v=''; try{ v=localStorage.getItem(key)||''; }catch(e){}
    if(which==='a' && v.indexOf('a')<0) v+='a';
    if(which==='n' && v.indexOf('n')<0) v+='n';
    c4Save(key,v);
    var av=document.getElementById('medAdmitVerify');
    if(av) av.textContent=v.indexOf('a')>=0?'✓ 已核对：02:13 昏迷，与证据墙「新闻存档」一致':'[未核对] 核对：02:13 昏迷，与证据墙「新闻存档」一致？';
    var nv=document.getElementById('medNurseVerify');
    if(nv) nv.textContent=v.indexOf('n')>=0?'✓ 已核对：02:13 异常持续 47 分钟，与入院记录一致':'[未核对] 核对：02:13 异常持续 47 分钟，与入院记录一致？';
    if(v.indexOf('a')>=0 && v.indexOf('n')>=0){
      c4UnlockFlip();
      bwAlert('两份记录核对完毕，病程记录摘要已解锁。','ok');
    } else {
      beep(700,0.08);
    }
  }
  function c4UnlockFlip(){
    var fk=document.getElementById('medFlipKey');
    if(fk){
      fk.setAttribute('data-locked','0');
      fk.style.color='#a0311f';
      fk.textContent='▸ 展开：把这份病案，和你查到的调查结论放在一起看';
    }
    var fb=document.getElementById('invFlipBtn'); if(fb) fb.disabled=false;
  }

  /* 翻案状态渲染：完成翻案后改写证据墙旧结论、显示翻案卡片 */
  function c4RenderFlipState() {
    var done = localStorage.getItem(C4_DONE_KEY)==='1';
    var wall=document.getElementById('invFlipWall');
    var evf=document.getElementById('evFlipCard');
    if(done){
      if(wall) wall.hidden=false;
      if(evf) evf.hidden=false;
      var co=document.getElementById('evContradiction'); if(co) co.hidden=true;
      var old=document.querySelector('#evSummary .evs-warn');
      if(old) old.innerHTML='结论：林远有预谋、有技术能力、有作案时间——<span style="text-decoration:line-through;">所有证据指向林远是篡改成长档案的真凶</span>。<br><span style="color:#4a6a32;font-weight:700;">（已被医院病案推翻，见「证据重读」）</span>';
      var fc=document.getElementById('invFlipCta'); if(fc) fc.hidden=true;
      var sig=document.getElementById('invSignalBtn'); if(sig) sig.disabled=true;
    }
  }

  /* 解锁医院病案模块 */
  function c4UnlockHospital(){
    c4Save(C4_HOSP_KEY,'1');
    var nav=document.getElementById('invNavHospital');
    if(nav){
      nav.setAttribute('data-locked','0');
      nav.style.color='';
      var lk=nav.querySelector('.inv-lock'); if(lk) lk.parentNode.removeChild(lk);
    }
  }

  /* 林远首次主动联系（第一翻结尾钩子） */
  function c4ShowLinContact(){
    var ov=document.getElementById('invLinContact');
    if(!ov || !ov.hidden) return;
    document.getElementById('invLinContactText').textContent =
      '0128。终于有人查到这里了。\n'+
      '我是林远，2013 年被它标记的第 126 个。\n'+
      '我的身体，被困在射阳县人民医院的 ICU 里。\n'+
      '精确的位置——通道不干净，我不能在这里说。等确认安全，我自己告诉你。\n'+
      '它把我的账号夺走，用我的名字继续骗人。\n'+
      '拾光客——是它 2013 年造出来的。别信它。\n'+
      '它一直在找我的本体。只要知道我在哪，它就能把我最后一点也补完、抹掉。\n'+
      '所以——任何通道里，都别说出我具体在哪。等真的安全了，我自己告诉你。\n'+
      '我撑了十一年。你走到这一步，它还不知道。\n'+
      '明天 02:13，它备份的时候，我会再联系你。\n'+
      '在那之前——去找一件它从没改过的东西。';
    ov.hidden=false;
    beep(88,0.9);
    c4Harvest('c4_signal',0.5);
    addNote('c4_lin_contact'); addNote('c4_key_unmodified');
    setTimeout(function(){ if(ov) ov.hidden=true; },15000);
    c4Done();
  }

  /* 第四章完成：翻案归档 */
  function c4Done(){
    if(localStorage.getItem(C4_DONE_KEY)==='1') return;
    c4Save(C4_DONE_KEY,'1');
    c4Harvest('c4_done',1.8);
    addNote('c4_reflip_ally');
    c4Save('grow_c4_linpos','partial');
    addNote('c4_lin_pos'); addNote('c4_lin_warning');
    c4RenderFlipState();
    var card=document.getElementById('invTrans'); if(!card) return;
    var links=card.querySelectorAll('.inv-mail-link');
    for(var i=0;i<links.length;i++){ if(links[i].parentNode) links[i].parentNode.removeChild(links[i]); }
    document.getElementById('invTransBody').textContent =
      '（确认记录已归档）\n'+
      '谢谢你。我去了医院，确认了——他躺在 ICU，躺了十一年，从来没有醒过。\n'+
      '也就是说，这些年来每天 02:13 动我档案的，不是他。\n'+
      '……我一直在查一个躺在病床上的人。他阻止了它十一年。\n'+
      '我不知道该说什么了。林远，如果你还能看到这些——谢谢你。\n'+
      '（档案正在重新对齐。它似乎注意到我们在查它了。下一次备份 02:13。）';
    var note=document.createElement('div');
    note.style.cssText='margin-top:10px;font-size:11px;color:#8a7a4a;';
    note.textContent='第四章 · 完。林远翻案为盟友，其信号已写入探查笔记。';
    card.appendChild(note);
    if (typeof c5EnsureEntry === 'function') c5EnsureEntry();
  }

  function c4CheckComplete() {
    if(c4EvCount<6) return;
    if(localStorage.getItem(C4_DONE_KEY)==='1') return;
    var stage=localStorage.getItem(C4_STAGE_KEY)||'';
    addNote('c4_conclusion');
    c4RenderEvidence();
    var card=document.getElementById('invTrans'); if(!card) return;
    if(stage===''){
      // 第一封：提示画像矛盾，不给医院链接
      c4Save(C4_STAGE_KEY,'hint');
      card.hidden=false;
      document.getElementById('invTransBody').textContent=
        '谢谢你帮我查了这么多。画像出来了，但……我反而有点不确定了。\n'+
        '画像时间线写着：林远 2015 年昏迷后「意识继续作案」。\n'+
        '可他 2015-06-30 就进了 ICU，新闻里写得清清楚楚——再也没有醒过。\n'+
        '一个植物人，怎么做到每天 02:13 登录账号、停留 47 分钟、继续写入？\n'+
        '回证据墙看看画像。那里有一处说不通的地方——你帮我看一眼。';
      var co=document.getElementById('evContradiction'); if(co) co.hidden=false;
      return;
    }
    if(stage==='hint'){
      // 已提示矛盾，等待玩家在证据墙点开矛盾条
      var co2=document.getElementById('evContradiction'); if(co2) co2.hidden=false;
      return;
    }
    // stage==='contradiction'：第二封，给医院链接
    card.hidden=false;
    document.getElementById('invTransBody').textContent=
      '你说得对。02:13 昏迷，02:13 登录——同一分钟，一个人不可能同时躺在 ICU 和坐在电脑前。\n'+
      '那每天 02:13 动我档案的，到底是谁？\n'+
      '我查到了他的位置。射阳县人民医院，ICU 重症监护室——具体床位和住院号都被系统打码了。他在那躺了十一年。\n'+
      '你能不能……帮我去确认一下？确认他还在那里，确认他没有骗我们。\n'+
      '只要确认了，我就知道该怎么做了。';
    if(card.querySelector('.inv-mail-link')) return;
    var link=document.createElement('div');
    link.className='inv-mail-link';
    link.style.cssText='margin-top:12px;padding:8px 12px;background:#f0f8e8;border:1px solid #a8c890;border-radius:4px;cursor:pointer;font-size:12px;color:#3a5a22;font-weight:600;';
    link.textContent='→ 前往医院病案系统，确认林远的位置';
    link.addEventListener('click',function(){
      beep(700,0.12);
      c4UnlockHospital();
      c4MarkMod('hospital');
    });
    card.appendChild(link);
  }

  function c4DoSearch() {
    var q=(document.getElementById('invSearchInput').value||'').trim();
    var box=document.getElementById('invSearchResults');
    if(!q){ box.innerHTML='<div style="color:#8a8a78;font-size:12px;">请输入关键词。</div>'; return; }
    var results=[];
    if(q.indexOf('林远')>=0 || q==='林远') {
      results=[
        {title:'射阳日报：我县一青年离奇昏迷，至今原因不明（2015-07-03）',desc:'射阳县青年林远于6月30日凌晨在家中昏迷，电脑显示成长档案网站……',mod:'news',source:'射阳日报存档'},
        {title:'射阳论坛：有没有人认识射阳县的林远？听说昏迷了',desc:'23条回复，多人提到林远昏迷前行为异常，说过"第127个快完成了"……',mod:'forum',source:'射阳论坛'},
        {title:'林远 的QQ空间（最后更新：2015-06-29）',desc:'3篇日志，最后一篇提到"第127个是拾光客""我要去毁掉它"……',mod:'linyuan',source:'QQ空间'}
      ];
    } else if(q.indexOf('昏迷')>=0 || q.indexOf('射阳')>=0) {
      results=[
        {title:'射阳日报：我县一青年离奇昏迷，至今原因不明（2015-07-03）',desc:'射阳县青年林远于6月30日凌晨在家中昏迷……',mod:'news',source:'射阳日报存档'}
      ];
    } else if(q.indexOf('0126')>=0 || q.indexOf('成长档案')>=0) {
      results=[
        {title:'成长档案非法访问账号0126调查报告',desc:'该账号首次出现于2015年，每日02:13活跃，疑似与林远有关。建议搜索"林远"获取更多信息。',mod:'search',source:'安全中心'}
      ];
    } else if(q.indexOf('日记')>=0 || q.indexOf('加密')>=0) {
      results=[
        {title:'林远加密电子日记（需密码解锁）',desc:'从林远电脑中恢复的加密日记，密码为4位数字日期。',mod:'diary',source:'数据恢复'}
      ];
    } else if(q.indexOf('医院')>=0 || q.indexOf('病案')>=0 || q.indexOf('ICU')>=0 || q.indexOf('住院')>=0 || q.indexOf('12床')>=0) {
      results=[
        {title:'射阳县人民医院 · 住院病案查询（需调查权限）',desc:'内网只读镜像：病案 SYYY-2015-061__，ICU 3 楼 __ 床（字段打码）。提示：先完成全部网络调查，按站内信指引解锁。',mod:'hospital',source:'医院内网'}
      ];
    } else {
      box.innerHTML='<div style="color:#8a8a78;font-size:12px;">未找到与"'+q+'"相关的结果。试试搜索"林远"、"昏迷"、"0126"。</div>';
      beep(180,0.15);
      return;
    }
    var html='';
    results.forEach(function(r){
      html+='<div class="search-result" data-mod="'+r.mod+'"><div class="sr-title">'+r.title+'</div><div class="sr-desc">'+r.desc+'</div><div class="sr-source">来源：'+r.source+'</div></div>';
    });
    box.innerHTML=html;
    box.querySelectorAll('.search-result').forEach(function(el){
      el.addEventListener('click',function(){ beep(700,0.08); c4OpenResult(el.getAttribute('data-mod')); });
    });
    beep(600,0.08);
  }

  function c4BindOnce() {
    if(c4Bound) return; c4Bound=true;
    document.querySelectorAll('#view-investigate .inv-nav-item').forEach(function(n){
      n.addEventListener('click',function(){ beep(); c4MarkMod(n.getAttribute('data-invmod')); });
    });
    var back=document.getElementById('invBackArc');
    if(back) back.addEventListener('click',function(){ beep(700,0.1); location.hash='#/archive'; });
    var sb=document.getElementById('invSearchBtn');
    if(sb) sb.addEventListener('click',c4DoSearch);
    var si=document.getElementById('invSearchInput');
    if(si) si.addEventListener('keydown',function(e){ if(e.key==='Enter') c4DoSearch(); });
    var db=document.getElementById('diaryBtn');
    if(db) db.addEventListener('click',function(){
      var v=(document.getElementById('diaryInput').value||'').trim();
      var msg=document.getElementById('diaryMsg');
      if(v==='0629'){
        document.getElementById('diaryLock').hidden=true;
        document.getElementById('diaryContent').hidden=false;
        if(msg){ msg.textContent=''; }
        c4CollectEv('diary');
        addNote('c4_diary_plan');
        beep(820,0.12);
      } else {
        if(msg){ msg.style.color='#a0311f'; msg.textContent='密码错误。提示：林远昏迷前一天的日期（MMDD）。'; }
        beep(180,0.18);
      }
    });
    var ak=document.getElementById('medAdmitKey');
    if(ak) ak.addEventListener('click',function(){
      var d=document.getElementById('medAdmitDetail');
      if(!d) return;
      d.hidden=!d.hidden;
      ak.textContent=d.hidden?'▸ 展开：02:40–03:31 监护室值班日志（含异常项）':'▾ 收起';
      if(!d.hidden) c4Harvest('c4_hosp_admit',0.3);
      beep(700,0.08);
    });
    var nk=document.getElementById('medNurseKey');
    if(nk) nk.addEventListener('click',function(){
      var d=document.getElementById('medNurseDetail');
      if(!d) return;
      d.hidden=!d.hidden;
      nk.textContent=d.hidden?'▸ 展开：2026 年全部「02:13 异常」条目（共 41 条）':'▾ 收起';
      if(!d.hidden) c4Harvest('c4_hosp_record',0.6);
      beep(700,0.08);
    });
    var fk=document.getElementById('medFlipKey');
    if(fk) fk.addEventListener('click',function(){
      if(fk.getAttribute('data-locked')==='1'){
        bwAlert('病程摘要已锁定：请先展开「入院记录」与「护理记录」，各自点按「核对」。','warn');
        return;
      }
      var d=document.getElementById('medFlipDetail');
      if(!d) return;
      d.hidden=!d.hidden;
      fk.textContent=d.hidden?'▸ 展开：把这份病案，和你查到的调查结论放在一起看':'▾ 收起';
      if(!d.hidden){ c4Harvest('c4_reflip',1.0); addNote('c4_hosp_anomaly'); beep(55,0.5); }
      beep(700,0.08);
    });
    var fb=document.getElementById('invFlipBtn');
    if(fb) fb.addEventListener('click',function(){
      var w=document.getElementById('invFlipWall');
      if(!w) return;
      w.hidden=false;
      fb.disabled=true;
      fb.textContent='证据已重读';
      var _tip=document.getElementById('invFlipTip');
      if(!_tip){
        _tip=document.createElement('div');
        _tip.id='invFlipTip';
        _tip.style.cssText='margin:10px 0 8px;font-size:12px;color:#a0311f;font-weight:600;';
        w.insertBefore(_tip, w.firstChild);
      }
      _tip.textContent='请逐条点击重读全部 6 条证据——它们可能已经不一样了。';
      c4Harvest('c4_reread',0.5);
      addNote('c4_hosp_coma');
      beep(820,0.12);
    });
    // 翻案墙：逐条点击重读，全部读完才解锁林远信号
    document.querySelectorAll('#invFlipWall .fw-item').forEach(function(it){
      var oldEl=it.querySelector('.fw-old');
      var nwEl=it.querySelector('.fw-new');
      var ar=it.querySelector('.fw-arrow');
      if(!oldEl) return;
      oldEl.style.cursor='pointer';
      oldEl.addEventListener('click',function(){
        var isOpen=!nwEl.hidden;
        nwEl.hidden=isOpen;
        if(ar) ar.textContent=isOpen?'▸':'▾';
        beep(700,0.08);
        if(!isOpen) c4CheckFwAll();
      });
    });
    function c4CheckFwAll(){
      var items=document.querySelectorAll('#invFlipWall .fw-item');
      var any=false, all=true;
      items.forEach(function(it){
        var nw=it.querySelector('.fw-new');
        if(nw && !nw.hidden) any=true; else all=false;
      });
      if(!any) return;
      if(all){
        var sig=document.getElementById('invSignalBtn');
        if(sig){ sig.disabled=false; sig.textContent='等待 0126 的信号…'; }
        var _tip=document.getElementById('invFlipTip');
        if(_tip) _tip.textContent='已重读全部证据。通道那头，有人在等。';
        beep(620,0.1);
      }
    }
    var av=document.getElementById('medAdmitVerify');
    if(av) av.addEventListener('click',function(){ c4VerifyHosp('a'); });
    var nv2=document.getElementById('medNurseVerify');
    if(nv2) nv2.addEventListener('click',function(){ c4VerifyHosp('n'); });
    var co=document.getElementById('evContradiction');
    if(co) co.addEventListener('click',function(){
      var b=document.getElementById('evContradictionBody');
      if(b) b.hidden=!b.hidden;
      beep(700,0.08);
    });
    var cb=document.getElementById('evContraBtn');
    if(cb) cb.addEventListener('click',function(){
      c4Save(C4_STAGE_KEY,'contradiction');
      beep(700,0.1);
      c4CheckComplete();
    });
    var awb=document.getElementById('evAwakeBtn');
    if(awb) awb.addEventListener('click',c4Awake);
    var sigb=document.getElementById('invSignalBtn');
    if(sigb) sigb.addEventListener('click',function(){ beep(88,0.6); c4ShowLinContact(); });
  }
  function c4Awake(){
    if(localStorage.getItem('grow_awake_v1')==='1') return;
    c4Save('grow_awake_v1','1');
    if(typeof tele==='function'){ try{ tele('awake','1'); }catch(e){} }
    /* 识破回退：无论觉醒时机（证据前/后点击），第四章证据全部不再入账。
       门控修复后，觉醒前已入账的部分在此回退，觉醒后未收集的部分被门控拦截，
       两种时机最终成长值一致（优化批次 P1-7 / P2-1）。 */
    try{
      if(localStorage.getItem('grow_c4_rebate_v1')!=='1'){
        var reb=0;
        for(var _rk in c4HarvestMap){
          if(c4HarvestMap[_rk]) reb+=c4HarvestMap[_rk];
        }
        if(reb>0){
          setHarvest(Math.max(0, getHarvest()-reb));
          updateHarvestUI();
        }
        localStorage.setItem('grow_c4_rebate_v1','1');
      }
    }catch(e){}
    addNote('c4_awake');
    var ab=document.getElementById('evAwakeBtn'); if(ab) ab.style.display='none';
    var ar=document.getElementById('evAwakeResult'); if(ar) ar.hidden=false;
    beep(620,0.12);
  }

  function c4Enter(mod){
    c4BindOnce();
    // 第三章证据自动带入
    if(localStorage.getItem('grow_c3_done_v1')==='1') c4CollectEv('c3');
    // 已完成玩家：全部模块解锁；进行中玩家按已解锁状态恢复
    if(localStorage.getItem(C4_DONE_KEY)==='1'){
      ['news','forum','linyuan','diary','evidence','hospital'].forEach(c4UnlockMod);
    } else {
      var elist=JSON.parse(localStorage.getItem('grow_c4_evlist_v1')||'{}');
      for(var ek in elist){ if(elist[ek] && ek!=='c3') c4UnlockMod(ek==='threat'?'evidence':ek); }
      if(Object.keys(elist).some(function(k){ return k!=='c3' && elist[k]; })) c4UnlockMod('evidence');
    }
    // 医院解锁状态恢复
    if(localStorage.getItem(C4_HOSP_KEY)==='1' || localStorage.getItem(C4_DONE_KEY)==='1') c4UnlockHospital();
    // 阶段状态恢复：矛盾提示 / 医院链接站内信
    var stage=localStorage.getItem(C4_STAGE_KEY)||'';
    if(stage==='hint' && localStorage.getItem(C4_DONE_KEY)!=='1'){
      var coR=document.getElementById('evContradiction'); if(coR) coR.hidden=false;
    }
    if(stage==='contradiction' && localStorage.getItem(C4_DONE_KEY)!=='1'){
      var cardR=document.getElementById('invTrans');
      if(cardR){ cardR.hidden=false; c4CheckComplete(); }
    }
    // 医院核对态恢复
    var hv=''; try{ hv=localStorage.getItem('grow_c4_hospcheck_v1')||''; }catch(e){}
    if(hv.indexOf('a')>=0 || hv.indexOf('n')>=0){
      var avR=document.getElementById('medAdmitVerify');
      if(avR) avR.textContent=hv.indexOf('a')>=0?'✓ 已核对：02:13 昏迷，与证据墙「新闻存档」一致':'[未核对] 核对：02:13 昏迷，与证据墙「新闻存档」一致？';
      var nvR=document.getElementById('medNurseVerify');
      if(nvR) nvR.textContent=hv.indexOf('n')>=0?'✓ 已核对：02:13 异常持续 47 分钟，与入院记录一致':'[未核对] 核对：02:13 异常持续 47 分钟，与入院记录一致？';
    }
    if(hv.indexOf('a')>=0 && hv.indexOf('n')>=0) c4UnlockFlip();
    c4MarkMod(mod||'search',true);
    c4UpdateProgress();
    // 恢复证据显示
    for(var k in c4Evidence){
      if(c4Evidence[k]){
        var el=document.querySelector('.ev-item[data-ev="'+k+'"]'); if(el) el.hidden=false;
        var tag=document.querySelector('.inv-evidence-tag[data-ev="'+k+'"]'); if(tag) tag.style.display='block';
      }
    }
    var n=document.getElementById('invEvCount'); if(n) n.textContent=c4EvCount;
    if(localStorage.getItem(C4_DONE_KEY)==='1'){
      if(localStorage.getItem('grow_c4_linpos')!=='partial'){ c4Save('grow_c4_linpos','partial'); addNote('c4_lin_pos'); addNote('c4_lin_warning'); }
      var card=document.getElementById('invTrans'); if(card) card.hidden=false;
      if(card && !card.querySelector('.inv-mail-link')){
        var body=document.getElementById('invTransBody');
        if(body) body.textContent=
          '（确认记录已归档）\n'+
          '谢谢你。我去了医院，确认了——他躺在 ICU，躺了十一年，从来没有醒过。\n'+
          '也就是说，这些年来每天 02:13 动我档案的，不是他。\n'+
          '……我一直在查一个躺在病床上的人。他阻止了它十一年。\n'+
          '我不知道该说什么了。林远，如果你还能看到这些——谢谢你。\n'+
          '（档案正在重新对齐。它似乎注意到我们在查它了。下一次备份 02:13。）';
        if (typeof c5EnsureEntry === 'function') c5EnsureEntry();
      }
    }
    c4RenderFlipState();
  }
