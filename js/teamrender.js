/* =============================================================================
 * teamrender.js — monta o slide "Equipe" (chips por turno/função) e os slides
 * de "Escala" (tabela mensal Diurno / Noturno) a partir de window.TeamData.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var DATA = global.TeamData || { MONTH: '', DAYS: [], TEAM: [] };
  var DAYS = DATA.DAYS, TEAM = DATA.TEAM;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fAbbr(f) {
    if (/Coordenadora/.test(f)) return 'Enf. Coordenadora';
    if (/Rotineiro/.test(f)) return 'Enf. Rotineiro';
    if (/Plantonista/.test(f)) return 'Enf. Plantonista';
    return 'Téc. Enfermagem';
  }
  function horAbbr(h) { return h.replace(/h às /, '–').replace(/h$/, ''); }  // 07h às 16h -> 07–16

  /* ------------------------------ Equipe -------------------------------- */
  function renderRoster(c) {
    if (!c) return; c.innerHTML = '';
    [['Diurno', '☀'], ['Noturno', '☾']].forEach(function (tn) {
      var grp = TEAM.filter(function (p) { return p.turno === tn[0]; });
      var sec = el('div', 'team-turno');
      sec.appendChild(el('div', 'team-turno__h', tn[1] + ' Plantão ' + tn[0] + ' <span>(' + grp.length + ')</span>'));
      [['enf', 'Enfermeiros'], ['tec', 'Técnicos de Enfermagem']].forEach(function (ct) {
        var ppl = grp.filter(function (p) { return p.cat === ct[0]; });
        sec.appendChild(el('div', 'team-cat team-cat--' + ct[0], ct[1] + ' · ' + ppl.length));
        var list = el('div', 'team-list');
        ppl.forEach(function (p) { list.appendChild(el('span', 'team-chip team-chip--' + ct[0], p.nome)); });
        sec.appendChild(list);
      });
      c.appendChild(sec);
    });
  }

  /* ------------------------------ Escala -------------------------------- */
  function renderEscala(c, turno) {
    if (!c) return; c.innerHTML = '';
    var ppl = TEAM.filter(function (p) { return p.turno === turno; });
    var table = el('table', 'grid');

    var thead = el('thead'), hr = el('tr');
    hr.appendChild(el('th', 'gx gx--name', 'Colaborador'));
    hr.appendChild(el('th', 'gx gx--func', 'Função'));
    hr.appendChild(el('th', 'gx gx--hor', 'Horário'));
    DAYS.forEach(function (d) {
      hr.appendChild(el('th', 'gd' + (d.we ? ' gd--we' : ''), '<small>' + d.wd.charAt(0) + '</small>' + d.n));
    });
    thead.appendChild(hr); table.appendChild(thead);

    var tb = el('tbody');
    ppl.forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(el('td', 'gn gn--' + p.cat, p.nome));
      tr.appendChild(el('td', 'gf', fAbbr(p.funcao)));
      tr.appendChild(el('td', 'gh', horAbbr(p.horario)));
      p.escala.forEach(function (s, i) {
        tr.appendChild(el('td', 'gc gc--' + s.toLowerCase() + (DAYS[i].we ? ' gc--we' : ''), s));
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    c.appendChild(table);
  }

  function init() {
    renderRoster(document.getElementById('equipe-content'));
    renderEscala(document.getElementById('escala-diurno'), 'Diurno');
    renderEscala(document.getElementById('escala-noturno'), 'Noturno');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.TeamRender = { renderRoster: renderRoster, renderEscala: renderEscala };
})(window);
