/* ==========================================================================
   DOCX ENGINE — Pengganti docxtpl (Python) yang berjalan 100% di browser.
   Meniru perilaku python-docx-template:
     - Sintaks tag Jinja2: {{ var }}, {% for %}...{% endfor %}, {% if %}...{% endif %}
     - Filter batch(n, fill) seperti Jinja2 bawaan
     - InlineImage -> disini direpresentasikan lewat token gambar & disisipkan
       sebagai elemen <w:drawing> asli setelah proses render teks selesai
     - Subdocument tabel -> disisipkan sebagai elemen <w:tbl> asli

   Dependensi global (dimuat via CDN di index.html): JSZip, nunjucks
   ========================================================================== */

(function (global) {
  "use strict";

  const IMG_TOKEN_RE = /§§IMG:([A-Za-z0-9_]+?)(?::(\d+))?§§/;
  const TABLE_TOKEN_RE = /§§TABLE:([A-Za-z0-9_]+?)§§/;
  const EMU_PER_MM = 36000;
  const EMU_PER_PX_96DPI = 9525;

  // --------------------------------------------------------------------
  // 1. Setup lingkungan Nunjucks (mesin templating gaya Jinja2)
  // --------------------------------------------------------------------
  function buildNunjucksEnv() {
    const env = new nunjucks.Environment(null, {
      autoescape: true,
      trimBlocks: false,
      lstripBlocks: false,
    });

    // Filter 'batch' — identik dengan Jinja2 batch(n, fill_with)
    env.addFilter("batch", function (arr, size, fill) {
      arr = arr || [];
      const out = [];
      for (let i = 0; i < arr.length; i += size) {
        const chunk = arr.slice(i, i + size);
        while (chunk.length < size) {
          chunk.push(fill !== undefined ? fill : null);
        }
        out.push(chunk);
      }
      return out;
    });

    return env;
  }

  // --------------------------------------------------------------------
  // 2. Gabungkan tag {{ }} / {% %} yang terpecah antar elemen <w:t>
  //    (Word sering memecah teks ke beberapa run karena spell-check dsb.)
  // --------------------------------------------------------------------
  function mergeSplitTags(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    const errNode = doc.getElementsByTagName("parsererror")[0];
    if (errNode) {
      throw new Error("Gagal parsing XML template: " + errNode.textContent.slice(0, 300));
    }

    const paragraphs = doc.getElementsByTagName("w:p");
    const tagRegex = /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g;

    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      const tNodes = Array.from(para.getElementsByTagName("w:t"));
      if (tNodes.length < 2) continue;

      let full = "";
      const parts = [];
      for (const node of tNodes) {
        const text = node.textContent || "";
        parts.push({ node, text, start: full.length, end: full.length + text.length });
        full += text;
      }

      const edits = new Map();
      let m;
      tagRegex.lastIndex = 0;
      while ((m = tagRegex.exec(full)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        let idxA = -1;
        let idxB = -1;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].start <= start && start < parts[i].end) idxA = i;
          if (parts[i].start < end && end <= parts[i].end) idxB = i;
        }
        if (idxA === -1 || idxB === -1 || idxA === idxB) continue;

        const prefix = parts[idxA].text.slice(0, start - parts[idxA].start);
        const suffix = parts[idxB].text.slice(end - parts[idxB].start);
        edits.set(parts[idxA].node, prefix + m[0]);
        edits.set(parts[idxB].node, suffix);
        for (let k = idxA + 1; k < idxB; k++) edits.set(parts[k].node, "");
      }
      for (const [node, text] of edits) node.textContent = text;
    }

    return new XMLSerializer().serializeToString(doc);
  }

  // --------------------------------------------------------------------
  // 3. Utilitas: dapatkan ukuran natural gambar (px) dari Blob/File
  // --------------------------------------------------------------------
  function getImageNaturalSize(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  function guessExt(mime) {
    if (mime === "image/jpeg" || mime === "image/jpg") return "jpeg";
    return "png";
  }

  function xmlEscapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --------------------------------------------------------------------
  // 4. Bangun XML <w:drawing> untuk satu gambar inline
  // --------------------------------------------------------------------
  function buildDrawingXml(rId, picId, cx, cy) {
    return (
      '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + picId + '" name="Picture ' + picId + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic><pic:nvPicPr><pic:cNvPr id="' + picId + '" name="Picture ' + picId + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>"
    );
  }

  // --------------------------------------------------------------------
  // 5. Bangun XML tabel Word (<w:tbl>) untuk rekap bahan baku
  // --------------------------------------------------------------------
  function buildBahanBakuTableXml(rows) {
    const borderEdge = '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
      '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
      '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
      '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
      '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
      '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>';

    function cell(text, widthTw, bold) {
      const t = xmlEscapeAttr(text == null ? "" : String(text))
        .replace(/&quot;/g, '"'); // teks body tidak perlu escape kutip
      const run = bold
        ? '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + t + "</w:t></w:r>"
        : '<w:r><w:t xml:space="preserve">' + t + "</w:t></w:r>";
      return (
        '<w:tc><w:tcPr><w:tcW w:w="' + widthTw + '" w:type="dxa"/></w:tcPr>' +
        "<w:p>" + run + "</w:p></w:tc>"
      );
    }

    function row(cells, bold) {
      return "<w:tr>" + cells.map((c, i) => cell(c, [700, 3200, 3200, 1400][i], bold)).join("") + "</w:tr>";
    }

    let xml =
      '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>' +
      "<w:tblBorders>" + borderEdge + "</w:tblBorders></w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="700"/><w:gridCol w:w="3200"/><w:gridCol w:w="3200"/><w:gridCol w:w="1400"/></w:tblGrid>';

    xml += row(["No", "Bahan Baku", "Produsen/Pemasok", "Asal"], true);
    rows.forEach((item, idx) => {
      xml += row([idx + 1, item.nama_bahan || "", item.produsen || "", item.asal || "DN"], false);
    });
    xml += "</w:tbl>";
    return xml;
  }

  // --------------------------------------------------------------------
  // 6. Format tanggal Indonesia (meniru format_tanggal_indo di backend)
  // --------------------------------------------------------------------
  const BULAN_INDO = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  function formatTanggalIndo(tglString) {
    if (!tglString) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tglString));
    if (!m) return tglString;
    const [, y, mo, d] = m;
    return `${parseInt(d, 10)} ${BULAN_INDO[parseInt(mo, 10)]} ${y}`;
  }

  // --------------------------------------------------------------------
  // 7. FUNGSI UTAMA: generate dokumen .docx dari template + context + gambar
  //
  //    context     : object teks biasa (mengikuti nama kolom Project di
  //                  backend lama) — untuk field gambar, isi dengan token
  //                  yang dihasilkan oleh registerImage()/registerImageList()
  //    imageJobs   : Map(token -> { blob, widthMm|null })
  //    tableJobs   : Map(token -> { rows: [...] })  (untuk tabel bahan baku)
  //
  //    Memproses SEMUA bagian XML yang bisa berisi tag Jinja2: bukan cuma
  //    word/document.xml, tapi juga header & footer (mis. logo perusahaan
  //    yang muncul di header setiap halaman).
  // --------------------------------------------------------------------
  const CANDIDATE_PARTS = [
    "word/document.xml",
    "word/header1.xml", "word/header2.xml", "word/header3.xml",
    "word/footer1.xml", "word/footer2.xml", "word/footer3.xml",
    "word/footer4.xml", "word/footer5.xml"
  ];

  async function generateDocx(templateArrayBuffer, context, imageJobs, tableJobs, onProgress) {
    const report = (msg) => onProgress && onProgress(msg);

    report("Membuka template...");
    const zip = await JSZip.loadAsync(templateArrayBuffer);

    const env = buildNunjucksEnv();
    const renderedParts = {}; // partPath -> rendered xml string

    report("Menggabungkan tag & merender teks...");
    for (const partPath of CANDIDATE_PARTS) {
      const partFile = zip.file(partPath);
      if (!partFile) continue;
      let xml = await partFile.async("string");
      xml = mergeSplitTags(xml);
      let rendered;
      try {
        rendered = env.renderString(xml, context);
      } catch (e) {
        throw new Error(`Gagal merender ${partPath} (periksa sintaks tag di file Word): ${e.message}`);
      }

      // ---------------- Sisipkan tabel (mis. rekap bahan baku) ----------------
      if (tableJobs && tableJobs.size > 0) {
        for (const [token, job] of tableJobs) {
          const paraRegex = new RegExp(
            "<w:p\\b[^>]*>(?:(?!</?w:p\\b)[\\s\\S])*?" +
              token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              "(?:(?!</?w:p\\b)[\\s\\S])*?</w:p>",
            ""
          );
          const tableXml = buildBahanBakuTableXml(job.rows);
          rendered = rendered.replace(paraRegex, tableXml);
        }
      }

      renderedParts[partPath] = rendered;
    }

    // ---------------- Sisipkan gambar (per bagian, karena tiap bagian punya file .rels sendiri) ----------------
    report("Menyisipkan gambar...");
    const ctPath = "[Content_Types].xml";
    let ctXml = await zip.file(ctPath).async("string");
    let mediaCounter = 1;
    let picCounter = 1000;

    const runImgRegex = /<w:r\b[^>]*>(?:(?!<\/?w:r\b)[\s\S])*?§§IMG:[A-Za-z0-9_]+?(?::\d+)?§§(?:(?!<\/?w:r\b)[\s\S])*?<\/w:r>/g;

    for (const partPath of Object.keys(renderedParts)) {
      let rendered = renderedParts[partPath];
      if (!rendered.includes("§§IMG:")) continue;

      const partDir = partPath.substring(0, partPath.lastIndexOf("/"));
      const partBase = partPath.substring(partPath.lastIndexOf("/") + 1);
      const relsPath = `${partDir}/_rels/${partBase}.rels`;
      let relsXml;
      const relsFile = zip.file(relsPath);
      if (relsFile) {
        relsXml = await relsFile.async("string");
      } else {
        relsXml =
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
      }
      const usedIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => parseInt(m[1], 10));
      let nextRid = (usedIds.length ? Math.max(...usedIds) : 0) + 1;
      const newRelEntries = [];

      // Kumpulkan semua match beserta posisinya dulu (matchAll), baru bangun ulang
      // string berdasarkan index -- supaya AMAN meski ada 2 run dengan teks
      // yang kebetulan identik (mis. token yang sama dipakai di 2 tempat berbeda
      // seperti foto_produk pada template Kerjasama). Pendekatan lama pakai
      // rendered.replace(stringLiteral, ...) yang cuma mengganti kemunculan
      // PERTAMA -- bisa membuat gambar "tertukar"/salah pasang bila teksnya sama.
      const allMatches = [...rendered.matchAll(runImgRegex)];
      let cursor = 0;
      let out = "";
      for (const m of allMatches) {
        const runXml = m[0];
        const startIdx = m.index;
        out += rendered.slice(cursor, startIdx);
        cursor = startIdx + runXml.length;

        const tokenMatch = IMG_TOKEN_RE.exec(runXml);
        if (!tokenMatch) {
          out += runXml;
          continue;
        }
        const fullToken = tokenMatch[0];
        const job = imageJobs.get(fullToken);

        let replacement = "";
        if (job && job.blob) {
          const ext = guessExt(job.blob.type);
          const mediaName = `image_gen_${mediaCounter++}.${ext}`;
          zip.file(`word/media/${mediaName}`, await blobToArrayBuffer(job.blob));

          const rId = "rIdGen" + nextRid++;
          newRelEntries.push(
            `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${partDir === "word" ? "" : "../"}media/${mediaName}"/>`
          );

          const natural = await getImageNaturalSize(job.blob).catch(() => ({ width: 400, height: 300 }));
          let cx, cy;
          if (job.widthMm) {
            cx = Math.round(job.widthMm * EMU_PER_MM);
            cy = Math.round(cx * (natural.height / natural.width));
          } else {
            cx = Math.round(natural.width * EMU_PER_PX_96DPI);
            cy = Math.round(natural.height * EMU_PER_PX_96DPI);
            const maxCx = 16.5 * 10 * EMU_PER_MM;
            if (cx > maxCx) {
              const ratio = maxCx / cx;
              cx = Math.round(cx * ratio);
              cy = Math.round(cy * ratio);
            }
          }
          picCounter++;
          replacement = buildDrawingXml(rId, picCounter, cx, cy);
        }
        out += replacement ? "<w:r>" + replacement + "</w:r>" : "";
      }
      out += rendered.slice(cursor);
      rendered = out;

      if (newRelEntries.length > 0) {
        relsXml = relsXml.replace("</Relationships>", newRelEntries.join("") + "</Relationships>");
        zip.file(relsPath, relsXml);
      }
      renderedParts[partPath] = rendered;
    }

    // Bersihkan token yang tersisa (mis. gambar kosong / token di luar <w:r> yang terdeteksi)
    for (const partPath of Object.keys(renderedParts)) {
      renderedParts[partPath] = renderedParts[partPath]
        .replace(/§§IMG:[A-Za-z0-9_]+?(?::\d+)?§§/g, "")
        .replace(/§§TABLE:[A-Za-z0-9_]+?§§/g, "");
    }

    // Pastikan Content_Types punya default untuk jpeg juga
    if (!/Extension="jpeg"/.test(ctXml)) {
      ctXml = ctXml.replace(
        "<Default Extension=\"png\"",
        '<Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png"'
      );
      zip.file(ctPath, ctXml);
    }

    for (const [partPath, xml] of Object.entries(renderedParts)) {
      zip.file(partPath, xml);
    }

    report("Menyusun ulang file .docx...");
    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    return blob;
  }

  global.DocxEngine = {
    generateDocx,
    formatTanggalIndo,
  };
})(window);
