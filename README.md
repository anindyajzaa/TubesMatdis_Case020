# Coloring Graf pada Kasus Asap Sate di Malioboro

Tugas Besar Matematika Diskrit  
Case 20: Kepulan asap pembakaran sate tebal mengganggu visibilitas

## Anggota Kelompok

| No | Nama | NIM |
|---|---|---|
| 1 | [Anindya Jauzaa Rusyana] | [251524001] |
| 2 | [Hana Mardhiyyah] | [251524011] |
| 3 | [Luthfiah Nurazizah] | [251524020] |
| 4 | [Rizni Febrianty Surya Putri] | [251524029] |

Kelas: [2A-D4]  
Dosen Pengampu: [Trisna Gelar, S.T., M.Kom.]

---

## Deskripsi Proyek

Proyek ini membahas masalah asap pembakaran sate di ruang publik yang ramai, lalu memodelkannya dengan **pewarnaan graf (graph coloring)** untuk menentukan jumlah minimum slot waktu atau zona yang dibutuhkan agar pedagang yang berdekatan tidak membakar sate pada waktu yang sama.

## Kasus Nyata

**Judul berita:** Viral Keluhan Wisatawan Soal Kepulan Asap Sate di Malioboro, Ini Kata Satpol PP Kota Yogyakarta  
**Media:** Tribunjogja.com  
**Penulis:** Azka Ramadhan  
**Tayang:** Minggu, 28 Desember 2025  
**Tautan:** https://jogja.tribunnews.com/diy/1204064/viral-keluhan-wisatawan-soal-kepulan-asap-sate-di-malioboro-ini-kata-satpol-pp-kota-yogyakarta

### Ringkasan Berita

Di tengah keramaian libur Natal dan Tahun Baru, sebuah unggahan wisatawan di Instagram menjadi viral. Wisatawan tersebut mengeluhkan asap dari pedagang sate keliling di kawasan Malioboro, Kota Yogyakarta. Lokasi yang disebut berada di depan Gedung DPRD DIY, dekat gang Sosrowijayan. Menurut unggahan itu, asap masuk ke area toko sehingga membuat suasana berbelanja tidak nyaman. Beberapa calon pembeli disebut batal berbelanja, dan ada karyawan toko yang matanya perih sampai menangis.

Kepala Satpol PP Kota Yogyakarta, Octo Noor Arafat, menanggapi bahwa pihaknya tidak tinggal diam. Penindakan sudah dilakukan, mulai dari sanksi tindak pidana ringan (tipiring) pada masa lalu hingga penyitaan barang dagangan yang berulang. Namun efek jera belum muncul karena pedagang kerap berpindah-pindah. Saat petugas patroli, pedagang menghilang, lalu muncul lagi di titik lain. Sebagai contoh, petugas pernah menerima laporan pedagang sate di area Pasar Kembang, tetapi pedagang sudah berpindah ke titik lain sebelum petugas tiba.

### Kaitan dengan Topik

Berita ini menunjukkan tiga hal yang relevan untuk pemodelan:

1. Banyak pedagang beroperasi berdekatan di area yang padat orang, sehingga asapnya saling bertumpuk dan sampai ke pengunjung maupun toko di sekitarnya.
2. Penindakan satu per satu (razia dan penyitaan) belum menyelesaikan masalah karena posisi pedagang terus berubah.
3. Dibutuhkan pengaturan yang sistematis, misalnya penjadwalan atau pembagian zona, bukan sekadar pelarangan.

Catatan: berita ini menyoroti gangguan asap terhadap pengunjung dan toko di kawasan pedestrian. Aspek jarak pandang pengendara di jalan tidak dibahas dalam berita ini.

## Pemodelan Graf

Masalah dimodelkan sebagai graf sederhana tak berarah G = (V, E):

- **Simpul (V):** setiap pedagang sate (titik lapak).
- **Sisi (E):** dua pedagang dihubungkan jika jaraknya cukup dekat sehingga asapnya bertemu dan menumpuk. Batas jarak yang dipakai adalah asumsi kelompok, yaitu [isi, misalnya 5 meter].
- **Warna:** slot waktu berjualan atau zona penempatan.

Aturan pewarnaan: dua simpul yang bertetangga tidak boleh memiliki warna yang sama. Artinya, dua pedagang yang asapnya saling bertumpuk tidak boleh membakar sate pada slot waktu atau zona yang sama.

Tujuan: menemukan **bilangan kromatik χ(G)**, yaitu jumlah warna paling sedikit yang dibutuhkan. Dalam konteks kasus ini, itu berarti jumlah slot waktu atau zona minimum yang diperlukan agar semua pedagang tetap bisa berjualan tanpa asap yang menumpuk.

## Contoh Ilustrasi

Misalkan ada enam pedagang (A sampai F). Pedagang A, B, dan C saling berdekatan sehingga membentuk segitiga, sedangkan D terhubung ke B dan C, dan D, E, F saling berdekatan sehingga membentuk segitiga lain.

Dengan algoritma pewarnaan Welsh-Powell, simpul diurutkan dari derajat terbesar ke terkecil, lalu diberi warna secara bergiliran. Hasilnya, enam pedagang tersebut cukup dibagi ke **tiga slot waktu**:

- Slot 1: D dan A
- Slot 2: B dan E
- Slot 3: C dan F

Jumlah tiga slot adalah yang paling sedikit, karena adanya segitiga (tiga pedagang yang saling berdekatan) memaksa minimal tiga warna berbeda. Jadi χ(G) = 3.

## Analisis

- Jika semua pedagang berdempetan satu sama lain (graf lengkap), jumlah slot yang dibutuhkan sama dengan jumlah pedagang. Ini kondisi terburuk, mirip deretan lapak rapat di kawasan ramai.
- Pedagang yang berjauhan bisa berjualan bersamaan di slot yang sama, sehingga pembagian slot tidak harus mengurangi waktu berjualan secara drastis.
- Algoritma Welsh-Powell bersifat greedy, jadi hasilnya tidak selalu minimum untuk graf yang lebih besar, tetapi memberikan solusi yang cukup baik dan mudah dihitung.

## Keterbatasan Model

- Pedagang sate keliling berpindah lokasi, sehingga graf sebenarnya berubah-ubah (dinamis), sedangkan model ini mengambil kondisi pada satu waktu tertentu.
- Arah angin, volume asap, dan jenis pembakaran tidak diperhitungkan. Semua pedagang dianggap menghasilkan asap setara.
- Batas jarak antarpedagang adalah asumsi, bukan data lapangan.

## Kesimpulan

Pewarnaan graf dapat membantu menyusun pengaturan yang adil dan terukur untuk pedagang sate di kawasan padat seperti Malioboro. Dengan membagi pedagang ke dalam slot waktu atau zona berdasarkan kedekatan lokasi, asap yang menumpuk dapat dikurangi tanpa harus melarang pedagang berjualan sepenuhnya.

## Sumber

Azka Ramadhan. (2025, 28 Desember). *Viral Keluhan Wisatawan Soal Kepulan Asap Sate di Malioboro, Ini Kata Satpol PP Kota Yogyakarta.* Tribunjogja.com. https://jogja.tribunnews.com/diy/1204064/viral-keluhan-wisatawan-soal-kepulan-asap-sate-di-malioboro-ini-kata-satpol-pp-kota-yogyakarta
