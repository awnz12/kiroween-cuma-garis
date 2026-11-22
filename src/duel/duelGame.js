/**
 * CUMA GARIS. — Episode Interaktif
 * duel/duelGame.js — Mini-game duel Three.js (Tugas 3.1 + 3.2 + 3.3)
 *
 * - Three.js dimuat MALAS (dynamic import) hanya saat duel akan dimulai.
 * - Fallback ke duelFallback bila WebGL tidak tersedia ATAU import gagal.
 * - Semua teks aksi dari episode.json (parameter `controls`), bukan hardcode.
 * - Timer 45 dtk + HP kedua pihak ditampilkan selama duel aktif.
 * - Input: tombol sentuh (≥ 48 px) + keyboard (Spasi / S / K).
 * - Telegraph musuh: cakar naik + bayangan membesar ≥ 600 ms (Req 3.3).
 * - Cleanup bersih: rAF dibatalkan, renderer/geometri/material di-dispose,
 *   canvas dan event listener dilepas sebelum state machine menerima hasil.
 */

import { computeOutcome }                    from './duelResult.js';
import { startFallback, pauseFallback, resumeFallback } from './duelFallback.js';

// ---- Konstanta seimbang ------------------------------------
// Duel selesai wajar dalam 20–45 detik pada permainan rata-rata.

const HP_RAKA_AWAL      = 100;
const HP_MUSUH_AWAL     = 100;
const DAMAGE_AYUN       = 15;   // Ayun Pedang — serangan biasa
const DAMAGE_KAIT       = 30;   // Tenun Kait — serangan kuat
const KAIT_COOLDOWN_MS  = 4000; // 4 dtk cooldown setelah Tenun Kait
const DAMAGE_CAKAR      = 18;   // serangan balik Coretan Liar
const PERISAI_REDUKSI   = 0.4;  // Perisai Garis: kurangi 40% damage musuh
const TELEGRAPH_MS      = 700;  // ≥ 600 ms (Req 3.3)
const MUSUH_INTERVAL_MS = 2800; // musuh menyerang setiap ~2.8 dtk
const DUEL_TIMER_SEC    = 45;
const THREE_CDN         = 'https://unpkg.com/three@0.169.0/build/three.module.js';

// ---- State modul -------------------------------------------

let _sm           = null;
let _onDone       = null;
let _controls     = [];
let _container    = null;

let _THREE        = null;   // modul Three.js (dimuat malas)
let _renderer     = null;
let _scene3       = null;
let _camera       = null;
let _rafId        = null;
let _canvasEl     = null;
let _uiEl         = null;   // DOM overlay HP + timer + tombol aksi

// State duel
let _hpRaka       = HP_RAKA_AWAL;
let _hpMusuh      = HP_MUSUH_AWAL;
let _timerSec     = DUEL_TIMER_SEC;
let _paused       = false;
let _ended        = false;
let _kaitReady    = true;
let _perisaiAktif = false;

// Timer handles
let _countdownId  = null;
let _musuhTimer   = null;
let _kaitCdTimer  = null;
let _telegraphId  = null;

// Keyboard
let _keyHandler   = null;

// Three.js objek scene
let _rakaGroup    = null;
let _musuhGroup   = null;
let _shadowMesh   = null;   // bayangan cakar telegraph
let _clawMesh     = null;   // cakar Coretan Liar

// Three.js materials/geometries untuk dispose
let _disposables  = [];

// DOM refs
let _elHpRaka     = null;
let _elHpMusuh    = null;
let _elTimer      = null;
let _elBtnAyun    = null;
let _elBtnPerisai = null;
let _elBtnKait    = null;
let _elBtnSkip    = null;

// ============================================================
// API Publik
// ============================================================

/**
 * Mulai duel Three.js.
 *
 * @param {object} opts
 * @param {string[]}    opts.controls     - label 3 aksi dari episode.json
 * @param {object}      opts.stateMachine - instance SM
 * @param {Function}    opts.onDone       - dipanggil dengan (outcome, stats) setelah selesai;
 *                                          stats = { hpRaka, hpMusuh, durationSec } (Fase 4)
 * @param {HTMLElement} opts.container    - elemen induk (mis. .stage)
 */
export async function startDuelGame({ controls, stateMachine, onDone, container }) {
  _controls  = controls;
  _sm        = stateMachine;
  _onDone    = onDone;
  _container = container;

  // Reset state
  _hpRaka       = HP_RAKA_AWAL;
  _hpMusuh      = HP_MUSUH_AWAL;
  _timerSec     = DUEL_TIMER_SEC;
  _paused       = false;
  _ended        = false;
  _kaitReady    = true;
  _perisaiAktif = false;

  // Periksa WebGL
  if (!_webglAvailable()) {
    console.warn('[duelGame] WebGL tidak tersedia — beralih ke fallback.');
    _startFallbackMode();
    return;
  }

  // Muat Three.js secara malas
  try {
    _THREE = await import(/* webpackIgnore: true */ THREE_CDN);
  } catch (err) {
    console.warn('[duelGame] Gagal memuat Three.js:', err, '— beralih ke fallback.');
    _startFallbackMode();
    return;
  }

  // Bangun scene Three.js + UI DOM
  _buildThreeScene();
  _buildUI();
  _startLoop();
  _startCountdown();
  _scheduleMusuhAttack();
  _attachKeyboard();

  console.debug('[duelGame] Duel Three.js dimulai.');
}

/** Jeda duel (dipanggil state machine PAUSED). */
export function pauseDuelGame() {
  if (_ended) return;
  if (_paused) return;
  _paused = true;

  // Jika fallback mode
  if (!_THREE) { pauseFallback(); return; }

  _stopLoop();
  _clearTimers();
  _showPauseOverlay(true);
  console.debug('[duelGame] Duel di-pause.');
}

/** Lanjut dari jeda. */
export function resumeDuelGame() {
  if (_ended) return;
  if (!_paused) return;
  _paused = false;

  if (!_THREE) { resumeFallback(); return; }

  _showPauseOverlay(false);
  _startLoop();
  _startCountdown();
  _scheduleMusuhAttack();
  console.debug('[duelGame] Duel dilanjutkan.');
}

// ============================================================
// Deteksi WebGL
// ============================================================

function _webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// ============================================================
// Fallback delegate
// ============================================================

function _startFallbackMode() {
  startFallback({
    controls:     _controls,
    stateMachine: _sm,
    onDone:       _onDone,
    container:    _container,
  });
}

// ============================================================
// Membangun scene Three.js (Tugas 3.1)
// ============================================================

function _buildThreeScene() {
  const { THREE } = _ns();
  const W = _container.clientWidth  || 360;
  const H = _container.clientHeight || 640;

  // ---- Renderer -------------------------------------------
  _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  _renderer.setSize(W, H);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  _canvasEl = _renderer.domElement;
  _canvasEl.style.cssText = `
    position:absolute; inset:0; z-index:40;
    width:100%; height:100%;
    display:block;
  `;
  _container.appendChild(_canvasEl);

  // ---- Camera (perspektif vertikal) -----------------------
  _camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
  _camera.position.set(0, 2.5, 7);
  _camera.lookAt(0, 1.5, 0);

  // ---- Scene ----------------------------------------------
  _scene3 = new THREE.Scene();
  _scene3.background = new THREE.Color(0x0a0a0f);
  _scene3.fog        = new THREE.FogExp2(0x0a0a0f, 0.07);

  // ---- Pencahayaan ----------------------------------------
  const ambient = new THREE.AmbientLight(0x1a1a2e, 1.4);
  _scene3.add(ambient);

  const spotRed = new THREE.SpotLight(0xe74c3c, 2.5, 20, Math.PI / 5, 0.5);
  spotRed.position.set(-3, 8, 4);
  spotRed.castShadow = true;
  _scene3.add(spotRed);

  const spotBlue = new THREE.SpotLight(0x2c3e50, 1.5, 20, Math.PI / 5, 0.5);
  spotBlue.position.set(3, 6, 4);
  _scene3.add(spotBlue);

  _track(ambient, spotRed, spotBlue);

  // ---- Lantai arena pasar ---------------------------------
  const floorGeo = new THREE.PlaneGeometry(14, 14);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  _scene3.add(floor);
  _track(floorGeo, floorMat);

  // Grid garis di lantai (kesan bata kasar)
  const gridHelper = new THREE.GridHelper(14, 20, 0x2a1f0d, 0x2a1f0d);
  gridHelper.position.y = 0.01;
  _scene3.add(gridHelper);

  // Dinding latar (atmosfer pasar)
  const wallGeo = new THREE.PlaneGeometry(14, 6);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x12100a, side: THREE.FrontSide });
  const wall    = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 3, -5);
  _scene3.add(wall);
  _track(wallGeo, wallMat);

  // ---- Raka: figur primitif garis merah-hitam (Tugas 3.1) -
  _rakaGroup = _buildRaka(THREE);
  _rakaGroup.position.set(-2, 0, 0);
  _scene3.add(_rakaGroup);

  // ---- Coretan Liar: gumpalan sphere hitam berdenyut + cakar (Tugas 3.1)
  _musuhGroup = _buildMusuh(THREE);
  _musuhGroup.position.set(2, 0, 0);
  _scene3.add(_musuhGroup);

  // ---- Bayangan cakar (telegraph) -------------------------
  const shadowGeo = new THREE.CircleGeometry(0.6, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0xe74c3c, transparent: true, opacity: 0, depthWrite: false,
  });
  _shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  _shadowMesh.rotation.x = -Math.PI / 2;
  _shadowMesh.position.set(-2, 0.02, 0);
  _scene3.add(_shadowMesh);
  _track(shadowGeo, shadowMat);

  // Handle resize
  const resizeObs = new ResizeObserver(() => _onResize());
  resizeObs.observe(_container);
  _container.__resizeObs = resizeObs;
}

// ---- Raka figur garis -------------------------------------

function _buildRaka(THREE) {
  const group = new THREE.Group();
  const matRed = new THREE.LineBasicMaterial({ color: 0xe74c3c, linewidth: 2 });
  const matDark = new THREE.LineBasicMaterial({ color: 0xc0392b, linewidth: 2 });
  _track(matRed, matDark);

  function line(ax, ay, az, bx, by, bz, mat) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ax, ay, az),
      new THREE.Vector3(bx, by, bz),
    ]);
    const mesh = new THREE.Line(geo, mat);
    _track(geo);
    return mesh;
  }

  // Kepala (lingkaran kecil = sphere gepeng)
  const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 2.0, 0);
  group.add(head);
  _track(headGeo, headMat);

  // Tubuh
  group.add(line(0, 1.85, 0,  0, 0.8, 0,  matRed));
  // Lengan kiri
  group.add(line(0, 1.6, 0,   -0.5, 1.2, 0,  matRed));
  // Lengan kanan (memegang pedang)
  group.add(line(0, 1.6, 0,   0.5, 1.4, 0,   matRed));
  // Bilah pedang menyala
  group.add(line(0.5, 1.4, 0,  1.0, 1.9, 0,  matRed));

  // Cahaya pedang kecil
  const swordLight = new THREE.PointLight(0xe74c3c, 1.5, 2.5);
  swordLight.position.set(0.9, 1.9, 0.1);
  group.add(swordLight);
  _track(swordLight);

  // Kaki
  group.add(line(0, 0.8, 0,   -0.35, 0, 0,  matDark));
  group.add(line(0, 0.8, 0,    0.35, 0, 0,  matDark));

  // Syal (garis pendek di leher)
  const syalGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.04, 1.8, 0),
    new THREE.Vector3(-0.3, 1.5, 0),
    new THREE.Vector3(-0.5, 1.3, 0),
  ]);
  const syalMat = new THREE.LineBasicMaterial({ color: 0xe74c3c, linewidth: 3 });
  group.add(new THREE.Line(syalGeo, syalMat));
  _track(syalGeo, syalMat);

  return group;
}

// ---- Coretan Liar -----------------------------------------

function _buildMusuh(THREE) {
  const group = new THREE.Group();

  // Gumpalan utama (sphere hitam)
  const bodyGeo = new THREE.SphereGeometry(0.6, 10, 10);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0d0d1a });
  const body    = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.9, 0);
  body.castShadow = true;
  group.add(body);
  _track(bodyGeo, bodyMat);

  // Gumpalan sekunder (3 sphere lebih kecil)
  const blobDefs = [
    { r: 0.38, x: 0.5,  y: 0.75, z: 0.1,  c: 0x12121a },
    { r: 0.30, x: -0.4, y: 1.1,  z: 0.0,  c: 0x0a0a0f },
    { r: 0.25, x: 0.1,  y: 1.5,  z: 0.0,  c: 0x0d0d1a },
  ];
  blobDefs.forEach(({ r, x, y, z, c }) => {
    const g = new THREE.SphereGeometry(r, 8, 8);
    const m = new THREE.MeshLambertMaterial({ color: c });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    _track(g, m);
  });

  // Mata merah (2 sphere kecil menyala)
  const eyeDefs = [{ x: -0.2, y: 1.05 }, { x: 0.2, y: 1.05 }];
  eyeDefs.forEach(({ x, y }) => {
    const g = new THREE.SphereGeometry(0.07, 6, 6);
    const m = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, 0.52);
    group.add(mesh);
    _track(g, m);
  });

  // Cahaya mata
  const eyeLight = new THREE.PointLight(0xe74c3c, 1.0, 1.8);
  eyeLight.position.set(0, 1.05, 0.6);
  group.add(eyeLight);

  // Cakar raksasa (2 silinder bengkok = cone lancip)
  _clawMesh = _buildClaw(THREE);
  _clawMesh.position.set(0, 1.6, 0);
  group.add(_clawMesh);

  return group;
}

function _buildClaw(THREE) {
  const group = new THREE.Group();
  const matClaw = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
  _track(matClaw);

  const clawDefs = [
    { x: -0.45, rot:  0.5 },
    { x:  0.0,  rot:  0.0 },
    { x:  0.45, rot: -0.5 },
  ];
  clawDefs.forEach(({ x, rot }) => {
    const g = new THREE.ConeGeometry(0.07, 0.6, 5);
    const mesh = new THREE.Mesh(g, matClaw);
    mesh.position.set(x, 0, 0);
    mesh.rotation.z = rot;
    group.add(mesh);
    _track(g);
  });

  return group;
}

// ============================================================
// Loop render (Tugas 3.1 — animasi scene)
// ============================================================

function _startLoop() {
  if (_rafId !== null) return;
  let t = 0;
  const loop = () => {
    _rafId = requestAnimationFrame(loop);
    if (_paused || _ended) return;
    t += 0.025;
    _animateRaka(t);
    _animateMusuh(t);
    _animateTelegraphShadow(t);
    _renderer.render(_scene3, _camera);
  };
  _rafId = requestAnimationFrame(loop);
}

function _stopLoop() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}

// ---- Animasi Raka ------------------------------------------

function _animateRaka(t) {
  if (!_rakaGroup) return;
  // Napas: sedikit naik-turun
  _rakaGroup.position.y = Math.sin(t * 1.4) * 0.03;
  // Pedang berdenyut: sedikit memutar
  _rakaGroup.rotation.z = Math.sin(t * 2.0) * 0.02;
}

// ---- Animasi Coretan Liar -----------------------------------

function _animateMusuh(t) {
  if (!_musuhGroup) return;
  // Denyutan: scale naik-turun
  const pulse = 1 + Math.sin(t * 2.2) * 0.05;
  _musuhGroup.scale.setScalar(pulse);
  // Hover: sedikit melayang
  _musuhGroup.position.y = Math.sin(t * 1.1) * 0.08;
}

function _animateTelegraphShadow(t) {
  if (!_shadowMesh) return;
  if (_shadowMesh.material.opacity > 0) {
    // Bayangan berdenyut
    const sc = 1 + Math.sin(t * 6) * 0.15;
    _shadowMesh.scale.setScalar(sc);
  }
}

// ============================================================
// UI DOM: HP + timer + tombol aksi (Tugas 3.2 + 3.3)
// ============================================================

function _buildUI() {
  _uiEl = document.createElement('div');
  _uiEl.id = 'duel-ui';
  _uiEl.setAttribute('role', 'region');
  _uiEl.setAttribute('aria-label', 'UI Duel');
  _uiEl.style.cssText = `
    position:absolute; inset:0; z-index:41;
    pointer-events:none;
    display:flex; flex-direction:column;
  `;

  _uiEl.innerHTML = `
    <!-- Header: HP + Timer -->
    <div id="dg-header" style="
      pointer-events:none;
      display:flex; justify-content:space-between; align-items:center;
      padding:0.6rem 0.8rem 0.3rem;
      background:linear-gradient(180deg,rgba(0,0,0,0.75) 0%,transparent 100%);
    ">
      <!-- HP Raka -->
      <div style="min-width:38%; display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:0.6rem;text-transform:uppercase;letter-spacing:.06em;
          color:#c0392b;font-weight:800;">Raka</span>
        <div style="width:100%;height:8px;background:rgba(255,255,255,.12);border-radius:4px;overflow:hidden;">
          <div id="dg-hp-raka-fill" style="height:100%;width:100%;
            background:linear-gradient(90deg,#e74c3c,#c0392b);transition:width .2s;"></div>
        </div>
        <span id="dg-hp-raka-num" style="font-size:0.7rem;font-weight:700;color:#f0f0f5;">
          ${HP_RAKA_AWAL}/${HP_RAKA_AWAL}
        </span>
      </div>

      <!-- Timer -->
      <div id="dg-timer" style="
        font-size:clamp(1rem,5cqw,1.3rem);font-weight:900;
        color:#f0f0f5;text-align:center;min-width:3ch;
        text-shadow:0 0 8px rgba(0,0,0,.8);
      ">${DUEL_TIMER_SEC}</div>

      <!-- HP Musuh -->
      <div style="min-width:38%;display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
        <span style="font-size:0.6rem;text-transform:uppercase;letter-spacing:.06em;
          color:#7f8c8d;font-weight:800;">Coretan Liar</span>
        <div style="width:100%;height:8px;background:rgba(255,255,255,.12);border-radius:4px;overflow:hidden;">
          <div id="dg-hp-musuh-fill" style="height:100%;width:100%;
            background:linear-gradient(90deg,#2c3e50,#7f8c8d);transition:width .2s;"></div>
        </div>
        <span id="dg-hp-musuh-num" style="font-size:0.7rem;font-weight:700;color:#f0f0f5;">
          ${HP_MUSUH_AWAL}/${HP_MUSUH_AWAL}
        </span>
      </div>
    </div>

    <!-- Spacer (area Three.js canvas di bawah header) -->
    <div style="flex:1;"></div>

    <!-- Overlay telegraph DOM (muncul saat musuh akan menyerang) -->
    <div id="dg-telegraph" style="
      position:absolute; bottom:148px; left:0; right:0;
      pointer-events:none;
      display:none; flex-direction:column; align-items:center;
      gap:4px; padding:0.4rem;
    ">
      <div style="
        background:rgba(231,76,60,0.18); border:1px solid rgba(231,76,60,0.6);
        border-radius:6px; padding:0.3rem 0.8rem;
        font-size:0.75rem; font-weight:800; color:#e74c3c; letter-spacing:.04em;
      ">⚠ CAKAR TURUN!</div>
      <div id="dg-telegraph-bar" style="
        width:80%; height:5px; background:rgba(231,76,60,0.2); border-radius:3px; overflow:hidden;
      ">
        <div id="dg-telegraph-fill" style="
          height:100%; width:0%;
          background:linear-gradient(90deg,#c0392b,#e74c3c);
          transition:width linear;
        "></div>
      </div>
    </div>

    <!-- Overlay flash saat aksi -->
    <div id="dg-flash" style="
      display:none; position:absolute; inset:0;
      pointer-events:none; z-index:42;
    "></div>

    <!-- Overlay jeda -->
    <div id="dg-pause" style="
      display:none; position:absolute; inset:0;
      background:rgba(0,0,0,0.8);
      align-items:center; justify-content:center;
      font-size:1.5rem; font-weight:900; letter-spacing:.12em; color:#f0f0f5;
      pointer-events:none;
    ">JEDA</div>

    <!-- Tombol lewati duel (Fase 6-prep, sesuai naskah) — pointer-events on -->
    <div id="dg-skipbar" style="
      pointer-events:all;
      display:flex; justify-content:center;
      padding:0.45rem 0.65rem 0;
    ">
      <button id="dg-btn-skip" type="button" class="ctrl-btn" style="
        min-height:48px; min-width:60%;
        font-size:clamp(0.7rem,3.5cqw,0.85rem); font-weight:700;
        background:rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,.25);
        color:#f0f0f5; border-radius:8px; cursor:pointer;
      ">⏭ Lewati Duel</button>
    </div>

    <!-- Tombol aksi (sentuh + keyboard) — pointer-events on -->
    <div id="dg-actions" style="
      pointer-events:all;
      display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem;
      padding:0.6rem 0.65rem calc(0.6rem + env(safe-area-inset-bottom, 0px));
      background:linear-gradient(0deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.6) 100%);
      border-top:1px solid rgba(255,255,255,.07);
    ">
      <button id="dg-btn-0" type="button" class="ctrl-btn dg-action-btn" style="
        min-height:52px; font-size:clamp(0.65rem,3.5cqw,0.82rem);
        font-weight:700; display:flex; flex-direction:column; align-items:center; gap:2px;
      ">
        <span>⚔️</span><span id="dg-lbl-0"></span>
        <span style="font-size:0.6rem;opacity:0.55;">[Spasi]</span>
      </button>
      <button id="dg-btn-1" type="button" class="ctrl-btn dg-action-btn" style="
        min-height:52px; font-size:clamp(0.65rem,3.5cqw,0.82rem);
        font-weight:700; display:flex; flex-direction:column; align-items:center; gap:2px;
      ">
        <span>🛡️</span><span id="dg-lbl-1"></span>
        <span style="font-size:0.6rem;opacity:0.55;">[S]</span>
      </button>
      <button id="dg-btn-2" type="button" class="ctrl-btn dg-action-btn" style="
        min-height:52px; font-size:clamp(0.65rem,3.5cqw,0.82rem);
        font-weight:700; display:flex; flex-direction:column; align-items:center; gap:2px;
      ">
        <span>🌀</span><span id="dg-lbl-2"></span>
        <span style="font-size:0.6rem;opacity:0.55;">[K]</span>
      </button>
    </div>
  `;

  _container.appendChild(_uiEl);

  // Cache elemen
  _elHpRaka    = _uiEl.querySelector('#dg-hp-raka-num');
  _elHpMusuh   = _uiEl.querySelector('#dg-hp-musuh-num');
  _elTimer     = _uiEl.querySelector('#dg-timer');
  _elBtnAyun   = _uiEl.querySelector('#dg-btn-0');
  _elBtnPerisai = _uiEl.querySelector('#dg-btn-1');
  _elBtnKait   = _uiEl.querySelector('#dg-btn-2');
  _elBtnSkip   = _uiEl.querySelector('#dg-btn-skip');

  // Label tombol dari episode.json
  ['#dg-lbl-0', '#dg-lbl-1', '#dg-lbl-2'].forEach((sel, i) => {
    const el = _uiEl.querySelector(sel);
    if (el) el.textContent = _controls[i] || '';
  });

  // Event tombol
  _elBtnAyun  ?.addEventListener('click', () => _doAksi('ayun'));
  _elBtnPerisai?.addEventListener('click', () => _doAksi('perisai'));
  _elBtnKait  ?.addEventListener('click', () => _doAksi('kait'));
  _elBtnSkip  ?.addEventListener('click', () => _skipDuel());
}

// ============================================================
// Aksi pemain (Tugas 3.2)
// ============================================================

function _doAksi(aksi) {
  if (_ended || _paused) return;

  if (aksi === 'ayun') {
    _hpMusuh = Math.max(0, _hpMusuh - DAMAGE_AYUN);
    _flashScreen('#c0392b', 160);
    _animateRakaAttack();
    console.debug(`[duelGame] Ayun Pedang → HP musuh: ${_hpMusuh}`);
  } else if (aksi === 'perisai') {
    _perisaiAktif = true;
    _flashScreen('#2980b9', 180);
    console.debug('[duelGame] Perisai Garis aktif.');
  } else if (aksi === 'kait') {
    if (!_kaitReady) return;
    _hpMusuh = Math.max(0, _hpMusuh - DAMAGE_KAIT);
    _flashScreen('#8e44ad', 200);
    _animateRakaAttack(true);
    console.debug(`[duelGame] Tenun Kait → HP musuh: ${_hpMusuh}`);
    _kaitReady = false;
    if (_elBtnKait) { _elBtnKait.disabled = true; _elBtnKait.style.opacity = '0.4'; }
    _kaitCdTimer = setTimeout(() => {
      _kaitReady = true;
      if (_elBtnKait && !_ended) { _elBtnKait.disabled = false; _elBtnKait.style.opacity = ''; }
    }, KAIT_COOLDOWN_MS);
  }

  _updateHPDisplay();
  if (_hpMusuh <= 0) _endDuel(false);
}

function _animateRakaAttack(strong = false) {
  if (!_rakaGroup) return;
  const baseZ = _rakaGroup.rotation.z;
  _rakaGroup.rotation.z = strong ? 0.35 : 0.2;
  setTimeout(() => { if (_rakaGroup) _rakaGroup.rotation.z = baseZ; }, 180);
}

// ============================================================
// Serangan musuh + telegraph (Tugas 3.2 + 3.3)
// ============================================================

function _scheduleMusuhAttack() {
  if (_musuhTimer) clearTimeout(_musuhTimer);
  if (_ended || _paused) return;
  _musuhTimer = setTimeout(() => {
    if (_ended || _paused) return;
    _telegraphSerangan();
  }, MUSUH_INTERVAL_MS);
}

function _telegraphSerangan() {
  if (_ended || _paused) return;

  // Tampilkan DOM telegraph
  const dgTelegraph = _uiEl?.querySelector('#dg-telegraph');
  if (dgTelegraph) dgTelegraph.style.display = 'flex';

  // Fill bar progres telegraph
  const fill = _uiEl?.querySelector('#dg-telegraph-fill');
  if (fill) {
    fill.style.transition = `width ${TELEGRAPH_MS}ms linear`;
    fill.style.width = '0%';
    // Paksa reflow sebelum animasi mulai
    void fill.offsetWidth;
    fill.style.width = '100%';
  }

  // Bayangan merah di lantai Three.js membesar
  if (_shadowMesh) _shadowMesh.material.opacity = 0.45;

  // Cakar naik (di group musuh, naikkan _clawMesh)
  if (_clawMesh) _clawMesh.position.y = 1.6;
  const clawRise = () => {
    if (_clawMesh && !_ended) _clawMesh.position.y += 0.08;
  };
  const riseInterval = setInterval(clawRise, 50);

  _telegraphId = setTimeout(() => {
    clearInterval(riseInterval);
    if (_ended) {
      if (dgTelegraph) dgTelegraph.style.display = 'none';
      if (_shadowMesh) _shadowMesh.material.opacity = 0;
      return;
    }
    // Cakar jatuh
    if (_clawMesh) _clawMesh.position.y = 1.0;
    if (dgTelegraph) dgTelegraph.style.display = 'none';
    if (_shadowMesh) _shadowMesh.material.opacity = 0;
    if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }

    _musuhSerang();
    if (!_ended) _scheduleMusuhAttack();
  }, TELEGRAPH_MS);
}

function _musuhSerang() {
  if (_ended) return;
  let dmg = DAMAGE_CAKAR;
  if (_perisaiAktif) {
    dmg = Math.round(dmg * (1 - PERISAI_REDUKSI));
    _perisaiAktif = false;
    _flashScreen('#2980b9', 160);
    _shakeCanvas(false);
    console.debug(`[duelGame] Perisai menahan! Damage dikurangi ke ${dmg}`);
  } else {
    _flashScreen('#e74c3c', 160);
    _shakeCanvas(true);
  }

  _hpRaka = Math.max(0, _hpRaka - dmg);
  console.debug(`[duelGame] Musuh serang → HP Raka: ${_hpRaka}`);
  _updateHPDisplay();
  if (_hpRaka <= 0) _endDuel(false);
}

function _shakeCanvas(hard) {
  if (!_canvasEl) return;
  _canvasEl.style.transition = 'transform 0.05s';
  _canvasEl.style.transform  = hard ? 'translateX(6px)' : 'translateX(2px)';
  setTimeout(() => {
    _canvasEl.style.transform = 'translateX(-4px)';
    setTimeout(() => { _canvasEl.style.transform = ''; }, 60);
  }, 50);
}

// ============================================================
// Timer countdown (Tugas 3.3)
// ============================================================

function _startCountdown() {
  if (_countdownId) clearInterval(_countdownId);
  _countdownId = setInterval(() => {
    if (_paused || _ended) return;
    _timerSec--;
    if (_elTimer) {
      _elTimer.textContent = _timerSec;
      _elTimer.style.color = _timerSec <= 10 ? '#e74c3c' : '#f0f0f5';
    }
    if (_timerSec <= 0) _endDuel(true);
  }, 1000);
}

// ============================================================
// Keyboard (Tugas 3.3)
// ============================================================

function _attachKeyboard() {
  _keyHandler = (e) => {
    if (_ended) return;
    // Keyboard aktif HANYA di state DUEL (Req 3.6)
    if (_sm && _sm.getState() !== 'DUEL') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); _doAksi('ayun');    break;
      case 'KeyS':  e.preventDefault(); _doAksi('perisai'); break;
      case 'KeyK':  e.preventDefault(); _doAksi('kait');    break;
    }
  };
  document.addEventListener('keydown', _keyHandler);
}

function _detachKeyboard() {
  if (_keyHandler) {
    document.removeEventListener('keydown', _keyHandler);
    _keyHandler = null;
  }
}

// ============================================================
// Update tampilan HP
// ============================================================

function _updateHPDisplay() {
  if (_elHpRaka)  _elHpRaka.textContent  = `${Math.max(0, _hpRaka)}/${HP_RAKA_AWAL}`;
  if (_elHpMusuh) _elHpMusuh.textContent = `${Math.max(0, _hpMusuh)}/${HP_MUSUH_AWAL}`;

  const rakaFill  = _uiEl?.querySelector('#dg-hp-raka-fill');
  const musuhFill = _uiEl?.querySelector('#dg-hp-musuh-fill');
  if (rakaFill)  rakaFill.style.width  = `${Math.max(0, _hpRaka  / HP_RAKA_AWAL  * 100)}%`;
  if (musuhFill) musuhFill.style.width = `${Math.max(0, _hpMusuh / HP_MUSUH_AWAL * 100)}%`;
}

function _flashScreen(color, ms) {
  const flash = _uiEl?.querySelector('#dg-flash');
  if (!flash) return;
  flash.style.background = color;
  flash.style.opacity    = '0.22';
  flash.style.display    = 'block';
  setTimeout(() => { if (flash) flash.style.display = 'none'; }, ms);
}

function _showPauseOverlay(show) {
  const el = _uiEl?.querySelector('#dg-pause');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ============================================================
// Akhir duel (Tugas 3.4)
// ============================================================

/**
 * Lewati duel (Fase 6-prep, sesuai naskah): pemain menyerahkan duel —
 * hasil dipaksa `bertahan` lewat kontrak _endDuel yang sama, dengan
 * statistik apa adanya saat tombol ditekan.
 */
function _skipDuel() {
  if (_ended || _paused) return;
  console.debug('[duelGame] Duel dilewati pemain — hasil dipaksa: bertahan.');
  _endDuel(false, 'bertahan');
}

function _endDuel(timerHabis, forcedOutcome = null) {
  if (_ended) return;
  _ended = true;

  _stopLoop();
  _clearTimers();
  _detachKeyboard();

  // forcedOutcome hanya dipakai jalur lewati duel (naskah: lewati = bertahan);
  // jalur normal tetap dihitung computeOutcome persis seperti sebelumnya.
  const result = forcedOutcome
    ? { outcome: forcedOutcome }
    : computeOutcome({ hpRaka: _hpRaka, hpMusuh: _hpMusuh, timerHabis });
  console.debug(
    `[duelGame] Duel selesai — outcome: ${result.outcome}` +
    ` | HP Raka: ${_hpRaka} | HP Musuh: ${_hpMusuh} | timer habis: ${timerHabis}` +
    (forcedOutcome ? ' | dilewati pemain' : '')
  );

  // Statistik duel untuk ringkasan di end card (Fase 4, design §5).
  // Argumen pertama onDone tetap string outcome (kontrak lama tidak berubah).
  const stats = {
    hpRaka:      Math.max(0, _hpRaka),
    hpMusuh:     Math.max(0, _hpMusuh),
    durationSec: Math.round(DUEL_TIMER_SEC - _timerSec),
  };

  _showResultOverlay(result.outcome, () => {
    _cleanup();
    _sm.finishDuel(result.outcome);
    if (typeof _onDone === 'function') _onDone(result.outcome, stats);
  });
}

function _showResultOverlay(outcome, cb) {
  if (!_uiEl) { cb(); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0;
    background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center;
    flex-direction:column; gap:1rem; z-index:50; pointer-events:none;
  `;
  overlay.innerHTML = `
    <div style="font-size:2.5rem;">${outcome === 'menang' ? '🏆' : '🛡️'}</div>
    <div style="font-size:1.3rem;font-weight:900;color:#f0f0f5;letter-spacing:.04em;">
      ${outcome === 'menang' ? 'MENANG!' : 'BERTAHAN!'}
    </div>
  `;
  _uiEl.appendChild(overlay);
  setTimeout(cb, 1300);
}

// ============================================================
// Cleanup bersih (Tugas 3.4)
// ============================================================

function _cleanup() {
  _stopLoop();
  _clearTimers();
  _detachKeyboard();

  // Dispose geometri + material Three.js
  _disposables.forEach(obj => {
    try { obj.dispose?.(); } catch {}
  });
  _disposables = [];

  // Dispose renderer
  if (_renderer) {
    _renderer.dispose();
    _renderer = null;
  }

  // Lepas canvas dari DOM
  if (_canvasEl && _canvasEl.parentNode) {
    _canvasEl.parentNode.removeChild(_canvasEl);
    _canvasEl = null;
  }

  // Lepas UI DOM
  if (_uiEl && _uiEl.parentNode) {
    _uiEl.parentNode.removeChild(_uiEl);
    _uiEl = null;
  }

  // Lepas ResizeObserver
  if (_container?.__resizeObs) {
    _container.__resizeObs.disconnect();
    delete _container.__resizeObs;
  }

  _scene3     = null;
  _camera     = null;
  _rakaGroup  = null;
  _musuhGroup = null;
  _shadowMesh = null;
  _clawMesh   = null;
  _THREE      = null;

  console.debug('[duelGame] Cleanup selesai.');
}

// ============================================================
// Helper
// ============================================================

function _clearTimers() {
  if (_countdownId) { clearInterval(_countdownId);  _countdownId = null; }
  if (_musuhTimer)  { clearTimeout(_musuhTimer);    _musuhTimer  = null; }
  if (_kaitCdTimer) { clearTimeout(_kaitCdTimer);   _kaitCdTimer = null; }
  if (_telegraphId) { clearTimeout(_telegraphId);   _telegraphId = null; }
}

/** Tambahkan ke daftar disposables. */
function _track(...items) {
  _disposables.push(...items);
}

/** Namespace THREE dari modul yang dimuat malas. */
function _ns() {
  // three.module.js mengekspor flat namespace — semua symbol langsung di root modul
  return { THREE: _THREE };
}

/** Handler resize: perbarui kamera + renderer. */
function _onResize() {
  if (!_renderer || !_camera || !_container) return;
  const W = _container.clientWidth;
  const H = _container.clientHeight;
  _renderer.setSize(W, H);
  _camera.aspect = W / H;
  _camera.updateProjectionMatrix();
}
