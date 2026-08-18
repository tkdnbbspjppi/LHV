/* ==========================================================================
   cover-generator.js  (v2 — berbasis template gambar, diambil dari
   proyek https://github.com/tkdnbbspjppi/cover-LHV)
   ------------------------------------------------------------------------
   Menggambar teks & foto produk DI ATAS 11 template desain PNG resmi
   (bukan lagi digambar dari nol), lalu menghasilkannya sebagai Blob PNG.

   API publik dipertahankan sama seperti versi lama supaya app.jsx tidak
   perlu dirombak total:
       CoverGenerator.generateCoverImage(opts) -> Promise<Blob>

   opts yang dipakai versi baru ini:
     - categoryKey   : 'tkdn_sendiri' | 'tkdn_kerjasama' | 'bmp' | 'tkdn_jasa'
     - templateId    : id varian, mis. 'tkdn-3', 'bmp-1', 'jasa-1'
     - noLhv
     - namaPerusahaan
     - namaPerusahaanIndustri   (opsional, khusus kerjasama)
     - bidangUsaha
     - namaProduk
     - fotoProdukBlob           (opsional, Blob foto produk/jasa)
   ========================================================================== */

(function (global) {
  'use strict';

  const CANVAS_W = 1414;
  const CANVAS_H = 2000;
  const COLOR_NAVY = '#262362';
  const COLOR_BLUE = '#2838a7';
  const FONT_FAMILY = "'Poppins', sans-serif";

  // Lokasi folder template — sesuaikan kalau strukturnya beda di repo LHV.
  const TEMPLATE_BASE = 'assets/cover-templates/';

  const CATEGORIES = {
    tkdn_sendiri: { group: 'tkdn' },
    tkdn_kerjasama: { group: 'tkdn' },
    bmp: { group: 'bmp' },
    tkdn_jasa: { group: 'jasa' },
  };

  const TEMPLATES = {
    tkdn: ['tkdn-1', 'tkdn-2', 'tkdn-3', 'tkdn-4', 'tkdn-5'],
    bmp: ['bmp-1', 'bmp-2', 'bmp-3', 'bmp-4', 'bmp-5'],
    jasa: ['jasa-1'],
  };

  const POS = {
    tkdn: {
      noLhv: { x: 336, y: 313, fontSize: 34, color: COLOR_NAVY, weight: 700, maxWidth: 930 },
      namaPerusahaan: { x: 144, yTop: 758, width: 900, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      bidangUsaha: { x: 144, yTop: 948, width: 1000, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaProduk: { x: 144, yTop: 1207, width: 1000, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      photo: {
        type: 'polygon',
        outer: [[1020, 938], [669, 1142], [669, 1553], [1022, 1757], [1373, 1553], [1373, 1142]],
        centroid: [1021, 1347.5],
        innerScale: 0.925,
      },
    },
    bmp: {
      noLhv: { x: 296, y: 322, fontSize: 34, color: COLOR_NAVY, weight: 700, maxWidth: 950 },
      namaPerusahaan: { x: 124, yTop: 742, width: 900, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      photo: null,
    },
    jasa: {
      noLhv: { x: 306, y: 408, fontSize: 34, color: COLOR_NAVY, weight: 700, maxWidth: 950 },
      namaPerusahaan: { x: 144, yTop: 800, width: 850, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      bidangUsaha: { x: 144, yTop: 1112, width: 850, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaProduk: { x: 144, yTop: 1251, width: 850, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      photo: { type: 'circle', cx: 1010, cy: 1272, innerRadius: 316 },
    },
  };

  // ---------------- util loader ----------------
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
      img.onerror = reject;
      img.src = url;
    });
  }

  // ---------------- util teks ----------------
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawWrappedText(ctx, text, cfg) {
    if (!text) return;
    let fontSize = cfg.fontSize;
    let lines = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      ctx.font = `${cfg.weight} ${fontSize}px ${FONT_FAMILY}`;
      lines = wrapText(ctx, text, cfg.width);
      if (lines.length <= cfg.maxLines) break;
      fontSize -= 2;
    }
    if (lines.length > cfg.maxLines) {
      lines = lines.slice(0, cfg.maxLines);
      let last = lines[cfg.maxLines - 1];
      while (ctx.measureText(last + '…').width > cfg.width && last.length > 0) {
        last = last.slice(0, -1);
      }
      lines[cfg.maxLines - 1] = last + '…';
    }
    ctx.fillStyle = cfg.color;
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => {
      ctx.fillText(line, cfg.x, cfg.yTop + fontSize * 0.9 + i * cfg.lineHeight);
    });
  }

  function drawSingleLineAutoFit(ctx, text, cfg) {
    if (!text) return;
    let size = cfg.fontSize;
    ctx.fillStyle = cfg.color;
    for (let attempt = 0; attempt < 8; attempt++) {
      ctx.font = `${cfg.weight} ${size}px ${FONT_FAMILY}`;
      if (ctx.measureText(text).width <= cfg.maxWidth || size <= 14) break;
      size -= 1.5;
    }
    ctx.font = `${cfg.weight} ${size}px ${FONT_FAMILY}`;
    ctx.fillText(text, cfg.x, cfg.y);
  }

  // ---------------- util foto ----------------
  function drawImageCover(ctx, img, cx, cy, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
      sh = img.height; sw = sh * boxRatio; sx = (img.width - sw) / 2; sy = 0;
    } else {
      sw = img.width; sh = sw / boxRatio; sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, cx - w / 2, cy - h / 2, w, h);
  }

  function clipPolygon(ctx, points) {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.clip();
  }

  function drawPhotoShape(ctx, img, shapeCfg) {
    if (!img || !shapeCfg) return;
    ctx.save();
    if (shapeCfg.type === 'polygon') {
      const [cx, cy] = shapeCfg.centroid;
      const inner = shapeCfg.outer.map(([x, y]) => [
        cx + (x - cx) * shapeCfg.innerScale,
        cy + (y - cy) * shapeCfg.innerScale,
      ]);
      const xs = inner.map((p) => p[0]);
      const ys = inner.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      clipPolygon(ctx, inner);
      drawImageCover(ctx, img, cx, cy, w, h);
    } else if (shapeCfg.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shapeCfg.cx, shapeCfg.cy, shapeCfg.innerRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const d = shapeCfg.innerRadius * 2;
      drawImageCover(ctx, img, shapeCfg.cx, shapeCfg.cy, d, d);
    }
    ctx.restore();
  }

  // ---------------- fungsi utama ----------------
  async function generateCoverImage(opts) {
    const {
      categoryKey,
      templateId,
      noLhv,
      namaPerusahaan,
      namaPerusahaanIndustri,
      bidangUsaha,
      namaProduk,
      fotoProdukBlob,
    } = opts;

    const cat = CATEGORIES[categoryKey] || CATEGORIES.tkdn_sendiri;
    const group = cat.group;
    const posCfg = POS[group];
    const resolvedTemplateId = templateId || TEMPLATES[group][0];

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');

    // Pastikan font Poppins sudah siap sebelum menggambar teks
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* abaikan */ }
    }

    // 1. Gambar template dasar
    const bgImg = await loadImage(TEMPLATE_BASE + resolvedTemplateId + '.png');
    ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);

    // 2. Foto produk/jasa (digambar dulu, sebelum teks, karena border
    //    bentuk sudah ada di dalam template)
    if (posCfg.photo && fotoProdukBlob) {
      try {
        const photoImg = await loadImageFromBlob(fotoProdukBlob);
        drawPhotoShape(ctx, photoImg, posCfg.photo);
      } catch (e) {
        console.warn('Cover: gagal memuat foto produk', e);
      }
    }

    // 3. No. LHV
    if (noLhv) drawSingleLineAutoFit(ctx, noLhv, posCfg.noLhv);

    // 4. Nama Perusahaan (+ Nama Perusahaan Industri jika kerjasama)
    if (namaPerusahaan) {
      const cfg = posCfg.namaPerusahaan;
      const lines = [];
      ctx.font = `${cfg.weight} ${cfg.fontSize}px ${FONT_FAMILY}`;
      lines.push(...wrapText(ctx, namaPerusahaan, cfg.width));
      if (namaPerusahaanIndustri) {
        const prefixed = posCfg.namaPerusahaanIndustriPrefix + namaPerusahaanIndustri;
        lines.push(...wrapText(ctx, prefixed, cfg.width));
      }
      ctx.fillStyle = cfg.color;
      lines.forEach((line, i) => {
        ctx.fillText(line, cfg.x, cfg.yTop + cfg.fontSize * 0.9 + i * cfg.lineHeight);
      });
    }

    // 5. Bidang Usaha
    if (bidangUsaha && posCfg.bidangUsaha) drawWrappedText(ctx, bidangUsaha, posCfg.bidangUsaha);

    // 6. Nama Produk / Nama Jasa
    if (namaProduk && posCfg.namaProduk) drawWrappedText(ctx, namaProduk, posCfg.namaProduk);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  global.CoverGenerator = {
    generateCoverImage,
    TEMPLATES,     // diekspos supaya app.jsx bisa mengisi dropdown varian
    CATEGORIES,
  };
})(window);
