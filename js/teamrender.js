/* =============================================================================
 * teamrender.js — tabelas de escala (Enfermagem Diurno/Noturno e Limpeza)
 * a partir de window.TeamData.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var DATA = global.TeamData || { MONTH: '', DAYS: [], TEAM: [], CLEAN: [] };
  var DAYS = DATA.DAYS, TEAM = DATA.TEAM, CLEAN = DATA.CLEAN || [];

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
    if (/Técnico/.test(f)) return 'Téc. Enfermagem';
    if (/Serviços Gerais/.test(f)) return 'Aux. Serv. Gerais';
    return f;
  }
  function horAbbr(h) { return h.replace(/h/g, '').replace(/\s*às\s*|\s*-\s*/, '–'); }

  // monta a tabela de escala; opts.groupByTurno insere linhas-cabeçalho por turno
  function buildTable(c, people, opts) {
    if (!c) return; c.innerHTML = '';
    opts = opts || {};
    var nCols = 3 + DAYS.length;
    var table = el('table', 'grid');
    var thead = el('thead'), hr = el('tr');
    hr.appendChild(el('th', 'gx gx--name', 'Colaborador'));
    hr.appendChild(el('th', 'gx gx--func', 'Função'));
    hr.appendChild(el('th', 'gx gx--hor', 'Horário'));
    DAYS.forEach(function (d) {
      hr.appendChild(el('th', 'gd' + (d.we ? ' gd--we' : ''), '<small>' + d.wd.charAt(0) + '</small>' + d.n));
    });
    thead.appendChild(hr); table.appendChild(thead);

    var tb = el('tbody'), lastTurno = null;
    people.forEach(function (p) {
      if (opts.groupByTurno && p.turno !== lastTurno) {
        lastTurno = p.turno;
        var gr = el('tr', 'grid__turno');
        var gtd = el('td', null, (p.turno === 'Diurno' ? '☀ ' : '☾ ') + 'Plantão ' + p.turno);
        gtd.colSpan = nCols;
        gr.appendChild(gtd); tb.appendChild(gr);
      }
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
    buildTable(document.getElementById('escala-diurno'),
      TEAM.filter(function (p) { return p.turno === 'Diurno'; }));
    buildTable(document.getElementById('escala-noturno'),
      TEAM.filter(function (p) { return p.turno === 'Noturno'; }));
    buildTable(document.getElementById('escala-limpeza'), CLEAN, { groupByTurno: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.TeamRender = { buildTable: buildTable };
})(window);
