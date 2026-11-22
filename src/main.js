/**
 * CUMA GARIS. — Episode Interaktif
 * main.js — Bootstrap & wiring semua modul (Fase 1 + Fase 3)
 *
 * Urutan inisialisasi:
 * 1. Muat episode.json (assets.loadEpisodeData)
 * 2. Inisialisasi subtitle renderer (subtitleTrack.initSubtitleTrack)
 * 3. Buat state machine (stateMachine.createStateMachine)
 * 4. Inisialisasi scenePlayer (scenePlayer.initScenePlayer)
 * 5. Inisialisasi stubs/branch overlay (stubs.initStubs)
 * 6. Pasang handler tombol intro
 */

import { loadEpisodeData, getEpisodeData }  from './assets.js';
import { initSubtitleTrack }                from './subtitleTrack.js';
import { createStateMachine, STATE }        from './stateMachine.js';
import {
  initScenePlayer,
  startFromScene0,
}                                           from './scenePlayer.js';
import {
  initStubs,
  showBranchOverlay,
  showEndCardStub,
}                                           from './stubs.js';

// ---- Bootstrap ---------------------------------------------

async function boot() {
  // 1. Muat data episode
  let episodeData;
  try {
    episodeData = await loadEpisodeData();
  } catch (err) {
    console.error('[main] Gagal memuat episode.json:', err);
    _showFatalError('Gagal memuat data episode. Periksa koneksi dan muat ulang halaman.');
    return;
  }

  // 2. Inisialisasi subtitle renderer
  initSubtitleTrack();

  // 3. Buat state machine
  const sm = createStateMachine({
    onTransition: ({ from, to, paused, sceneIndex, reason }) => {
      _syncUI(sm);

      // Saat state masuk DUEL dan berubah ke PAUSED/resume,
      // teruskan ke duelGame lewat window handles yang didaftarkan stubs.js
      if (from === STATE.DUEL && paused) {
        window.__duelPause?.();
      }
      if (from === STATE.DUEL && !paused && to === STATE.DUEL) {
        window.__duelResume?.();
      }
    },
  });

  // 4. Inisialisasi scenePlayer
  initScenePlayer({
    scenes:       episodeData.scenes,
    stateMachine: sm,
    onAllDone:    () => {
      // Semua Scene 1–5 selesai → pindah ke BRANCH
      sm.goToBranch('scenePlayer onAllDone');
      _syncUI(sm);
      showBranchOverlay();
    },
  });

  // 5. Inisialisasi stubs/branch overlay (Fase 3)
  //    Teruskan episodeData agar teks diambil dari JSON, bukan hardcode.
  initStubs(sm, episodeData, () => {
    // Dipanggil saat "Main Lagi" dari end card → state sudah di BRANCH
    _syncUI(sm);
    showBranchOverlay();
  });

  // 6. Pasang handler tombol "Mulai Episode"
  const introScreen = document.getElementById('intro-screen');
  const btnStart    = document.getElementById('btn-start');

  if (btnStart && introScreen) {
    btnStart.addEventListener('click', () => {
      introScreen.style.display = 'none';
      sm.startEpisode();
      startFromScene0();
      _syncUI(sm);
    });
  }

  // Siapkan UI awal
  _syncUI(sm);

  console.log('[main] CUMA GARIS. Episode Interaktif — siap.');
}

// ---- Sinkronisasi UI berdasarkan state ---------------------

function _syncUI(sm) {
  const state    = sm.getState();
  const paused   = sm.isPaused();
  const controls = document.getElementById('controls');
  const btnPlay  = document.getElementById('btn-play');
  const btnSkip  = document.getElementById('btn-skip');

  if (!controls) return;

  // Label tombol play/pause
  if (btnPlay) {
    btnPlay.textContent = paused ? '▶' : '⏸';
    btnPlay.setAttribute('aria-label', paused ? 'Lanjutkan (Spasi)' : 'Jeda (Spasi)');
    // Aktifkan tombol play juga saat DUEL (untuk pause duel)
    btnPlay.disabled = (state !== STATE.PLAYING && state !== STATE.DUEL);
  }
  if (btnSkip) {
    btnSkip.disabled = (state !== STATE.PLAYING);
  }

  // Tombol play juga mengendalikan pause duel
  if (!btnPlay.__duelPauseWired) {
    btnPlay?.__proto__; // akses dummy agar tidak ada error
    // Wire ulang handler setelah init
    const existing = btnPlay?._duelHandler;
    if (!existing && btnPlay) {
      btnPlay._duelHandler = () => {
        if (sm.getState() === STATE.DUEL) {
          if (sm.isPaused()) {
            sm.togglePause(false);
          } else {
            sm.togglePause(true);
          }
        }
      };
      btnPlay.addEventListener('click', btnPlay._duelHandler);
      btnPlay.__duelPauseWired = true;
    }
  }
}

// ---- Pesan error fatal -------------------------------------

function _showFatalError(msg) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div style="
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100dvh;padding:2rem;text-align:center;gap:1rem;color:#f0f0f5;
    ">
      <p style="font-size:1.1rem;color:#e74c3c;">⚠ Error</p>
      <p style="max-width:30ch;">${msg}</p>
    </div>
  `;
}

// ---- Mulai -------------------------------------------------

document.addEventListener('DOMContentLoaded', boot);
