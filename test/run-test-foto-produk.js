const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createCanvas, Image } = require('canvas');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.Image = Image;

dom.window.HTMLCanvasElement.prototype.toBlob = function (cb, type) {
  const buf = this.toBuffer('image/png');
  cb(new Blob([buf], { type: type || 'image/png' }));
};
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
document.createElement_orig = document.createElement.bind(document);
document.createElement = function (tag) {
  if (tag === 'canvas') {
    const c = createCanvas(100, 100);
    c.toBlob = function (cb, type) {
      const buf = this.toBuffer('image/png');
      cb(new Blob([buf], { type: type || 'image/png' }));
    };
    return c;
  }
  return document.createElement_orig(tag);
};

global.URL = { createObjectURL: () => 'blob://fake', revokeObjectURL: () => {} };
global.JSZip = require('jszip');
global.nunjucks = require('nunjucks');
global.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve({ numPages: 0 }) }) };

// FileReader polyfill (dipakai blobToArrayBuffer)
global.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onload && this.onload();
    }).catch((e) => this.onerror && this.onerror(e));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      const b64 = Buffer.from(buf).toString('base64');
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
      this.onload && this.onload();
    }).catch((e) => this.onerror && this.onerror(e));
  }
};

require('../docx-engine.js');
global.DocxEngine = global.window.DocxEngine;
require('../excel-render.js');
global.ExcelRender = global.window.ExcelRender;
require('../app-logic.js');
const DocxEngine = global.window.DocxEngine;
const LHVLogic = global.window.LHVLogic;

function makeDummyImage(color) {
  const c = createCanvas(40, 40);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 40, 40);
  const buf = c.toBuffer('image/png');
  return new Blob([buf], { type: 'image/png' });
}

function baseState(jenisLhv) {
  return {
    jenisLhv,
    namaPerusahaan: 'PT Uji Coba', tanggal: '2026-08-03', tanggalLhv: '2026-08-03',
    idBerkas: 'TEST-FOTO', permenperin: 'Permenperin No. 35 Tahun 2025',
    skalaPerusahaan: 'Menengah', noIzin: '123',
    acuanPeraturan: [], aspekBmp: [], rekapBahanBaku: [],
    namaVerifikator: 'Budi', jenisBarang: 'Produk Uji',
  };
}

(async () => {
  let allPass = true;
  function check(label, cond) {
    console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
    if (!cond) allPass = false;
  }

  // ------------------------------------------------------------------
  // TEST 1: Kerjasama -- foto_produk dual-role (single + galeri)
  // ------------------------------------------------------------------
  {
    const state = baseState('Kerjasama');
    // 3 foto di galeri "Dokumen Pendukung", + 1 foto khusus "Foto Produk Utama"
    state.fileFotoProduk = [
      { id: 1, file: makeDummyImage('red'), keterangan: 'Foto galeri 1' },
      { id: 2, file: makeDummyImage('green'), keterangan: 'Foto galeri 2' },
      { id: 3, file: makeDummyImage('blue'), keterangan: 'Foto galeri 3' },
    ];
    state.fileFotoProdukUtama = makeDummyImage('yellow');

    const { context, imageJobs } = await LHVLogic.buildContext(state, () => {});

    check('foto_produk tetap array (untuk for-loop galeri)', Array.isArray(context.foto_produk));
    check('foto_produk berisi 3 item galeri', context.foto_produk.length === 3);
    const singleStr = String(context.foto_produk); // simulasikan {{ foto_produk }}
    check('foto_produk sebagai teks tunggal (toString) BUKAN "[object Object]"', !singleStr.includes('[object Object]'));
    check('foto_produk tunggal memakai token "Foto Produk Utama" (bukan token galeri)', singleStr !== context.foto_produk[0].gambar);
    check('token dari "Foto Produk Utama" terdaftar di imageJobs', imageJobs.has(singleStr));

    // Render sungguhan ke docx Kerjasama & pastikan tidak ada token nyasar
    const templatePath = path.join(__dirname, '..', 'templates', 'Template_LHV_Kerjasama.docx');
    const buf = fs.readFileSync(templatePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const blob = await DocxEngine.generateDocx(ab, context, imageJobs, new Map(), () => {});
    const outBuf = Buffer.from(await blob.arrayBuffer());
    const zip = await require('jszip').loadAsync(outBuf);
    const docXml = await zip.file('word/document.xml').async('string');
    check('tidak ada token §§IMG tersisa di hasil akhir (Kerjasama)', !docXml.includes('§§IMG'));
    check('jumlah <w:drawing> >= 4 (3 galeri + 1 foto utama)', (docXml.match(/<w:drawing>/g) || []).length >= 4);
  }

  // ------------------------------------------------------------------
  // TEST 2: TKDN (Produksi Sendiri) -- foto_barang (single, blok Rincian Barang)
  // ------------------------------------------------------------------
  {
    const state = baseState('Produksi Sendiri');
    state.fileFotoBarang = makeDummyImage('purple');
    state.fileFotoProduk = [
      { id: 1, file: makeDummyImage('orange'), keterangan: 'Foto galeri produk' },
    ];

    const { context, imageJobs } = await LHVLogic.buildContext(state, () => {});
    check('context.foto_barang terisi token gambar (bukan kosong)', !!context.foto_barang);
    check('token foto_barang terdaftar di imageJobs', imageJobs.has(context.foto_barang));
    check('context.foto_produk (galeri TKDN) tetap array', Array.isArray(context.foto_produk) && context.foto_produk.length === 1);

    const templatePath = path.join(__dirname, '..', 'templates', 'Contoh_LHV_TKDN_2026.docx');
    const buf = fs.readFileSync(templatePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const blob = await DocxEngine.generateDocx(ab, context, imageJobs, new Map(), () => {});
    const outBuf = Buffer.from(await blob.arrayBuffer());
    const zip = await require('jszip').loadAsync(outBuf);
    const docXml = await zip.file('word/document.xml').async('string');
    check('tidak ada token §§IMG tersisa di hasil akhir (TKDN)', !docXml.includes('§§IMG'));
    check('jumlah <w:drawing> >= 2 (1 foto_barang + 1 galeri foto_produk)', (docXml.match(/<w:drawing>/g) || []).length >= 2);
  }

  // ------------------------------------------------------------------
  // TEST 3: tanggal_dibuat (baris tanda tangan "Semarang, ...") harus
  // ambil dari tanggalLhv (Tanggal Terbit Laporan), BUKAN tanggal
  // pelaksanaan verifikasi.
  // ------------------------------------------------------------------
  {
    const state = baseState('Produksi Sendiri');
    state.tanggal = '2026-08-01';       // Tanggal Pelaksanaan Verifikasi
    state.tanggalLhv = '2026-08-04';    // Tanggal LHV / Terbit Laporan
    const { context } = await LHVLogic.buildContext(state, () => {});
    check('tanggal_dibuat memakai tanggalLhv (4 Agustus), bukan tanggal verifikasi (1 Agustus)',
      context.tanggal_dibuat.includes('4') && context.tanggal_dibuat.includes('Agustus') && !context.tanggal_dibuat.startsWith('1 '));
  }

  // ------------------------------------------------------------------
  // TEST 4: Format No. LHV -- TKDN{tahun}-{bulan}-BBSPJPPI-{ID Berkas}-{Inisial}
  // ------------------------------------------------------------------
  {
    const noLhv = LHVLogic.buildNoLhv({
      jenisLhv: 'Produksi Sendiri',
      tanggalLhv: '2026-08-04',
      idBerkas: '15348',
      namaVerifikator: 'Agus Purnomo',
    });
    check('Format No. LHV benar: TKDN2026-8-BBSPJPPI-15348-AP', noLhv === 'TKDN2026-8-BBSPJPPI-15348-AP');

    const noLhvBmp = LHVLogic.buildNoLhv({
      jenisLhv: 'BMP',
      tanggalLhv: '2026-01-04',
      idBerkas: '999',
      namaVerifikator: 'Siti Rahma',
    });
    check('Prefix BMP & bulan tanpa nol di depan: BMP2026-1-BBSPJPPI-999-SR', noLhvBmp === 'BMP2026-1-BBSPJPPI-999-SR');
  }

  // ------------------------------------------------------------------
  // TEST 5: Foto dinamis (shape "std") otomatis di-crop jadi persegi,
  // supaya rapi & sejajar di grid 2 kolom.
  // ------------------------------------------------------------------
  {
    // buat foto landscape (800x400, rasio 2:1) -- jelas bukan persegi
    const c = createCanvas(800, 400);
    const cx = c.getContext('2d');
    cx.fillStyle = '#3355ff'; cx.fillRect(0, 0, 800, 400);
    const landscapePhoto = new Blob([c.toBuffer('image/png')], { type: 'image/png' });

    const state = baseState('Produksi Sendiri');
    state.fileFotoProduk = [{ id: 1, file: landscapePhoto, keterangan: 'Foto landscape' }];

    const { imageJobs, context } = await LHVLogic.buildContext(state, () => {});
    const token = context.foto_produk[0].gambar;
    const job = imageJobs.get(token);
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      job.blob.arrayBuffer().then((buf) => { img.src = Buffer.from(buf); });
    });
    check('Foto landscape (800x400) tetap diskalakan proporsional ke kotak PERSEGI (tanpa dipotong)', dims.w === dims.h);
  }

  // ------------------------------------------------------------------
  // TEST 6: Upload Excel (.xlsx) untuk Formulir Verifikasi otomatis
  // dirender jadi gambar tabel.
  // ------------------------------------------------------------------
  {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['No', 'Komponen', 'Nilai TKDN (%)'],
      ['1', 'Bahan Baku Lokal', '65.5'],
      ['2', 'Tenaga Kerja', '80.2'],
      ['3', 'Alat Kerja/Mesin', '45.0'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Formulir 1.1');
    const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    global.XLSX = XLSX; // dipakai oleh excel-render.js (window.XLSX)

    const excelBlob = new Blob([xlsxBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    excelBlob.name = 'formulir-tkdn.xlsx';

    const state = baseState('Produksi Sendiri');
    state.formulirVerifikasi = [{ id: 1, judul: 'Formulir 1.1', file: excelBlob }];

    const { context, imageJobs } = await LHVLogic.buildContext(state, (m) => console.log(' >', m));
    check('formulir_tkdn terisi 1 item dari file Excel', context.formulir_tkdn.length === 1);
    const token = context.formulir_tkdn[0].gambar;
    check('Token gambar formulir Excel terdaftar di imageJobs', imageJobs.has(token));
    const job = imageJobs.get(token);
    check('Gambar hasil render Excel berukuran wajar (>1000 byte)', job.blob.size > 1000);
  }

  console.log(allPass ? '\n=== SEMUA TEST LULUS ===' : '\n=== ADA TEST YANG GAGAL ===');
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
