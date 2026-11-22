/**
 * CUMA GARIS. — Episode Interaktif
 * scenePlayer.js — Pemutar klip Scene 1–5 berurutan (Req 1.1–1.3, 1.5)
 *
 * Bertanggung jawab atas:
 * - Memutar klip video per scene dari episode.json
 * - Progress bar & indikator scene aktif
 * - Tombol skip per scene & pause/lanjut
 * - Sinkronisasi narasi audio + subtitle per kalimat
 * - Fallback poster diam bila klip gagal (Req 1.4)
 * - Lanjut ke scene berikutnya ≤ 500 ms setelah klip selesai (Req 1.3)
 * - Preload klip scene n+1 selama scene n diputar (lewat assets.js)
 *
 * scenePlayer TIDAK mengelola state mesin — ia memanggil stateMachine untuk
 * setiap transisi yang signifikan.
 */

import {
  preloadNextScene,
  getCachedClip,
  markClipFailed,
} from './assets.js';
import {
  startSubtitles,
  stopSubtitles,
} from './subtitleTrack.js';

// ---- Referensi DOM -----------------------------------------

let _videoEl        = null;   // <video id="main-video">
let _fallbackEl     = null;   // <div id="clip-fallback">
let _progressFill   = null;   // <div id="progress-bar-fill">
let _progressWrap   = null;   // <div id="progress-bar-wrap">
let _sceneDotsEl    = null;   // <div id="scene-indicator">
let _btnPlay        = null;   // <button id="btn-play">
let _btnSkip        = null;   // <button id="btn-skip">
let _btnMute        = null;   // <button id="btn-mute">
let _btnNarasi      = null;   // <button id="btn-narasi"> (dibuat dinamis)

// ---- Referensi eksternal -----------------------------------

let _scenes         = [];     // data scenes dari episode.json
let _sm             = null;   // stateMachine instance
let _onAllDone      = null;   // callback dipanggil setelah Scene 5 selesai

// ---- State player ------------------------------------------

let _currentIdx     = 0;      // indeks scene aktif (0-based)
let _paused         = false;
let _muted          = false;
let _audioEl        = null;   // <audio> narasi scene aktif
let _safetyTimer    = null;   // timeout pengaman per scene
let _rafProgress    = null;   // rAF untuk progress bar
let _sceneEndLocked = false;  // flag agar _onSceneEnd tidak dipanggil 2x
let _fallbackMode   = false;  // true bila klip gagal untuk scene aktif

// ---- Inisialisasi ------------------------------------------

/**
 * Inisialisasi scenePlayer.
 * @param {object} opts
 * @param {object[]} opts.scenes       - data scenes dari episode.json
 * @param {object}   opts.stateMachine - instance dari createStateMachine()
 * @param {Function} opts.onAllDone    - callback saat Scene 5 selesai (→ BRANCH)
 */
export function initScenePlayer({ scenes, stateMachine, onAllDone }) {
  _scenes      = scenes;
  _sm          = stateMachine;
  _onAllDone   = onAllDone;

  _videoEl      = document.getElementById('main-video');
  _fallbackEl   = document.getElementById('clip-fallback');
  _progressFill = document.getElementById('progress-bar-fill');
  _progressWrap = document.getElementById('progress-bar-wrap');
  _sceneDotsEl  = document.getElementById('scene-indicator');
  _btnPlay      = document.getElementById('btn-play');
  _btnSkip      = document.getElementById('btn-skip');
  _btnMute      = document.getElementById('btn-mute');

  // Siapkan titik-titik indikator scene
  _buildSceneDots();

  // Tombol kontrol
  if (_btnPlay) _btnPlay.addEventListener('click', _handlePlayPause);
  if (_btnSkip) _btnSkip.addEventListener('click', _handleSkip);
  if (_btnMute) _btnMute.addEventListener('click', _handleMute);

  // Keyboard shortcut: Spasi = play/pause (duel pakai spasi juga — priority PLAYING)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && _sm.getState() === 'PLAYING') {
      e.preventDefault();
      _handlePlayPause();
    }
  });
}

// ---- Registry listener mute --------------------------------

/** Daftar listener yang dipanggil saat state mute berubah. */
let _muteListeners = [];

/**
 * Kembalikan state mute saat ini.
 * @returns {boolean}
 */
export function isMuted() {
  return _muted;
}

/**
 * Daftarkan listener yang dipanggil setiap kali state mute berubah.
 * Listener dipanggil dengan nilai boolean mute baru.
 * @param {function(boolean): void} fn
 * @returns {function(): void} Fungsi unsubscribe
 */
export function onMuteChange(fn) {
  _muteListeners.push(fn);
  return () => {
    _muteListeners = _muteListeners.filter(f => f !== fn);
  };
}

// ---- API publik --------------------------------------------

/**
 * Mulai memutar dari scene pertama (indeks 0).
 */
export function startFromScene0() {
  _currentIdx = 0;
  _playScene(_currentIdx);
}

/**
 * Resume setelah pause (dipanggil oleh togglePause handler).
 */
export function resumeIfPaused() {
  if (!_paused) return;
  _paused = false;
  _videoEl?.play().catch(() => {});
  if (_audioEl && !_muted) _audioEl.play().catch(() => {});
  _startProgressLoop();
  _updatePlayBtn();
}

/**
 * Pause pemutaran.
 */
export function pausePlayer() {
  if (_paused) return;
  _paused = true;
  _videoEl?.pause();
  _audioEl?.pause();
  _stopProgressLoop();
  _updatePlayBtn();
}

/**
 * Toggle mute audio narasi (subtitle tetap jalan).
 * Merupakan satu-satunya titik perubahan state mute; semua listener
 * registry akan dipanggil dengan nilai mute baru.
 */
export function setMuted(val) {
  _muted = !!val;
  if (_audioEl) _audioEl.muted = _muted;
  _updateMuteBtn();
  // Beritahu semua listener (misalnya endings.js, stubs.js)
  _muteListeners.forEach(fn => fn(_muted));
}

// ---- Pemutaran scene ---------------------------------------

function _playScene(idx) {
  _clearScene();
  _sceneEndLocked = false;
  _fallbackMode   = false;
  _currentIdx     = idx;

  const scene = _scenes[idx];
  if (!scene) {
    console.warn('[scenePlayer] Indeks scene tidak valid:', idx);
    return;
  }

  console.debug(`[scenePlayer] Mulai Scene ${idx + 1}: ${scene.id}`);

  _sm.nextScene(idx, 'mulai scene');
  _updateSceneDots(idx);

  // Preload scene berikutnya
  preloadNextScene(idx);

  // ---- Siapkan video ----------------------------------------
  const cached = getCachedClip(scene.clip);
  if (cached) {
    // Reuse elemen yang sudah di-preload: clone src ke video utama
    _videoEl.src = cached.src;
  } else {
    _videoEl.src = scene.clip;
  }
  _videoEl.currentTime = 0;

  // Poster fallback per scene (Fase 2, Tugas 2.4)
  _videoEl.poster = scene.poster || '';

  // Event: klip gagal
  const onVideoError = () => {
    console.warn(`[scenePlayer] Klip gagal dimuat: ${scene.clip}`);
    markClipFailed(scene.clip);
    _fallbackMode = true;
    _showFallback(scene);
    // Alur tetap jalan: jalankan timer berdasarkan durasi scene
    _startSafetyTimer(scene, true);
  };
  _videoEl.addEventListener('error', onVideoError, { once: true });

  // Event: video siap diputar
  const onCanPlay = () => {
    if (_fallbackMode) return;
    _videoEl.play().catch((err) => {
      console.warn('[scenePlayer] Autoplay video diblokir:', err);
      // Video tidak bisa autoplay — tetap jalankan narasi & subtitle
    });
  };
  _videoEl.addEventListener('canplay', onCanPlay, { once: true });

  // Event: klip selesai
  _videoEl.addEventListener('ended', _onClipEnded, { once: true });

  // ---- Siapkan audio narasi ---------------------------------
  _loadAudio(scene);

  // ---- Subtitle ---------------------------------------------
  startSubtitles(scene.narration, scene.startSec);

  // ---- Safety timer (durasi scene + 2 dtk) ------------------
  const sceneDuration = scene.endSec - scene.startSec;
  _startSafetyTimer(scene, false, sceneDuration);

  // ---- Progress bar -----------------------------------------
  _startProgressLoop();
}

function _clearScene() {
  _stopProgressLoop();
  _clearSafetyTimer();
  stopSubtitles();

  // Hentikan & lepas audio
  if (_audioEl) {
    _audioEl.pause();
    _audioEl.src = '';
    _audioEl.remove();
    _audioEl = null;
  }

  // Reset video
  if (_videoEl) {
    _videoEl.pause();
    _videoEl.removeEventListener('ended', _onClipEnded);
    _videoEl.src = '';
  }

  // Sembunyikan fallback
  _hideFallback();
}

// ---- Event handler klip selesai ----------------------------

function _onClipEnded() {
  if (_sceneEndLocked) return;
  _sceneEndLocked = true;
  _clearSafetyTimer();
  _scheduleNextScene('klip selesai');
}

function _onSafetyTimeout(scene) {
  if (_sceneEndLocked) return;
  _sceneEndLocked = true;
  console.debug(`[scenePlayer] Safety timeout untuk scene ${scene.id}`);
  _scheduleNextScene('safety timeout');
}

// ---- Penjadwal transisi scene ≤ 500 ms ---------------------

function _scheduleNextScene(reason) {
  // "mana yang lebih lambat": tunggu juga narasi audio selesai
  // Implementasi: narasi sudah disinkron dengan timeout scene;
  // setelah klip selesai, kita beri 100 ms agar narasi sempat flush.
  const TRANSITION_DELAY_MS = 100;

  setTimeout(() => {
    const nextIdx = _currentIdx + 1;
    if (nextIdx < _scenes.length) {
      _playScene(nextIdx);
    } else {
      // Semua scene selesai → BRANCH
      console.debug('[scenePlayer] Semua scene selesai → BRANCH');
      _clearScene();
      if (typeof _onAllDone === 'function') _onAllDone();
    }
  }, TRANSITION_DELAY_MS);
}

// ---- Safety timer ------------------------------------------

function _startSafetyTimer(scene, isFallback, durationSec) {
  _clearSafetyTimer();
  const dur = durationSec ?? (scene.endSec - scene.startSec);
  const timeoutMs = (dur + 2) * 1000;
  _safetyTimer = setTimeout(() => _onSafetyTimeout(scene), timeoutMs);
}

function _clearSafetyTimer() {
  if (_safetyTimer !== null) {
    clearTimeout(_safetyTimer);
    _safetyTimer = null;
  }
}

// ---- Audio narasi ------------------------------------------

function _loadAudio(scene) {
  if (!scene.audio) return;

  _audioEl = document.createElement('audio');
  _audioEl.src    = scene.audio;
  _audioEl.preload = 'auto';
  _audioEl.muted  = _muted;
  _audioEl.style.display = 'none';
  document.body.appendChild(_audioEl);

  _audioEl.addEventListener('error', () => {
    console.warn(`[scenePlayer] Audio narasi gagal dimuat: ${scene.audio}`);
    _showNarasiButton(scene);
  }, { once: true });

  _audioEl.addEventListener('canplaythrough', () => {
    // Sembunyikan tombol "Putar Narasi" bila audio sudah siap autoplay
    _hideNarasiButton();
    if (!_muted && !_paused) {
      _audioEl.play().catch((err) => {
        // Autoplay audio diblokir
        console.warn('[scenePlayer] Autoplay audio diblokir:', err);
        _showNarasiButton(scene);
      });
    }
  }, { once: true });

  _audioEl.load();
}

// ---- Tombol "Putar Narasi" (Req 2.3) -----------------------

function _showNarasiButton(scene) {
  if (_btnNarasi) return; // sudah ada

  _btnNarasi = document.createElement('button');
  _btnNarasi.id          = 'btn-narasi';
  _btnNarasi.type        = 'button';
  _btnNarasi.className   = 'ctrl-btn narasi-btn';
  _btnNarasi.textContent = '🔈 Putar Narasi';
  _btnNarasi.setAttribute('aria-label', 'Putar narasi audio');

  _btnNarasi.addEventListener('click', () => {
    if (_audioEl && !_muted) {
      _audioEl.play().catch(() => {});
    }
    _hideNarasiButton();
  });

  // Sisipkan sebelum tombol mute di #control-buttons
  const controlButtons = document.getElementById('control-buttons');
  if (controlButtons && _btnMute) {
    controlButtons.insertBefore(_btnNarasi, _btnMute);
  }
}

function _hideNarasiButton() {
  if (_btnNarasi) {
    _btnNarasi.remove();
    _btnNarasi = null;
  }
}

// ---- Fallback poster diam (Req 1.4) ------------------------

function _showFallback(scene) {
  if (!_fallbackEl) return;
  // Tampilkan teks narasi gabungan sebagai pengganti klip
  const allText = (scene.narration || []).map(s => s.text).join(' ');
  const inner = _fallbackEl.querySelector('span') || _fallbackEl;
  inner.textContent = allText || '[ Adegan tidak tersedia — narasi tetap berjalan ]';
  // Poster diam sebagai latar fallback bila tersedia (Fase 2, Tugas 2.4)
  if (scene.poster) {
    _fallbackEl.style.backgroundImage    = `url("${scene.poster}")`;
    _fallbackEl.style.backgroundSize     = 'cover';
    _fallbackEl.style.backgroundPosition = 'center';
  }
  _fallbackEl.style.display = 'flex';

  // Sembunyikan elemen video agar tidak tampak hitam di belakang
  if (_videoEl) _videoEl.style.visibility = 'hidden';
}

function _hideFallback() {
  if (_fallbackEl) {
    _fallbackEl.style.display = 'none';
    _fallbackEl.style.backgroundImage = '';
  }
  if (_videoEl) _videoEl.style.visibility = 'visible';
}

// ---- Progress bar ------------------------------------------

function _startProgressLoop() {
  _stopProgressLoop();
  const scene = _scenes[_currentIdx];
  if (!scene) return;

  const totalDuration = _scenes.reduce((acc, s) => acc + (s.endSec - s.startSec), 0);
  const sceneStartProgress = _scenes
    .slice(0, _currentIdx)
    .reduce((acc, s) => acc + (s.endSec - s.startSec), 0);

  function loop() {
    if (_paused) return;
    if (!_videoEl) return;

    const withinScene = _fallbackMode
      ? (Date.now() - _sceneProgressRef) / 1000
      : _videoEl.currentTime;

    const globalProgress = (sceneStartProgress + Math.min(withinScene, scene.endSec - scene.startSec)) / totalDuration;

    if (_progressFill) {
      _progressFill.style.width = `${Math.min(globalProgress * 100, 100).toFixed(2)}%`;
    }
    if (_progressWrap) {
      _progressWrap.setAttribute('aria-valuenow', Math.round(globalProgress * 100));
    }

    _rafProgress = requestAnimationFrame(loop);
  }

  _sceneProgressRef = Date.now();
  _rafProgress = requestAnimationFrame(loop);
}
let _sceneProgressRef = 0;

function _stopProgressLoop() {
  if (_rafProgress !== null) {
    cancelAnimationFrame(_rafProgress);
    _rafProgress = null;
  }
}

// ---- Indikator titik scene ---------------------------------

function _buildSceneDots() {
  if (!_sceneDotsEl) return;
  _sceneDotsEl.innerHTML = '';
  _scenes.forEach((scene, i) => {
    const dot = document.createElement('div');
    dot.className = 'scene-dot';
    dot.setAttribute('role', 'listitem');
    dot.setAttribute('aria-label', `Scene ${i + 1}: ${scene.title}`);
    _sceneDotsEl.appendChild(dot);
  });
}

function _updateSceneDots(activeIdx) {
  if (!_sceneDotsEl) return;
  const dots = _sceneDotsEl.querySelectorAll('.scene-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIdx);
    dot.classList.toggle('done',   i < activeIdx);
  });
}

// ---- Handler tombol kontrol --------------------------------

function _handlePlayPause() {
  if (_paused) {
    _paused = false;
    _videoEl?.play().catch(() => {});
    if (_audioEl && !_muted) _audioEl.play().catch(() => {});
    _startProgressLoop();
    _sm.togglePause(false);
  } else {
    _paused = true;
    _videoEl?.pause();
    _audioEl?.pause();
    _stopProgressLoop();
    _sm.togglePause(true);
  }
  _updatePlayBtn();
}

function _handleSkip() {
  if (_sceneEndLocked) return;
  _sceneEndLocked = true;
  _clearSafetyTimer();
  console.debug(`[scenePlayer] Skip scene ${_currentIdx + 1}`);
  _scheduleNextScene('skip tombol');
}

function _handleMute() {
  setMuted(!_muted);
}

// ---- Update label tombol -----------------------------------

function _updatePlayBtn() {
  if (!_btnPlay) return;
  _btnPlay.textContent = _paused ? '▶' : '⏸';
  _btnPlay.setAttribute('aria-label', _paused ? 'Lanjutkan (Spasi)' : 'Jeda (Spasi)');
}

function _updateMuteBtn() {
  if (!_btnMute) return;
  _btnMute.textContent = _muted ? '🔇' : '🔊';
  _btnMute.setAttribute('aria-pressed', String(_muted));
  _btnMute.setAttribute('aria-label', _muted ? 'Pulihkan suara' : 'Bisukan suara');
}
