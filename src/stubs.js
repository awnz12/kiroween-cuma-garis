/**
 * CUMA GARIS. — Episode Interaktif
 * stubs.js — Overlay "segera hadir" untuk state BRANCH, DUEL, ENDING, ENDCARD
 *
 * Fase 1: implementasi stub saja. Fase 3–4 akan mengganti file ini
 * dengan duelGame.js, endings.js, dsb.
 *
 * Menyediakan juga jalur replay: tombol "Main Lagi" di ENDCARD
 * memanggil stateMachine.replayFromEndCard() → BRANCH (Req 4.4).
 */

// ---- Elemen overlay stub -----------------------------------

let _overlayEl  = null;
let _sm         = null;
let _onBranch   = null; // callback saat masuk BRANCH (dari SM atau replay)

/**
 * Inisialisasi stub overlays.
 * @param {object} stateMachine
 * @param {Function} onBranchEntered - dipanggil saat state BRANCH aktif
 */
export function initStubs(stateMachine, onBranchEntered) {
  _sm       = stateMachine;
  _onBranch = onBranchEntered;

  _overlayEl = document.getElementById('stub-overlay');
  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'stub-overlay';
    _overlayEl.setAttribute('role', 'dialog');
    _overlayEl.setAttribute('aria-modal', 'true');
    _overlayEl.style.display = 'none';
    // Masukkan ke dalam .stage
    const stage = document.querySelector('.stage');
    if (stage) stage.appendChild(_overlayEl);
  }
}

/**
 * Tampilkan overlay stub BRANCH point.
 * Dipanggil oleh main.js ketika SM masuk ke state BRANCH.
 */
export function showBranchStub() {
  _show(`
    <div class="stub-content">
      <div class="stub-badge">⚔️</div>
      <h2>${getBranchTriggerText()}</h2>
      <p class="stub-label">Duel Coretan Liar</p>
      <p class="stub-soon">[ Segera Hadir — Fase 3 ]</p>
      <p class="stub-hint">Mini-game Three.js duel Raka vs Coretan Liar<br>akan tersedia setelah Fase 3 selesai.</p>
      <div class="stub-actions">
        <button id="stub-btn-menang" class="ctrl-btn stub-action-btn" type="button">✅ Simulasi: Menang</button>
        <button id="stub-btn-bertahan" class="ctrl-btn stub-action-btn" type="button">🛡️ Simulasi: Bertahan</button>
      </div>
    </div>
  `);

  // Tombol simulasi hasil duel (placeholder sampai Fase 3 selesai)
  document.getElementById('stub-btn-menang')?.addEventListener('click', () => {
    _hideSelf();
    _sm.startDuel();
    _sm.finishDuel('menang');
    _sm.showEndCard();
    showEndCardStub('menang');
  });
  document.getElementById('stub-btn-bertahan')?.addEventListener('click', () => {
    _hideSelf();
    _sm.startDuel();
    _sm.finishDuel('bertahan');
    _sm.showEndCard();
    showEndCardStub('bertahan');
  });
}

/**
 * Tampilkan overlay stub ENDCARD dengan tombol "Main Lagi".
 * @param {'menang'|'bertahan'} outcome
 */
export function showEndCardStub(outcome) {
  const label = outcome === 'menang' ? '🏆 MENANG' : '🛡️ BERTAHAN';
  _show(`
    <div class="stub-content">
      <div class="stub-badge">${outcome === 'menang' ? '🏆' : '🌑'}</div>
      <h2>BERSAMBUNG — Episode 2 besok.</h2>
      <p class="stub-label">Hasil: ${label}</p>
      ${outcome === 'bertahan' ? '<p class="stub-extra">Sesuatu sedang menghapus dunia ini…</p>' : ''}
      <p class="stub-soon">[ End Card penuh — Fase 4 ]</p>
      <div class="stub-actions">
        <button id="stub-btn-replay" class="ctrl-btn stub-action-btn replay-btn" type="button">🔄 Main Lagi</button>
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
  _overlayEl.style.display = 'flex';
  _overlayEl.style.flexDirection = 'column';
  _overlayEl.style.alignItems = 'center';
  _overlayEl.style.justifyContent = 'center';
}

function _hideSelf() {
  if (_overlayEl) _overlayEl.style.display = 'none';
}

function getBranchTriggerText() {
  // Ambil dari DOM bila tersedia (di-render oleh main.js dari episode.json)
  return window.__branchTriggerText || 'GILIRANMU — Lawan Coretan Liar!';
}
