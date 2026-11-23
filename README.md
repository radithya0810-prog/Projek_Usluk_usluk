# **JAWA AI**

Chatbot sederhana berbasis web. Server node.js yang saya buat saat waktu kosong.
model menggunakana OpenRouter jika inggin menggunakan chatbot ini ambil API dari openrouter.

## **Fitur :**

1. Jawaban muncul bertahap seperti di aplikasi chat.
2. Tampilan markdown (judul, daftar, tabel, blok kode) dan rumus (KaTeX).
3. Mode terang dan gelap otomatis mengikuti pengaturan sistem.
4. Tanpa npm install, hanya memakai modul bawaan Node.js.
5. Opsi menjalankan sebagai jendela kecil dan ikon tray (Windows).

## **Cara Menjalakan:**

1. Buat API key di openrouter
2. jalankan ini di powershell :

`$env:OPENROUTER_API_KEY="isi-key-kamu"; node server.js`

Jika menggunakan Linux :
`OPENROUTER_API_KEY="isi-key-kamu" node server.js`

Simpan API Key di powershell :
`setx OPENROUTER_API_KEY "isi-key-kamu"`

## **Instalasi:**

1. Unduh zip
2. Extract zip

beberapa kekurangan :

1. riwayat chat bakal hilang ketika ditutup tab nya
2. model AI gratis jadi ada limit
