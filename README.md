# Setor de Enfermaria Pediátrica — Apresentação

Trabalho de **Gerenciamento de Enfermagem** (Faculdade Pernambucana de Saúde):
apresentação interativa do setor de enfermaria pediátrica com **planta baixa 2D**,
**maquete 3D navegável** e **escalas de serviço**, feita com HTML, CSS e
JavaScript puro (sem frameworks, sem build).

Equipe: Ana Franciny · Beatriz Cruz · Livia Gabrielly · Maria Eduarda · Vanessa Souza
(7º período de Enfermagem).

## Como abrir

Opção 1 — abrir direto: dê duplo clique em `index.html`
(o 3D precisa de internet — Three.js vem por CDN).

Opção 2 — servidor local (recomendado):

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## Navegação

- **← → / espaço** — avança e volta os slides.
- **No 3D**: arraste para girar, role para aproximar.
- **Clique em um ambiente** (em qualquer vista 3D) para a câmera voar até ele —
  um chip mostra nome, leitos e área, com botão **← Visão geral** (ou tecla ESC).
- **S** (no slide da planta) — baixa a planta baixa em PNG.

## Roteiro dos slides

1. **Capa** — gradiente animado com a logo da FPS.
2. **Planta baixa 2D** — setor completo em escala (50 × 24 m), com mobiliário,
   portas, áreas e leitos (exportável em PNG).
3. **Maquete 3D — visão geral** — estilo maquete de arquitetura: paredes brancas
   com tampa de corte, pisos coloridos por categoria, mobiliário com cantos
   arredondados, iluminação ACES e personagens (equipe, pacientes, bebês,
   acompanhantes e auxiliar de limpeza).
4. **17 visões internas**, uma por ambiente: Posto de Enfermagem, Sala de Aula,
   Banheiros de Acompanhante, Brinquedoteca, Recreação/Refeitório, Sala de
   Serviços, Exames/Curativos, Prescrição Médica, Banheiro dos Funcionários,
   Higienização dos Lactentes, Antecâmara, Quarto de Isolamento e — por último —
   as enfermarias: Lactente, Quarto de Criança, Enfermaria de Criança, Quarto de
   Adolescente e Enfermaria de Adolescentes.
5. **Escalas de Julho/2026** (dados reais dos PDFs): Enfermagem Diurno (38),
   Enfermagem Noturno (36) e Limpeza/Serviços Gerais (10) — tabelas mensais com
   T/Trabalha e F/Folga, fins de semana destacados.
6. **Encerramento** — fotos da equipe em círculos com entrada animada e chuva de
   confetes. 🎉

## Estrutura

```
GDE-Apresentacao/
├── index.html          # deck de slides (capa, planta, 3D, escalas, final)
├── css/
│   └── styles.css      # estilos da planta, dos slides e das animações
├── js/
│   ├── rooms.js        # 🟢 DADOS: ambientes, medidas, áreas, leitos, portas
│   ├── furniture.js    # mobiliário 2D (camas, berços, pias, mesas, ...)
│   ├── render.js       # desenha a planta 2D em SVG
│   ├── main.js         # inicialização da planta 2D
│   ├── export.js       # exportação da planta em PNG
│   ├── scene3d.js      # maquete 3D (Three.js): ambientes, mobiliário,
│   │                   #   personagens e clique-para-focar
│   ├── team.js         # 🟢 DADOS: escalas de Julho/2026 (gerado dos PDFs)
│   ├── teamrender.js   # tabelas de escala (Diurno/Noturno/Limpeza)
│   ├── confetti.js     # chuva de confetes do slide final
│   └── slides.js       # controle dos slides e das câmeras 3D
├── assets/
│   ├── fps-logo.svg    # logo da faculdade
│   └── alunas/         # fotos da equipe (slide final)
└── planta-baixa.png    # exportação da planta 2D
```

Toda a informação dos ambientes mora em `js/rooms.js` (em metros) — a planta 2D
e a maquete 3D leem do mesmo lugar.

## Como editar

- **Ambientes**: em `js/rooms.js`, cada ambiente tem `x, y, w, h` (metros),
  `area`, `beds` e `furnish` (tipo de mobiliário + flags como `chairs`, `staff`,
  `man`, `cleaner`, `iso`, `face`). As **portas** ficam no mapa `DOORS`.
- **Slides 3D**: no `index.html`, cada slide tem `data-cam` e `data-target`
  (posição e alvo da câmera).
- **Escalas**: `js/team.js` é gerado a partir dos PDFs de escala — para um novo
  mês, basta regenerar os dados no mesmo formato.
- **Cache**: os scripts usam `?v=N` no `index.html` — aumente o número ao editar
  um arquivo para o navegador recarregar.
