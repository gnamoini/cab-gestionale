export type PdfDeliveryPhases = {
  authMs: number;
  dataFetchMs: number;
  hashMs: number;
  storageMs: number;
  generateMs: number;
  uploadMs: number;
  totalMs: number;
};

export type PdfPhaseTimer = {
  markAuthEnd: () => void;
  markDataFetchEnd: () => void;
  markHashEnd: () => void;
  markStorageEnd: () => void;
  markGenerateEnd: () => void;
  markUploadEnd: () => void;
  finish: () => PdfDeliveryPhases;
};

export function createPdfPhaseTimer(): PdfPhaseTimer {
  const t0 = performance.now();
  let authEnd = t0;
  let dataFetchEnd = t0;
  let hashEnd = t0;
  let storageEnd = t0;
  let generateEnd = t0;
  let uploadEnd = t0;

  return {
    markAuthEnd: () => {
      authEnd = performance.now();
    },
    markDataFetchEnd: () => {
      dataFetchEnd = performance.now();
    },
    markHashEnd: () => {
      hashEnd = performance.now();
    },
    markStorageEnd: () => {
      storageEnd = performance.now();
    },
    markGenerateEnd: () => {
      generateEnd = performance.now();
    },
    markUploadEnd: () => {
      uploadEnd = performance.now();
    },
    finish: () => {
      const totalEnd = performance.now();
      return {
        authMs: Math.round(authEnd - t0),
        dataFetchMs: Math.round(dataFetchEnd - authEnd),
        hashMs: Math.round(hashEnd - dataFetchEnd),
        storageMs: Math.round(storageEnd - hashEnd),
        generateMs: Math.round(generateEnd - storageEnd),
        uploadMs: Math.round(uploadEnd - generateEnd),
        totalMs: Math.round(totalEnd - t0),
      };
    },
  };
}

export function pdfPhaseResponseHeaders(phases: PdfDeliveryPhases): Record<string, string> {
  return {
    "X-PDF-Phase-Auth-Ms": String(phases.authMs),
    "X-PDF-Phase-Data-Ms": String(phases.dataFetchMs),
    "X-PDF-Phase-Hash-Ms": String(phases.hashMs),
    "X-PDF-Phase-Storage-Ms": String(phases.storageMs),
    "X-PDF-Phase-Generate-Ms": String(phases.generateMs),
    "X-PDF-Phase-Upload-Ms": String(phases.uploadMs),
    "Server-Timing": [
      `auth;dur=${phases.authMs}`,
      `data;dur=${phases.dataFetchMs}`,
      `hash;dur=${phases.hashMs}`,
      `storage;dur=${phases.storageMs}`,
      `generate;dur=${phases.generateMs}`,
      `upload;dur=${phases.uploadMs}`,
    ].join(", "),
  };
}
