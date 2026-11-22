/**
 * CUMA GARIS. — Episode Interaktif
 * subtitleTrack.js — Renderer subtitle sinkron per kalimat (Req 2.2, 5.4)
 *
 * - Teks subtitle diambil verbatim dari episode.json (rentang startSec/endSec
 *   per kalimat dalam narration[] setiap scene).
 * - Posisi: overlay bawah area klip (#subtitle-overlay), aman 360 px.
 * - Font berbasis container query (cqw) — terikat lebar .stage, bukan viewport.
 * - Mute audio TIDAK menghentikan subtitle (subtitle digerakkan oleh waktu
 *   scene, bukan oleh event audio).
 */

// ---- Referensi DOM -----------------------------------------

let _subtitleTextEl  = null;   // <span id="subtitle-text">
let _overlayEl       = null;   // <div id="subtitle-overlay">

// ---- State internal ----------------------------------------

let _segments   = [];          // array { text, startSec, endSec } scene aktif
let _sceneStart = 0;           // Date.now() saat scene dimulai (ms)
let _rafId      = null;        // requestAnimationFrame handle
let _currentIdx = -1;          // indeks segmen yang sedang ditampilkan

// ---- Inisialisasi ------------------------------------------

/**
 * Hubungkan subtitleTrack ke elemen DOM.
 * Panggil sekali dari main.js setelah DOMContentLoaded.
 */
export function initSubtitleTrack() {
  _subtitleTextEl = document.getElementById('subtitle-text');
  _overlayEl      = document.getElementById('subtitle-overlay');
  if (!_subtitleTextEl || !_overlayEl) {
    console.warn('[subtitle] Elemen DOM subtitle tidak ditemukan.');
  }
}

// ---- API publik --------------------------------------------

/**
 * Mulai lacak dan tampilkan subtitle untuk scene yang sedang diputar.
 *
 * @param {Array}  narration   - array { text, startSec, endSec } dari episode.json
 * @param {number} sceneOffsetSec - waktu global scene (startSec scene), 
 *   dipakai untuk menghitung offset relatif per segmen. Jika 0, startSec
 *   segmen sudah relatif.
 * @param {number} [nowSec=0]  - posisi playback saat ini di dalam scene (detik),
 *   dipakai bila scene di-seek/skip ke tengah.
 */
export function startSubtitles(narration, sceneOffsetSec = 0, nowSec = 0) {
  stopSubtitles();

  // Normalisasi: konversi startSec/endSec ke waktu relatif dalam scene
  _segments = (narration || []).map(seg => ({
    text:     seg.text,
    startSec: seg.startSec - sceneOffsetSec,
    endSec:   seg.endSec   - sceneOffsetSec,
  }));

  // Waktu referensi: scene dimulai nowSec detik yang lalu
  _sceneStart = Date.now() - nowSec * 1000;
  _currentIdx = -1;

  _tick();
}

/**
 * Hentikan pelacakan subtitle dan kosongkan teks.
 */
export function stopSubtitles() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  _segments   = [];
  _currentIdx = -1;
  _setText('');
}

/**
 * Perbarui segmen subtitle secara paksa berdasarkan posisi scene saat ini.
 * Berguna saat skip scene (mulai dari tengah).
 *
 * @param {number} nowSec - detik saat ini dalam scene
 */
export function seekSubtitles(nowSec) {
  _sceneStart = Date.now() - nowSec * 1000;
  // Loop rAF sudah berjalan; akan pick up posisi baru pada tick berikutnya.
}

// ---- Loop internal -----------------------------------------

function _tick() {
  const elapsed = (Date.now() - _sceneStart) / 1000; // detik relatif dalam scene

  // Cari segmen yang cocok dengan waktu saat ini
  let found = -1;
  for (let i = 0; i < _segments.length; i++) {
    const seg = _segments[i];
    if (elapsed >= seg.startSec && elapsed < seg.endSec) {
      found = i;
      break;
    }
  }

  if (found !== _currentIdx) {
    _currentIdx = found;
    _setText(found >= 0 ? _segments[found].text : '');
  }

  _rafId = requestAnimationFrame(_tick);
}

function _setText(text) {
  if (!_subtitleTextEl) return;
  _subtitleTextEl.textContent = text;

  // Sembunyikan overlay bila tidak ada teks (hindari background kosong)
  if (_overlayEl) {
    _overlayEl.style.visibility = text ? 'visible' : 'hidden';
  }
}
