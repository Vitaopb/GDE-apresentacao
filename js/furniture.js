/* =============================================================================
 * furniture.js — Mobiliário/objetos de cada ambiente (vista de cima)
 * -----------------------------------------------------------------------------
 * Desenha camas, berços, vasos, pias, chuveiros, cadeiras, mesas, etc. dentro
 * de cada sala, conforme o campo `furnish` definido em js/rooms.js.
 * Tudo em METROS, convertido para unidades do SVG multiplicando por `s`.
 * API: PlantaMobilia.build(room, scale) -> <g> (ou null).
 * ===========================================================================*/

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* ---- primitivas (metros + escala s) ----------------------------------- */
  function R(g, s, x, y, w, h, cls, r) {
    g.appendChild(el('rect', { x: x * s, y: y * s, width: w * s, height: h * s,
      rx: (r || 0) * s, ry: (r || 0) * s, 'class': cls }));
  }
  function Circle(g, s, cx, cy, rad, cls) {
    g.appendChild(el('circle', { cx: cx * s, cy: cy * s, r: rad * s, 'class': cls }));
  }
  function Ellipse(g, s, cx, cy, rx, ry, cls) {
    g.appendChild(el('ellipse', { cx: cx * s, cy: cy * s, rx: rx * s, ry: ry * s, 'class': cls }));
  }
  function Line(g, s, x1, y1, x2, y2, cls) {
    g.appendChild(el('line', { x1: x1 * s, y1: y1 * s, x2: x2 * s, y2: y2 * s, 'class': cls }));
  }
  function Text(g, s, x, y, txt, cls) {
    var t = el('text', { x: x * s, y: y * s, 'class': cls });
    t.textContent = txt;
    g.appendChild(t);
  }

  /* ==========================================================================
   * Móveis
   * ========================================================================*/

  // Cama: cabeceira na parede externa (headTop=true -> topo). colorClass opcional.
  function bed(g, s, x, y, w, h, headTop, color) {
    var bedCls = 'furn-bed' + (color ? ' furn-bed--' + color : '');
    // cabeceira (madeira/painel)
    var hbH = 0.22;
    var hbY = headTop ? y : y + h - hbH;
    R(g, s, x - 0.04, hbY, w + 0.08, hbH, 'furn-headboard', 0.04);
    // colchão
    R(g, s, x, headTop ? y + hbH : y, w, h - hbH, bedCls, 0.12);
    // travesseiro
    var pw = w * 0.78, ph = Math.min(0.42, (h - hbH) * 0.28);
    var py = headTop ? y + hbH + 0.06 : y + h - hbH - ph - 0.06;
    R(g, s, x + (w - pw) / 2, py, pw, ph, 'furn-pillow', 0.06);
    // dobra do lençol
    var ly = headTop ? y + h * 0.62 : y + h * 0.38;
    Line(g, s, x + 0.05, ly, x + w - 0.05, ly, 'furn-soft-line');
  }

  function bedside(g, s, x, y) { R(g, s, x, y, 0.45, 0.45, 'furn-cabinet', 0.04); }

  function crib(g, s, x, y, w, h) {
    R(g, s, x, y, w, h, 'furn-crib', 0.08);
    R(g, s, x + 0.07, y + 0.07, w - 0.14, h - 0.14, 'furn-crib__inner', 0.05);
    var i, n = 3;
    for (i = 1; i <= n; i++) Line(g, s, x + (w * i) / (n + 1), y + 0.08, x + (w * i) / (n + 1), y + h - 0.08, 'furn-bar');
    Line(g, s, x + 0.08, y + h / 2, x + w - 0.08, y + h / 2, 'furn-bar');
  }

  function toilet(g, s, cx, cy, dir) {
    dir = dir || 1;
    R(g, s, cx - 0.22, cy - dir * 0.30 - 0.07, 0.44, 0.15, 'furn-wc__tank', 0.03);
    Ellipse(g, s, cx, cy + dir * 0.06, 0.18, 0.24, 'furn-wc');
  }
  function sink(g, s, cx, cy, dir) {
    dir = dir || 1;
    R(g, s, cx - 0.26, cy - 0.19, 0.52, 0.38, 'furn-sink', 0.07);
    Ellipse(g, s, cx, cy + dir * 0.02, 0.16, 0.12, 'furn-sink__bowl');
    Circle(g, s, cx, cy - dir * 0.15, 0.035, 'furn-fix-dot');
  }
  function shower(g, s, x, y, size) {
    R(g, s, x, y, size, size, 'furn-shower', 0.06);
    Circle(g, s, x + size - 0.22, y + 0.22, 0.12, 'furn-shower__head');
    Circle(g, s, x + size / 2, y + size / 2 + 0.1, 0.05, 'furn-fix-dot');
  }
  function chair(g, s, cx, cy, backSide, cls) {
    var sz = 0.42;
    R(g, s, cx - sz / 2, cy - sz / 2, sz, sz, cls || 'furn-chair', 0.07);
    var b = 0.1;
    if (backSide === 'top')         R(g, s, cx - sz / 2, cy - sz / 2 - b, sz, b, 'furn-chair__back', 0.03);
    else if (backSide === 'bottom') R(g, s, cx - sz / 2, cy + sz / 2, sz, b, 'furn-chair__back', 0.03);
    else if (backSide === 'left')   R(g, s, cx - sz / 2 - b, cy - sz / 2, b, sz, 'furn-chair__back', 0.03);
    else if (backSide === 'right')  R(g, s, cx + sz / 2, cy - sz / 2, b, sz, 'furn-chair__back', 0.03);
  }
  function table(g, s, x, y, w, h) { R(g, s, x, y, w, h, 'furn-table', 0.08); }
  function counter(g, s, x, y, w, h) { R(g, s, x, y, w, h, 'furn-counter', 0.06); }
  function cabinet(g, s, x, y, w, h) { R(g, s, x, y, w, h, 'furn-cabinet', 0.04); }
  function monitor(g, s, cx, cy) { R(g, s, cx - 0.28, cy - 0.1, 0.56, 0.2, 'furn-screen', 0.03); }
  function stretcher(g, s, cx, cy) {
    var w = 0.78, h = 1.95;
    R(g, s, cx - w / 2, cy - h / 2, w, h, 'furn-stretcher', 0.1);
    R(g, s, cx - w * 0.34, cy - h / 2 + 0.12, w * 0.68, 0.42, 'furn-pillow', 0.05);
  }
  function roundTable(g, s, cx, cy, r, chairCls) {
    chair(g, s, cx, cy - r - 0.32, 'top', chairCls);
    chair(g, s, cx, cy + r + 0.32, 'bottom', chairCls);
    chair(g, s, cx - r - 0.32, cy, 'left', chairCls);
    chair(g, s, cx + r + 0.32, cy, 'right', chairCls);
    Circle(g, s, cx, cy, r, 'furn-table furn-table--round');
  }
  function plant(g, s, cx, cy) {
    Circle(g, s, cx, cy, 0.3, 'furn-plant__leaf');
    Circle(g, s, cx, cy, 0.14, 'furn-plant__pot');
  }
  function sofa(g, s, x, y, w, h) {
    R(g, s, x, y, w, h, 'furn-sofa', 0.12);
    R(g, s, x, y, w, 0.2, 'furn-sofa__back', 0.08);
  }
  function toy(g, s, x, y, sz, idx) { R(g, s, x, y, sz, sz, 'furn-toy furn-toy--' + (idx % 4), 0.05); }

  // Tapete colorido (mosaico) da brinquedoteca
  function rainbowRug(g, s, x, y, w, h) {
    R(g, s, x, y, w, h, 'furn-rug', 0.12);
    var cols = 4, rows = 3, cw = w / cols, ch = h / rows, i, j, k = 0;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      R(g, s, x + i * cw + 0.06, y + j * ch + 0.06, cw - 0.12, ch - 0.12, 'furn-rug__tile furn-rug__tile--' + (k % 4), 0.04);
      k++;
    }
  }

  /* ==========================================================================
   * Layouts por tipo de ambiente
   * ========================================================================*/
  var LAYOUTS = {

    /* --- Leitos em 2 fileiras (cabeceiras nas paredes externas) ---------- */
    beds: function (g, s, room, f) {
      var n = f.count, color = f.color;
      if (n === 1) {
        var bw1 = Math.min(1.2, room.w * 0.4), bl1 = Math.min(2.2, room.h * 0.55);
        bed(g, s, room.x + room.w * 0.32 - bw1 / 2, room.y + 0.5, bw1, bl1, true, color);
        bedside(g, s, room.x + room.w * 0.32 + bw1 / 2 + 0.1, room.y + 0.55);
        if (f.iso) { // banheiro privativo no canto direito
          var bx = room.x + room.w - 1.7;
          Line(g, s, bx, room.y + 0.2, bx, room.y + room.h - 0.2, 'furn-box-wall');
          toilet(g, s, bx + 0.8, room.y + room.h - 0.6, -1);
          sink(g, s, bx + 0.8, room.y + 0.7, 1);
        }
        return;
      }
      var cols = Math.ceil(n / 2);
      var slot = room.w / cols;
      var bw = Math.min(1.15, slot * 0.62);
      var bl = Math.min(2.1, room.h * 0.32);
      var i, placed = 0;
      // fileira superior (cabeceira no topo)
      for (i = 0; i < cols && placed < n; i++, placed++) {
        var cx = room.x + i * slot + slot / 2;
        bed(g, s, cx - bw / 2, room.y + 0.45, bw, bl, true, color);
        bedside(g, s, cx + bw / 2 + 0.05, room.y + 0.5);
      }
      // fileira inferior (cabeceira embaixo)
      for (i = 0; i < cols && placed < n; i++, placed++) {
        var cx2 = room.x + i * slot + slot / 2;
        bed(g, s, cx2 - bw / 2, room.y + room.h - 0.45 - bl, bw, bl, false, color);
        bedside(g, s, cx2 + bw / 2 + 0.05, room.y + room.h - 0.5 - 0.45);
      }
      // divisórias entre os leitos (baias)
      for (i = 1; i < cols; i++) {
        Line(g, s, room.x + i * slot, room.y + 0.1, room.x + i * slot, room.y + room.h - 0.1, 'furn-divider');
      }
      // largura de cada leito, DENTRO da baia (parte de baixo do corredor da ala,
      // para não colidir com o nome da ala que fica no centro)
      var wlbl = (Math.round(slot * 10) / 10).toString().replace('.', ',') + ' m';
      for (i = 0; i < cols; i++) {
        Text(g, s, room.x + i * slot + slot / 2, room.y + room.h * 0.66, wlbl, 'furn-dim-text');
      }
    },

    /* --- Berços em grade ------------------------------------------------- */
    cribs: function (g, s, room, f) {
      var n = f.count, cols = (room.w >= room.h) ? 4 : 3, rows = Math.ceil(n / cols);
      var cw = room.w / cols, ch = (room.h * 0.6) / rows; // berços na parte superior
      var i, j, k = 0;
      var bw = Math.min(1.3, cw * 0.62), bl = Math.min(1.5, ch * 0.72);
      for (j = 0; j < rows; j++) for (i = 0; i < cols && k < n; i++, k++) {
        crib(g, s, room.x + i * cw + (cw - bw) / 2, room.y + 0.4 + j * ch + (ch - bl) / 2, bw, bl);
      }
      // divisórias entre as colunas de berços + largura por berço (por dentro)
      for (i = 1; i < cols; i++) {
        Line(g, s, room.x + i * cw, room.y + 0.1, room.x + i * cw, room.y + room.h * 0.66, 'furn-divider');
      }
      var wlbl = (Math.round(cw * 10) / 10).toString().replace('.', ',') + ' m';
      for (i = 0; i < cols; i++) {
        Text(g, s, room.x + i * cw + cw / 2, room.y + room.h * 0.74, wlbl, 'furn-dim-text');
      }
      // bancada de apoio na base
      counter(g, s, room.x + 0.5, room.y + room.h - 1.1, room.w - 1.0, 0.7);
    },

    /* --- Banheiros ------------------------------------------------------- */
    bathroom: function (g, s, room, f) {
      var i;
      if (f.shower) {
        var sh = Math.min(1.1, room.w * 0.42, room.h * 0.42);
        shower(g, s, room.x + 0.15, room.y + 0.15, sh);
      }
      var sx = room.x + (f.shower ? Math.min(1.1, room.w * 0.42) + 0.5 : 0.5), step = 0.8;
      for (i = 0; i < (f.sink || 0); i++) {
        if (sx + 0.3 > room.x + room.w - 0.2) break;
        sink(g, s, sx, room.y + 0.35, 1); sx += step;
      }
      var wx = room.x + 0.55, wstep = 0.95;
      for (i = 0; i < (f.wc || 0); i++) {
        if (wx + 0.25 > room.x + room.w - 0.2) break;
        toilet(g, s, wx, room.y + room.h - 0.45, -1); wx += wstep;
      }
    },

    /* --- Posto de enfermagem (balcão curvo + monitor + cadeiras) --------- */
    station: function (g, s, room) {
      counter(g, s, room.x + 0.3, room.y + 0.35, room.w - 0.6, 0.7);
      monitor(g, s, room.x + room.w / 2, room.y + 0.7);
      var n = Math.max(2, Math.floor((room.w - 0.6) / 1.0));
      for (var i = 0; i < n; i++) chair(g, s, room.x + 0.7 + i * 1.0, room.y + 1.7, 'top');
    },

    utility: function (g, s, room) {
      counter(g, s, room.x + 0.25, room.y + 0.3, room.w - 0.5, 0.6);
      sink(g, s, room.x + room.w - 0.55, room.y + 0.6, 1);
      cabinet(g, s, room.x + 0.3, room.y + room.h - 0.95, room.w - 0.6, 0.6);
    },

    care: function (g, s, room) {
      stretcher(g, s, room.x + room.w * 0.42, room.y + room.h / 2 + 0.1);
      counter(g, s, room.x + 0.25, room.y + 0.25, room.w - 0.5, 0.5);
      chair(g, s, room.x + room.w - 0.5, room.y + room.h - 0.5);
    },

    desk: function (g, s, room) {
      table(g, s, room.x + 0.35, room.y + 0.5, room.w - 0.7, 0.8);
      monitor(g, s, room.x + room.w / 2, room.y + 0.85);
      chair(g, s, room.x + room.w / 2, room.y + 1.7, 'bottom');
    },

    changing: function (g, s, room) {
      counter(g, s, room.x + 0.4, room.y + 0.4, room.w - 0.8, 1.0);
      R(g, s, room.x + 0.7, room.y + 0.6, room.w - 1.4, 0.6, 'furn-pillow', 0.06);
      sink(g, s, room.x + room.w - 0.7, room.y + room.h - 0.7, -1);
      R(g, s, room.x + 0.5, room.y + room.h - 1.2, 1.4, 0.8, 'furn-tub', 0.1); // banheira
    },

    classroom: function (g, s, room, f) {
      var max = (f && f.count) ? f.count : 999;
      table(g, s, room.x + room.w / 2 - 0.8, room.y + 0.5, 1.6, 0.7); // mesa professor
      chair(g, s, room.x + room.w / 2, room.y + 0.35, 'top');
      var startY = room.y + 1.9, gx = 1.3, gy = 1.4;
      var cols = Math.max(1, Math.floor((room.w - 0.8) / gx));
      var rows = Math.floor((room.y + room.h - 0.5 - startY) / gy);
      var placed = 0;
      for (var r = 0; r < rows && placed < max; r++) {
        for (var c = 0; c < cols && placed < max; c++) {
          var dx = room.x + 0.7 + c * gx, dy = startY + r * gy;
          table(g, s, dx, dy, 0.9, 0.55);
          chair(g, s, dx + 0.45, dy + 0.95, 'top');
          placed++;
        }
      }
    },

    dining: function (g, s, room) {
      // bancada/cozinha encostada na parede esquerda
      counter(g, s, room.x + 0.3, room.y + 0.4, 0.7, room.h - 1.2);
      sink(g, s, room.x + 0.65, room.y + 1.0, 1);
      var r = 0.62;
      var pos = [
        [room.x + room.w * 0.62, room.y + room.h * 0.32],
        [room.x + room.w * 0.58, room.y + room.h * 0.72]
      ];
      pos.forEach(function (p) { roundTable(g, s, p[0], p[1], r, 'furn-chair furn-chair--kid'); });
    },

    playroom: function (g, s, room) {
      rainbowRug(g, s, room.x + room.w * 0.3, room.y + room.h * 0.45, room.w * 0.42, room.h * 0.42);
      // estante de brinquedos
      cabinet(g, s, room.x + 0.4, room.y + 0.6, 0.7, room.h * 0.5);
      var i, ty = room.y + 0.8;
      for (i = 0; i < 3; i++) { toy(g, s, room.x + 0.5, ty, 0.45, i); ty += 0.6; }
      // mesinhas redondas com cadeirinhas
      roundTable(g, s, room.x + room.w * 0.78, room.y + room.h * 0.28, 0.55, 'furn-chair furn-chair--kid');
      roundTable(g, s, room.x + room.w * 0.82, room.y + room.h * 0.72, 0.55, 'furn-chair furn-chair--kid');
      plant(g, s, room.x + room.w - 0.6, room.y + 0.7);
      plant(g, s, room.x + room.w - 0.6, room.y + room.h - 0.7);
    },

    /* --- Antecâmara de isolamento (lavabo + bancada de paramentação) ----- */
    anteroom: function (g, s, room) {
      sink(g, s, room.x + room.w / 2, room.y + 0.7, 1);
      cabinet(g, s, room.x + 0.15, room.y + room.h - 1.0, room.w - 0.3, 0.6);
    },

    /* --- Sala de espera (cadeiras centralizadas, poucas) ----------------- */
    waiting: function (g, s, room) {
      var cols = 2, gx = 1.2, gy = 1.4;
      var rows = Math.min(5, Math.max(3, Math.floor((room.h - 1.6) / gy)));
      var x0 = room.x + room.w / 2 - ((cols - 1) * gx) / 2;  // bloco centralizado
      var y0 = room.y + (room.h - (rows - 1) * gy) / 2;       // centralizado vertical
      var r, c;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          chair(g, s, x0 + c * gx, y0 + r * gy, 'top');
        }
      }
      plant(g, s, room.x + 0.6, room.y + room.h - 0.6);
      plant(g, s, room.x + room.w - 0.6, room.y + room.h - 0.6);
    },

    /* --- Recepção / espera (balcão + sofás + plantas) -------------------- */
    reception: function (g, s, room) {
      counter(g, s, room.x + 0.6, room.y + 0.5, room.w - 1.2, 1.0);
      monitor(g, s, room.x + room.w / 2, room.y + 0.95);
      chair(g, s, room.x + room.w / 2, room.y + 1.8, 'top');
      sofa(g, s, room.x + 0.7, room.y + room.h * 0.42, room.w - 1.4, 0.85);
      sofa(g, s, room.x + 0.7, room.y + room.h * 0.6, room.w - 1.4, 0.85);
      plant(g, s, room.x + 0.75, room.y + room.h - 0.85);
      plant(g, s, room.x + room.w - 0.75, room.y + room.h - 0.85);
    }
  };

  /* ==========================================================================
   * API pública
   * ========================================================================*/
  function build(room, scale) {
    if (!room.furnish || !LAYOUTS[room.furnish.type]) return null;
    var g = el('g', { 'class': 'furniture', 'data-furn': room.furnish.type });
    LAYOUTS[room.furnish.type](g, scale, room, room.furnish);
    return g;
  }

  global.PlantaMobilia = { build: build };

})(window);
