(function (global) {
  'use strict';

  var editors = [];
  var pendingBytes = null;

  function themeName() {
    return document.documentElement.classList.contains('dark') ? 'material-darker' : 'default';
  }

  var DT = {
    esc: function (s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    bytes: function (s) {
      return new TextEncoder().encode(s).length;
    },

    human: function (n) {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1048576).toFixed(2) + ' MB';
    },

    on: function (id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    },

    editor: function (id, opts) {
      var ta = typeof id === 'string' ? document.getElementById(id) : id;
      var cm = CodeMirror.fromTextArea(ta, {
        mode: opts.mode,
        theme: themeName(),
        lineNumbers: true,
        lineWrapping: true,
        readOnly: !!opts.readOnly,
        viewportMargin: 30,
        tabSize: 2
      });
      editors.push(cm);
      return cm;
    },

    status: function (msg, kind, isHtml) {
      var el = document.getElementById('status');
      if (!el) return;
      el.className = 'status' + (kind && kind !== 'idle' ? ' status--' + kind : '');
      if (isHtml) el.innerHTML = msg; else el.textContent = msg;
    },

    markErrorLine: function (cm, line) {
      if (!line) return;
      DT.clearErrorLine(cm);
      var i = Math.min(Math.max(line - 1, 0), cm.lineCount() - 1);
      cm.addLineClass(i, 'background', 'cm-error-line');
      cm._errLine = i;
      cm.setCursor({ line: i, ch: 0 });
      cm.scrollIntoView({ line: i, ch: 0 }, 80);
    },

    clearErrorLine: function (cm) {
      if (cm && cm._errLine != null) {
        cm.removeLineClass(cm._errLine, 'background', 'cm-error-line');
        cm._errLine = null;
      }
    },

    jsonLocate: function (text) {
      var i = 0, n = text.length, ch = function (k) { return text.charAt(k === undefined ? i : k); };

      function fail(msg) { throw { pos: i, msg: msg }; }
      function ws() {
        while (i < n) {
          var c = ch();
          if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
          if (c === '/' && (ch(i + 1) === '/' || ch(i + 1) === '*')) {
            fail('Komentar tidak diizinkan dalam JSON. Hapus baris komentar ini.');
          }
          break;
        }
      }
      function str() {
        i++;
        while (i < n) {
          var c = ch();
          if (c === '"') { i++; return; }
          if (c === '\\') {
            var e = ch(i + 1);
            if ('"\\/bfnrt'.indexOf(e) !== -1 && e !== '') { i += 2; continue; }
            if (e === 'u') {
              if (!/^[0-9a-fA-F]{4}$/.test(text.substr(i + 2, 4))) {
                i++; fail('Escape \\u harus diikuti tepat empat digit heksadesimal.');
              }
              i += 6; continue;
            }
            fail('Escape sequence \\' + e + ' tidak dikenali. JSON hanya mengenal \\" \\\\ \\/ \\b \\f \\n \\r \\t dan \\uXXXX.');
          }
          if (c === '\n') fail('String belum ditutup. Baris baru mentah tidak boleh ada di dalam string JSON; tulis \\n sebagai gantinya.');
          if (c < ' ') fail('Karakter kontrol mentah tidak diizinkan di dalam string JSON.');
          i++;
        }
        fail('String belum ditutup dengan tanda kutip ganda.');
      }
      function num() {
        if (ch() === '-') i++;
        if (ch() === '0') {
          i++;
          if (/[0-9]/.test(ch())) fail('Angka tidak boleh diawali angka nol.');
        } else if (/[1-9]/.test(ch())) {
          while (/[0-9]/.test(ch())) i++;
        } else {
          fail('Angka tidak valid: harus ada digit setelah tanda minus.');
        }
        if (ch() === '.') {
          i++;
          if (!/[0-9]/.test(ch())) fail('Harus ada digit setelah titik desimal.');
          while (/[0-9]/.test(ch())) i++;
        }
        if (ch() === 'e' || ch() === 'E') {
          i++;
          if (ch() === '+' || ch() === '-') i++;
          if (!/[0-9]/.test(ch())) fail('Eksponen harus diikuti minimal satu digit.');
          while (/[0-9]/.test(ch())) i++;
        }
      }
      function lit(word) { return text.substr(i, word.length) === word; }
      function value(depth) {
        if (depth > 512) fail('Struktur terlalu dalam untuk diperiksa.');
        ws();
        if (i >= n) fail('Dokumen berakhir sebelum nilai yang diharapkan muncul.');
        var c = ch();
        if (c === '{') return obj(depth);
        if (c === '[') return arr(depth);
        if (c === '"') return str();
        if (c === "'") fail('JSON hanya mengizinkan tanda kutip ganda ("), bukan kutip tunggal (\').');
        if (c === '-' || /[0-9]/.test(c)) return num();
        if (lit('true')) { i += 4; return; }
        if (lit('false')) { i += 5; return; }
        if (lit('null')) { i += 4; return; }
        if (lit('NaN') || lit('Infinity') || lit('-Infinity')) fail('NaN dan Infinity bukan nilai JSON yang sah.');
        if (lit('undefined')) fail('undefined bukan nilai JSON yang sah. Gunakan null.');
        fail('Nilai tidak dikenali. Di sini diharapkan objek, array, string, angka, true, false, atau null.');
      }
      function obj(depth) {
        i++; ws();
        if (ch() === '}') { i++; return; }
        for (;;) {
          ws();
          if (ch() === '}') fail('Ada koma berlebih sebelum tanda } penutup. JSON tidak mengizinkan trailing comma.');
          if (i >= n) fail('Objek belum ditutup dengan tanda }.');
          if (ch() !== '"') fail('Nama key harus diapit tanda kutip ganda, misalnya "nama": nilai.');
          str(); ws();
          if (ch() !== ':') fail('Diharapkan tanda titik dua (:) setelah nama key.');
          i++;
          value(depth + 1); ws();
          if (ch() === ',') { i++; continue; }
          if (ch() === '}') { i++; return; }
          if (i >= n) fail('Objek belum ditutup dengan tanda }.');
          fail('Diharapkan koma (,) sebelum pasangan key berikutnya, atau tanda } untuk menutup objek.');
        }
      }
      function arr(depth) {
        i++; ws();
        if (ch() === ']') { i++; return; }
        for (;;) {
          ws();
          if (ch() === ']') fail('Ada koma berlebih sebelum tanda ] penutup. JSON tidak mengizinkan trailing comma.');
          value(depth + 1); ws();
          if (ch() === ',') { i++; continue; }
          if (ch() === ']') { i++; return; }
          if (i >= n) fail('Array belum ditutup dengan tanda ].');
          fail('Diharapkan koma (,) sebelum elemen berikutnya, atau tanda ] untuk menutup array.');
        }
      }

      try {
        ws();
        if (i >= n) return { pos: 0, msg: 'Dokumen kosong.' };
        value(0);
        ws();
        if (i < n) return { pos: i, msg: 'Ada karakter tambahan setelah nilai JSON selesai. Satu dokumen JSON hanya boleh berisi satu nilai akar.' };
        return null;
      } catch (e) {
        if (e && typeof e.pos === 'number') return e;
        throw e;
      }
    },

    lineCol: function (text, pos) {
      var upto = text.slice(0, pos);
      var nl = upto.lastIndexOf('\n');
      return { line: upto.split('\n').length, col: pos - nl };
    },

    jsonError: function (text, err) {
      var found = DT.jsonLocate(text);
      var pos, reason;
      if (found) {
        pos = Math.min(found.pos, Math.max(0, text.length - 1));
        reason = found.msg;
      } else {
        var raw = (err && err.message) || String(err);
        var m = /at position (\d+)/i.exec(raw);
        pos = m ? parseInt(m[1], 10) : 0;
        reason = raw;
      }
      var lc = DT.lineCol(text, pos);
      var html = '<strong>JSON tidak valid</strong> &middot; baris ' + lc.line + ', kolom ' + lc.col
               + ' (posisi karakter ' + pos + ')<br>' + DT.esc(reason);
      var src = text.split('\n')[lc.line - 1] || '';
      var start = Math.max(0, lc.col - 40);
      var snip = src.slice(start, start + 90);
      var caret = new Array(Math.max(1, lc.col - start)).join(' ') + '^';
      html += '<pre>' + DT.esc((start > 0 ? '…' : '') + snip) + '\n'
           + DT.esc((start > 0 ? ' ' : '') + caret) + '</pre>';
      return { line: lc.line, col: lc.col, pos: pos, reason: reason, html: html };
    },

    inspect: function (value) {
      var nodes = 0, max = 0;
      (function walk(v, d) {
        nodes++;
        if (d > max) max = d;
        if (Array.isArray(v)) v.forEach(function (x) { walk(x, d + 1); });
        else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k], d + 1); });
      })(value, 1);
      return {
        nodes: nodes,
        depth: max,
        type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
      };
    },

    hexdump: function (bytes) {
      var out = [], limit = Math.min(bytes.length, 4096);
      for (var i = 0; i < limit; i += 16) {
        var hex = [], asc = '';
        for (var j = 0; j < 16; j++) {
          if (i + j < limit) {
            var b = bytes[i + j];
            hex.push((b < 16 ? '0' : '') + b.toString(16));
            asc += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
          } else hex.push('  ');
        }
        out.push(('0000000' + i.toString(16)).slice(-8) + '  ' + hex.join(' ') + '  |' + asc + '|');
      }
      if (bytes.length > limit) out.push('… ' + (bytes.length - limit) + ' byte berikutnya tidak ditampilkan.');
      return out.join('\n');
    },

    setDownloadBytes: function (bytes, name) {
      pendingBytes = { bytes: bytes, name: name };
    },

    saveBlob: function (blob, name) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    wireCommon: function (input, output, filename, mime, opts) {
      opts = opts || {};

      DT.on('btnClear', function () {
        DT.clearErrorLine(input);
        input.setValue('');
        output.setValue('');
        pendingBytes = null;
        var im = document.getElementById('inMeta'), om = document.getElementById('outMeta');
        if (im) im.textContent = '';
        if (om) om.textContent = '';
        DT.status('Editor dikosongkan.', 'idle');
        input.focus();
      });

      DT.on('btnCopy', function () {
        var text = output.getValue();
        if (!text) { DT.status('Belum ada hasil untuk disalin.', 'warn'); return; }
        var done = function () { DT.status('Hasil disalin ke clipboard (' + DT.human(DT.bytes(text)) + ').', 'ok'); };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { DT.fallbackCopy(text, done); });
        } else {
          DT.fallbackCopy(text, done);
        }
      });

      DT.on('btnDownload', function () {
        if (pendingBytes) {
          DT.saveBlob(new Blob([pendingBytes.bytes], { type: 'application/octet-stream' }), pendingBytes.name);
          DT.status('File ' + pendingBytes.name + ' diunduh.', 'ok');
          return;
        }
        var text = output.getValue();
        if (!text) { DT.status('Belum ada hasil untuk diunduh.', 'warn'); return; }
        DT.saveBlob(new Blob([text], { type: mime + ';charset=utf-8' }), filename);
        DT.status('File ' + filename + ' diunduh (' + DT.human(DT.bytes(text)) + ').', 'ok');
      });

      var file = document.getElementById('fileInput');
      DT.on('btnUpload', function () { file.value = ''; file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.size > 16 * 1024 * 1024) {
          DT.status('File terlalu besar (' + DT.human(f.size) + '). Batas aman untuk diproses di browser adalah 16 MB.', 'error');
          return;
        }
        var r = new FileReader();
        if (opts.onUploadBytes) {
          r.onload = function () { opts.onUploadBytes(new Uint8Array(r.result), f); };
          r.readAsArrayBuffer(f);
        } else {
          r.onload = function () {
            input.setValue(String(r.result));
            var im = document.getElementById('inMeta');
            if (im) im.textContent = f.name + ' · ' + DT.human(f.size);
            DT.status('File ' + f.name + ' dimuat (' + DT.human(f.size) + ').', 'ok');
          };
          r.readAsText(f);
        }
        r.onerror = function () { DT.status('Gagal membaca file: ' + (r.error && r.error.message), 'error'); };
      });

      input.on('change', function () { pendingBytes = null; });
    },

    fallbackCopy: function (text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        DT.status('Browser menolak akses clipboard. Salin manual dengan Ctrl/Cmd + C.', 'warn');
      }
      ta.remove();
    }
  };

  global.DT = DT;

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('dt-theme', dark ? 'dark' : 'light'); } catch (e) {}
        editors.forEach(function (cm) { cm.setOption('theme', themeName()); });
      });
    }

    var navBtn = document.getElementById('navToggle');
    var sidebar = document.getElementById('sidebar');
    if (navBtn && sidebar) {
      navBtn.addEventListener('click', function () {
        var open = sidebar.classList.toggle('is-open');
        navBtn.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      });
      sidebar.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          sidebar.classList.remove('is-open');
          document.body.style.overflow = '';
        }
      });
    }

    var q = document.getElementById('q');
    if (q) {
      var empty = document.getElementById('qEmpty');
      q.addEventListener('input', function () {
        var term = q.value.trim().toLowerCase();
        var hits = 0;
        document.querySelectorAll('[data-name]').forEach(function (card) {
          var show = !term || card.dataset.name.indexOf(term) !== -1;
          card.style.display = show ? '' : 'none';
          if (show) hits++;
        });
        document.querySelectorAll('.cat-section').forEach(function (sec) {
          var any = sec.querySelector('[data-name]:not([style*="display: none"])');
          sec.style.display = any ? '' : 'none';
        });
        empty.classList.toggle('hidden', hits > 0);
      });
    }
  });
})(window);
