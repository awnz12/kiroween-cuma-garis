/**
 * CUMA GARIS. — Episode Interaktif
 * stubs.js — Overlay BRANCH (nyata, Fase 3) + ENDCARD stub (Fase 4)
 *
 * Fase 3 mengganti stub BRANCH dengan overlay branch point nyata (Tugas 3.6):
 *   - Freeze frame Scene 5 (klip video tetap tampil di latar)
 *   - triggerText dan narration diambil verbatim dari episode.json
 *   - Tombol "Mulai Duel" memulai duelGame (atau duelFallback)
 *   - Keyboard juga terhenti; listener duel aktif di dalam duelGame
 *
 * Stub ENDCARD tetap (Fase 4 akan menggantinya dengan endings.js).
 *
 * Kontrak:
 *   initStubs(sm, episodeData, onBranchEntered)
 *   showBranchOverlay()   ← dipanggil oleh main.js saat SM masuk BRANCH
 *   showEndCardStub(outcome)
 */

import { startDuelGame, pauseDuelGame, resumeDuelGame } from './duel/duelGame.js';

// ---- Referensi modul ----------------------------------------

let _sm           = null;
let _episodeData  = null;
let _onBranch     = null;    // callback saat masuk BRANCH (dari SM atau replay)

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
    onDone: (outcome) => {
      // duelGame sudah memanggil sm.finishDuel(outcome) sebelum memanggil onDone
      // Pemetaan outcome → ending dari episode.json (Tugas 3.4)
      const variant = branch.outcomes[outcome]; // e.g. 'ending-a' atau 'ending-b'
      console.debug(`[stubs] Duel selesai: outcome=${outcome}, variant=${variant}`);
      // Tampilkan stub end card (Fase 4 akan mengganti ini dengan endings.js)
      _sm.showEndCard();
      showEndCardStub(outcome);
    },
  });
}

// ---- Stub End Card (Fase 4 mengganti ini) ------------------

/**
 * Tampilkan stub end card.
 * @param {'menang'|'bertahan'} outcome
 */
export function showEndCardStub(outcome) {
  const endings   = _episodeData?.endings || [];
  const endingDef = endings.find(e =>
    (outcome === 'menang'   && e.id === 'ending-a') ||
    (outcome === 'bertahan' && e.id === 'ending-b')
  );
  const endCard = endingDef?.endCard;

  const mainText   = endCard?.text        ?? 'BERSAMBUNG — Episode 2 besok.';
  const extraLine  = endCard?.extraLine   ?? null;
  const replayLbl  = endCard?.replayLabel ?? 'Main Lagi';
  const darkTheme  = endCard?.darkTheme   ?? (outcome === 'bertahan');
  const badge      = outcome === 'menang' ? '🏆' : '🌑';
  const resultLabel = outcome === 'menang' ? 'MENANG' : 'BERTAHAN';

  _show(`
    <div class="stub-content${darkTheme ? ' stub-dark' : ''}">
      <div class="stub-badge">${badge}</div>
      <h2>${_escHtml(mainText)}</h2>
      <p class="stub-label">Hasil: ${resultLabel}</p>
      ${extraLine ? `<p class="stub-extra">${_escHtml(extraLine)}</p>` : ''}
      <p class="stub-soon">[ Pemutaran Ending penuh — Fase 4 ]</p>
      <div class="stub-actions">
        <button id="stub-btn-replay" class="ctrl-btn stub-action-btn replay-btn" type="button">
          🔄 ${_escHtml(replayLbl)}
        </button>
      </div>
    </div>
  `);

  document.getElementById('stub-btn-replay')?.addEventListener('click', () => {
    _hideSelf();
    _sm.replayFromEndCard(); // → BRANCH
    if (typeof _onBranch === 'function') _onBranch();
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
