/* ============================================
   作品轮播 · 线性卡片流
   所有卡片同尺寸，中间放大高亮、两侧缩小淡出。
   无透视压缩、无曲面几何，结构上不存在重叠/竖条问题。
   ============================================ */

window.initRing = function (cfg) {
  var stage = cfg.stage;
  var ring = cfg.ring;
  var items = cfg.items;
  var onSelect = cfg.onSelect;

  var n = items.length;
  if (!n || !stage || !ring) return null;

  var CW = 300, CH = 390, GAP = 26;
  var active = 0;
  var cards = [];
  var lastMoved = 0;
  var popped = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(v) { return v < 10 ? "0" + v : String(v); }

  /* ---------- 建卡 ---------- */
  items.forEach(function (w, i) {
    var el = document.createElement("div");
    el.className = "ring-card clip";
    el.dataset.i = String(i);

    var cover = w.cover
      ? '<img src="' + esc(w.cover) + '" alt="' + esc(w.title || "") + '" loading="lazy" decoding="async">'
      : '<div class="ph"></div>';

    el.innerHTML =
      '<div class="rc-cover">' + cover + "</div>" +
      '<div class="rc-body">' +
        '<div class="rc-idx">WORK ' + pad(i + 1) + " // " + esc(w.type || "") + "</div>" +
        '<div class="rc-title">' + esc(w.title) + "</div>" +
        '<div class="rc-sub">' + esc(w.subtitle || "") + "</div>" +
        '<div class="rc-foot"><span>' + esc(w.year || "") + "</span><span>查看详情</span></div>" +
      "</div>";

    el.addEventListener("click", function () {
      if (lastMoved > 8) return;
      if (i === active) {
        if (onSelect) onSelect(w, i);
      } else {
        active = i;
        update();
      }
    });

    ring.appendChild(el);
    cards.push(el);
  });

  /* ---------- 环形差值（首尾相连，可无限转） ---------- */
  function normDiff(i) {
    var d = ((i - active) % n + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }

  /* ---------- 尺寸 ---------- */
  function layout() {
    var sw = stage.clientWidth || 900;
    CW = Math.round(Math.min(330, Math.max(230, sw / 3.2)));
    CH = Math.round(CW * 1.3);
    cards.forEach(function (el) {
      el.style.width = CW + "px";
      el.style.height = CH + "px";
    });
    update();
  }

  /* ---------- 状态 ---------- */
  function update() {
    cards.forEach(function (el, i) {
      var d = normDiff(i);
      var ad = Math.abs(d);

      el.style.setProperty("--tx", (d * (CW + GAP)) + "px");
      el.style.setProperty("--s", d === 0 ? (popped ? 1.07 : 1) : Math.max(0.76, 1 - ad * 0.08));

      var op = ad === 0 ? 1 : (ad === 1 ? 0.8 : (ad === 2 ? 0.3 : 0));
      el.style.opacity = op;
      /* 不可见的卡片必须 visibility 隐藏，否则平移到远处仍会撑出横向滚动条 */
      el.style.visibility = op > 0 ? "visible" : "hidden";
      el.style.pointerEvents = op < 0.1 ? "none" : "auto";
      el.style.zIndex = String(100 - ad);
      el.classList.toggle("active", d === 0);
    });

    if (cfg.counter) {
      cfg.counter.innerHTML = "<b>" + pad(active + 1) + "</b> / " + pad(n);
    }
  }

  /* ---------- 拖拽（挂 window，不 capture —— 否则会吞掉卡片的 click） ---------- */
  var dragging = false;
  var startX = 0;

  stage.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    lastMoved = 0;
    ring.classList.add("dragging");

    function onMove(ev) {
      if (!dragging) return;
      var dx = ev.clientX - startX;
      lastMoved = Math.abs(dx);
      ring.style.transform = "translateX(" + dx + "px)";
    }

    function onUp(ev) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!dragging) return;
      dragging = false;
      ring.classList.remove("dragging");
      ring.style.transform = "";
      var dx = (ev.clientX || startX) - startX;
      if (Math.abs(dx) > 60) {
        active = ((active + (dx < 0 ? 1 : -1)) % n + n) % n;
        notifyRotate();
      }
      update();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });

  /* ---------- 箭头 / 键盘 ---------- */
  function notifyRotate() {
    if (popped) {
      popOut();
      if (cfg.onRotate) cfg.onRotate();
    }
  }

  function go(dir) {
    active = ((active + dir) % n + n) % n;
    notifyRotate();
    update();
  }

  if (cfg.prev) cfg.prev.addEventListener("click", function () { go(-1); });
  if (cfg.next) cfg.next.addEventListener("click", function () { go(1); });

  document.addEventListener("keydown", function (e) {
    if (!stage.offsetParent) return;
    if (document.querySelector(".modal.open")) return;
    if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
  });

  /* ---------- 弹开 ---------- */
  function popIn(i) {
    if (i !== active) { active = ((i % n) + n) % n; }
    popped = true;
    update();
  }

  function popOut() {
    popped = false;
    update();
  }

  /* ---------- 尺寸监听 ---------- */
  var rzTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(layout, 140);
  });

  layout();

  return {
    go: go,
    relayout: layout,
    popIn: popIn,
    popOut: popOut,
    getIndex: function () { return active; },
    setActive: function (i) { active = ((i % n) + n) % n; update(); }
  };
};
