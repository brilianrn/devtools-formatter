# DevTools iambrilian Studio

Demo situs tool formatter, validator, dan converter untuk developer. Dibangun
sebagai situs multi-halaman statis: HTML + vanilla JavaScript, tanpa framework,
tanpa build step, tanpa npm.

Seluruh pemrosesan berjalan di browser pengunjung. Tidak ada backend dan tidak
ada data yang dikirim ke server.

## Tool yang sudah jalan

| Halaman | Fungsi |
|---|---|
| `/json-formatter.html` | Format, minify, dan validasi JSON dengan pesan error baris & kolom |
| `/base64-encoder.html` | Encode / decode Base64, mendukung UTF-8, URL-safe, dan file biner |
| `/sql-formatter.html` | Format dan minify SQL untuk 12 dialek |
| `/json-to-xml.html` | Konversi JSON ke XML well-formed |

Homepage `/index.html` memuat navigasi per kategori dan 38 tool lain yang
ditandai *coming soon*. Rencana lengkapnya ada di [CATATAN-DEMO.md](CATATAN-DEMO.md).

## Struktur

```
├── index.html
├── json-formatter.html
├── base64-encoder.html
├── sql-formatter.html
├── json-to-xml.html
├── assets/
│   ├── app.js          modul bersama: tema, editor, clipboard, unduh, unggah, locator JSON
│   ├── style.css       seluruh gaya kustom di luar Tailwind
│   └── logo*.png
├── favicon-32.png
├── apple-touch-icon.png
├── robots.txt
├── sitemap.xml
└── vercel.json
```

Struktur sengaja dibuat rata supaya seluruh isi repo bisa langsung diunggah ke
`public_html` di shared hosting mana pun.

## Menjalankan secara lokal

Tidak ada dependensi yang perlu dipasang. Cukup layani foldernya lewat HTTP:

```bash
python3 -m http.server 8899
```

lalu buka <http://localhost:8899/index.html>. Membuka berkasnya lewat `file://`
juga bisa, hanya saja tautan absolut ke `/assets/` tidak akan ketemu.

## Pustaka pihak ketiga

Semua dimuat lewat CDN, tidak ada yang di-vendor:

- [CodeMirror 5.65.16](https://codemirror.net/5/) — editor dan syntax highlighting
- [sql-formatter 15.8.2](https://github.com/sql-formatter-org/sql-formatter) — pemformat SQL
- [Tailwind CSS Play CDN](https://tailwindcss.com/docs/installation/play-cdn) — utility class

## Catatan

Tag `canonical`, `og:url`, dan `sitemap.xml` masih menunjuk ke domain sementara.
Ganti sebelum situs dipublikasikan. Detailnya ada di CATATAN-DEMO.md bagian 4.
