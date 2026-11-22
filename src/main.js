/**
 * CUMA GARIS. — Episode Interaktif
 * main.js — Bootstrap / entry point
 *
 * Fase 0: placeholder bootstrap.
 * Fase 1+ akan meng-import dan menginisialisasi modul-modul:
 *   stateMachine, scenePlayer, subtitleTrack, assets, duel, endings.
 */

console.log('CUMA GARIS. — Episode Interaktif');

// Placeholder: tombol "Mulai Episode" menyembunyikan intro screen.
// Implementasi state machine penuh ada di Fase 1 (stateMachine.js).
document.addEventListener('DOMContentLoaded', () => {
  const introScreen = document.getElementById('intro-screen');
  const btnStart    = document.getElementById('btn-start');
  const btnPlay     = document.getElementById('btn-play');
  const btnSkip     = document.getElementById('btn-skip');
  const btnMute     = document.getElementById('btn-mute');

  if (btnStart && introScreen) {
    btnStart.addEventListener('click', () => {
      introScreen.style.display = 'none';
      console.log('[bootstrap] Episode dimulai — state machine belum diimplementasi (Fase 1).');
    });
  }

  // Placeholder handler kontrol — akan diganti scenePlayer di Fase 1
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      console.log('[bootstrap] play/pause (placeholder)');
    });
  }
  if (btnSkip) {
    btnSkip.addEventListener('click', () => {
      console.log('[bootstrap] skip scene (placeholder)');
    });
  }
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      console.log('[bootstrap] toggle mute (placeholder)');
    });
  }
});
