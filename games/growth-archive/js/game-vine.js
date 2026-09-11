/* ============================================
 * game-vine.js — 隐藏链接：藤蔓的备份（仅好结局①·全胜后出现）
 * 生长档案 GROWTH ARCHIVE
 *
 * 在「全胜」结局页脚（.end-stamp 之后）追加一个完全透明的 <a>，
 * 肉眼不可见，点击直接打开续集视频链接。
 * 链接以 base64 反转混淆存储，源码中无明文。
 * ============================================ */
(function () {
  /* 链接 https://xhslink.cn/o/6ogWe79OemP 的 base64 反转存储（运行时解码） */
  var _seed = '=AVbl9UO3U2Vn9mNv82LuNmLr5WasNHa49yL6MHc0RHa';

  function dec() {
    try { return atob(_seed.split('').reverse().join('')); }
    catch (e) { return ''; }
  }
  function getOut() { try { return localStorage.getItem('grow_c6_outcome_v1'); } catch (e) { return ''; } }

  function addLink() {
    var box = document.getElementById('endOutGood');
    if (!box || document.getElementById('vineLink')) return;
    var a = document.createElement('a');
    a.id = 'vineLink';
    a.href = dec();
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = '';
    a.style.cssText = 'display:block;width:100%;height:18px;opacity:0;cursor:pointer;';
    var stamp = box.querySelector('.end-stamp');
    if (stamp && stamp.parentNode) stamp.parentNode.insertBefore(a, stamp.nextSibling);
    else box.appendChild(a);
  }

  function init() {
    if (getOut() !== 'good_full') return;
    var box = document.getElementById('endOutGood');
    if (!box || box.hidden) return;
    addLink();
  }

  window.__vineInit = init;

  /* 恢复场景兜底：刷新后结局卡片已显示时自动挂链接 */
  try {
    var tries = 0;
    (function poll() {
      tries++;
      if (tries > 24) return;
      var box = document.getElementById('endOutGood');
      if (box && !box.hidden && getOut() === 'good_full') init();
      else setTimeout(poll, 500);
    })();
  } catch (e) {}
})();
