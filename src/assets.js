/**
 * CUMA GARIS. — Episode Interaktif
 * assets.js — Manifest aset + preload klip scene berikutnya (Req 1.4, 6.2)
 *
 * Prinsip:
 * - Sumber kebenaran = data/episode.json (tidak ada path di-hardcode di sini).
 * - Klip scene n+1 di-preload selama scene n diputar.
 * - Bila klip gagal muat → tandai sebagai failed; pemanggil menampilkan
 *   fallback poster diam + teks narasi; alur tetap jalan (tidak throw).
 * - Total JS/CSS awal harus ≤ 2 MB; file ini sendiri sangat kecil.
 */

// ---- Manifest aset (diisi dari episode.json) ----------------

/** @type {Map<string, HTMLVideoElement>} klip yang sudah di-preload */
const _preloadCache = new Map();

/** @type {Set<string>} klip yang gagal dimuat */
const _failedClips  = new Set();

/** @type {object|null} data episode.json yang sudah diparse */
let _episodeData = null;

/**
 * Muat dan simpan data episode.json.
 * Harus dipanggil sekali di bootstrap (main.js) sebelum fungsi lain.
 *
 * @returns {Promise<object>} data episode
 */
export async function loadEpisodeData() {
  if (_episodeData) return _episodeData;
  const res = await fetch('data/episode.json');
  if (!res.ok) throw new Error(`Gagal mengambil episode.json: ${res.status}`);
  _episodeData = await res.json();
  return _episodeData;
}

/**
 * Mengembalikan data episode yang sudah dimuat.
 * Lempar jika loadEpisodeData() belum dipanggil.
 */
export function getEpisodeData() {
  if (!_episodeData) throw new Error('episode.json belum dimuat; panggil loadEpisodeData() dulu.');
  return _episodeData;
}

// ---- Preload klip -------------------------------------------

/**
 * Preload satu klip video secara background.
 * Jika klip sudah di-cache atau gagal sebelumnya, langsung return.
 *
 * @param {string} src - path klip, misal "assets/clips/scene-2.mp4"
 * @returns {Promise<HTMLVideoElement>} elemen video yang sudah siap
 */
export function preloadClip(src) {
  if (_preloadCache.has(src)) return Promise.resolve(_preloadCache.get(src));
  if (_failedClips.has(src))  return Promise.reject(new Error(`Klip sebelumnya gagal: ${src}`));

  return new Promise((resolve, reject) => {
    const vid = document.createElement('video');
    vid.preload    = 'auto';
    vid.muted      = true;
    vid.playsinline = true;
    vid.style.display = 'none';
    // Tidak perlu ditambahkan ke DOM untuk preload;
    // browser modern tetap memuat buffer meski elemen off-screen.
    // (beberapa browser butuh di-append ke body — tambahkan jika perlu)
    document.body.appendChild(vid);

    const onReady = () => {
      vid.removeEventListener('canplaythrough', onReady);
      vid.removeEventListener('error', onError);
      _preloadCache.set(src, vid);
      console.debug(`[assets] Preload selesai: ${src}`);
      resolve(vid);
    };
    const onError = (e) => {
      vid.removeEventListener('canplaythrough', onReady);
      vid.removeEventListener('error', onError);
      _failedClips.add(src);
      document.body.removeChild(vid);
      console.warn(`[assets] Gagal preload klip: ${src}`, e);
      reject(new Error(`Gagal preload: ${src}`));
    };

    vid.addEventListener('canplaythrough', onReady);
    vid.addEventListener('error', onError);
    vid.src = src;
    vid.load();
  });
}

/**
 * Preload klip scene berikutnya (scene n+1) selama scene n diputar.
 * Merupakan "fire and forget" — error ditangkap secara diam-diam agar tidak
 * mengganggu pemutaran scene yang sedang berjalan.
 *
 * @param {number} currentSceneIndex - indeks scene saat ini (0-based)
 */
export function preloadNextScene(currentSceneIndex) {
  const data = _episodeData;
  if (!data) return;
  const next = data.scenes[currentSceneIndex + 1];
  if (!next) return; // scene terakhir, tidak ada yang perlu di-preload
  preloadClip(next.clip).catch(() => {
    // Gagal preload tidak fatal — fallback ditangani oleh scenePlayer
  });
}

/**
 * Mengembalikan elemen video dari cache jika tersedia,
 * atau null jika belum di-preload / gagal.
 *
 * @param {string} src
 * @returns {HTMLVideoElement|null}
 */
export function getCachedClip(src) {
  return _preloadCache.get(src) ?? null;
}

/**
 * Periksa apakah klip diketahui gagal dimuat.
 * @param {string} src
 * @returns {boolean}
 */
export function isClipFailed(src) {
  return _failedClips.has(src);
}

/**
 * Tandai klip sebagai gagal secara manual
 * (misalnya ketika elemen video utama melempar error saat diputar).
 * @param {string} src
 */
export function markClipFailed(src) {
  _failedClips.add(src);
}
