const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Image, createCanvas } = require('canvas');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.Image = Image;

// canvas.toBlob polyfill using node-canvas toBuffer + Node's Blob
dom.window.HTMLCanvasElement.prototype.toBlob = function (cb, type) {
  const buf = this.toBuffer(type === 'image/png' ? 'image/png' : 'image/png');
  cb(new Blob([buf], { type: type || 'image/png' }));
};
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
document.createElement_orig = document.createElement.bind(document);
document.createElement = function (tag) {
  if (tag === 'canvas') {
    const c = createCanvas(100, 100);
    // adapt node-canvas to look enough like HTMLCanvasElement for our usage
    c.toBlob = function (cb, type) {
      const buf = this.toBuffer('image/png');
      cb(new Blob([buf], { type: type || 'image/png' }));
    };
    return c;
  }
  return document.createElement_orig(tag);
};

global.URL = { createObjectURL: (blob) => 'blob://fake', revokeObjectURL: () => {} };
global.JSZip = require('jszip');
global.nunjucks = require('nunjucks');

// FileReader polyfill (blobToArrayBuffer)
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

// Load engine + logic
require('../docx-engine.js');
const DocxEngine = global.window.DocxEngine;

(async () => {
  const templatePath = path.join(__dirname, '..', 'templates', 'Contoh_LHV_TKDN_2026.docx');
  const templateBuf = fs.readFileSync(templatePath);
  const templateArrayBuffer = templateBuf.buffer.slice(templateBuf.byteOffset, templateBuf.byteOffset + templateBuf.byteLength);

  // Buat gambar dummy 50x50 PNG via node-canvas
  function makeDummyImage(color) {
    const c = createCanvas(50, 50);
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 50, 50);
    const buf = c.toBuffer('image/png');
    return new Blob([buf], { type: 'image/png' });
  }

  const context = {
    jenis_lhv: 'Produksi Sendiri',
    nama_perusahaan: 'PT Uji & Coba <Sejahtera>',
    tanggal_dibuat: '3 Agustus 2026',
    tanggal_lhv: '3 Agustus 2026',
    id_berkas: 'TEST-001',
    permenperin: 'Permenperin No. 35 Tahun 2025 tentang Ketentuan dan Tata Cara Sertifikasi Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan',
    skala_perusahaan: 'Menengah', no_izin: '12345',
    nama_perusahaan_industri: '', alamat_perusahaan_industri: '', skala_perusahaan_industri: '',
    no_izin_perusahaan_industri: '', telepon_kantor_industri: '', fax_kantor_industri: '',
    email_kantor_industri: '', website_kantor_industri: '', status_kantor_industri: '',
    pic_kantor_industri: '', akta_kantor_industri: '', npwp_kantor_industri: '',
    nilai_bmp: '', terbilang_bmp: '',
    tgl_verifikasi_dok: '1 Agustus 2026', tgl_verifikasi_lapangan: '2 Agustus 2026',
    kbli: '28130', kapasitas_produksi: '1000 unit/bulan', jenis_barang: 'Pompa Air',
    tipe_barang: 'X-100', spesifikasi_barang: 'Spesifikasi uji', kode_hs: '8413.70.00',
    merek_barang: 'MerekUji', kelompok_barang: 'Mesin', nilai_tkdn: '45.5', terbilang_tkdn: 'empat puluh lima koma lima persen',
    nilai_brainware: '10', terbilang_brainware: 'sepuluh persen',
    nama_verifikator: 'Budi Santoso', nip_verifikator: '199001012020121001',
    pejabat_mengetahui: 'Kepala BBSPJPPI', nama_pejabat: 'Sofyari Rahman', nip_pejabat: '198403252009111001',
    alamat_kantor: 'Jl. Uji No.1', telepon_kantor: '021123', fax_kantor: '', email_kantor: 'a@a.com',
    website_kantor: '', status_kantor: 'PMDN', pic_kantor: 'Andi', akta_kantor: '', npwp_kantor: '',
    alamat_pabrik: 'Jl. Pabrik No.2', telepon_pabrik: '', fax_pabrik: '', email_pabrik: '',
    website_pabrik: '', status_pabrik: 'PMDN', pic_pabrik: '', akta_pabrik: '', npwp_pabrik: '',
    daftar_acuan_peraturan: [{ aturan: 'Peraturan Uji Nomor 1' }],
    aspek_bmp: [],
  };

  const imageJobs = new Map();
  const tableJobs = new Map();

  // gambar tunggal
  context.cover_laporan = '§§IMG:cover_laporan:1§§';
  imageJobs.set(context.cover_laporan, { blob: makeDummyImage('#ff0000'), widthMm: null });
  context.logo_perusahaan = '§§IMG:logo_perusahaan:2§§';
  imageJobs.set(context.logo_perusahaan, { blob: makeDummyImage('#00ff00'), widthMm: 20 });
  context.ttd_verifikator = '';
  context.struktur_organisasi = '§§IMG:struktur_organisasi:3§§';
  imageJobs.set(context.struktur_organisasi, { blob: makeDummyImage('#0000ff'), widthMm: 70 });
  context.alur_produksi = '';
  context.struktur_industri = '';

  // list dinamis
  const dynCategories = ['formulir_tkdn','bukti_pabrik','gambar_bom','sertifikat_tkdn','bukti_beli','ktp_karyawan',
    'bukti_kerjasama','nib_rba','sert_standar','izin_usaha','npwp_lampiran','sert_merek','sert_produk','nie','bpom',
    'foto_produk','foto_bahan_baku','invoice_bahan_baku','alur_proses_lampiran','daftar_gaji','sampel_ktp',
    'struktur_pabrik','foto_mesin','daftar_penyusutan','bukti_listrik','akta_sewa','geotagging'];
  let tokenCounter = 100;
  for (const cat of dynCategories) {
    const items = [];
    for (let i = 0; i < 2; i++) {
      const token = `§§IMG:${cat}:${tokenCounter++}§§`;
      imageJobs.set(token, { blob: makeDummyImage('#999999'), widthMm: cat === 'formulir_tkdn' ? null : 70 });
      items.push({ judul: `Keterangan ${cat} ${i}`, keterangan: `Keterangan ${cat} ${i}`, gambar: token });
    }
    context[cat] = items;
  }

  const tableToken = '§§TABLE:bahanbaku§§';
  context.tabel_dinamis_bahan_baku = tableToken;
  tableJobs.set(tableToken, { rows: [
    { nama_bahan: 'Baja', produsen: 'PT Baja Nusantara', asal: 'DN' },
    { nama_bahan: 'Karet', produsen: 'CV Karet Jaya', asal: 'LN' },
  ] });

  console.log('Menjalankan DocxEngine.generateDocx...');
  const blob = await DocxEngine.generateDocx(templateArrayBuffer, context, imageJobs, tableJobs, (m) => console.log('  >', m));
  const outBuf = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(path.join(__dirname, 'output-test.docx'), outBuf);
  console.log('Selesai. Ukuran file output:', outBuf.length, 'bytes');

  // Validasi isi
  const JSZip = require('jszip');
  const checkZip = await JSZip.loadAsync(outBuf);
  const xml = await checkZip.file('word/document.xml').async('string');

  const checks = [
    ['Nama perusahaan ter-render', xml.includes('PT Uji &amp; Coba')],
    ['Tidak ada token §§IMG tersisa', !xml.includes('§§IMG')],
    ['Tidak ada token §§TABLE tersisa', !xml.includes('§§TABLE')],
    ['Ada elemen w:drawing (gambar tersisip)', xml.includes('<w:drawing>')],
    ['Ada tabel w:tbl (bahan baku)', xml.includes('<w:tbl>')],
    ['Isi tabel "Baja" muncul', xml.includes('Baja')],
    ['ID berkas ter-render', xml.includes('TEST-001')],
    ['Media gambar tersimpan di zip', Object.keys(checkZip.files).some(f => f.startsWith('word/media/image_gen_'))],
  ];
  let allPass = true;
  for (const [label, pass] of checks) {
    console.log((pass ? 'PASS' : 'FAIL') + ' - ' + label);
    if (!pass) allPass = false;
  }
  const mediaFiles = Object.keys(checkZip.files).filter(f => f.startsWith('word/media/image_gen_'));
  console.log('Jumlah file gambar baru disisipkan:', mediaFiles.length);

  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
