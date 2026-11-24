/**
 * CUMA GARIS. — Episode Interaktif
 * lang.js — Bahasa subtitle & UI (Fase 6)
 *
 * Dua bahasa: 'id' (Bahasa Indonesia, bahasa narasi audio) dan 'en'
 * (Inggris). Default 'en' untuk paket submission Devpost: juri membaca
 * subtitle Inggris sementara audio narasi tetap Bahasa Indonesia —
 * format anime bersubtitle.
 *
 * Teks cerita dwibahasa hidup di data/episode.json (field *En di samping
 * field Indonesia). Modul ini hanya menyimpan state bahasa, memilih
 * varian teks yang tepat, dan menyediakan kamus string UI yang
 * di-hardcode di modul-modul lain.
 */

// ---- State ---------------------------------------------------

let _lang = 'en';            // 'en' | 'id' — default paket submission
const _listeners = [];

/** Bahasa aktif saat ini: 'en' atau 'id'. */
export function getLang() {
  return _lang;
}

/**
 * Ganti bahasa dan beri tahu semua listener terdaftar.
 * @param {'en'|'id'} lang
 */
export function setLang(lang) {
  if (lang !== 'en' && lang !== 'id') return;
  if (lang === _lang) return;
  _lang = lang;
  _listeners.forEach(fn => {
    try { fn(_lang); } catch (_) { /* listener rusak tidak boleh mematikan UI */ }
  });
}

/**
 * Daftarkan listener perubahan bahasa.
 * @param {function('en'|'id'): void} fn
 * @returns {function(): void} fungsi unsubscribe
 */
export function onLangChange(fn) {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

// ---- Pemilihan teks dari episode.json ------------------------

/**
 * Teks segmen narasi sesuai bahasa aktif.
 * Segmen: { text, textEn?, startSec, endSec }.
 * Jatuh ke teks Indonesia bila varian Inggris tidak ada.
 */
export function segText(seg) {
  if (!seg) return '';
  return _lang === 'en' ? (seg.textEn || seg.text || '') : (seg.text || '');
}

/**
 * Pilih varian dwibahasa generik: pick(obj, 'triggerText') membaca
 * obj.triggerTextEn saat bahasa Inggris aktif.
 */
export function pick(obj, key) {
  if (!obj) return '';
  if (_lang === 'en') return obj[key + 'En'] ?? obj[key] ?? '';
  return obj[key] ?? '';
}

// ---- Kamus string UI (hardcode di modul lain) -----------------

const UI = {
  startDuel:       { id: 'Mulai Duel',            en: 'Start Duel' },
  skipDuel:        { id: '⏭ Lewati Duel',        en: '⏭ Skip Duel' },
  paused:          { id: 'JEDA',                  en: 'PAUSED' },
  win:             { id: 'MENANG!',               en: 'YOU WIN!' },
  survive:         { id: 'BERTAHAN!',             en: 'YOU SURVIVED!' },
  clawIncoming:    { id: '⚠ CAKAR TURUN!',        en: '⚠ CLAW INCOMING!' },
  enemyName:       { id: 'Coretan Liar',          en: 'Wild Scribble' },
  playNarration:   { id: '🔈 Putar Narasi',       en: '🔈 Play Narration' },
  sceneUnavailable:{ id: '[ Adegan tidak tersedia — narasi tetap berjalan ]',
                     en: '[ Scene unavailable — the narration continues ]' },
  resultLabel:     { id: 'Hasil',                 en: 'Result' },
  outcomeWin:      { id: 'MENANG',                en: 'WIN' },
  outcomeSurvive:  { id: 'BERTAHAN',              en: 'SURVIVED' },
  introSeries:     { id: 'Episode 1 — "Kebangun Jadi Garis"',
                     en: 'Episode 1 — "Woke Up as a Line"' },
  introSub:        { id: 'Episode anime interaktif ±1 menit',
                     en: 'An interactive anime episode, ±1 minute' },
  startEpisode:    { id: '▶ Mulai Episode',       en: '▶ Start Episode' },
  langToggleLabel: { id: 'Subtitle: EN',          en: 'Subtitle: EN' },
};

/** String UI sesuai bahasa aktif. */
export function ui(key) {
  const entry = UI[key];
  return entry ? entry[_lang] : key;
}

/** Label tombol toggle: menunjukkan bahasa subtitle yang AKTIF. */
export function langToggleText() {
  return _lang === 'en' ? 'EN' : 'ID';
}

/** Ringkasan hasil duel (endings.js) sesuai bahasa aktif. */
export function summaryText(outcome, durSec, hp) {
  if (_lang === 'en') {
    return outcome === 'menang'
      ? `You won in ${durSec} seconds — HP remaining ${hp}`
      : `You survived ${durSec} seconds — HP remaining ${hp}`;
  }
  return outcome === 'menang'
    ? `Kamu menang dalam ${durSec} detik — HP tersisa ${hp}`
    : `Kamu bertahan ${durSec} detik — HP tersisa ${hp}`;
}
