/* =============================================================================
 * rooms.js — Fonte única de dados do setor de enfermaria pediátrica
 * -----------------------------------------------------------------------------
 * Layout reproduzindo a planta de referência (retângulo 42 m × 28 m).
 *
 * Sistema de coordenadas: METROS. Origem (0,0) no canto superior-esquerdo.
 *
 * Disposição geral:
 *   - Coluna esquerda: Enfermaria Lactente, Cuidados/Higienização, Recreação.
 *   - Topo (alas): Quarto/Enf. de Criança (camas azuis), Quarto/Enf. de
 *     Adolescentes (camas verdes).
 *   - Coluna direita: Isolamento 1 e 2, Banheiro Masc., Banheiro Fem.
 *   - Centro: postos, salas de serviços/curativos, prescrição, banheiro func.
 *   - Inferior: Sala de Aula e Brinquedoteca.
 *   - O restante é a circulação (área aberta) — desenhada como fundo.
 *
 * `area`      = área OFICIAL do trabalho (m²).
 * `areaLabel` = (opcional) texto da área quando difere da formatação padrão.
 * `furnish`   = mobiliário desenhado (ver js/furniture.js); `color` define a
 *               cor das camas (blue/green).
 * ===========================================================================*/

(function (global) {
  'use strict';

  var CONFIG = { alunosSalaDeAula: 12, metrosPorAluno: 0.8 };

  /* Cores no estilo da planta de referência: ambientes em creme com paredes
   * escuras; sanitários em lilás; área de cuidados em rosa. */
  var CATEGORIES = {
    internacao: { label: 'Internação',         fill: '#fdf8ef', stroke: '#5f5446' },
    enfermagem: { label: 'Posto de Enfermagem', fill: '#fdf8ef', stroke: '#5f5446' },
    apoio:      { label: 'Apoio assistencial',  fill: '#fdf8ef', stroke: '#5f5446' },
    isolamento: { label: 'Isolamento',          fill: '#fdf8ef', stroke: '#5f5446' },
    lazer:      { label: 'Lazer / Ensino',      fill: '#fdf8ef', stroke: '#5f5446' },
    sanitario:  { label: 'Sanitários',          fill: '#e9e1f4', stroke: '#7a6e97' },
    cuidados:   { label: 'Cuidados / Higienização', fill: '#f1dcea', stroke: '#9d6f93' },
    recepcao:   { label: 'Recepção / Espera',    fill: '#ece2cf', stroke: 'transparent' },
    circulacao: { label: 'Circulação',          fill: '#ece2cf', stroke: '#5f5446' }
  };

  var ROOMS = [
    /* ===== Fundo: circulação (cobre todo o prédio, desenhada por baixo) === */
    { id: 'circulacao', name: 'Circulação', category: 'circulacao',
      x: 0, y: 0, w: 42, h: 28, area: null, decorative: true },

    /* ===== Coluna esquerda =============================================== */
    { id: 'enf-lactente', name: 'Enfermaria Lactente', category: 'internacao',
      x: 0, y: 0, w: 9, h: 9, area: 54, beds: '12 berços',
      furnish: { type: 'cribs', count: 12 } },
    { id: 'higienizacao', name: 'Área de Cuidados e Higienização dos Lactentes',
      short: 'Cuidados / Higien.', category: 'cuidados',
      x: 0, y: 9, w: 3, h: 3, area: 4.0,
      furnish: { type: 'changing' } },
    { id: 'recreacao', name: 'Área de Recreação / Refeitório', category: 'lazer',
      x: 0, y: 22.5, w: 9, h: 5.5, area: 10,
      furnish: { type: 'dining' } },

    /* ===== Topo: alas de internação (mais altas, com baias) ============== */
    { id: 'quarto-crianca', name: 'Quarto de Criança', category: 'internacao',
      x: 9, y: 0, w: 7.5, h: 12, area: 72, beds: '8 leitos',
      furnish: { type: 'beds', count: 8, color: 'blue', chairs: true } },
    { id: 'enf-crianca', name: 'Enfermaria de Criança', category: 'internacao',
      x: 16.5, y: 0, w: 8, h: 12, area: 60, beds: '12 leitos',
      furnish: { type: 'beds', count: 12, color: 'blue' } },
    { id: 'quarto-adolescente', name: 'Quarto de Adolescente', category: 'internacao',
      x: 24.5, y: 0, w: 5, h: 12, area: 60, beds: '6 leitos',
      furnish: { type: 'beds', count: 6, color: 'green', chairs: true } },
    { id: 'enf-adolescente', name: 'Enfermaria de Adolescentes', category: 'internacao',
      x: 29.5, y: 0, w: 5.5, h: 12, area: 60, beds: '10 leitos',
      furnish: { type: 'beds', count: 10, color: 'green' } },

    /* ===== Coluna direita: isolamentos com antecâmara de acesso (1,8 m) === */
    { id: 'antecamara-1', name: 'Antecâmara', short: 'Antecâmara', vertical: true, noCount: true,
      category: 'isolamento',
      x: 37, y: 0, w: 1.5, h: 7, area: null, areaLabel: '1,8 m',
      furnish: { type: 'anteroom' } },
    { id: 'isolamento-1', name: 'Quarto de Isolamento 1', short: 'Isolamento 1',
      category: 'isolamento',
      x: 38.5, y: 0, w: 3.5, h: 7, area: 18, beds: '1 leito',
      furnish: { type: 'beds', count: 1, iso: true, color: 'blue' } },
    { id: 'antecamara-2', name: 'Antecâmara', short: 'Antecâmara', vertical: true, noCount: true,
      category: 'isolamento',
      x: 37, y: 7, w: 1.5, h: 7, area: null, areaLabel: '1,8 m',
      furnish: { type: 'anteroom' } },
    { id: 'isolamento-2', name: 'Quarto de Isolamento 2', short: 'Isolamento 2',
      category: 'isolamento',
      x: 38.5, y: 7, w: 3.5, h: 7, area: 18, beds: '1 leito',
      furnish: { type: 'beds', count: 1, iso: true, color: 'blue' } },
    { id: 'ban-masculino', name: 'Banheiro Acompanhante Masculino',
      short: 'Banheiro Acompanhante Masculino', category: 'sanitario',
      x: 37, y: 14, w: 5, h: 5, area: 5.76,
      furnish: { type: 'bathroom', wc: 2, sink: 2, shower: 1 } },
    { id: 'ban-feminino', name: 'Banheiro Acompanhante Feminino',
      short: 'Banheiro Acompanhante Feminino', category: 'sanitario',
      x: 37, y: 19, w: 5, h: 9, area: 17.28,
      furnish: { type: 'bathroom', wc: 3, sink: 3, shower: 1 } },

    /* ===== Centro — fileira única de apoio ===============================
       Serviços 1/Curativos 1 à esquerda (preenchendo o vazio), Posto 2 ao
       centro entre o Banheiro e a Prescrição, Serviços 2/Curativos 2 à dir. */
    { id: 'servicos-1', name: 'Sala de Serviços 1', category: 'apoio',
      x: 1.5, y: 15.5, w: 3.5, h: 3.5, area: 5.7, furnish: { type: 'utility' } },
    { id: 'curativos-1', name: 'Sala de Exames / Curativos 1', short: 'Exames / Curativos 1',
      category: 'apoio',
      x: 5, y: 15.5, w: 4.5, h: 3.5, area: 7.5, furnish: { type: 'care' } },
    { id: 'ban-funcionarios', name: 'Banheiro dos Funcionários',
      short: 'Banheiro dos Funcionários', category: 'sanitario',
      x: 9.5, y: 15.5, w: 2.5, h: 3.5, area: 2.88,
      furnish: { type: 'bathroom', wc: 1, sink: 1, shower: 0 } },
    { id: 'posto-2', name: 'Posto de Enfermagem 2', category: 'enfermagem', open: true,
      x: 13.5, y: 15.5, w: 5, h: 3.5, area: 6, furnish: { type: 'station' } },
    { id: 'prescricao', name: 'Área para Prescrição Médica', short: 'Prescrição Médica',
      category: 'apoio',
      x: 20, y: 15.5, w: 2.5, h: 3.5, area: 2.0, furnish: { type: 'desk' } },
    { id: 'servicos-2', name: 'Sala de Serviços 2', category: 'apoio',
      x: 22.5, y: 15.5, w: 3.5, h: 3.5, area: 5.7, furnish: { type: 'utility' } },
    { id: 'curativos-2', name: 'Sala de Exames / Curativos 2', short: 'Exames / Curativos 2',
      category: 'apoio',
      x: 26, y: 15.5, w: 4.5, h: 3.5, area: 7.5, furnish: { type: 'care' } },

    /* ===== Hall de entrada (aberto) com o Posto de Enfermagem 1 ========== */
    { id: 'posto-1', name: 'Posto de Enfermagem 1', category: 'enfermagem', open: true,
      x: 30.5, y: 22, w: 4.5, h: 3.5, area: 6, furnish: { type: 'station', face: 'south' } },
    /* área aberta (só segura a porta de entrada) — sem rótulo nem mobiliário */
    { id: 'recepcao', name: 'Hall', category: 'recepcao', noCount: true, decorative: true,
      x: 30.5, y: 13.5, w: 4.5, h: 14.5, area: null },

    /* ===== Inferior: ensino e lazer ====================================== */
    { id: 'sala-aula', name: 'Sala de Aula', category: 'lazer', beds: '12 alunos',
      x: 9, y: 22.5, w: 9, h: 5.5, area: 10,
      furnish: { type: 'classroom', count: 12 } },
    { id: 'brinquedoteca', name: 'Brinquedoteca', category: 'lazer',
      x: 18, y: 22.5, w: 12, h: 5.5, area: 20.52, furnish: { type: 'playroom' } }
  ];

  /* Portas (voltadas para a circulação). side: parede; at: posição 0..1; w: m */
  var DOORS = {
    'enf-lactente':        [{ side: 'bottom', at: 0.72, w: 0.9 }],
    'higienizacao':        [{ side: 'right',  at: 0.5, w: 0.8 }],
    'recreacao':           [{ side: 'top',    at: 0.78, w: 0.9 }],
    'quarto-crianca':      [{ side: 'bottom', at: 0.5, w: 0.85 }],
    'enf-crianca':         [{ side: 'bottom', at: 0.5, w: 0.85 }],
    'quarto-adolescente':  [{ side: 'bottom', at: 0.5, w: 0.85 }],
    'enf-adolescente':     [{ side: 'bottom', at: 0.5, w: 0.85 }],
    'antecamara-1':        [{ side: 'left',   at: 0.5, w: 0.9 }],
    'antecamara-2':        [{ side: 'left',   at: 0.5, w: 0.9 }],
    'isolamento-1':        [{ side: 'left',   at: 0.5, w: 0.9 }],
    'isolamento-2':        [{ side: 'left',   at: 0.5, w: 0.9 }],
    'ban-masculino':       [{ side: 'left',   at: 0.5, w: 1.0 }],
    'ban-feminino':        [{ side: 'left',   at: 0.3, w: 1.0 }],
    'ban-funcionarios':    [{ side: 'bottom', at: 0.5, w: 0.7 }],
    'prescricao':          [{ side: 'bottom', at: 0.5, w: 0.7 }],
    'servicos-1':          [{ side: 'bottom', at: 0.5, w: 0.8 }],
    'curativos-1':         [{ side: 'bottom', at: 0.6, w: 0.8 }],
    'servicos-2':          [{ side: 'bottom', at: 0.5, w: 0.8 }],
    'curativos-2':         [{ side: 'bottom', at: 0.6, w: 0.8 }],
    'sala-aula':           [{ side: 'top',    at: 0.45, w: 0.75 }],
    'brinquedoteca':       [{ side: 'top',    at: 0.55, w: 0.75 }],
    /* entrada principal da planta (porta dupla na recepção) */
    'recepcao':            [{ side: 'bottom', at: 0.5, w: 2.4, double: true, entrance: true, swing: 'in' }]
  };
  ROOMS.forEach(function (r) { if (DOORS[r.id]) r.doors = DOORS[r.id]; });

  /* Proporção: estica na horizontal (mais largo) e comprime um pouco a altura,
   * passando de 42×28 (1,5:1) para 50×24 (~2,1:1) — fica claramente deitada.
   * Aplica um fator de escala a todos os ambientes (mantém o preenchimento). */
  var TARGET_W = 50, TARGET_H = 24;
  var SX = TARGET_W / 42, SY = TARGET_H / 28;
  ROOMS.forEach(function (r) { r.x *= SX; r.w *= SX; r.y *= SY; r.h *= SY; });

  function computeTotals(rooms) {
    var totalArea = 0, ambientes = 0, leitos = 0, bercos = 0;
    rooms.forEach(function (r) {
      if (r.decorative || r.noCount) return;
      ambientes++;
      if (typeof r.area === 'number') totalArea += r.area;
      if (r.beds) {
        var n = parseInt(r.beds, 10) || 0;
        if (/berç/i.test(r.beds)) bercos += n;
        else if (/leito/i.test(r.beds)) leitos += n;
      }
    });
    return { totalArea: Math.round(totalArea * 100) / 100, ambientes: ambientes,
             leitos: leitos, bercos: bercos };
  }

  global.PlantaDados = {
    CONFIG: CONFIG, CATEGORIES: CATEGORIES, ROOMS: ROOMS,
    totals: computeTotals(ROOMS),
    WIDTH: 50, HEIGHT: 24
  };

})(window);
