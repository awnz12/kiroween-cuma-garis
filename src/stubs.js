/**
 * CUMA GARIS. — Episode Interaktif
 * stubs.js — Overlay BRANCH (nyata, Fase 3) + jembatan ke ending (Fase 4)
 *
 * Fase 3 mengganti stub BRANCH dengan overlay branch point nyata (Tugas 3.6):
 *   - Freeze frame Scene 5 (klip video tetap tampil di latar)
 *   - triggerText dan narration diambil verbatim dari episode.json
 *   - Tombol "Mulai Duel" memulai duelGame (atau duelFallback)
 *   - Keyboard juga terhenti; listener duel aktif di dalam duelGame
 *
 * Fase 4: stub ENDCARD sudah diganti pemutaran ending nyata di endings.js.
 * Modul ini hanya meneruskan hasil duel (outcome + stats) ke playEnding().
 *
 * Kontrak:
 *   initStubs(sm, episodeData, onBranchEntered)
 *   showBranchOverlay()   ← dipanggil oleh main.js saat SM masuk BRANCH
 */

import { startDuelGame, pauseDuelGame, resumeDuelGame } from './duel/duelGame.js';
import { playEnding } from './endings.js';
import { isMuted } from './scenePlayer.js';

// ---- Referensi modul ----------------------------------------

let _sm           = null;
let _episodeData  = null;
let _onBranch     = null;    // callback masuk BRANCH — sejak Fase 4 jalur "Main Lagi"
                             // ditangani endings.js (initEndings); parameter ini
                             // dipertahankan agar kontrak initStubs tidak berubah

let _overlayEl    = null;    // overlay utama (branch / endcard)
let _stageEl      = null;    // .stage — target container Three.js

// ---- Inisialisasi ------------------------------------------

/**
 * Inisialisasi modul stubs.
 *
 * @param {object}   stateMachine
 * @param {object}   episodeData        - data episode.json yang sudah diparse
 * @param {Function} onBranchEntered    - dipanggil saat state BRANCH aktif
 */
export function initStubs(stateMachine, episodeData, onBranchEntered) {
  _sm          = stateMachine;
  _episodeData = episodeData;
  _onBranch    = onBranchEntered;

  _stageEl = document.querySelector('.stage');

  _overlayEl = document.getElementById('stub-overlay');
  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'stub-overlay';
    _overlayEl.setAttribute('role', 'dialog');
    _overlayEl.setAttribute('aria-modal', 'true');
    _overlayEl.style.display = 'none';
    if (_stageEl) _stageEl.appendChild(_overlayEl);
  }

  // Ekspos fungsi pause/resume duel ke main.js lewat window
  // (dipakai state machine saat togglePause dari luar)
  window.__duelPause  = pauseDuelGame;
  window.__duelResume = resumeDuelGame;
}

// ---- Overlay Branch Point (Tugas 3.6, Req 3.1) -------------

/**
 * Tampilkan overlay branch point.
 * Frame terakhir Scene 5 tetap tampil di latar (video dibekukan, tidak dihitamkan).
 * Semua teks dari episode.json.branch — verbatim.
 */
export function showBranchOverlay() {
  const branch = _episodeData?.branch;
  if (!branch) {
    console.error('[stubs] episode.json.branch tidak ditemukan.');
    return;
  }

  const triggerText = branch.triggerText;    // verbatim
  const narration   = branch.narration;      // verbatim

  _show(`
    <div class="branch-overlay-content">
      <div class="branch-sword-icon" aria-hidden="true">⚔️</div>
      <h2 class="branch-trigger-text">${_escHtml(triggerText)}</h2>
      <p class="branch-narration">${_escHtml(narration)}</p>
      <button id="btn-mulai-duel" class="ctrl-btn branch-start-btn" type="button">
        Mulai Duel
      </button>
    </div>
  `);

  // Narasi branch (TTS, Fase 2) — diputar sekali saat overlay tampil,
  // di atas frame beku Scene 5. Bila autoplay terblokir, teks tetap tampil.
  if (branch.audio) {
    try {
      const a = new Audio(branch.audio);
      a.muted = isMuted();   // hormati state mute global
      a.play().catch(() => {});
    } catch (_) { /* abaikan — overlay tetap berfungsi */ }
  }

  // Tombol "Mulai Duel" → masuk ke DUEL
  document.getElementById('btn-mulai-duel')?.addEventListener('click', _startDuel);
}

/**
 * Alias untuk kompatibilitas — main.js memanggil showBranchStub() pada Fase 1.
 * Fase 3 menggantinya dengan showBranchOverlay().
 */
export function showBranchStub() {
  showBranchOverlay();
}

// ---- Mulai duel --------------------------------------------

function _startDuel() {
  _hideSelf();

  // Transisi state machine ke DUEL
  _sm.startDuel();

  const branch   = _episodeData.branch;
  const controls = branch.controls;    // label 3 aksi — dari JSON
  const container = _stageEl || document.querySelector('#clip-area') || document.body;

  startDuelGame({
    controls,
    stateMachine: _sm,
    container,
    onDone: (outcome, stats) => {
      // duelGame sudah memanggil sm.finishDuel(outcome) sebelum onDone
      // → state machine ada di ENDING. Pemetaan outcome → ending dibaca
      // endings.js dari episode.json branch.outcomes (Tugas 4.1).
      const variant = branch.outcomes[outcome]; // e.g. 'ending-a' atau 'ending-b'
      console.debug(`[stubs] Duel selesai: outcome=${outcome}, variant=${variant} → putar ending`);
      playEnding(outcome, stats);
    },
  });
}

// ---- Helper internal ---------------------------------------

function _show(html) {
  if (!_overlayEl) return;
  _overlayEl.innerHTML = html;
  _overlayEl.style.display      = 'flex';
  _overlayEl.style.flexDirection  = 'column';
  _overlayEl.style.alignItems     = 'center';
  _overlayEl.style.justifyContent = 'center';
}

function _hideSelf() {
  if (_overlayEl) _overlayEl.style.display = 'none';
}

/** Escape string untuk isi innerHTML (mencegah XSS dari JSON). */
function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
