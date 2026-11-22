/**
 * CUMA GARIS. — Episode Interaktif
 * main.js — Bootstrap & wiring semua modul (Fase 1)
 *
 * Urutan inisialisasi:
 * 1. Muat episode.json (assets.loadEpisodeData)
 * 2. Inisialisasi subtitle renderer (subtitleTrack.initSubtitleTrack)
 * 3. Buat state machine (stateMachine.createStateMachine)
 * 4. Inisialisasi scenePlayer (scenePlayer.initScenePlayer)
 * 5. Inisialisasi stub overlays (stubs.initStubs)
 * 6. Pasang handler tombol intro
 */

import { loadEpisodeData, getEpisodeData }  from './assets.js';
import { initSubtitleTrack }                from './subtitleTrack.js';
import { createStateMachine, STATE }        from './stateMachine.js';
import {
  initScenePlayer,
  startFromScene0,
}                                           from './scenePlayer.js';
import { initStubs, showBranchStub }        from './stubs.js';

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

  // Simpan teks trigger branch ke window agar stubs bisa membacanya
  window.__branchTriggerText = episodeData.branch?.triggerText ?? 'GILIRANMU — Lawan Coretan Liar!';

  // 2. Inisialisasi subtitle renderer
  initSubtitleTrack();

  // 3. Buat state machine
  const sm = createStateMachine({
    onTransition: ({ from, to, paused, sceneIndex, reason }) => {
      _syncUI(sm);
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
      showBranchStub();
    },
  });

  // 5. Inisialisasi stub overlays (Fase 3–4 akan mengganti ini)
  initStubs(sm, () => {
    // Dipanggil saat "Main Lagi" dari end card → state sudah di BRANCH
    _syncUI(sm);
    showBranchStub();
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

  // Sembunyikan kontrol di state non-playing
  const showControls = state === STATE.PLAYING || state === STATE.INTRO;
  controls.style.visibility = showControls ? 'visible' : 'visible'; // selalu visible

  // Label tombol play/pause
  if (btnPlay) {
    btnPlay.textContent = paused ? '▶' : '⏸';
    btnPlay.setAttribute('aria-label', paused ? 'Lanjutkan (Spasi)' : 'Jeda (Spasi)');
    btnPlay.disabled = (state !== STATE.PLAYING);
  }
  if (btnSkip) {
    btnSkip.disabled = (state !== STATE.PLAYING);
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
