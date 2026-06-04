/* =============================================================================
 * main.js — Inicialização e tooltip da planta baixa
 * -----------------------------------------------------------------------------
 * Desenha a planta (via PlantaRender) e exibe um tooltip ao passar o mouse
 * sobre um ambiente. (A barra lateral com legenda/lista foi removida.)
 * ===========================================================================*/

(function (global) {
  'use strict';

  var data = global.PlantaDados;
  var dom = {};

  function fmt(n) { return n.toLocaleString('pt-BR'); }

  function setupTooltip() {
    var tip = dom.tooltip;

    dom.svg.addEventListener('mousemove', function (e) {
      var g = e.target.closest ? e.target.closest('.room') : null;
      if (!g || !g.__room || g.__room.decorative) { tip.hidden = true; return; }

      var r = g.__room;
      var html = '<strong>' + r.name + '</strong>';
      if (r.beds) html += '<span class="tooltip__row">🛏️ ' + r.beds + '</span>';
      if (typeof r.area === 'number') {
        html += '<span class="tooltip__row">📐 ' + (r.areaLabel || (fmt(r.area) + ' m²'));
        var nLeitos = r.beds ? parseInt(r.beds, 10) : 0;
        if (nLeitos > 0 && r.area > 0) {
          var unidade = /berç/i.test(r.beds) ? 'berço' : 'leito';
          html += ' · ' + fmt(Math.round((r.area / nLeitos) * 100) / 100) + ' m²/' + unidade;
        }
        html += '</span>';
      }
      tip.innerHTML = html;
      tip.hidden = false;

      var pad = 14;
      var rect = dom.stage.getBoundingClientRect();
      var x = e.clientX - rect.left + pad;
      var y = e.clientY - rect.top + pad;
      if (x + tip.offsetWidth > rect.width) x = e.clientX - rect.left - tip.offsetWidth - pad;
      if (y + tip.offsetHeight > rect.height) y = e.clientY - rect.top - tip.offsetHeight - pad;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    });

    dom.svg.addEventListener('mouseleave', function () { tip.hidden = true; });
  }

  function init() {
    dom.stage = document.getElementById('stage');
    dom.canvas = document.getElementById('canvas');
    dom.svg = PlantaRender.render(dom.canvas, data);
    // tooltip de hover removido a pedido — só a planta.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
