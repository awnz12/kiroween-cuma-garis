# Requirements — Episode Interaktif CUMA GARIS. (Kiroween 2026, kategori Frankenstein)

Dokumen kebutuhan untuk aplikasi web statis "Episode Anime Interaktif 1 Menit":
penonton menonton episode anime ±1 menit, di titik klimaks memainkan mini-game
duel Three.js, dan hasil game menentukan ending yang diputar.

Konvensi: kriteria penerimaan ditulis dalam format EARS (WHEN / WHILE / IF …
THE SYSTEM SHALL …) supaya bisa diturunkan langsung jadi tugas di `tasks.md`.

## Glosarium

- **Scene**: satu segmen episode (klip video + segmen narasi + subtitle).
- **Branch point**: momen di akhir Scene 5 tempat episode berhenti dan
  mini-game dimulai.
- **Duel**: mini-game fighting Three.js (durasi target 20–30 detik).
- **Ending A (Menang)**: varian ending bila pemain memenangkan duel.
- **Ending B (Bertahan)**: varian ending bila pemain kalah — Raka tetap
  bertahan, nada lebih gelap, hook Episode 2 lebih kuat.
- **State machine**: pengatur alur `intro → scene → branch → duel → ending`.

## Requirement 1 — Pemutaran episode

**User story:** Sebagai penonton, saya ingin menonton episode ±1 menit yang
mengalir tanpa jeda teknis, supaya saya masuk ke cerita Raka sebelum bermain.

Acceptance criteria:

1. WHEN penonton menekan tombol "Mulai Episode" THE SYSTEM SHALL memutar
   Scene 1–5 berurutan sesuai naskah di `cerita/naskah-episode.md` tanpa
   perlu interaksi tambahan.
2. WHILE episode diputar THE SYSTEM SHALL menampilkan progress bar dan
   indikator scene saat ini.
3. WHEN sebuah klip selesai THE SYSTEM SHALL melanjutkan ke scene berikutnya
   dalam ≤ 500 ms tanpa layar hitam berkepanjangan.
4. IF klip gagal dimuat THE SYSTEM SHALL menampilkan adegan cadangan
   (gambar diam dari lembar desain + teks narasi) dan tetap melanjutkan alur,
   bukan berhenti dengan error.
5. THE SYSTEM SHALL menyediakan tombol lewati (skip) per scene dan tombol
   jeda/lanjut.

## Requirement 2 — Narasi Bahasa Indonesia + subtitle terbakar

**User story:** Sebagai penonton Indonesia, saya ingin mendengar narasi
Bahasa Indonesia dengan subtitle yang sinkron, supaya cerita bisa diikuti
dengan atau tanpa suara.

Acceptance criteria:

1. WHILE sebuah scene diputar THE SYSTEM SHALL memutar segmen audio narasi
   TTS Bahasa Indonesia yang sesuai dengan scene tersebut.
2. WHILE narasi diputar THE SYSTEM SHALL menampilkan subtitle Bahasa
   Indonesia yang sinkron per kalimat di area bawah layar, tidak menutupi
   area adegan pertarungan.
3. IF audio tidak dapat diputar (autoplay policy / file gagal) THE SYSTEM
   SHALL tetap menampilkan subtitle dan menyediakan tombol "Putar Narasi".
4. THE SYSTEM SHALL menyediakan toggle bisu (mute) yang tidak menghentikan
   subtitle.
5. Konten narasi dan subtitle SHALL identik dengan naskah yang disetujui di
   `cerita/naskah-episode.md` — tidak ada parafrase otomatis.

## Requirement 3 — Branch point & mini-game duel

**User story:** Sebagai penonton, saya ingin memainkan sendiri adegan
pertarungan klimaks sebagai Raka, supaya saya merasa jadi bagian cerita,
bukan cuma menonton.

Acceptance criteria:

1. WHEN Scene 5 mencapai momen trigger (pedang Garis terbentuk, cakar
   Coretan Liar turun) THE SYSTEM SHALL membekukan frame, menampilkan
   overlay "GILIRANMU — Lawan Coretan Liar!", dan memuat duel Three.js.
2. THE SYSTEM SHALL memberi pemain tepat 3 aksi: **Ayun Pedang** (serang),
   **Perisai Garis** (bertahan), **Tenun Kait** (serang kuat, cooldown).
3. WHILE duel berjalan THE SYSTEM SHALL menampilkan HP Raka dan HP
   Coretan Liar, dan musuh SHALL menyerang balik dengan pola terbaca
   (telegraph ≥ 600 ms sebelum cakar jatuh).
4. WHEN HP salah satu pihak mencapai 0 ATAU timer 45 detik habis THE SYSTEM
   SHALL mengakhiri duel dan mencatat hasil: `menang` bila HP musuh 0 atau
   HP Raka > HP musuh saat timer habis; selain itu `bertahan`.
5. IF WebGL tidak tersedia THE SYSTEM SHALL mengganti duel dengan mode
   cadangan tombol-waktu (quick-time button) dengan aturan hasil yang sama.
6. Duel SHALL dapat dimainkan penuh dengan sentuhan (mobile) dan keyboard
   (desktop): spasi = ayun, S = perisai, K = kait.

## Requirement 4 — Ending bercabang

**User story:** Sebagai penonton, saya ingin ending yang benar-benar
berbeda berdasarkan hasil permainan saya, supaya pilihan dan usaha saya
terasa berarti.

Acceptance criteria:

1. WHEN duel berakhir dengan hasil `menang` THE SYSTEM SHALL memutar
   Ending A sesuai naskah (cakar hancur, pasar selamat, hook Oret).
2. WHEN duel berakhir dengan hasil `bertahan` THE SYSTEM SHALL memutar
   Ending B sesuai naskah (Raka bertahan babak belur, desa rusak, hook
   Penghapus lebih gelap).
3. Ending A dan Ending B SHALL berbeda pada klip, narasi, DAN teks end card
   — bukan sekadar beda satu baris teks.
4. WHEN ending selesai THE SYSTEM SHALL menampilkan end card "BERSAMBUNG —
   Episode 2" + ringkasan hasil duel + tombol "Main Lagi" yang mengulang
   dari branch point (bukan dari awal episode).

## Requirement 5 — Tata letak vertical-first

**User story:** Sebagai penonton HP (audiens utama TikTok/Reels), saya ingin
pengalaman yang pas di layar vertikal, supaya tidak ada yang terpotong.

Acceptance criteria:

1. THE SYSTEM SHALL merender area panggung utama pada rasio 9:16 dan
   memusatkannya di viewport pada semua ukuran layar.
2. WHILE di layar lebar (desktop) THE SYSTEM SHALL menampilkan latar
   dekoratif di sisi kiri/kanan panggung tanpa mengubah rasio panggung.
3. Semua kontrol (play, skip, aksi duel, mute) SHALL dapat dijangkau jempol
   di area bawah panggung pada layar sentuh.
4. Teks subtitle SHALL terbaca pada lebar 360 px (ukuran font relatif
   terhadap lebar panggung, bukan viewport).

## Requirement 6 — Aplikasi statis murni & performa

**User story:** Sebagai juri hackathon, saya ingin membuka URL dan langsung
memainkan tanpa login atau instalasi.

Acceptance criteria:

1. THE SYSTEM SHALL berjalan sebagai situs statis (HTML/CSS/JS + aset)
   tanpa backend dan tanpa login.
2. THE SYSTEM SHALL memuat layar pertama (judul + tombol mulai) dalam
   ≤ 3 detik pada koneksi 4G lambat; klip scene berikutnya SHALL di-preload
   selama scene berjalan.
3. Total ukuran unduhan awal (di luar klip video) SHALL ≤ 2 MB.
4. THE SYSTEM SHALL berfungsi penuh dari file statis di hosting apa pun
   (GitHub Pages / Netlify / Vercel) tanpa konfigurasi server.

## Requirement 7 — Dokumentasi pemakaian Kiro

**User story:** Sebagai juri Kiroween, saya ingin melihat bukti kedalaman
pemakaian Kiro (specs, steering, hooks) di repo publik.

Acceptance criteria:

1. Repo SHALL memuat folder `/.kiro` di root (specs + steering) dan TIDAK
   meng-gitignore-nya.
2. Setiap fitur pada Requirement 1–6 SHALL dapat ditelusur ke tugas di
   `tasks.md` spec ini.
3. README SHALL memuat write-up pemakaian Kiro: spec-driven development,
   steering doc konteks dunia CUMA GARIS., dan hooks yang dipakai.
