const MAX_BASE_LENGTH = 120;
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;
const BIDI_OVERRIDE_RE = /[\u202a-\u202e\u2066-\u2069\ufeff]/g;

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export type SanitizeCaptureFilenameInput = {
  rawFileName: string;
  expectedMime?: string | null;
  fallbackId?: string;
};

export function sanitizeCaptureFilename(input: SanitizeCaptureFilenameInput): string {
  const fallbackId = (input.fallbackId ?? "doc").slice(0, 8);
  let name = input.rawFileName.normalize("NFC").replace(/\\/g, "/");
  name = name.split("/").pop() ?? name;
  name = name.replace(/\.\./g, "").replace(CONTROL_RE, "").replace(BIDI_OVERRIDE_RE, "");
  name = name.trim();

  let base = name;
  let ext = "";
  const dot = name.lastIndexOf(".");
  if (dot > 0) {
    base = name.slice(0, dot);
    ext = name.slice(dot).toLowerCase();
  }

  base = base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  if (base.length > MAX_BASE_LENGTH) {
    base = base.slice(0, MAX_BASE_LENGTH);
  }

  const allowedExt = input.expectedMime ? EXT_BY_MIME[input.expectedMime] : undefined;
  if (allowedExt) {
    ext = allowedExt;
  } else if (!ext || ext.length > 8) {
    ext = ".bin";
  }

  if (!base) {
    return `document-${fallbackId}${ext}`;
  }

  return `${base}${ext}`;
}
