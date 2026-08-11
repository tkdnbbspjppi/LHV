/* ==========================================================================
   gdrive-picker.js
   ------------------------------------------------------------------------
   Integrasi Google Drive: memilih file (gambar/PDF/Excel) langsung dari
   Google Drive milik verifikator, lalu diunduh sebagai Blob di browser --
   dari situ diperlakukan PERSIS seperti file yang dipilih lewat
   <input type="file"> biasa (tidak ada perbedaan bagi kode lain).

   WAJIB DIISI oleh pemilik aplikasi (lihat README bagian "Setup Google
   Drive"): butuh API Key & OAuth Client ID dari Google Cloud Console
   milik BBSPJPPI/Kemenperin sendiri (gratis, tapi wajib didaftarkan
   sendiri -- aplikasi pihak ketiga seperti ini tidak boleh memakai
   kredensial orang lain).
   ========================================================================== */

(function (global) {
  'use strict';

  // ------------------------------------------------------------------
  // ISI DI SINI setelah setup di Google Cloud Console (lihat README):
  // ------------------------------------------------------------------
  const GOOGLE_API_KEY = 'ISI_API_KEY_ANDA_DI_SINI';
  const GOOGLE_CLIENT_ID = 'ISI_OAUTH_CLIENT_ID_ANDA_DI_SINI.apps.googleusercontent.com';
  // ------------------------------------------------------------------

  const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

  let gapiLoaded = false;
  let pickerLoaded = false;
  let tokenClient = null;
  let accessToken = null;
  let accessTokenExpiry = 0;

  function isConfigured() {
    return (
      GOOGLE_API_KEY &&
      !GOOGLE_API_KEY.startsWith('ISI_') &&
      GOOGLE_CLIENT_ID &&
      !GOOGLE_CLIENT_ID.startsWith('ISI_')
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureGapiPicker() {
    if (!pickerLoaded) {
      await loadScript('https://apis.google.com/js/api.js');
      await new Promise((resolve) => window.gapi.load('picker', resolve));
      pickerLoaded = true;
    }
  }

  async function ensureGis() {
    if (!gapiLoaded) {
      await loadScript('https://accounts.google.com/gsi/client');
      gapiLoaded = true;
    }
  }

  async function ensureAccessToken() {
    await ensureGis();
    const now = Date.now();
    if (accessToken && now < accessTokenExpiry - 30000) return accessToken;

    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          callback: () => {}, // diisi ulang tiap panggilan di bawah
        });
      }
      tokenClient.callback = (resp) => {
        if (resp.error) {
          reject(new Error('Gagal login Google Drive: ' + resp.error));
          return;
        }
        accessToken = resp.access_token;
        accessTokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
        resolve(accessToken);
      };
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  // mimeTypes: array MIME type yang boleh dipilih, mis.
  // ['image/png','image/jpeg','application/pdf']
  async function pickFileFromDrive(mimeTypes) {
    if (!isConfigured()) {
      throw new Error(
        'Fitur Google Drive belum diaktifkan oleh admin aplikasi (API Key / Client ID Google belum diisi di gdrive-picker.js). Lihat README bagian "Setup Google Drive".'
      );
    }
    await ensureGapiPicker();
    const token = await ensureAccessToken();

    return new Promise((resolve, reject) => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setMimeTypes((mimeTypes || []).join(','))
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            try {
              const doc = data.docs[0];
              const blob = await downloadDriveFile(doc.id, token);
              const file = new File([blob], doc.name, { type: doc.mimeType || blob.type });
              resolve(file);
            } catch (e) {
              reject(e);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve(null); // dibatalkan user, bukan error
          }
        })
        .build();
      picker.setVisible(true);
    });
  }

  async function downloadDriveFile(fileId, token) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) {
      throw new Error('Gagal mengunduh file dari Google Drive (status ' + res.status + ')');
    }
    return res.blob();
  }

  global.GDrivePicker = { pickFileFromDrive, isConfigured };
})(window);
