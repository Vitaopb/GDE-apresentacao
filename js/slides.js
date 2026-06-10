/* =============================================================================
 * slides.js — Apresentação em slides (planta 2D -> maquete 3D)
 * -----------------------------------------------------------------------------
 * Navega com ←/→, espaço, PageUp/PageDown. O 3D é inicializado só quando o
 * slide dele aparece pela primeira vez (precisa do canvas visível/dimensionado).
 * ===========================================================================*/

(function (global) {
  'use strict';

  var slides = [], idx = 0, init3d = false, firstView = true;

  function applyView(s, instant) {
    if (!global.Scene3D || !Scene3D.setView) return;
    var cam = (s.getAttribute('data-cam') || '').split(',').map(Number);
    var tgt = (s.getAttribute('data-target') || '').split(',').map(Number);
    if (cam.length === 3 && tgt.length === 3) {
      Scene3D.setView(cam[0], cam[1], cam[2], tgt[0], tgt[1], tgt[2], instant);
    }
  }

  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, k) { s.classList.toggle('slide--active', k === idx); });

    var s = slides[idx], canvas = document.getElementById('canvas3d');
    var is3d = s.getAttribute('data-slide') === '3d';

    // sai do foco de ambiente ao trocar de slide
    if (global.Scene3D && Scene3D.clearFocus) Scene3D.clearFocus();

    if (is3d && global.Scene3D) {
      if (canvas) canvas.style.display = 'block';
      if (!init3d) {
        init3d = true;
        Scene3D.init(canvas, global.PlantaDados);
      } else if (Scene3D.onShow) {
        Scene3D.onShow();
      }
      applyView(s, firstView);   // 1ª vez: posiciona instantâneo; depois anima
      firstView = false;
    } else if (canvas) {
      canvas.style.display = 'none';
    }

    // chuva de confetes no slide final
    if (global.Confetti) {
      if (s.getAttribute('data-slide') === 'final') Confetti.start();
      else Confetti.stop();
    }
  }

  function init() {
    slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        show(idx + 1); e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        show(idx - 1); e.preventDefault();
      }
    });
    show(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
