/**
 * CUMA GARIS. — Episode Interaktif
 * endings.js — Pemilih & pemutar Ending A / Ending B (Fase 4, Tugas 4.1–4.2)
 *
 * Alur (design §2 & §5, Req 4):
 *   duel selesai → state machine sudah di ENDING (finishDuel oleh duel)
 *   → playEnding(outcome, stats) memetakan outcome ke varian ending lewat
 *     episode.json `branch.outcomes` (menang → ending-a, bertahan → ending-b)
 *   → klip + narasi + subtitle varian itu diputar di panggung yang sama
 *   → klip selesai / timeout pengaman → sm.showEndCard() (state ENDCARD)
 *   → end card per varian dari episode.json `endCard` + ringkasan hasil duel
 *   → tombol "Main Lagi" → sm.replayFromEndCard() (→ BRANCH, Req 4.4)
 *
 * Semua teks cerita & pemetaan dibaca dari episode.json — tidak ada teks
 * narasi yang di-hardcode di sini. Satu-satunya teks yang dibangun kode
 * adalah baris ringkasan duel (dari angka statistik duel, design §5).
 *
 * Pola pemutaran meniru scenePlayer: video muted di #main-video, narasi
 * lewat elemen <audio> terpisah, poster diam sebagai fallback bila klip
 * gagal, timeout pengaman = durasi klip + 2 dtk (design §7).
 */

import {
  startSubtitles,
  stopSubtitles,
} from './subtitleTrack.js';

// ---- Konstanta ----------------------------------------------

// Klip ending berdurasi 10 dtk (terverifikasi dari aset Fase 2);
// timeout pengaman = durasi klip + 2 dtk, pola yang sama seperti scene.
const ENDING_CLIP_SEC   = 10;
const SAFETY_TIMEOUT_MS = (ENDING_CLIP_SEC + 2) * 1000;

// ---- Referensi modul ----------------------------------------

let _sm           = null;
let _episodeData  = null;
let _onReplay     = null;    // callback main.js: tampilkan overlay branch lagi

let _videoEl      = null;    // <video id="main-video"> (dipakai bergantian dengan scenePlayer)
let _fallbackEl   = null;    // <div id="clip-fallback">
let _overlayEl    = null;    // <div id="stub-overlay"> (end card dirender di sini)

// ---- State pemutaran ending ---------------------------------

let _audioEl      = null;    // <audio> narasi ending aktif
let _safetyTimer  = null;
let _endLocked    = false;   // guard: _finishEnding hanya boleh jalan sekali
let _fallbackMode = false;
let _curEnding    = null;    // definisi ending aktif dari episode.json
let _curOutcome   = null;    // 'menang' | 'bertahan'
let _curStats     = null;    // { hpRaka, hpMusuh, durationSec } dari duel

// ---- Inisialisasi ------------------------------------------

/**
 * Inisialisasi modul endings.
 *
 * @param {object}   stateMachine
 * @param {object}   episodeData  - data episode.json yang sudah diparse
 * @param {Function} onReplay     - dipanggil setelah "Main Lagi" (state sudah
 *                                  kembali ke BRANCH) agar main.js menampilkan
 *                                  overlay branch lagi
 */
export function initEndings(stateMachine, episodeData, onReplay) {
  _sm          = stateMachine;
  _episodeData = episodeData;
  _onReplay    = onReplay;

  _videoEl    = document.getElementById('main-video');
  _fallbackEl = document.getElementById('clip-fallback');

  _overlayEl = document.getElementById('stub-overlay');
  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'stub-overlay';
    _overlayEl.setAttribute('role', 'dialog');
    _overlayEl.setAttribute('aria-modal', 'true');
    _overlayEl.style.display = 'none';
    document.querySelector('.stage')?.appendChild(_overlayEl);
  }
}

// ---- Pemutaran ending (Tugas 4.1) ---------------------------

/**
 * Putar ending sesuai hasil duel.
 * Dipanggil oleh stubs.js dari onDone duel — state machine SUDAH di ENDING.
 *
 * @param {'menang'|'bertahan'} outcome
 * @param {{hpRaka:number, hpMusuh:number, durationSec:number}} [stats]
 */
export function playEnding(outcome, stats) {
  _clearEnding();
  _endLocked    = false;
  _fallbackMode = false;
  _curOutcome   = outcome;
  _curStats     = stats || null;

  // Petakan outcome → definisi ending lewat episode.json (bukan hardcode)
  const ending = _resolveEnding(outcome);
  if (!ending) {
    console.error('[endings] Definisi ending tidak ditemukan di episode.json.');
    // Jalan aman: jangan macet di layar kosong — langsung end card minimal.
    _curEnding = null;
    _finishEnding();
    return;
  }
  _curEnding = ending;

  console.debug(
    `[endings] Putar ${ending.id} (${ending.variant}) untuk outcome=${outcome}`
  );

  // ---- Siapkan video ----------------------------------------
  _videoEl.poster = ending.poster || '';
  _videoEl.src    = ending.clip;
  _videoEl.currentTime = 0;

  _videoEl.addEventListener('error', _onVideoError, { once: true });
  _videoEl.addEventListener('canplay', _onCanPlay, { once: true });
  _videoEl.addEventListener('ended', _onClipEnded, { once: true });

  // ---- Narasi audio + subtitle -------------------------------
  _loadAudio(ending);
  startSubtitles(ending.narration, 0);

  // ---- Timeout pengaman --------------------------------------
  _safetyTimer = setTimeout(() => {
    console.debug('[endings] Safety timeout — akhiri pemutaran ending.');
    _finishEnding();
  }, SAFETY_TIMEOUT_MS);
}

/**
 * Petakan outcome duel → definisi ending dari episode.json.
 * Mengikuti branch.outcomes; bila pemetaan rusak, jatuh ke varian bertahan
 * sebagai jalan aman (design §7: kegagalan tidak boleh mematikan alur).
 */
function _resolveEnding(outcome) {
  const endings = _episodeData?.endings || [];
  const mappedId = _episodeData?.branch?.outcomes?.[outcome];
  let ending = endings.find(e => e.id === mappedId);
  if (ending) return ending;

  console.error(
    `[endings] Pemetaan outcome "${outcome}" → "${mappedId}" tidak ditemukan; ` +
    'jatuh ke varian bertahan.'
  );
  const fallbackId = _episodeData?.branch?.outcomes?.bertahan;
  ending = endings.find(e => e.id === fallbackId) || endings[1] || endings[0];
  return ending || null;
}

// ---- Event video --------------------------------------------

function _onVideoError() {
  if (_endLocked) return;
  console.warn(`[endings] Klip gagal dimuat: ${_curEnding?.clip}`);
  _fallbackMode = true;
  _showFallback(_curEnding);
  // Alur tetap jalan: subtitle + narasi lanjut, timeout pengaman mengakhiri.
}

function _onCanPlay() {
  if (_fallbackMode || _endLocked) return;
  _videoEl.play().catch((err) => {
    console.warn('[endings] Autoplay video diblokir:', err);
    // Narasi & subtitle tetap berjalan; timeout pengaman mengakhiri.
  });
}

function _onClipEnded() {
  _finishEnding();
}

// ---- Audio narasi --------------------------------------------

function _loadAudio(ending) {
  if (!ending?.audio) return;

  _audioEl = document.createElement('audio');
  _audioEl.src     = ending.audio;
  _audioEl.preload = 'auto';
  _audioEl.style.display = 'none';
  document.body.appendChild(_audioEl);

  _audioEl.addEventListener('error', () => {
    console.warn(`[endings] Audio narasi gagal dimuat: ${ending.audio}`);
  }, { once: true });

  _audioEl.addEventListener('canplaythrough', () => {
    _audioEl.play().catch((err) => {
      // Autoplay audio terblokir — subtitle tetap menyampaikan cerita.
      console.warn('[endings] Autoplay audio diblokir:', err);
    });
  }, { once: true });

  _audioEl.load();
}

function _teardownAudio() {
  if (_audioEl) {
    _audioEl.pause();
    _audioEl.src = '';
    _audioEl.remove();
    _audioEl = null;
  }
}

// ---- Fallback poster diam (design §7) -------------------------

function _showFallback(ending) {
  if (!_fallbackEl || !ending) return;
  const allText = (ending.narration || []).map(s => s.text).join(' ');
  const inner = _fallbackEl.querySelector('span') || _fallbackEl;
  inner.textContent = allText || '[ Adegan tidak tersedia — narasi tetap berjalan ]';
  if (ending.poster) {
    _fallbackEl.style.backgroundImage    = `url("${ending.poster}")`;
    _fallbackEl.style.backgroundSize     = 'cover';
    _fallbackEl.style.backgroundPosition = 'center';
  }
  _fallbackEl.style.display = 'flex';
  if (_videoEl) _videoEl.style.visibility = 'hidden';
}

function _hideFallback() {
  if (_fallbackEl) {
    _fallbackEl.style.display = 'none';
    _fallbackEl.style.backgroundImage = '';
  }
  if (_videoEl) _videoEl.style.visibility = 'visible';
}

// ---- Akhir pemutaran → end card (Tugas 4.2) -------------------

function _finishEnding() {
  if (_endLocked) return;
  _endLocked = true;

  if (_safetyTimer !== null) {
    clearTimeout(_safetyTimer);
    _safetyTimer = null;
  }
  stopSubtitles();
  _teardownAudio();
  _hideFallback();
  if (_videoEl) {
    _videoEl.removeEventListener('ended', _onClipEnded);
    _videoEl.pause();
  }

  // State ENDING → ENDCARD, lalu render end card varian ini
  _sm.showEndCard();
  _showEndCard();
}

function _showEndCard() {
  if (!_overlayEl) return;

  const ending  = _curEnding;
  const endCard = ending?.endCard;
  const outcome = _curOutcome;

  const mainText  = endCard?.text        ?? 'BERSAMBUNG — Episode 2 besok.';
  const extraLine = endCard?.extraLine   ?? null;
  const replayLbl = endCard?.replayLabel ?? 'Main Lagi';
  const darkTheme = endCard?.darkTheme   ?? (outcome === 'bertahan');
  const badge     = outcome === 'menang' ? '🏆' : '🌑';
  const summary   = _buildSummary(outcome, _curStats);

  _overlayEl.classList.toggle('ending-dark', !!darkTheme);
  _overlayEl.innerHTML = `
    <div class="stub-content ending-content${darkTheme ? ' stub-dark' : ''}">
      <div class="stub-badge">${badge}</div>
      <h2>${_escHtml(mainText)}</h2>
      ${summary.html}
      ${extraLine ? `<p class="stub-extra">${_escHtml(extraLine)}</p>` : ''}
      <div class="stub-actions">
        <button id="ending-btn-replay" class="ctrl-btn stub-action-btn replay-btn" type="button">
          🔄 ${_escHtml(replayLbl)}
        </button>
      </div>
    </div>
  `;
  _overlayEl.style.display        = 'flex';
  _overlayEl.style.flexDirection  = 'column';
  _overlayEl.style.alignItems     = 'center';
  _overlayEl.style.justifyContent = 'center';

  document.getElementById('ending-btn-replay')?.addEventListener('click', () => {
    _hideEndCard();
    _sm.replayFromEndCard(); // → BRANCH (Req 4.4)
    if (typeof _onReplay === 'function') _onReplay();
  });
}

/**
 * Bangun baris ringkasan hasil duel (design §5).
 * Format: "Kamu menang dalam 24 detik — HP tersisa 40".
 * Tanpa statistik yang valid, jatuh ke label hasil sederhana.
 */
function _buildSummary(outcome, stats) {
  const label = outcome === 'menang' ? 'MENANG' : 'BERTAHAN';
  if (stats && Number.isFinite(stats.durationSec) && Number.isFinite(stats.hpRaka)) {
    const dur = Math.max(0, Math.round(stats.durationSec));
    const hp  = Math.max(0, Math.round(stats.hpRaka));
    const text = outcome === 'menang'
      ? `Kamu menang dalam ${dur} detik — HP tersisa ${hp}`
      : `Kamu bertahan ${dur} detik — HP tersisa ${hp}`;
    return { html: `<p class="ending-summary">${_escHtml(text)}</p>` };
  }
  return { html: `<p class="stub-label">Hasil: ${label}</p>` };
}

function _hideEndCard() {
  if (!_overlayEl) return;
  _overlayEl.style.display = 'none';
  _overlayEl.classList.remove('ending-dark');
}

// ---- Pembersihan ----------------------------------------------

function _clearEnding() {
  if (_safetyTimer !== null) {
    clearTimeout(_safetyTimer);
    _safetyTimer = null;
  }
  stopSubtitles();
  _teardownAudio();
  _hideFallback();
  if (_videoEl) {
    _videoEl.removeEventListener('error', _onVideoError);
    _videoEl.removeEventListener('canplay', _onCanPlay);
    _videoEl.removeEventListener('ended', _onClipEnded);
    _videoEl.pause();
    _videoEl.src = '';
  }
}

// ---- Helper ----------------------------------------------------

/** Escape string untuk isi innerHTML (mencegah XSS dari JSON). */
function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
