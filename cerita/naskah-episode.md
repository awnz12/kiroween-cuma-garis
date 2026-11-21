# Naskah Episode Interaktif — CUMA GARIS. Ep 1: "Kebangun Jadi Garis"

Adaptasi dari Episode 1 production brief serial CUMA GARIS. untuk format
interaktif Kiroween: 5 scene tontonan (±50 detik) → **branch point** →
mini-game duel (20–45 detik) → 1 dari 2 ending (±10 detik). Total konten
episode ±60 detik + waktu bermain.

Format panggung: vertikal 9:16. Semua narasi & subtitle Bahasa Indonesia.
Teks di bawah ini adalah sumber kebenaran untuk `data/episode.json`,
segmen TTS, dan subtitle — jangan diparafrasekan saat implementasi.

---

## Scene 1 — Bangun (0:00–0:10)

- **Visual**: Close-up Raka membuka mata di gang Desa Garis, bingung.
  Kamera pelan naik. Syal merah satu-satunya warna mencolok.
- **Narasi**:
  1. "Namaku Raka. Tadi malam aku cuma anak biasa yang ketiduran sambil menggambar."
  2. "Pagi ini aku bangun… di desa yang isinya gambar hidup. Dan badanku — cuma satu garis."

## Scene 2 — Diejek (0:10–0:20)

- **Visual**: Warga desa (gambar detail berwarna) menunjuk & menertawakan
  Raka di pasar. Seorang anak mengejek. Raka menunduk, mengepalkan tangan.
  Gerak natural, bukan pose kaku.
- **Narasi**:
  3. "Di sini, garis itu kasta paling rendah. Semua orang menertawakanku. 'Cuma garis doang, bisa apa?'"

## Scene 3 — Serangan (0:20–0:30)

- **Visual**: Langit desa retak; Coretan Liar (gumpalan tinta hitam tak
  berbentuk) menerjang pasar. Warga panik berlarian. Kamera goyang + zoom
  mendadak.
- **Narasi**:
  4. "Lalu pasar diserang. Coretan Liar. Monster tinta yang tak punya bentuk."

## Scene 4 — Babak Belur (0:30–0:40)

- **Visual**: Raka terpental, tersungkur di tanah, garis tubuhnya menipis.
  Coretan Liar mengangkat cakar tinta raksasa. Musik menegang.
- **Narasi**:
  5. "Aku babak belur."

## Scene 5 — Bangkit (0:40–0:50)

- **Visual**: Raka mengangkat telapak tangan kosong — sihir Coretan Liar
  **pecah/batal** saat menyentuhnya (anti-sihir). Garis merah-hitam
  merambat dari tangannya, berubah jadi **pedang rune menyala**. Cakar
  raksasa mulai turun ke arah Raka.
- **Narasi**:
  6. "Tapi saat cakarnya menyentuhku… sihirnya pecah. Hancur begitu saja."
  7. "Ternyata garis kosong ini… kebal sihir."
  8. "Dan garis ini — bisa jadi apa saja."

---

## ⚑ BRANCH POINT (±0:50) — Momen Trigger Mini-Game

- Frame **membeku** tepat saat pedang Garis selesai terbentuk dan cakar
  raksasa turun — sepersekian detik sebelum benturan.
- Overlay muncul: **"GILIRANMU — Lawan Coretan Liar!"** + ringkas kontrol:
  Ayun Pedang / Perisai Garis / Tenun Kait.
- Narasi pendek (TTS, di atas bisu klip): "Sekarang… giliranmu."
- Pemain memainkan duel Three.js sebagai Raka (target 20–30 detik,
  batas 45 detik). Hasil duel: `menang` atau `bertahan` — menentukan
  ending yang diputar. Episode tidak bisa dilanjutkan tanpa bermain
  (tombol lewati duel menandai hasil sebagai `bertahan`).

---

## Ending A — MENANG (±10 detik)

- **Visual**: Ayunan pedang Garis membelah cakar raksasa; Coretan Liar
  pecah jadi percikan tinta yang memudar. Pasar selamat. Warga menatap
  Raka tak percaya — anak yang tadi mengejek kini bertepuk tangan pelan.
  Di kejauhan, sekilas **Oret** menonton dari atap (hook Episode 3).
- **Narasi**:
  9A. "Satu garis… cukup buat melindungi semua orang yang menertawakannya."
- **End card A**: teks "BERSAMBUNG — Episode 2 besok." + ringkasan hasil
  duel + tombol "Main Lagi".

## Ending B — BERTAHAN (±10 detik)

- **Visual**: Raka menahan cakar dengan perisai garis sampai Coretan Liar
  mundur dan lenyap ke retakan langit — tapi pasar porak-poranda dan
  garis tubuh Raka menipis, nyaris putus. Raka berdiri gemetar. Di langit
  yang retak, sesaat terasa kehadiran yang jauh lebih besar sedang
  "menghapus" sesuatu di kejauhan (bayangan Sang Penghapus — hook gelap).
- **Narasi**:
  9B. "Aku belum menang. Tapi aku masih di sini — dan garis ini… belum terhapus."
- **End card B**: teks "BERSAMBUNG — Episode 2 besok." (tampilan lebih
  gelap) + satu baris tambahan: "Sesuatu sedang menghapus dunia ini…" +
  ringkasan hasil duel + tombol "Main Lagi".

---

## Catatan produksi

- Kedua ending berbeda penuh: klip, narasi, dan end card (bukan beda
  satu baris). Keduanya tetap cliffhanger sesuai pakem serial.
- "Main Lagi" mengulang dari branch point, bukan dari Scene 1.
- Naskah ini menunggu persetujuan kreatif pemilik channel sebelum aset
  diproduksi (lihat RENCANA.md, langkah user #5).
