const { useState, useEffect } = React;
// Logo dimuat dari folder assets/ (statis, tidak perlu bundler)
const logoKemenperin = 'assets/logo-kemenperin.png';
const logoBBS = 'assets/logo-bbspjppi.png';

// ==========================================
// KOMPONEN HELPER: PRATINJAU DOKUMEN KECIL DENGAN INFO TARGET
// ==========================================
function ImagePreview({ file, targetWidth, uniform }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!file) return;
    
    // Membuat Object URL temporary untuk preview gambar
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    
    // Membersihkan memori saat file diganti atau dihapus
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file) return null;

  // Jika file adalah gambar (PNG/JPG)
  if (file.type.startsWith('image/')) {
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px dashed #ccc',
          borderRadius: '6px',
          width: 'fit-content' // Background menyesuaikan ukuran gambar
        }}>
          <img 
            src={url} 
            alt="Preview Dokumen" 
            style={uniform ? {
              width: '120px', height: '120px',  // KUNCI: kotak persegi seragam, sama seperti hasil akhir
              objectFit: 'contain',              // KUNCI: proporsional, tidak dipotong -- sama seperti disisipkan ke Word
              backgroundColor: '#ffffff',
              display: 'block',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            } : { 
              maxWidth: '120px',    // KUNCI: Lebar maksimal di layar 120px
              maxHeight: '120px',   // KUNCI: Tinggi maksimal di layar 120px (agar cover tidak memanjang)
              objectFit: 'contain', // KUNCI: Menjaga proporsi gambar tidak gepeng
              display: 'block', 
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} 
          />
        </div>
        <span style={{ fontSize: '11px', color: uniform ? '#2e7d32' : '#1565c0', display: 'block', marginTop: '5px', fontWeight: 'bold' }}>
          {uniform ? `📐 Diskalakan proporsional ke kotak seragam — pratinjau ini sesuai hasil akhir` : `↔️ Output Word dikunci: ${targetWidth}`}
        </span>
      </div>
    );
  }

  // Jika file adalah PDF
  if (file.type === 'application/pdf') {
    return (
      <div style={{ 
        maxWidth: '200px', 
        padding: '10px', 
        backgroundColor: '#e3f2fd', 
        border: '1px solid #90caf9', 
        borderRadius: '4px', 
        marginTop: '8px', 
        fontSize: '12px', 
        color: '#0d47a1',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}>
        <span style={{ fontWeight: 'bold' }}>📄 PDF Terdeteksi:</span>
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</span>
        <span style={{ fontSize: '11px', color: '#2e7d32', marginTop: '4px' }}>✓ Target Output Word: <strong>{targetWidth}</strong></span>
      </div>
    );
  }

  return null;
}

// Daftar tetap "Kelompok Barang" (sesuai referensi resmi) -- dropdown,
// supaya tidak ada risiko salah ketik.
const KELOMPOK_BARANG_OPTIONS = [
  'Bahan Penunjang Pertanian',
  'Mesin dan Peralatan Pertanian',
  'Mesin dan Peralatan Pertambangan',
  'Mesin dan Peralatan Migas',
  'Alat Berat, Konstruksi dan Material Handling',
  'Mesin dan Peralatan Pabrik',
  'Bahan Bangunan/Konstruksi',
  'Logam dan Barang Logam',
  'Bahan Kimia dan Barang Kimia',
  'Peralatan Elektronika',
  'Peralatan Kelistrikan',
  'Peralatan Telekomunikasi',
  'Alat Transport',
  'Bahan dan Peralatan Kesehatan',
  'Komputer dan Peralatan Kantor',
  'Pakaian dan Perlengkapan Kerja',
  'Peralatan Olahraga dan Pendidikan',
  'Sarana Pertahanan',
  'Barang Lainnya',
];

// ==========================================
// KONVERSI ANGKA -> TERBILANG (Bahasa Indonesia)
// ==========================================
function angkaKeTeks(n) {
  n = Math.floor(Math.abs(n));
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return satuan[n];
  if (n < 20) return angkaKeTeks(n - 10) + ' belas';
  if (n < 100) return (angkaKeTeks(Math.floor(n / 10)) + ' puluh' + (n % 10 !== 0 ? ' ' + angkaKeTeks(n % 10) : '')).trim();
  if (n < 200) return ('seratus' + (n % 100 !== 0 ? ' ' + angkaKeTeks(n % 100) : '')).trim();
  if (n < 1000) return (angkaKeTeks(Math.floor(n / 100)) + ' ratus' + (n % 100 !== 0 ? ' ' + angkaKeTeks(n % 100) : '')).trim();
  if (n < 2000) return ('seribu' + (n % 1000 !== 0 ? ' ' + angkaKeTeks(n % 1000) : '')).trim();
  if (n < 1000000) return (angkaKeTeks(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + angkaKeTeks(n % 1000) : '')).trim();
  if (n < 1000000000) return (angkaKeTeks(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + angkaKeTeks(n % 1000000) : '')).trim();
  return String(n);
}

// Ubah nilai persentase (mis. "42.74" atau "42,74") jadi terbilang lengkap
// dengan kata "persen" di akhir, mis: "empat puluh dua koma tujuh puluh empat persen"
const DIGIT_KATA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

function nilaiKeTerbilangPersen(nilaiInput) {
  if (nilaiInput === null || nilaiInput === undefined) return '';
  const cleaned = String(nilaiInput).trim().replace('%', '').replace(',', '.');
  if (cleaned === '') return '';
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';

  const parts = cleaned.split('.');
  const intPart = parseInt(parts[0], 10) || 0;
  let hasil = intPart === 0 ? 'nol' : angkaKeTeks(intPart);

  if (parts.length > 1 && parts[1] !== '' && parseInt(parts[1], 10) !== 0) {
    // Desimal dibaca PER DIGIT (bukan sebagai angka puluhan), sesuai konvensi
    // baku penulisan terbilang persentase -- mis. ",74" -> "tujuh empat"
    // (bukan "tujuh puluh empat").
    const decWords = parts[1].split('').map((d) => DIGIT_KATA[parseInt(d, 10)] || 'nol').join(' ');
    hasil += ' koma ' + decWords;
  }
  return hasil + ' persen';
}

function ReuseButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'block', margin: '-8px 0 15px 0', padding: '8px 12px',
      backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px dashed #66bb6a',
      borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '12px', fontWeight: 'bold'
    }}>
      📋 {label}
    </button>
  );
}

function GDriveButton({ mimeTypes, onFile, compact }) {
  const [busy, setBusy] = useState(false);
  const handleClick = async () => {
    setBusy(true);
    try {
      const file = await GDrivePicker.pickFileFromDrive(mimeTypes);
      if (file) onFile(file);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={handleClick} disabled={busy} title="Pilih file dari Google Drive" style={{
      padding: compact ? '6px 8px' : '8px 12px',
      fontSize: '12px', fontWeight: 'bold',
      backgroundColor: '#e8f0fe', color: '#1a73e8',
      border: '1px solid #aecbfa', borderRadius: '4px',
      cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
      alignSelf: compact ? 'center' : undefined,
      marginTop: compact ? '6px' : 0,
    }}>
      {busy ? '⏳' : '📁 Drive'}
    </button>
  );
}

const MIME_GAMBAR = ['image/png', 'image/jpeg'];
const MIME_DOKUMEN = ['image/png', 'image/jpeg', 'application/pdf'];
const MIME_FORMULIR = ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

function App() {
  const [activeTab, setActiveTab] = useState(1) // Buka Menu 1
  const [status, setStatus] = useState('')

  // ==========================================
  // STATE MENU 1: DATA AWAL, COVER & LOGO
  // ==========================================
  const [jenisLhv, setJenisLhv] = useState('Produksi Sendiri') 
  const [namaPerusahaan, setNamaPerusahaan] = useState('')
  const [tanggalLhv, setTanggalLhv] = useState('') 
  const [fileCover, setFileCover] = useState(null)
  const [coverMode, setCoverMode] = useState('auto') // 'auto' | 'upload'
  const [coverColor, setCoverColor] = useState('#8e3d9c')
  const [kbliDeskripsi, setKbliDeskripsi] = useState('')
  const [namaLembagaCover, setNamaLembagaCover] = useState('LVI BSKJI - Balai Besar Standardisasi dan Pelayanan Jasa Pencegahan Pencemaran Industri')
  const [fileFotoCover, setFileFotoCover] = useState(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('')
  const [coverPreviewLoading, setCoverPreviewLoading] = useState(false)
  const [fileLogo, setFileLogo] = useState(null)
  const [fileFotoBarang, setFileFotoBarang] = useState(null)
  const [fileFotoProdukUtama, setFileFotoProdukUtama] = useState(null)

  // ==========================================
  // STATE MENU 2: RINGKASAN EKSEKUTIF
  // ==========================================
  const [idBerkas, setIdBerkas] = useState('')
  const [permenperin, setPermenperin] = useState('Permenperin No. 35 Tahun 2025 tentang Ketentuan dan Tata Cara Sertifikasi Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan')
  const [alamatKantor, setAlamatKantor] = useState('')
  const [alamatPabrik, setAlamatPabrik] = useState('')
  const [skalaPerusahaan, setSkalaPerusahaan] = useState('Menengah')
  const [noIzin, setNoIzin] = useState('')
  
  // -- STATE SKEMA KERJASAMA --
  const [namaPerusahaanIndustri, setNamaPerusahaanIndustri] = useState('')
  const [alamatPerusahaanIndustri, setAlamatPerusahaanIndustri] = useState('')
  const [skalaPerusahaanIndustri, setSkalaPerusahaanIndustri] = useState('Menengah')
  const [noIzinPerusahaanIndustri, setNoIzinPerusahaanIndustri] = useState('')

  // -- STATE SKEMA BMP --
  const [nilaiBmp, setNilaiBmp] = useState('')
  const [terbilangBmp, setTerbilangBmp] = useState('')
  const [aspekBmp, setAspekBmp] = useState([
    { id: 1, teks: 'Legalitas dan operasional perusahaan', checked: true },
    { id: 2, teks: 'Penyerapan dan penggunaan tenaga kerja dalam negeri', checked: false },
    { id: 3, teks: 'Penambahan investasi baru', checked: false },
    { id: 4, teks: 'Kontribusi terhadap rantai pasok industri dalam negeri', checked: false },
    { id: 5, teks: 'Industri pionir atau substitusi impor', checked: false },
    { id: 6, teks: 'Penggunaan mesin dan peralatan', checked: false },
    { id: 7, teks: 'Lokasi produksi', checked: false },
    { id: 8, teks: 'Penerapan industri 4.0', checked: false },
    { id: 9, teks: 'Pengembangan sumber daya manusia industri', checked: false },
    { id: 10, teks: 'Kepemilikan merek dalam negeri', checked: false },
    { id: 11, teks: 'Penerapan industri hijau', checked: false },
    { id: 12, teks: 'Nilai ekspor', checked: false },
    { id: 13, teks: 'Kepemilikan dokumen sertifikat/akreditasi', checked: false },
    { id: 14, teks: 'Penerapan Environmental, Social, and Governance (ESG)', checked: false },
    { id: 15, teks: 'Penghargaan', checked: false },
    { id: 16, teks: 'Kepatuhan pelaporan data industri di Sistem Industri Nasional (SIINas)', checked: false }
  ])

  const [tglVerifikasiDok, setTglVerifikasiDok] = useState('')
  const [tglVerifikasiLapangan, setTglVerifikasiLapangan] = useState('')
  const [kbli, setKbli] = useState('')
  const [kapasitasProduksi, setKapasitasProduksi] = useState('')
  const [jenisBarang, setJenisBarang] = useState('')
  const [tipeBarang, setTipeBarang] = useState('')
  const [spesifikasiBarang, setSpesifikasiBarang] = useState('')
  const [kodeHs, setKodeHs] = useState('')
  const [merekBarang, setMerekBarang] = useState('')
  const [kelompokBarang, setKelompokBarang] = useState('')
  const [nilaiTkdn, setNilaiTkdn] = useState('')
  const [terbilangTkdn, setTerbilangTkdn] = useState('')
  const [nilaiBrainware, setNilaiBrainware] = useState('')
  const [terbilangBrainware, setTerbilangBrainware] = useState('')

  // --- PENGESAHAN LAPORAN ---
  const [namaVerifikator, setNamaVerifikator] = useState('')
  const [nipVerifikator, setNipVerifikator] = useState('')
  const [fileTtdVerifikator, setFileTtdVerifikator] = useState(null)
  const [pejabatMengetahui, setPejabatMengetahui] = useState('')
  const [namaPejabat, setNamaPejabat] = useState('') 
  const [nipPejabat, setNipPejabat] = useState('')

  // --- ACUAN PERATURAN ---
  const [acuanPeraturan, setAcuanPeraturan] = useState([
    { id: 1, type: 'fixed', aturan: 'Peraturan Presiden Nomor 12 Tahun 2021 tentang Perubahan atas Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah' },
    { id: 2, type: 'dropdown', aturan: 'Permenperin No. 35 Tahun 2025 tentang Ketentuan dan Tata Cara Sertifikasi Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan', options: [
      'Permenperin No. 35 Tahun 2025 tentang Ketentuan dan Tata Cara Sertifikasi Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan',
      'Permenperin No. 31 Tahun 2022 tentang Ketentuan dan Tata Cara Penghitungan Nilai Tingkat Komponen Dalam Negeri Alat Kesehatan dan Alat Kesehatan Diagnostik In Vitro',
      'Permenperin No. 22 Tahun 2020 tentang Ketentuan dan Tata Cara Penghitungan Nilai Tingkat Komponen Dalam Negeri Produk Elektronika dan Telematika'
    ]},
    { id: 3, type: 'fixed', aturan: 'Keputusan Menteri Perindustrian Republik Indonesia Nomor 4058 Tahun 2023 tentang Penunjukan Lembaga Verifikasi Independen Pelaksana Penghitungan dan Verifikasi Besaran Nilai TKDN dan BMP' },
    { id: 4, type: 'fixed', aturan: 'Peraturan Sekretaris Jenderal Kementerian Perindustrian Nomor 5 Tahun 2025 tentang Petunjuk Teknis Penghitungan Nilai TKDN Barang dan Jasa Industri' },
    { id: 5, type: 'fixed', aturan: 'Keputusan Kepala Badan Standardisasi dan Kebijakan Jasa Industri Tahun 2026 tentang Pedoman Penyelenggaraan Layanan Penghitungan dan Verifikasi Nilai Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan di Lingkungan Badan Standardisasi dan Kebijakan Jasa Industri' },
    { id: 6, type: 'dropdown', aturan: 'Peraturan Direktur Jenderal Industri Logam, Mesin, Alat Transportasi dan Elektronika Nomor 6 Tahun 2025 tentang Rincian Komponen Utama Barang Sektor Industri Logam, Mesin, Alat Transportasi dan Elektronika untuk Penghitungan Nilai Tingkat Komponen Dalam Negeri', options: [
      'Peraturan Direktur Jenderal Industri Logam, Mesin, Alat Transportasi dan Elektronika Kementerian Perindustrian Nomor 3 Tahun 2026 tentang Perubahan Kedua atas Peraturan Direktur Jenderal Industri Logam, Mesin, Alat Transportasi dan Elektronika Nomor 6 Tahun 2025 tentang Rincian Komponen Utama Barang Sektor Industri Logam, Mesin, Alat Transportasi dan Elektronika untuk Penghitungan Nilai Tingkat Komponen Dalam Negeri',
      'Peraturan Direktur Jenderal Industri Kecil, Menengah, dan Aneka Nomor 113 Tahun 2026 tentang Perubahan atas Peraturan Direktur Jenderal Industri Kecil, Menengah, dan Aneka Nomor 263 Tahun 2025 tentang Rincian Komponen Utama Barang Sektor Industri Kecil, Menengah, dan Aneka untuk Penghitungan TKDN',
      'Peraturan Direktur Jenderal Industri Kimia, Farmasi dan Tekstil Nomor 8 Tahun 2026 tentang Perubahan atas Peraturan Direktur Jenderal Industri Kimia, Farmasi dan Tekstil Nomor 1 Tahun 2025 tentang Rincian Komponen Utama Barang Sektor Industri Kimia, Farmasi dan Tekstil untuk Penghitungan Nilai TKDN',
      'Peraturan Direktur Jenderal Industri Agro Nomor 2 Tahun 2026 tentang Perubahan atas Peraturan Direktur Jenderal Industri Agro Nomor 1 Tahun 2025 tentang Rincian Komponen Utama Barang Sektor Agro untuk Penghitungan Nilai TKDN'
    ]}
  ])

  // ==========================================
  // STATE MENU 3: HASIL VERIFIKASI (DINAMIS)
  // ==========================================
  const [formulirVerifikasi, setFormulirVerifikasi] = useState([])
  const [modeFormulir, setModeFormulir] = useState('perItem') // 'perItem' | 'gabungan'
  const [fileFormulirGabungan, setFileFormulirGabungan] = useState(null)

  // ==========================================
  // STATE MENU 4: DOKUMEN PENDUKUNG
  // ==========================================
  const [teleponKantor, setTeleponKantor] = useState(''); const [faxKantor, setFaxKantor] = useState(''); const [emailKantor, setEmailKantor] = useState(''); const [websiteKantor, setWebsiteKantor] = useState(''); const [statusKantor, setStatusKantor] = useState('PMDN'); const [picKantor, setPicKantor] = useState(''); const [aktaKantor, setAktaKantor] = useState(''); const [npwpKantor, setNpwpKantor] = useState('')
  const [teleponPabrik, setTeleponPabrik] = useState(''); const [faxPabrik, setFaxPabrik] = useState(''); const [emailPabrik, setEmailPabrik] = useState(''); const [websitePabrik, setWebsitePabrik] = useState(''); const [statusPabrik, setStatusPabrik] = useState('PMDN'); const [picPabrik, setPicPabrik] = useState(''); const [aktaPabrik, setAktaPabrik] = useState(''); const [npwpPabrik, setNpwpPabrik] = useState('')
  
  const [teleponKantorIndustri, setTeleponKantorIndustri] = useState(''); const [faxKantorIndustri, setFaxKantorIndustri] = useState(''); const [emailKantorIndustri, setEmailKantorIndustri] = useState(''); const [websiteKantorIndustri, setWebsiteKantorIndustri] = useState(''); const [statusKantorIndustri, setStatusKantorIndustri] = useState('PMDN'); const [picKantorIndustri, setPicKantorIndustri] = useState(''); const [aktaKantorIndustri, setAktaKantorIndustri] = useState(''); const [npwpKantorIndustri, setNpwpKantorIndustri] = useState('')

  // SINKRONISASI PABRIK DAN KANTOR
  const [samaDenganKantor, setSamaDenganKantor] = useState(false);

  useEffect(() => {
    if (samaDenganKantor) {
      setStatusPabrik(statusKantor);
      setAlamatPabrik(alamatKantor);
      setTeleponPabrik(teleponKantor);
      setFaxPabrik(faxKantor);
      setEmailPabrik(emailKantor);
      setWebsitePabrik(websiteKantor);
      setPicPabrik(picKantor);
      setAktaPabrik(aktaKantor);
      setNpwpPabrik(npwpKantor);
    }
  }, [samaDenganKantor, statusKantor, alamatKantor, teleponKantor, faxKantor, emailKantor, websiteKantor, picKantor, aktaKantor, npwpKantor]);

  const [fileStruktur, setFileStruktur] = useState(null)
  const [fileAlurProduksi, setFileAlurProduksi] = useState(null)
  const [fileStrukturIndustri, setFileStrukturIndustri] = useState(null) 
  
  const [fileBuktiPabrik, setFileBuktiPabrik] = useState([{ id: 1, file: null, keterangan: '' }])
  const [fileBom, setFileBom] = useState([{ id: 2, file: null, keterangan: '' }])
  const [fileSertifikatTkdn, setFileSertifikatTkdn] = useState([{ id: 3, file: null, keterangan: '' }])
  const [fileBuktiBeli, setFileBuktiBeli] = useState([{ id: 4, file: null, keterangan: '' }])
  const [fileKtp, setFileKtp] = useState([{ id: 5, file: null, keterangan: '' }])
  const [fileBuktiKerjasama, setFileBuktiKerjasama] = useState([{ id: 6, file: null, keterangan: 'Bukti Kerjasama' }]) 

  const [fileTenagaKerjaBmp, setFileTenagaKerjaBmp] = useState([{ id: 401, file: null, keterangan: 'Bukti Penyerapan Tenaga Kerja' }])
  const [fileInvestasiBmp, setFileInvestasiBmp] = useState([{ id: 402, file: null, keterangan: 'Bukti Penambahan Investasi Baru' }])
  const [fileKemitraanBmp, setFileKemitraanBmp] = useState([{ id: 403, file: null, keterangan: 'Bukti Kemitraan Rantai Pasok' }])
  const [fileSubstitusiBmp, setFileSubstitusiBmp] = useState([{ id: 404, file: null, keterangan: 'Bukti Industri Pionir / Substitusi Impor' }])
  const [fileMesinDnBmp, setFileMesinDnBmp] = useState([{ id: 405, file: null, keterangan: 'Bukti Mesin Peralatan DN' }])
  const [fileLokasiBmp, setFileLokasiBmp] = useState([{ id: 406, file: null, keterangan: 'Bukti Lokasi Produksi' }])
  const [fileI40Bmp, setFileI40Bmp] = useState([{ id: 407, file: null, keterangan: 'Bukti Penerapan Industri 4.0' }])
  const [fileSdmBmp, setFileSdmBmp] = useState([{ id: 408, file: null, keterangan: 'Bukti Pengembangan SDM Industri' }])
  const [fileSertifikatBmp, setFileSertifikatBmp] = useState([{ id: 409, file: null, keterangan: 'Bukti Kepemilikan Sertifikat/Akreditasi' }])
  const [fileHijauBmp, setFileHijauBmp] = useState([{ id: 410, file: null, keterangan: 'Bukti Penerapan Industri Hijau' }])
  const [fileEksporBmp, setFileEksporBmp] = useState([{ id: 411, file: null, keterangan: 'Bukti Nilai Ekspor' }])
  const [fileMerekDnBmp, setFileMerekDnBmp] = useState([{ id: 412, file: null, keterangan: 'Bukti Kepemilikan Merek DN' }])
  const [fileEsgBmp, setFileEsgBmp] = useState([{ id: 413, file: null, keterangan: 'Bukti Penerapan ESG' }])
  const [fileAwardsBmp, setFileAwardsBmp] = useState([{ id: 414, file: null, keterangan: 'Bukti Penghargaan / Awards' }])
  const [fileSiinasBmp, setFileSiinasBmp] = useState([{ id: 415, file: null, keterangan: 'Bukti Kepatuhan SIINas' }])

  // ==========================================
  // STATE MENU 5: LAMPIRAN
  // ==========================================
  const [fileNibRba, setFileNibRba] = useState([{ id: 101, file: null, keterangan: 'NIB RBA' }])
  const [fileSertifikatStandar, setFileSertifikatStandar] = useState([{ id: 102, file: null, keterangan: 'Sertifikat Standar' }])
  const [fileIzinUsaha, setFileIzinUsaha] = useState([{ id: 103, file: null, keterangan: 'Izin Usaha' }])
  const [fileNpwpLampiran, setFileNpwpLampiran] = useState([{ id: 104, file: null, keterangan: 'NPWP' }])
  const [fileSertifikatMerek, setFileSertifikatMerek] = useState([{ id: 105, file: null, keterangan: 'Sertifikat Merek' }])
  const [fileSertifikatProduk, setFileSertifikatProduk] = useState([{ id: 106, file: null, keterangan: 'Sertifikat Produk' }])
  const [fileNie, setFileNie] = useState([{ id: 107, file: null, keterangan: 'NIE' }])
  const [fileBpom, setFileBpom] = useState([{ id: 108, file: null, keterangan: 'BPOM' }])
  
  const [fileFotoProduk, setFileFotoProduk] = useState([{ id: 109, file: null, keterangan: 'Foto Produk' }])
  const [fileFotoBahanBaku, setFileFotoBahanBaku] = useState([{ id: 110, file: null, keterangan: 'Foto Bahan Baku' }])
  const [fileInvoiceBahanBaku, setFileInvoiceBahanBaku] = useState([{ id: 111, file: null, keterangan: 'Invoice Bahan Baku' }])
  const [fileAlurProsesLampiran, setFileAlurProsesLampiran] = useState([{ id: 112, file: null, keterangan: 'Alur Proses Produksi' }])
  
  const [fileDaftarGaji, setFileDaftarGaji] = useState([{ id: 113, file: null, keterangan: 'Daftar Gaji' }])
  const [fileSampelKtp, setFileSampelKtp] = useState([{ id: 114, file: null, keterangan: 'KTP Karyawan' }])
  const [fileStrukturPabrik, setFileStrukturPabrik] = useState([{ id: 115, file: null, keterangan: 'Struktur Pabrik' }])
  const [fileFotoMesin, setFileFotoMesin] = useState([{ id: 116, file: null, keterangan: 'Foto Mesin' }])
  const [fileDaftarPenyusutan, setFileDaftarPenyusutan] = useState([{ id: 117, file: null, keterangan: 'Daftar Penyusutan' }])
  const [fileBuktiListrik, setFileBuktiListrik] = useState([{ id: 118, file: null, keterangan: 'Bukti Pembayaran Listrik' }])
  const [fileAktaSewa, setFileAktaSewa] = useState([{ id: 119, file: null, keterangan: 'Akta Sewa Tempat' }])
  
  const [fileGeotagging, setFileGeotagging] = useState([{ id: 120, file: null, keterangan: 'Dokumen Kunjungan (Geotagging)' }])
  const [rekapBahanBaku, setRekapBahanBaku] = useState([{ id: 1, nama_bahan: '', produsen: '', asal: 'DN' }])
  const [modeRekapBahanBaku, setModeRekapBahanBaku] = useState('tabel') // 'tabel' | 'upload'
  const [fileRekapBahanBaku, setFileRekapBahanBaku] = useState(null)

  // ==========================================
  // ==========================================
  // FITUR SIMPAN OTOMATIS (AUTO-SAVE) KE INDEXEDDB
  // Menyimpan SEMUA isian form -- termasuk foto & dokumen yang sudah
  // diupload -- supaya kalau tab browser tertutup/refresh tidak sengaja,
  // pekerjaan verifikator tidak hilang. (localStorage lama tidak dipakai
  // lagi di sini karena tidak bisa menyimpan file.)
  // ==========================================
  const allSetters = {
    jenisLhv: setJenisLhv,
    coverMode: setCoverMode,
    coverColor: setCoverColor,
    kbliDeskripsi: setKbliDeskripsi,
    namaLembagaCover: setNamaLembagaCover,
    fileFotoCover: setFileFotoCover,
    namaPerusahaan: setNamaPerusahaan,
    tanggalLhv: setTanggalLhv,
    fileCover: setFileCover,
    fileLogo: setFileLogo,
    fileFotoBarang: setFileFotoBarang,
    fileFotoProdukUtama: setFileFotoProdukUtama,
    idBerkas: setIdBerkas,
    permenperin: setPermenperin,
    alamatKantor: setAlamatKantor,
    alamatPabrik: setAlamatPabrik,
    skalaPerusahaan: setSkalaPerusahaan,
    noIzin: setNoIzin,
    namaPerusahaanIndustri: setNamaPerusahaanIndustri,
    alamatPerusahaanIndustri: setAlamatPerusahaanIndustri,
    skalaPerusahaanIndustri: setSkalaPerusahaanIndustri,
    noIzinPerusahaanIndustri: setNoIzinPerusahaanIndustri,
    nilaiBmp: setNilaiBmp,
    terbilangBmp: setTerbilangBmp,
    aspekBmp: setAspekBmp,
    tglVerifikasiDok: setTglVerifikasiDok,
    tglVerifikasiLapangan: setTglVerifikasiLapangan,
    kbli: setKbli,
    kapasitasProduksi: setKapasitasProduksi,
    jenisBarang: setJenisBarang,
    tipeBarang: setTipeBarang,
    spesifikasiBarang: setSpesifikasiBarang,
    kodeHs: setKodeHs,
    merekBarang: setMerekBarang,
    kelompokBarang: setKelompokBarang,
    nilaiTkdn: setNilaiTkdn,
    terbilangTkdn: setTerbilangTkdn,
    nilaiBrainware: setNilaiBrainware,
    terbilangBrainware: setTerbilangBrainware,
    namaVerifikator: setNamaVerifikator,
    nipVerifikator: setNipVerifikator,
    fileTtdVerifikator: setFileTtdVerifikator,
    pejabatMengetahui: setPejabatMengetahui,
    namaPejabat: setNamaPejabat,
    nipPejabat: setNipPejabat,
    acuanPeraturan: setAcuanPeraturan,
    formulirVerifikasi: setFormulirVerifikasi,
    modeFormulir: setModeFormulir,
    fileFormulirGabungan: setFileFormulirGabungan,
    teleponKantor: setTeleponKantor,
    faxKantor: setFaxKantor,
    emailKantor: setEmailKantor,
    websiteKantor: setWebsiteKantor,
    statusKantor: setStatusKantor,
    picKantor: setPicKantor,
    aktaKantor: setAktaKantor,
    npwpKantor: setNpwpKantor,
    teleponPabrik: setTeleponPabrik,
    faxPabrik: setFaxPabrik,
    emailPabrik: setEmailPabrik,
    websitePabrik: setWebsitePabrik,
    statusPabrik: setStatusPabrik,
    picPabrik: setPicPabrik,
    aktaPabrik: setAktaPabrik,
    npwpPabrik: setNpwpPabrik,
    teleponKantorIndustri: setTeleponKantorIndustri,
    faxKantorIndustri: setFaxKantorIndustri,
    emailKantorIndustri: setEmailKantorIndustri,
    websiteKantorIndustri: setWebsiteKantorIndustri,
    statusKantorIndustri: setStatusKantorIndustri,
    picKantorIndustri: setPicKantorIndustri,
    aktaKantorIndustri: setAktaKantorIndustri,
    npwpKantorIndustri: setNpwpKantorIndustri,
    samaDenganKantor: setSamaDenganKantor,
    fileStruktur: setFileStruktur,
    fileAlurProduksi: setFileAlurProduksi,
    fileStrukturIndustri: setFileStrukturIndustri,
    fileBuktiPabrik: setFileBuktiPabrik,
    fileBom: setFileBom,
    fileSertifikatTkdn: setFileSertifikatTkdn,
    fileBuktiBeli: setFileBuktiBeli,
    fileKtp: setFileKtp,
    fileBuktiKerjasama: setFileBuktiKerjasama,
    fileTenagaKerjaBmp: setFileTenagaKerjaBmp,
    fileInvestasiBmp: setFileInvestasiBmp,
    fileKemitraanBmp: setFileKemitraanBmp,
    fileSubstitusiBmp: setFileSubstitusiBmp,
    fileMesinDnBmp: setFileMesinDnBmp,
    fileLokasiBmp: setFileLokasiBmp,
    fileI40Bmp: setFileI40Bmp,
    fileSdmBmp: setFileSdmBmp,
    fileSertifikatBmp: setFileSertifikatBmp,
    fileHijauBmp: setFileHijauBmp,
    fileEksporBmp: setFileEksporBmp,
    fileMerekDnBmp: setFileMerekDnBmp,
    fileEsgBmp: setFileEsgBmp,
    fileAwardsBmp: setFileAwardsBmp,
    fileSiinasBmp: setFileSiinasBmp,
    fileNibRba: setFileNibRba,
    fileSertifikatStandar: setFileSertifikatStandar,
    fileIzinUsaha: setFileIzinUsaha,
    fileNpwpLampiran: setFileNpwpLampiran,
    fileSertifikatMerek: setFileSertifikatMerek,
    fileSertifikatProduk: setFileSertifikatProduk,
    fileNie: setFileNie,
    fileBpom: setFileBpom,
    fileFotoProduk: setFileFotoProduk,
    fileFotoBahanBaku: setFileFotoBahanBaku,
    fileInvoiceBahanBaku: setFileInvoiceBahanBaku,
    fileAlurProsesLampiran: setFileAlurProsesLampiran,
    fileDaftarGaji: setFileDaftarGaji,
    fileSampelKtp: setFileSampelKtp,
    fileStrukturPabrik: setFileStrukturPabrik,
    fileFotoMesin: setFileFotoMesin,
    fileDaftarPenyusutan: setFileDaftarPenyusutan,
    fileBuktiListrik: setFileBuktiListrik,
    fileAktaSewa: setFileAktaSewa,
    fileGeotagging: setFileGeotagging,
    rekapBahanBaku: setRekapBahanBaku,
    modeRekapBahanBaku: setModeRekapBahanBaku,
    fileRekapBahanBaku: setFileRekapBahanBaku,
  };

  const buildFullState = () => ({
    jenisLhv, namaPerusahaan, tanggalLhv, idBerkas, permenperin,
    coverMode, coverColor, kbliDeskripsi, namaLembagaCover, fileFotoCover,
    skalaPerusahaan, noIzin,
    namaPerusahaanIndustri, alamatPerusahaanIndustri, skalaPerusahaanIndustri,
    noIzinPerusahaanIndustri, teleponKantorIndustri, faxKantorIndustri,
    emailKantorIndustri, websiteKantorIndustri, statusKantorIndustri,
    picKantorIndustri, aktaKantorIndustri, npwpKantorIndustri,
    nilaiBmp, terbilangBmp, aspekBmp,
    tglVerifikasiDok, tglVerifikasiLapangan, kbli, kapasitasProduksi,
    jenisBarang, tipeBarang, spesifikasiBarang, kodeHs, merekBarang,
    kelompokBarang, nilaiTkdn, terbilangTkdn, nilaiBrainware, terbilangBrainware,
    namaVerifikator, nipVerifikator, pejabatMengetahui, namaPejabat, nipPejabat,
    alamatKantor, teleponKantor, faxKantor, emailKantor, websiteKantor,
    statusKantor, picKantor, aktaKantor, npwpKantor,
    alamatPabrik, teleponPabrik, faxPabrik, emailPabrik, websitePabrik,
    statusPabrik, picPabrik, aktaPabrik, npwpPabrik,
    rekapBahanBaku, modeRekapBahanBaku, fileRekapBahanBaku, acuanPeraturan, samaDenganKantor,
    fileCover, fileLogo, fileTtdVerifikator, fileStruktur, fileAlurProduksi,
    fileFotoBarang, fileFotoProdukUtama,
    fileStrukturIndustri,
    formulirVerifikasi: modeFormulir === 'gabungan'
      ? [{ id: 1, judul: 'Formulir Verifikasi (Dokumen Gabungan)', file: fileFormulirGabungan }]
      : formulirVerifikasi,
    fileBuktiPabrik, fileBom, fileSertifikatTkdn, fileBuktiBeli, fileKtp,
    fileBuktiKerjasama,
    fileTenagaKerjaBmp, fileInvestasiBmp, fileKemitraanBmp, fileSubstitusiBmp,
    fileMesinDnBmp, fileLokasiBmp, fileI40Bmp, fileSdmBmp, fileSertifikatBmp,
    fileHijauBmp, fileEksporBmp, fileMerekDnBmp, fileEsgBmp, fileAwardsBmp,
    fileSiinasBmp,
    fileNibRba, fileSertifikatStandar, fileIzinUsaha, fileNpwpLampiran,
    fileSertifikatMerek, fileSertifikatProduk, fileNie, fileBpom,
    fileFotoProduk, fileFotoBahanBaku, fileInvoiceBahanBaku,
    fileAlurProsesLampiran, fileDaftarGaji, fileSampelKtp, fileStrukturPabrik,
    fileFotoMesin, fileDaftarPenyusutan, fileBuktiListrik, fileAktaSewa,
    fileGeotagging
  });

  // Ref selalu menunjuk ke state TERBARU, dipakai oleh autosave berkala
  // supaya tidak perlu daftar dependency yang sangat panjang di useEffect.
  const latestStateRef = React.useRef(null);
  latestStateRef.current = buildFullState();

  const [draftInfo, setDraftInfo] = useState(null); // { savedAt } | null
  const draftSavingRef = React.useRef(false);

  const saveDraft = async () => {
    if (window.isResetting) return;
    if (draftSavingRef.current) return; // hindari tumpang tindih simpanan
    draftSavingRef.current = true;
    try {
      await LHVLogic.dbSaveDraft(latestStateRef.current);
      setDraftInfo({ savedAt: Date.now() });
    } catch (e) {
      console.warn('Gagal auto-save draft:', e);
    } finally {
      draftSavingRef.current = false;
    }
  };

  const hapusDraft = () => {
    if (window.confirm("Yakin ingin mulai laporan baru? Semua isian & foto yang sudah diupload di sesi ini akan dihapus.")) {
      window.isResetting = true;
      LHVLogic.dbClearDraft().finally(() => {
        window.location.replace(window.location.pathname);
      });
    }
  };

  const generateDefaultForms = (aturan) => {
    let jumlah = aturan.includes('31 Tahun 2022') ? 15 : aturan.includes('22 Tahun 2020') ? 12 : 4;
    setFormulirVerifikasi(Array.from({ length: jumlah }, (_, i) => ({ id: Date.now() + i, judul: `Formulir 1.${i + 1}`, file: null })));
  }

  // Muat draft (kalau ada) saat aplikasi pertama dibuka
  useEffect(() => {
    let loadedPermenperin = permenperin;
    (async () => {
      try {
        const rec = await LHVLogic.dbLoadDraft();
        if (rec && rec.state) {
          const d = rec.state;
          Object.keys(allSetters).forEach((key) => {
            if (d[key] !== undefined && d[key] !== null) allSetters[key](d[key]);
          });
          if (d.permenperin) loadedPermenperin = d.permenperin;
          setDraftInfo({ savedAt: rec.savedAt });
        }
      } catch (e) {
        console.warn('Gagal memuat draft tersimpan:', e);
      }
      generateDefaultForms(loadedPermenperin);
    })();

    // Simpan berkala setiap 20 detik (jaring pengaman selain saat pindah tab/klik keluar field)
    const intervalId = setInterval(saveDraft, 20000);
    // Simpan sebisa mungkin saat tab/browser ditutup
    const beforeUnloadHandler = () => { saveDraft(); };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, []);

  const handlePermenperinChange = (e) => {
    const val = e.target.value;
    setPermenperin(val);
    generateDefaultForms(val); 
    setAcuanPeraturan(prev => prev.map(item => item.id === 2 ? { ...item, aturan: val } : item));
  }

  const handlePejabatChange = (e) => {
    const jabatan = e.target.value;
    setPejabatMengetahui(jabatan);
    if (jabatan === 'Kepala BBSPJPPI') {
      setNamaPejabat('Sofyari Rahman'); setNipPejabat('198403252009111001');   
    } else if (jabatan === 'Plh. Kepala BBSPJPPI') {
      setNamaPejabat('Tri Ligayanti'); setNipPejabat('197908052003122002');      
    } else {
      setNamaPejabat(''); setNipPejabat('');
    }
  };

  const addDynamic = (state, setState) => setState([...state, { id: Date.now(), file: null, keterangan: '' }]);
  const removeDynamic = (state, setState, id) => setState(state.filter(item => item.id !== id));
  const updateDynamic = (state, setState, id, field, value) => setState(state.map(item => item.id === id ? { ...item, [field]: value } : item));

  const addRekap = () => setRekapBahanBaku([...rekapBahanBaku, { id: Date.now(), nama_bahan: '', produsen: '', asal: 'DN' }]);
  const removeRekap = (id) => setRekapBahanBaku(rekapBahanBaku.filter(item => item.id !== id));
  const updateRekap = (id, field, val) => setRekapBahanBaku(rekapBahanBaku.map(item => item.id === id ? { ...item, [field]: val } : item));

  // ==========================================
  // SALIN FILE DARI FIELD LAIN (tidak perlu upload ulang dokumen yang sama)
  // ==========================================
  const salinFileTunggal = (sourceFile, setTargetList, sourceLabel) => {
    if (!sourceFile) { alert(`Belum ada file "${sourceLabel}" yang diupload sebelumnya untuk disalin.`); return; }
    setTargetList((prev) => [{ id: Date.now(), file: sourceFile, keterangan: prev[0]?.keterangan || sourceLabel }, ...prev.filter((it) => it.file)]);
  };
  const salinDariDaftar = (sourceList, setTargetList, sourceLabel) => {
    const filled = (sourceList || []).filter((it) => it.file);
    if (filled.length === 0) { alert(`Belum ada file "${sourceLabel}" yang diupload sebelumnya untuk disalin.`); return; }
    setTargetList((prev) => [
      ...filled.map((it, i) => ({ id: Date.now() + i, file: it.file, keterangan: it.keterangan || prev[0]?.keterangan || sourceLabel })),
      ...prev.filter((it) => it.file),
    ]);
  };

  const addAcuan = () => setAcuanPeraturan([...acuanPeraturan, { id: Date.now(), type: 'dynamic', aturan: '' }]);
  const removeAcuan = (id) => setAcuanPeraturan(acuanPeraturan.filter(item => item.id !== id));
  const updateAcuan = (id, val) => setAcuanPeraturan(acuanPeraturan.map(item => item.id === id ? { ...item, aturan: val } : item));

  const handleCheckAspekBmp = (id) => {
    setAspekBmp(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
  }
  const addAspekBmpBaru = () => {
    const teksInput = prompt("Masukkan Aspek BMP Tambahan:");
    if (teksInput) {
      setAspekBmp([...aspekBmp, { id: Date.now(), teks: teksInput, checked: true }]);
    }
  }

  // ==========================================
  // PROSES SUBMIT & UPLOAD MASSAL
  // ==========================================
  // ==========================================
  // GENERATE COVER OTOMATIS
  // ==========================================
  const buildCoverOptions = () => {
    const judulLaporan = jenisLhv === 'BMP'
      ? 'LAPORAN HASIL VERIFIKASI NILAI BMP'
      : 'LAPORAN HASIL VERIFIKASI NILAI TKDN BARANG';
    const tahun = (tanggalLhv && tanggalLhv.slice(0, 4)) || new Date().getFullYear();
    return {
      judulLaporan,
      namaLembaga: namaLembagaCover,
      noLhv: LHVLogic.buildNoLhv({ jenisLhv, tanggalLhv, idBerkas, namaVerifikator }),
      namaPerusahaan,
      kbliKode: kbli,
      kbliDeskripsi,
      jenisBarang,
      tahun,
      baseColor: coverColor,
      fotoProdukBlob: fileFotoCover,
      logoKemenperinSrc: logoKemenperin,
      logoBbsSrc: logoBBS,
    };
  };

  const handlePreviewCover = async () => {
    setCoverPreviewLoading(true);
    try {
      const blob = await CoverGenerator.generateCoverImage(buildCoverOptions());
      const url = URL.createObjectURL(blob);
      setCoverPreviewUrl(url);
    } catch (e) {
      console.error(e);
      setStatus('Gagal membuat pratinjau cover: ' + e.message);
    } finally {
      setCoverPreviewLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Memproses data & gambar, mohon tunggu...');
    try {
      const state = buildFullState();

      if (coverMode === 'auto') {
        setStatus('Menggambar cover otomatis...');
        try {
          state.fileCover = await CoverGenerator.generateCoverImage(buildCoverOptions());
        } catch (coverErr) {
          console.error(coverErr);
          throw new Error('Gagal membuat cover otomatis: ' + coverErr.message);
        }
      }

      const filename = await LHVLogic.generateAndDownload(state, (msg) => { console.log('[LHV]', msg); setStatus(msg); });

      // Simpan proyek ini ke IndexedDB (draft tersimpan, bisa dibuka lagi nanti)
      try {
        await LHVLogic.dbSaveProject({
          jenisLhv, namaPerusahaan, idBerkas,
          updatedAt: Date.now(),
          state
        });
      } catch (dbErr) {
        console.warn('Gagal menyimpan ke IndexedDB (tidak fatal):', dbErr);
      }

      setStatus('Sukses! File ' + filename + ' berhasil dibuat & diunduh. (Isian form masih tersimpan sebagai draft kalau perlu generate ulang/perbaikan.)');
      await saveDraft();
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + (err && err.message ? err.message : String(err)) + (err && err.stack ? ('\n\n' + err.stack.split('\n').slice(0,3).join('\n')) : ''));
    }
  }

  // Layout Styles
  const inputStyle = { width: '100%', padding: '9px', marginTop: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }
  const readOnlyStyle = { ...inputStyle, backgroundColor: '#e9ecef', color: '#555', cursor: 'not-allowed' }
  const sectionStyle = { border: '1px solid #e0e0e0', padding: '20px', borderRadius: '6px', marginBottom: '20px', backgroundColor: '#fafafa' }
  const sectionTitle = { color: '#0d47a1', marginTop: 0, marginBottom: '15px', fontSize: '15px', borderBottom: '1px solid #ddd', paddingBottom: '8px' }
  const grid2Col = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }
  const tabStyle = (n) => ({ padding: '10px 15px', cursor: 'pointer', borderBottom: activeTab === n ? '3px solid #1976d2' : '3px solid transparent', color: activeTab === n ? '#1976d2' : '#555', fontWeight: activeTab === n ? 'bold' : 'normal', backgroundColor: activeTab === n ? '#f0f7ff' : 'transparent', transition: '0.3s', whiteSpace: 'nowrap' })

  // Render Blok Dinamis dengan penyematan ImagePreview (Kunci 7cm)
  const renderDynamicBlock = (title, state, setState) => (
    <div style={{ ...sectionStyle, backgroundColor: '#fff' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>{title}</h4>
      {state.map((item, index) => (
        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #eee' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={item.keterangan} onChange={(e) => updateDynamic(state, setState, item.id, 'keterangan', e.target.value)} placeholder={`Keterangan ${index + 1}`} style={inputStyle} />
            <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => updateDynamic(state, setState, item.id, 'file', e.target.files[0])} style={{ alignSelf: 'center', marginTop: '6px' }} />
            <GDriveButton compact mimeTypes={MIME_DOKUMEN} onFile={(f) => updateDynamic(state, setState, item.id, 'file', f)} />
            <button type="button" onClick={() => removeDynamic(state, setState, item.id)} style={{ padding: '8px', marginTop: '6px', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
          </div>
          {/* Pratinjau Dokumen Umum dikunci pada 7 cm, otomatis diskalakan proporsional ke kotak seragam */}
          <ImagePreview file={item.file} targetWidth="7 cm" uniform={true} />
        </div>
      ))}
      <button type="button" onClick={() => addDynamic(state, setState)} style={{ padding: '8px 15px', backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px dashed #1e88e5', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight:'bold' }}>+ Tambah Dokumen</button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial', padding: '30px', maxWidth: '900px', margin: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px', marginBottom: '15px' }}>
        <img src={logoKemenperin} alt="Logo Kemenperin" style={{ height: '70px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#0d47a1', margin: '0 0 5px 0', fontSize: '24px' }}>Sistem Generator LHV TKDN & BMP</h2>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#555', fontSize: '14px' }}>
            Balai Besar Standardisasi Pelayanan Jasa Pencegahan Pencemaran Industri (BBSPJPPI)
          </p>
        </div>
        <img src={logoBBS} alt="Logo BBSPJPPI" style={{ height: '70px', objectFit: 'contain' }} />
      </div>

      {status && (
        <p style={{
          textAlign: 'center',
          fontWeight: 'bold',
          padding: '12px 16px',
          borderRadius: '6px',
          margin: '0 0 15px 0',
          backgroundColor: status.startsWith('Error') ? '#ffebee' : status.startsWith('Sukses') ? '#e8f5e9' : '#fff3e0',
          color: status.startsWith('Error') ? '#c62828' : status.startsWith('Sukses') ? '#2e7d32' : '#e65100',
          border: '1px solid ' + (status.startsWith('Error') ? '#ef9a9a' : status.startsWith('Sukses') ? '#a5d6a7' : '#ffcc80'),
          whiteSpace: 'pre-wrap'
        }}>{status}</p>
      )}

      {draftInfo && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
          💾 Draft tersimpan otomatis (termasuk foto) — terakhir: {new Date(draftInfo.savedAt).toLocaleTimeString('id-ID')}
        </p>
      )}

      {/* NAVIGASI MENU UTAMA */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '25px', overflowX: 'auto' }}>
        <div onClick={() => {saveDraft(); setActiveTab(1);}} style={tabStyle(1)}>1. Cover & Logo</div>
        <div onClick={() => {saveDraft(); setActiveTab(2);}} style={tabStyle(2)}>2. Ringkasan Eksekutif</div>
        <div onClick={() => {saveDraft(); setActiveTab(3);}} style={tabStyle(3)}>3. Hasil Verifikasi</div>
        <div onClick={() => {saveDraft(); setActiveTab(4);}} style={tabStyle(4)}>4. Dokumen Pendukung</div>
        <div onClick={() => {saveDraft(); setActiveTab(5);}} style={tabStyle(5)}>5. Lampiran</div>
      </div>
      
      <form onSubmit={handleSubmit} onBlur={saveDraft} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        
        {/* ========================================== */}
        {/* MENU 1: DATA AWAL, COVER & LOGO */}
        {/* ========================================== */}
        {activeTab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ color: '#333', marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>1. Data Awal & Skema LHV</h3>
            
            <div style={{ padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '6px' }}>
              <label style={{ fontWeight: 'bold', color: '#2e7d32' }}>Pilih Skema LHV yang akan dibuat:</label>
              <select value={jenisLhv} onChange={(e) => setJenisLhv(e.target.value)} style={{...inputStyle, fontWeight: 'bold', fontSize: '15px'}}>
                <option value="Produksi Sendiri">LHV TKDN Produksi Sendiri</option>
                <option value="Kerjasama">LHV TKDN Kerjasama</option>
                <option value="BMP">LHV BMP (Bobot Manfaat Perusahaan)</option>
                <option value="Jasa">LHV TKDN Jasa</option>
                <option value="Gabungan">LHV TKDN Gabungan (Barang & Jasa)</option>
              </select>
            </div>

            <div><label style={{ fontWeight: 'bold' }}>{jenisLhv === 'Kerjasama' ? 'Nama Pelaku Usaha (Pemohon):' : 'Nama Perusahaan (Klien):'}</label><input type="text" value={namaPerusahaan} onChange={(e) => setNamaPerusahaan(e.target.value)} required style={inputStyle}/></div>
            <div><label style={{ fontWeight: 'bold' }}>Tanggal LHV (Tanggal Terbit Laporan):</label><input type="date" value={tanggalLhv} onChange={(e) => setTanggalLhv(e.target.value)} required style={inputStyle}/></div>
            
            <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
              <label style={{ fontWeight: 'bold' }}>Cover Laporan:</label><br/>
              <div style={{ display: 'flex', gap: '15px', margin: '10px 0' }}>
                <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input type="radio" checked={coverMode === 'auto'} onChange={() => setCoverMode('auto')} /> ✨ Buat Otomatis
                </label>
                <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input type="radio" checked={coverMode === 'upload'} onChange={() => setCoverMode('upload')} /> 📤 Upload File Cover Sendiri
                </label>
              </div>

              {coverMode === 'upload' ? (
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => setFileCover(e.target.files[0])} style={{ flex: 1 }}/>
                    <GDriveButton mimeTypes={MIME_GAMBAR} onFile={setFileCover} />
                  </div>
                  <ImagePreview file={fileCover} targetWidth="Bebas (Original)" />
                </>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
                    Cover akan digambar otomatis (No. LHV, nama perusahaan, bidang usaha, jenis barang diambil dari isian di form ini &amp; tab lain). Cukup pilih warna &amp; unggah foto produk.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Warna Aksen Cover:</label><br/>
                      <input type="color" value={coverColor} onChange={(e) => setCoverColor(e.target.value)} style={{ width: '100%', height: '38px', marginTop: '6px', cursor: 'pointer' }}/>
                    </div>
                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Foto Produk untuk Cover:</label><br/>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        <input type="file" accept="image/png, image/jpeg" onChange={(e) => setFileFotoCover(e.target.files[0])} style={{ flex: 1 }}/>
                        <GDriveButton mimeTypes={MIME_GAMBAR} onFile={setFileFotoCover} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Deskripsi KBLI (untuk cover, opsional):</label>
                    <input type="text" value={kbliDeskripsi} onChange={(e) => setKbliDeskripsi(e.target.value)} placeholder="Contoh: Industri Alat Kesehatan Dalam Subgolongan 2101" style={inputStyle}/>
                    <span style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>Isi nama/deskripsinya saja, TANPA mengulang kode KBLI (kode sudah otomatis ditampilkan dari field "KBLI" di atas)</span>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Lembaga (subjudul cover):</label>
                    <textarea rows="2" value={namaLembagaCover} onChange={(e) => setNamaLembagaCover(e.target.value)} style={inputStyle}></textarea>
                  </div>

                  <button type="button" onClick={handlePreviewCover} disabled={coverPreviewLoading}
                    style={{ marginTop: '14px', padding: '10px 18px', backgroundColor: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {coverPreviewLoading ? 'Membuat pratinjau...' : '🔍 Lihat Pratinjau Cover'}
                  </button>

                  {coverPreviewUrl && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <img src={coverPreviewUrl} alt="Pratinjau Cover" style={{ maxWidth: '320px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}/>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
              <label style={{ fontWeight: 'bold' }}>Unggah Logo Perusahaan (Klien):</label><br/>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
              <input type="file" accept="image/png, image/jpeg" onChange={(e) => setFileLogo(e.target.files[0])} style={{ flex: 1 }}/>
              <GDriveButton mimeTypes={MIME_GAMBAR} onFile={setFileLogo} />
            </div>
              <ImagePreview file={fileLogo} targetWidth="2 cm" />
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MENU 2: RINGKASAN EKSEKUTIF & ACUAN */}
        {/* ========================================== */}
        {activeTab === 2 && (
          <div>
            <h3 style={{ color: '#333', marginTop: 0, marginBottom: '20px' }}>Tabel Ringkasan Eksekutif & Bab Pendahuluan</h3>
            
            {jenisLhv !== 'BMP' && (
              <div style={{ ...sectionStyle, borderColor: '#1976d2', backgroundColor: '#f0f7ff' }}>
                <h4 style={{ ...sectionTitle, color: '#1976d2', borderBottom: '1px solid #bbdefb' }}>Acuan Peraturan (Bab Pendahuluan LHV)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {acuanPeraturan
                    .filter(item => {
                      if (item.id === 6 && !permenperin.includes('35 Tahun 2025')) return false;
                      return true;
                    })
                    .map((item, index) => (
                    <div key={item.id} style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ padding: '10px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '4px', fontWeight: 'bold', color: '#1565c0' }}>{index + 1}.</div>
                      {item.type === 'dropdown' ? (
                        <select 
                          value={item.aturan} 
                          onChange={(e) => {
                            if (item.id === 2) {
                              handlePermenperinChange(e);
                            } else {
                              updateAcuan(item.id, e.target.value);
                            }
                          }} 
                          style={{ ...inputStyle, marginTop: 0, flex: 1, backgroundColor: '#fff', color: '#333' }}
                        >
                          {item.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      ) : item.type === 'fixed' ? (
                        <textarea rows="2" value={item.aturan} readOnly style={{ ...readOnlyStyle, marginTop: 0, flex: 1, resize: 'none' }}></textarea>
                      ) : (
                        <textarea rows="2" value={item.aturan} onChange={(e) => updateAcuan(item.id, e.target.value)} style={{ ...inputStyle, marginTop: 0, flex: 1 }} placeholder="Masukkan nama peraturan tambahan..."></textarea>
                      )}
                      {item.type === 'dynamic' ? (
                        <button type="button" onClick={() => removeAcuan(item.id)} style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                      ) : (
                        <button type="button" disabled style={{ padding: '10px', backgroundColor: '#f5f5f5', color: '#ccc', border: '1px solid #ddd', borderRadius: '4px', cursor: 'not-allowed' }}>X</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAcuan} style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#fff', color: '#1976d2', border: '1px dashed #1976d2', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>+ Tambah Acuan Peraturan Baru</button>
              </div>
            )}

            {jenisLhv === 'BMP' && (
              <div style={{ ...sectionStyle, borderColor: '#673ab7', backgroundColor: '#f3e5f5' }}>
                <h4 style={{ ...sectionTitle, color: '#512da8', borderColor: '#d1c4e9' }}>Aspek BMP yang Diverifikasi (Checklist)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto', padding: '10px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                  {aspekBmp.map((aspek) => (
                    <label key={aspek.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>
                      <input type="checkbox" checked={aspek.checked} onChange={() => handleCheckAspekBmp(aspek.id)} style={{ transform: 'scale(1.2)' }} />
                      {aspek.teks}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={addAspekBmpBaru} style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#673ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>+ Tambah Kriteria Aspek Custom</button>
              </div>
            )}

            <div style={sectionStyle}>
              <h4 style={sectionTitle}>A. Data Administrasi LHV</h4>
              <div style={grid2Col}>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>1. ID Berkas:</label><input type="text" value={idBerkas} onChange={(e) => setIdBerkas(e.target.value)} style={inputStyle} /></div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>2. Dasar Hukum (Permenperin):</label>
                  <select value={permenperin} onChange={handlePermenperinChange} style={inputStyle}>
                    <option value="Permenperin No. 35 Tahun 2025 tentang Ketentuan dan Tata Cara Sertifikasi Tingkat Komponen Dalam Negeri dan Bobot Manfaat Perusahaan">Permenperin No. 35 Tahun 2025</option>
                    <option value="Permenperin No. 31 Tahun 2022 tentang Ketentuan dan Tata Cara Penghitungan Nilai Tingkat Komponen Dalam Negeri Alat Kesehatan dan Alat Kesehatan Diagnostik In Vitro">Permenperin No. 31 Tahun 2022</option>
                    <option value="Permenperin No. 22 Tahun 2020 tentang Ketentuan dan Tata Cara Penghitungan Nilai Tingkat Komponen Dalam Negeri Produk Elektronika dan Telematika">Permenperin No. 22 Tahun 2020</option>
                  </select>
                </div>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>7. Tgl. Verifikasi Dokumen:</label><input type="date" value={tglVerifikasiDok} onChange={(e) => setTglVerifikasiDok(e.target.value)} style={inputStyle} /></div>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>8. Tgl. Verifikasi Proses (On-Site):</label><input type="date" value={tglVerifikasiLapangan} onChange={(e) => setTglVerifikasiLapangan(e.target.value)} style={inputStyle} /></div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h4 style={sectionTitle}>B. Identitas Perusahaan</h4>
              <div style={grid2Col}>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Nama Pelaku Usaha:' : 'Nama Perusahaan:'}</label><input type="text" value={namaPerusahaan} readOnly style={readOnlyStyle} /></div>
                
                {jenisLhv === 'Kerjasama' && (
                  <>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px', color:'#d84315' }}>Nama Perusahaan Industri:</label><input type="text" value={namaPerusahaanIndustri} onChange={(e) => setNamaPerusahaanIndustri(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px', color:'#d84315' }}>Alamat Perusahaan Industri (Kantor):</label><textarea rows="2" value={alamatPerusahaanIndustri} onChange={(e) => setAlamatPerusahaanIndustri(e.target.value)} style={inputStyle}></textarea></div>
                  </>
                )}

                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Alamat Kantor Pelaku Usaha:' : 'Alamat Kantor Perusahaan:'}</label><textarea rows="2" value={alamatKantor} onChange={(e) => setAlamatKantor(e.target.value)} style={inputStyle}></textarea></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Alamat Pabrik Perusahaan Industri:' : 'Alamat Lokasi Pabrik:'}</label><textarea rows="2" value={alamatPabrik} onChange={(e) => setAlamatPabrik(e.target.value)} style={inputStyle}></textarea></div>
                
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Skala Pelaku Usaha:' : 'Skala Perusahaan:'}</label>
                  <select value={skalaPerusahaan} onChange={(e) => setSkalaPerusahaan(e.target.value)} style={inputStyle}>
                    <option value="Perorangan">Perorangan</option>
                    <option value="Mikro">Mikro</option>
                    <option value="Kecil">Kecil</option>
                    <option value="Menengah">Menengah</option>
                    <option value="Besar">Besar</option>
                  </select>
                </div>

                {jenisLhv === 'Kerjasama' && (
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '13px', color:'#d84315' }}>Skala Perusahaan Industri:</label>
                    <select value={skalaPerusahaanIndustri} onChange={(e) => setSkalaPerusahaanIndustri(e.target.value)} style={inputStyle}>
                      <option value="Perorangan">Perorangan</option>
                      <option value="Mikro">Mikro</option>
                      <option value="Kecil">Kecil</option>
                      <option value="Menengah">Menengah</option>
                      <option value="Besar">Besar</option>
                    </select>
                  </div>
                )}

                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Nomor Izin Pelaku Usaha:' : 'Nomor Perizinan Berusaha (NIB):'}</label><input type="text" value={noIzin} onChange={(e) => setNoIzin(e.target.value)} style={inputStyle} /></div>
                
                {jenisLhv === 'Kerjasama' && (
                   <div><label style={{ fontWeight: 'bold', fontSize: '13px', color:'#d84315' }}>Nomor Izin Perusahaan Industri:</label><input type="text" value={noIzinPerusahaanIndustri} onChange={(e) => setNoIzinPerusahaanIndustri(e.target.value)} style={inputStyle} /></div>
                )}
              </div>
            </div>

            {jenisLhv !== 'BMP' && (
              <div style={sectionStyle}>
                <h4 style={sectionTitle}>C. Spesifikasi Barang</h4>
                <div style={grid2Col}>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Kelompok Barang:</label>
                    <select value={kelompokBarang} onChange={(e) => setKelompokBarang(e.target.value)} style={inputStyle}>
                      <option value="">-- Pilih Kelompok Barang --</option>
                      {KELOMPOK_BARANG_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Jenis Barang:</label><input type="text" value={jenisBarang} onChange={(e) => setJenisBarang(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Merek Barang:</label><input type="text" value={merekBarang} onChange={(e) => setMerekBarang(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Tipe Barang:</label><input type="text" value={tipeBarang} onChange={(e) => setTipeBarang(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'KBLI Perusahaan Industri:' : 'KBLI:'}</label><input type="text" value={kbli} onChange={(e) => setKbli(e.target.value)} placeholder="Contoh: 28130" style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Kode HS:</label><input type="text" value={kodeHs} onChange={(e) => setKodeHs(e.target.value)} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>{jenisLhv === 'Kerjasama' ? 'Kapasitas Produksi Perusahaan Industri:' : 'Kapasitas Produksi:'}</label><input type="text" value={kapasitasProduksi} onChange={(e) => setKapasitasProduksi(e.target.value)} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Spesifikasi Barang:</label><textarea rows="2" value={spesifikasiBarang} onChange={(e) => setSpesifikasiBarang(e.target.value)} style={inputStyle}></textarea></div>
                  <div style={{ gridColumn: '1 / -1', padding: '15px', backgroundColor: '#f3f8ff', borderRadius: '6px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {jenisLhv === 'Kerjasama' ? 'Unggah Foto Produk (tampil di Ringkasan Eksekutif, tag {{ foto_produk }}):' : 'Unggah Foto Barang (tampil di Ringkasan Eksekutif, tag {{ foto_barang }}):'}
                    </label><br/>
                    {jenisLhv === 'Kerjasama' ? (
                      <>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                          <input type="file" accept="image/png, image/jpeg" onChange={(e) => setFileFotoProdukUtama(e.target.files[0])} style={{ flex: 1 }}/>
                          <GDriveButton mimeTypes={MIME_GAMBAR} onFile={setFileFotoProdukUtama} />
                        </div>
                        <ImagePreview file={fileFotoProdukUtama} targetWidth="7 cm" />
                        <p style={{ fontSize: '12px', color: '#777', marginTop: '5px' }}>Catatan: kalau tidak diisi, foto pertama dari galeri "Foto Produk" di tab Dokumen Pendukung akan dipakai sebagai gantinya.</p>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                          <input type="file" accept="image/png, image/jpeg" onChange={(e) => setFileFotoBarang(e.target.files[0])} style={{ flex: 1 }}/>
                          <GDriveButton mimeTypes={MIME_GAMBAR} onFile={setFileFotoBarang} />
                        </div>
                        <ImagePreview file={fileFotoBarang} targetWidth="7 cm" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {jenisLhv === 'BMP' ? (
              <div style={{ ...sectionStyle, borderColor: '#009688', backgroundColor: '#e0f2f1' }}>
                <h4 style={{ ...sectionTitle, color: '#004d40', borderColor: '#b2dfdb' }}>D. Capaian Nilai Bobot Manfaat Perusahaan (BMP)</h4>
                <div style={grid2Col}>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Total Nilai BMP Akhir (%):</label><input type="number" step="0.01" value={nilaiBmp} onChange={(e) => setNilaiBmp(e.target.value)} onBlur={(e) => setTerbilangBmp(nilaiKeTerbilangPersen(e.target.value))} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Terbilang (Nilai BMP):</label><input type="text" value={terbilangBmp} onChange={(e) => setTerbilangBmp(e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ) : (
              <div style={sectionStyle}>
                <h4 style={sectionTitle}>D. Hasil Nilai TKDN & Brainware</h4>
                <div style={grid2Col}>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nilai TKDN (%):</label><input type="number" step="0.01" value={nilaiTkdn} onChange={(e) => setNilaiTkdn(e.target.value)} onBlur={(e) => setTerbilangTkdn(nilaiKeTerbilangPersen(e.target.value))} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Terbilang (TKDN):</label><input type="text" value={terbilangTkdn} onChange={(e) => setTerbilangTkdn(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nilai Brainware (%):</label><input type="number" step="0.01" value={nilaiBrainware} onChange={(e) => setNilaiBrainware(e.target.value)} onBlur={(e) => setTerbilangBrainware(nilaiKeTerbilangPersen(e.target.value))} style={inputStyle} /></div>
                  <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Terbilang (Brainware):</label><input type="text" value={terbilangBrainware} onChange={(e) => setTerbilangBrainware(e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            )}

            <div style={{ ...sectionStyle, backgroundColor: '#fdf8e4', borderColor: '#f2c97d' }}>
              <h4 style={{ ...sectionTitle, color: '#8a6d3b', borderColor: '#faebcc' }}>E. Pengesahan Laporan</h4>
              <div style={grid2Col}>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Verifikator:</label><input type="text" value={namaVerifikator} onChange={(e) => setNamaVerifikator(e.target.value)} style={inputStyle} /></div>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NIP Verifikator:</label><input type="text" value={nipVerifikator} onChange={(e) => setNipVerifikator(e.target.value)} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', padding: '10px', backgroundColor: '#fff', borderRadius: '4px', border: '1px dashed #ccc' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Scan Tanda Tangan Verifikator (PNG):</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                    <input type="file" accept="image/png" onChange={(e) => setFileTtdVerifikator(e.target.files[0])} style={{ flex: 1 }} />
                    <GDriveButton mimeTypes={['image/png']} onFile={setFileTtdVerifikator} />
                  </div>
                  <ImagePreview file={fileTtdVerifikator} targetWidth="2 cm" />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Pejabat yang Mengetahui:</label>
                  <select value={pejabatMengetahui} onChange={handlePejabatChange} style={inputStyle}>
                    <option value="">-- Pilih Pejabat --</option>
                    <option value="Kepala BBSPJPPI">Kepala BBSPJPPI</option>
                    <option value="Plh. Kepala BBSPJPPI">Plh. Kepala BBSPJPPI</option>
                  </select>
                </div>
                <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Pejabat:</label><input type="text" value={namaPejabat} onChange={(e) => setNamaPejabat(e.target.value)} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NIP Pejabat:</label><input type="text" value={nipPejabat} onChange={(e) => setNipPejabat(e.target.value)} style={inputStyle} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MENU 3: HASIL VERIFIKASI */}
        {/* ========================================== */}
        {activeTab === 3 && ( 
          <div>
            <h3 style={{ color: '#333', marginTop: 0, marginBottom: '5px' }}>Rincian Hasil Verifikasi</h3>

            <div style={{ display: 'flex', gap: '15px', margin: '0 0 15px 0' }}>
              <label style={{ fontWeight: 'normal', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" checked={modeFormulir === 'perItem'} onChange={() => setModeFormulir('perItem')} /> 📑 Upload Satu per Satu
              </label>
              <label style={{ fontWeight: 'normal', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" checked={modeFormulir === 'gabungan'} onChange={() => setModeFormulir('gabungan')} /> 📚 Upload 1 Dokumen Gabungan (Otomatis Dipecah)
              </label>
            </div>

            {modeFormulir === 'gabungan' ? (
              <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                <p style={{ color: '#666', fontSize: '13px', marginTop: 0 }}>
                  Upload 1 file PDF yang berisi SEMUA formulir sekaligus (mis. hasil export dari Excel/aplikasi penghitungan TKDN) — sistem akan otomatis memecahnya jadi beberapa formulir, <strong>1 halaman PDF = 1 formulir</strong>, sesuai urutan halaman.
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFileFormulirGabungan(e.target.files[0])} style={{ flex: 1 }} />
                  <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileFormulirGabungan} />
                </div>
                <ImagePreview file={fileFormulirGabungan} targetWidth="Bebas (per halaman)" />
              </div>
            ) : (
              <>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                  Sistem otomatis menyediakan <strong>{formulirVerifikasi.length} baris</strong> sesuai dasar hukum yang Anda pilih di Menu 2.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {formulirVerifikasi.map((form) => (
                    <div key={form.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ flex: '1' }}>
                          <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Judul Formulir:</label>
                          <input type="text" value={form.judul} onChange={(e) => setFormulirVerifikasi(formulirVerifikasi.map(f => f.id === form.id ? { ...f, judul: e.target.value } : f))} style={inputStyle} />
                        </div>
                        <div style={{ flex: '2' }}>
                          <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Unggah Screenshot Hasil Excel (PNG/JPG):</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                            <input type="file" accept="image/png, image/jpeg, application/pdf, .xlsx, .xls" onChange={(e) => setFormulirVerifikasi(formulirVerifikasi.map(f => f.id === form.id ? { ...f, file: e.target.files[0] } : f))} style={{ flex: 1 }} />
                            <GDriveButton mimeTypes={MIME_FORMULIR} onFile={(fl) => setFormulirVerifikasi(formulirVerifikasi.map(f => f.id === form.id ? { ...f, file: fl } : f))} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>Bisa gambar (PNG/JPG), PDF (per halaman otomatis jadi gambar), atau Excel (.xlsx/.xls, otomatis digambar sebagai tabel)</span>
                        </div>
                        <button type="button" onClick={() => setFormulirVerifikasi(formulirVerifikasi.filter(f => f.id !== form.id))} style={{ padding: '8px 12px', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop:'20px' }}>X</button>
                      </div>
                      <ImagePreview file={form.file} targetWidth="7 cm" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setFormulirVerifikasi([...formulirVerifikasi, { id: Date.now(), judul: 'Formulir Tambahan', file: null }])} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px dashed #1e88e5', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight:'bold' }}>+ Tambah Formulir Baru</button>
              </>
            )}
          </div> 
        )}

        {/* ========================================== */}
        {/* MENU 4: DOKUMEN PENDUKUNG */}
        {/* ========================================== */}
        {activeTab === 4 && (
          <div>
            <h3 style={{ color: '#333', marginTop: 0, marginBottom: '20px' }}>Dokumen Pendukung ({jenisLhv})</h3>
            
            {jenisLhv === 'BMP' ? (
              <>
                <p style={{fontSize:'13px', color:'#666', marginTop:'-10px', marginBottom:'20px'}}>* Silakan unggah bukti administrasi pendukung untuk setiap aspek indikator penilaian BMP berikut (Format dapat berupa Gambar maupun PDF).</p>
                {aspekBmp.find(a => a.id === 2)?.checked && renderDynamicBlock("1. Bukti Penyerapan Tenaga Kerja", fileTenagaKerjaBmp, setFileTenagaKerjaBmp)}
                {aspekBmp.find(a => a.id === 3)?.checked && renderDynamicBlock("2. Bukti Penambahan Investasi Baru", fileInvestasiBmp, setFileInvestasiBmp)}
                {aspekBmp.find(a => a.id === 4)?.checked && renderDynamicBlock("3. Bukti Kemitraan dan Penguatan Rantai Pasok", fileKemitraanBmp, setFileKemitraanBmp)}
                {aspekBmp.find(a => a.id === 5)?.checked && renderDynamicBlock("4. Bukti Industri Pionir atau Substitusi Impor", fileSubstitusiBmp, setFileSubstitusiBmp)}
                {aspekBmp.find(a => a.id === 6)?.checked && renderDynamicBlock("5. Bukti Penggunaan Mesin & Peralatan Produksi DN", fileMesinDnBmp, setFileMesinDnBmp)}
                {aspekBmp.find(a => a.id === 7)?.checked && renderDynamicBlock("6. Bukti Lokasi Pembuatan", fileLokasiBmp, setFileLokasiBmp)}
                {aspekBmp.find(a => a.id === 8)?.checked && renderDynamicBlock("7. Bukti Penerapan Industri 4.0", fileI40Bmp, setFileI40Bmp)}
                {aspekBmp.find(a => a.id === 9)?.checked && renderDynamicBlock("8. Bukti Pengembangan Sumber Daya Manusia Industri", fileSdmBmp, setFileSdmBmp)}
                {aspekBmp.find(a => a.id === 13)?.checked && renderDynamicBlock("9. Bukti Kepemilikan Sertifikat/Akreditasi", fileSertifikatBmp, setFileSertifikatBmp)}
                {aspekBmp.find(a => a.id === 11)?.checked && renderDynamicBlock("10. Bukti Penerapan Industri Hijau", fileHijauBmp, setFileHijauBmp)}
                {aspekBmp.find(a => a.id === 12)?.checked && renderDynamicBlock("11. Bukti Nilai Ekspor", fileEksporBmp, setFileEksporBmp)}
                {aspekBmp.find(a => a.id === 10)?.checked && renderDynamicBlock("12. Bukti Kepemilikan Produk/Merek Dalam Negeri", fileMerekDnBmp, setFileMerekDnBmp)}
                {aspekBmp.find(a => a.id === 14)?.checked && renderDynamicBlock("13. Bukti Penerapan ESG (Environmental Social Governance)", fileEsgBmp, setFileEsgBmp)}
                {aspekBmp.find(a => a.id === 15)?.checked && renderDynamicBlock("14. Bukti Penghargaan/Awards", fileAwardsBmp, setFileAwardsBmp)}
                {aspekBmp.find(a => a.id === 16)?.checked && renderDynamicBlock("15. Bukti Kepatuhan Pelaporan Data Industri pada SIINas", fileSiinasBmp, setFileSiinasBmp)}
              </>
            ) : jenisLhv === 'Kerjasama' ? (
              <>
                <div style={sectionStyle}>
                  <h4 style={sectionTitle}>1. Profil Pelaku Usaha (Kantor)</h4>
                  <div style={grid2Col}>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Pelaku Usaha:</label><input type="text" value={namaPerusahaan} readOnly style={readOnlyStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Status Perusahaan:</label>
                      <select value={statusKantor} onChange={(e) => setStatusKantor(e.target.value)} style={inputStyle}><option value="PMDN">PMDN</option><option value="PMA">PMA</option></select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Alamat Kantor:</label><textarea rows="2" value={alamatKantor} readOnly style={readOnlyStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Telepon:</label><input type="text" value={teleponKantor} onChange={(e) => setTeleponKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Fax:</label><input type="text" value={faxKantor} onChange={(e) => setFaxKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Email:</label><input type="email" value={emailKantor} onChange={(e) => setEmailKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Website:</label><input type="text" value={websiteKantor} onChange={(e) => setWebsiteKantor(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Pejabat Penghubung (PIC):</label><input type="text" value={picKantor} onChange={(e) => setPicKantor(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Akta Perubahan/Pendirian:</label><textarea rows="2" value={aktaKantor} onChange={(e) => setAktaKantor(e.target.value)} style={inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NPWP:</label><input type="text" value={npwpKantor} onChange={(e) => setNpwpKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>IUI / NIB:</label><input type="text" value={noIzin} readOnly style={readOnlyStyle} /></div>
                    <div style={{ gridColumn: '1 / -1', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', marginTop:'10px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Struktur Organisasi Pelaku Usaha (Gambar):</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileStruktur(e.target.files[0])} style={{ flex: 1 }} />
                        <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileStruktur} />
                      </div>
                      <ImagePreview file={fileStruktur} targetWidth="7 cm" />
                    </div>
                  </div>
                </div>

                <div style={{ ...sectionStyle, borderColor: '#ff9800', backgroundColor: '#fff3e0' }}>
                  <h4 style={{ ...sectionTitle, color: '#e65100', borderColor: '#ffcc80' }}>2.a. Profil Perusahaan Industri (Kantor)</h4>
                  <div style={grid2Col}>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Perusahaan Industri:</label><input type="text" value={namaPerusahaanIndustri} readOnly style={readOnlyStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Status Perusahaan:</label>
                      <select value={statusKantorIndustri} onChange={(e) => setStatusKantorIndustri(e.target.value)} style={inputStyle}><option value="PMDN">PMDN</option><option value="PMA">PMA</option></select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Alamat Kantor:</label><textarea rows="2" value={alamatPerusahaanIndustri} readOnly style={readOnlyStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Telepon:</label><input type="text" value={teleponKantorIndustri} onChange={(e) => setTeleponKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Fax:</label><input type="text" value={faxKantorIndustri} onChange={(e) => setFaxKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Email:</label><input type="email" value={emailKantorIndustri} onChange={(e) => setEmailKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Website:</label><input type="text" value={websiteKantorIndustri} onChange={(e) => setWebsiteKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Pejabat Penghubung (PIC):</label><input type="text" value={picKantorIndustri} onChange={(e) => setPicKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Akta Perubahan/Pendirian:</label><textarea rows="2" value={aktaKantorIndustri} onChange={(e) => setAktaKantorIndustri(e.target.value)} style={inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NPWP:</label><input type="text" value={npwpKantorIndustri} onChange={(e) => setNpwpKantorIndustri(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>IUI / NIB:</label><input type="text" value={noIzinPerusahaanIndustri} readOnly style={readOnlyStyle} /></div>
                  </div>
                </div>

                <div style={{ ...sectionStyle, borderColor: '#ff9800', backgroundColor: '#fff3e0' }}>
                  <h4 style={{ ...sectionTitle, color: '#e65100', borderColor: '#ffcc80' }}>2.b. Profil Perusahaan Industri (Pabrik)</h4>
                  <div style={grid2Col}>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Perusahaan Industri:</label><input type="text" value={namaPerusahaanIndustri} readOnly style={readOnlyStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Alamat Pabrik:</label><textarea rows="2" value={alamatPabrik} readOnly style={readOnlyStyle}></textarea></div>
                  </div>
                  <div style={grid2Col}>
                    <div style={{ padding: '10px', backgroundColor: '#ffe0b2', borderRadius: '4px', marginTop:'15px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#e65100' }}>Struktur Organisasi Perusahaan Industri (Gambar):</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileStrukturIndustri(e.target.files[0])} style={{ flex: 1 }} />
                        <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileStrukturIndustri} />
                      </div>
                      <ImagePreview file={fileStrukturIndustri} targetWidth="7 cm" />
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px', marginTop:'15px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Diagram Alur Proses Produksi (Gambar):</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileAlurProduksi(e.target.files[0])} style={{ flex: 1 }} />
                        <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileAlurProduksi} />
                      </div>
                      <ImagePreview file={fileAlurProduksi} targetWidth="7 cm" />
                    </div>
                  </div>
                </div>

                {renderDynamicBlock("Bukti Kerja Sama", fileBuktiKerjasama, setFileBuktiKerjasama)}
                {renderDynamicBlock("Data Rincian Kebutuhan/Gambar Teknik/BoM", fileBom, setFileBom)}
                {renderDynamicBlock("Sertifikat TKDN Komponen Utama", fileSertifikatTkdn, setFileSertifikatTkdn)}
                {renderDynamicBlock("Kartu Identitas Kewarganegaraan (KTP)", fileKtp, setFileKtp)}
                {renderDynamicBlock("Dokumen Pendukung Lainnya", fileBuktiPabrik, setFileBuktiPabrik)}
              </>
            ) : (
              <>
                <div style={sectionStyle}>
                  <h4 style={sectionTitle}>1.a. Profil Perusahaan (Kantor)</h4>
                  <div style={grid2Col}>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Perusahaan:</label><input type="text" value={namaPerusahaan} readOnly style={readOnlyStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Status Perusahaan:</label>
                      <select value={statusKantor} onChange={(e) => setStatusKantor(e.target.value)} style={inputStyle}><option value="PMDN">PMDN</option><option value="PMA">PMA</option></select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Alamat Kantor:</label><textarea rows="2" value={alamatKantor} onChange={(e) => setAlamatKantor(e.target.value)} style={inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Telepon:</label><input type="text" value={teleponKantor} onChange={(e) => setTeleponKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Fax:</label><input type="text" value={faxKantor} onChange={(e) => setFaxKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Email:</label><input type="email" value={emailKantor} onChange={(e) => setEmailKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Website:</label><input type="text" value={websiteKantor} onChange={(e) => setWebsiteKantor(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Narahubung (PIC):</label><input type="text" value={picKantor} onChange={(e) => setPicKantor(e.target.value)} style={inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Akta Pendirian/Perusahaan:</label><textarea rows="2" value={aktaKantor} onChange={(e) => setAktaKantor(e.target.value)} style={inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NPWP:</label><input type="text" value={npwpKantor} onChange={(e) => setNpwpKantor(e.target.value)} style={inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>IUI / NIB:</label><input type="text" value={noIzin} onChange={(e) => setNoIzin(e.target.value)} style={inputStyle} /></div>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h4 style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span>1.b. Profil Perusahaan (Pabrik)</span>
                    <label style={{ fontSize: '13px', fontWeight: 'normal', color: '#1565c0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#e3f2fd', padding: '5px 10px', borderRadius: '4px', border: '1px solid #90caf9' }}>
                      <input type="checkbox" checked={samaDenganKantor} onChange={(e) => setSamaDenganKantor(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                      <b>Data pabrik sama dengan data kantor</b>
                    </label>
                  </h4>
                  <div style={grid2Col}>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nama Perusahaan:</label><input type="text" value={namaPerusahaan} readOnly style={readOnlyStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Status Perusahaan:</label>
                      <select value={statusPabrik} onChange={(e) => setStatusPabrik(e.target.value)} disabled={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle}><option value="PMDN">PMDN</option><option value="PMA">PMA</option></select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Alamat Pabrik:</label><textarea rows="2" value={alamatPabrik} onChange={(e) => setAlamatPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Telepon:</label><input type="text" value={teleponPabrik} onChange={(e) => setTeleponPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Fax:</label><input type="text" value={faxPabrik} onChange={(e) => setFaxPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Email:</label><input type="email" value={emailPabrik} onChange={(e) => setEmailPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Website:</label><input type="text" value={websitePabrik} onChange={(e) => setWebsitePabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Narahubung (PIC):</label><input type="text" value={picPabrik} onChange={(e) => setPicPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontWeight: 'bold', fontSize: '13px' }}>Akta Pendirian/Perusahaan:</label><textarea rows="2" value={aktaPabrik} onChange={(e) => setAktaPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle}></textarea></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>NPWP:</label><input type="text" value={npwpPabrik} onChange={(e) => setNpwpPabrik(e.target.value)} readOnly={samaDenganKantor} style={samaDenganKantor ? readOnlyStyle : inputStyle} /></div>
                    <div><label style={{ fontWeight: 'bold', fontSize: '13px' }}>IUI / NIB:</label><input type="text" value={noIzin} onChange={(e) => setNoIzin(e.target.value)} style={inputStyle} /></div>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h4 style={sectionTitle}>2 & 3. Berkas Struktur Organisasi & Alur Produksi</h4>
                  <div style={grid2Col}>
                    <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>2. Struktur Organisasi Perusahaan (Gambar):</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileStruktur(e.target.files[0])} style={{ flex: 1 }} />
                        <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileStruktur} />
                      </div>
                      <ImagePreview file={fileStruktur} targetWidth="7 cm" />
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>3. Diagram Alur Proses Produksi (Gambar):</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileAlurProduksi(e.target.files[0])} style={{ flex: 1 }} />
                        <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileAlurProduksi} />
                      </div>
                      <ImagePreview file={fileAlurProduksi} targetWidth="7 cm" />
                    </div>
                  </div>
                </div>

                {renderDynamicBlock("4. Bukti Kepemilikan Pabrik / Fasilitas Produksi", fileBuktiPabrik, setFileBuktiPabrik)}
                {renderDynamicBlock("5. Data Rincian BoM / Gambar Teknik", fileBom, setFileBom)}
                {renderDynamicBlock("6. Sertifikat TKDN Komponen Utama", fileSertifikatTkdn, setFileSertifikatTkdn)}
                {renderDynamicBlock("7. Bukti Pembelian Komponen Utama", fileBuktiBeli, setFileBuktiBeli)}
                {renderDynamicBlock("8. Kartu Identitas Kewarganegaraan (KTP)", fileKtp, setFileKtp)}
              </>
            )}
          </div> 
        )}

        {/* ========================================== */}
        {/* MENU 5: LAMPIRAN */}
        {/* ========================================== */}
        {activeTab === 5 && (
          <div>
            <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>Berkas Lampiran LHV Dokumen</h3>
            
            <h4 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px', color: '#0d47a1' }}>1. Legalitas Perusahaan</h4>
            {renderDynamicBlock("a. NIB RBA", fileNibRba, setFileNibRba)}
            {renderDynamicBlock("b. Sertifikat Standar", fileSertifikatStandar, setFileSertifikatStandar)}
            {renderDynamicBlock("c. Surat Izin Operasional / IZIN", fileIzinUsaha, setFileIzinUsaha)}
            {renderDynamicBlock("d. NPWP Perusahaan", fileNpwpLampiran, setFileNpwpLampiran)}
            
            {jenisLhv !== 'BMP' && (
              <>
                {renderDynamicBlock("e. Sertifikat Merek", fileSertifikatMerek, setFileSertifikatMerek)}
                {renderDynamicBlock("f. Sertifikat Produk", fileSertifikatProduk, setFileSertifikatProduk)}
                {renderDynamicBlock("g. NIE", fileNie, setFileNie)}
                {renderDynamicBlock("h. BPOM", fileBpom, setFileBpom)}
              </>
            )}

            <h4 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px', color: '#0d47a1', marginTop: '30px' }}>2. Foto Produk & Lampiran Teknis</h4>
            {renderDynamicBlock("a. Foto Produk Akhir", fileFotoProduk, setFileFotoProduk)}
            
            {jenisLhv !== 'BMP' && (
              <div style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>b. Rekapitulasi Bahan Baku</h4>

                <div style={{ display: 'flex', gap: '15px', margin: '0 0 15px 0' }}>
                  <label style={{ fontWeight: 'normal', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" checked={modeRekapBahanBaku === 'tabel'} onChange={() => setModeRekapBahanBaku('tabel')} /> 📝 Input Tabel Dinamis
                  </label>
                  <label style={{ fontWeight: 'normal', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" checked={modeRekapBahanBaku === 'upload'} onChange={() => setModeRekapBahanBaku('upload')} /> 📤 Upload Dokumen (PDF/Gambar)
                  </label>
                </div>

                {modeRekapBahanBaku === 'tabel' ? (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                          <th style={{ padding: '8px', border: '1px solid #ccc', width:'40px', textAlign:'center' }}>No</th>
                          <th style={{ padding: '8px', border: '1px solid #ccc' }}>Bahan Baku</th>
                          <th style={{ padding: '8px', border: '1px solid #ccc' }}>Produsen/Pemasok</th>
                          <th style={{ padding: '8px', border: '1px solid #ccc', width:'90px' }}>Asal</th>
                          <th style={{ padding: '8px', border: '1px solid #ccc', width:'60px', textAlign:'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapBahanBaku.map((item, index) => (
                          <tr key={item.id}>
                            <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ padding: '8px', border: '1px solid #ccc' }}><input type="text" value={item.nama_bahan} onChange={(e) => updateRekap(item.id, 'nama_bahan', e.target.value)} style={{ width: '100%', padding: '5px', boxSizing:'border-box' }} /></td>
                            <td style={{ padding: '8px', border: '1px solid #ccc' }}><input type="text" value={item.produsen} onChange={(e) => updateRekap(item.id, 'produsen', e.target.value)} style={{ width: '100%', padding: '5px', boxSizing:'border-box' }} /></td>
                            <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                              <select value={item.asal} onChange={(e) => updateRekap(item.id, 'asal', e.target.value)} style={{ padding: '5px', width:'100%' }}>
                                <option value="DN">DN</option><option value="LN">LN</option>
                              </select>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}><button type="button" onClick={() => removeRekap(item.id)} style={{ color: '#c62828', backgroundColor:'transparent', border:'none', cursor: 'pointer', fontWeight:'bold' }}>X</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" onClick={addRekap} style={{ padding: '8px 15px', backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px dashed #1e88e5', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight:'bold' }}>+ Tambah Baris Bahan Baku</button>
                  </>
                ) : (
                  <div>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>Upload dokumen rekapitulasi bahan baku yang sudah tersedia dari perusahaan (PDF akan otomatis dipecah per halaman kalau lebih dari 1 halaman).</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="file" accept="image/png, image/jpeg, application/pdf" onChange={(e) => setFileRekapBahanBaku(e.target.files[0])} style={{ flex: 1 }} />
                      <GDriveButton mimeTypes={MIME_DOKUMEN} onFile={setFileRekapBahanBaku} />
                    </div>
                    <ImagePreview file={fileRekapBahanBaku} targetWidth="Lebar penuh tabel" />
                  </div>
                )}
              </div>
            )}

            {jenisLhv !== 'BMP' && renderDynamicBlock("c. Foto Bahan Baku", fileFotoBahanBaku, setFileFotoBahanBaku)}
            {jenisLhv !== 'BMP' && (
              <>
                <ReuseButton label='Gunakan file yang sama dari "Bukti Pembelian Komponen Utama" (kalau dokumennya sama)' onClick={() => salinDariDaftar(fileBuktiBeli, setFileInvoiceBahanBaku, 'Invoice Pembelian Bahan Baku')} />
                {renderDynamicBlock("d. Invoice Pembelian Bahan Baku", fileInvoiceBahanBaku, setFileInvoiceBahanBaku)}
              </>
            )}
            {jenisLhv !== 'BMP' && (
              <>
                <ReuseButton label='Gunakan file yang sama dari "Diagram Alur Proses Produksi" (Ringkasan Eksekutif)' onClick={() => salinFileTunggal(fileAlurProduksi, setFileAlurProsesLampiran, 'Alur Proses Produksi')} />
                {renderDynamicBlock("e. Alur Proses Produksi Pabrik", fileAlurProsesLampiran, setFileAlurProsesLampiran)}
              </>
            )}

            <h4 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px', color: '#0d47a1', marginTop: '30px' }}>3. Fasilitas Produksi (Pabrik)</h4>
            {renderDynamicBlock("a. Foto Lingkungan Pabrik / Fasilitas Produksi", fileBuktiPabrik, setFileBuktiPabrik)}
            {renderDynamicBlock("b. Foto Alat Kerja / Mesin Peralatan Produksi", fileFotoMesin, setFileFotoMesin)}
            
            {jenisLhv !== 'BMP' && (
              <>
                {renderDynamicBlock("c. Daftar Gaji Tenaga Kerja dan Kewarganegaraan", fileDaftarGaji, setFileDaftarGaji)}
                <ReuseButton label='Gunakan file yang sama dari "Kartu Identitas Kewarganegaraan (KTP)" yang sudah diupload' onClick={() => salinDariDaftar(fileKtp, setFileSampelKtp, 'KTP Karyawan')} />
                {renderDynamicBlock("d. Sampel Dokumen Identitas Tenaga Kerja (KTP)", fileSampelKtp, setFileSampelKtp)}
                <ReuseButton label='Gunakan file yang sama dari "Struktur Organisasi" yang sudah diupload' onClick={() => salinFileTunggal(fileStruktur, setFileStrukturPabrik, 'Struktur Pabrik')} />
                {renderDynamicBlock("e. Struktur Organisasi Pabrik", fileStrukturPabrik, setFileStrukturPabrik)}
                {renderDynamicBlock("f. Daftar Penyusutan Alat Mesin", fileDaftarPenyusutan, setFileDaftarPenyusutan)}
                {renderDynamicBlock("g. Bukti Pembayaran Token/Listrik", fileBuktiListrik, setFileBuktiListrik)}
                {renderDynamicBlock("h. Akta Sewa / Kepemilikan Tempat", fileAktaSewa, setFileAktaSewa)}
              </>
            )}

            <h4 style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px', color: '#0d47a1', marginTop: '30px' }}>4. Dokumen Kunjungan Verifikasi Lapangan</h4>
            {renderDynamicBlock("Foto Kunjungan On-Site (Geotagging)", fileGeotagging, setFileGeotagging)}
          </div>
        )}

        {/* NAVIGASI TOMBOL FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <div>
            <button 
              type="button" 
              onClick={() => { saveDraft(); setActiveTab(prev => prev > 1 ? prev - 1 : prev); }} 
              disabled={activeTab === 1} 
              style={{ padding: '10px 20px', backgroundColor: activeTab === 1 ? '#e0e0e0' : '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
            >
              &laquo; Sebelumnya
            </button>
            <button 
              type="button" 
              onClick={hapusDraft} 
              style={{ padding: '10px 15px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🗑️ Mulai Laporan Baru (Hapus Draft)
            </button>
          </div>

          {activeTab < 5 ? (
          <button 
            type="button" 
            onClick={() => { saveDraft(); setActiveTab(activeTab + 1); }} 
            style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Selanjutnya &raquo;
          </button>
        ) : (
          <button 
            type="submit" 
            style={{ padding: '15px 30px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
          >
            💾 Simpan & Generate Word LHV
          </button>
        )}
        </div>
      </form>
    </div>
  )
}

// (tidak ada export ES module - App dipasang lewat ReactDOM di index.html)
