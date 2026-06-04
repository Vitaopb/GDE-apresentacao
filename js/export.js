/* =============================================================================
 * export.js — Exporta a planta baixa (SVG) como imagem PNG
 * -----------------------------------------------------------------------------
 * Módulo independente (não altera a planta). Clona o SVG, converte os rótulos
 * (foreignObject HTML) em <text> SVG — pois foreignObject não rasteriza em
 * canvas — embute o CSS, rasteriza num canvas em alta resolução e baixa o PNG.
 * Use o botão "Salvar PNG" ou a tecla S.
 * ===========================================================================*/

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var SCALE = 2; // resolução do PNG (2x)

  function buildExportSVG(cb) {
    var src = document.querySelector('.planta');
    if (!src) return;
    var clone = src.cloneNode(true);
    var vb = src.getAttribute('viewBox').split(/\s+/).map(Number);
    clone.setAttribute('xmlns', SVGNS);

    // converte rótulos foreignObject -> <text> (lendo estilos do original)
    var srcFos = src.querySelectorAll('foreignObject.room-label-fo');
    var clFos = clone.querySelectorAll('foreignObject.room-label-fo');
    Array.prototype.forEach.call(clFos, function (fo, i) {
      var x = parseFloat(fo.getAttribute('x')), y = parseFloat(fo.getAttribute('y'));
      var w = parseFloat(fo.getAttribute('width')), h = parseFloat(fo.getAttribute('height'));
      var transform = fo.getAttribute('transform');

      var nodes = srcFos[i].querySelectorAll('.room-label__name, .room-label__beds, .room-label__area');
      var lines = [];
      Array.prototype.forEach.call(nodes, function (n) {
        var cs = getComputedStyle(n);
        lines.push({ t: n.textContent.trim(), size: parseFloat(cs.fontSize) || 10,
                     weight: cs.fontWeight || '700', color: cs.color || '#1e293b' });
      });
      if (!lines.length) { fo.parentNode.removeChild(fo); return; }

      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('text-anchor', 'middle');
      if (transform) t.setAttribute('transform', transform);

      var lh = lines.map(function (l) { return l.size * 1.2; });
      var total = lh.reduce(function (a, b) { return a + b; }, 0);
      var cy = (y + h / 2) - total / 2;
      var cxp = x + w / 2;
      lines.forEach(function (l, j) {
        cy += lh[j];
        var ts = document.createElementNS(SVGNS, 'tspan');
        ts.setAttribute('x', cxp);
        ts.setAttribute('y', cy - lh[j] * 0.28);
        ts.setAttribute('font-size', l.size);
        ts.setAttribute('font-weight', l.weight);
        ts.setAttribute('fill', l.color);
        ts.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
        ts.textContent = l.t;
        t.appendChild(ts);
      });
      fo.parentNode.replaceChild(t, fo);
    });

    // embute o CSS (para o mobiliário, cotas, etc.)
    fetch('css/styles.css').then(function (r) { return r.text(); }).then(function (css) {
      var style = document.createElementNS(SVGNS, 'style');
      style.textContent = css;
      clone.insertBefore(style, clone.firstChild);
      cb(clone, vb);
    }).catch(function () { cb(clone, vb); });
  }

  function download() {
    buildExportSVG(function (clone, vb) {
      var W = Math.round(vb[2] * SCALE), H = Math.round(vb[3] * SCALE);
      clone.setAttribute('width', W);
      clone.setAttribute('height', H);
      var xml = new XMLSerializer().serializeToString(clone);
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        c.toBlob(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'planta-baixa.png';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        }, 'image/png');
      };
      img.onerror = function () { alert('Não foi possível gerar o PNG.'); };
      img.src = url;
    });
  }

  function init() {
    var btn = document.getElementById('btn-save-png');
    if (btn) btn.addEventListener('click', download);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey) download();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.PlantaExport = { download: download };

})(window);
