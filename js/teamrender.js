/* =============================================================================
 * teamrender.js — quadros brancos (na maquete 3D) da Equipe e da Escala,
 * com efeito de escrita (os nomes vão "sendo escritos" um a um).
 * Conteúdo a partir de window.TeamData.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var DATA = global.TeamData || { DAYS: [], TEAM: [] };
  var TEAM = DATA.TEAM;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  // elemento "escrevível" (entra com animação de escrita)
  function write(tag, cls, text) { return el(tag, 'wb-write ' + (cls || ''), text); }

  /* --------------------------- conteúdo: EQUIPE -------------------------- */
  function buildTeam(body) {
    if (!body) return;
    body.innerHTML = '';
    var enf = TEAM.filter(function (p) { return p.cat === 'enf'; });
    var tec = TEAM.filter(function (p) { return p.cat === 'tec'; });
    [['Enfermeiros (' + enf.length + ')', enf, 'enf'],
     ['Técnicos de Enfermagem (' + tec.length + ')', tec, 'tec']].forEach(function (sec) {
      body.appendChild(write('div', 'wb-group wb-group--' + sec[2], sec[0]));
      var list = el('div', 'wb-list');
      sec[1].forEach(function (p) { list.appendChild(write('span', 'wb-name wb-' + sec[2], p.nome)); });
      body.appendChild(list);
    });
  }

  /* --------------------------- conteúdo: DIA ----------------------------- */
  function buildDay(body, d) {
    if (!body) return;
    body.innerHTML = '';
    var work = TEAM.filter(function (p) { return p.dias[d] && p.dias[d] !== 'F'; });
    var folga = TEAM.filter(function (p) { return p.dias[d] === 'F'; });
    var groups = [
      ['Diurno — plantão', work.filter(function (p) { return p.dias[d] === 'D'; })],
      ['Noturno — plantão', work.filter(function (p) { return p.dias[d] === 'N'; })],
      ['Diaristas', work.filter(function (p) { return p.dias[d] === 'M'; })]
    ];
    body.appendChild(write('div', 'wb-count', work.length + ' de plantão · ' + folga.length + ' de folga'));
    groups.forEach(function (g) {
      if (!g[1].length) return;
      body.appendChild(write('div', 'wb-group', '✔ ' + g[0] + ' (' + g[1].length + ')'));
      var list = el('div', 'wb-list');
      g[1].forEach(function (p) {
        list.appendChild(write('span', 'wb-name wb-' + p.cat,
          p.nome + ' · ' + (p.cat === 'enf' ? 'Enf.' : 'Téc.')));
      });
      body.appendChild(list);
    });
    if (folga.length) {
      body.appendChild(write('div', 'wb-group wb-group--folga', '✦ De folga (' + folga.length + ')'));
      var fl = el('div', 'wb-list wb-list--folga');
      folga.forEach(function (p) { fl.appendChild(write('span', 'wb-name wb-folga', p.nome)); });
      body.appendChild(fl);
    }
  }

  /* --------------------------- efeito de escrita ------------------------- */
  function play(slide) {
    var board = slide && slide.querySelector('.whiteboard');
    if (!board) return;
    var items = [].slice.call(board.querySelectorAll('.wb-write'));
    if (board._timers) board._timers.forEach(clearTimeout);
    board._timers = [];
    items.forEach(function (it) { it.classList.remove('wb-in'); });
    var t = 320;  // pequena espera após a transição do slide
    items.forEach(function (it) {
      var isHead = it.classList.contains('wb-group') || it.classList.contains('wb-title') || it.classList.contains('wb-count');
      board._timers.push(setTimeout(function () { it.classList.add('wb-in'); }, t));
      t += isHead ? 230 : 75;
    });
  }
  // limpa (esconde) os nomes ao sair do slide, p/ reanimar ao voltar
  function reset(slide) {
    var board = slide && slide.querySelector('.whiteboard');
    if (!board) return;
    if (board._timers) board._timers.forEach(clearTimeout);
    [].slice.call(board.querySelectorAll('.wb-write')).forEach(function (it) { it.classList.remove('wb-in'); });
  }

  function init() {
    buildTeam(document.getElementById('wb-team'));
    for (var d = 0; d < 7; d++) buildDay(document.getElementById('wb-day' + d), d);
    // marca os títulos como escrevíveis também
    [].slice.call(document.querySelectorAll('.whiteboard .wb-title')).forEach(function (t) {
      t.classList.add('wb-write');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.TeamRender = { play: play, reset: reset };
})(window);
