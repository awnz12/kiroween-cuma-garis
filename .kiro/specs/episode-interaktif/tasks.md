# Tasks — Episode Interaktif CUMA GARIS.

Urutan pengerjaan spec `episode-interaktif`. Kerjakan berurutan; centang
setelah terverifikasi terhadap acceptance criteria di `requirements.md`.
Dikerjakan memakai Kiro (spec-driven) — folder `.kiro` ini adalah bukti
prosesnya, jangan dihapus/di-gitignore.

## Fase 0 — Fondasi repo

- [x] 0.1 Inisialisasi struktur folder sesuai design §1 (`src/`, `assets/`,
      `data/`) + `index.html` kerangka panggung 9:16
- [x] 0.2 `data/episode.json` dari `cerita/naskah-episode.md`: 5 scene,
      titik branch, 2 ending, rentang subtitle per kalimat
- [ ] 0.3 `.gitignore` (node_modules/dist/log) — pastikan `.kiro` TIDAK
      ter-ignore; verifikasi `git status` menampilkan `.kiro/`

## Fase 1 — Pemutar scene (Req 1, 2, 6)

- [x] 1.1 `stateMachine.js`: state INTRO/PLAYING/BRANCH/DUEL/ENDING/
      ENDCARD + PAUSED, transisi berbasis event + timeout pengaman
- [x] 1.2 `scenePlayer.js`: putar klip berurutan, progress bar, indikator
      scene, tombol skip & pause (Req 1.1–1.3, 1.5)
- [x] 1.3 `assets.js`: manifest + preload klip scene berikutnya; fallback
      poster diam bila klip gagal muat (Req 1.4, 6.2)
- [x] 1.4 `subtitleTrack.js` + overlay subtitle sinkron per kalimat,
      posisi bawah, aman di lebar 360 px (Req 2.2, 5.4)
- [x] 1.5 Integrasi audio narasi per scene + toggle mute + tombol
      "Putar Narasi" bila autoplay audio terblokir (Req 2.1, 2.3, 2.4)
- [x] 1.6 Tata letak vertical-first: panggung 9:16 terpusat, latar
      dekoratif desktop, kontrol jangkauan jempol (Req 5.1–5.3)

## Fase 2 — Aset episode (pipeline anime-episode-assembly)

- [x] 2.1 Klip Scene 1–5 dari lembar desain Raka (jangkar konsistensi),
      arahan gerak luwes natural; Scene 5 mengacu klip tes anti-sihir
- [x] 2.2 Klip Ending A dan Ending B (Scene 6 dua varian penuh)
- [x] 2.3 Narasi TTS Bahasa Indonesia per kalimat dari naskah disetujui;
      gabung per scene; catat durasi ke `episode.json`
- [x] 2.4 Kompresi klip (target ≤ 6 MB/klip) + ekstrak poster fallback

## Fase 3 — Mini-game duel (Req 3)

- [x] 3.1 `duelGame.js`: scene Three.js arena pasar, Raka garis + pedang
      menyala, Coretan Liar gumpalan tinta + cakar raksasa
- [x] 3.2 Sistem pertarungan: HP dua pihak, 3 aksi (Ayun/Perisai/Kait +
      cooldown), serangan balik ber-telegraph ≥ 600 ms
- [x] 3.3 Input ganda: tombol sentuh + keyboard (spasi/S/K); timer 45 dtk
- [x] 3.4 `duelResult.js`: kontrak hasil `{ outcome }` sesuai aturan
      Req 3.4; duel berhenti bersih dan canvas dilepas
- [x] 3.5 `duelFallback.js`: mode quick-time button bila WebGL absen,
      aturan hasil identik (Req 3.5)
- [x] 3.6 Overlay branch point: freeze frame Scene 5 + "GILIRANMU —
      Lawan Coretan Liar!" lalu duel mulai (Req 3.1)

## Fase 4 — Percabangan ending (Req 4)

- [ ] 4.1 `endings.js`: petakan hasil duel → Ending A/B dari
      `episode.json`; putar klip + narasi varian yang benar
- [ ] 4.2 End card per varian: teks "BERSAMBUNG — Episode 2", ringkasan
      hasil duel, tombol "Main Lagi" → kembali ke BRANCH (Req 4.4)

## Fase 5 — Verifikasi & poles

- [ ] 5.1 Checklist acceptance criteria Req 1–6 satu per satu (Chrome
      Android vertikal, Chrome desktop, WebGL off, audio terblokir)
- [ ] 5.2 Uji tanpa suara: subtitle saja menjelaskan cerita utuh
- [ ] 5.3 Ukur beban awal ≤ 2 MB di luar klip; layar pertama ≤ 3 dtk
      (Req 6.2–6.3); perbaiki regresi
- [ ] 5.4 Transisi antar-state dipoles: tanpa layar hitam > 500 ms,
      tanpa lompatan audio

## Fase 6 — Submission Kiroween

- [ ] 6.1 README final: write-up pemakaian Kiro (specs, steering, hooks)
      + disclosure kode/pipeline lama (Req 7.3)
- [ ] 6.2 Deploy situs statis (GitHub Pages) dan uji URL publik dari
      perangkat lain
- [ ] 6.3 Video demo < 3 menit mengikuti outline di README; upload
      YouTube publik (langkah user)
- [ ] 6.4 Repo dibuat publik (langkah user membuat repo; agen push),
      `.kiro` ter-commit; isi semua field Devpost; dry-run checklist
- [ ] 6.5 Submit final di Devpost sebelum 5 Des 2026 05:00 WIB
      (target internal 4 Des)
