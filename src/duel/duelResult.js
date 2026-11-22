/**
 * CUMA GARIS. — Episode Interaktif
 * duel/duelResult.js — Kontrak hasil duel (Tugas 3.4)
 *
 * Aturan Req 3.4 persis:
 *   - Duel berakhir saat HP salah satu pihak ≤ 0 ATAU timer 45 dtk habis.
 *   - `menang`   : HP musuh ≤ 0, ATAU (timer habis && HP Raka > HP musuh)
 *   - `bertahan` : selain itu (HP Raka ≤ 0, atau timer habis & HP Raka ≤ HP musuh)
 *
 * Fungsi ini murni — hanya menghitung, tidak menyentuh DOM/state machine.
 * Pemanggil (duelGame.js / duelFallback.js) bertanggung jawab memanggil
 * stateMachine.finishDuel(result.outcome) setelah cleanup.
 */

/**
 * Hitung hasil duel.
 *
 * @param {{ hpRaka: number, hpMusuh: number, timerHabis: boolean }} params
 * @returns {{ outcome: 'menang'|'bertahan' }}
 */
export function computeOutcome({ hpRaka, hpMusuh, timerHabis }) {
  if (hpMusuh <= 0) return { outcome: 'menang' };
  if (timerHabis && hpRaka > hpMusuh) return { outcome: 'menang' };
  return { outcome: 'bertahan' };
}
