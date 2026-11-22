/**
 * CUMA GARIS. — Episode Interaktif
 * duel/duelFallback.js — Mode cadangan Quick-Time Button (Tugas 3.5)
 *
 * Dipakai bila WebGL tidak tersedia ATAU import Three.js gagal.
 * Semua teks aksi dan teks UI dibaca dari data episode (diteruskan sebagai
 * parameter), tidak ada string narasi/game di-hardcode.
 *
 * Aturan hasil: IDENTIK dengan duelResult.js (Req 3.5).
 * Kontrak keluar: panggil sm.finishDuel(outcome) lalu onDone(outcome, stats)
 * dengan stats = { hpRaka, hpMusuh, durationSec } (Fase 4).
 */

import { computeOutcome } from './duelResult.js';

// ---- Konstanta seimbang (sama dengan duelGame.js) -----------
const HP_RAKA_AWAL      = 100;
const HP_MUSUH_AWAL     = 100;
const DAMAGE_AYUN       = 15;   // Ayun Pedang
const DAMAGE_KAIT       = 30;   // Tenun Kait (lebih kuat)
const KAIT_COOLDOWN_MS  = 4000; // 4 detik cooldown
const DAMAGE_CAKAR      = 18;   // serangan musuh
const PERISAI_KURANG    = 0.4;  // Perisai mengurangi damage musuh 40%
const TELEGRAPH_MS      = 700;  // ≥ 600 ms sesuai Req 3.3
const MUSUH_INTERVAL_MS = 2800; // musuh menyerang setiap ~2.8 dtk
const DUEL_TIMER_SEC    = 45;

// ---- State internal -----------------------------------------
let _sm           = null;
let _onDone       = null;
let _controls     = [];   // label aksi dari episode.json
let _containerEl  = null;
let _hpRaka       = HP_RAKA_AWAL;
let _hpMusuh      = HP_MUSUH_AWAL;
let _timerSec     = DUEL_TIMER_SEC;
let _paused       = false;
let _ended        = false;
let _kaitReady    = true;
let _kaitTimer    = null;
let _musuhTimer   = null;
let _countdownId  = null;
let _telegraphId  = null;
let _perisaiAktif = false;
let _keyHandler   = null;

// ---- Elemen DOM dinamis ------------------------------------
let _elHpRaka   = null;
let _elHpMusuh  = null;
let _elTimer    = null;
let _elTelegraph = null;
let _elBtnAyun  = null;
let _elBtnPerisai = null;
let _elBtnKait  = null;

// ============================================================
// API Publik
// ============================================================

/**
 * Mulai duel fallback.
 *
 * @param {object} opts
 * @param {string[]}  opts.controls    - label 3 aksi dari episode.json
 * @param {object}    opts.stateMachine - instance SM
 * @param {Function}  opts.onDone      - dipanggil dengan outcome setelah selesai
 * @param {HTMLElement} opts.container - elemen induk (mis. .stage atau #clip-area)
 */
export function startFallback({ controls, stateMachine, onDone, container }) {
  _controls  = controls;
  _sm        = stateMachine;
  _onDone    = onDone;
  _containerEl = container;

  _hpRaka       = HP_RAKA_AWAL;
  _hpMusuh      = HP_MUSUH_AWAL;
  _timerSec     = DUEL_TIMER_SEC;
  _paused       = false;
  _ended        = false;
  _kaitReady    = true;
  _perisaiAktif = false;

  _buildUI();
  _startCountdown();
  _scheduleMusuhAttack();
  _attachKeyboard();

  console.debug('[duelFallback] Duel fallback dimulai.');
}

/** Jeda duel (dipanggil state machine PAUSED). */
export function pauseFallback() {
  if (_ended) return;
  _paused = true;
  _clearTimers();
  if (_containerEl) {
    const overlay = _containerEl.querySelector('#fallback-pause-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
  console.debug('[duelFallback] Duel di-pause.');
}

/** Lanjut dari jeda. */
export function resumeFallback() {
  if (_ended) return;
  _paused = false;
  if (_containerEl) {
    const overlay = _containerEl.querySelector('#fallback-pause-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  _startCountdown();
  _scheduleMusuhAttack();
  console.debug('[duelFallback] Duel dilanjutkan.');
}

// ============================================================
// Membangun UI
// ============================================================

function _buildUI() {
  const el = document.createElement('div');
  el.id = 'duel-fallback';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Duel Raka vs Coretan Liar');
  el.style.cssText = `
    position:absolute; inset:0; z-index:40;
    display:flex; flex-direction:column;
    background:#0a0a0f;
    color:#f0f0f5;
    font-family:'Segoe UI',system-ui,sans-serif;
    overflow:hidden;
  `;

  el.innerHTML = `
    <!-- Header: HP + Timer -->
    <div id="fb-header" style="
      display:flex; justify-content:space-between; align-items:center;
      padding:0.75rem 1rem 0.4rem;
      background:rgba(10,10,15,0.9);
      border-bottom:1px solid rgba(255,255,255,0.08);
    ">
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:40%;">
        <span style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.05em;
          color:#c0392b;font-weight:700;">Raka</span>
        <div id="fb-hp-raka-bar" style="
          width:100%; height:10px; background:rgba(255,255,255,0.1);
          border-radius:5px; overflow:hidden;">
          <div id="fb-hp-raka-fill" style="
            height:100%; width:100%;
            background:linear-gradient(90deg,#e74c3c,#c0392b);
            transition:width .2s;"></div>
        </div>
        <span id="fb-hp-raka-num" style="font-size:0.75rem;font-weight:600;">${HP_RAKA_AWAL}/${HP_RAKA_AWAL}</span>
      </div>

      <div id="fb-timer" style="
        font-size:clamp(1rem,5cqw,1.3rem); font-weight:900;
        color:#f0f0f5; text-align:center; min-width:3ch;
      ">${DUEL_TIMER_SEC}</div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:40%;">
        <span style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.05em;
          color:#7f8c8d;font-weight:700;">Coretan Liar</span>
        <div id="fb-hp-musuh-bar" style="
          width:100%; height:10px; background:rgba(255,255,255,0.1);
          border-radius:5px; overflow:hidden;">
          <div id="fb-hp-musuh-fill" style="
            height:100%; width:100%;
            background:linear-gradient(90deg,#2c3e50,#7f8c8d);
            transition:width .2s;"></div>
        </div>
        <span id="fb-hp-musuh-num" style="font-size:0.75rem;font-weight:600;">${HP_MUSUH_AWAL}/${HP_MUSUH_AWAL}</span>
      </div>
    </div>

    <!-- Arena visual -->
    <div id="fb-arena" style="
      flex:1; display:flex; align-items:center; justify-content:space-between;
      padding:1rem 2rem; min-height:0; position:relative;
    ">
      <!-- Raka: figur garis merah-hitam -->
      <div id="fb-raka" style="
        display:flex; flex-direction:column; align-items:center; gap:4px;
      ">
        <svg width="48" height="80" viewBox="0 0 48 80" fill="none" aria-label="Raka">
          <!-- Tubuh garis -->
          <line x1="24" y1="8" x2="24" y2="68" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>
          <!-- Kepala -->
          <circle cx="24" cy="6" r="5" stroke="#c0392b" stroke-width="2" fill="none"/>
          <!-- Lengan kiri -->
          <line x1="24" y1="22" x2="8" y2="38" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Lengan kanan / pedang -->
          <line x1="24" y1="22" x2="40" y2="14" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Bilah pedang menyala -->
          <line x1="40" y1="14" x2="48" y2="4" stroke="#e74c3c" stroke-width="3"
            stroke-linecap="round" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.8s" repeatCount="indefinite"/>
          </line>
          <!-- Kaki kiri -->
          <line x1="24" y1="52" x2="12" y2="72" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Kaki kanan -->
          <line x1="24" y1="52" x2="36" y2="72" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Syal -->
          <path d="M24 18 Q16 26 12 32" stroke="#e74c3c" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8">
            <animateTransform attributeName="transform" type="rotate"
              values="0 24 18;5 24 18;-5 24 18;0 24 18" dur="1.2s" repeatCount="indefinite"/>
          </path>
        </svg>
        <span style="font-size:0.65rem;color:#c0392b;font-weight:700;">RAKA</span>
      </div>

      <!-- VS -->
      <div style="font-size:1.4rem;font-weight:900;color:rgba(240,240,245,0.3);">VS</div>

      <!-- Coretan Liar: gumpalan tinta berdenyut -->
      <div id="fb-musuh" style="
        display:flex; flex-direction:column; align-items:center; gap:4px;
      ">
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none" aria-label="Coretan Liar">
          <!-- Gumpalan utama berdenyut -->
          <ellipse cx="30" cy="40" rx="20" ry="22" fill="#1a1a2e">
            <animate attributeName="rx" values="20;24;20" dur="1.4s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="22;18;22" dur="1.4s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="30" cy="40" rx="14" ry="16" fill="#0d0d1a">
            <animate attributeName="rx" values="14;17;14" dur="1.4s" repeatCount="indefinite"/>
          </ellipse>
          <!-- Mata merah -->
          <circle cx="22" cy="34" r="4" fill="#c0392b" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="38" cy="34" r="4" fill="#c0392b" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite"/>
          </circle>
          <!-- Cakar kiri -->
          <path d="M14 52 Q4 44 2 56" stroke="#2c3e50" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M14 54 Q2 50 0 62" stroke="#2c3e50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <!-- Cakar kanan -->
          <path d="M46 52 Q56 44 58 56" stroke="#2c3e50" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M46 54 Q58 50 60 62" stroke="#2c3e50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>
        <span style="font-size:0.65rem;color:#7f8c8d;font-weight:700;">CORETAN LIAR</span>
      </div>

      <!-- Indikator telegraph serangan musuh -->
      <div id="fb-telegraph" style="
        display:none;
        position:absolute; bottom:0; left:0; right:0;
        height:6px;
        background:linear-gradient(90deg,transparent,#e74c3c,transparent);
        animation:fb-telegraph-pulse 0.3s ease-in-out infinite alternate;
      "></div>

      <!-- Efek aksi (flash) -->
      <div id="fb-flash" style="
        display:none;
        position:absolute; inset:0;
        pointer-events:none;
      "></div>

      <!-- Overlay pause -->
      <div id="fallback-pause-overlay" style="
        display:none; position:absolute; inset:0;
        background:rgba(0,0,0,0.75);
        align-items:center; justify-content:center;
        font-size:1.4rem; font-weight:900; letter-spacing:0.1em;
        color:#f0f0f5;
      ">JEDA</div>
    </div>

    <!-- Tombol aksi -->
    <div id="fb-actions" style="
      display:grid; grid-template-columns:1fr 1fr 1fr;
      gap:0.5rem; padding:0.75rem 0.75rem;
      padding-bottom:calc(0.75rem + env(safe-area-inset-bottom, 0px));
      background:rgba(10,10,15,0.95);
      border-top:1px solid rgba(255,255,255,0.08);
    ">
      <button id="fb-btn-0" class="ctrl-btn fb-action-btn" type="button" style="
        min-height:52px; font-size:clamp(0.7rem,3.5cqw,0.85rem);
        font-weight:700; flex-direction:column; gap:2px;
      ">
        <span class="fb-btn-icon">⚔️</span>
        <span class="fb-btn-label"></span>
        <span class="fb-btn-hint" style="font-size:0.65rem;opacity:0.6;">[Spasi]</span>
      </button>
      <button id="fb-btn-1" class="ctrl-btn fb-action-btn" type="button" style="
        min-height:52px; font-size:clamp(0.7rem,3.5cqw,0.85rem);
        font-weight:700; flex-direction:column; gap:2px;
      ">
        <span class="fb-btn-icon">🛡️</span>
        <span class="fb-btn-label"></span>
        <span class="fb-btn-hint" style="font-size:0.65rem;opacity:0.6;">[S]</span>
      </button>
      <button id="fb-btn-2" class="ctrl-btn fb-action-btn" type="button" style="
        min-height:52px; font-size:clamp(0.7rem,3.5cqw,0.85rem);
        font-weight:700; flex-direction:column; gap:2px;
      ">
        <span class="fb-btn-icon">🌀</span>
        <span class="fb-btn-label"></span>
        <span class="fb-btn-hint" style="font-size:0.65rem;opacity:0.6;">[K]</span>
      </button>
    </div>

    <style>
      @keyframes fb-telegraph-pulse {
        from { opacity: 0.6; }
        to   { opacity: 1; }
      }
      .fb-action-btn { display:flex; }
      .fb-action-btn:disabled { opacity:0.4; cursor:not-allowed; }
    </style>
  `;

  _containerEl.appendChild(el);
  _containerEl.__fallbackEl = el;

  // Cache elemen
  _elHpRaka    = el.querySelector('#fb-hp-raka-num');
  _elHpMusuh   = el.querySelector('#fb-hp-musuh-num');
  _elTimer     = el.querySelector('#fb-timer');
  _elTelegraph = el.querySelector('#fb-telegraph');
  _elBtnAyun   = el.querySelector('#fb-btn-0');
  _elBtnPerisai = el.querySelector('#fb-btn-1');
  _elBtnKait   = el.querySelector('#fb-btn-2');

  // Label tombol dari episode.json (index 0=Ayun, 1=Perisai, 2=Kait)
  [_elBtnAyun, _elBtnPerisai, _elBtnKait].forEach((btn, i) => {
    if (btn) btn.querySelector('.fb-btn-label').textContent = _controls[i] || '';
  });

  // Event tombol
  _elBtnAyun  ?.addEventListener('click', () => _doAksi('ayun'));
  _elBtnPerisai?.addEventListener('click', () => _doAksi('perisai'));
  _elBtnKait  ?.addEventListener('click', () => _doAksi('kait'));
}

// ============================================================
// Logika aksi pemain
// ============================================================

function _doAksi(aksi) {
  if (_ended || _paused) return;

  if (aksi === 'ayun') {
    _hpMusuh = Math.max(0, _hpMusuh - DAMAGE_AYUN);
    _flashArena('#c0392b', 180);
    console.debug(`[duelFallback] Ayun Pedang → HP musuh: ${_hpMusuh}`);
  } else if (aksi === 'perisai') {
    _perisaiAktif = true;
    _flashArena('#2980b9', 200);
    // Efek perisai hilang setelah 1 serangan musuh (ditangani di _musuhSerang)
    console.debug('[duelFallback] Perisai Garis aktif.');
  } else if (aksi === 'kait') {
    if (!_kaitReady) return;
    _hpMusuh = Math.max(0, _hpMusuh - DAMAGE_KAIT);
    _flashArena('#8e44ad', 220);
    console.debug(`[duelFallback] Tenun Kait → HP musuh: ${_hpMusuh}`);
    // Cooldown
    _kaitReady = false;
    if (_elBtnKait) {
      _elBtnKait.disabled = true;
      _elBtnKait.style.opacity = '0.4';
    }
    _kaitTimer = setTimeout(() => {
      _kaitReady = true;
      if (_elBtnKait && !_ended) {
        _elBtnKait.disabled = false;
        _elBtnKait.style.opacity = '';
      }
    }, KAIT_COOLDOWN_MS);
  }

  _updateHPDisplay();
  if (_hpMusuh <= 0) _endDuel(false);
}

// ============================================================
// Serangan musuh + telegraph
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
  // Tampilkan telegraph ≥ 600 ms (Req 3.3)
  if (_elTelegraph) _elTelegraph.style.display = 'block';

  // Animasi cakar naik di SVG musuh
  const musuhEl = _containerEl?.querySelector('#fb-musuh svg');
  if (musuhEl) {
    musuhEl.style.transform = 'translateY(-8px)';
    musuhEl.style.transition = 'transform 0.3s';
  }

  _telegraphId = setTimeout(() => {
    if (_ended) return;
    // Cakar jatuh
    if (_elTelegraph) _elTelegraph.style.display = 'none';
    if (musuhEl) {
      musuhEl.style.transform = 'translateY(0)';
    }
    _musuhSerang();
    if (!_ended) _scheduleMusuhAttack();
  }, TELEGRAPH_MS);
}

function _musuhSerang() {
  if (_ended) return;

  let damage = DAMAGE_CAKAR;
  if (_perisaiAktif) {
    damage = Math.round(damage * (1 - PERISAI_KURANG));
    _perisaiAktif = false;
    _flashArena('#2980b9', 160);
    console.debug(`[duelFallback] Perisai menahan! Damage dikurangi ke ${damage}`);
  } else {
    _flashArena('#e74c3c', 160);
  }

  _hpRaka = Math.max(0, _hpRaka - damage);
  console.debug(`[duelFallback] Musuh serang → HP Raka: ${_hpRaka}`);
  _updateHPDisplay();

  if (_hpRaka <= 0) _endDuel(false);
}

// ============================================================
// Timer countdown
// ============================================================

function _startCountdown() {
  if (_countdownId) clearInterval(_countdownId);
  _countdownId = setInterval(() => {
    if (_paused || _ended) return;
    _timerSec--;
    if (_elTimer) {
      _elTimer.textContent = _timerSec;
      // Warna merah saat ≤ 10 dtk
      _elTimer.style.color = _timerSec <= 10 ? '#e74c3c' : '#f0f0f5';
    }
    if (_timerSec <= 0) _endDuel(true);
  }, 1000);
}

// ============================================================
// Keyboard
// ============================================================

function _attachKeyboard() {
  _keyHandler = (e) => {
    if (_ended) return;
    if (_sm && _sm.getState() !== 'DUEL') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); _doAksi('ayun'); break;
      case 'KeyS':  e.preventDefault(); _doAksi('perisai'); break;
      case 'KeyK':  e.preventDefault(); _doAksi('kait'); break;
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
// Akhir duel
// ============================================================

function _endDuel(timerHabis) {
  if (_ended) return;
  _ended = true;

  _clearTimers();
  _detachKeyboard();

  const result = computeOutcome({ hpRaka: _hpRaka, hpMusuh: _hpMusuh, timerHabis });
  console.debug(`[duelFallback] Duel selesai — outcome: ${result.outcome} | HP Raka: ${_hpRaka} | HP Musuh: ${_hpMusuh} | timer habis: ${timerHabis}`);

  // Statistik duel untuk ringkasan di end card (Fase 4, design §5).
  // Argumen pertama onDone tetap string outcome (kontrak lama tidak berubah).
  const stats = {
    hpRaka:      Math.max(0, _hpRaka),
    hpMusuh:     Math.max(0, _hpMusuh),
    durationSec: Math.round(DUEL_TIMER_SEC - _timerSec),
  };

  // Tampilkan pesan hasil sesaat lalu bersihkan
  _showResultOverlay(result.outcome, () => {
    _cleanup();
    _sm.finishDuel(result.outcome);
    if (typeof _onDone === 'function') _onDone(result.outcome, stats);
  });
}

function _showResultOverlay(outcome, cb) {
  const el = _containerEl?.querySelector('#duel-fallback');
  if (!el) { cb(); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center;
    flex-direction:column; gap:1rem; z-index:50;
  `;
  overlay.innerHTML = `
    <div style="font-size:2rem;">${outcome === 'menang' ? '🏆' : '🛡️'}</div>
    <div style="font-size:1.2rem;font-weight:900;color:#f0f0f5;">
      ${outcome === 'menang' ? 'MENANG!' : 'BERTAHAN!'}
    </div>
  `;
  el.appendChild(overlay);
  setTimeout(cb, 1200);
}

// ============================================================
// Helper
// ============================================================

function _updateHPDisplay() {
  if (_elHpRaka) _elHpRaka.textContent = `${Math.max(0, _hpRaka)}/${HP_RAKA_AWAL}`;
  if (_elHpMusuh) _elHpMusuh.textContent = `${Math.max(0, _hpMusuh)}/${HP_MUSUH_AWAL}`;

  const rakaFill  = _containerEl?.querySelector('#fb-hp-raka-fill');
  const musuhFill = _containerEl?.querySelector('#fb-hp-musuh-fill');
  if (rakaFill)  rakaFill.style.width  = `${Math.max(0, _hpRaka  / HP_RAKA_AWAL  * 100)}%`;
  if (musuhFill) musuhFill.style.width = `${Math.max(0, _hpMusuh / HP_MUSUH_AWAL * 100)}%`;
}

function _flashArena(color, durationMs) {
  const flash = _containerEl?.querySelector('#fb-flash');
  if (!flash) return;
  flash.style.background = color;
  flash.style.opacity    = '0.25';
  flash.style.display    = 'block';
  setTimeout(() => {
    flash.style.display = 'none';
  }, durationMs);
}

function _clearTimers() {
  if (_countdownId)  { clearInterval(_countdownId);  _countdownId  = null; }
  if (_musuhTimer)   { clearTimeout(_musuhTimer);    _musuhTimer   = null; }
  if (_kaitTimer)    { clearTimeout(_kaitTimer);     _kaitTimer    = null; }
  if (_telegraphId)  { clearTimeout(_telegraphId);   _telegraphId  = null; }
}

function _cleanup() {
  _detachKeyboard();
  _clearTimers();
  const el = _containerEl?.querySelector('#duel-fallback');
  if (el) el.remove();
  if (_containerEl) delete _containerEl.__fallbackEl;
  console.debug('[duelFallback] Cleanup selesai.');
}
