# Alur & Desain Workflow Sistem Digitalisasi Monitoring MCU Periodik (v3 — Final)

> Versi final: sudah mengakomodasi 10 keputusan utama + 5 keputusan residual. Ringkasan keputusan ada di Bagian 8.

## 1. Ringkasan Sistem

Sistem ini mendigitalisasi proses **Medical Check Up (MCU) periodik karyawan**: dari penentuan jadwal oleh Admin Dept (dipicu reminder H-3 bulan sebelum MCU terakhir expired / berbasis ulang tahun karyawan), pelaksanaan MCU di klinik, upload & review hasil oleh HC/Dokter, penerbitan rekomendasi (FIT/Follow Up), proses Follow Up (FU) hingga FIT tercapai, sampai pendaftaran ulang Induksi K3.

Prinsip utama sistem:

- **Kerahasiaan medis terjaga** — karyawan hanya melihat rekomendasi dokter (FIT/FU), bukan detail diagnosa.
- **Rantai persetujuan berlapis** — Admin Dept menjadwalkan → HC mengelola administrasi klinik → Dokter mereview & merekomendasikan → HC & Dept meneruskan info → SHE menangani re-induksi.
- **Dua jenis MCU** — MCU **awal (pre-employment)** di luar siklus untuk karyawan baru, dan MCU **periodik** berbasis H-3 bulan sebelum MCU terakhir expired.
- **Lock H-3 hari** — pendaftaran final terkunci 3 hari sebelum pelaksanaan; hanya HC yang berwenang override.
- **Semua biaya FU mandiri** — HC menentukan batas waktu FU manual per kasus.
- **Surat pengantar FU = surat rujukan Dokter** — bukan surat administratif HC.
- **Loop FU → FIT tanpa dead-end** — jika batas FU terlewat tanpa close, HC me-reminder Admin untuk penjadwalan FU ulang sampai FIT.
- **Batas siklus FU** — FU wajib close maksimal **2 bulan** setelah MCU ulang.
- **Retensi dokumen 6 bulan** dihitung dari tanggal file diupload.

## 2. Kategori Akun & Hak Akses

| No | Akun | Hak Akses Utama |
|----|------|------------------|
| 1 | **Karyawan** | Melihat jadwal MCU, melihat rekomendasi (FIT/FU), memilih tanggal FU (dalam batas HC), upload hasil FU |
| 2 | **Admin Dept** | Menentukan & mendaftarkan jadwal MCU (maks H-3 hari), menerima reminder H-3 bulan, meneruskan rekomendasi ke karyawan, mendaftarkan re-induksi, upload hasil FU untuk klinik non-terkoneksi, menjadwalkan FU ulang saat di-reminder HC |
| 3 | **HC** | Full akses — kelola pendaftaran, override jadwal terkunci, kirim surat pengantar MCU, upload hasil MCU/FU, tetapkan batas waktu FU, reminder Admin bila FU tak kunjung close, terima submit FIT/FU dari Dokter, kelola data klinik & notifikasi |
| 4 | **Dokter** | Menerima hasil MCU dari HC, mereview, submit rekomendasi FIT/FU (PDF), **menerbitkan surat rujukan FU**, mereview ulang hasil FU |
| 5 | **SHE (K3)** | Menerima pendaftaran re-induksi dari Admin Dept, menjadwalkan & melaksanakan induksi ulang |
| 6 | **Klinik Provider** *(khusus terkoneksi)* | Menerima surat pengantar HC, upload hasil MCU/FU langsung. Klinik non-terkoneksi: hasil diupload HC/Admin Dept |

> **Keputusan #1:** Dokter dan SHE adalah **dua role terpisah**.

## 3. Entity Relationship Diagram (ASCII)

```
┌───────────────────┐        ┌──────────────────────────┐
│    DEPARTMENT      │1      N│        KARYAWAN           │
├────────────────────┤◄───────├───────────────────────────┤
│ id_dept (PK)        │        │ id_karyawan (PK)           │
│ nama_dept           │        │ nik                        │
│ admin_account_id(FK)│        │ nama                       │
└────────────────────┘        │ id_dept (FK)               │
                               │ jabatan                     │
                               │ email                       │
                               │ tanggal_lahir               │
                               │ tanggal_mcu_terakhir        │
                               │ tanggal_mcu_expired         │
                               │ tanggal_mcu_berikutnya      │
                               │  (= expired − 3 bulan)      │
                               │ status_kerja                │
                               │  (aktif/dirumahkan/resign)  │
                               │ status_kesehatan_dirumahkan │
                               │  (sakit/FIT_sakit) ◄─ tahap1│
                               └──────────┬──────────────────┘
                                          │1
                                          │N
                               ┌──────────▼──────────────────┐
                               │       MCU_SCHEDULE            │
                               ├───────────────────────────────┤
                               │ id_schedule (PK)               │
                               │ id_karyawan (FK)               │
                               │ id_periode (FK)                │
                               │ id_dept_pendaftar (FK)         │
                               │ tanggal_mcu                    │
                               │ jenis_mcu (awal/berkala/khusus)│
                               │ id_klinik (FK)                 │
                               │ status_pendaftaran             │
                               │  (draft/terkunci/selesai)      │
                               │ tanggal_lock (= tgl_mcu − 3hr) │
                               │ diubah_oleh_hc (nullable)      │
                               │ created_by / created_at        │
                               └───────┬────────────┬───────────┘
                                       │1            │1
                              ┌────────▼──┐      ┌───▼──────────────────┐
                              │  SURAT_    │      │      MCU_RESULT        │
                              │  PENGANTAR │      ├────────────────────────┤
                              │  (MCU, oleh│      │ id_result (PK)          │
                              │   HC)      │      │ id_schedule (FK)        │
                              ├────────────┤      │ tanggal_upload          │
                              │ id_surat(PK)│      │ uploaded_by (HC/Klinik) │
                              │ id_schedule │      │ file_hasil_mcu          │
                              │  (FK)       │      │ status_review           │
                              │ nomor_surat │      │ retensi_hapus_at        │
                              │ id_klinik   │      │  (= upload + 6 bulan)   │
                              │ tanggal_    │      └──────────┬─────────────┘
                              │  terbit     │                 │1
                              │ file_pdf    │                 │1
                              │ status      │      ┌──────────▼──────────────┐
                              └─────────────┘      │  MCU_RECOMMENDATION       │
                                                    ├──────────────────────────┤
                                                    │ id_rekom (PK)             │
                                                    │ id_result (FK)            │
                                                    │ id_dokter (FK)            │
                                                    │ status (FIT/FU)           │
                                                    │ catatan_medis_terbatas    │
                                                    │ file_pdf_rekomendasi      │
                                                    │ surat_rujukan_fu (FK,     │
                                                    │  nullable — dari Dokter)  │
                                                    │ tanggal_submit            │
                                                    │ diteruskan_ke_dept_at     │
                                                    │ diteruskan_ke_karyawan_at │
                                                    │ retensi_hapus_at (+6 bln) │
                                                    └───────────┬───────────────┘
                                                      (jika FU) │1
                                                                │N
                                                    ┌───────────▼───────────────┐
                                                    │         FOLLOW_UP           │
                                                    ├──────────────────────────────┤
                                                    │ id_fu (PK)                    │
                                                    │ id_rekom (FK)                 │
                                                    │ id_karyawan (FK)              │
                                                    │ pos_fu (SELALU 'mandiri')     │
                                                    │ batas_waktu_fu (HC, manual;   │
                                                    │   maks 2 bln stlh MCU ulang)  │
                                                    │ ditetapkan_oleh_hc (FK)       │
                                                    │ tanggal_pilihan_karyawan      │
                                                    │ id_surat_rujukan (FK, Dokter) │
                                                    │ id_klinik (FK, opsional)      │
                                                    │ status (menunggu_tanggal/     │
                                                    │   terjadwal/terlaksana/       │
                                                    │   terlambat_reschedule)       │
                                                    │ jumlah_reminder_hc            │
                                                    └───────────┬───────────────────┘
                                                                │1
                                                                │1
                                                    ┌───────────▼───────────────────┐
                                                    │       FOLLOW_UP_RESULT           │
                                                    ├───────────────────────────────────┤
                                                    │ id_fu_result (PK)                  │
                                                    │ id_fu (FK)                         │
                                                    │ tanggal_submit                     │
                                                    │ uploaded_by (karyawan/klinik_      │
                                                    │   terkoneksi/HC/admin_dept)        │
                                                    │ file_hasil_fu                      │
                                                    │ status_review                      │
                                                    │ id_rekom_baru (FK, nullable —       │
                                                    │   loop ke MCU_RECOMMENDATION)      │
                                                    │ retensi_hapus_at (= upload+6 bln)  │
                                                    └─────────────────────────────────────┘

┌──────────────────┐        ┌──────────────────────┐
│      KLINIK        │1     N│    MCU_SCHEDULE        │
├────────────────────┤◄──────┤  (id_klinik FK)         │
│ id_klinik (PK)      │       └──────────────────────┘
│ nama_klinik         │
│ alamat              │
│ pic_klinik          │
│ terkoneksi (bool)   │
│ account_id (nullable)│
│ status_aktif        │
└─────────────────────┘

┌──────────────────────┐        ┌───────────────────────┐
│      KARYAWAN          │1     N│     INDUKSI_ULANG        │
├────────────────────────┤◄──────┤────────────────────────┤
│ (id_karyawan FK)        │       │ id_induksi (PK)          │
└─────────────────────────┘       │ id_karyawan (FK)         │
                                   │ id_rekom_pemicu (FK)     │
                                   │ id_dept_pendaftar (FK)   │
                                   │ tanggal_daftar            │
                                   │ tanggal_pelaksanaan       │
                                   │ status                    │
                                   │ id_she_pic (FK)           │
                                   └────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│    USER_ACCOUNT         │          │   NOTIFICATION_LOG      │
├──────────────────────────┤          ├──────────────────────────┤
│ id_account (PK)            │          │ id_notif (PK)             │
│ username / email            │          │ tipe                      │
│ role (karyawan/admin_dept/  │          │ id_ref (polymorphic)      │
│  hc/dokter/she/klinik)       │          │ penerima_account_id       │
│ id_ref (FK sesuai role)      │          │ channel (email_outlook/   │
│ status_aktif                 │          │  in-app)                  │
└────────────────────────────────┘          │ status_kirim / waktu_kirim│
                                             │ durasi_proses_terkait     │
                                             └────────────────────────────┘
```

## 4. Modul & Alur Kerja

### 4.0 Modul MCU Awal (Pre-Employment) — Karyawan Baru

> **Keputusan residual #2.**

1. Karyawan baru menjalani **MCU awal** (`jenis_mcu = awal`) di luar siklus periodik, sebagai bagian proses onboarding.
2. Hasil MCU awal diproses melalui alur yang sama (upload → review Dokter → rekomendasi). Bila FU, mengikuti siklus FU standar sampai FIT.
3. Setelah FIT, sistem menetapkan `tanggal_mcu_expired` (mis. masa berlaku 1 tahun) dan menghitung `tanggal_mcu_berikutnya = tanggal_mcu_expired − 3 bulan` sebagai pemicu siklus periodik.

### 4.1 Modul Reminder H-3 Bulan & Penentuan Jadwal Periodik (Admin Dept)

> **Keputusan #5, #6.** MCU periodik dipicu **H-3 bulan sebelum MCU terakhir expired**. **Admin Dept** yang menentukan jadwal lalu submit ke karyawan.

1. Sistem menghitung `tanggal_mcu_berikutnya` = `tanggal_mcu_expired − 3 bulan` untuk setiap karyawan aktif.
2. Pada titik tersebut, sistem mengirim reminder otomatis ke Admin Dept (tembusan HC).
3. Admin Dept menentukan tanggal pelaksanaan MCU dan klinik tujuan, lalu submit jadwal ke karyawan.
4. Karyawan hanya **menerima** jadwal (tidak memilih tanggal MCU).
5. Karyawan *dirumahkan* dikecualikan dari reminder ini (lihat Bagian 4.11).

### 4.2 Modul Pendaftaran MCU & Lock H-3 Hari (Admin Dept)

1. Admin Dept mengonfirmasi/mendaftarkan jadwal (individual atau batch).
2. Validasi: tanggal pendaftaran final ≥ **H-3 hari** sebelum pelaksanaan.
3. Status `MCU_SCHEDULE = draft`; pada H-3 hari otomatis `terkunci`.
4. **Keputusan #9:** Setelah terkunci, **hanya HC** yang berwenang mengubah/membatalkan (tercatat di `diubah_oleh_hc`).
5. Notifikasi jadwal MCU (email Outlook + in-app) ke akun Karyawan.

### 4.3 Modul Surat Pengantar MCU & Persiapan Klinik (HC)

1. Setelah `MCU_SCHEDULE` tersimpan, HC menerima notifikasi.
2. Sistem otomatis generate surat pengantar MCU (PDF, nomor otomatis) via web.
3. Klinik **terkoneksi**: surat dikirim ke akun Klinik. Non-terkoneksi: HC unduh & kirim manual.
4. Status `SURAT_PENGANTAR` → `terkirim`.

### 4.4 Modul Pelaksanaan & Upload Hasil MCU

> **Keputusan #4.**

1. Karyawan melaksanakan MCU.
2. Hasil mentah diupload ke `MCU_RESULT` oleh Klinik terkoneksi atau HC.
3. File mentah hanya dapat diakses **HC** dan **Dokter**.
4. Sistem menotifikasi Dokter.

### 4.5 Modul Review Dokter & Penerbitan Rekomendasi

1. Dokter meninjau hasil lengkap.
2. Dokter menentukan **FIT** atau **FU** + catatan medis terbatas.
3. Jika **FU**, Dokter juga menerbitkan **surat rujukan FU** (`surat_rujukan_fu`) — inilah "surat pengantar FU" (Keputusan residual #4).
4. Dokter submit rekomendasi (PDF) ke `MCU_RECOMMENDATION`.
5. Visibilitas hanya untuk **HC** dan **Admin Dept**.
6. Notifikasi ke HC & Admin Dept.

### 4.6 Modul Penerusan Rekomendasi ke Karyawan

1. Admin Dept meneruskan info rekomendasi ke akun Karyawan via sistem (tercatat log).
2. **FIT** → Bagian 4.10 (Re-Induksi).
3. **FU** → Bagian 4.7.

### 4.7 Modul Follow Up (FU)

> **Keputusan #2, #3, #7 + residual #1, #4, #5.**

1. Karyawan menerima notifikasi FU dan membuka menu **Follow Up**.
2. HC menetapkan `batas_waktu_fu` **manual per kasus**. Batas ini dijaga agar FU close **maksimal 2 bulan** setelah MCU ulang.
3. `pos_fu` **selalu `mandiri`** (biaya karyawan).
4. Surat rujukan FU sudah terbit dari **Dokter** pada tahap rekomendasi (bukan surat administratif HC).
5. Karyawan memilih tanggal FU dalam batas HC, lalu melaksanakan FU.
6. Hasil FU diupload ke `FOLLOW_UP_RESULT` oleh: **karyawan**, **klinik terkoneksi**, atau **HC/Admin Dept** (klinik non-terkoneksi).
7. Hasil FU direview ulang HC & Dokter → dibuat `MCU_RECOMMENDATION` baru.
8. **Loop FU → FIT tanpa dead-end:** jika hasil masih FU, ulangi siklus. **Jika `batas_waktu_fu` terlewat tanpa di-close**, HC me-reminder Admin Dept untuk **penjadwalan FU ulang** (status `terlambat_reschedule`, `jumlah_reminder_hc` bertambah) — proses berulang sampai FIT.
9. Jika FIT, lanjut ke Bagian 4.10.

### 4.8 Modul Akun Klinik Provider (Terkoneksi)

1. HC mendaftarkan akun untuk klinik tertentu (`terkoneksi = true`).
2. Klinik terkoneksi terima surat pengantar via akun & submit hasil MCU/FU langsung.
3. Klinik non-terkoneksi: hasil diupload HC (MCU) atau HC/Admin Dept (FU).
4. HC memverifikasi/mengoreksi data klinik sebelum diteruskan ke Dokter.

### 4.9 Modul Durasi Proses

| Tahapan | Mulai | Selesai |
|---|---|---|
| Pendaftaran → Surat Pengantar | `MCU_SCHEDULE.created_at` | `SURAT_PENGANTAR.tanggal_terbit` |
| Pelaksanaan → Upload Hasil | tanggal_mcu | `MCU_RESULT.tanggal_upload` |
| Upload Hasil → Rekomendasi | `tanggal_upload` | `MCU_RECOMMENDATION.tanggal_submit` |
| Rekomendasi → Diteruskan ke Karyawan | `tanggal_submit` | `diteruskan_ke_karyawan_at` |
| Rekom FU → Karyawan Pilih Tanggal | `tanggal_submit` (FU) | `FOLLOW_UP.tanggal_pilihan_karyawan` |
| FU Terlaksana → Submit Hasil | tanggal FU | `FOLLOW_UP_RESULT.tanggal_submit` |
| FIT → Pendaftaran Induksi Ulang | rekom FIT terbit | `INDUKSI_ULANG.tanggal_daftar` |
| Total siklus FU (batas 2 bln) | tanggal MCU ulang | FU close/FIT |

### 4.10 Modul Re-Induksi (Setelah FIT)

1. Rekomendasi akhir **FIT** memicu notifikasi otomatis ke Admin Dept.
2. Admin Dept mendaftarkan **Induksi Ulang**.
3. Sistem meneruskan ke akun **SHE**.
4. SHE menjadwalkan & melaksanakan induksi ulang, update status `selesai`.
5. Sistem menetapkan `tanggal_mcu_expired` baru & menghitung `tanggal_mcu_berikutnya` (H-3 bulan sebelum expired).

### 4.11 Modul History Temuan & Status Karyawan Dirumahkan

> **Keputusan #6 + residual #3.** Karyawan dirumahkan melewati **FIT dua tahap**.

1. History MCU per karyawan: seluruh riwayat rekom, jumlah siklus FU sampai FIT, tanggal terkait, surat rujukan & pengantar.
2. `status_kerja`: aktif / dirumahkan / resign.
3. **Alur karyawan dirumahkan:**
   - **Tahap 1 — FIT dari sakit:** karyawan dirumahkan karena sakit; harus mencapai **FIT atas penyakit yang diderita** terlebih dahulu (`status_kesehatan_dirumahkan = FIT_sakit`).
   - **Tahap 2 — FIT MCU lengkap:** dilanjutkan dengan **MCU lengkap**; setelah dinyatakan FIT MCU, karyawan diaktifkan kembali.
   - Setelah aktif → masuk siklus periodik normal (H-3 bulan sebelum expired).
4. Karyawan dirumahkan dikecualikan dari reminder periodik sampai kembali aktif.
5. HC dapat memfilter histori berdasarkan status kerja, departemen, dan status rekomendasi.

### 4.12 Modul Retensi Dokumen Medis

> **Keputusan #10 + residual #5.**

1. File hasil MCU mentah, hasil FU, dan rekomendasi PDF disimpan **6 bulan** dihitung dari **tanggal file diupload** (`retensi_hapus_at = tanggal_upload + 6 bulan`), per dokumen.
2. Retensi 6 bulan ini **aman terhadap siklus FU** karena: MCU dilakukan 3 bulan sebelum MCU terakhir expired, dan **FU wajib close maksimal 2 bulan** setelah MCU ulang — sehingga satu kasus tidak mungkin berjalan lebih dari 6 bulan.
3. Metadata non-sensitif (status FIT/FU, tanggal, jumlah siklus) tetap tersimpan di History untuk audit meski file fisik sudah dihapus.

### 4.13 Modul Notifikasi

> **Keputusan #8.** Seluruh email dikirim via **SMTP internal / Outlook**; kanal in-app sebagai pelengkap. Tipe notifikasi: reminder H-3 bulan, jadwal MCU, rekomendasi FIT/FU, pemilihan tanggal FU, reminder FU ulang (ke Admin), hasil FU, dan pendaftaran re-induksi.

## 5. Detail Field per Tabel

### 5.1 KARYAWAN

| Field | Tipe | Keterangan |
|---|---|---|
| id_karyawan | PK | |
| nik | string | |
| nama | string | |
| id_dept | FK | |
| jabatan | string | |
| email | string | Blast via Outlook |
| tanggal_lahir | date | |
| tanggal_mcu_terakhir | date | |
| tanggal_mcu_expired | date | Masa berlaku MCU terakhir |
| tanggal_mcu_berikutnya | date | = expired − 3 bulan |
| status_kerja | enum | aktif / dirumahkan / resign |
| status_kesehatan_dirumahkan | enum, nullable | sakit / FIT_sakit (tahap 1) |

### 5.2 MCU_SCHEDULE

| Field | Tipe | Keterangan |
|---|---|---|
| id_schedule | PK | |
| id_karyawan | FK | |
| id_periode | FK | |
| id_dept_pendaftar | FK | |
| tanggal_mcu | date | |
| jenis_mcu | enum | awal / berkala / khusus |
| id_klinik | FK | |
| status_pendaftaran | enum | draft / terkunci / selesai |
| tanggal_lock | date | = tanggal_mcu − 3 hari |
| diubah_oleh_hc | FK, nullable | Override (HC only) |
| created_by / created_at | audit | |

### 5.3 MCU_RESULT

| Field | Tipe | Keterangan |
|---|---|---|
| id_result | PK | |
| id_schedule | FK | |
| tanggal_upload | datetime | |
| uploaded_by | FK/enum | HC / Klinik terkoneksi |
| file_hasil_mcu | file | Akses HC & Dokter |
| status_review | enum | menunggu / direview / selesai |
| retensi_hapus_at | date | tanggal_upload + 6 bulan |

### 5.4 MCU_RECOMMENDATION

| Field | Tipe | Keterangan |
|---|---|---|
| id_rekom | PK | |
| id_result | FK | |
| id_dokter | FK | |
| status | enum | FIT / FU |
| catatan_medis_terbatas | text | |
| file_pdf_rekomendasi | file | |
| surat_rujukan_fu | file/FK, nullable | Surat rujukan dari Dokter (jika FU) |
| tanggal_submit | datetime | |
| diteruskan_ke_dept_at | datetime | |
| diteruskan_ke_karyawan_at | datetime | |
| retensi_hapus_at | date | +6 bulan |

### 5.5 FOLLOW_UP

| Field | Tipe | Keterangan |
|---|---|---|
| id_fu | PK | |
| id_rekom | FK | |
| id_karyawan | FK | |
| pos_fu | enum | Selalu `mandiri` |
| batas_waktu_fu | date | HC manual; maks 2 bln stlh MCU ulang |
| ditetapkan_oleh_hc | FK | |
| tanggal_pilihan_karyawan | date | |
| id_surat_rujukan | FK | Surat rujukan Dokter |
| id_klinik | FK, nullable | |
| status | enum | menunggu_tanggal / terjadwal / terlaksana / terlambat_reschedule |
| jumlah_reminder_hc | int | Berapa kali HC reminder Admin |

### 5.6 FOLLOW_UP_RESULT

| Field | Tipe | Keterangan |
|---|---|---|
| id_fu_result | PK | |
| id_fu | FK | |
| tanggal_submit | datetime | |
| uploaded_by | enum | karyawan / klinik_terkoneksi / HC / admin_dept |
| file_hasil_fu | file | |
| status_review | enum | |
| id_rekom_baru | FK, nullable | Loop ke MCU_RECOMMENDATION |
| retensi_hapus_at | date | tanggal_upload + 6 bulan |

### 5.7 INDUKSI_ULANG

| Field | Tipe | Keterangan |
|---|---|---|
| id_induksi | PK | |
| id_karyawan | FK | |
| id_rekom_pemicu | FK | Rekom FIT pemicu |
| id_dept_pendaftar | FK | |
| tanggal_daftar / tanggal_pelaksanaan | date | |
| status | enum | menunggu / terjadwal / selesai |
| id_she_pic | FK | |

### 5.8 KLINIK

| Field | Tipe | Keterangan |
|---|---|---|
| id_klinik | PK | |
| nama_klinik / alamat / pic_klinik | string | |
| terkoneksi | boolean | Bisa submit sendiri |
| account_id | FK, nullable | |
| status_aktif | boolean | |

### 5.9 SURAT_PENGANTAR (MCU, oleh HC)

| Field | Tipe | Keterangan |
|---|---|---|
| id_surat | PK | |
| id_schedule | FK | |
| nomor_surat | string, auto | |
| id_klinik | FK | |
| tanggal_terbit | date | |
| file_pdf | file | |
| status | enum | draft / terkirim |

> Catatan: surat pengantar FU **tidak** ada di tabel ini — FU menggunakan **surat rujukan Dokter** yang tersimpan di `MCU_RECOMMENDATION.surat_rujukan_fu` / `FOLLOW_UP.id_surat_rujukan`.

### 5.10 NOTIFICATION_LOG

| Field | Tipe | Keterangan |
|---|---|---|
| id_notif | PK | |
| tipe | enum | reminder_H-3bulan / jadwal_mcu / rekom_fit_fu / pilihan_tgl_fu / reminder_fu_ulang / hasil_fu / induksi_ulang |
| id_ref | FK polymorphic | |
| penerima_account_id | FK | |
| channel | enum | email_outlook / in-app |
| status_kirim / waktu_kirim | | |

### 5.11 USER_ACCOUNT

| Field | Tipe | Keterangan |
|---|---|---|
| id_account | PK | |
| username/email | string | |
| role | enum | karyawan / admin_dept / hc / dokter / she / klinik |
| id_ref | FK | Sesuai role |
| status_aktif | boolean | |

## 6. Ringkasan Hak Lihat Data Sensitif

| Data | Karyawan | Admin Dept | HC | Dokter | SHE | Klinik |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| File hasil MCU/FU mentah | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ (upload, jika terkoneksi) |
| Status rekomendasi (FIT/FU) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Surat rujukan FU | ✓ | ✓ | ✓ | ✓ (terbitkan) | ✗ | ✗ |
| Catatan medis lengkap | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |
| Jadwal MCU | ✓ (miliknya) | ✓ (dept-nya) | ✓ | ✗ | ✗ | ✓ (miliknya) |
| Menentukan tanggal MCU | ✗ | ✓ | ✓ (override) | ✗ | ✗ | ✗ |
| Menentukan batas waktu FU | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Pendaftaran re-induksi | ✗ | ✓ | ✓ | ✗ | ✓ (terima) | ✗ |

## 7. Diagram Alur Ringkas (Status Flow)

```
[Karyawan baru] → MCU AWAL (di luar siklus) → FIT → set expired & tgl_mcu_berikutnya
                                                        │
                                                        ▼
[H-3 bulan sebelum MCU expired] → Admin Dept tentukan jadwal → submit ke Karyawan
        │
        ▼
[Lock H-3 hari] ──(override hanya HC)──► Pelaksanaan MCU
        │
        ▼
Upload hasil (HC / Klinik terkoneksi) → Review Dokter
        │
        ▼
   Rekomendasi ──► FIT ──────────────────────────────────────┐
        │                                                     │
        └──► FU (+ surat rujukan Dokter; biaya mandiri;       │
             batas waktu diset HC, maks 2 bln)                │
                 │                                            │
                 ▼                                            │
        Karyawan pilih tanggal → FU terlaksana                │
                 │                                            │
                 ▼                                            │
        Upload hasil FU (karyawan/klinik/HC/admin)            │
                 │                                            │
                 ▼                                            │
           Review ulang ──► masih FU ──┐ (loop)               │
                 │                      │                     │
                 │        batas terlewat & belum close:       │
                 │        HC reminder Admin → jadwal FU ulang │
                 │                      │                     │
                 └──────────────────────┘                     │
                 │ FIT                                         │
                 └──────────────────────────────────────────► ┘
                                 │
                                 ▼
              Notifikasi Admin Dept → Daftar Re-Induksi → SHE laksanakan
                                 │
                                 ▼
                 Set expired baru & tgl_mcu_berikutnya (H-3 bln)

[Karyawan dirumahkan] → FIT dari sakit (tahap 1) → MCU lengkap → FIT MCU (tahap 2) → aktif → siklus periodik
```

## 8. Ringkasan Keputusan Final

| # | Topik | Keputusan |
|---|---|---|
| 1 | Role Dokter vs SHE | Dua role terpisah |
| 2 | Batas waktu FU | Manual per kasus (HC), maks 2 bln stlh MCU ulang |
| 3 | Pos biaya FU | Semua mandiri, HC menentukan |
| 4 | Akun klinik | Klinik tertentu terkoneksi & submit; sisanya HC/Admin upload |
| 5 | Reminder H-3 bulan | Admin Dept menentukan jadwal lalu submit ke karyawan |
| 6 | Periode & dirumahkan | Periodik H-3 bln sebelum MCU expired; dirumahkan = FIT dua tahap |
| 7 | Loop FU | FU → FIT; jika batas terlewat, HC reminder Admin untuk FU ulang |
| 8 | Email blast | Internal / Outlook (SMTP) |
| 9 | Override jadwal terkunci | Hanya akun HC |
| 10 | Retensi dokumen | 6 bulan dari tanggal upload |
| R1 | FU tak kunjung close | HC reminder Admin → penjadwalan FU ulang sampai FIT |
| R2 | Karyawan baru | Ada MCU awal (pre-employment) di luar siklus |
| R3 | Dirumahkan → aktif | FIT dari sakit → MCU lengkap → FIT MCU → aktif |
| R4 | Surat pengantar FU | Surat **rujukan dari Dokter** (bukan surat HC) |
| R5 | Retensi vs siklus FU | Timer 6 bln dari upload; aman karena FU close ≤ 2 bln stlh MCU ulang |
