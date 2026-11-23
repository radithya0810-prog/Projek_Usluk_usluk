/* === 1. PENGATURAN (ubah teks di sini) ============== */
const PENGATURAN = {
  judul: 'JAWA AI',                 // judul di header dan tab
  placeholder: 'Tulis pesan…',      // tulisan abu-abu di kolom ketik
  teksTombolKirim: 'Kirim',         // tulisan di tombol Kirim
  teksTombolBaru: 'Chat baru',      // tulisan di tombol Chat baru
  teksMenunggu: '…',                // tampil saat menunggu jawaban
  alamatApi: '/api/chat',           // alamat server (jangan diubah)
};


/* === 2. ELEMEN HALAMAN ============================== */
const elJudul = document.getElementById('judul');
const elTombolBaru = document.getElementById('tombol-baru');
const elAreaChat = document.getElementById('area-chat');
const elDaftarPesan = document.getElementById('daftar-pesan');
const elForm = document.getElementById('form-kirim');
const elKolomKetik = document.getElementById('kolom-ketik');
const elTombolKirim = document.getElementById('tombol-kirim');

// Pasang teks dari PENGATURAN ke halaman
document.title = PENGATURAN.judul;
elJudul.textContent = PENGATURAN.judul;
elKolomKetik.placeholder = PENGATURAN.placeholder;
elTombolKirim.textContent = PENGATURAN.teksTombolKirim;
elTombolBaru.textContent = PENGATURAN.teksTombolBaru;


/* === 3. DATA RIWAYAT CHAT =========================== */
let riwayat = [];   // daftar pesan yang dikirim ke server


/* === 4. MENAMBAH GELEMBUNG PESAN ==================== */
function tambahPesan(peran, teks = '') {
  const el = document.createElement('div');
  el.className = 'pesan ' + (peran === 'user' ? 'pesan-user' : 'pesan-bot');
  el.textContent = teks;
  elDaftarPesan.appendChild(el);
  gulirKeBawah();
  return el;
}

function gulirKeBawah() {
  elAreaChat.scrollTop = elAreaChat.scrollHeight;
}


/* === 5. TAMPILAN JAWABAN BOT (markdown + rumus) ===== */
function tampilkanJawabanBot(el, teks) {
  if (!window.marked || !window.DOMPurify) { el.textContent = teks; return; }

  // Amankan rumus dulu supaya tanda _ dan * di dalamnya tidak dirusak markdown
  const simpanan = [];
  const simpan = (m) => { simpanan.push(m); return '@@MATH' + (simpanan.length - 1) + '@@'; };
  const teksAman = teks
    .replace(/\$\$[\s\S]+?\$\$/g, simpan)
    .replace(/\\\[[\s\S]+?\\\]/g, simpan)
    .replace(/\\\([\s\S]+?\\\)/g, simpan)
    .replace(/\$[^$\n]+?\$/g, simpan);

  let html = DOMPurify.sanitize(marked.parse(teksAman));
  html = html.replace(/@@MATH(\d+)@@/g, (_, i) =>
    simpanan[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  el.innerHTML = html;

  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  } catch {}
}


/* === 6. MENGIRIM PESAN KE SERVER ==================== */
async function kirimPesan(teks) {
  riwayat.push({ role: 'user', content: teks });
  tambahPesan('user', teks);

  const elJawaban = tambahPesan('assistant', PENGATURAN.teksMenunggu);
  elTombolKirim.disabled = true;
  let jawaban = '';

  try {
    const respons = await fetch(PENGATURAN.alamatApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: riwayat }),
    });
    if (!respons.ok) throw new Error((await respons.text()) || respons.statusText);

    // Baca jawaban sedikit demi sedikit (streaming)
    const pembaca = respons.body.getReader();
    const dekoder = new TextDecoder();
    let sisa = '';
    while (true) {
      const { value, done } = await pembaca.read();
      if (done) break;
      sisa += dekoder.decode(value, { stream: true });
      const baris = sisa.split('\n');
      sisa = baris.pop();
      for (const b of baris) {
        if (!b.startsWith('data: ')) continue;
        try {
          const kejadian = JSON.parse(b.slice(6));
          if (kejadian.type === 'content_block_delta' && kejadian.delta.type === 'text_delta') {
            jawaban += kejadian.delta.text;
            tampilkanJawabanBot(elJawaban, jawaban);
            gulirKeBawah();
          }
        } catch {}
      }
    }
    riwayat.push({ role: 'assistant', content: jawaban });
  } catch (err) {
    riwayat.pop();   // buang pesan yang gagal supaya riwayat tetap valid
    elJawaban.classList.add('pesan-error');
    elJawaban.textContent = 'Error: ' + err.message;
  } finally {
    elTombolKirim.disabled = false;
    elKolomKetik.focus();
  }
}


/* === 7. TOMBOL & KOLOM KETIK (interaksi) ============ */

// Tombol Kirim ditekan (atau Enter)
elForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const teks = elKolomKetik.value.trim();
  if (!teks || elTombolKirim.disabled) return;
  elKolomKetik.value = '';
  elKolomKetik.style.height = 'auto';
  kirimPesan(teks);
});

// Enter = kirim, Shift+Enter = baris baru
elKolomKetik.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    elForm.requestSubmit();
  }
});

// Kolom ketik melebar ke bawah sesuai isi
elKolomKetik.addEventListener('input', () => {
  elKolomKetik.style.height = 'auto';
  elKolomKetik.style.height = elKolomKetik.scrollHeight + 'px';
});

// Tombol Chat baru: hapus riwayat dan tampilan
elTombolBaru.addEventListener('click', () => {
  riwayat = [];
  elDaftarPesan.innerHTML = '';
});