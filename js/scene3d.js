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
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef1f5);

    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 500);
    camera.position.set(0, 33, 31);

    scene.add(new THREE.AmbientLight(0xffffff, 0.82));
    var dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(-25, 55, 30);
    scene.add(dir);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 2.05;  // não passa do chão
    controls.minDistance = 12;
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
      if (r.decorative) { addFloor(r, 0xece2cf); return; }   // circulação
      var cat = data.CATEGORIES[r.category] || {};
      addFloor(r, new THREE.Color(cat.fill || '#ffffff').getHex());
      if (!r.open) addWalls(r);
      buildFurniture(r);
    });

    addBuildingShell();
  }

  /* --------------------------------------------------------------------------
   * Mobiliário 3D (peças simples a partir do campo furnish de cada ambiente)
   * ------------------------------------------------------------------------*/
  function fb(x, z, w, d, h, hex, y) { return addBox(x, z, w, d, h, mat(hex), y); }
  function bedColor(c) { return c === 'green' ? 0xbcd3aa : c === 'blue' ? 0xaecbe6 : 0xdfe7ee; }

  function placeBed(x, z, w, d, hex, headTop) {
    fb(x, z, w, d, 0.5, hex, 0.3);                                   // colchão
    var pw = w * 0.72, pd = Math.min(0.42, d * 0.26);
    var pz = headTop ? z + 0.07 : z + d - pd - 0.07;
    fb(x + (w - pw) / 2, pz, pw, pd, 0.16, 0xf2f6fb, 0.6);           // travesseiro
    var hz = headTop ? z - 0.02 : z + d - 0.08;
    fb(x - 0.04, hz, w + 0.08, 0.1, 0.95, 0xcdba9b, 0.475);          // cabeceira
  }

  function roundTable3D(px, pz, rad, chairHex) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.7, 20), mat(0xd8c19c));
    m.position.set(cx(px), 0.42, cz(pz)); scene.add(m);
    [[0, -rad - 0.32], [0, rad + 0.32], [-rad - 0.32, 0], [rad + 0.32, 0]].forEach(function (o) {
      fb(px + o[0] - 0.2, pz + o[1] - 0.2, 0.4, 0.4, 0.42, chairHex || 0xcdd5df, 0.2);
    });
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
      placeBed(r.x + r.w * 0.32 - bw1 / 2, r.y + 0.5, bw1, bl1, hex, true);
      if (f.iso) {
        var bx = r.x + r.w - 1.4;
        fb(bx, r.y + r.h - 0.85, 0.4, 0.5, 0.4, 0xffffff, 0.2);   // vaso
        fb(bx, r.y + 0.5, 0.5, 0.36, 0.85, 0xffffff, 0.42);       // pia
      }
      return;
    }
    var cols = Math.ceil(n / 2), slot = r.w / cols;
    var bw = Math.min(1.1, slot * 0.6), bl = Math.min(2.0, r.h * 0.3);
    for (i = 0; i < cols && placed < n; i++, placed++) {
      placeBed(r.x + i * slot + slot / 2 - bw / 2, r.y + 0.45, bw, bl, hex, true);
    }
    for (i = 0; i < cols && placed < n; i++, placed++) {
      placeBed(r.x + i * slot + slot / 2 - bw / 2, r.y + r.h - 0.45 - bl, bw, bl, hex, false);
    }
  }

  function fCribs(r, f) {
    var n = f.count, cols = (r.w >= r.h) ? 4 : 3, rows = Math.ceil(n / cols), k = 0, i, j;
    var cw = r.w / cols, ch = (r.h * 0.6) / rows;
    var bw = Math.min(1.2, cw * 0.62), bl = Math.min(1.4, ch * 0.72);
    for (j = 0; j < rows; j++) for (i = 0; i < cols && k < n; i++, k++) {
      fb(r.x + i * cw + (cw - bw) / 2, r.y + 0.4 + j * ch + (ch - bl) / 2, bw, bl, 0.55, 0xf2e6ef, 0.32);
    }
    fb(r.x + 0.5, r.y + r.h - 1.0, r.w - 1.0, 0.6, 0.85, 0xe7ddc9, 0.42);
  }

  function fStation(r) {
    fb(r.x + 0.3, r.y + 0.35, r.w - 0.6, 0.6, 0.95, 0xe7ddc9, 0.5);
    var n = Math.max(2, Math.floor((r.w - 0.6) / 1.0));
    for (var i = 0; i < n; i++) fb(r.x + 0.7 + i * 1.0 - 0.2, r.y + 1.5, 0.4, 0.4, 0.45, 0xcdd5df, 0.22);
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
  }
  function fBathroom(r, f) {
    var i;
    if (f.shower) {
      var sh = Math.min(1.0, r.w * 0.42, r.h * 0.42);
      fb(r.x + 0.15, r.y + 0.15, sh, sh, 0.05, 0xeef6fb, 0.05);
    }
    var sx = r.x + (f.shower ? Math.min(1.0, r.w * 0.42) + 0.45 : 0.45), step = 0.8;
    for (i = 0; i < (f.sink || 0); i++) {
      if (sx + 0.3 > r.x + r.w - 0.2) break;
      fb(sx - 0.25, r.y + 0.2, 0.5, 0.36, 0.85, 0xffffff, 0.42); sx += step;
    }
    var wx = r.x + 0.5, ws = 0.92;
    for (i = 0; i < (f.wc || 0); i++) {
      if (wx + 0.25 > r.x + r.w - 0.2) break;
      fb(wx - 0.2, r.y + r.h - 0.6, 0.4, 0.5, 0.4, 0xffffff, 0.2); wx += ws;
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
    scene.add(m);
  }

  function getWallMat() { if (!wallMat) wallMat = mat(0xeae1d0); return wallMat; }

  // x,z = canto (coords do plano); w = extensão em X; d = profundidade em Z; h = altura
  function addBox(x, z, w, d, h, material, y, absolute) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    if (absolute) m.position.set(x + w / 2, (y != null ? y : h / 2), z + d / 2);
    else m.position.set(cx(x + w / 2), (y != null ? y : h / 2), cz(z + d / 2));
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

  function mat(hex) { return new THREE.MeshLambertMaterial({ color: hex }); }

  /* --------------------------------------------------------------------------
   * Loop / resize
   * ------------------------------------------------------------------------*/
  function animate() {
    requestAnimationFrame(animate);
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

  global.Scene3D = { init: init, onShow: onResize };

})(window);
