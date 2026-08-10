/* ==========================================================================
   excel-render.js
   ------------------------------------------------------------------------
   Mengubah 1 file Excel (.xlsx/.xls) menjadi gambar tabel (PNG) di browser,
   memakai SheetJS untuk membaca isi sheet lalu Canvas untuk menggambarnya.
   Dipakai supaya file Excel bisa diunggah untuk Formulir Verifikasi (yang
   di template Word memang berupa slot GAMBAR, bukan tabel asli Word).
   ========================================================================== */

(function (global) {
  'use strict';

  const MAX_ROWS = 40;
  const MAX_COLS = 12;
  const CELL_PAD_X = 12;
  const CELL_PAD_Y = 10;
  const FONT = '14px Arial, sans-serif';
  const HEADER_FONT = 'bold 14px Arial, sans-serif';
  const ROW_H = 34;
  const MIN_COL_W = 70;

  async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function fmtCell(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toLocaleDateString('id-ID');
    return String(v);
  }

  async function renderExcelToImage(file) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Library pembaca Excel (SheetJS) belum termuat. Cek koneksi internet lalu muat ulang halaman.');
    }
    const buf = await readFileAsArrayBuffer(file);
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    if (!rows || rows.length === 0) {
      rows = [['(Sheet kosong)']];
    }

    let truncatedRows = false, truncatedCols = false;
    if (rows.length > MAX_ROWS) { rows = rows.slice(0, MAX_ROWS); truncatedRows = true; }
    const colCount = Math.min(MAX_COLS, Math.max(...rows.map((r) => r.length)));
    if (Math.max(...rows.map((r) => r.length)) > MAX_COLS) truncatedCols = true;
    rows = rows.map((r) => {
      const row = r.slice(0, colCount).map(fmtCell);
      while (row.length < colCount) row.push('');
      return row;
    });

    // Ukur lebar kolom otomatis berdasarkan isi terpanjang
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    const colWidths = new Array(colCount).fill(MIN_COL_W);
    rows.forEach((row, ri) => {
      mctx.font = ri === 0 ? HEADER_FONT : FONT;
      row.forEach((cell, ci) => {
        const w = mctx.measureText(cell).width + CELL_PAD_X * 2;
        if (w > colWidths[ci]) colWidths[ci] = Math.min(w, 320);
      });
    });

    const tableW = colWidths.reduce((a, b) => a + b, 0);
    const titleH = 34;
    const noteH = (truncatedRows || truncatedCols) ? 26 : 0;
    const tableH = rows.length * ROW_H;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(tableW, 200) + 4;
    canvas.height = titleH + tableH + noteH + 4;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1E2860';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(file.name.replace(/\.(xlsx|xls)$/i, ''), 4, titleH / 2 + 2);

    let y = titleH;
    rows.forEach((row, ri) => {
      let x = 2;
      const isHeader = ri === 0;
      ctx.font = isHeader ? HEADER_FONT : FONT;
      row.forEach((cell, ci) => {
        const w = colWidths[ci];
        ctx.fillStyle = isHeader ? '#EEF1FB' : (ri % 2 === 0 ? '#FAFAFA' : '#ffffff');
        ctx.fillRect(x, y, w, ROW_H);
        ctx.strokeStyle = '#D0D5E5';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, ROW_H);
        ctx.fillStyle = '#1E2860';
        ctx.fillText(cell, x + CELL_PAD_X, y + ROW_H / 2 + 1, w - CELL_PAD_X * 2);
        x += w;
      });
      y += ROW_H;
    });

    if (noteH) {
      ctx.fillStyle = '#888888';
      ctx.font = 'italic 12px Arial, sans-serif';
      ctx.fillText(
        `(Ditampilkan sebagian: maksimal ${MAX_ROWS} baris x ${MAX_COLS} kolom pertama dari sheet "${sheetName}")`,
        4, y + noteH / 2
      );
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  global.ExcelRender = { renderExcelToImage };
})(window);
