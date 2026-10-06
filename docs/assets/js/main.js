/* ============================================
   作品集主控：主题 / Hero / 3D 圆环 / 列表 / 街机 / 详情
   ============================================ */

(function () {
  var D = window.PORTFOLIO_DATA;
  if (!D) { console.error("data.js 未加载"); return; }

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var pad2 = function (v) { return v < 10 ? "0" + v : String(v); };

  var works = D.works || [];
  /* 全部作品进 3D 圆环；如需分组，把这里改成 filter 即可 */
  var ringWorks = works.slice();
  var listWorks = [];

  /* ---------- 画风切换 ---------- */
  var THEME_KEY = "portfolio-theme";
  var themes = ["scifi", "terminal", "ink", "swiss", "aurora"];

  function applyTheme(name) {
    if (themes.indexOf(name) === -1) name = "scifi";
    var root = document.documentElement;
    /* 切换瞬间关掉过渡，避免大面积重绘造成的闪频 */
    root.classList.add("no-trans");
    root.setAttribute("data-theme", name);
    if (window.MatrixRain) window.MatrixRain.setColor(getComputedStyle(root).getPropertyValue("--accent"));
    try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
    var btns = document.querySelectorAll(".sw-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].dataset.theme === name);
    }
    if (window.__arcade) {
      if (name === "scifi") { window.__arcade.start(); }
      else { window.__arcade.stop(); }
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove("no-trans"); });
    });
  }

  var saved = "scifi";
  try { saved = localStorage.getItem(THEME_KEY) || "scifi"; } catch (e) {}
  applyTheme(saved);
  if (window.MatrixRain) window.MatrixRain.init(document.getElementById("matrix"));

  $("switcher").addEventListener("click", function (e) {
    var btn = e.target.closest(".sw-btn");
    if (btn) applyTheme(btn.dataset.theme);
  });

  /* ---------- Hero ---------- */
  var p = D.profile || {};
  if (p.award) {
    $("hero-award").hidden = false;
    $("hero-award").innerHTML = '<span class="award-star">&#9733;</span> ' + esc(p.award);
  }
  $("hero-tag").textContent = p.title || "";
  $("hero-title").innerHTML = esc(p.name || "作品集") +
    (p.tagline ? " <em>· " + esc(p.tagline) + "</em>" : "");
  $("hero-desc").textContent = p.intro || "";
  $("footer-name").textContent = (p.name || "") + (p.cnName ? " · " + p.cnName : "") + (p.location ? " · " + p.location : "");
  if (p.enName) $("brand").textContent = p.enName.toUpperCase();

  $("hero-links").innerHTML = (p.links || [])
    .filter(function (l) { return l.url; })
    .map(function (l) {
      return '<a class="pill" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
        esc(l.label) + "</a>";
    }).join("");

  $("stat-works").textContent = pad2(works.length);

  /* 触屏设备：街机提示文案换成手指操控 */
  var hintEl = document.querySelector(".arcade-hint");
  if (hintEl && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    hintEl.innerHTML = "<i></i>手指拖动操控飞船 · 自动开火 · 击碎数据碎片";
  }

  /* ---------- 片段 ---------- */
  function tagsHTML(stack) {
    if (!stack || !stack.length) return "";
    return '<div class="tags">' + stack.map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("") + "</div>";
  }

  function linksHTML(links) {
    if (!links || !links.length) return "";
    return links.map(function (l) {
      return '<a class="btn" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
        esc(l.label || "查看") + "</a>";
    }).join("");
  }

  function specsHTML(specs) {
    if (!specs || !specs.length) return "";
    return '<div class="specs">' + specs.map(function (s) {
      return '<div class="spec"><span>' + esc(s.k) + "</span><span>" + esc(s.v) + "</span></div>";
    }).join("") + "</div>";
  }

  function imagesHTML(images) {
    if (!images || !images.length) return "";
    return '<div class="detail-gallery">' +
      images.map(function (img) {
        return '<figure>' +
          '<img src="' + esc(img.src) + '" alt="' + esc(img.caption || "") + '" loading="lazy">' +
          (img.caption ? '<figcaption>' + esc(img.caption) + '</figcaption>' : '') +
        '</figure>';
      }).join("") +
    '</div>';
  }

  function highlightsHTML(hl) {
    if (!hl || !hl.length) return "";
    return '<ul class="hl">' + hl.map(function (h) {
      return "<li>" + esc(h) + "</li>";
    }).join("") + "</ul>";
  }

  function playBtnHTML(w) {
    var play = w.play || { type: "none", url: "" };
    var can = play.url && play.type !== "none";
    var label = can ? (play.type === "external" ? "观看 / 打开" : "立即试玩") : "地址待接入";
    return '<button class="btn btn-primary" data-play="' + esc(w.id) + '"' +
      (can ? "" : " disabled") + ">" + label + "</button>";
  }

  /* ---------- 详情面板 ---------- */
  var detail = $("detail");
  var opened = 0;

  var worksWrap = $("works-wrap");
  var certsWrap = $("certs-wrap");
  function moveDetailTo(wrap) {
    if (wrap && detail.parentNode !== wrap) wrap.appendChild(detail);
  }

  var ringApi1 = null, ringApi2 = null;
  function closeDetail() {
    detail.classList.remove("open");
    detail.innerHTML = "";
    if (ringApi1) ringApi1.popOut();
    if (ringApi2) ringApi2.popOut();
  }

  function renderDetail(w) {
    detail.innerHTML =
      '<div class="detail-head">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<span class="dt-type">' + esc(w.type || "") + "</span>" +
          "<h3>" + esc(w.title) + "</h3>" +
        "</div>" +
        '<button class="detail-close" id="detail-close">&times;</button>' +
      "</div>" +
      '<div class="detail-body">' +
        '<div class="detail-main">' +
          '<div class="meta-row">' +
            (w.year ? "<span>" + esc(w.year) + "</span>" : "") +
            (w.role ? "<span>" + esc(w.role) + "</span>" : "") +
            (w.status ? '<span class="badge">' + esc(w.status) + "</span>" : "") +
            (w.subtitle ? "<span>" + esc(w.subtitle) + "</span>" : "") +
          "</div>" +
          '<p class="detail-desc">' + esc(w.desc) + "</p>" +
          (w.video
            ? '<div class="detail-video"><video src="' + esc(w.video) + '" controls preload="metadata" playsinline></video></div>'
            : "") +
          (w.images ? imagesHTML(w.images) : "") +
          highlightsHTML(w.highlights) +
          (w.excerpt ? '<div class="excerpt">' + esc(w.excerpt) + "</div>" : "") +
          tagsHTML(w.stack) +
          '<div class="actions">' + playBtnHTML(w) + linksHTML(w.links) + "</div>" +
        "</div>" +
        '<div class="detail-side">' +
          (w.specs && w.specs.length
            ? '<div style="font-family:var(--font-display);font-size:11px;letter-spacing:.14em;color:var(--accent);">SPEC</div>' +
              specsHTML(w.specs)
            : "") +
        "</div>" +
      "</div>";

    detail.classList.add("open");
    $("detail-close").addEventListener("click", closeDetail);

    opened++;
    if (opened === 3) unlock("ARCHIVIST", "已查阅 3 份档案");
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- 3D 卡片流轮播 ---------- */
  var gameWorks = works.filter(function (w) { return (w.section || "game") === "game"; });
  var workWorks = works.filter(function (w) { return (w.section || "game") === "work"; });

  ringApi1 = window.initRing({
    stage: $("ring-stage"),
    ring: $("ring"),
    items: gameWorks,
    counter: $("ring-counter"),
    prev: $("ring-prev"),
    next: $("ring-next"),
    onSelect: function (w, i) {
      moveDetailTo(worksWrap);
      ringApi1.popIn(i);
      renderDetail(w);
    },
    onRotate: closeDetail
  });

  ringApi2 = window.initRing({
    stage: $("ring-stage-2"),
    ring: $("ring-2"),
    items: workWorks,
    counter: $("ring-counter-2"),
    prev: $("ring-prev-2"),
    next: $("ring-next-2"),
    onSelect: function (w, i) {
      moveDetailTo(certsWrap);
      ringApi2.popIn(i);
      renderDetail(w);
    },
    onRotate: closeDetail
  });

  /* ---------- 其余作品列表（当前全部进了圆环，列表留空则隐藏） ---------- */
  var listSection = document.querySelector(".list-section");
  if (!listWorks.length && listSection) listSection.style.display = "none";

  $("list-grid").innerHTML = listWorks.map(function (w) {
    return '<article class="lcard clip" data-lw="' + esc(w.id) + '">' +
      '<div class="lc-sub">' + esc(w.type || "") + "</div>" +
      "<h3>" + esc(w.title) + "</h3>" +
      (w.subtitle
        ? '<div style="font-size:12px;color:var(--text-dim);">' + esc(w.subtitle) + "</div>"
        : "") +
      "<p>" + esc(w.desc) + "</p>" +
      specsHTML(w.specs) +
      tagsHTML(w.stack) +
      '<div class="actions">' + playBtnHTML(w) + linksHTML(w.links) + "</div>" +
      "</article>";
  }).join("");

  /* ---------- 试玩弹窗 ---------- */
  var modal = $("modal");
  var modalBody = $("modal-body");

  function openModal(title, url, ratio) {
    $("modal-title").textContent = title;
    modalBody.style.aspectRatio = ratio || "16 / 9";
    modalBody.innerHTML = url
      ? '<iframe src="' + esc(url) + '" allowfullscreen allow="autoplay; fullscreen; gamepad"></iframe>'
      : '<div class="modal-empty">地址尚未配置<br>在 data.js 的 works 里填入 play.url 即可启用</div>';
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    if (window.__arcade) window.__arcade.stop();
    unlock("PLAYTESTER", "启动了一次试玩");
  }

  function closeModal() {
    modal.classList.remove("open");
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
    if (window.__arcade && document.documentElement.getAttribute("data-theme") === "scifi") {
      window.__arcade.start();
    }
  }

  $("modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-play]");
    if (!btn) return;
    var w = works.filter(function (x) { return x.id === btn.dataset.play; })[0];
    if (!w) return;
    var play = w.play || {};
    if (play.type === "external") {
      if (play.url) window.open(play.url, "_blank", "noopener");
    } else {
      openModal(w.title, play.url, play.ratio);
    }
  });

  /* ---------- 成就提示 ---------- */
  var got = {};
  function unlock(name, desc) {
    if (got[name]) return;
    got[name] = true;
    var wrap = $("toast-wrap");
    var el = document.createElement("div");
    el.className = "toast clip";
    el.innerHTML = "ACHIEVEMENT // " + esc(name) + "<small>" + esc(desc) + "</small>";
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .5s";
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 3600);
  }

  /* ---------- 街机小游戏 ---------- */
  var scoreEl = $("stat-score");
  var livesEl = $("stat-lives");
  var statusEl = $("stat-status");
  var ROMAN = ["OFFLINE", "I", "II", "III"];

  window.__arcade = window.initArcade($("arcade-canvas"), {
    onStats: function (score, lives) {
      scoreEl.textContent = String(score).padStart(4, "0");
      livesEl.textContent = ROMAN[Math.max(0, Math.min(3, lives))];
      if (score >= 100) unlock("SHARPSHOOTER", "得分突破 100");
      if (score >= 500) unlock("ACE PILOT", "得分突破 500");
    },
    onDead: function () {
      statusEl.textContent = "SYS.REBOOT";
      setTimeout(function () { statusEl.textContent = "SYS.ONLINE"; }, 2400);
    }
  });

  applyTheme(document.documentElement.getAttribute("data-theme") || "scifi");
})();
