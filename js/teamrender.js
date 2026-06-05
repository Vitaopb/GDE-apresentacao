/* =============================================================================
 * teamrender.js — monta o slide "Nossa Equipe" (roster) e o slide
 * "Escala Semanal" (quadro/tabela) a partir de window.TeamData.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var DATA = global.TeamData || { DAYS: [], TEAM: [] };
  var DAYS = DATA.DAYS, TEAM = DATA.TEAM;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function initials(nome) {
    var p = nome.trim().split(/\s+/);
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function funcaoCurta(f) {
    if (/Coordenador/.test(f)) return 'Enf. Coordenador';
    if (/Enfermeiro Rotineiro/.test(f)) return 'Enf. Rotineiro';
    if (/Enfermeiro Plantonista/.test(f)) return 'Enf. Plantonista';
    if (/Técnico/.test(f)) return 'Téc. Enfermagem';
    return f;
  }
  function turnoTag(t) { return t === 'Diurno' ? 'Diurno' : t === 'Noturno' ? 'Noturno' : t; }

  /* ----------------------------- Roster (Equipe) ------------------------- */
  function renderRoster(container) {
    if (!container) return;
    container.innerHTML = '';
    var enf = TEAM.filter(function (p) { return p.cat === 'enf'; });
    var tec = TEAM.filter(function (p) { return p.cat === 'tec'; });

    // cabeçalho com estatísticas
    var stats = el('div', 'roster__stats');
    [['68', 'profissionais', 'all'], [String(enf.length), 'Enfermeiros', 'enf'],
     [String(tec.length), 'Técnicos de Enfermagem', 'tec']].forEach(function (s) {
      var c = el('div', 'stat stat--' + s[2]);
      c.appendChild(el('div', 'stat__num', s[0]));
      c.appendChild(el('div', 'stat__lbl', s[1]));
      stats.appendChild(c);
    });
    container.appendChild(stats);

    var scroll = el('div', 'roster__scroll');
    [['Enfermeiros', enf, 'enf'], ['Técnicos de Enfermagem', tec, 'tec']].forEach(function (sec) {
      var head = el('div', 'roster__sec roster__sec--' + sec[2]);
      head.appendChild(el('span', 'roster__dot', ''));
      head.appendChild(el('span', null, sec[0] + ' <b>(' + sec[1].length + ')</b>'));
      scroll.appendChild(head);
      var grid = el('div', 'roster__grid');
      sec[1].forEach(function (p) {
        var card = el('div', 'pcard');
        var av = el('div', 'pcard__av pcard__av--' + p.cat, initials(p.nome));
        var tdot = el('span', 'pcard__turno pcard__turno--' + (p.turno === 'Diurno' ? 'd' : p.turno === 'Noturno' ? 'n' : 'm'), '');
        av.appendChild(tdot);
        card.appendChild(av);
        var info = el('div', 'pcard__info');
        info.appendChild(el('div', 'pcard__name', p.nome));
        var sub = funcaoCurta(p.funcao) + ' · ' + turnoTag(p.turno) +
                  (p.equipe && p.equipe !== 'Diarista' ? ' · Eq. ' + p.equipe : '');
        info.appendChild(el('div', 'pcard__sub', sub));
        card.appendChild(info);
        grid.appendChild(card);
      });
      scroll.appendChild(grid);
    });
    container.appendChild(scroll);
  }

  /* ----------------------------- Escala (tabela) ------------------------- */
  function renderEscala(container) {
    if (!container) return;
    container.innerHTML = '';

    // legenda
    var leg = el('div', 'escala__legend');
    [['d', 'D — Diurno (07–19h)'], ['n', 'N — Noturno (19–07h)'],
     ['m', 'M — Diarista'], ['f', 'F — Folga']].forEach(function (l) {
      var i = el('span', 'leg');
      i.appendChild(el('span', 'leg__chip cell cell--' + l[0], l[0].toUpperCase()));
      i.appendChild(el('span', 'leg__txt', l[1]));
      leg.appendChild(i);
    });
    container.appendChild(leg);

    var scroll = el('div', 'escala__scroll');
    var table = el('table', 'escala');
    var thead = el('thead');
    var hr = el('tr');
    ['#', 'Nome', 'Função', 'Turno', 'Eq.'].forEach(function (h) { hr.appendChild(el('th', 'th--l', h)); });
    DAYS.forEach(function (d) { hr.appendChild(el('th', null, d)); });
    hr.appendChild(el('th', null, 'h/sem'));
    thead.appendChild(hr);
    table.appendChild(thead);

    var tb = el('tbody');
    var lastGroup = null;
    TEAM.forEach(function (p) {
      if (p.group !== lastGroup) {
        lastGroup = p.group;
        var gr = el('tr', 'escala__group');
        gr.appendChild(el('td', null, p.group)).colSpan = 5 + DAYS.length + 1;
        tb.appendChild(gr);
      }
      var tr = el('tr');
      tr.appendChild(el('td', 'td--c', String(p.n)));
      tr.appendChild(el('td', 'td--name', p.nome));
      tr.appendChild(el('td', null, funcaoCurta(p.funcao)));
      tr.appendChild(el('td', 'td--c', turnoTag(p.turno)));
      tr.appendChild(el('td', 'td--c', p.equipe === 'Diarista' ? '—' : p.equipe));
      p.dias.forEach(function (d) {
        var cls = 'cell cell--' + (d ? d.toLowerCase() : 'f');
        tr.appendChild(el('td', cls, d || ''));
      });
      tr.appendChild(el('td', 'td--c td--h', p.carga));
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    scroll.appendChild(table);
    container.appendChild(scroll);
  }

  function init() {
    renderRoster(document.getElementById('equipe-content'));
    renderEscala(document.getElementById('escala-content'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.TeamRender = { renderRoster: renderRoster, renderEscala: renderEscala };
})(window);
