/* =============================================================================
 * render.js — Desenha a planta baixa em SVG a partir de PlantaDados
 * -----------------------------------------------------------------------------
 * Transforma os dados (em metros) em elementos SVG. Não cuida de interações.
 * Escala: 1 metro = SCALE unidades de viewBox; o SVG é responsivo.
 * ===========================================================================*/

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var XHTML = 'http://www.w3.org/1999/xhtml';

  var SCALE = 26;   // unidades de viewBox por metro
  var PAD = 0.8;    // margem ao redor da planta, em metros

  function el(name, attrs) {
    var node = document.createElementNS(SVGNS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }
  function m(meters) { return meters * SCALE; }

  function bounds(rooms) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rooms.forEach(function (r) {
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function fmtArea(v) {
    if (typeof v !== 'number') return '';
    return v.toFixed(2).replace('.', ',') + ' m²';
  }

  /* --------------------------------------------------------------------------
   * Cotas gerais (largura e altura do prédio) nas bordas externas
   * ------------------------------------------------------------------------*/
  function buildDimensions(b, data) {
    var g = el('g', { 'class': 'dims' });
    var off = 1.1; // distância para fora do prédio (m)
    var fmt = function (v) { return v.toFixed(1).replace('.', ',') + ' m'; };

    // ----- cota superior (largura) -----
    var yT = m(b.minY - off);
    g.appendChild(el('line', { x1: m(b.minX), y1: yT, x2: m(b.maxX), y2: yT, 'class': 'dim-line' }));
    [b.minX, b.maxX].forEach(function (xx) {
      g.appendChild(el('line', { x1: m(xx), y1: yT - 7, x2: m(xx), y2: yT + 7, 'class': 'dim-tick' }));
    });
    var tT = el('text', { x: m((b.minX + b.maxX) / 2), y: yT - 8, 'class': 'dim-text' });
    tT.textContent = fmt(data.WIDTH || (b.maxX - b.minX));
    g.appendChild(tT);

    // ----- cota esquerda (altura) -----
    var xL = m(b.minX - off);
    g.appendChild(el('line', { x1: xL, y1: m(b.minY), x2: xL, y2: m(b.maxY), 'class': 'dim-line' }));
    [b.minY, b.maxY].forEach(function (yy) {
      g.appendChild(el('line', { x1: xL - 7, y1: m(yy), x2: xL + 7, y2: m(yy), 'class': 'dim-tick' }));
    });
    var tL = el('text', {
      x: xL - 8, y: m((b.minY + b.maxY) / 2), 'class': 'dim-text',
      transform: 'rotate(-90 ' + (xL - 8) + ' ' + m((b.minY + b.maxY) / 2) + ')'
    });
    tL.textContent = fmt(data.HEIGHT || (b.maxY - b.minY));
    g.appendChild(tL);

    return g;
  }

  /* --------------------------------------------------------------------------
   * Rótulo do ambiente (cartão: NOME / LEITOS / ÁREA)
   * ------------------------------------------------------------------------*/
  function buildLabel(room) {
    if (room.decorative) return null;

    var padPx = 4;
    var fo = el('foreignObject', {
      x: m(room.x) + padPx, y: m(room.y) + padPx,
      width: Math.max(0, m(room.w) - padPx * 2),
      height: Math.max(0, m(room.h) - padPx * 2),
      'class': 'room-label-fo'
    });

    // Rótulo vertical (girado) para ambientes estreitos e altos (ex.: antecâmara)
    if (room.vertical) {
      var cx = m(room.x) + m(room.w) / 2, cy = m(room.y) + m(room.h) / 2;
      var fw = Math.max(0, m(room.h) - padPx * 2), fh = Math.max(0, m(room.w) - padPx * 2);
      fo.setAttribute('width', fw);
      fo.setAttribute('height', fh);
      fo.setAttribute('x', cx - fw / 2);
      fo.setAttribute('y', cy - fh / 2);
      fo.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
    }

    var div = document.createElementNS(XHTML, 'div');
    div.setAttribute('class', 'room-label');
    if (room.w < 4.2 || room.h < 4.2) div.classList.add('room-label--mini');

    var chip = document.createElementNS(XHTML, 'div');
    chip.setAttribute('class', 'room-label__chip');

    var name = document.createElementNS(XHTML, 'div');
    name.setAttribute('class', 'room-label__name');
    name.textContent = room.short || room.name;
    chip.appendChild(name);

    if (room.beds) {
      var beds = document.createElementNS(XHTML, 'div');
      beds.setAttribute('class', 'room-label__beds');
      beds.textContent = room.beds;
      chip.appendChild(beds);
    }
    var areaTxt = room.areaLabel || fmtArea(room.area);
    if (areaTxt) {
      var area = document.createElementNS(XHTML, 'div');
      area.setAttribute('class', 'room-label__area');
      area.textContent = areaTxt;
      chip.appendChild(area);
    }

    div.appendChild(chip);
    fo.appendChild(div);
    return fo;
  }

  /* --------------------------------------------------------------------------
   * Um ambiente (retângulo + mobiliário + rótulo)
   * ------------------------------------------------------------------------*/
  function buildRoom(room, categories) {
    var cat = categories[room.category] || {};
    var g = el('g', {
      'class': 'room' + (room.decorative ? ' room--decorative' : ''),
      'data-id': room.id, 'data-category': room.category
    });

    // Ambientes "abertos" (postos de enfermagem): sem paredes, balcão na circulação
    var bgFill = (categories.circulacao && categories.circulacao.fill) || '#ece2cf';
    g.appendChild(el('rect', {
      x: m(room.x), y: m(room.y), width: m(room.w), height: m(room.h),
      'class': 'room__rect' + (room.decorative ? ' room__rect--bg' : ''),
      fill: room.open ? bgFill : (cat.fill || '#fff'),
      stroke: room.open ? 'none' : (cat.stroke || '#333')
    }));

    if (global.PlantaMobilia) {
      var furn = global.PlantaMobilia.build(room, SCALE);
      if (furn) g.appendChild(furn);
    }

    var label = buildLabel(room);
    if (label) g.appendChild(label);

    g.__room = room;
    return g;
  }

  /* --------------------------------------------------------------------------
   * Porta: máscara da parede + folha + arco de abertura
   *   d = { side:'top'|'bottom'|'left'|'right', at:0..1, w:metros }
   * ------------------------------------------------------------------------*/
  function buildDoor(room, d) {
    var g = el('g', { 'class': 'door' + (d.entrance ? ' door--entrance' : '') });
    var dw = d.w || 1.0;
    var t = 0.42;                 // espessura mascarada (m)
    var rx = room.x, ry = room.y, rw = room.w, rh = room.h;
    var inward = (d.swing === 'in');   // padrão: abre para FORA (circulação)

    function mask(mx, my, mw, mh) {
      g.appendChild(el('rect', { x: m(mx), y: m(my), width: m(mw), height: m(mh),
        fill: '#fdf8ef', stroke: 'none' }));
    }
    function leaf(x1, y1, x2, y2) {
      g.appendChild(el('line', { x1: m(x1), y1: m(y1), x2: m(x2), y2: m(y2), 'class': 'door-leaf' }));
    }
    function arc(x1, y1, x2, y2, r, sw) {
      g.appendChild(el('path', {
        d: 'M ' + m(x1) + ' ' + m(y1) + ' A ' + m(r) + ' ' + m(r) + ' 0 0 ' + sw + ' ' + m(x2) + ' ' + m(y2),
        'class': 'door-arc'
      }));
    }
    // varredura do arco (deduzida dos casos que funcionam abrindo p/ dentro)
    function sweepFor(side) {
      var s = (side === 'bottom' || side === 'left') ? 1 : 0;
      return inward ? s : (1 - s);
    }

    if (d.side === 'bottom' || d.side === 'top') {
      var wallY = d.side === 'bottom' ? ry + rh : ry;
      var cx = rx + (d.at != null ? d.at : 0.5) * rw;
      mask(cx - dw / 2, wallY - t / 2, dw, t);
      var outY = d.side === 'bottom' ? 1 : -1;     // p/ fora do ambiente
      var dirY = inward ? -outY : outY;
      var sw = sweepFor(d.side);
      if (d.double) {
        var hf = dw / 2;
        leaf(cx - dw / 2, wallY, cx - dw / 2, wallY + dirY * hf);
        arc(cx - dw / 2, wallY + dirY * hf, cx, wallY, hf, sw);
        leaf(cx + dw / 2, wallY, cx + dw / 2, wallY + dirY * hf);
        arc(cx + dw / 2, wallY + dirY * hf, cx, wallY, hf, 1 - sw);
      } else {
        leaf(cx - dw / 2, wallY, cx - dw / 2, wallY + dirY * dw);
        arc(cx - dw / 2, wallY + dirY * dw, cx + dw / 2, wallY, dw, sw);
      }
      if (d.entrance) {
        var et = el('text', { x: m(cx), y: m(wallY) + (d.side === 'bottom' ? 30 : -22), 'class': 'entrance-label' });
        et.textContent = 'ENTRADA';
        g.appendChild(et);
      }
    } else {
      var wallX = d.side === 'right' ? rx + rw : rx;
      var cy = ry + (d.at != null ? d.at : 0.5) * rh;
      mask(wallX - t / 2, cy - dw / 2, t, dw);
      var outX = d.side === 'right' ? 1 : -1;
      var dirX = inward ? -outX : outX;
      var sw2 = sweepFor(d.side);
      leaf(wallX, cy - dw / 2, wallX + dirX * dw, cy - dw / 2);
      arc(wallX + dirX * dw, cy - dw / 2, wallX, cy + dw / 2, dw, sw2);
    }
    return g;
  }

  /* --------------------------------------------------------------------------
   * Render principal
   * ------------------------------------------------------------------------*/
  function render(container, data) {
    var rooms = data.ROOMS;
    var categories = data.CATEGORIES;
    var b = bounds(rooms);

    var vbW = m(b.maxX - b.minX) + m(PAD) * 2;
    var vbH = m(b.maxY - b.minY) + m(PAD) * 2;

    var svg = el('svg', {
      'class': 'planta',
      viewBox: [m(b.minX) - m(PAD), m(b.minY) - m(PAD), vbW, vbH].join(' '),
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'Planta baixa do setor de enfermaria pediátrica'
    });

    // Ambientes: decorativos (circulação de fundo) primeiro
    var roomsLayer = el('g', { id: 'rooms-layer' });
    rooms.slice().sort(function (a, c) {
      return (a.decorative === c.decorative) ? 0 : (a.decorative ? -1 : 1);
    }).forEach(function (room) {
      roomsLayer.appendChild(buildRoom(room, categories));
    });
    svg.appendChild(roomsLayer);

    // Contorno externo grosso do prédio (por cima das paredes internas)
    svg.appendChild(el('rect', {
      x: m(b.minX), y: m(b.minY),
      width: m(b.maxX - b.minX), height: m(b.maxY - b.minY),
      'class': 'building-outline'
    }));

    // Portas (máscara + arco), por cima das paredes
    var doorLayer = el('g', { id: 'doors-layer' });
    rooms.forEach(function (room) {
      if (room.doors) room.doors.forEach(function (d) { doorLayer.appendChild(buildDoor(room, d)); });
    });
    svg.appendChild(doorLayer);

    container.innerHTML = '';
    container.appendChild(svg);
    return svg;
  }

  global.PlantaRender = { render: render, SCALE: SCALE };

})(window);
