# Catatan Teknis — DevTools iambrilian Studio

Dokumen ini memuat rencana produk, dasar keputusan arsitektur, dan catatan
migrasi ke hosting produksi. Referensi fungsionalnya FreeFormatter.com yang
sudah tutup, dengan tampilan dan alur kerja yang dirancang ulang.

Empat tool sudah berjalan penuh. Tiga puluh delapan sisanya sudah terpetakan dan
ditampilkan sebagai *coming soon* di homepage, sehingga cakupan akhir produk
terlihat sejak rilis pertama.

---

## 1. Rencana lengkap 42 tool

Tanda ✅ berarti sudah jadi dan bisa dicoba di demo ini. Kolom "pustaka" menyebut
dependensi CDN yang dipakai atau yang akan dipakai saat tool itu dibangun.

### JSON — 8 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 1 | JSON Formatter & Validator | ✅ `/json-formatter.html` | native `JSON` + locator sendiri |
| 2 | JSON Minifier | coming soon | native `JSON` |
| 3 | JSON to XML | ✅ `/json-to-xml.html` | native + `DOMParser` |
| 4 | JSON to CSV | coming soon | PapaParse |
| 5 | JSON to YAML | coming soon | js-yaml |
| 6 | JSON Escape / Unescape | coming soon | native |
| 7 | JSON Diff | coming soon | native |
| 8 | JSONPath Tester | coming soon | jsonpath-plus |

### XML — 6 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 9 | XML Formatter | coming soon | js-beautify (`html_beautify`) |
| 10 | XML Validator | coming soon | `DOMParser` |
| 11 | XML Minifier | coming soon | `DOMParser` |
| 12 | XML to JSON | coming soon | `DOMParser` |
| 13 | XPath Tester | coming soon | `document.evaluate` |
| 14 | XSLT Transformer | coming soon | `XSLTProcessor` |

### SQL & Database — 3 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 15 | SQL Formatter | ✅ `/sql-formatter.html` | sql-formatter 15 |
| 16 | SQL Minifier | ✅ (menyatu di halaman SQL Formatter) | pemindai sendiri |
| 17 | SQL Escape / Unescape | coming soon | native |

### Web Code — 7 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 18 | HTML Formatter | coming soon | js-beautify |
| 19 | HTML Minifier | coming soon | js-beautify + regex |
| 20 | CSS Beautifier | coming soon | js-beautify (`css_beautify`) |
| 21 | CSS Minifier | coming soon | js-beautify |
| 22 | JavaScript Beautifier | coming soon | js-beautify (`js_beautify`) |
| 23 | JavaScript Minifier | coming soon | Terser (UMD) |
| 24 | HTML Entity Encoder / Decoder | coming soon | native |

### Encoding — 6 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 25 | Base64 Encoder / Decoder | ✅ `/base64-encoder.html` | `TextEncoder` / `btoa` / `atob` |
| 26 | Base64 to Image | coming soon | native |
| 27 | URL Encoder / Decoder | coming soon | native |
| 28 | JWT Decoder | coming soon | native |
| 29 | Hex ↔ Text Converter | coming soon | native |
| 30 | Quoted-Printable Encoder / Decoder | coming soon | native |

### Hash & Security — 5 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 31 | MD5 Generator | coming soon | CryptoJS (Web Crypto tidak punya MD5) |
| 32 | SHA-1 / SHA-256 / SHA-512 Generator | coming soon | Web Crypto `subtle.digest` |
| 33 | HMAC Generator | coming soon | Web Crypto `subtle.sign` |
| 34 | UUID Generator | coming soon | `crypto.randomUUID` |
| 35 | Password Generator | coming soon | `crypto.getRandomValues` |

### Data Converter — 4 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 36 | CSV to JSON | coming soon | PapaParse |
| 37 | CSV to XML | coming soon | PapaParse |
| 38 | YAML to JSON | coming soon | js-yaml |
| 39 | Timestamp / Epoch Converter | coming soon | native `Date` |

### Text & Utility — 3 tool

| # | Tool | Status | Pustaka |
|---|------|--------|---------|
| 40 | Regex Tester | coming soon | native `RegExp` |
| 41 | Diff Checker | coming soon | jsdiff (UMD) |
| 42 | Lorem Ipsum Generator | coming soon | native |

**Total: 42 tool. Live saat ini: 4 halaman tool** (plus SQL Minifier yang menyatu
di halaman SQL Formatter, jadi lima fungsi).

---

## 2. Kenapa arsitektur ini aman untuk AdSense dan analytics

Klien pernah punya web Vue.js dengan impression AdSense nol dan trafik tidak
tercatat di Histats. Penyebabnya arsitektural, bukan salah pasang kode.

### Akar masalah pada SPA

Pada aplikasi single-page, perpindahan halaman dilakukan lewat `history.pushState`.
Dokumen tidak pernah dimuat ulang: yang berganti hanya isi DOM. Akibatnya:

- **Skrip analytics hanya berjalan sekali.** Histats, dan skrip penghitung lama pada
  umumnya, mencatat kunjungan saat tag di `<body>` dieksekusi. Tag itu dieksekusi
  satu kali seumur sesi. Pengunjung yang membuka dua belas tool tetap tercatat
  sebagai satu pageview.
- **Unit iklan tidak pernah di-request ulang.** `adsbygoogle.js` memindai
  `<ins class="adsbygoogle">` saat dokumen dimuat. Slot yang muncul belakangan
  karena render ulang komponen tidak ikut terpindai, sehingga tidak ada ad request,
  dan tanpa ad request tidak ada impression.
- **Crawler AdSense membaca halaman yang salah.** Bot pengindeks AdSense mengambil
  URL apa adanya. Kalau semua rute dilayani oleh satu `index.html` yang isinya baru
  terbentuk setelah JavaScript jalan, yang terbaca bot adalah shell kosong. Halaman
  tanpa konten tidak akan dapat iklan bertarget, dan sering ditolak saat review.
- **Kebijakan AdSense soal konten.** Halaman yang dinilai "low value content" atau
  tidak punya teks bermakna berisiko ditolak. Shell SPA persis masuk kategori itu.

### Yang dilakukan situs ini

| Keputusan | Dampak |
|---|---|
| Satu tool = satu berkas `.html` fisik | Setiap navigasi adalah full page reload. Tag analytics dan `adsbygoogle.js` dieksekusi ulang setiap kali. |
| Tanpa router client-side, tanpa `history.pushState` | Tidak ada jalur navigasi yang melewatkan reload. Tidak perlu hook khusus untuk melapor pageview manual. |
| Tanpa framework, tanpa build step | HTML yang dikirim ke browser sudah berisi seluruh konten. Bot melihat teks yang sama dengan yang dilihat manusia. |
| Konten teks di setiap halaman | Setiap tool punya H1, paragraf penjelasan, dan blok FAQ. Halaman punya bahan untuk diindeks dan untuk penargetan iklan kontekstual. |
| Meta unik per halaman | Title, meta description, canonical, Open Graph, dan JSON-LD `SoftwareApplication` + `FAQPage` + `BreadcrumbList` ditulis khusus per tool. |
| Tiga slot iklan tetap di markup | Leaderboard, sidebar, dan in-content sudah ada sejak HTML dikirim, bukan disisipkan JavaScript belakangan. |
| Seluruh proses di sisi klien | Tidak ada backend yang perlu diamankan. Data pengguna tidak pernah keluar dari browser — ini juga jadi bahan jualan di halaman. |

Yang perlu dicatat: arsitektur ini menghilangkan **penyebab teknis** dari impression
nol. Persetujuan akun AdSense tetap bergantung pada kualitas konten, volume trafik,
dan kepatuhan kebijakan — hal-hal yang di luar kendali arsitektur.

### Cara memasang AdSense nanti

Setiap slot adalah satu elemen mandiri yang ditandai atribut data, tanpa
komentar apa pun di dalam kode:

```html
<div class="ad-slot ad-leaderboard" data-ad-slot="leaderboard" data-ad-size="728x90" aria-hidden="true">
  <span class="ad-slot__label">Ad Slot · Leaderboard</span>
  <span class="ad-slot__size">728 × 90</span>
</div>
```

Atribut `data-ad-slot` menyebut posisinya dan `data-ad-size` menyebut ukurannya,
sehingga slot bisa ditemukan lewat pencarian maupun `querySelectorAll`. Langkahnya:
ganti kedua `<span>` di dalam `div.ad-slot` dengan `<ins class="adsbygoogle">` milik
klien, lalu muat `adsbygoogle.js` sekali di `<head>`. Kelas `.ad-slot` boleh
dipertahankan supaya tinggi minimum slot tetap terkunci dan tidak terjadi layout
shift saat iklan datang — ini ikut menjaga skor CLS.

Slot per halaman: **leaderboard** (atas, di bawah header), **sidebar** (kanan, sticky,
muncul di viewport ≥ 1280px), dan **in-content** (tepat di bawah area editor, posisi
dengan viewability tertinggi karena pengguna baru saja menekan tombol Format).

---

## 3. Catatan routing produksi (PHP)

Demo ini dideploy sebagai static site, jadi URL-nya masih memakai ekstensi
`.html` (`/json-formatter.html`). Di hosting produksi, sesuai permintaan klien,
routing akan memakai PHP.

Rencana pemindahannya:

- Setiap `.html` menjadi `.php`, misalnya `json-formatter.php`, sehingga bagian
  berulang (header, sidebar, footer, blok slot iklan) bisa ditarik ke satu berkas
  dan dipanggil dengan `include`. Ini menghilangkan duplikasi markup antar halaman
  tanpa mengubah apa pun dari sisi browser.
- URL bersih tanpa ekstensi diatur lewat `.htaccess` (`RewriteRule ^([a-z0-9-]+)/?$
  $1.php [L]`), jadi alamat publiknya menjadi `/json-formatter`.
- **Sifat multi-halaman tetap dipertahankan.** PHP hanya merakit HTML di sisi
  server; browser tetap menerima dokumen utuh dan tetap melakukan full page reload
  di setiap navigasi. Seluruh alasan pada bagian 2 tetap berlaku.
- Karena struktur URL berubah, `canonical`, `sitemap.xml`, dan tautan internal ikut
  disesuaikan saat migrasi. Kalau demo ini sempat terindeks, tambahkan redirect
  301 dari `.html` ke URL final.
- Struktur folder demo sudah rata dan tanpa build step, jadi seluruh isi repo bisa
  langsung diunggah ke `public_html` di shared hosting mana pun tanpa Node.js.

---

## 4. Hal teknis yang perlu diketahui

- **Domain canonical.** Semua tag `canonical`, `og:url`, dan `sitemap.xml` saat ini
  menunjuk ke `https://devtools-formatter.vercel.app`. Ganti ke domain final
  sebelum situs dipublikasikan — cari-ganti satu string di seluruh berkas.
- **Pustaka CDN.** CodeMirror 5.65.16 (editor + syntax highlighting) dan
  sql-formatter 15.8.2 dimuat dari cdnjs. Tailwind memakai Play CDN, cukup untuk
  demo; untuk produksi sebaiknya diganti CSS hasil build agar tidak bergantung
  pada CDN pihak ketiga saat render. js-beautify, js-yaml, dan PapaParse belum
  dimuat karena keempat tool yang sudah jadi tidak membutuhkannya — memuat pustaka
  yang tidak dipakai hanya memperlambat halaman. Pustaka itu masuk saat tool yang
  membutuhkannya dibangun (lihat kolom pustaka di bagian 1).
- **Dark mode** disimpan di `localStorage` dengan kunci `dt-theme`, dan dibaca oleh
  skrip inline di `<head>` sebelum body dirender supaya tidak ada kedipan putih.
- **Pesan error JSON** tidak mengandalkan pesan bawaan browser. V8 versi baru tidak
  lagi menyertakan posisi karakter pada semua kasus, jadi ada pemindai JSON sendiri
  di `assets/app.js` (`DT.jsonLocate`) yang menunjuk baris, kolom, dan penyebabnya
  dalam bahasa Indonesia, lalu menyorot baris yang salah di editor.
- **Aksesibilitas.** Skip link, `aria-live` pada bilah status, fokus terlihat, dan
  kontras teks memenuhi WCAG AA. Slot iklan diberi `aria-hidden` supaya tidak
  mengganggu pembaca layar.

---

Disusun oleh [iambrilian](https://github.com/brilianrn).
