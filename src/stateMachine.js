/**
 * CUMA GARIS. — Episode Interaktif
 * stateMachine.js — Mesin state pemutar episode
 *
 * State utama: INTRO → PLAYING → BRANCH → DUEL → ENDING → ENDCARD
 * Overlay state: PAUSED (aktif di atas PLAYING atau DUEL)
 *
 * Fase 1: BRANCH / DUEL / ENDING / ENDCARD adalah stub "segera hadir".
 * Fase 3–4 akan mengganti stub tersebut dengan implementasi penuh.
 */

// ---- Konstanta state ----------------------------------------

export const STATE = Object.freeze({
  INTRO:   'INTRO',
  PLAYING: 'PLAYING',
  BRANCH:  'BRANCH',
  DUEL:    'DUEL',
  ENDING:  'ENDING',
  ENDCARD: 'ENDCARD',
});

// PAUSED adalah overlay — disimpan terpisah agar state utama tidak berubah.

// ---- Pabrik state machine -----------------------------------

/**
 * Membuat state machine baru.
 *
 * @param {object} opts
 * @param {Function} opts.onTransition - dipanggil setiap transisi:
 *   ({ from, to, paused, sceneIndex, reason })
 */
export function createStateMachine({ onTransition } = {}) {
  let _state     = STATE.INTRO;
  let _paused    = false;
  let _sceneIdx  = -1;        // 0-based index scene yang sedang diputar

  function _emit(from, to, reason = '') {
    const ts = new Date().toISOString();
    console.debug(`[SM ${ts}] ${from}${_paused ? '+PAUSED' : ''} → ${to} | reason: ${reason}`);
    if (typeof onTransition === 'function') {
      onTransition({ from, to, paused: _paused, sceneIndex: _sceneIdx, reason });
    }
  }

  // ---- Getter -----------------------------------------------

  function getState()      { return _state; }
  function isPaused()      { return _paused; }
  function getSceneIndex() { return _sceneIdx; }

  // ---- Transisi utama ---------------------------------------

  /**
   * Memulai episode dari layar intro.
   */
  function startEpisode() {
    if (_state !== STATE.INTRO) {
      console.warn('[SM] startEpisode dipanggil di luar state INTRO — diabaikan.');
      return;
    }
    const from = _state;
    _state   = STATE.PLAYING;
    _sceneIdx = 0;
    _emit(from, _state, 'tombol Mulai Episode');
  }

  /**
   * Pindah ke scene berikutnya selama PLAYING.
   * Dipanggil oleh scenePlayer ketika scene selesai atau di-skip.
   *
   * @param {number} nextIdx - indeks scene berikutnya (0-based)
   * @param {string} [reason]
   */
  function nextScene(nextIdx, reason = 'scene selesai') {
    if (_state !== STATE.PLAYING) return;
    const from = _state;
    _sceneIdx  = nextIdx;
    _emit(from, _state, `${reason} → scene ${nextIdx}`);
  }

  /**
   * Semua scene selesai → masuk ke BRANCH point.
   * @param {string} [reason]
   */
  function goToBranch(reason = 'semua scene selesai') {
    if (_state !== STATE.PLAYING) return;
    const from = _state;
    _state     = STATE.BRANCH;
    _sceneIdx  = -1;
    _emit(from, _state, reason);
  }

  /**
   * Memulai duel dari state BRANCH.
   */
  function startDuel() {
    if (_state !== STATE.BRANCH) return;
    const from = _state;
    _state     = STATE.DUEL;
    _emit(from, _state, 'pemain siap duel');
  }

  /**
   * Duel selesai — masuk ke ENDING.
   * @param {'menang'|'bertahan'} outcome
   */
  function finishDuel(outcome) {
    if (_state !== STATE.DUEL) return;
    const from = _state;
    _state     = STATE.ENDING;
    _emit(from, _state, `duel selesai: ${outcome}`);
  }

  /**
   * Ending selesai diputar → tampilkan ENDCARD.
   */
  function showEndCard() {
    if (_state !== STATE.ENDING) return;
    const from = _state;
    _state     = STATE.ENDCARD;
    _emit(from, _state, 'ending selesai');
  }

  /**
   * "Main Lagi" dari end card → kembali ke BRANCH (Req 4.4).
   */
  function replayFromEndCard() {
    if (_state !== STATE.ENDCARD) return;
    const from = _state;
    _state     = STATE.BRANCH;
    _sceneIdx  = -1;
    _paused    = false;
    _emit(from, _state, 'tombol Main Lagi → BRANCH');
  }

  // ---- Overlay PAUSED ---------------------------------------

  /**
   * Toggle pause. Hanya berlaku saat PLAYING atau DUEL.
   * @param {boolean} [force] - true = paksa pause, false = paksa lanjut
   */
  function togglePause(force) {
    if (_state !== STATE.PLAYING && _state !== STATE.DUEL) return;
    const before = _paused;
    _paused = force !== undefined ? !!force : !_paused;
    if (before !== _paused) {
      console.debug(
        `[SM ${new Date().toISOString()}] ${_state} ${_paused ? '→ +PAUSED' : '→ -PAUSED'} | toggle pause`
      );
      if (typeof onTransition === 'function') {
        onTransition({
          from:        _state,
          to:          _state,
          paused:      _paused,
          sceneIndex:  _sceneIdx,
          reason:      _paused ? 'pause' : 'lanjut',
        });
      }
    }
  }

  // ---- Ekspor -----------------------------------------------

  return {
    // getters
    getState,
    isPaused,
    getSceneIndex,
    // transisi
    startEpisode,
    nextScene,
    goToBranch,
    startDuel,
    finishDuel,
    showEndCard,
    replayFromEndCard,
    togglePause,
  };
}
