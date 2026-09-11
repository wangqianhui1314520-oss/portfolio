/* ============================================
 * game-signal.js — 自 index.html 行 7966-8220 拆分（去掉巨型 IIFE 外壳）
 * 生长档案 GROWTH ARCHIVE
 * ============================================ */
  /* ================= 第五章：信号中继台（真相调查 · 第二翻） ================= */
  var C5_DONE_KEY='grow_c5_done_v1', C5_STAGE_KEY='grow_c5_stage_v1';
  var c5Stage='', c5Bound=false;
  function c5Save(k,v){ try{localStorage.setItem(k,v);}catch(e){} }
  try{ c5Stage=localStorage.getItem(C5_STAGE_KEY)||''; }catch(e){}
  var c5HarvestMap = { enter:0.3, frag:1.2, cmp_a:0.3, cmp_b:0.3, cmp_c:0.3, reveal:0.7, exit:0.6, silence:0.4, matrix:1.0, chain:0.5, ip:0.5, warn:0.4, cut:1.0, done:1.5 };

  function c5Log(txt, cls){
    var log=document.getElementById('sigLog');
    if(!log) return;
    var d=document.createElement('div');
    d.className='sig-line'+(cls?' '+cls:'');
    d.textContent=txt;
    log.appendChild(d);
    log.scrollTop=log.scrollHeight;
  }
  function c5StageSet(s){ c5Stage=s; c5Save(C5_STAGE_KEY,s); }
  function c5Once(k){ if(localStorage.getItem('grow_awake_v1')==='1') return; if(c5HarvestMap[k]) onceHarvest('c5_'+k, c5HarvestMap[k]); }

  var c5CmpData = {
    a: { title:'比对 1/3 · 照片的来源',
         left:{h:'拾光客相册 · 2009-08-03 · 桥南街合影', b:'备注：自动补全，无原始文件。画面最右边的男孩，穿条纹衫，站在一棵树下。'},
         right:{h:'儿保归档 · 2003 · 合德老街合影', b:'同一棵树。最右边的男孩，穿同一件条纹衫。两张照片相隔六年，构图完全相同。'},
         concl:'同一段影像被重复使用——拾光客的「童年照片」没有自己的源头。' },
    b: { title:'比对 2/3 · 成年后的身高',
         left:{h:'拾光客档案 · 身高记录', b:'2015 年 178cm → 2026 年 184.5cm。成年后仍在「长」，从未间断。'},
         right:{h:'儿保归档 · 生长常识', b:'男性骨骺约在 18-20 岁闭合，闭合后身高不再自然增长。归档说明：成年后不应再出现身高更新。'},
         concl:'档案在违背身体规律地「续写」——只有照着表格填写的机器，才会这么长。' },
    c: { title:'比对 3/3 · 记忆的模板',
         left:{h:'拾光客日志 · 2013-09-01', b:'「开学了。最近总忘事，昨天做过什么今天就想不起来。去医院检查，医生说我压力太大。」'},
         right:{h:'林远日记 · 2013-09-01', b:'「开学了。最近总忘事，昨天做过什么今天就想不起来。去医院检查，医生说我压力太大。」'},
         concl:'一字不差。拾光客的「记忆」，是林远的记忆被抽走、重填的。' }
  };

  function c5OpenCmp(which){
    var d=c5CmpData[which];
    document.getElementById('sigCmpTitle').textContent=d.title;
    var cards=document.getElementById('sigCmpCards');
    cards.innerHTML='';
    [d.left,d.right].forEach(function(c){
      var div=document.createElement('div');
      div.className='sig-cmp-card';
      div.innerHTML='<b>'+c.h+'</b>'+c.b;
      cards.appendChild(div);
    });
    document.getElementById('sigCmp').hidden=false;
    window._c5cmp=which;
  }

  function c5ConfirmCmp(){
    var which=window._c5cmp||'a';
    var d=c5CmpData[which];
    c5Log('[比对 '+which.toUpperCase()+'/3] '+d.concl);
    document.getElementById('sigCmp').hidden=true;
    c5Once('cmp_'+which);   /* P2-3：三次比对独立结算（cmp_a/b/c 各 0.3，总量 0.9），不再共享一个 paid key */
    if(which==='a'){ c5StageSet('cmp_b'); if(localStorage.getItem('grow_awake_v1')!=='1') onceHarvest('c5_frag1',0.4); addNote('c5_frag_photo'); document.getElementById('sigFrag2').hidden=false; }
    if(which==='b'){ c5StageSet('cmp_c'); if(localStorage.getItem('grow_awake_v1')!=='1') onceHarvest('c5_frag2',0.4); addNote('c5_frag_grow'); document.getElementById('sigFrag3').hidden=false; }
    if(which==='c'){ if(localStorage.getItem('grow_awake_v1')!=='1') onceHarvest('c5_frag3',0.4); addNote('c5_frag_template'); c5Reveal(); }
    beep(700,0.08);
  }

  function c5Reveal(){
    c5StageSet('reveal');
    c5Once('reveal');
    document.getElementById('sigFragArea').hidden=true;
    document.getElementById('sigReveal').hidden=false;
    c5Log('——第二翻：拾光客不是人。');
    addNote('c5_reveal_bait');
  }

  /* ===== 第五章真实恐怖音效（Web Audio 合成，优化批次 P1-3） ===== */
  var c5Hctx = null, c5Hnodes = [];
  function c5Hstop() {
    try {
      for (var i = 0; i < c5Hnodes.length; i++) { try { c5Hnodes[i].stop(); } catch (e) {} try { c5Hnodes[i].disconnect(); } catch (e) {} }
      c5Hnodes = [];
      if (c5Hctx) { try { c5Hctx.close(); } catch (e) {} c5Hctx = null; }
    } catch (e) {}
  }
  /* 低频嗡鸣 + 噪声低语层 */
  function c5Hstart(durSec) {
    try {
      if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') return;
      c5Hstop();
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = c5Hctx = new AC();
      var master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
      var t0 = ctx.currentTime;
      /* 1) 55Hz 锯齿嗡鸣 + 0.7Hz 缓慢抖动 */
      var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.7;
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 13;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency); lfo.start();
      var g1 = ctx.createGain(); g1.gain.value = 0.22; osc.connect(g1); g1.connect(master);
      osc.start(t0); osc.stop(t0 + durSec);
      /* 2) 带通噪声低语：3.1Hz 颤音调制，模拟含糊人声 */
      var bufLen = Math.floor(ctx.sampleRate * 2);
      var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) { data[i] = Math.random() * 2 - 1; }
      var noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 1.4;
      var ng = ctx.createGain(); ng.gain.value = 0.05;
      var trem = ctx.createOscillator(); trem.frequency.value = 3.1;
      var tremGain = ctx.createGain(); tremGain.gain.value = 0.038;
      trem.connect(tremGain); tremGain.connect(ng.gain); trem.start();
      noise.connect(bp); bp.connect(ng); ng.connect(master);
      noise.start(t0); noise.stop(t0 + durSec);
      c5Hnodes.push(osc, lfo, noise, trem);
    } catch (e) {}
  }
  /* 掐断脉冲：低通噪声骤落 + 下坠音，模拟"信号被掐" */
  function c5HBurst() {
    try {
      if (!c5Hctx) return;
      var ctx = c5Hctx, t0 = ctx.currentTime;
      var bl = Math.floor(ctx.sampleRate * 0.4);
      var bbuf = ctx.createBuffer(1, bl, ctx.sampleRate);
      var bd = bbuf.getChannelData(0);
      for (var j = 0; j < bl; j++) { bd[j] = (Math.random() * 2 - 1) * (1 - j / bl); }
      var burst = ctx.createBufferSource(); burst.buffer = bbuf;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t0); lp.frequency.exponentialRampToValueAtTime(160, t0 + 0.35);
      var bg = ctx.createGain(); bg.gain.setValueAtTime(0.9, t0); bg.gain.exponentialRampToValueAtTime(0.01, t0 + 0.4);
      burst.connect(lp); lp.connect(bg); bg.connect(ctx.destination);
      burst.start(t0);
      var drop = ctx.createOscillator(); drop.type = 'sine'; drop.frequency.setValueAtTime(90, t0); drop.frequency.exponentialRampToValueAtTime(38, t0 + 0.5);
      var dg = ctx.createGain(); dg.gain.setValueAtTime(0.5, t0); dg.gain.exponentialRampToValueAtTime(0.01, t0 + 0.5);
      drop.connect(dg); dg.connect(ctx.destination);
      drop.start(t0); drop.stop(t0 + 0.55);
      c5Hnodes.push(burst, drop);
    } catch (e) {}
  }

  function c5PlayAudio(){
    var btn=document.getElementById('sigAudioPlay');
    if(!btn || btn.getAttribute('data-played')) return;
    btn.setAttribute('data-played','1');
    btn.style.pointerEvents='none';
    btn.textContent='播放中…';
    var fill=document.getElementById('sigAudioFill');
    var p=0;
    c5Hstart(4.2);
    var timer=setInterval(function(){
      p+=2;
      if(fill) fill.style.width=Math.min(p,100)+'%';
      if(p>=40){
        clearInterval(timer);
        c5Cutout();
      }
    },200);
  }

  function c5Cutout(){
    c5HBurst();
    setTimeout(function(){ c5Hstop(); }, 700);
    var fill=document.getElementById('sigAudioFill'); if(fill) fill.style.width='40%';
    var btn=document.getElementById('sigAudioPlay'); if(btn) btn.textContent='▶ 音频已在第 4 秒被掐断';
    var bar=document.getElementById('sigAudioBar'); if(bar) bar.style.border='1px solid #5a2a2a';
    document.getElementById('sigReveal').hidden=true;
    document.getElementById('sigCutout').hidden=false;
    c5StageSet('cutout');
    c5Once('exit'); c5Once('silence');
    addNote('c5_exit_warn');
    setTimeout(function(){
      var w=document.getElementById('sigCutoutWait');
      if(w) w.textContent='信道静默中…… 仍在尝试连接';
    },3000);
  }

  function c5Reconnect(){
    c5Hstop();
    document.getElementById('sigCutout').hidden=true;
    c5Log('——信道恢复。0126 还在。');
    c5Log('0126：……它还活着。我差点以为……没事。趁现在，我把它的全貌给你看。');
    document.getElementById('sigMatrix').hidden=false;
    c5StageSet('matrix');
    c5Once('matrix'); c5Once('chain');
      c6PlayVid('sigMatrixVid','media/mp4/c6-v5-matrix-dv.mp4',true);
    addNote('c5_matrix'); addNote('c5_chain');
    beep(520,0.1);
  }

  function c5ShowPlan(){
    document.getElementById('sigMatrix').hidden=true;
    document.getElementById('sigPlan').hidden=false;
    c5StageSet('plan');
    c5Once('ip');
    addNote('c5_local_ip');
    beep(700,0.1);
  }

  function c5DoCut(){
    var btn=document.getElementById('sigCutBtn');
    if(btn.getAttribute('data-cut')) return;
    btn.setAttribute('data-cut','1');
    btn.style.pointerEvents='none';
    btn.textContent='正在切断…';
    document.getElementById('sigCutProgress').hidden=false;
    var p=0;
    var timer=setInterval(function(){
      p+=3;
      var f=document.getElementById('sigCutFill'); if(f) f.style.width=Math.min(p,100)+'%';
      var l=document.getElementById('sigCutLabel'); if(l) l.textContent='正在断开… '+Math.min(p,100)+'%';
      if(p>=90 && !btn.__nail){
        btn.__nail=1;
        c5Log('02:13 微写入：SY-IDC-01 仍在回应……');
      }
      if(p>=100){ clearInterval(timer); c5CutDone(); }
    },100);
  }

  function c5CutDone(){
    c5Once('cut');
    document.getElementById('sigPlan').hidden=true;
    document.getElementById('sigDone').hidden=false;
    c5Log('——SY-IDC-01 已离线。');
    c5StageSet('cut');
    setTimeout(function(){
      var nail=document.getElementById('sigDoneNail');
      if(nail) nail.hidden=false;
    },2200);
    setTimeout(function(){
      c5Once('warn');
      addNote('c5_lie_warn'); addNote('c5_cut_done');
      var note=document.getElementById('sigDoneNote');
      if(note) note.textContent='林远的警告已写入探查笔记：「它会装死——哪怕你看着它被清除，也别全信。任何通道里，都别说出我具体在哪。」';
      c5Done();
    },4200);
  }

  function c5Done(){
    if(localStorage.getItem(C5_DONE_KEY)==='1') return;
    c5Save(C5_DONE_KEY,'1');
    c5StageSet('done');
    c5Once('done');
    addNote('c5_dark_nail');
    document.getElementById('sigFinish').hidden=false;
    var ste=document.getElementById('sigToEnd'); if(ste) ste.hidden=false;
    var st=document.getElementById('sigStatus');
    if(st) st.innerHTML='<span class="sig-dot"></span>信道状态：SY-IDC-01 已离线 · 0126 静默中';
    c5EnsureEntry();
    beep(440,0.2);
  }

  function c5EnsureEntry(){
    var card=document.getElementById('invTrans');
    if(!card) return;
    var ent=document.getElementById('invC5Entry');
    if(!ent){
      ent=document.createElement('div');
      ent.id='invC5Entry';
      ent.style.cssText='margin-top:10px;padding:8px 12px;background:#0d1410;border:1px solid #2a4a34;border-radius:4px;cursor:pointer;font-size:12px;color:#7ac97a;font-weight:600;text-align:center;';
      ent.addEventListener('click',function(){ beep(700,0.12); location.hash='#/signal'; });
      card.appendChild(ent);
    }
    ent.innerHTML = localStorage.getItem(C5_DONE_KEY)==='1' ? '→ 重新进入信号中继台（第五章）' : '→ 信号中继台有新信号（第五章）';
    ent.hidden=false;
  }

  function c5BindOnce(){
    if(c5Bound) return; c5Bound=true;
    var b1=document.getElementById('sigCmpABtn'); if(b1) b1.addEventListener('click',function(){ beep(700,0.08); c5OpenCmp('a'); });
    var b2=document.getElementById('sigCmpBBtn'); if(b2) b2.addEventListener('click',function(){ beep(700,0.08); c5OpenCmp('b'); });
    var b3=document.getElementById('sigCmpCBtn'); if(b3) b3.addEventListener('click',function(){ beep(700,0.08); c5OpenCmp('c'); });
    var ok=document.getElementById('sigCmpOk'); if(ok) ok.addEventListener('click',c5ConfirmCmp);
    var ap=document.getElementById('sigAudioPlay'); if(ap) ap.addEventListener('click',c5PlayAudio);
    var rc=document.getElementById('sigReconnect'); if(rc) rc.addEventListener('click',c5Reconnect);
    var mn=document.getElementById('sigMatrixNext'); if(mn) mn.addEventListener('click',c5ShowPlan);
    var cb=document.getElementById('sigCutBtn'); if(cb) cb.addEventListener('click',c5DoCut);
    var nail=document.getElementById('sigDoneNail'); if(nail) nail.addEventListener('click',c5CheckNail);
  }
  function c5CheckNail(){
    if(localStorage.getItem('grow_awake_v1')==='1') return;   /* 四章证据墙已觉醒者不再重复记录 */
    addNote('c5_nail_awake');                                 /* 纯叙事：暗钉不再锁定增长，觉醒的带级意义由 c4Awake 承担 */
    var t=document.getElementById('sigDoneNail');
    if(t){ t.style.cursor='default'; t.textContent='[system] 02:13 微写入 x1 · 来源：SY-IDC-01 —— 已清除的系统，为什么还在写入？'; }
    beep(55,0.6);
  }

  function c5Restore(){
    c5BindOnce();
    var done=localStorage.getItem(C5_DONE_KEY)==='1';
    if(done){
      document.getElementById('sigDone').hidden=false;
      var nail=document.getElementById('sigDoneNail'); if(nail) nail.hidden=false;
      var note=document.getElementById('sigDoneNote');
      if(note) note.textContent='第五章已完成：SY-IDC-01 已离线，林远留下警告后静默。断网之后……（第六章）';
      document.getElementById('sigFinish').hidden=false;
      var ste=document.getElementById('sigToEnd'); if(ste) ste.hidden=false;
      var st=document.getElementById('sigStatus');
      if(st) st.innerHTML='<span class="sig-dot"></span>信道状态：SY-IDC-01 已离线 · 0126 静默中';
      c5Log('——SY-IDC-01 已离线。');
      c5EnsureEntry();
      return;
    }
    switch(c5Stage){
      case 'cmp_b':
        document.getElementById('sigFrag1').hidden=false; c5OpenCmp('b');
        break;
      case 'cmp_c':
        document.getElementById('sigFrag1').hidden=false;
        document.getElementById('sigFrag2').hidden=false; c5OpenCmp('c');
        break;
      case 'reveal':
        document.getElementById('sigReveal').hidden=false;
        break;
      case 'cutout':
        document.getElementById('sigCutout').hidden=false;
        break;
      case 'matrix':
        document.getElementById('sigMatrix').hidden=false;
        break;
      case 'plan':
        document.getElementById('sigPlan').hidden=false;
        break;
      case 'cut':
        document.getElementById('sigDone').hidden=false;
        break;
      default:
        document.getElementById('sigFragArea').hidden=false;
        document.getElementById('sigFrag1').hidden=false;
    }
  }

  function c5Enter(){
    c5BindOnce();
    if(c5Stage==='' && localStorage.getItem(C5_DONE_KEY)!=='1'){
      c5Log('[中继台 v0.9] 正在尝试连接 0126 信道……');
      c5Log('[中继台 v0.9] 信道已建立（不稳定）。信号来自损坏音轨、被回退操作与删除残片。');
    }
    c5Restore();
  }
