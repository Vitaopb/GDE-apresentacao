/* =============================================================================
 * confetti.js — chuva de confetes para o slide final.
 * Confetti.start() começa a chuva; Confetti.stop() para e limpa.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var COLORS = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d',
                '#43aa8b', '#577590', '#ef476f', '#06d6a0', '#118ab2', '#ffd166'];
  var timer = null, container = null;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function piece() {
    if (!container) return;
    var d = document.createElement('i');
    d.className = 'cft';
    var w = rnd(7, 14);
    d.style.left = rnd(0, 100) + '%';
    d.style.width = w + 'px';
    d.style.height = (Math.random() < 0.4 ? w : w * 0.45) + 'px';   // tiras e quadradinhos
    d.style.background = COLORS[(Math.random() * COLORS.length) | 0];
    var dur = rnd(2.6, 5.2), delay = rnd(0, 0.4);
    d.style.animationDuration = dur + 's';
    d.style.animationDelay = delay + 's';
    d.style.setProperty('--rot', rnd(-540, 540) + 'deg');
    d.style.setProperty('--drift', rnd(-80, 80) + 'px');
    container.appendChild(d);
    setTimeout(function () { d.remove(); }, (dur + delay) * 1000 + 300);  // limpeza garantida
  }

  function start() {
    container = document.getElementById('confetti');
    if (!container) return;
    stop();
    var i;
    for (i = 0; i < 70; i++) setTimeout(piece, i * 18);   // estouro inicial
    timer = setInterval(function () {
      for (var j = 0; j < 7; j++) piece();
    }, 240);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (container) container.innerHTML = '';
  }

  global.Confetti = { start: start, stop: stop };
})(window);
