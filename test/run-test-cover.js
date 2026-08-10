const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createCanvas, Image: NodeImage } = require('canvas');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

let blobUrlMap = new Map();
let blobUrlCounter = 0;
global.URL = {
  createObjectURL: (blob) => { const k = 'blob:fake' + (blobUrlCounter++); blobUrlMap.set(k, blob); return k; },
  revokeObjectURL: () => {},
};

document.createElement_orig = document.createElement.bind(document);
document.createElement = function (tag) {
  if (tag === 'canvas') {
    const c = createCanvas(1000, 1414);
    c.toBlob = function (cb) { cb(new Blob([this.toBuffer('image/png')], { type: 'image/png' })); };
    return c;
  }
  return document.createElement_orig(tag);
};

global.Image = class extends NodeImage {
  set src(val) {
    if (typeof val === 'string' && blobUrlMap.has(val)) {
      blobUrlMap.get(val).arrayBuffer().then((buf) => { super.src = Buffer.from(buf); });
    } else {
      super.src = val;
    }
  }
  get src() { return super.src; }
};

global.JSZip = require('jszip');
global.nunjucks = require('nunjucks');
global.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onload && this.onload(); })
      .catch((e) => this.onerror && this.onerror(e));
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
require('../app-logic.js');
require('../cover-generator.js');
const DocxEngine = global.window.DocxEngine;
const LHVLogic = global.window.LHVLogic;
const CoverGenerator = global.window.CoverGenerator;

function makeDummyPhoto() {
  const c = createCanvas(400, 300);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, 400, 300);
  return new Blob([c.toBuffer('image/png')], { type: 'image/png' });
}

(async () => {
  let allPass = true;
  function check(label, cond) {
    console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);
    if (!cond) allPass = false;
  }

  const coverOpts = {
    judulLaporan: 'LAPORAN HASIL VERIFIKASI NILAI TKDN BARANG',
    namaLembaga: 'LVI BSKJI - Balai Besar Standardisasi dan Pelayanan Jasa Pencegahan Pencemaran Industri',
    noLhv: 'TKDN2026-8-BBSPJPPI-15348-AP',
    namaPerusahaan: 'PT Contoh Industri Manufaktur',
    kbliKode: '28130',
    kbliDeskripsi: 'Industri Mesin Attandar Khusus',
    jenisBarang: 'Mesin Pompa Air Otomatis',
    tahun: 2026,
    baseColor: '#2e7d32',
    fotoProdukBlob: makeDummyPhoto(),
    logoKemenperinSrc: path.join(__dirname, '..', 'assets', 'logo-kemenperin.png'),
    logoBbsSrc: path.join(__dirname, '..', 'assets', 'logo-bbspjppi.png'),
  };

  // TEST 1: cover generator menghasilkan blob PNG valid dengan ukuran wajar
  const coverBlob = await CoverGenerator.generateCoverImage(coverOpts);
  check('Cover berhasil dibuat (Blob PNG)', coverBlob && coverBlob.size > 5000);
  check('Tipe file cover adalah image/png', coverBlob.type === 'image/png');

  // TEST 2: cover bisa dipakai sebagai fileCover dan tersisip ke docx sungguhan
  const state = {
    jenisLhv: 'Produksi Sendiri',
    namaPerusahaan: 'PT Contoh Industri Manufaktur', tanggalLhv: '2026-08-04',
    idBerkas: 'TKDN2026-8-BBSPJPPI-15348-AP', permenperin: 'Permenperin No. 35 Tahun 2025',
    skalaPerusahaan: 'Menengah', noIzin: '123',
    kbli: '28130', jenisBarang: 'Mesin Pompa Air Otomatis',
    acuanPeraturan: [], aspekBmp: [], rekapBahanBaku: [],
    namaVerifikator: 'Budi Santoso',
    fileCover: coverBlob,
  };
  const { context, imageJobs, tableJobs } = await LHVLogic.buildContext(state, () => {});
  check('context.cover_laporan terisi token gambar', !!context.cover_laporan);

  const templatePath = path.join(__dirname, '..', 'templates', 'Contoh_LHV_TKDN_2026.docx');
  const buf = fs.readFileSync(templatePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const docxBlob = await DocxEngine.generateDocx(ab, context, imageJobs, tableJobs, () => {});
  const outBuf = Buffer.from(await docxBlob.arrayBuffer());
  const zip = await require('jszip').loadAsync(outBuf);
  const docXml = await zip.file('word/document.xml').async('string');
  check('Cover ter-embed sebagai <w:drawing> di dokumen', (docXml.match(/<w:drawing>/g) || []).length >= 1);
  check('Tidak ada token §§IMG tersisa', !docXml.includes('§§IMG'));

  console.log(allPass ? '\n=== SEMUA TEST LULUS ===' : '\n=== ADA TEST YANG GAGAL ===');
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
