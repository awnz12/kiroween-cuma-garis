# Design — Episode Interaktif CUMA GARIS.

Dokumen desain teknis. Pasangan: `requirements.md` (apa) dan `tasks.md`
(urutan pengerjaan). Prinsip utama: **aplikasi web statis murni**, tanpa
backend, tanpa build step wajib (vanilla JS + Three.js via CDN/module),
supaya URL demo bisa di-host di mana saja dan dibuka juri tanpa login.

## 1. Arsitektur umum

```
index.html            — satu halaman, panggung 9:16 di tengah viewport
src/
  main.js             — bootstrap, wiring state machine
  stateMachine.js     — alur: intro → scene → branch → duel → ending → card
  scenePlayer.js      — pemutar klip + sinkronisasi narasi & subtitle
  subtitleTrack.js    — data & renderer subtitle per kalimat
  duel/
    duelGame.js       — mini-game Three.js (scene, loop, input)
    duelFallback.js   — mode quick-time button bila WebGL absen
    duelResult.js     — kontrak hasil duel { outcome: 'menang'|'bertahan' }
  endings.js          — pemilih & pemutar Ending A / Ending B
  assets.js           — manifest aset + preload + fallback gambar diam
assets/
  clips/              — klip anime per scene & per ending (MP4/WebM vertikal)
  audio/              — narasi TTS per segmen (MP3/OGG)
  images/             — lembar desain (fallback), poster, end card art
data/
  episode.json        — definisi episode: urutan scene, file klip/audio,
                        rentang subtitle, titik branch, dua ending
```

Sumber kebenaran alur cerita = `data/episode.json`, yang isinya diturunkan
dari `cerita/naskah-episode.md`. Mengubah cerita = mengubah JSON + aset,
bukan mengubah kode.

## 2. State machine pemutar scene

State: `INTRO → PLAYING(sceneIndex) → BRANCH → DUEL → ENDING(variant) →
ENDCARD`, plus `PAUSED` sebagai overlay state dari PLAYING/DUEL.

- Transisi digerakkan event: `clip.ended`, `narasi.ended` (mana yang lebih
  lambat menentukan akhir scene, dengan timeout pengaman = durasi klip + 2 dtk),
  `duel.finished(result)`, klik user (skip/pause/replay).
- Replay dari end card kembali ke `BRANCH`, bukan `INTRO` (Req 4.4).
- Semua transisi tercatat ke `console.debug` dengan stempel waktu untuk
  memudahkan debugging saat dry-run submission.

## 3. Pipeline aset klip + TTS (reuse pipeline yang sudah ada)

Menggunakan kembali pendekatan **anime-episode-assembly** yang sudah teruji
untuk serial CUMA GARIS. (ffmpeg lokal + TTS Bahasa Indonesia):

1. **Klip anime** dibuat per scene dari lembar desain karakter (jangkar
   konsistensi wajah/pakaian) dengan arahan gerak luwes natural — pose kaku
   hanya di lembar desain, tidak di adegan (aturan baku proyek, lihat
   steering). Klip acuan yang sudah ada: klip tes anti-sihir (pedang Garis)
   untuk Scene 5 dan klip Raka santai di pasar untuk nuansa Scene 2.
2. **Narasi TTS** dihasilkan per kalimat dari naskah yang disetujui, lalu
   digabung per scene; durasi tiap segmen audio dicatat ke `episode.json`.
3. **Subtitle** bukan dibakar ke video untuk versi interaktif ini — dirender
   sebagai overlay DOM dari `subtitleTrack` (sinkron per kalimat, bisa
   di-mute-kan audionya tanpa kehilangan teks). Alasan: satu set klip
   dipakai ulang oleh dua ending dan mode fallback. (Versi TikTok non-
   interaktif tetap memakai subtitle terbakar dari pipeline lama.)
4. **Pengemasan aset**: klip dikompresi vertikal (target ≤ 6 MB per klip),
   poster frame diekstrak sebagai fallback gambar diam (Req 1.4).

Disclosure (syarat Kiroween): pipeline assembly & pola kode mini-game
diadaptasi dari pekerjaan sebelum event (serial CUMA GARIS. dan entry
make.fun FPS-02 "Wardens") — wajib ditulis jujur di README & deskripsi
Devpost. Semua kode aplikasi interaktif, specs, dan integrasinya BARU,
dibuat selama periode event memakai Kiro.

## 4. Integrasi mini-game duel (Three.js)

- Duel dirender di canvas Three.js yang menutupi panggung 9:16 pada state
  `DUEL`; scene 3D sederhana: arena tanah pasar, Raka (model primitif
  bergaya garis merah-hitam + pedang garis menyala), Coretan Liar (gumpalan
  tinta: kumpulan sphere hitam berdenyut + cakar besar).
- Loop pertarungan: HP kedua pihak, 3 aksi pemain (Ayun / Perisai / Kait
  dengan cooldown), serangan balik musuh dengan telegraph visual (cakar
  naik + bayangan membesar ≥ 600 ms) supaya adil dan terbaca.
- Hasil duel dikembalikan lewat kontrak tunggal `duelResult` —
  state machine tidak tahu detail internal game (decoupling; memudahkan
  mengganti game tanpa menyentuh player).
- Fallback WebGL: `duelFallback` mode tombol-waktu dengan aturan hasil
  identik (Req 3.5).

## 5. Logika percabangan ending

```
hasil duel = menang   → Ending A (naskah varian A) + end card A
hasil duel = bertahan → Ending B (naskah varian B) + end card B
```

- Pemetaan hasil → ending didefinisikan di `episode.json` (`branch` block),
  bukan hardcode di JS.
- Kedua ending memakai Scene 6 versi masing-masing: klip, segmen narasi,
  dan teks end card berbeda penuh (Req 4.3).
- Hasil duel juga ditampilkan sebagai ringkasan di end card ("Kamu menang
  dalam 24 detik — HP tersisa 40") untuk rasa kepemilikan pemain.

## 6. Tata letak vertical-first

- Panggung: elemen `.stage` dengan `aspect-ratio: 9/16`, tinggi dibatasi
  `min(100dvh, …)` dan lebar turunannya; di desktop, sisi luar panggung
  diisi latar gradasi tinta + pola garis samar.
- Kontrol & tombol aksi duel: grid di bawah area tonton, ukuran target
  sentuh ≥ 48 px, aman dari notch (`env(safe-area-inset-bottom)`).
- Subtitle: font `clamp()` berbasis lebar panggung (container query /
  satuan `cqw`), posisi 6% dari bawah area klip, latar semi-transparan.

## 7. Performa & ketahanan

- Preload: klip scene n+1 dimuat (`preload="auto"` pada elemen tersembunyi)
  selama scene n diputar; audio narasi ukurannya kecil, dimuat di awal.
- Kegagalan aset tidak boleh mematikan alur: setiap pemutar punya jalur
  fallback (poster diam + subtitle tetap jalan) dan timeout pengaman.
- Tanpa dependensi runtime selain Three.js; tanpa analytics, tanpa cookie.

## 8. Pengujian

- Uji manual per acceptance criteria di `requirements.md` (checklist di
  `tasks.md` fase verifikasi).
- Uji perangkat: Chrome Android (vertikal), Chrome desktop (layar lebar),
  mode WebGL nonaktif (fallback duel), mode audio diblokir autoplay.
- Uji tontonan tanpa suara: subtitle saja harus cukup menjelaskan cerita.
