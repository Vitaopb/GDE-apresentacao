/* =============================================================================
 * scene3d.js — Maquete 3D do setor (Three.js), a partir de PlantaDados
 * -----------------------------------------------------------------------------
 * PARTE 1: "casa de boneca" — base do prédio, piso colorido por ambiente e
 * paredes extrudadas a partir dos retângulos de js/rooms.js. Câmera orbital.
 * (Mobiliário/camas e portas entram nas próximas partes.)
 *
 * Coordenadas: o plano 2D (x = leste, y = sul) vira o chão 3D (x, z);
 * a altura é o eixo Y. O modelo é centralizado na origem.
 * ===========================================================================*/

(function (global) {
  'use strict';

  var renderer, scene, camera, controls, container, started = false;
  var W = 50, H = 24;
  var WALL_H = 2.6, WALL_T = 0.12;
  var wallMat;

  // cores dos pisos por categoria (mais vivas que a planta 2D, p/ dar vida ao 3D)
  var FLOOR3D = {
    internacao: 0x6f9cc9, enfermagem: 0x6f9cc9, apoio: 0x66b08e,
    isolamento: 0xd97f7f, lazer: 0xd4af52, sanitario: 0x9a77cc,
    cuidados: 0xc9779f, recepcao: 0xbfa97a, circulacao: 0xbfa97a
  };
  function floorHex(cat) { return FLOOR3D[cat] || 0xe9e2d4; }

  function cx(x) { return x - W / 2; }
  function cz(y) { return y - H / 2; }

  /* --------------------------------------------------------------------------
   * Inicialização
   * ------------------------------------------------------------------------*/
  function init(cont, data) {
    container = cont;
    if (typeof THREE === 'undefined') {
      container.innerHTML = '<div class="canvas3d__err">Não foi possível carregar o Three.js ' +
        '(precisa de internet para o 3D). Verifique a conexão e recarregue.</div>';
      return;
    }
    if (started) return;
    started = true;

    W = data.WIDTH || 50; H = data.HEIGHT || 24;
    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping !== undefined) {          // tom de render arquitetônico
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
    }
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde3ea);
    scene.fog = new THREE.Fog(0xdde3ea, 95, 190);   // suaviza o horizonte (estúdio)

    camera = new THREE.PerspectiveCamera(42, w / h, 0.3, 300);  // near maior = +precisão de profundidade
    camera.position.set(0, 33, 31);

    // luz ambiente suave (céu/chão) + luz principal com sombra + preenchimento
    scene.add(new THREE.HemisphereLight(0xeef3f8, 0xa89a80, 0.38));
    var key = new THREE.DirectionalLight(0xfff1d8, 0.78);
    key.position.set(-26, 44, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera;
    sc.left = -36; sc.right = 36; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
    key.shadow.bias = -0.0004;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xd6e2f0, 0.26);
    fill.position.set(28, 22, -20);
    scene.add(fill);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 2.05;  // não passa do chão
    controls.minDistance = 2;                  // permite vistas internas próximas
    controls.maxDistance = 110;
    controls.update();

    buildModel(data);
    setupPicking();
    animate();
    window.addEventListener('resize', onResize);
  }

  /* --------------------------------------------------------------------------
   * Construção do modelo
   * ------------------------------------------------------------------------*/
  function buildModel(data) {
    collectOpenings(data);   // vãos de porta antes de erguer as paredes

    // chão de estúdio (recebe a sombra do prédio, funde com o fundo via fog)
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ color: 0xcdd5db, roughness: 0.95, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.31;
    ground.receiveShadow = true;
    scene.add(ground);

    // base/laje do prédio
    addBox(-W / 2 - 0.3, -H / 2 - 0.3, W + 0.6, H + 0.6, 0.3, mat(0xd8d0c2), -0.15, true);

    data.ROOMS.forEach(function (r) {
      if (r.decorative) { addFloor(r, floorHex(r.category)); return; }   // circulação
      addFloor(r, floorHex(r.category));
      if (!r.open) addWalls(r);
      buildFurniture(r);
    });

    addBuildingShell();
  }

  /* --------------------------------------------------------------------------
   * Mobiliário 3D (peças simples a partir do campo furnish de cada ambiente)
   * ------------------------------------------------------------------------*/
  // geometria de caixa com cantos arredondados (bevel) — tira o ar "quadrado"
  var RB_CACHE = {};
  function rboxGeo(w, d, h) {
    var r = Math.min(0.04, w * 0.22, d * 0.22, h * 0.22);
    if (r < 0.008) return new THREE.BoxGeometry(w, h, d);   // peças muito finas: caixa normal
    var key = w.toFixed(3) + '|' + d.toFixed(3) + '|' + h.toFixed(3);
    if (RB_CACHE[key]) return RB_CACHE[key];
    var hw = w / 2 - r, hh = h / 2 - r;
    var shape = new THREE.Shape();
    shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.002, d - 2 * r), bevelEnabled: true,
      bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 3
    });
    geo.center();
    RB_CACHE[key] = geo;
    return geo;
  }
  // caixa de mobiliário (cantos arredondados)
  function fb(x, z, w, d, h, hex, y) {
    var m = new THREE.Mesh(rboxGeo(w, d, h), mat(hex));
    m.position.set(cx(x + w / 2), (y != null ? y : h / 2), cz(z + d / 2));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function bedColor(c) { return c === 'green' ? 0x9ec486 : c === 'blue' ? 0x86b3df : 0xd0d8e0; }

  function placeBed(x, z, w, d, hex, headTop) {
    fb(x, z, w, d, 0.42, 0xeef4fa, 0.34);                            // colchão/lençol branco
    // cobertor colorido cobrindo a metade dos pés (mantém o código de cor)
    var coverD = d * 0.55, coverZ = headTop ? z + d - coverD : z;
    fb(x + 0.02, coverZ, w - 0.04, coverD, 0.12, hex, 0.55);         // cobertor
    var pw = w * 0.72, pd = Math.min(0.42, d * 0.26);
    var pz = headTop ? z + 0.08 : z + d - pd - 0.08;
    fb(x + (w - pw) / 2, pz, pw, pd, 0.16, 0xf7fafe, 0.6);           // travesseiro
    var hz = headTop ? z - 0.02 : z + d - 0.08;
    fb(x - 0.04, hz, w + 0.08, 0.1, 1.0, 0xcdba9b, 0.5);             // cabeceira
    // painel de gases na cabeceira (faixa cinza)
    fb(x + 0.05, headTop ? z - 0.01 : z + d - 0.07, w - 0.1, 0.07, 0.25, 0xb9c2cc, 1.12);
    // criado-mudo ao lado
    var tz = headTop ? z + 0.05 : z + d - 0.5;
    fb(x + w + 0.05, tz, 0.4, 0.45, 0.55, 0xe7ddc9, 0.28);
    // suporte de soro (haste + bolsa) junto à cabeceira
    var sx = x - 0.18, sz = headTop ? z + 0.12 : z + d - 0.12;
    cyl(sx, sz, 0.025, 1.55, 0x9aa3ad, 0.78);                        // haste
    fb(sx - 0.07, sz - 0.03, 0.14, 0.06, 0.22, 0xd2e4f2, 1.45);      // bolsa de soro
  }

  function cyl(px, pz, rad, h, hex, y) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 18), mat(hex));
    m.position.set(cx(px), (y != null ? y : h / 2), cz(pz));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); return m;
  }
  function sphere(px, pz, rad, hex, y) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), mat(hex));
    m.position.set(cx(px), (y != null ? y : rad), cz(pz));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); return m;
  }
  function plant3D(px, pz) {
    cyl(px, pz, 0.18, 0.4, 0xb07a4e, 0.2);          // vaso
    sphere(px, pz, 0.34, 0x6cae73, 0.7);            // folhagem
  }
  function roundTable3D(px, pz, rad, chairHex) {
    cyl(px, pz, rad, 0.7, 0xd8c19c, 0.42);
    [[0, -rad - 0.32], [0, rad + 0.32], [-rad - 0.32, 0], [rad + 0.32, 0]].forEach(function (o) {
      fb(px + o[0] - 0.2, pz + o[1] - 0.2, 0.4, 0.4, 0.42, chairHex || 0xcdd5df, 0.2);
    });
  }

  // berço: colchão baixo + grades nos 4 lados
  function crib3D(x, z, w, d) {
    fb(x + 0.05, z + 0.05, w - 0.1, d - 0.1, 0.3, 0xf7eef4, 0.33);     // colchão
    var rh = 0.6, rt = 0.05, wood = 0xd6c0a8;
    fb(x, z, w, rt, rh, wood, rh / 2);                                 // grade norte
    fb(x, z + d - rt, w, rt, rh, wood, rh / 2);                        // sul
    fb(x, z, rt, d, rh, wood, rh / 2);                                 // oeste
    fb(x + w - rt, z, rt, d, rh, wood, rh / 2);                        // leste
  }

  // vaso sanitário (bacia + caixa de descarga atrás)
  function toilet3D(px, pz) {
    fb(px - 0.18, pz - 0.22, 0.36, 0.44, 0.42, 0xffffff, 0.21);        // bacia
    fb(px - 0.2, pz + 0.16, 0.4, 0.16, 0.55, 0xf3f5f7, 0.33);          // caixa
  }
  // pia sobre bancada (cuba + torneira)
  function sinkBasin(px, pz) {
    fb(px - 0.2, pz - 0.16, 0.4, 0.3, 0.08, 0xdfe8f0, 0.84);           // cuba
    fb(px - 0.04, pz + 0.05, 0.08, 0.08, 0.14, 0xb9c2cc, 0.92);        // torneira
  }
  // poltrona de acompanhante (assento + encosto + braços)
  // faceNorth=true: encosto ao sul, assento olhando p/ o norte (cama acima);
  // faceNorth=false: encosto ao norte, olhando p/ o sul (cama abaixo).
  function poltrona(px, pz, faceNorth, hex) {
    var seat = hex || 0x7fa896, arm = 0x5f8473;
    fb(px - 0.3, pz - 0.28, 0.6, 0.56, 0.42, seat, 0.21);              // assento
    var ez = faceNorth ? pz + 0.18 : pz - 0.30;
    fb(px - 0.3, ez, 0.6, 0.12, 0.72, seat, 0.46);                    // encosto
    fb(px - 0.32, pz - 0.28, 0.1, 0.5, 0.52, arm, 0.32);              // braço esq
    fb(px + 0.22, pz - 0.28, 0.1, 0.5, 0.52, arm, 0.32);              // braço dir
  }

  // cilindro entre dois pontos (osso) — coords do plano, y = altura
  function limb(ax, ay, az, bx, by, bz, rad, hex, rad2) {
    var a = new THREE.Vector3(cx(ax), ay, cz(az));
    var b = new THREE.Vector3(cx(bx), by, cz(bz));
    var dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    // rad = raio na ponta A; rad2 (opcional) = raio na ponta B -> membro afunilado
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rad2 != null ? rad2 : rad, rad, len, 12), mat(hex));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }

  // esfera achatada (escala por eixo) — p/ formas orgânicas (máscara etc.)
  function blob(px, pz, rad, hex, y, sx, sy, sz) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), mat(hex));
    m.position.set(cx(px), y, cz(pz));
    m.scale.set(sx || 1, sy || 1, sz || 1);
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  // sorriso: meio-toro em "U" no rosto (plano XY, voltado p/ frente)
  function smileMesh(px, pz, y, r, hex) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 16, Math.PI), mat(hex));
    m.position.set(cx(px), y, cz(pz));
    m.rotation.z = Math.PI;     // vira ∪ (sorriso)
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  // tábua (caixa fina) com centro em px,pz e inclinação em torno do eixo X
  function plank(px, pz, w, d, h, hex, y, rotX) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex));
    m.position.set(cx(px), y, cz(pz));
    if (rotX) m.rotation.x = rotX;
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }

  // enfermeira sentada, torneada — facing 'north' (padrão) ou 'south'; variant varia cabelo/pele
  function nurse3D(px, pz, facing, variant) {
    var s = facing === 'south' ? -1 : 1;                                 // sinal das profundidades (frente)
    var HAIR = [0x4a3526, 0x2a211c, 0x70512f], SKINS = [0xe8b58c, 0xd49a6b, 0xc0894f];
    var v = (variant || 0) % 3;
    var scrub = 0x3f93a8, scrub2 = 0x32788b, skin = SKINS[v], hair = HAIR[v],
        shoe = 0x4a4a4a, board = 0xcdb98f;
    blob(px, pz, 0.12, scrub, 0.52, 1.3, 0.85, 1.05);                    // quadril
    // coxas afuniladas + joelhos + canelas + sapatos alongados
    limb(px - 0.075, 0.54, pz, px - 0.075, 0.52, pz - s * 0.4, 0.065, scrub, 0.052);
    limb(px + 0.075, 0.54, pz, px + 0.075, 0.52, pz - s * 0.4, 0.065, scrub, 0.052);
    sphere(px - 0.075, pz - s * 0.41, 0.052, scrub2, 0.52);
    sphere(px + 0.075, pz - s * 0.41, 0.052, scrub2, 0.52);
    limb(px - 0.075, 0.5, pz - s * 0.43, px - 0.075, 0.08, pz - s * 0.47, 0.045, scrub2, 0.034);
    limb(px + 0.075, 0.5, pz - s * 0.43, px + 0.075, 0.08, pz - s * 0.47, 0.045, scrub2, 0.034);
    blob(px - 0.075, pz - s * 0.53, 0.045, shoe, 0.05, 1.0, 0.7, 1.8);
    blob(px + 0.075, pz - s * 0.53, 0.045, shoe, 0.05, 1.0, 0.7, 1.8);
    // tronco afunilado (cintura estreita -> ombros) + busto + ombros arredondados
    limb(px, 0.56, pz + s * 0.01, px, 1.05, pz - s * 0.03, 0.1, scrub, 0.12);
    blob(px, pz - s * 0.09, 0.062, scrub, 0.88, 1.35, 0.85, 0.75);
    sphere(px - 0.14, pz - s * 0.03, 0.05, scrub, 1.04);
    sphere(px + 0.14, pz - s * 0.03, 0.05, scrub, 1.04);
    // pescoço + cabeça (menor, levemente oval)
    limb(px, 1.05, pz - s * 0.02, px, 1.16, pz - s * 0.02, 0.034, skin);
    blob(px, pz - s * 0.025, 0.1, skin, 1.27, 0.95, 1.1, 1.0);
    // cabelo (calota) + rabo de cavalo afunilado
    blob(px, pz + s * 0.025, 0.108, hair, 1.3, 1.0, 1.05, 1.0);
    limb(px, 1.31, pz + s * 0.09, px, 1.0, pz + s * 0.14, 0.04, hair, 0.024);
    // braços: braço (scrub) -> cotovelo -> antebraço (pele) -> mão
    limb(px - 0.145, 1.02, pz - s * 0.03, px - 0.165, 0.85, pz - s * 0.21, 0.04, scrub, 0.033);
    sphere(px - 0.165, pz - s * 0.21, 0.033, skin, 0.85);
    limb(px - 0.165, 0.85, pz - s * 0.21, px - 0.06, 0.89, pz - s * 0.38, 0.029, skin, 0.025);
    sphere(px - 0.06, pz - s * 0.39, 0.032, skin, 0.89);
    limb(px + 0.145, 1.02, pz - s * 0.03, px + 0.165, 0.85, pz - s * 0.21, 0.04, scrub, 0.033);
    sphere(px + 0.165, pz - s * 0.21, 0.033, skin, 0.85);
    limb(px + 0.165, 0.85, pz - s * 0.21, px + 0.06, 0.89, pz - s * 0.38, 0.029, skin, 0.025);
    sphere(px + 0.06, pz - s * 0.39, 0.032, skin, 0.89);
    // prancheta inclinada, com a FACE (papel + presilha) voltada p/ a enfermeira
    plank(px, pz - s * 0.36, 0.3, 0.34, 0.03, board, 0.92, s * 0.7);
    plank(px, pz - s * 0.345, 0.25, 0.28, 0.012, 0xfdfdfd, 0.938, s * 0.7);
    plank(px, pz - s * 0.47, 0.13, 0.05, 0.03, 0x8a8f96, 0.975, s * 0.7);
  }

  // paletas p/ pacientes/bebês (variar tom de pele e manta)
  var PSKIN = [0xe8b58c, 0xd49a6b, 0xc0894f, 0xf0c39a];
  var BABYCOL = [0xf7c6d2, 0xbfd9f0, 0xfae9b0, 0xc9ecd4];

  // bebê enroladinho deitado (px,pz = centro; y0 = altura da superfície, padrão berço)
  function baby3D(px, pz, v, y0) {
    var base = y0 || 0.5;
    var skin = PSKIN[v % PSKIN.length], blanket = BABYCOL[v % BABYCOL.length];
    blob(px, pz, 0.15, blanket, base, 1.0, 0.55, 1.25);                 // corpinho sob a manta
    sphere(px, pz - 0.17, 0.06, skin, base + 0.03);                     // cabecinha
  }

  // paciente deitado sob o cobertor (bx,bz = canto da cama; bw,bd = tamanho)
  function patient3D(bx, bz, bw, bd, headTop, hex, v) {
    var skin = PSKIN[v % PSKIN.length], cxb = bx + bw / 2;
    var z0 = headTop ? bz + 0.34 : bz + 0.1;
    fb(cxb - bw * 0.32, z0, bw * 0.64, bd - 0.44, 0.16, hex, 0.63);     // corpo sob o cobertor
    var hz = headTop ? bz + 0.17 : bz + bd - 0.17;
    blob(cxb, hz, 0.078, skin, 0.71, 0.95, 0.85, 1.1);                  // cabeça no travesseiro
  }

  // enfermeira EM PÉ (px,pz = pés); facing 'north'/'south'; variant varia cabelo/pele
  function nurseStanding3D(px, pz, facing, variant) {
    var s = facing === 'south' ? -1 : 1;
    var HAIR = [0x4a3526, 0x2a211c, 0x70512f], SKINS = [0xe8b58c, 0xd49a6b, 0xc0894f];
    var v = (variant || 0) % 3;
    var scrub = 0x3f93a8, scrub2 = 0x32788b, skin = SKINS[v], hair = HAIR[v], shoe = 0x4a4a4a;
    // pernas afuniladas (coxa -> joelho -> canela) + sapatos alongados
    limb(px - 0.08, 0.92, pz, px - 0.08, 0.5, pz, 0.068, scrub2, 0.053);
    limb(px + 0.08, 0.92, pz, px + 0.08, 0.5, pz, 0.068, scrub2, 0.053);
    sphere(px - 0.08, pz, 0.053, scrub2, 0.5);
    sphere(px + 0.08, pz, 0.053, scrub2, 0.5);
    limb(px - 0.08, 0.5, pz, px - 0.08, 0.07, pz, 0.048, scrub2, 0.036);
    limb(px + 0.08, 0.5, pz, px + 0.08, 0.07, pz, 0.048, scrub2, 0.036);
    blob(px - 0.08, pz - s * 0.07, 0.048, shoe, 0.045, 1.0, 0.7, 1.8);
    blob(px + 0.08, pz - s * 0.07, 0.048, shoe, 0.045, 1.0, 0.7, 1.8);
    // quadril + tronco afunilado + busto + ombros arredondados
    blob(px, pz, 0.112, scrub, 0.93, 1.3, 0.8, 1.0);
    limb(px, 0.96, pz, px, 1.43, pz - s * 0.015, 0.095, scrub, 0.115);
    blob(px, pz - s * 0.08, 0.06, scrub, 1.25, 1.35, 0.9, 0.75);
    sphere(px - 0.135, pz - s * 0.015, 0.048, scrub, 1.42);
    sphere(px + 0.135, pz - s * 0.015, 0.048, scrub, 1.42);
    // braços: braço -> cotovelo -> antebraço -> mão
    limb(px - 0.14, 1.4, pz - s * 0.015, px - 0.16, 1.13, pz - s * 0.05, 0.038, scrub, 0.031);
    sphere(px - 0.16, pz - s * 0.05, 0.031, skin, 1.13);
    limb(px - 0.16, 1.13, pz - s * 0.05, px - 0.15, 0.87, pz - s * 0.1, 0.027, skin, 0.023);
    sphere(px - 0.15, pz - s * 0.11, 0.03, skin, 0.86);
    limb(px + 0.14, 1.4, pz - s * 0.015, px + 0.16, 1.13, pz - s * 0.05, 0.038, scrub, 0.031);
    sphere(px + 0.16, pz - s * 0.05, 0.031, skin, 1.13);
    limb(px + 0.16, 1.13, pz - s * 0.05, px + 0.15, 0.87, pz - s * 0.1, 0.027, skin, 0.023);
    sphere(px + 0.15, pz - s * 0.11, 0.03, skin, 0.86);
    // pescoço + cabeça (menor, oval) + cabelo + rabo de cavalo
    limb(px, 1.43, pz - s * 0.01, px, 1.53, pz - s * 0.01, 0.033, skin);
    blob(px, pz - s * 0.02, 0.1, skin, 1.64, 0.95, 1.1, 1.0);
    blob(px, pz + s * 0.03, 0.108, hair, 1.67, 1.0, 1.05, 1.0);
    limb(px, 1.67, pz + s * 0.09, px, 1.32, pz + s * 0.14, 0.04, hair, 0.024);
  }

  // homem EM PÉ (acompanhante/visitante) — ombros largos, cabelo curto, roupa casual
  var MAN_STYLES = [
    { shirt: 0x5d83a8, pants: 0x4e4a45, skin: 0xdfa67c, hair: 0x33271e },   // 1: camisa azul
    { shirt: 0x6da378, pants: 0x3f4853, skin: 0xc0894f, hair: 0x1f1a16 },   // 2: camisa verde
    { shirt: 0xd9d9d9, pants: 0x46566b, skin: 0xe8b58c, hair: 0x4a3526 }    // 3: camiseta clara
  ];
  function man3D(px, pz, facing, variant) {
    var s = facing === 'south' ? -1 : 1;
    var st = MAN_STYLES[((variant || 1) - 1) % MAN_STYLES.length];
    var shirt = st.shirt, pants = st.pants, skin = st.skin, hair = st.hair, shoe = 0x3c3c3c;
    // pernas afuniladas + joelhos + sapatos
    limb(px - 0.085, 0.95, pz, px - 0.085, 0.5, pz, 0.07, pants, 0.055);
    limb(px + 0.085, 0.95, pz, px + 0.085, 0.5, pz, 0.07, pants, 0.055);
    sphere(px - 0.085, pz, 0.055, pants, 0.5);
    sphere(px + 0.085, pz, 0.055, pants, 0.5);
    limb(px - 0.085, 0.5, pz, px - 0.085, 0.07, pz, 0.05, pants, 0.038);
    limb(px + 0.085, 0.5, pz, px + 0.085, 0.07, pz, 0.05, pants, 0.038);
    blob(px - 0.085, pz - s * 0.07, 0.05, shoe, 0.046, 1.0, 0.7, 1.85);
    blob(px + 0.085, pz - s * 0.07, 0.05, shoe, 0.046, 1.0, 0.7, 1.85);
    // quadril reto + tronco que alarga p/ ombros largos
    blob(px, pz, 0.108, pants, 0.97, 1.15, 0.75, 1.0);
    limb(px, 1.0, pz, px, 1.48, pz - s * 0.01, 0.1, shirt, 0.13);
    sphere(px - 0.155, pz - s * 0.01, 0.052, shirt, 1.47);
    sphere(px + 0.155, pz - s * 0.01, 0.052, shirt, 1.47);
    // braços: braço (camisa) -> cotovelo -> antebraço (pele) -> mão
    limb(px - 0.16, 1.45, pz - s * 0.01, px - 0.18, 1.16, pz - s * 0.045, 0.042, shirt, 0.034);
    sphere(px - 0.18, pz - s * 0.045, 0.033, skin, 1.16);
    limb(px - 0.18, 1.16, pz - s * 0.045, px - 0.17, 0.89, pz - s * 0.09, 0.029, skin, 0.025);
    sphere(px - 0.17, pz - s * 0.1, 0.031, skin, 0.88);
    limb(px + 0.16, 1.45, pz - s * 0.01, px + 0.18, 1.16, pz - s * 0.045, 0.042, shirt, 0.034);
    sphere(px + 0.18, pz - s * 0.045, 0.033, skin, 1.16);
    limb(px + 0.18, 1.16, pz - s * 0.045, px + 0.17, 0.89, pz - s * 0.09, 0.029, skin, 0.025);
    sphere(px + 0.17, pz - s * 0.1, 0.031, skin, 0.88);
    // pescoço + cabeça oval + cabelo curto (calota achatada, sem rabo)
    limb(px, 1.48, pz - s * 0.005, px, 1.58, pz - s * 0.005, 0.037, skin);
    blob(px, pz - s * 0.015, 0.1, skin, 1.69, 0.96, 1.1, 1.0);
    blob(px, pz + s * 0.018, 0.104, hair, 1.74, 1.0, 0.72, 1.0);
  }

  // auxiliar de limpeza EM PÉ, levemente inclinada, passando pano (esfregão) + balde
  function cleaner3D(px, pz, facing) {
    var s = facing === 'south' ? -1 : 1;
    var uni = 0x6f8fa6, uni2 = 0x5b7689, skin = 0xe2a878, hair = 0x3a2b20, pole = 0x9aa3ad, mop = 0xdfe4e8;
    // pernas afuniladas (direita um passo à frente) + sapatos alongados
    limb(px - 0.08, 0.86, pz, px - 0.08, 0.48, pz, 0.065, uni2, 0.05);
    sphere(px - 0.08, pz, 0.05, uni2, 0.48);
    limb(px - 0.08, 0.48, pz, px - 0.08, 0.07, pz, 0.046, uni2, 0.035);
    blob(px - 0.08, pz - s * 0.07, 0.046, 0x444444, 0.042, 1.0, 0.7, 1.8);
    limb(px + 0.08, 0.86, pz, px + 0.08, 0.5, pz - s * 0.07, 0.065, uni2, 0.05);
    sphere(px + 0.08, pz - s * 0.07, 0.05, uni2, 0.5);
    limb(px + 0.08, 0.5, pz - s * 0.07, px + 0.08, 0.07, pz - s * 0.13, 0.046, uni2, 0.035);
    blob(px + 0.08, pz - s * 0.2, 0.046, 0x444444, 0.042, 1.0, 0.7, 1.8);
    // quadril + tronco inclinado p/ frente (afunilado) + ombros
    blob(px, pz, 0.108, uni, 0.9, 1.3, 0.8, 1.0);
    limb(px, 0.93, pz, px, 1.32, pz - s * 0.18, 0.088, uni, 0.11);
    sphere(px - 0.125, pz - s * 0.165, 0.045, uni, 1.3);
    sphere(px + 0.125, pz - s * 0.165, 0.045, uni, 1.3);
    // pescoço + cabeça (menor, oval) inclinada + cabelo preso com coque
    limb(px, 1.33, pz - s * 0.19, px, 1.41, pz - s * 0.23, 0.03, skin);
    blob(px, pz - s * 0.27, 0.095, skin, 1.46, 0.95, 1.08, 1.0);
    blob(px, pz - s * 0.21, 0.103, hair, 1.5, 1.0, 1.0, 1.0);
    sphere(px, pz - s * 0.14, 0.05, hair, 1.47);                   // coque
    // braços p/ frente-baixo segurando o cabo (com cotovelo e mão)
    limb(px - 0.125, 1.28, pz - s * 0.16, px - 0.05, 1.0, pz - s * 0.4, 0.034, uni, 0.028);
    sphere(px - 0.05, pz - s * 0.4, 0.027, skin, 1.0);
    limb(px + 0.125, 1.28, pz - s * 0.16, px + 0.03, 0.8, pz - s * 0.56, 0.034, uni, 0.028);
    sphere(px + 0.03, pz - s * 0.56, 0.027, skin, 0.8);
    // cabo do rodo (das mãos até o chão, inclinado) + cabeça (lâmina branca larga)
    // (itens rentes ao chão ficam ACIMA do topo do piso, y=0.08, p/ não "afundar")
    limb(px - 0.02, 1.0, pz - s * 0.45, px + 0.02, 0.16, pz - s * 1.0, 0.025, pole);
    fb(px - 0.28, pz - s * 1.0 - 0.06, 0.56, 0.12, 0.08, 0xf3f6f8, 0.125);   // cabeça do rodo
    fb(px - 0.28, pz - s * 1.0 - 0.065, 0.56, 0.04, 0.02, 0x9aa3ad, 0.175);  // borracha do rodo
    // rastro de água/limpo sobre o piso
    fb(px - 0.3, pz - s * 1.0 - 0.2, 0.6, 0.34, 0.012, 0xcfe6ee, 0.09);
    // baldinho ao lado (base apoiada no piso)
    cyl(px - 0.55, pz - s * 0.2, 0.16, 0.34, 0xf2c14e, 0.25);
    cyl(px - 0.55, pz - s * 0.2, 0.13, 0.06, 0xeaf2f6, 0.4);        // água
  }

  function buildFurniture(r) {
    var f = r.furnish; if (!f) return;
    var t = f.type;
    if (t === 'beds') fBeds(r, f);
    else if (t === 'cribs') fCribs(r, f);
    else if (t === 'station') fStation(r);
    else if (t === 'utility') fUtility(r);
    else if (t === 'care') fCare(r);
    else if (t === 'desk') fDesk(r);
    else if (t === 'changing') fChanging(r);
    else if (t === 'classroom') fClassroom(r, f);
    else if (t === 'dining') fDining(r);
    else if (t === 'playroom') fPlayroom(r);
    else if (t === 'bathroom') fBathroom(r, f);
    else if (t === 'anteroom') fAnteroom(r);
  }

  function fBeds(r, f) {
    var n = f.count, hex = bedColor(f.color), i, placed = 0;
    if (n === 1) {
      var bw1 = Math.min(1.1, r.w * 0.4), bl1 = Math.min(2.1, r.h * 0.5);
      var bxc = r.x + r.w * 0.38;
      placeBed(bxc - bw1 / 2, r.y + 0.6, bw1, bl1, hex, true);
      patient3D(bxc - bw1 / 2, r.y + 0.6, bw1, bl1, true, hex, 0);     // paciente deitado
      if (f.iso) {                                                     // quarto de isolamento (sem banheiro)
        vitals3D(bxc + bw1 / 2 + 0.75, r.y + 1.0);                     // monitor de sinais vitais
        poltrona(bxc + 0.1, r.y + 0.6 + bl1 + 0.8, true);              // poltrona do acompanhante
        cart3D(r.x + r.w - 1.0, r.y + r.h - 0.85);                     // carrinho de apoio
        bin3D(r.x + 0.5, r.y + r.h - 0.5, 0xd47272);                   // lixeira infectante
      }
      return;
    }
    var cols = Math.ceil(n / 2), slot = r.w / cols;
    var bw = Math.min(1.1, slot * 0.6), bl = Math.min(2.0, r.h * 0.3);
    for (i = 0; i < cols && placed < n; i++, placed++) {
      var ct = r.x + i * slot + slot / 2;
      placeBed(ct - bw / 2, r.y + 0.45, bw, bl, hex, true);
      if (i % 2 === 0) patient3D(ct - bw / 2, r.y + 0.45, bw, bl, true, hex, i);  // alguns ocupados
      if (f.chairs) poltrona(ct, r.y + 0.45 + bl + 0.5, true);       // poltrona ao pé, olhando p/ a cama (norte)
    }
    for (i = 0; i < cols && placed < n; i++, placed++) {
      var cb = r.x + i * slot + slot / 2;
      placeBed(cb - bw / 2, r.y + r.h - 0.45 - bl, bw, bl, hex, false);
      if (i % 2 === 1) patient3D(cb - bw / 2, r.y + r.h - 0.45 - bl, bw, bl, false, hex, i + 1);
      if (f.chairs) poltrona(cb, r.y + r.h - 0.45 - bl - 0.5, false); // olhando p/ a cama (sul)
    }
    // enfermeira em pé no corredor central (só nos quartos)
    if (f.staff) nurseStanding3D(r.x + r.w * 0.6, r.y + r.h * 0.5, 'north', 0);
    // acompanhante homem em pé no corredor, voltado p/ os leitos de cima
    if (f.man) man3D(r.x + r.w * 0.34, r.y + r.h * 0.56, 'north', f.man);
  }

  function fCribs(r, f) {
    var n = f.count, cols = (r.w >= r.h) ? 4 : 3, rows = Math.ceil(n / cols), k = 0, i, j;
    var cw = r.w / cols, ch = (r.h * 0.6) / rows;
    var bw = Math.min(1.15, cw * 0.6), bl = Math.min(1.35, ch * 0.7);
    for (j = 0; j < rows; j++) for (i = 0; i < cols && k < n; i++, k++) {
      var bxc = r.x + i * cw + (cw - bw) / 2, bzc = r.y + 0.4 + j * ch + (ch - bl) / 2;
      crib3D(bxc, bzc, bw, bl);
      if (k % 2 === 0) baby3D(bxc + bw / 2, bzc + bl / 2, k);          // bebê em alguns berços
    }
    fb(r.x + 0.5, r.y + r.h - 1.0, r.w - 1.0, 0.6, 0.85, 0xe7ddc9, 0.42);  // bancada
    // enfermeira em pé cuidando dos lactentes
    nurseStanding3D(r.x + r.w * 0.5, r.y + r.h - 1.7, 'north', 1);
  }

  function fStation(r) {
    var i, f = r.furnish || {}, south = f.face === 'south';
    // espelha em z quando o posto olha p/ o sul (frente = entrada): canto p/ fb, centro p/ peças
    function zc(z0, dz) { return south ? (2 * r.y + r.h - z0 - dz) : z0; }
    function zk(z) { return south ? (2 * r.y + r.h - z) : z; }
    var facing = south ? 'south' : 'north';
    // balcão de atendimento (corpo + tampo) na frente
    fb(r.x + 0.3, zc(r.y + 0.35, 0.6), r.w - 0.6, 0.6, 0.95, 0xe7ddc9, 0.5);
    fb(r.x + 0.25, zc(r.y + 0.3, 0.72), r.w - 0.5, 0.72, 0.06, 0xc9b288, 1.0);  // tampo
    // monitores + teclados (tela voltada p/ a equipe)
    var nM = Math.max(1, Math.round((r.w - 1.0) / 1.9));
    for (i = 0; i < nM; i++) {
      var mx = r.x + 0.9 + (i + 0.5) * (r.w - 1.8) / nM;
      fb(mx - 0.28, zc(r.y + 0.62, 0.06), 0.56, 0.06, 0.34, 0x2d3a47, 1.22);    // monitor
      fb(mx - 0.05, zc(r.y + 0.58, 0.08), 0.1, 0.08, 0.16, 0x6b7785, 1.06);     // pé
      fb(mx - 0.22, zc(r.y + 0.74, 0.18), 0.44, 0.18, 0.03, 0xd7dde4, 1.04);    // teclado
    }
    // pastas/papéis no tampo (na ponta leste)
    fb(r.x + r.w - 1.15, zc(r.y + 0.42, 0.3), 0.24, 0.3, 0.2, 0xe06b6b, 1.1);
    fb(r.x + r.w - 0.85, zc(r.y + 0.42, 0.3), 0.2, 0.3, 0.24, 0x6b8cef, 1.12);
    // armário de apoio ao fundo
    fb(r.x + 0.5, zc(r.y + r.h - 0.7, 0.45), r.w - 1.0, 0.45, 1.2, 0xefe6d4, 0.6);
    // cadeiras giratórias com uma enfermeira em cada
    var nC = Math.max(2, Math.floor((r.w - 0.8) / 1.4));
    for (i = 0; i < nC; i++) {
      var cxp = r.x + 0.9 + i * 1.4;
      fb(cxp - 0.21, zc(r.y + 1.32, 0.44), 0.42, 0.44, 0.46, 0x6b88a6, 0.24);   // assento
      fb(cxp - 0.21, zc(r.y + 1.66, 0.1), 0.42, 0.1, 0.56, 0x5d7793, 0.55);     // encosto
      fb(cxp - 0.03, zc(r.y + 1.5, 0.06), 0.06, 0.06, 0.24, 0x55606e, 0.12);    // coluna
      nurse3D(cxp, zk(r.y + 1.52), facing, i);
    }
  }
  /* ---- peças de apoio p/ salas clínicas ---- */
  // estante aberta com caixas de suprimentos coloridas
  function shelf3D(x, z, w, d) {
    var wood = 0xcbbfa6, BOX = [0xd9e3ee, 0xbcd9c2, 0xe8d9b0, 0xd9c2d4], k = 0;
    fb(x, z, 0.05, d, 1.7, wood, 0.93);
    fb(x + w - 0.05, z, 0.05, d, 1.7, wood, 0.93);
    [0.5, 0.94, 1.38].forEach(function (sy) {
      fb(x + 0.05, z, w - 0.1, d, 0.04, wood, sy);
      var bx = x + 0.12;
      while (bx + 0.34 < x + w - 0.1) {
        fb(bx, z + 0.06, 0.28, d - 0.14, 0.24, BOX[k % 4], sy + 0.16);
        bx += 0.36; k++;
      }
    });
  }
  // carrinho de curativos (2 bandejas inox + rodízios + bandejas de material)
  function cart3D(px, pz) {
    var steel = 0xc7d0d8, pole = 0x9aa3ad;
    fb(px, pz, 0.55, 0.4, 0.04, steel, 0.85);
    fb(px, pz, 0.55, 0.4, 0.04, steel, 0.45);
    [[0.02, 0.02], [0.49, 0.02], [0.02, 0.34], [0.49, 0.34]].forEach(function (o) {
      fb(px + o[0], pz + o[1], 0.04, 0.04, 0.74, pole, 0.5);
      sphere(px + o[0] + 0.02, pz + o[1] + 0.02, 0.035, 0x4a4a4a, 0.12);
    });
    fb(px + 0.07, pz + 0.07, 0.2, 0.14, 0.07, 0xffffff, 0.91);
    fb(px + 0.32, pz + 0.1, 0.14, 0.18, 0.1, 0x7fb0d4, 0.93);
  }
  // monitor de sinais vitais em pedestal (com traço de ECG)
  function vitals3D(px, pz) {
    cyl(px, pz, 0.16, 0.05, 0x9aa3ad, 0.11);
    cyl(px, pz, 0.025, 1.1, 0x9aa3ad, 0.66);
    fb(px - 0.17, pz - 0.05, 0.34, 0.09, 0.26, 0x2d3a47, 1.32);
    fb(px - 0.12, pz - 0.06, 0.1, 0.012, 0.04, 0x59d98c, 1.34);
  }
  // lixeira hospitalar (corpo + aro)
  function bin3D(px, pz, hex) {
    cyl(px, pz, 0.11, 0.3, hex || 0xeceff2, 0.24);
    cyl(px, pz, 0.115, 0.03, 0x9aa3ad, 0.4);
  }
  // mocho giratório
  function stool3D(px, pz) {
    cyl(px, pz, 0.14, 0.03, 0x9aa3ad, 0.11);
    cyl(px, pz, 0.03, 0.34, 0x9aa3ad, 0.3);
    cyl(px, pz, 0.17, 0.06, 0x6b88a6, 0.5);
  }

  // Sala de Serviços: bancada com 2 cubas, armário suspenso, estante, carrinho e hamper
  function fUtility(r) {
    var wood = 0xe7ddc9;
    fb(r.x + 0.2, r.y + 0.12, r.w - 0.4, 0.55, 0.88, wood, 0.46);        // bancada
    sinkBasin(r.x + 0.7, r.y + 0.4);
    sinkBasin(r.x + 1.5, r.y + 0.4);
    fb(r.x + 0.25, r.y + 0.08, r.w - 0.5, 0.38, 0.55, 0xefe6d4, 1.85);   // armário suspenso
    shelf3D(r.x + 0.18, r.y + r.h - 0.6, 1.3, 0.42);                     // estante de suprimentos
    cart3D(r.x + r.w - 1.1, r.y + 1.3);                                  // carrinho
    cyl(r.x + r.w - 0.45, r.y + 0.45, 0.21, 0.62, 0xd9d3c4, 0.4);        // hamper de roupas
    cyl(r.x + r.w - 0.45, r.y + 0.45, 0.18, 0.04, 0xc4bca8, 0.73);
  }

  // Sala de Exames/Curativos: bancada c/ pia, maca acolchoada, monitor, carrinho, mocho, soro e lixeiras
  function fCare(r) {
    var wood = 0xe7ddc9;
    fb(r.x + 0.2, r.y + 0.12, r.w * 0.55, 0.55, 0.88, wood, 0.46);       // bancada
    sinkBasin(r.x + 0.75, r.y + 0.4);
    fb(r.x + 0.2, r.y + 0.08, r.w * 0.55, 0.38, 0.55, 0xefe6d4, 1.85);   // armário suspenso
    var mx = r.x + r.w * 0.42, mz = r.y + r.h * 0.6;
    fb(mx - 0.45, mz - 0.9, 0.9, 1.8, 0.5, 0xeef1f4, 0.33);              // maca (base)
    fb(mx - 0.42, mz - 0.87, 0.84, 1.74, 0.14, 0xffffff, 0.62);          // colchonete
    fb(mx - 0.3, mz - 0.82, 0.6, 0.3, 0.1, 0xf2f6fb, 0.72);              // travesseiro
    vitals3D(mx + 0.78, mz - 0.5);                                       // monitor de sinais
    cart3D(r.x + r.w - 0.9, r.y + 0.5);                                  // carrinho de curativos
    stool3D(mx - 0.78, mz + 0.25);                                       // mocho
    cyl(mx + 0.78, mz + 0.45, 0.025, 1.55, 0x9aa3ad, 0.85);              // suporte de soro
    fb(mx + 0.71, mz + 0.42, 0.14, 0.06, 0.22, 0xd2e4f2, 1.52);
    bin3D(r.x + 0.4, r.y + r.h - 0.45);                                  // lixeira comum
    bin3D(r.x + 0.85, r.y + r.h - 0.45, 0xd47272);                       // lixeira infectante
  }

  // Prescrição Médica: mesa c/ computador e receituário, cadeira, prateleira de prontuários
  function fDesk(r) {
    var wood = 0x8a7a5e, mx = r.x + r.w / 2;
    fb(r.x + 0.22, r.y + 0.18, r.w - 0.44, 0.62, 0.06, 0xc9b288, 0.74);  // tampo
    fb(r.x + 0.26, r.y + 0.22, 0.05, 0.54, 0.72, wood, 0.36);            // pés
    fb(r.x + r.w - 0.31, r.y + 0.22, 0.05, 0.54, 0.72, wood, 0.36);
    fb(mx - 0.26, r.y + 0.28, 0.52, 0.06, 0.32, 0x2d3a47, 1.08);         // monitor
    fb(mx - 0.05, r.y + 0.26, 0.1, 0.07, 0.14, 0x6b7785, 0.92);
    fb(mx - 0.2, r.y + 0.46, 0.4, 0.16, 0.03, 0xd7dde4, 0.79);           // teclado
    fb(mx + 0.28, r.y + 0.3, 0.18, 0.26, 0.03, 0xffffff, 0.79);          // receituário
    fb(mx - 0.21, r.y + 0.95, 0.42, 0.44, 0.46, 0x6b88a6, 0.24);         // cadeira giratória
    fb(mx - 0.21, r.y + 1.32, 0.42, 0.1, 0.56, 0x5d7793, 0.55);
    fb(mx - 0.03, r.y + 1.12, 0.06, 0.06, 0.24, 0x55606e, 0.12);
    fb(r.x + 0.35, r.y + 0.08, r.w - 0.7, 0.26, 0.04, 0xcbbfa6, 1.58);   // prateleira na parede
    var BC = [0xc94f4f, 0x3b6fd4, 0x3f9c5a, 0xd9a23b, 0x8a6fc9];
    var nB = Math.floor((r.w - 0.85) / 0.15);
    for (var i = 0; i < nB; i++) {                                       // pastas de prontuário
      fb(r.x + 0.42 + i * 0.15, r.y + 0.1, 0.1, 0.22, 0.3, BC[i % 5], 1.76);
    }
    bin3D(r.x + 0.35, r.y + r.h - 0.42);                                 // lixeira
  }
  // Cuidados/Higienização dos Lactentes: bancada c/ banheira, trocador c/ bebê,
  // balança, prateleira de toalhas/frascos, hamper, mocho e lixeira
  function fChanging(r) {
    var wood = 0xe7ddc9;
    // bancada na parede norte (porta fica na leste)
    fb(r.x + 0.15, r.y + 0.12, r.w - 0.5, 0.6, 0.82, wood, 0.43);
    // banheira de bebê embutida (cuba branca + água + torneira)
    fb(r.x + 0.35, r.y + 0.17, 0.95, 0.5, 0.28, 0xffffff, 0.95);
    fb(r.x + 0.45, r.y + 0.22, 0.75, 0.4, 0.05, 0xaedaeb, 1.06);
    fb(r.x + 0.78, r.y + 0.13, 0.08, 0.08, 0.2, 0xb9c2cc, 1.16);
    // trocador acolchoado com bordas + bebê deitado
    fb(r.x + 1.5, r.y + 0.18, 1.0, 0.52, 0.1, 0xf2c9d4, 0.89);
    fb(r.x + 1.5, r.y + 0.16, 1.0, 0.05, 0.16, 0xe8b4c4, 0.92);
    fb(r.x + 1.5, r.y + 0.67, 1.0, 0.05, 0.16, 0xe8b4c4, 0.92);
    baby3D(r.x + 2.0, r.y + 0.46, 1, 0.97);
    // balança de bebê (base + concha)
    fb(r.x + 2.68, r.y + 0.2, 0.45, 0.4, 0.12, 0xdfe5ea, 0.9);
    blob(r.x + 2.9, r.y + 0.4, 0.2, 0xffffff, 1.03, 1.25, 0.45, 0.9);
    // prateleira na parede c/ toalhas enroladas e frascos de banho
    fb(r.x + 0.3, r.y + 0.06, r.w - 0.9, 0.26, 0.04, 0xcbbfa6, 1.5);
    [0xf2c9d4, 0xbcd9e8, 0xc9e3c0, 0xf0e3b2].forEach(function (c, i) {
      cyl(r.x + 0.55 + i * 0.26, r.y + 0.19, 0.075, 0.18, c, 1.62);     // toalhas
    });
    [0xd9a23b, 0x6da378, 0x8a6fc9].forEach(function (c, i) {
      cyl(r.x + 1.75 + i * 0.18, r.y + 0.19, 0.04, 0.17, c, 1.61);      // frascos
    });
    // hamper de roupinhas (canto sudoeste) + mocho + lixeira
    cyl(r.x + 0.45, r.y + r.h - 0.45, 0.2, 0.6, 0xd9d3c4, 0.4);
    cyl(r.x + 0.45, r.y + r.h - 0.45, 0.17, 0.04, 0xc4bca8, 0.72);
    stool3D(r.x + 2.0, r.y + 1.35);
    bin3D(r.x + 1.05, r.y + r.h - 0.4);
  }
  // criança sentada na carteira, de frente p/ o quadro (norte)
  function student3D(px, pz, v) {
    var SH = [0xd96d6d, 0x6d9bd9, 0x76b985, 0xd9c46d, 0x9a85cc, 0x68b8c4];
    var SK = [0xe8b58c, 0xd49a6b, 0xc0894f, 0xf0c39a];
    var HR = [0x3a2b20, 0x1f1a16, 0x70512f, 0x4a3526];
    var shirt = SH[v % SH.length], skin = SK[(v * 2 + 1) % SK.length],
        hair = HR[(v * 3 + 2) % HR.length], pants = 0x4e5a66;
    blob(px, pz, 0.1, pants, 0.47, 1.2, 0.7, 0.9);                       // quadril no assento
    limb(px - 0.055, 0.48, pz, px - 0.055, 0.46, pz - 0.26, 0.05, pants, 0.04);   // coxas
    limb(px + 0.055, 0.48, pz, px + 0.055, 0.46, pz - 0.26, 0.05, pants, 0.04);
    limb(px - 0.055, 0.45, pz - 0.28, px - 0.055, 0.06, pz - 0.3, 0.035, pants, 0.028); // canelas
    limb(px + 0.055, 0.45, pz - 0.28, px + 0.055, 0.06, pz - 0.3, 0.035, pants, 0.028);
    limb(px, 0.5, pz, px, 0.86, pz - 0.02, 0.085, shirt, 0.095);         // tronco
    limb(px - 0.1, 0.84, pz - 0.02, px - 0.08, 0.72, pz - 0.3, 0.03, shirt, 0.025); // braços na mesa
    limb(px + 0.1, 0.84, pz - 0.02, px + 0.08, 0.72, pz - 0.3, 0.03, shirt, 0.025);
    limb(px, 0.86, pz - 0.01, px, 0.93, pz - 0.01, 0.026, skin);         // pescoço
    blob(px, pz - 0.015, 0.082, skin, 1.02, 0.95, 1.08, 1.0);            // cabeça
    blob(px, pz + 0.02, 0.088, hair, 1.05, 1.0, 0.85, 1.0);              // cabelo
  }

  function fClassroom(r, f) {
    var n = (f && f.count) ? f.count : 12, i;
    var wood = 0x8a7a5e, top = 0xd8c19c, seatHex = 0x7aa0c4;
    // quadro branco na parede norte, na metade direita (a porta fica a 45% da largura)
    var bw = Math.min(4.2, r.w * 0.42), bx = r.x + r.w * 0.53;
    fb(bx - 0.08, r.y + 0.05, bw + 0.16, 0.05, 1.35, wood, 1.42);        // moldura
    fb(bx, r.y + 0.1, bw, 0.04, 1.15, 0xf7faf8, 1.42);                   // lousa
    fb(bx, r.y + 0.12, bw, 0.14, 0.04, wood, 0.83);                      // bandeja
    fb(bx + bw * 0.08, r.y + 0.125, bw * 0.42, 0.015, 0.05, 0x3b6fd4, 1.7);   // rabisco azul
    fb(bx + bw * 0.12, r.y + 0.125, bw * 0.3, 0.015, 0.05, 0xc94f4f, 1.5);    // rabisco vermelho
    fb(bx + bw * 0.55, r.y + 0.125, bw * 0.3, 0.015, 0.05, 0x3f9c5a, 1.28);   // rabisco verde
    // mesa do professor (tampo + painel + pés) à esquerda da frente
    var tdx = r.x + r.w * 0.16, tdz = r.y + 0.7;
    fb(tdx, tdz, 1.5, 0.65, 0.06, 0xc9b288, 0.74);                       // tampo
    fb(tdx + 0.06, tdz + 0.06, 1.38, 0.05, 0.52, top, 0.45);             // painel frontal
    fb(tdx + 0.03, tdz + 0.05, 0.05, 0.55, 0.7, wood, 0.35);             // pé esq
    fb(tdx + 1.42, tdz + 0.05, 0.05, 0.55, 0.7, wood, 0.35);             // pé dir
    fb(tdx + 0.25, tdz + 0.12, 0.32, 0.22, 0.05, 0xffffff, 0.79);        // papéis
    // professor em pé ao lado do quadro, de frente p/ a turma
    man3D(r.x + r.w * 0.62, r.y + 1.05, 'south', 1);
    // carteiras: 2 fileiras de frente p/ o quadro, com um aluno em cada
    var rows = (r.h > 6) ? 3 : 2, cols = Math.ceil(n / rows), placed = 0;
    var slot = (r.w - 1.0) / cols, startZ = r.y + 1.95, gy = 1.5;
    for (var rr = 0; rr < rows && placed < n; rr++) {
      for (var c = 0; c < cols && placed < n; c++, placed++) {
        var dx = r.x + 0.5 + c * slot + slot / 2, dz = startZ + rr * gy;
        fb(dx - 0.475, dz, 0.95, 0.55, 0.05, top, 0.72);                 // tampo da carteira
        fb(dx - 0.45, dz + 0.04, 0.05, 0.48, 0.66, wood, 0.36);          // lateral esq
        fb(dx + 0.4, dz + 0.04, 0.05, 0.48, 0.66, wood, 0.36);           // lateral dir
        fb(dx - 0.21, dz + 0.72, 0.42, 0.4, 0.05, seatHex, 0.44);        // assento
        fb(dx - 0.21, dz + 1.08, 0.42, 0.05, 0.42, seatHex, 0.72);       // encosto
        fb(dx - 0.19, dz + 0.76, 0.04, 0.32, 0.42, 0x9aa3ad, 0.21);      // pé esq
        fb(dx + 0.15, dz + 0.76, 0.04, 0.32, 0.42, 0x9aa3ad, 0.21);      // pé dir
        student3D(dx, dz + 0.94, placed);                                // aluno sentado
      }
    }
  }
  function fDining(r) {
    roundTable3D(r.x + r.w * 0.62, r.y + r.h * 0.32, 0.62, 0xbfe0d8);
    roundTable3D(r.x + r.w * 0.55, r.y + r.h * 0.72, 0.62, 0xbfe0d8);
    fb(r.x + 0.3, r.y + 0.4, 0.7, r.h - 1.2, 0.9, 0xe7ddc9, 0.48);
  }
  function fPlayroom(r) {
    var cols = 4, rows = 3, rw = r.w * 0.42, rh = r.h * 0.42, ox = r.x + r.w * 0.3, oz = r.y + r.h * 0.45;
    var cw = rw / cols, ch = rh / rows, colors = [0xef4444, 0xf59e0b, 0x3b82f6, 0x22c55e], k = 0, i, j;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++, k++) {
      fb(ox + i * cw + 0.05, oz + j * ch + 0.05, cw - 0.1, ch - 0.1, 0.04, colors[k % 4], 0.103);
    }
    fb(r.x + 0.4, r.y + 0.6, 0.6, r.h * 0.5, 1.0, 0xeef1f5, 0.5);          // estante
    roundTable3D(r.x + r.w * 0.78, r.y + r.h * 0.28, 0.5, 0xbfe0d8);
    // brinquedos soltos
    fb(r.x + r.w * 0.58, r.y + 0.7, 0.32, 0.32, 0.32, 0xef4444, 0.2);
    fb(r.x + r.w * 0.64, r.y + 0.68, 0.3, 0.3, 0.3, 0x3b82f6, 0.2);
    sphere(r.x + r.w * 0.7, r.y + r.h * 0.55, 0.26, 0xf59e0b);
  }
  function fBathroom(r, f) {
    var i;
    // chuveiro (canto sup-esq): base + tubo
    var shw = f.shower ? Math.min(1.1, r.w * 0.4, r.h * 0.4) : 0;
    if (f.shower) {
      fb(r.x + 0.15, r.y + 0.15, shw, shw, 0.05, 0xdce8f1, 0.105);
      cyl(r.x + 0.15 + shw - 0.25, r.y + 0.4, 0.06, 1.9, 0xc2ccd6, 0.95);
    }
    // pias na parede de cima, sobre bancada
    var nS = f.sink || 0;
    if (nS) {
      var sStart = r.x + (f.shower ? shw + 0.4 : 0.4), sEnd = r.x + r.w - 0.3;
      if (sEnd - sStart > 0.45) {
        fb(sStart, r.y + 0.18, sEnd - sStart, 0.5, 0.82, 0xeef1f4, 0.41);   // bancada
        var ssx = sStart + 0.45;
        for (i = 0; i < nS && ssx < sEnd - 0.2; i++, ssx += 0.8) sinkBasin(ssx, r.y + 0.42);
      }
    }
    // vasos na parede de baixo, cada um dentro de um BOX fechado (baia c/ divisórias)
    var nW = f.wc || 0;
    if (nW) {
      var depth = Math.min(1.4, r.h * 0.42);     // profundidade do box (parede -> dentro)
      var ws = Math.min(1.2, (r.w - 1.0) / nW);   // largura de cada box
      var startX = r.x + (r.w - ws * nW) / 2;     // centraliza a fileira de boxes
      var backZ = r.y + r.h;                       // parede de baixo (fundo dos boxes)
      var ph = 1.7, pt = 0.07, pc = 0xe4e0ec;      // altura/espessura/cor das divisórias
      for (i = 0; i < nW; i++) {
        var bx = startX + i * ws;
        fb(bx, backZ - depth, pt, depth, ph, pc, ph / 2);   // divisória esquerda do box
        toilet3D(bx + ws / 2, backZ - 0.55);                // vaso dentro do box
      }
      fb(startX + nW * ws - pt, backZ - depth, pt, depth, ph, pc, ph / 2); // fecha o último box
    }
    // auxiliar de limpeza passando pano no centro do banheiro
    if (f.cleaner) cleaner3D(r.x + r.w * 0.46, r.y + r.h * 0.5, 'south');
    // homem em pé na bancada das pias (lavando as mãos)
    if (f.man) man3D(r.x + r.w * 0.55, r.y + 1.35, 'north', f.man);
  }
  // antecâmara do isolamento: pia de lavagem das mãos, álcool, EPIs, hamper e lixeira
  function fAnteroom(r) {
    var mx = r.x + r.w / 2;
    // pia de higienização das mãos (coluna + cuba + torneira)
    fb(mx - 0.32, r.y + 0.3, 0.64, 0.5, 0.8, 0xeef1f4, 0.42);
    sinkBasin(mx, r.y + 0.55);
    fb(mx - 0.08, r.y + 0.06, 0.16, 0.1, 0.24, 0xffffff, 1.32);        // dispenser de álcool
    // hamper p/ aventais usados + lixeira infectante
    cyl(mx + 0.15, r.y + r.h - 0.55, 0.18, 0.55, 0xd9d3c4, 0.36);
    cyl(mx + 0.15, r.y + r.h - 0.55, 0.15, 0.04, 0xc4bca8, 0.67);
    bin3D(r.x + 0.35, r.y + r.h - 0.5, 0xd47272);
  }

  // textura procedural de piso (placa 1×1 m com junta sutil)
  var tileTex = null;
  function getTileTexture() {
    if (tileTex) return tileTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(3, 3, 122, 122);   // leve variação central
    g.strokeStyle = 'rgba(70,80,92,0.18)'; g.lineWidth = 2.5;
    g.strokeRect(0, 0, 128, 128);                                        // junta
    tileTex = new THREE.CanvasTexture(c);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    return tileTex;
  }
  function addFloor(r, colorHex) {
    var t = getTileTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(r.w)), Math.max(1, Math.round(r.h)));
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
    t.needsUpdate = true;
    var m = new THREE.Mesh(
      new THREE.BoxGeometry(r.w, 0.08, r.h),
      new THREE.MeshStandardMaterial({ color: colorHex, map: t, roughness: 0.72, metalness: 0.03 })
    );
    // circulação (decorativa) fica bem abaixo dos pisos dos ambientes (sem z-fighting)
    m.position.set(cx(r.x + r.w / 2), r.decorative ? 0.015 : 0.04, cz(r.y + r.h / 2));
    m.receiveShadow = true;
    scene.add(m);
    if (!r.decorative) {                       // piso clicável -> foca o ambiente
      m.userData.room = r;
      r._floorMat = m.material;
      floorMeshes.push(m);
    }
  }

  var capMat = null;
  function getCapMat() { if (!capMat) capMat = mat(0xc8c1b2); return capMat; }
  function getWallMat() { if (!wallMat) wallMat = mat(0xf3efe7); return wallMat; }

  // x,z = canto (coords do plano); w = extensão em X; d = profundidade em Z; h = altura
  function addBox(x, z, w, d, h, material, y, absolute) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    if (absolute) m.position.set(x + w / 2, (y != null ? y : h / 2), z + d / 2);
    else m.position.set(cx(x + w / 2), (y != null ? y : h / 2), cz(z + d / 2));
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  /* aberturas de porta (em coords do plano, já escaladas) */
  var DOOR_H = 2.1;
  var opV = [];  // paredes verticais (x const): {x, c (centro z), w}
  var opH = [];  // paredes horizontais (z const): {z, c (centro x), w}

  function collectOpenings(data) {
    opV = []; opH = [];
    data.ROOMS.forEach(function (r) {
      if (!r.doors) return;
      r.doors.forEach(function (d) {
        var at = (d.at != null ? d.at : 0.5);
        var w = (d.w || 1.0) + 0.12;  // folga p/ batente
        if (d.side === 'left') opV.push({ x: r.x, c: r.y + at * r.h, w: w });
        else if (d.side === 'right') opV.push({ x: r.x + r.w, c: r.y + at * r.h, w: w });
        else if (d.side === 'top') opH.push({ z: r.y, c: r.x + at * r.w, w: w });
        else if (d.side === 'bottom') opH.push({ z: r.y + r.h, c: r.x + at * r.w, w: w });
      });
    });
  }

  // parede vertical (x constante), de z0 a z1, abrindo vãos coincidentes
  function wallV(x, z0, z1, h, m, t) {
    t = t || WALL_T;
    var gaps = opV.filter(function (o) { return Math.abs(o.x - x) < 0.1 && o.c > z0 && o.c < z1; })
      .map(function (o) { return [Math.max(z0, o.c - o.w / 2), Math.min(z1, o.c + o.w / 2)]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    var cur = z0;
    gaps.forEach(function (g) {
      if (g[0] > cur) addBox(x - t / 2, cur, t, g[0] - cur, h, m);
      addBox(x - t / 2, g[0], t, g[1] - g[0], h - DOOR_H, m, DOOR_H + (h - DOOR_H) / 2); // verga
      cur = g[1];
    });
    if (cur < z1) addBox(x - t / 2, cur, t, z1 - cur, h, m);
    // tampa de corte no topo (estilo maquete de arquitetura)
    addBox(x - (t + 0.05) / 2, z0, t + 0.05, z1 - z0, 0.035, getCapMat(), h + 0.0175);
  }

  // parede horizontal (z constante), de x0 a x1, abrindo vãos coincidentes
  function wallH(z, x0, x1, h, m, t) {
    t = t || WALL_T;
    var gaps = opH.filter(function (o) { return Math.abs(o.z - z) < 0.1 && o.c > x0 && o.c < x1; })
      .map(function (o) { return [Math.max(x0, o.c - o.w / 2), Math.min(x1, o.c + o.w / 2)]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    var cur = x0;
    gaps.forEach(function (g) {
      if (g[0] > cur) addBox(cur, z - t / 2, g[0] - cur, t, h, m);
      addBox(g[0], z - t / 2, g[1] - g[0], t, h - DOOR_H, m, DOOR_H + (h - DOOR_H) / 2); // verga
      cur = g[1];
    });
    if (cur < x1) addBox(cur, z - t / 2, x1 - cur, t, h, m);
    // tampa de corte no topo (estilo maquete de arquitetura)
    addBox(x0, z - (t + 0.05) / 2, x1 - x0, t + 0.05, 0.035, getCapMat(), h + 0.0175);
  }

  function addWalls(r) {
    var m = getWallMat();
    wallH(r.y, r.x, r.x + r.w, WALL_H, m);            // norte (topo)
    wallH(r.y + r.h, r.x, r.x + r.w, WALL_H, m);      // sul (base)
    wallV(r.x, r.y, r.y + r.h, WALL_H, m);            // oeste (esq)
    wallV(r.x + r.w, r.y, r.y + r.h, WALL_H, m);      // leste (dir)
  }

  function addBuildingShell() {
    var m = mat(0xddd5c6), T = 0.25, h = WALL_H + 0.3;
    wallH(0, 0, W, h, m, T);     // topo
    wallH(H, 0, W, h, m, T);     // base (tem a entrada principal)
    wallV(0, 0, H, h, m, T);     // esquerda
    wallV(W, 0, H, h, m, T);     // direita
  }

  function mat(hex) { return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.74, metalness: 0.03 }); }

  /* --------------------------------------------------------------------------
   * Loop / resize
   * ------------------------------------------------------------------------*/
  function animate() {
    requestAnimationFrame(animate);
    if (camGoal) {                                   // transição suave de câmera
      camera.position.lerp(camGoal, 0.07);
      controls.target.lerp(tgtGoal, 0.07);
      if (camera.position.distanceTo(camGoal) < 0.08) {
        camera.position.copy(camGoal); controls.target.copy(tgtGoal);
        camGoal = tgtGoal = null;
      }
    }
    if (controls) controls.update();
    if (renderer) renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !container) return;
    var w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  var camGoal = null, tgtGoal = null;
  function setView(px, py, pz, tx, ty, tz, instant) {
    if (!camera || !controls) return;
    if (instant) {
      camera.position.set(px, py, pz);
      controls.target.set(tx || 0, ty || 0, tz || 0);
      controls.update();
      camGoal = tgtGoal = null;
      return;
    }
    camGoal = new THREE.Vector3(px, py, pz);
    tgtGoal = new THREE.Vector3(tx || 0, ty || 0, tz || 0);
  }

  /* --------------------------------------------------------------------------
   * Interação: clique num ambiente -> a câmera voa p/ dentro dele
   * ------------------------------------------------------------------------*/
  var floorMeshes = [];
  var raycaster = null, mouseNDC = null, hovered = null, downPos = null;
  var focusEl = null, focusName = null;

  function fmtArea3D(a) {
    var s = (typeof a === 'number') ? a.toFixed(2) : String(a);
    return s.replace('.', ',') + ' m²';
  }
  function roomLabel(r) {
    var extra = [];
    if (r.beds) extra.push(r.beds);
    if (r.area) extra.push(fmtArea3D(r.area));
    return r.name + (extra.length ? ' — ' + extra.join(' · ') : '');
  }

  function focusRoom(roomOrId) {
    var r = roomOrId;
    if (typeof roomOrId === 'string') {
      r = null;
      floorMeshes.forEach(function (m) { if (m.userData.room.id === roomOrId) r = m.userData.room; });
    }
    if (!r) return;
    var wx = cx(r.x + r.w / 2), wz = cz(r.y + r.h / 2);
    var d = Math.max(r.w, r.h), dv = Math.max(d, 5.5);
    // câmera ao sul do ambiente, alta o bastante p/ enxergar por cima da parede
    setView(wx, 3.2 + dv * 0.55, wz + r.h / 2 + 1.0 + d * 0.25, wx, 0.7, wz - d * 0.05);
    if (focusEl) { focusName.textContent = roomLabel(r); focusEl.hidden = false; }
  }
  function clearFocus() { if (focusEl) focusEl.hidden = true; }
  function backToOverview() {
    clearFocus();
    setView(0, 33, 31, 0, 0, 0);
  }

  function pickRoom(e) {
    if (!raycaster || !camera) return null;
    var rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    var hits = raycaster.intersectObjects(floorMeshes, false);
    return hits.length ? hits[0].object.userData.room : null;
  }

  function setupPicking() {
    raycaster = new THREE.Raycaster();
    mouseNDC = new THREE.Vector2();
    focusEl = document.getElementById('room-focus');
    focusName = document.getElementById('room-focus-name');
    var back = document.getElementById('room-focus-back');
    if (back) back.addEventListener('click', backToOverview);
    var el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) { downPos = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', function (e) {
      if (!downPos) return;
      var dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
      downPos = null;
      if (dx * dx + dy * dy > 36) return;        // foi arrasto (órbita), não clique
      var r = pickRoom(e);
      if (r) focusRoom(r);
    });
    el.addEventListener('pointermove', function (e) {
      var r = pickRoom(e);
      if (r !== hovered) {                        // realce sutil do ambiente sob o mouse
        if (hovered && hovered._floorMat) hovered._floorMat.emissive.setHex(0x000000);
        hovered = r;
        if (hovered && hovered._floorMat) hovered._floorMat.emissive.setHex(0x202018);
      }
      el.style.cursor = r ? 'pointer' : '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && focusEl && !focusEl.hidden) backToOverview();
    });
  }

  global.Scene3D = { init: init, onShow: onResize, setView: setView,
                     focusRoom: focusRoom, clearFocus: clearFocus };

})(window);
