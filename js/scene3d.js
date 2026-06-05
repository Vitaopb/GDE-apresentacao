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
    internacao: 0xbcd0e6, enfermagem: 0xbcd0e6, apoio: 0xb6dac9,
    isolamento: 0xeec3c3, lazer: 0xefdca6, sanitario: 0xceb6ea,
    cuidados: 0xe7b8d4, recepcao: 0xd8c8a6, circulacao: 0xd8c8a6
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
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd6dee8);

    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 500);
    camera.position.set(0, 33, 31);

    // luz ambiente suave (céu/chão) + luz principal com sombra + preenchimento
    scene.add(new THREE.HemisphereLight(0xeaf0f6, 0x9c8f72, 0.42));
    var key = new THREE.DirectionalLight(0xfff0d6, 1.0);
    key.position.set(-26, 44, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera;
    sc.left = -36; sc.right = 36; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
    key.shadow.bias = -0.0004;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xd6e2f0, 0.32);
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
    animate();
    window.addEventListener('resize', onResize);
  }

  /* --------------------------------------------------------------------------
   * Construção do modelo
   * ------------------------------------------------------------------------*/
  function buildModel(data) {
    collectOpenings(data);   // vãos de porta antes de erguer as paredes

    // base/laje do prédio
    addBox(-W / 2 - 0.3, -H / 2 - 0.3, W + 0.6, H + 0.6, 0.3, mat(0xcdbfa3), -0.15, true);

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
  function fb(x, z, w, d, h, hex, y) { return addBox(x, z, w, d, h, mat(hex), y); }
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
  function limb(ax, ay, az, bx, by, bz, rad, hex) {
    var a = new THREE.Vector3(cx(ax), ay, cz(az));
    var b = new THREE.Vector3(cx(bx), by, cz(bz));
    var dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 12), mat(hex));
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
  // tábua (caixa fina) com centro em px,pz e inclinação em torno do eixo X
  function plank(px, pz, w, d, h, hex, y, rotX) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex));
    m.position.set(cx(px), y, cz(pz));
    if (rotX) m.rotation.x = rotX;
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }

  // enfermeira sentada, torneada (cilindros/esferas) — de frente p/ o norte (z menor)
  function nurse3D(px, pz) {
    var scrub = 0x3f93a8, scrub2 = 0x32788b, skin = 0xe8b58c, hair = 0x4a3526,
        mask = 0xeef3f7, board = 0xcdb98f, shoe = 0x4a4a4a;
    sphere(px, pz, 0.16, scrub, 0.52);                                   // quadril
    // coxas (p/ frente) + canelas (p/ baixo) + sapatos
    limb(px - 0.1, 0.5, pz, px - 0.1, 0.46, pz - 0.46, 0.085, scrub);
    limb(px + 0.1, 0.5, pz, px + 0.1, 0.46, pz - 0.46, 0.085, scrub);
    limb(px - 0.1, 0.46, pz - 0.46, px - 0.1, 0.08, pz - 0.5, 0.07, scrub2);
    limb(px + 0.1, 0.46, pz - 0.46, px + 0.1, 0.08, pz - 0.5, 0.07, scrub2);
    sphere(px - 0.1, pz - 0.52, 0.075, shoe, 0.06);
    sphere(px + 0.1, pz - 0.52, 0.075, shoe, 0.06);
    // tronco (cintura -> ombros), busto sutil, ombros estreitos
    limb(px, 0.55, pz + 0.02, px, 1.04, pz - 0.04, 0.135, scrub);
    sphere(px, pz - 0.11, 0.07, scrub, 0.85);
    limb(px - 0.16, 1.03, pz - 0.02, px + 0.16, 1.03, pz - 0.02, 0.065, scrub);
    // pescoço + cabeça
    cyl(px, pz - 0.02, 0.043, 0.1, skin, 1.14);
    sphere(px, pz - 0.04, 0.125, skin, 1.29);
    // cabelo (calota) + rabo de cavalo
    sphere(px, pz + 0.04, 0.14, hair, 1.33);
    limb(px, 1.33, pz + 0.12, px, 0.97, pz + 0.17, 0.05, hair);
    // máscara cirúrgica (concha sobre nariz/boca) + alças até as orelhas
    blob(px, pz - 0.12, 0.105, mask, 1.235, 1.0, 0.95, 0.6);
    limb(px - 0.09, 1.275, pz - 0.07, px - 0.12, 1.31, pz + 0.04, 0.012, mask);
    limb(px + 0.09, 1.275, pz - 0.07, px + 0.12, 1.31, pz + 0.04, 0.012, mask);
    // braços (ombro -> cotovelo -> mãos) segurando a prancheta
    limb(px - 0.16, 1.0, pz - 0.02, px - 0.18, 0.84, pz - 0.24, 0.05, scrub);
    limb(px - 0.18, 0.84, pz - 0.24, px - 0.06, 0.82, pz - 0.42, 0.045, skin);
    limb(px + 0.16, 1.0, pz - 0.02, px + 0.18, 0.84, pz - 0.24, 0.05, scrub);
    limb(px + 0.18, 0.84, pz - 0.24, px + 0.06, 0.82, pz - 0.42, 0.045, skin);
    // prancheta inclinada, com a FACE (papel + presilha) voltada p/ a enfermeira
    plank(px, pz - 0.36, 0.3, 0.34, 0.03, board, 0.9, 0.7);          // tábua
    plank(px, pz - 0.345, 0.25, 0.28, 0.012, 0xfdfdfd, 0.918, 0.7);  // papel (face p/ ela)
    plank(px, pz - 0.47, 0.13, 0.05, 0.03, 0x8a8f96, 0.955, 0.7);    // presilha no topo
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
      var bxc = r.x + r.w * 0.3;
      placeBed(bxc - bw1 / 2, r.y + 0.5, bw1, bl1, hex, true);
      if (f.iso) {
        var bx = r.x + r.w - 1.7;
        fb(bx - 0.05, r.y + 0.25, 0.06, r.h - 0.5, 1.7, 0xe9e9ee, 0.85);   // parede do WC
        fb(bx + 0.15, r.y + 0.35, 0.85, 0.45, 0.82, 0xeef1f4, 0.41);       // bancada
        sinkBasin(bx + 0.6, r.y + 0.57);
        toilet3D(bx + 0.6, r.y + r.h - 0.6);
      }
      return;
    }
    var cols = Math.ceil(n / 2), slot = r.w / cols;
    var bw = Math.min(1.1, slot * 0.6), bl = Math.min(2.0, r.h * 0.3);
    for (i = 0; i < cols && placed < n; i++, placed++) {
      var ct = r.x + i * slot + slot / 2;
      placeBed(ct - bw / 2, r.y + 0.45, bw, bl, hex, true);
      if (f.chairs) poltrona(ct, r.y + 0.45 + bl + 0.5, true);       // poltrona ao pé, olhando p/ a cama (norte)
    }
    for (i = 0; i < cols && placed < n; i++, placed++) {
      var cb = r.x + i * slot + slot / 2;
      placeBed(cb - bw / 2, r.y + r.h - 0.45 - bl, bw, bl, hex, false);
      if (f.chairs) poltrona(cb, r.y + r.h - 0.45 - bl - 0.5, false); // olhando p/ a cama (sul)
    }
  }

  function fCribs(r, f) {
    var n = f.count, cols = (r.w >= r.h) ? 4 : 3, rows = Math.ceil(n / cols), k = 0, i, j;
    var cw = r.w / cols, ch = (r.h * 0.6) / rows;
    var bw = Math.min(1.15, cw * 0.6), bl = Math.min(1.35, ch * 0.7);
    for (j = 0; j < rows; j++) for (i = 0; i < cols && k < n; i++, k++) {
      crib3D(r.x + i * cw + (cw - bw) / 2, r.y + 0.4 + j * ch + (ch - bl) / 2, bw, bl);
    }
    fb(r.x + 0.5, r.y + r.h - 1.0, r.w - 1.0, 0.6, 0.85, 0xe7ddc9, 0.42);
  }

  function fStation(r) {
    var i;
    // balcão de atendimento (corpo + tampo) na frente (norte)
    fb(r.x + 0.3, r.y + 0.35, r.w - 0.6, 0.6, 0.95, 0xe7ddc9, 0.5);
    fb(r.x + 0.25, r.y + 0.3, r.w - 0.5, 0.72, 0.06, 0xc9b288, 1.0);    // tampo
    // monitores + teclados sobre o tampo (tela voltada p/ a equipe, ao sul)
    var nM = Math.max(1, Math.round((r.w - 1.0) / 1.9));
    for (i = 0; i < nM; i++) {
      var mx = r.x + 0.9 + (i + 0.5) * (r.w - 1.8) / nM;
      fb(mx - 0.28, r.y + 0.62, 0.56, 0.06, 0.34, 0x2d3a47, 1.22);      // monitor
      fb(mx - 0.05, r.y + 0.58, 0.1, 0.08, 0.16, 0x6b7785, 1.06);       // pé
      fb(mx - 0.22, r.y + 0.74, 0.44, 0.18, 0.03, 0xd7dde4, 1.04);      // teclado
    }
    // pastas/papéis no tampo (na ponta leste, longe da enfermeira)
    fb(r.x + r.w - 1.15, r.y + 0.42, 0.24, 0.3, 0.2, 0xe06b6b, 1.1);
    fb(r.x + r.w - 0.85, r.y + 0.42, 0.2, 0.3, 0.24, 0x6b8cef, 1.12);
    // armário de apoio ao fundo (sul)
    fb(r.x + 0.5, r.y + r.h - 0.7, r.w - 1.0, 0.45, 1.2, 0xefe6d4, 0.6);
    // cadeiras giratórias (assento + encosto) atrás do balcão
    var nC = Math.max(2, Math.floor((r.w - 0.8) / 1.4));
    for (i = 0; i < nC; i++) {
      var cxp = r.x + 0.9 + i * 1.4;
      if (i === 0) continue;                                            // 1ª cadeira fica p/ a enfermeira
      fb(cxp - 0.21, r.y + 1.3, 0.42, 0.42, 0.46, 0x6b88a6, 0.24);      // assento
      fb(cxp - 0.21, r.y + 1.62, 0.42, 0.1, 0.52, 0x5d7793, 0.52);      // encosto
    }
    // enfermeira sentada na 1ª cadeira (livre dos monitores)
    nurse3D(r.x + 0.9, r.y + 1.5);
  }
  function fUtility(r) {
    fb(r.x + 0.25, r.y + 0.3, r.w - 0.5, 0.55, 0.9, 0xe7ddc9, 0.48);
    fb(r.x + 0.3, r.y + r.h - 0.85, r.w - 0.6, 0.5, 0.75, 0xeef1f5, 0.4);
  }
  function fCare(r) {
    fb(r.x + r.w * 0.42 - 0.4, r.y + r.h / 2 - 0.95, 0.8, 1.9, 0.7, 0xf3f5f8, 0.4);
    fb(r.x + 0.25, r.y + 0.25, r.w - 0.5, 0.45, 0.9, 0xe7ddc9, 0.48);
  }
  function fDesk(r) {
    fb(r.x + 0.4, r.y + 0.5, r.w - 0.8, 0.7, 0.75, 0xd8c19c, 0.42);
    fb(r.x + r.w / 2 - 0.2, r.y + 1.5, 0.4, 0.4, 0.45, 0xcdd5df, 0.22);
  }
  function fChanging(r) {
    fb(r.x + 0.3, r.y + 0.4, r.w - 0.6, 0.9, 0.9, 0xe7ddc9, 0.5);
    fb(r.x + r.w - 0.65, r.y + r.h - 0.7, 0.5, 0.36, 0.85, 0xffffff, 0.42);
  }
  function fClassroom(r, f) {
    fb(r.x + r.w / 2 - 0.8, r.y + 0.5, 1.6, 0.7, 0.75, 0xd8c19c, 0.42);
    var max = (f && f.count) ? f.count : 99, gx = 1.3, gy = 1.4, startY = r.y + 1.9, placed = 0;
    var cols = Math.max(1, Math.floor((r.w - 0.8) / gx));
    var rows = Math.floor((r.y + r.h - 0.5 - startY) / gy);
    for (var rr = 0; rr < rows && placed < max; rr++) for (var c = 0; c < cols && placed < max; c++, placed++) {
      var dx = r.x + 0.7 + c * gx, dy = startY + rr * gy;
      fb(dx, dy, 0.9, 0.5, 0.7, 0xd8c19c, 0.4);
      fb(dx + 0.25, dy + 0.85, 0.4, 0.4, 0.45, 0xcdd5df, 0.22);
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
      fb(ox + i * cw + 0.05, oz + j * ch + 0.05, cw - 0.1, ch - 0.1, 0.04, colors[k % 4], 0.06);
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
      fb(r.x + 0.15, r.y + 0.15, shw, shw, 0.05, 0xdce8f1, 0.04);
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
  }
  function fAnteroom(r) {
    fb(r.x + r.w / 2 - 0.25, r.y + 0.45, 0.5, 0.36, 0.85, 0xffffff, 0.42);
    fb(r.x + 0.15, r.y + r.h - 1.0, r.w - 0.3, 0.5, 0.6, 0xeef1f5, 0.3);
  }

  function addFloor(r, colorHex) {
    var m = new THREE.Mesh(
      new THREE.BoxGeometry(r.w, 0.08, r.h),
      mat(colorHex)
    );
    m.position.set(cx(r.x + r.w / 2), 0.04, cz(r.y + r.h / 2));
    m.receiveShadow = true;
    scene.add(m);
  }

  function getWallMat() { if (!wallMat) wallMat = mat(0xe3d7bd); return wallMat; }

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
  }

  function addWalls(r) {
    var m = getWallMat();
    wallH(r.y, r.x, r.x + r.w, WALL_H, m);            // norte (topo)
    wallH(r.y + r.h, r.x, r.x + r.w, WALL_H, m);      // sul (base)
    wallV(r.x, r.y, r.y + r.h, WALL_H, m);            // oeste (esq)
    wallV(r.x + r.w, r.y, r.y + r.h, WALL_H, m);      // leste (dir)
  }

  function addBuildingShell() {
    var m = mat(0xb7a888), T = 0.25, h = WALL_H + 0.3;
    wallH(0, 0, W, h, m, T);     // topo
    wallH(H, 0, W, h, m, T);     // base (tem a entrada principal)
    wallV(0, 0, H, h, m, T);     // esquerda
    wallV(W, 0, H, h, m, T);     // direita
  }

  function mat(hex) { return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0.02 }); }

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

  global.Scene3D = { init: init, onShow: onResize, setView: setView };

})(window);
