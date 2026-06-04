/* =============================================================================
 * slides.js — Apresentação em slides (planta 2D -> maquete 3D)
 * -----------------------------------------------------------------------------
 * Navega com ←/→, espaço, PageUp/PageDown. O 3D é inicializado só quando o
 * slide dele aparece pela primeira vez (precisa do canvas visível/dimensionado).
 * ===========================================================================*/

(function (global) {
  'use strict';

  var slides = [], idx = 0, init3d = false;

  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, k) { s.classList.toggle('slide--active', k === idx); });

    if (slides[idx].getAttribute('data-slide') === '3d' && global.Scene3D) {
      if (!init3d) {
        init3d = true;
        Scene3D.init(document.getElementById('canvas3d'), global.PlantaDados);
      } else if (Scene3D.onShow) {
        Scene3D.onShow();
      }
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
