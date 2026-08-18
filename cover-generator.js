/* ==========================================================================
   cover-generator.js  (v3 — sinkron 1:1 dengan engine di
   https://github.com/tkdnbbspjppi/cover-LHV)
   ------------------------------------------------------------------------
   Menggambar teks & foto produk DI ATAS 11 template desain PNG resmi
   (assets/tkdn-1..5.png, assets/bmp-1..5.png, assets/jasa-1.png),
   lalu menghasilkannya sebagai Blob PNG.

   API publik dipertahankan sama seperti versi sebelumnya supaya app.jsx
   tidak perlu dirombak:
       CoverGenerator.generateCoverImage(opts) -> Promise<Blob>
       CoverGenerator.TEMPLATES  (dipakai untuk isi dropdown varian)
       CoverGenerator.CATEGORIES

   opts yang dipakai:
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

  // Penanda versi — buka Console (F12) setelah reload halaman untuk
  // memastikan file YANG BARU ini yang benar-benar termuat (bukan cache lama).
  console.log('[CoverGenerator] v5 loaded — baseline No.LHV BMP diperbaiki, foto BMP aktif');

  const CANVAS_W = 1414;
  const CANVAS_H = 2000;
  const COLOR_NAVY = '#262362';
  const COLOR_BLUE = '#2838a7';
  const FONT_FAMILY = "'Poppins', sans-serif";

  // File tkdn-*.png / bmp-*.png / jasa-*.png ada langsung di dalam assets/
  const TEMPLATE_BASE = 'assets/';

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

  // Konfigurasi posisi teks & foto — disalin persis dari cover-LHV/index.html
  const POS = {
    tkdn: {
      marginX: 144,
      noLhv: { x: 336, y: 313, fontSize: 40, color: COLOR_NAVY, weight: 700, maxWidth: 930 },
      namaPerusahaan: { x: 144, yTop: 758, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      bidangUsaha: { x: 144, yTop: 948, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 4 },
      namaProduk: { x: 144, yTop: 1207, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 4 },
      photo: {
        type: 'polygon',
        outer: [[1020, 938], [669, 1142], [669, 1553], [1022, 1757], [1373, 1553], [1373, 1142]],
        centroid: [1021, 1347.5],
        innerScale: 0.925,
      },
      tahun: { x: 144, y: 1850, fontSize: 48, color: COLOR_NAVY, weight: 800 },
    },
    bmp: {
      marginX: 124,
      noLhv: { x: 300, y: 327, fontSize: 36, color: COLOR_NAVY, weight: 700, maxWidth: 950 },
      namaPerusahaan: { x: 124, yTop: 742, width: 700, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      // Area foto lebar (mengganti ilustrasi langit/bukit bawaan template),
      // dibatasi pita diagonal navy di atas & pita diagonal aksen di bawah.
      // Koordinat diukur langsung dari pixel bmp-1.png (berlaku utk bmp-1..5,
      // kelimanya memakai proporsi diagonal yang sama).
      photo: {
        type: 'quad',
        points: [[0, 1046], [1413, 652], [1413, 1481], [0, 1774]],
      },
      tahun: { x: 124, y: 1850, fontSize: 48, color: COLOR_NAVY, weight: 800 },
    },
    jasa: {
      marginX: 144,
      noLhv: { x: 306, y: 408, fontSize: 40, color: COLOR_NAVY, weight: 700, maxWidth: 950 },
      namaPerusahaan: { x: 144, yTop: 800, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 3 },
      namaPerusahaanIndustriPrefix: 'Kerjasama dengan: ',
      bidangUsaha: { x: 144, yTop: 1112, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 4 },
      namaProduk: { x: 144, yTop: 1251, width: 520, fontSize: 30, lineHeight: 42, color: COLOR_BLUE, weight: 600, maxLines: 4 },
      photo: { type: 'circle', cx: 1010, cy: 1272, innerRadius: 316 },
      tahun: { x: 144, y: 1850, fontSize: 48, color: COLOR_NAVY, weight: 800 },
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

  function drawSingleLineAutoFit(ctx, text, x, y, maxWidth, fontSize, weight, color) {
    if (!text) return;
    let size = fontSize;
    ctx.fillStyle = color;
    for (let attempt = 0; attempt < 8; attempt++) {
      ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
      if (ctx.measureText(text).width <= maxWidth || size <= 14) break;
      size -= 1.5;
    }
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    ctx.fillText(text, x, y);
  }

  // ---------------- util foto ----------------
  // "contain": foto pas di dalam kotak, proporsional, tanpa terpotong
  // (dipakai untuk bentuk heksagon TKDN & lingkaran Jasa)
  function drawImageFitCentered(ctx, img, cx, cy, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let drawW, drawH;
    if (imgRatio > boxRatio) {
      drawW = w;
      drawH = w / imgRatio;
    } else {
      drawH = h;
      drawW = h * imgRatio;
    }
    ctx.drawImage(img, 0, 0, img.width, img.height, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }

  // "cover": foto memenuhi seluruh kotak, kelebihannya dipotong
  // (dipakai untuk area foto lebar BMP, mis. foto gedung/fasilitas)
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
      drawImageFitCentered(ctx, img, cx, cy, w, h);
    } else if (shapeCfg.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shapeCfg.cx, shapeCfg.cy, shapeCfg.innerRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const d = shapeCfg.innerRadius * 2;
      drawImageFitCentered(ctx, img, shapeCfg.cx, shapeCfg.cy, d, d);
    } else if (shapeCfg.type === 'quad') {
      const pts = shapeCfg.points;
      clipPolygon(ctx, pts);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const w = maxX - minX, h = maxY - minY;
      drawImageCover(ctx, img, minX + w / 2, minY + h / 2, w, h);
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

    // Pastikan font Poppins sudah siap sebelum menggambar teks (sama seperti cover-LHV)
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* abaikan */ }
    }

    // 1. Gambar template dasar
    const bgImg = await loadImage(TEMPLATE_BASE + resolvedTemplateId + '.png');
    ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);

    // 2. Foto produk/jasa
    if (posCfg.photo && fotoProdukBlob) {
      console.log('[CoverGenerator] mencoba menggambar foto ke area', posCfg.photo.type, 'ukuran blob:', fotoProdukBlob.size, 'bytes');
      try {
        const photoImg = await loadImageFromBlob(fotoProdukBlob);
        drawPhotoShape(ctx, photoImg, posCfg.photo);
        console.log('[CoverGenerator] foto berhasil digambar');
      } catch (e) {
        console.error('[CoverGenerator] GAGAL menggambar foto:', e);
      }
    } else if (posCfg.photo && !fotoProdukBlob) {
      console.log('[CoverGenerator] area foto tersedia untuk kategori ini tapi fotoProdukBlob kosong (belum ada file diupload)');
    } else if (!posCfg.photo) {
      console.log('[CoverGenerator] kategori', categoryKey, '(group', group, ') tidak punya area foto di konfigurasi POS');
    }

    // 3. No. LHV
    if (noLhv) {
      drawSingleLineAutoFit(
        ctx, noLhv,
        posCfg.noLhv.x, posCfg.noLhv.y, posCfg.noLhv.maxWidth,
        posCfg.noLhv.fontSize, posCfg.noLhv.weight, posCfg.noLhv.color
      );
    }

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

    // 7. Tahun — diambil otomatis dari 4 digit angka pertama pada No. LHV
    //    (mis. "TKDN2026-8-BBSPJPPI-..." -> "2026"); kalau tidak ketemu,
    //    pakai tahun berjalan. Digambar sebagai badge/pil solid berwarna
    //    navy dengan angka putih tebal di tengah, supaya PASTI terlihat
    //    kontras di atas template apa pun (tidak bergantung pada gambar
    //    badge yang mungkin/tidak ada di file PNG template).
    if (posCfg.tahun) {
      let displayYear = new Date().getFullYear().toString();
      if (noLhv) {
        const matchYear = noLhv.match(/\d{4}/);
        if (matchYear) displayYear = matchYear[0];
      }
      const t = posCfg.tahun;
      ctx.font = `${t.weight} ${t.fontSize}px ${FONT_FAMILY}`;
      const textW = ctx.measureText(displayYear).width;
      const padX = 28, padY = 16;
      const boxW = textW + padX * 2;
      const boxH = t.fontSize + padY * 2;
      const boxX = t.x - padX;
      const boxY = t.y - t.fontSize * 0.9 - padY + 6; // sejajarkan dgn baseline teks
      const radius = 16;

      ctx.fillStyle = COLOR_NAVY;
      ctx.beginPath();
      ctx.moveTo(boxX + radius, boxY);
      ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, radius);
      ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, radius);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY, radius);
      ctx.arcTo(boxX, boxY, boxX + boxW, boxY, radius);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayYear, t.x, t.y);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  global.CoverGenerator = {
    generateCoverImage,
    TEMPLATES,
    CATEGORIES,
  };
})(window);
