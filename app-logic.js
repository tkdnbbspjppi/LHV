/* ==========================================================================
   APP LOGIC — Pengganti main.py (FastAPI) + database.py + models.py.
   Semua proses (dulu di server Python) sekarang berjalan di browser:
     - Membangun "context" persis seperti context dict di backend lama
     - Mengekstrak gambar dari PDF (pengganti pypdf) via pdf.js -> render tiap
       halaman PDF menjadi 1 gambar (pendekatan ini lebih stabil di browser
       dibanding mengekstrak XObject gambar mentah dari dalam PDF)
     - Menyimpan proyek (draft & tersimpan) ke IndexedDB, karena localStorage
       terlalu kecil untuk menyimpan banyak file gambar
     - Memanggil DocxEngine untuk menghasilkan file .docx dan mengunduhnya
   ========================================================================== */

(function (global) {
  "use strict";

  const TEMPLATE_MAP = {
    "Produksi Sendiri": "templates/Contoh_LHV_TKDN_2026.docx",
    Kerjasama: "templates/Template_LHV_Kerjasama.docx",
    BMP: "templates/Template_LHV_BMP.docx",
    Jasa: "templates/Template_LHV_Jasa.docx",
    Gabungan: "templates/Template_LHV_Gabungan.docx",
  };

  // Kategori gambar dinamis: { stateKey, category, contextKey, widthMm, shape }
  // shape 'std'      -> item = { id, file, keterangan }
  // shape 'formulir' -> item = { id, file, judul }
  const CATEGORY_CONFIG = [
    { stateKey: "formulirVerifikasi", contextKey: "formulir_tkdn", widthMm: null, shape: "formulir" },
    { stateKey: "fileBuktiPabrik", contextKey: "bukti_pabrik", widthMm: 70, shape: "std" },
    { stateKey: "fileBom", contextKey: "gambar_bom", widthMm: 70, shape: "std" },
    { stateKey: "fileSertifikatTkdn", contextKey: "sertifikat_tkdn", widthMm: 70, shape: "std" },
    { stateKey: "fileBuktiBeli", contextKey: "bukti_beli", widthMm: 70, shape: "std" },
    { stateKey: "fileKtp", contextKey: "ktp_karyawan", widthMm: 70, shape: "std" },
    { stateKey: "fileBuktiKerjasama", contextKey: "bukti_kerjasama", widthMm: 70, shape: "std" },

    { stateKey: "fileTenagaKerjaBmp", contextKey: "bmp_tenagakerja", widthMm: 70, shape: "std" },
    { stateKey: "fileInvestasiBmp", contextKey: "bmp_investasi", widthMm: 70, shape: "std" },
    { stateKey: "fileKemitraanBmp", contextKey: "bmp_kemitraan", widthMm: 70, shape: "std" },
    { stateKey: "fileSubstitusiBmp", contextKey: "bmp_substitusi", widthMm: 70, shape: "std" },
    { stateKey: "fileMesinDnBmp", contextKey: "bmp_mesindn", widthMm: 70, shape: "std" },
    { stateKey: "fileLokasiBmp", contextKey: "bmp_lokasi", widthMm: 70, shape: "std" },
    { stateKey: "fileI40Bmp", contextKey: "bmp_industri40", widthMm: 70, shape: "std" },
    { stateKey: "fileSdmBmp", contextKey: "bmp_sdm", widthMm: 70, shape: "std" },
    { stateKey: "fileSertifikatBmp", contextKey: "bmp_sertifikat", widthMm: 70, shape: "std" },
    { stateKey: "fileHijauBmp", contextKey: "bmp_hijau", widthMm: 70, shape: "std" },
    { stateKey: "fileEksporBmp", contextKey: "bmp_ekspor", widthMm: 70, shape: "std" },
    { stateKey: "fileMerekDnBmp", contextKey: "bmp_merekdn", widthMm: 70, shape: "std" },
    { stateKey: "fileEsgBmp", contextKey: "bmp_esg", widthMm: 70, shape: "std" },
    { stateKey: "fileAwardsBmp", contextKey: "bmp_awards", widthMm: 70, shape: "std" },
    { stateKey: "fileSiinasBmp", contextKey: "bmp_siinas", widthMm: 70, shape: "std" },

    { stateKey: "fileNibRba", contextKey: "nib_rba", widthMm: 70, shape: "std" },
    { stateKey: "fileSertifikatStandar", contextKey: "sert_standar", widthMm: 70, shape: "std" },
    { stateKey: "fileIzinUsaha", contextKey: "izin_usaha", widthMm: 70, shape: "std" },
    { stateKey: "fileNpwpLampiran", contextKey: "npwp_lampiran", widthMm: 70, shape: "std" },
    { stateKey: "fileSertifikatMerek", contextKey: "sert_merek", widthMm: 70, shape: "std" },
    { stateKey: "fileSertifikatProduk", contextKey: "sert_produk", widthMm: 70, shape: "std" },
    { stateKey: "fileNie", contextKey: "nie", widthMm: 70, shape: "std" },
    { stateKey: "fileBpom", contextKey: "bpom", widthMm: 70, shape: "std" },
    { stateKey: "fileFotoProduk", contextKey: "foto_produk", widthMm: 70, shape: "std" },
    { stateKey: "fileFotoBahanBaku", contextKey: "foto_bahan_baku", widthMm: 70, shape: "std" },
    { stateKey: "fileInvoiceBahanBaku", contextKey: "invoice_bahan_baku", widthMm: 70, shape: "std" },
    { stateKey: "fileAlurProsesLampiran", contextKey: "alur_proses_lampiran", widthMm: 70, shape: "std" },
    { stateKey: "fileDaftarGaji", contextKey: "daftar_gaji", widthMm: 70, shape: "std" },
    { stateKey: "fileSampelKtp", contextKey: "sampel_ktp", widthMm: 70, shape: "std" },
    { stateKey: "fileStrukturPabrik", contextKey: "struktur_pabrik", widthMm: 70, shape: "std" },
    { stateKey: "fileFotoMesin", contextKey: "foto_mesin", widthMm: 70, shape: "std" },
    { stateKey: "fileDaftarPenyusutan", contextKey: "daftar_penyusutan", widthMm: 70, shape: "std" },
    { stateKey: "fileBuktiListrik", contextKey: "bukti_listrik", widthMm: 70, shape: "std" },
    { stateKey: "fileAktaSewa", contextKey: "akta_sewa", widthMm: 70, shape: "std" },
    { stateKey: "fileGeotagging", contextKey: "geotagging", widthMm: 70, shape: "std" },
  ];

  const SINGLE_IMAGE_CONFIG = [
    { stateKey: "fileCover", contextKey: "cover_laporan", widthMm: null },
    { stateKey: "fileLogo", contextKey: "logo_perusahaan", widthMm: 20 },
    { stateKey: "fileTtdVerifikator", contextKey: "ttd_verifikator", widthMm: 20 },
    { stateKey: "fileStruktur", contextKey: "struktur_organisasi", widthMm: 70 },
    { stateKey: "fileAlurProduksi", contextKey: "alur_produksi", widthMm: 70 },
    { stateKey: "fileStrukturIndustri", contextKey: "struktur_industri", widthMm: 70 },
    // foto_barang: dipakai template TKDN di blok "Rincian Barang" (Ringkasan Eksekutif) sebagai 1 foto tunggal
    { stateKey: "fileFotoBarang", contextKey: "foto_barang", widthMm: 70 },
  ];

  let tokenCounter = 0;
  function nextToken(key) {
    tokenCounter += 1;
    return `§§IMG:${key}:${tokenCounter}§§`;
  }

  // --------------------------------------------------------------------
  // Ekstraksi gambar dari PDF: setiap halaman dirender jadi 1 gambar PNG
  // (pendekatan yang stabil untuk berjalan di browser)
  // --------------------------------------------------------------------
  async function extractPdfPagesAsBlobs(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const blobs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      blobs.push(blob);
    }
    return blobs;
  }

  // --------------------------------------------------------------------
  // Menyeragamkan ukuran gambar sebelum disisipkan ke Word, supaya hasil
  // rapi & sejajar (grid 2 kolom sering terlihat "berantakan" kalau tiap
  // foto punya rasio & tinggi yang beda-beda). Pakai teknik "contain-fit
  // proporsional": gambar diskalakan utuh (TIDAK dipotong/tidak ada isi
  // yang hilang) supaya muat pas di kotak berukuran seragam, sisa ruang
  // kosong diisi latar putih. Hasilnya semua foto dalam 1 kategori punya
  // ukuran kotak yang SAMA PERSIS & tetap proporsional, tanpa risiko
  // konten penting (mis. tulisan di pinggir KTP/sertifikat) ikut terpotong.
  // --------------------------------------------------------------------
  async function normalizeImageToBox(blob, boxPx) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = boxPx;
    canvas.height = boxPx;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, boxPx, boxPx);

    // proporsional: skala pakai sisi TERPANJANG supaya seluruh gambar
    // muat utuh di dalam kotak (tidak ada yang terpotong)
    const scale = Math.min(boxPx / img.width, boxPx / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (boxPx - dw) / 2;
    const dy = (boxPx - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || blob), "image/png");
    });
  }

  function isExcelFile(file) {
    const name = (file.name || "").toLowerCase();
    return (
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls")
    );
  }

  // --------------------------------------------------------------------
  // Bangun { contextList, imageJobs } dari satu daftar dinamis (state list)
  // --------------------------------------------------------------------
  async function buildDynamicList(list, widthMm, shape, imageJobs, onProgress) {
    const result = [];
    for (const item of list || []) {
      if (!item.file) continue;
      const keterangan = shape === "formulir" ? item.judul || "" : item.keterangan || "";

      if (item.file.type === "application/pdf") {
        onProgress && onProgress(`Mengekstrak halaman PDF: ${item.file.name}...`);
        const pages = await extractPdfPagesAsBlobs(item.file);
        for (let idx = 0; idx < pages.length; idx++) {
          let blob = pages[idx];
          if (shape === "std") blob = await normalizeImageToBox(blob, 900);
          const token = nextToken("dyn");
          imageJobs.set(token, { blob, widthMm });
          const caption = keterangan ? `${keterangan} (Halaman ${idx + 1})` : `Halaman ${idx + 1}`;
          result.push({ judul: caption, keterangan: caption, gambar: token });
        }
      } else if (isExcelFile(item.file)) {
        onProgress && onProgress(`Menggambar tabel dari Excel: ${item.file.name}...`);
        let blob = await ExcelRender.renderExcelToImage(item.file);
        if (shape === "std") blob = await normalizeImageToBox(blob, 900);
        const token = nextToken("dyn");
        imageJobs.set(token, { blob, widthMm });
        result.push({ judul: keterangan, keterangan: keterangan, gambar: token });
      } else {
        let blob = item.file;
        if (shape === "std") {
          onProgress && onProgress(`Merapikan foto: ${item.file.name || keterangan}...`);
          blob = await normalizeImageToBox(blob, 900);
        }
        const token = nextToken("dyn");
        imageJobs.set(token, { blob, widthMm });
        result.push({ judul: keterangan, keterangan: keterangan, gambar: token });
      }
    }
    return result;
  }

  // --------------------------------------------------------------------
  // Bangun seluruh context + imageJobs + tableJobs dari state form React
  // --------------------------------------------------------------------
  async function buildContext(state, onProgress) {
    const context = {};
    const imageJobs = new Map();
    const tableJobs = new Map();

    // --- Field teks biasa (persis nama kolom di models.py lama) ---
    const textFields = {
      jenis_lhv: state.jenisLhv,
      nama_perusahaan: state.namaPerusahaan,
      // "tanggal_dibuat" dipakai template di baris tanda tangan ("Semarang, {{ tanggal_dibuat }}")
      // -- ini harus tanggal TERBIT LAPORAN (tanggalLhv), BUKAN tanggal pelaksanaan verifikasi.
      tanggal_dibuat: DocxEngine.formatTanggalIndo(state.tanggalLhv),
      tanggal_lhv: DocxEngine.formatTanggalIndo(state.tanggalLhv),
      id_berkas: state.idBerkas,
      permenperin: state.permenperin,
      skala_perusahaan: state.skalaPerusahaan,
      no_izin: state.noIzin,

      nama_perusahaan_industri: state.namaPerusahaanIndustri,
      alamat_perusahaan_industri: state.alamatPerusahaanIndustri,
      skala_perusahaan_industri: state.skalaPerusahaanIndustri,
      no_izin_perusahaan_industri: state.noIzinPerusahaanIndustri,
      telepon_kantor_industri: state.teleponKantorIndustri,
      fax_kantor_industri: state.faxKantorIndustri,
      email_kantor_industri: state.emailKantorIndustri,
      website_kantor_industri: state.websiteKantorIndustri,
      status_kantor_industri: state.statusKantorIndustri,
      pic_kantor_industri: state.picKantorIndustri,
      akta_kantor_industri: state.aktaKantorIndustri,
      npwp_kantor_industri: state.npwpKantorIndustri,

      nilai_bmp: state.nilaiBmp,
      terbilang_bmp: state.terbilangBmp,

      tgl_verifikasi_dok: DocxEngine.formatTanggalIndo(state.tglVerifikasiDok),
      tgl_verifikasi_lapangan: DocxEngine.formatTanggalIndo(state.tglVerifikasiLapangan),
      kbli: state.kbli,
      kapasitas_produksi: state.kapasitasProduksi,
      jenis_barang: state.jenisBarang,
      tipe_barang: state.tipeBarang,
      spesifikasi_barang: state.spesifikasiBarang,
      kode_hs: state.kodeHs,
      merek_barang: state.merekBarang,
      kelompok_barang: state.kelompokBarang,
      nilai_tkdn: state.nilaiTkdn,
      terbilang_tkdn: state.terbilangTkdn,
      nilai_brainware: state.nilaiBrainware,
      terbilang_brainware: state.terbilangBrainware,
      nama_verifikator: state.namaVerifikator,
      nip_verifikator: state.nipVerifikator,
      pejabat_mengetahui: state.pejabatMengetahui,
      nama_pejabat: state.namaPejabat,
      nip_pejabat: state.nipPejabat,

      alamat_kantor: state.alamatKantor,
      telepon_kantor: state.teleponKantor,
      fax_kantor: state.faxKantor,
      email_kantor: state.emailKantor,
      website_kantor: state.websiteKantor,
      status_kantor: state.statusKantor,
      pic_kantor: state.picKantor,
      akta_kantor: state.aktaKantor,
      npwp_kantor: state.npwpKantor,

      alamat_pabrik: state.alamatPabrik,
      telepon_pabrik: state.teleponPabrik,
      fax_pabrik: state.faxPabrik,
      email_pabrik: state.emailPabrik,
      website_pabrik: state.websitePabrik,
      status_pabrik: state.statusPabrik,
      pic_pabrik: state.picPabrik,
      akta_pabrik: state.aktaPabrik,
      npwp_pabrik: state.npwpPabrik,
    };
    for (const k in textFields) context[k] = textFields[k] == null ? "" : textFields[k];

    // --- Acuan peraturan & aspek BMP ---
    context.daftar_acuan_peraturan = (state.acuanPeraturan || [])
      .filter((a) => {
        if (a.id === 6 && !(state.permenperin || "").includes("35 Tahun 2025")) return false;
        return true;
      })
      .map((a) => ({ aturan: (a.aturan || "").replace(/[\r\n]+/g, " ").trim() }));

    context.aspek_bmp = (state.aspekBmp || []).filter((a) => a.checked).map((a) => a.teks);

    // --- Rekapitulasi Bahan Baku: tabel dinamis, ATAU upload dokumen (PDF/gambar) ---
    if (state.modeRekapBahanBaku === "upload" && state.fileRekapBahanBaku) {
      onProgress && onProgress("Memproses dokumen rekapitulasi bahan baku...");
      let blob = state.fileRekapBahanBaku;
      if (blob.type === "application/pdf") {
        const pages = await extractPdfPagesAsBlobs(blob);
        blob = pages[0] || blob;
        if (pages.length > 1) {
          console.warn(
            `Rekapitulasi Bahan Baku: PDF punya ${pages.length} halaman, hanya halaman pertama yang dipakai (slot tabel cuma menampung 1 gambar).`
          );
        }
      }
      const imgToken = nextToken("rekapbaku_img");
      imageJobs.set(imgToken, { blob, widthMm: 160 });
      context.tabel_dinamis_bahan_baku = imgToken;
    } else {
      const tableToken = "§§TABLE:bahanbaku§§";
      context.tabel_dinamis_bahan_baku = tableToken;
      tableJobs.set(tableToken, { rows: state.rekapBahanBaku || [] });
    }

    // --- Gambar tunggal ---
    for (const cfg of SINGLE_IMAGE_CONFIG) {
      const file = state[cfg.stateKey];
      if (file) {
        let blob = file;
        if (file.type === "application/pdf") {
          onProgress && onProgress(`Mengekstrak halaman PDF: ${file.name}...`);
          const pages = await extractPdfPagesAsBlobs(file);
          blob = pages[0] || file;
          if (pages.length > 1) {
            console.warn(`${cfg.contextKey}: PDF punya ${pages.length} halaman, hanya halaman pertama yang dipakai (slot ini cuma menampung 1 gambar).`);
          }
        }
        const token = nextToken(cfg.contextKey);
        imageJobs.set(token, { blob, widthMm: cfg.widthMm });
        context[cfg.contextKey] = token;
      } else {
        context[cfg.contextKey] = "";
      }
    }

    // --- Gambar dinamis (list) ---
    for (const cfg of CATEGORY_CONFIG) {
      onProgress && onProgress(`Memproses berkas: ${cfg.contextKey}...`);
      context[cfg.contextKey] = await buildDynamicList(
        state[cfg.stateKey],
        cfg.widthMm,
        cfg.shape,
        imageJobs,
        onProgress
      );
    }

    // --- PENANGANAN KHUSUS: foto_produk ---
    // Di template Kerjasama, tag "foto_produk" dipakai DUA KALI dengan peran
    // berbeda: (1) {{ foto_produk }} sebagai SATU foto tunggal di Ringkasan
    // Eksekutif, dan (2) {% for baris in foto_produk | batch(2,None) %}
    // sebagai GALERI banyak foto di Dokumen Pendukung. Kalau context.foto_produk
    // cuma berupa array biasa, peran (1) akan tampil rusak/berantakan (array
    // ikut ter-render jadi teks, bukan gambar) -- ini penyebab hasil "tertukar"
    // untuk skema Kerjasama. Solusinya: array yang sama dipakai untuk peran (2)
    // (for-loop tetap bisa iterasi normal), TAPI diberi toString() khusus supaya
    // saat dipakai sebagai {{ foto_produk }} tunggal, ia otomatis menampilkan
    // 1 foto saja: foto "Foto Produk Utama" (kalau diisi di tab Ringkasan
    // Eksekutif), atau foto pertama dari galeri sebagai cadangan.
    const galeriFotoProduk = context.foto_produk || [];
    let fotoProdukTunggalToken = "";
    if (state.fileFotoProdukUtama) {
      const token = nextToken("foto_produk_utama");
      imageJobs.set(token, { blob: state.fileFotoProdukUtama, widthMm: 70 });
      fotoProdukTunggalToken = token;
    } else if (galeriFotoProduk.length > 0) {
      fotoProdukTunggalToken = galeriFotoProduk[0].gambar;
    }
    galeriFotoProduk.toString = () => fotoProdukTunggalToken;
    context.foto_produk = galeriFotoProduk;

    return { context, imageJobs, tableJobs };
  }

  function bersihkanTeks(teks) {
    if (!teks) return "Kosong";
    let t = String(teks);
    for (const ch of ["\\", "/", "*", "?", '"', "<", ">", "|", ":"]) {
      t = t.split(ch).join("_");
    }
    return t;
  }

  function buatInisial(namaVerifikator) {
    const nama = (namaVerifikator || "").trim();
    return nama
      ? nama.split(/\s+/).map((k) => k[0].toUpperCase()).join("")
      : "VER";
  }

  function buildFilename(state) {
    const idB = bersihkanTeks(state.idBerkas);
    const np = bersihkanTeks(state.namaPerusahaan);
    const nprod = bersihkanTeks(state.jenisBarang);
    const inisial = buatInisial(state.namaVerifikator);
    const teksJenis = state.jenisLhv === "BMP" ? "LHV BMP" : "LHV TKDN";
    return `${idB}_${teksJenis} ${np}_${nprod}_${inisial}.docx`;
  }

  // Format resmi: TKDN{tahun}-{bulan}-BBSPJPPI-{ID Berkas}-{Inisial Verifikator}
  // (dipakai di cover laporan, bukan di badan dokumen -- badan dokumen tetap
  // menampilkan ID Berkas apa adanya lewat tag {{ id_berkas }})
  function buildNoLhv(state) {
    const prefix = state.jenisLhv === "BMP" ? "BMP" : "TKDN";
    let tahun = new Date().getFullYear();
    let bulan = new Date().getMonth() + 1;
    if (state.tanggalLhv && /^\d{4}-\d{2}/.test(state.tanggalLhv)) {
      const [y, m] = state.tanggalLhv.split("-");
      tahun = parseInt(y, 10);
      bulan = parseInt(m, 10);
    }
    const idB = (state.idBerkas || "").trim() || "-";
    const inisial = buatInisial(state.namaVerifikator);
    return `${prefix}${tahun}-${bulan}-BBSPJPPI-${idB}-${inisial}`;
  }

  // --------------------------------------------------------------------
  // Orkestrasi utama: bangun context -> render -> unduh
  // --------------------------------------------------------------------
  async function generateAndDownload(state, onProgress) {
    const templatePath = TEMPLATE_MAP[state.jenisLhv];
    if (!templatePath) throw new Error(`Jenis LHV "${state.jenisLhv}" tidak dikenali.`);

    onProgress && onProgress("Memuat file template...");
    const resp = await fetch(templatePath);
    if (!resp.ok) {
      throw new Error(
        `Template untuk skema "${state.jenisLhv}" belum tersedia di folder /templates ` +
          `(${templatePath}). Silakan tambahkan file template tersebut, atau pilih skema lain.`
      );
    }
    const templateArrayBuffer = await resp.arrayBuffer();

    const { context, imageJobs, tableJobs } = await buildContext(state, onProgress);

    const blob = await DocxEngine.generateDocx(templateArrayBuffer, context, imageJobs, tableJobs, onProgress);

    const filename = buildFilename(state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return filename;
  }

  // --------------------------------------------------------------------
  // Penyimpanan proyek & draft di IndexedDB
  // - STORE_NAME "projects": daftar LHV yang sudah pernah di-generate
  // - DRAFT_STORE "draft": auto-save form yang sedang diisi (teks + file),
  //   supaya kalau tab browser tertutup/refresh tidak sengaja, isian
  //   verifikator tidak hilang.
  // --------------------------------------------------------------------
  const DB_NAME = "lhv_generator_db";
  const STORE_NAME = "projects";
  const DRAFT_STORE = "draft";
  const DRAFT_ID = "current";

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(DRAFT_STORE)) {
          db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbSaveProject(project) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = project.id ? store.put(project) : store.add(project);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbListProjects() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbDeleteProject(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Auto-save draft (form yang sedang diisi, termasuk file) ---
  async function dbSaveDraft(state) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readwrite");
      tx.objectStore(DRAFT_STORE).put({ id: DRAFT_ID, state, savedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbLoadDraft() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readonly");
      const req = tx.objectStore(DRAFT_STORE).get(DRAFT_ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbClearDraft() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, "readwrite");
      tx.objectStore(DRAFT_STORE).delete(DRAFT_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  global.LHVLogic = {
    generateAndDownload,
    buildContext,
    buildFilename,
    buildNoLhv,
    dbSaveProject,
    dbListProjects,
    dbDeleteProject,
    dbSaveDraft,
    dbLoadDraft,
    dbClearDraft,
    TEMPLATE_MAP,
  };
})(window);
