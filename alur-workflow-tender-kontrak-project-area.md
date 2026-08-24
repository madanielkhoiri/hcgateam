# Alur Workflow Sistem e-ProM Ã¢Â€Â” Modul Tender, Kontrak, Project Area, Meeting Progress, Dokumen, Financial Monitoring & Project Closing

## Daftar Isi

1. Ringkasan Modul
2. ERD (Entity Relationship Diagram)
3. Aturan Umum (Notifikasi, Approval, Komentar, Batas Waktu)
4. Alur Workflow Ã¢Â€Â” OWNER AREA
   - 4.1 Tender
   - 4.2 Kontrak
5. Alur Workflow Ã¢Â€Â” PROJECT AREA
   - 5.1 Engineer
   - 5.2 Konstruksi
   - 5.3 Meeting Progress
   - 5.4 Dokumen
   - 5.5 Financial & Monitoring
   - 5.6 Project Closing
6. Ketentuan yang Sudah Dikonfirmasi

---

## 1. Ringkasan Modul

| Area | Modul | Sub-Modul |
|---|---|---|
| OWNER AREA | Tender | Upload Dokumen, Undangan Tender, Klasifikasi & Evaluasi Tender |
| OWNER AREA | Kontrak | Pembuatan Kontrak, Legalitas Vendor |
| PROJECT AREA | Engineer | Shop Drawing, Material Approval, Metode Pekerjaan, Sertifikasi Pekerjaan, Daftar Peralatan |
| PROJECT AREA | Konstruksi | Checklist Tahapan Pekerjaan, Inspeksi Area Pekerjaan, Progress Harian/Mingguan/Bulanan, Inspeksi Peralatan, TTA, KTA, IBPR, JSA, Sosialisasi JSA |
| PROJECT AREA | Meeting Progress | Meeting, Dokumentasi Meeting, MOM |
| PROJECT AREA | Dokumen | Surat Teguran, Surat Peringatan, Coaching & Counseling, Memo |
| PROJECT AREA | Financial & Monitoring | Opname Pekerjaan |
| PROJECT AREA | Project Closing | As Build Drawing, Komisioning, Serah Terima, Masa Pemeliharaan |

Aktor utama (hanya 2 role, tidak ada role Admin terpisah):
- **Owner** Ã¢Â€Â” **akses penuh (all access)** ke seluruh modul: mengelola Tender, Kontrak, Meeting, serta mereview, approve/reject dan boleh memberi komentar (opsional) pada seluruh submission dari Vendor.
- **Vendor** Ã¢Â€Â” mengunggah dokumen/file pada seluruh sub-modul Project Area, mengunggah SPH pada Tender. **Akses dibatasi** (scope-nya perlu didetailkan lebih lanjut Ã¢Â€Â” misalnya hanya bisa melihat/mengelola project miliknya sendiri, tidak bisa melihat data vendor lain).

---

## 2. ERD (Entity Relationship Diagram)

```
+------------------+          +--------------------+          +------------------+
|     Vendor       |----------|   TenderProcess     |----------|  DocumentFolder  |
+------------------+  1     n +--------------------+  1     n +------------------+
| id               |          | id                  |          | id               |
| nama_vendor      |          | nama_tender          |          | tender_id (FK)   |
| npwp             |          | status               |          | nama_folder      |
| legalitas_status |          | tanggal_mulai         |          | parent_folder_id |
+------------------+          | tanggal_selesai       |          +------------------+
        |                     +--------------------+                     |
        |                              |                                  |
        | 1                            | 1                                | 1
        |                              |                                  |
        n                              n                                  n
+------------------+          +--------------------+          +------------------+
| TenderUndangan   |          |   TenderSPH         |          |  FileUpload      |
+------------------+          +--------------------+          +------------------+
| id               |          | id                  |          | id               |
| tender_id (FK)   |          | tender_id (FK)      |          | folder_id (FK)   |
| vendor_id (FK)   |          | vendor_id (FK)      |          | nama_file        |
| file_undangan    |          | round_ke (1,2,3..)  |          | tipe_file (PDF/  |
| tanggal_kirim    |          | file_sph            |          |   RAB/CAD/Foto)  |
+------------------+          | harga_penawaran     |          | url_file         |
                               | is_final            |          | uploaded_by      |
                               | status_pemenang     |          | uploaded_at      |
                               +--------------------+          +------------------+
                                        |
                                        | 1
                                        n
                               +--------------------+
                               |   Kontrak          |
                               +--------------------+
                               | id                  |
                               | tender_id (FK)       |
                               | vendor_id (FK)       |
                               | nomor_kontrak        |
                               | file_kontrak         |
                               | tanggal_kontrak      |
                               +--------------------+
                                        |
                                        | 1
                                        n
                               +--------------------+
                               |     Project        |
                               +--------------------+
                               | id                  |
                               | kontrak_id (FK)      |
                               | nama_project         |
                               +--------------------+
                                        |
        +-----------+-----------+------+------+-----------+-----------+
        |           |           |             |           |           |
        n           n           n             n           n           n
+--------------+ +-----------+ +-----------+ +---------+ +---------+ +-----------+
| ShopDrawing  | | Material  | | Metode    | | Sertif  | | Peralatan| | Checklist |
| ...(Engineer)| | Approval  | | Pekerjaan | | ikasi   | | List    | | Konstruksi|
+--------------+ +-----------+ +-----------+ +---------+ +---------+ +-----------+
| id           | | id        | | id        | | id      | | id      | | id        |
| project_id   | | project_id| | project_id| | proj_id | | proj_id | | project_id|
| nama_pekerjaan| | nama_mat | | nama_metode|| file    | | file    | | nama_tahap|
| file_url     | | file_url  | | file_url  | | status  | | status  | | file_url  |
| status       | | status    | | status    | | komentar| | komentar| | status    |
| komentar     | | komentar  | | komentar  | +---------+ +---------+ | komentar  |
+--------------+ +-----------+ +-----------+                        +-----------+

+------------------+   +------------------+   +------------------+
| ProgressHarian   |   | ProgressMingguan |   | ProgressBulanan  |
+------------------+   +------------------+   +------------------+
| id               |   | id               |   | id               |
| project_id (FK)  |   | project_id (FK)  |   | project_id (FK)  |
| tanggal          |   | minggu_ke        |   | bulan            |
| file_url         |   | file_url         |   | file_url         |
| uploaded_at      |   | uploaded_at      |   | uploaded_at      |
+------------------+   +------------------+   +------------------+

+------------------+   +------------------+   +------------------+
|   TTA            |   |   KTA            |   |   IBPR           |
+------------------+   +------------------+   +------------------+
| id               |   | id               |   | id               |
| project_id (FK)  |   | project_id (FK)  |   | project_id (FK)  |
| bulan            |   | bulan            |   | file_url         |
| file_url         |   | file_url         |   | status           |
| tanggal_upload   |   | tanggal_upload   |   | komentar         |
+------------------+   +------------------+   +------------------+

(persen_performa TTA/KTA dihitung on-the-fly dari
 COUNT(upload bulan berjalan) / 8 * 100%, tidak disimpan
 sebagai kolom fisik Ã¢Â€Â” lihat 3.4)

+------------------+          +---------------------+
|      JSA         |----------|  SosialisasiJSA     |
+------------------+  1     1 +---------------------+
| id               |          | id                  |
| project_id (FK)  |          | jsa_id (FK)          |
| nama_pekerjaan   |          | file_url             |
| file_url         |          | tanggal              |
| status           |          +---------------------+
| komentar         |
+------------------+

+------------------+          +---------------------+          +------------------+
|    Meeting       |----------|  DokumentasiMeeting |          |       MOM        |
+------------------+  1     n +---------------------+  1     n +------------------+
| id               |          | id                  |          | id               |
| project_id (FK)  |          | meeting_id (FK)      |          | meeting_id (FK)  |
| tipe_link (Mingguan/         | file_foto            |          | pica             |
|   Bulanan)        |          +---------------------+          | due_date         |
| ref_progress_id  |                                             | pic              |
| tanggal_meeting  |                                             | status_close     |
+------------------+                                             | tgl_close        |
                                                                   | hari_terlambat   |
                                                                   +------------------+

+------------------+          +------------------+
| DokumenSurat     |          | OpnamePekerjaan  |
+------------------+          +------------------+
| id               |          | id               |
| project_id (FK)  |          | project_id (FK)  |
| tipe (Teguran/   |          | progress_persen  |
|  Peringatan/     |          | file_url         |
|  Coaching/Memo)  |          | status           |
| file_url         |          | komentar         |
| tanggal          |          +------------------+
+------------------+

+------------------+   +------------------+   +------------------+
| AsBuildDrawing   |   |  Komisioning     |   |  SerahTerima     |
+------------------+   +------------------+   +------------------+
| id               |   | id               |   | id               |
| project_id (FK)  |   | project_id (FK)  |   | project_id (FK)  |
| file_url         |   | file_url         |   | file_url         |
| status           |   | status           |   | status           |
| komentar         |   | komentar         |   | komentar         |
+------------------+   +------------------+   +------------------+

+------------------+   +------------------+
| MasaPemeliharaan |   |  BASerahTerima   |
| _Checklist       |   +------------------+
+------------------+   | id               |
| id               |   | project_id (FK)  |
| project_id (FK)  |   | file_url         |
| file_url         |   | status           |
| status           |   | komentar         |
| komentar         |   +------------------+
+------------------+
```

Catatan ERD:
- `status` pada seluruh entitas approval bernilai salah satu dari: `PENDING`, `APPROVED`, `REJECTED`.
- `komentar` selalu nullable (opsional), berlaku untuk approve maupun reject.
- `DocumentFolder` dan `FileUpload` dipakai berulang di beberapa modul yang punya sifat "seperti Google Drive" (Upload Dokumen Tender, Legalitas Vendor).

---

## 3. Aturan Umum

### 3.1 Approval & Komentar
- Setiap submission (upload file) yang membutuhkan review Owner memiliki status default `PENDING`.
- Owner dapat mengubah status menjadi `APPROVED` atau `REJECTED`.
- Kolom komentar **selalu opsional** Ã¢Â€Â” approve boleh tanpa komentar, reject boleh tanpa komentar, begitu pula sebaliknya boleh diisi.
- Vendor tetap bisa melihat status dan komentar (jika ada) pada setiap submission miliknya.
- **REJECTED dianggap sudah closed/selesai direview** Ã¢Â€Â” bukan berarti "belum selesai". Status ini tidak lagi dihitung sebagai item pending (lihat 3.2). Jika Vendor ingin memperbaiki, Vendor mengunggah submission baru (entri baru), bukan mengedit entri yang sudah REJECTED.

### 3.2 Notifikasi Merah (Badge Count)
- Badge angka merah menghitung jumlah item berstatus `PENDING` **saja** pada sub-modul terkait. Item berstatus `APPROVED` maupun `REJECTED` sama-sama dianggap sudah closed dan tidak lagi ikut dihitung di badge.
- Badge juga **diagregasi ke level judul/menu induk**, bukan hanya di sub-menu. Contoh: jika di Project Area total ada 3 item pending (gabungan dari Shop Drawing 1 + Material Approval 2), maka menu **Project Area** juga menampilkan badge angka **3**, begitu juga breadcrumb/parent di atasnya (Engineer, Konstruksi, dst. masing-masing menjumlahkan dari sub-modulnya).
- Modul yang memakai notifikasi merah: Shop Drawing, Material Approval, Metode Pekerjaan, Sertifikasi Pekerjaan, Daftar Peralatan, Checklist Tahapan Pekerjaan, IBPR, JSA, Opname Pekerjaan, As Build Drawing, Komisioning, Serah Terima, Checklist Masa Pemeliharaan, BA Serah Terima.
- Modul yang **tidak** memakai badge approval (murni upload tanpa approval): Progress Harian, Progress Mingguan, Progress Bulanan, Inspeksi Area Pekerjaan, Inspeksi Peralatan, TTA, KTA, Sosialisasi JSA, Dokumentasi Meeting, Dokumen (Surat Teguran dkk).

### 3.3 Batas Waktu Upload (Zona Waktu WITA)

| Sub-Modul | Jam Buka | Jam Tutup |
|---|---|---|
| Inspeksi Area Pekerjaan | 08:00 | 12:00 |
| Progress Harian | 08:00 | 22:00 |
| Progress Mingguan | 08:00 | 22:00 |
| Progress Bulanan | 08:00 | 22:00 |
| Inspeksi Peralatan | 08:00 | 10:00 |

- Di luar jam tersebut, tombol upload dinonaktifkan (disabled) dan sistem menampilkan pesan bahwa waktu upload sudah lewat/belum dibuka.
- Jika sampai jam tutup tidak ada upload sama sekali untuk hari tersebut, hari itu dianggap **terlewat (missed)** Ã¢Â€Â” tidak ada mekanisme susulan/override.
- Pada tabel rekap (kalender/list harian) di masing-masing sub-modul bertenggat jam, baris/sel untuk hari yang terlewat **ditandai warna merah** sebagai penanda visual bahwa hari tersebut tidak ada submission, terpisah dari badge notifikasi approval di 3.2.

### 3.4 Minimum Upload Bulanan & Persen Performa
- **TTA (Tindakan Tidak Aman)**: target minimal 8 upload per bulan per project.
- **KTA (Kondisi Tidak Aman)**: target minimal 8 upload per bulan per project.
- Sistem menghitung **persen performa** per bulan dengan formula:

  ```
  persen_performa = (jumlah_upload_bulan_berjalan / 8) * 100%
  ```

  - Upload = 8 kali atau lebih Ã¢Â†Â’ **100% performa**.
  - Upload kurang dari 8 Ã¢Â†Â’ persentase menyesuaikan proporsional, misal upload 5 kali Ã¢Â†Â’ **62,5%** (5/8 ÃƒÂ— 100%).
- Ditampilkan sebagai progress bar/angka persen di halaman TTA dan KTA, dihitung ulang (reset) setiap awal bulan.

### 3.5 Relasi Otomatis JSA Ã¢Â†Â’ Sosialisasi JSA
- Relasi **1:1 ketat** Ã¢Â€Â” setiap 1 JSA hanya memiliki **1 slot upload Sosialisasi JSA**, tidak boleh lebih dari satu file sosialisasi per JSA.
- Jumlah entri Sosialisasi JSA otomatis mengikuti jumlah entri JSA yang sudah dibuat pada project tersebut. Jika ada 10 JSA, maka otomatis tersedia 10 slot Sosialisasi JSA (masing-masing linked by `jsa_id`), tidak bisa membuat Sosialisasi JSA baru di luar jumlah JSA maupun lebih dari 1 file per JSA.

---

## 4. Alur Workflow Ã¢Â€Â” OWNER AREA

### 4.1 Tender

#### 4.1.1 Upload Dokumen (PDF, RAB, CAD)
1. Owner membuat folder tender baru dan memberi nama folder (misal: nama proyek/tender).
2. Di dalam folder tersebut, Owner dapat membuat sub-folder, mengunggah file bertipe PDF, RAB, CAD, maupun foto, serta mengatur/memindah (organize) file antar folder Ã¢Â€Â” sama seperti struktur Google Drive.
3. Owner dapat memilih beberapa/semua file dalam folder lalu melakukan **Download All** (di-zip otomatis oleh sistem).
4. Fitur dibatasi pada **upload, download, dan organize folder** saja Ã¢Â€Â” tidak ada fitur versioning/riwayat revisi file maupun share link ke pihak eksternal di luar sistem.

#### 4.1.2 Undangan Tender
1. Owner menarik (link/attach) dokumen dari folder Upload Dokumen Tender yang relevan (misal RKS, BoQ) untuk dijadikan lampiran undangan.
2. Owner memilih vendor-vendor yang akan diundang.
3. Sistem generate/kirim Undangan Tender berisi file yang ditarik tadi ke masing-masing vendor terpilih.
4. Tanggal kirim tercatat otomatis sebagai riwayat undangan.

#### 4.1.3 Klasifikasi dan Evaluasi Tender (SPH)
1. Sistem menampilkan daftar vendor yang mengikuti tender (hasil dari Undangan Tender).
2. Untuk setiap vendor, tersedia slot upload **SPH 1**.
3. Jika diperlukan negosiasi/penawaran ulang, Owner/Vendor dapat menambah **SPH 2**, **SPH 3**, dan seterusnya Ã¢Â€Â” jumlah round SPH bersifat dinamis dan **independen per vendor** (Vendor A bisa berhenti di SPH 2, Vendor B bisa sampai SPH 4, tidak perlu disamakan jumlah round-nya).
4. Setiap round SPH hanya berisi file upload; **harga penawaran belum diinput** di round-round awal.
5. Setelah dirasa cukup (SPH final/terakhir per vendor Ã¢Â€Â” round terakhir masing-masing vendor, terlepas berapa pun nomor round-nya), baru diinput **harga penawaran akhir** pada round SPH tersebut, dan round tersebut ditandai `is_final = true`.
6. Setelah seluruh vendor menyelesaikan SPH final masing-masing dan harga sudah diinput semua, sistem **otomatis membandingkan harga final** antar vendor (dibandingkan berdasarkan harga pada round `is_final = true` masing-masing vendor, bukan berdasarkan nomor round yang sama).
7. Vendor dengan harga penawaran final terendah **otomatis dan final** ditandai sebagai **Pemenang Tender** (`status_pemenang = true`) Ã¢Â€Â” tanpa perlu tombol konfirmasi/approve manual tambahan dari Owner, dan status vendor lain otomatis menjadi tidak menang.
8. Data pemenang ini menjadi acuan untuk proses selanjutnya di modul Kontrak.

### 4.2 Kontrak

#### 4.2.1 Pembuatan Kontrak
1. Owner membuka data Pemenang Tender (dari hasil Klasifikasi & Evaluasi Tender).
2. Owner mengunggah file kontrak (PDF) dan mengisi nomor kontrak serta tanggal kontrak.
3. Kontrak yang sudah dibuat menjadi acuan untuk membuka Project baru di Project Area.

#### 4.2.2 Legalitas Vendor
1. Vendor/Owner mengunggah seluruh dokumen legalitas (SIUP, NPWP, Akta, dsb.) ke dalam folder khusus per vendor.
2. Struktur folder dan fitur sama seperti Upload Dokumen Tender (mirip Google Drive): bisa buat folder, upload banyak file/foto, dan Download All Ã¢Â€Â” cukup fitur upload/download/organize, tanpa versioning maupun share link eksternal.

---

## 5. Alur Workflow Ã¢Â€Â” PROJECT AREA

Ketentuan umum Project Area: **Vendor mengunggah**, **Owner mereview** (approve/reject), Owner boleh memberi komentar (opsional) baik saat approve maupun reject.

### 5.1 Engineer

#### 5.1.1 Shop Drawing
1. Vendor menginput Nama Pekerjaan dan mengunggah file Shop Drawing.
2. Status awal `PENDING`, muncul di badge notifikasi merah (di sub-judul Shop Drawing sekaligus terakumulasi ke judul Engineer dan Project Area).
3. Owner membuka daftar Shop Drawing yang pending, mereview file.
4. Owner memilih Approve atau Reject, komentar opsional.
5. Badge berkurang otomatis setelah item direview (tidak lagi dihitung sebagai pending).

#### 5.1.2 Material Approval
1. Vendor menginput Nama Material dan mengunggah file.
2. Owner approve/reject dengan komentar opsional.
3. Badge notifikasi mengikuti aturan di 3.2.

#### 5.1.3 Metode Pekerjaan
1. Vendor menginput Nama Metode dan mengunggah file.
2. Owner approve/reject dengan komentar opsional.

#### 5.1.4 Sertifikasi Pekerjaan
1. Vendor mengunggah file sertifikasi.
2. Owner approve/reject dengan komentar opsional.

#### 5.1.5 Daftar Peralatan
1. Vendor mengunggah file daftar peralatan.
2. Owner approve/reject dengan komentar opsional.

### 5.2 Konstruksi

#### 5.2.1 Checklist Tahapan Pekerjaan
1. Vendor mengunggah file checklist per tahapan pekerjaan.
2. Owner approve/reject dengan komentar opsional, memakai badge notifikasi merah.

#### 5.2.2 Inspeksi Area Pekerjaan
1. Vendor mengunggah file inspeksi hanya dapat dilakukan pukul **08:00Ã¢Â€Â“12:00 WITA**.
2. Di luar jam tersebut, upload terkunci.
3. Tidak melalui proses approve/reject (murni dokumentasi upload).

#### 5.2.3 Progress Harian
1. Vendor mengunggah file progress harian, jam upload dibuka **08:00Ã¢Â€Â“22:00 WITA**.
2. Tidak melalui approve/reject.

#### 5.2.4 Progress Mingguan
1. Sama seperti Progress Harian namun basis mingguan, jam upload **08:00Ã¢Â€Â“22:00 WITA**.

#### 5.2.5 Progress Bulanan
1. Sama seperti Progress Harian namun basis bulanan, jam upload **08:00Ã¢Â€Â“22:00 WITA**.

#### 5.2.6 Inspeksi Peralatan
1. Vendor mengunggah file inspeksi peralatan, jam upload dibatasi **08:00Ã¢Â€Â“10:00 WITA**.

#### 5.2.7 Tindakan Tidak Aman (TTA)
1. Vendor mengunggah file TTA sepanjang bulan berjalan.
2. Sistem menghitung jumlah upload per bulan dan menampilkan **persen performa** (lihat formula di 3.4): 8 upload atau lebih = 100%, kurang dari itu persentase menyesuaikan proporsional (mis. 5 upload = 62,5%).

#### 5.2.8 Kondisi Tidak Aman (KTA)
1. Sama seperti TTA Ã¢Â€Â” sistem menghitung persen performa bulanan dengan formula yang sama (lihat 3.4).

#### 5.2.9 IBPR
1. Vendor mengunggah file IBPR.
2. Owner approve/reject dengan komentar opsional, memakai badge notifikasi merah.

#### 5.2.10 JSA
1. Vendor mengunggah file JSA per pekerjaan.
2. Owner approve/reject dengan komentar opsional, memakai badge notifikasi merah.

#### 5.2.11 Sosialisasi JSA
1. Sistem otomatis membuat slot Sosialisasi JSA mengikuti jumlah entri JSA yang sudah ada (relasi **1:1 ketat**, lihat 3.5) Ã¢Â€Â” 1 JSA hanya boleh diisi **1 file** upload sosialisasi.
2. Vendor mengunggah bukti/file sosialisasi untuk setiap JSA yang sudah dibuat; slot yang sudah terisi tidak bisa ditambah file kedua, hanya bisa diganti/replace file yang sama.
3. Tidak ada proses approve/reject pada tahap ini (murni bukti dokumentasi).

### 5.3 Meeting Progress

#### 5.3.1 Meeting
1. User memilih ingin membahas data dari Progress Mingguan atau Progress Bulanan.
2. Sistem menampilkan daftar file (PDF) beserta tanggalnya yang tersedia dari pilihan tersebut (link otomatis, bukan upload baru).
3. User memilih file spesifik yang ingin dibahas pada sesi meeting.
4. Sistem mencatat sesi meeting beserta referensi progress dan tanggal meeting.

#### 5.3.2 Dokumentasi Meeting
1. User mengunggah foto/dokumentasi selama meeting berlangsung.
2. Tidak ada approve/reject.

#### 5.3.3 MOM (Minutes of Meeting)
1. User menginput baris MOM dengan kolom: **PICA** (Person In Charge Action/uraian tindak lanjut), **Due Date**, **PIC**, **Close** (status selesai/belum), **Keterlambatan**.
2. Selama status belum `Close`, sistem menghitung otomatis jumlah hari keterlambatan dari `Due Date` terhadap tanggal hari ini (berjalan/live count), dihitung dalam **hari kalender penuh** (termasuk Sabtu, Minggu, dan hari libur Ã¢Â€Â” tidak dikurangi/disesuaikan dengan hari kerja).
3. Saat item ditandai `Close`, sistem mencatat tanggal close dan **membekukan (freeze)** angka keterlambatan pada saat itu Ã¢Â€Â” perhitungan berhenti bertambah setelah close.
4. Angka keterlambatan yang sudah dibekukan tetap tampil di data (misalnya "Close, terlambat 3 hari") sebagai riwayat, bukan dihapus.

### 5.4 Dokumen

1. User memilih tipe dokumen: **Surat Teguran**, **Surat Peringatan**, **Coaching & Counseling**, atau **Memo**.
2. User mengunggah file terkait dan mengisi tanggal.
3. Tidak ada proses approve/reject Ã¢Â€Â” dokumen ini sifatnya arsip/administratif.

### 5.5 Financial & Monitoring

#### 5.5.1 Opname Pekerjaan
1. Vendor menginput nilai Progress (%), misal 20%, dan mengunggah file pendukung opname.
2. Owner approve/reject dengan komentar opsional, memakai badge notifikasi merah.

### 5.6 Project Closing

#### 5.6.1 Submit As Build Drawing
1. Vendor mengunggah file As Build Drawing.
2. Owner approve/reject dengan komentar opsional, badge notifikasi merah.

#### 5.6.2 Komisioning
1. Vendor mengunggah file komisioning.
2. Owner approve/reject dengan komentar opsional, badge notifikasi merah.

#### 5.6.3 Serah Terima
1. Vendor mengunggah file serah terima.
2. Owner approve/reject dengan komentar opsional, badge notifikasi merah.

#### 5.6.4 Masa Pemeliharaan
1. **Checklist**: Vendor mengunggah file checklist masa pemeliharaan; Owner approve/reject dengan komentar opsional, badge notifikasi merah.
2. **BA Serah Terima**: Vendor mengunggah file Berita Acara Serah Terima akhir masa pemeliharaan; Owner approve/reject dengan komentar opsional, badge notifikasi merah.

---

## 6. Ketentuan yang Sudah Dikonfirmasi

| No | Topik | Keputusan |
|---|---|---|
| 1 | Klasifikasi & Evaluasi Tender | Harga termurah **otomatis dan final** jadi pemenang, tanpa perlu approve manual tambahan dari Owner. |
| 2 | SPH per vendor | Tiap vendor **boleh punya jumlah round SPH berbeda-beda**, dibandingkan berdasarkan harga final masing-masing (bukan nomor round yang sama). |
| 3 | Upload Dokumen (mirip Google Drive) | Cukup fitur **upload, download, dan organize folder**. Tidak ada versioning maupun share link eksternal. |
| 4 | Notifikasi merah saat REJECTED | **REJECTED dianggap closed** Ã¢Â€Â” tidak lagi dihitung sebagai item pending di badge. |
| 5 | Batas jam upload (WITA) | Jika lewat jam, **dianggap terlewat** (tanpa mekanisme override/izin susulan) dan baris hari tersebut **ditandai warna merah** pada tabel rekap. |
| 6 | Minimal TTA/KTA 8/bulan | Diubah jadi **indikator persen performa**: `(jumlah upload / 8) ÃƒÂ— 100%`. 8 upload = 100%, kurang dari itu menyesuaikan proporsional (mis. 5 upload = 62,5%). |
| 7 | MOM keterlambatan | Dihitung dalam **hari kalender penuh** (termasuk weekend/libur), bukan hari kerja. |
| 8 | Sosialisasi JSA | **1 JSA = 1 file sosialisasi** (relasi 1:1 ketat), tidak bisa lebih dari satu. |
| 9 | Role & akses | Hanya **2 role**: **Owner** (all access Ã¢Â€Â” bebas ke seluruh modul) dan **Vendor** (akses dibatasi, detail scope-nya akan ditentukan menyusul). **Tidak ada role Admin/PM terpisah** Ã¢Â€Â” seluruh tugas yang sebelumnya disebut "Admin/PM" (kelola Tender, Kontrak, Meeting) dijalankan oleh Owner. |

### Catatan Tindak Lanjut
- Detail pembatasan akses Vendor (mis. hanya bisa lihat project miliknya sendiri, tidak bisa lihat harga penawaran vendor lain sebelum menang, dsb.) **tidak didetailkan di modul ini** karena sistem ini rencananya akan digabung ke web lain yang sudah punya manajemen akun terpusat (role & permission diatur di sana). Modul Tender/Kontrak/Project Area ini cukup mengasumsikan role `Owner` dan `Vendor` sudah tersedia dari sistem akun eksternal tersebut, tanpa perlu membangun modul user management sendiri.

