/* 代码流（matrix 雨）组件 —— 作品集与简历共用
   用法：<canvas id="matrix"></canvas> + MatrixRain.init(画布) + setColor(主题强调色)
   显隐由 CSS 控制：仅在 [data-theme="terminal"] 时可见 */
(function () {
  var canvas, ctx, fontSize = 14, cols, drops, color = "#00e5a0", raf = null;
  var chars = ("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
    "0123456789ABCDEFｱｲｳｴｵ@#$%&*+=<>/\\|").split("");

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.ceil(canvas.width / fontSize);
    drops = new Array(cols).fill(0).map(function () { return Math.random() * -60; });
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "rgba(6,9,10,0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + "px monospace";
    ctx.fillStyle = color;
    for (var i = 0; i < cols; i++) {
      var ch = chars[(Math.random() * chars.length) | 0];
      var x = i * fontSize, y = drops[i] * fontSize;
      ctx.fillText(ch, x, y);
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    raf = requestAnimationFrame(draw);
  }

  window.MatrixRain = {
    init: function (cv) {
      canvas = cv;
      if (!canvas) return;
      ctx = canvas.getContext("2d");
      resize();
      window.addEventListener("resize", resize);
      if (!raf) raf = requestAnimationFrame(draw);
    },
    setColor: function (c) {
      if (c) color = String(c).trim() || color;
    }
  };
})();
