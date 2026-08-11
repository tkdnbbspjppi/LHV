/* ==========================================================================
   cover-generator.js
   ------------------------------------------------------------------------
   Menggambar cover laporan LHV secara otomatis di <canvas>, lalu
   menghasilkannya sebagai Blob PNG -- dipakai sebagai pengganti upload
   file cover manual. Desain: pita diagonal 3 warna (oranye-merah-navy)
   di pojok kiri atas & kiri bawah, diamond foto produk (border oranye),
   2 diamond aksen (merah & oranye kecil), siluet kota transparan di kanan
   bawah, dengan latar krem lembut.
   ========================================================================== */

(function (global) {
  'use strict';

  const W = 1000;
  const H = 1414; // rasio dekat A4

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

  // --- Util warna ---
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  function hsl(h, s, l, a) {
    h = ((h % 360) + 360) % 360;
    return `hsla(${h}, ${Math.max(0, Math.min(100, s))}%, ${Math.max(0, Math.min(100, l))}%, ${a === undefined ? 1 : a})`;
  }
  function darken(colorHsl, amount) {
    const m = colorHsl.match(/hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/);
    if (!m) return colorHsl;
    return hsl(parseFloat(m[1]), parseFloat(m[2]), Math.max(0, parseFloat(m[3]) - amount));
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function diamondPath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }

  function drawCoverFit(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // Pita diagonal 3 warna dari 1 sudut. bands: [{width, color}], memanjang
  // menembus tepi kanvas (aman, otomatis terpotong oleh clip kanvas).
  function drawRibbonBand(ctx, cx, cy, angleDeg, bands, length) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);
    let offset = 0;
    bands.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.fillRect(-length / 2, offset, length, b.width);
      offset += b.width;
    });
    ctx.restore();
  }

  // Segitiga kecil "lipatan" di ujung pita, kesan origami/ribbon fold
  function foldFlap(ctx, points, color) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Siluet kota sangat transparan (elemen dekoratif kanan-bawah)
  function drawSkyline(ctx, baseX, baseY, totalW, color) {
    const buildings = [
      { w: 60, h: 140 }, { w: 40, h: 90 }, { w: 55, h: 190 }, { w: 35, h: 110 },
      { w: 45, h: 150 }, { w: 30, h: 80 }, { w: 50, h: 170 }, { w: 65, h: 130 },
      { w: 38, h: 100 }, { w: 42, h: 160 },
    ];
    let x = baseX;
    ctx.fillStyle = color;
    buildings.forEach((b) => {
      ctx.fillRect(x, baseY - b.h, b.w, b.h);
      x += b.w;
      if (x > baseX + totalW) return;
    });
  }

  async function generateCoverImage(opts) {
    const {
      judulLaporan,
      namaLembaga,
      noLhv,
      namaPerusahaan,
      kbliKode,
      kbliDeskripsi,
      jenisBarang,
      tahun,
      baseColor,
      fotoProdukBlob,
      logoKemenperinSrc,
      logoBbsSrc,
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ---------------- Palet warna (oranye bisa diganti user, merah &
    // navy diturunkan otomatis supaya tetap harmonis) ----------------
    const oh = hexToHsl(baseColor || '#F2941D');
    const ORANGE = hsl(oh.h, Math.min(oh.s, 90), Math.max(Math.min(oh.l, 62), 45));
    const RED = hsl(oh.h - 26, Math.min(oh.s + 10, 75), 42);
    const RED_DARK = hsl(oh.h - 26, Math.min(oh.s + 10, 75), 30);
    const NAVY = '#2B3990';
    const NAVY_DARK = '#1E2860';
    const CREAM = '#FBF2EC';
    const TEXT_NAVY = '#1E2860';
    const TEXT_SOFT = '#4A5590';

    // ---------------- Latar ----------------
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);

    // ---------------- Siluet kota (dekorasi kanan-bawah, sangat transparan) ----------------
    drawSkyline(ctx, 480, 1180, 480, 'rgba(80,60,90,0.05)');

    // ---------------- Pita diagonal pojok kiri ATAS ----------------
    // pivot tepat di pojok (0,0), band tersusun dari sudut (oranye tipis)
    // makin melebar ke arah dalam (navy)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 420, 320);
    ctx.clip();
    drawRibbonBand(ctx, 0, 0, -45, [
      { width: 46, color: ORANGE },
      { width: 92, color: RED },
      { width: 150, color: NAVY },
    ], 1400);
    ctx.restore();

    // ---------------- Pita diagonal pojok kiri BAWAH ----------------
    // cerminan vertikal dari pita atas (translate ke pojok bawah, flip sumbu Y)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, H - 420, 620, 420);
    ctx.clip();
    ctx.translate(0, H);
    ctx.scale(1, -1);
    drawRibbonBand(ctx, 0, 0, -45, [
      { width: 46, color: ORANGE },
      { width: 92, color: RED },
      { width: 150, color: NAVY },
    ], 1400);
    ctx.restore();

    // ---------------- Diamond kecil navy (mengambang) ----------------
    diamondPath(ctx, 150, 300, 62);
    ctx.fillStyle = NAVY;
    ctx.fill();

    // ---------------- Diamond besar: foto produk (border oranye) ----------------
    const diaCx = 175, diaCy = 640, diaR = 215, diaBorder = 17;
    if (fotoProdukBlob) {
      try {
        const img = await loadImageFromBlob(fotoProdukBlob);
        ctx.save();
        diamondPath(ctx, diaCx, diaCy, diaR - diaBorder);
        ctx.clip();
        drawCoverFit(ctx, img, diaCx - diaR, diaCy - diaR, diaR * 2, diaR * 2);
        ctx.restore();
      } catch (e) {
        console.warn('Cover: gagal memuat foto produk', e);
      }
    }
    diamondPath(ctx, diaCx, diaCy, diaR);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = diaBorder;
    ctx.stroke();

    // ---------------- Diamond merah (solid, dengan lipatan) ----------------
    const redCx = 300, redCy = 845, redR = 95;
    diamondPath(ctx, redCx, redCy, redR);
    ctx.fillStyle = RED;
    ctx.fill();
    foldFlap(ctx, [[redCx - redR, redCy], [redCx - redR + 60, redCy + 70], [redCx - 30, redCy + 130], [redCx - 90, redCy + 60]], RED_DARK);

    // ---------------- Diamond oranye kecil ----------------
    diamondPath(ctx, 305, 1000, 40);
    ctx.fillStyle = ORANGE;
    ctx.fill();

    // ---------------- Kolom teks kanan ----------------
    const rightX = 430;
    const rightW = W - rightX - 60;
    let ty = 90;

    try {
      const [logoKp, logoBb] = await Promise.all([
        loadImage(logoKemenperinSrc),
        loadImage(logoBbsSrc),
      ]);
      const kpH = 80, kpW = (logoKp.width / logoKp.height) * kpH;
      const bbH = 80, bbW = (logoBb.width / logoBb.height) * bbH;
      ctx.drawImage(logoKp, rightX, ty, kpW, kpH);
      ctx.drawImage(logoBb, rightX + kpW + 24, ty, bbW, bbH);
      ty += kpH + 40;
    } catch (e) {
      console.warn('Cover: gagal memuat logo', e);
      ty += 40;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_NAVY;
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('NO. LHV : ' + (noLhv || '-'), rightX, ty);
    ty += 44;

    ctx.font = '900 34px Arial, sans-serif';
    wrapText(ctx, (judulLaporan || '').toUpperCase(), rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 40;
    });
    ty += 14;

    ctx.font = 'bold 22px Arial, sans-serif';
    wrapText(ctx, namaLembaga || '', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 30;
    });
    ty += 50;

    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillStyle = TEXT_NAVY;
    wrapText(ctx, namaPerusahaan || '-', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 38;
    });
    ty += 36;

    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.fillStyle = TEXT_NAVY;
    ctx.fillText('BIDANG USAHA :', rightX, ty);
    ty += 32;
    ctx.font = '21px Arial, sans-serif';
    ctx.fillStyle = TEXT_SOFT;

    // Cegah duplikasi: kalau "Deskripsi KBLI" ternyata sudah memuat kode
    // KBLI itu sendiri (mis. user isi "21015-Industri Alat Kesehatan..."),
    // jangan tampilkan "KBLI {kode}" dan deskripsi terpisah (akan dobel) --
    // cukup tampilkan satu baris gabungan.
    const normKode = String(kbliKode || '').trim();
    const normDesk = String(kbliDeskripsi || '').trim();
    const ringkasKode = normKode.toLowerCase().replace(/[\s-]/g, '');
    const ringkasDesk = normDesk.toLowerCase().replace(/[\s-]/g, '');
    const deskSudahMemuatKode = normKode && normDesk && ringkasDesk.includes(ringkasKode);

    if (deskSudahMemuatKode) {
      wrapText(ctx, 'KBLI ' + normDesk, rightW).forEach((line) => {
        ctx.fillText(line, rightX, ty);
        ty += 28;
      });
    } else {
      ctx.fillText('KBLI ' + (normKode || '-'), rightX, ty);
      ty += 28;
      if (normDesk) {
        wrapText(ctx, normDesk, rightW).forEach((line) => {
          ctx.fillText(line, rightX, ty);
          ty += 28;
        });
      }
    }
    ty += 30;

    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.fillStyle = TEXT_NAVY;
    ctx.fillText('JENIS BARANG :', rightX, ty);
    ty += 32;
    ctx.font = '21px Arial, sans-serif';
    ctx.fillStyle = TEXT_SOFT;
    wrapText(ctx, jenisBarang || '-', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 28;
    });

    // ---------------- Tahun (di atas pita bawah, teks putih) ----------------
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Arial, sans-serif';
    ctx.fillText(String(tahun || new Date().getFullYear()), 50, H - 45);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  global.CoverGenerator = { generateCoverImage };
})(window);
