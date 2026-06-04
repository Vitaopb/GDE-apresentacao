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
    // base/laje do prédio
    addBox(-W / 2 - 0.3, -H / 2 - 0.3, W + 0.6, H + 0.6, 0.3, mat(0xcdbfa3), -0.15, true);

    data.ROOMS.forEach(function (r) {
      if (r.decorative) { addFloor(r, 0xece2cf); return; }   // circulação
      var cat = data.CATEGORIES[r.category] || {};
      addFloor(r, new THREE.Color(cat.fill || '#ffffff').getHex());
      if (!r.open) addWalls(r);
    });

    addBuildingShell();
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

  function addWalls(r) {
    var m = getWallMat();
    addBox(r.x, r.y, r.w, WALL_T, WALL_H, m);                  // parede norte (topo)
    addBox(r.x, r.y + r.h - WALL_T, r.w, WALL_T, WALL_H, m);   // sul (base)
    addBox(r.x, r.y, WALL_T, r.h, WALL_H, m);                  // oeste (esq)
    addBox(r.x + r.w - WALL_T, r.y, WALL_T, r.h, WALL_H, m);   // leste (dir)
  }

  function addBuildingShell() {
    var m = mat(0xb7a888);
    var T = 0.25, h = WALL_H + 0.3;
    addBox(0, 0, W, T, h, m);            // topo
    addBox(0, H - T, W, T, h, m);        // base
    addBox(0, 0, T, H, h, m);            // esquerda
    addBox(W - T, 0, T, H, h, m);        // direita
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
