# Planta Baixa — Setor de Enfermaria Pediátrica

Trabalho de **Gerenciamento de Enfermagem**: planta baixa do setor de enfermaria
pediátrica, feita com HTML, CSS e JavaScript puro (sem frameworks, sem build).

A planta reproduz o layout de referência: retângulo de **42,0 m × 28,0 m**, com
alas de internação, postos, salas de apoio, sanitários, ensino e lazer, mobiliário
desenhado e portas.

> Etapa 1 de 2 — **Planta baixa (2D)**. A próxima etapa será a **maquete 3D**,
> reaproveitando os mesmos dados de `js/rooms.js`.

## Como abrir

Opção 1 — abrir direto: dê duplo clique em `index.html`.

Opção 2 — servidor local (recomendado):

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## Estrutura

```
GDE-Apresentacao/
├── index.html          # página (só a planta)
├── css/
│   └── styles.css      # aparência (paredes, mobiliário, rótulos, cotas)
├── js/
│   ├── rooms.js        # 🟢 DADOS: ambientes, medidas, áreas, leitos, portas
│   ├── furniture.js    # mobiliário de cada ambiente (camas, vasos, mesas, ...)
│   ├── render.js       # desenha a planta em SVG (paredes, portas, cotas)
│   └── main.js         # tooltip ao passar o mouse
└── README.md
```

Toda a informação mora em `js/rooms.js` (em metros) — a planta 2D e a futura
maquete 3D leem do mesmo lugar.

## Recursos da planta

- Layout em escala (42 × 28 m) com **cotas gerais** nas bordas.
- **Camas coloridas por ala**: azul (criança/isolamento), verde (adolescente),
  berços na enfermaria lactente.
- **Mobiliário** em cada ambiente: camas com cabeceira e mesa, berços, vasos,
  pias e chuveiros, bancadas, macas, mesas redondas, carteiras, tapete colorido
  da brinquedoteca, etc. (ver `js/furniture.js`).
- **Portas** com folha e arco de abertura, voltadas para a circulação.
- Rótulo de cada ambiente: **nome, nº de leitos e área**.
- **Tooltip** ao passar o mouse (nome, leitos, área total e área por leito).

## Como editar

Em `js/rooms.js`, cada ambiente é um objeto com `x, y, w, h` (metros), `area`,
`furnish` (mobiliário) e, opcionalmente, `beds`, `short`, `areaLabel`, `note`.
As **portas** ficam no mapa `DOORS` (lado da parede, posição e largura).
O mobiliário e o desenho de cada objeto ficam em `js/furniture.js`.

## ⚠ Pontos a confirmar com a turma

- **Recreação/Refeitório: 1,2 m²** — parece baixo para um refeitório.
- **Sala de Aula: 0,8 m²/aluno** — configurada para 30 alunos em `CONFIG`.
