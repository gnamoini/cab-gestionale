/**
 * ponytail: one-off diagnostic for archive preview 404 — delete after use or keep for ops.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { classifyDocumentoUrlRow } from "@/lib/ops/documenti-url-inventory";
import { resolveArchiveDocumentDisplayFileName } from "@/lib/documenti/documento-tipo-file";
import { mimeTypeFromFileName, sniffMimeTypeFromBytes } from "@/lib/documents/document-mime";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import sharp from "sharp";

const IDS = [
  "7f42bfb8-aa9a-449b-b25b-e9845d5f93cf",
  "ff890fb5-d47b-4b85-a8a7-59a67c5f93d4",
  "9281f313-63f3-49c2-af5f-ea05e9fa8071",
];

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function download(
  admin: SupabaseClient,
  objectPath: string,
): Promise<{ ok: boolean; bytes?: number; error?: string }> {
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await admin.storage.from(STORAGE_BUCKETS.documenti).download(normalized);
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "empty response" };
  return { ok: true, bytes: (await data.arrayBuffer()).byteLength };
}

async function tryGenerateThumbnail(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
): Promise<{ ok: boolean; bytes?: number; error?: string; via?: string }> {
  const sniffed = sniffMimeTypeFromBytes(bytes);
  const mime = sniffed ?? (contentType || mimeTypeFromFileName(fileName));
  const isPdf = mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");
  if (!isPdf && !isImage) {
    return { ok: false, error: `unsupported mime ${mime}` };
  }
  if (isPdf) {
    try {
      const out = await sharp(bytes, { page: 0, density: 120 })
        .rotate()
        .resize({ width: 320, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 80 })
        .toBuffer();
      return { ok: true, bytes: out.length, via: "sharp" };
    } catch {
      /* poppler missing */
    }
    try {
      const { createCanvas } = await import("@napi-rs/canvas");
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, error: "no canvas ctx" };
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      const out = await sharp(canvas.toBuffer("image/png")).webp({ quality: 80 }).toBuffer();
      return { ok: true, bytes: out.length, via: "pdfjs" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "pdfjs failed" };
    }
  }
  try {
    const out = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 320, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();
    return { ok: true, bytes: out.length, via: "sharp-image" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sharp failed" };
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const key = readSupabaseServiceRoleKey();
  if (!key) {
    console.error("SUPABASE_SERVICE_ROLE_KEY mancante.");
    process.exit(1);
  }
  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const id of IDS) {
    const { data, error } = await admin
      .from("documenti")
      .select("id, url_file, categoria, meta, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.log(JSON.stringify({ id, dbError: error.message }));
      continue;
    }
    if (!data) {
      console.log(JSON.stringify({ id, dbError: "NOT FOUND" }));
      continue;
    }

    const meta = data.meta as Record<string, unknown> | null;
    const cls = classifyDocumentoUrlRow({ id, url_file: data.url_file ?? "" });
    const dl = cls.storagePath ? await download(admin, cls.storagePath) : { ok: false, error: "no resolvable path" };

    let thumb: { ok: boolean; bytes?: number; error?: string } = { ok: false, error: "no file bytes" };
    let sniffed: string | null = null;
    let magicHex: string | null = null;
    if (dl.ok && cls.storagePath) {
      const normalized = normalizeStorageObjectPath(cls.storagePath);
      const { data: blob } = await admin.storage.from(STORAGE_BUCKETS.documenti).download(normalized);
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        sniffed = sniffMimeTypeFromBytes(bytes);
        magicHex = Buffer.from(bytes.slice(0, 16)).toString("hex");
        const fileName = resolveArchiveDocumentDisplayFileName({
          nome: typeof meta?.nome === "string" ? meta.nome : "documento",
          urlFile: data.url_file ?? "",
          meta: meta ?? {},
          categoria: data.categoria,
        });
        const contentType = mimeTypeFromFileName(fileName);
        const generated = await tryGenerateThumbnail(bytes, fileName, contentType);
        thumb = generated.ok
          ? { ok: true, bytes: generated.bytes }
          : { ok: false, error: generated.error ?? "thumbnail failed" };
      }
    }

    console.log(
      JSON.stringify(
        {
          id,
          categoria: data.categoria,
          created_at: data.created_at,
          meta_nome: typeof meta?.nome === "string" ? meta.nome : null,
          meta_uploadedAt: typeof meta?.uploadedAt === "string" ? meta.uploadedAt : null,
          url_file: data.url_file,
          isLegacyHttpUrl: cls.isLegacyHttpUrl,
          hasResolvablePath: cls.hasResolvablePath,
          storagePath: cls.storagePath,
          download: dl,
          sniffedMime: sniffed,
          magicHex,
          thumbnail: thumb,
        },
        null,
        2,
      ),
    );
  }

  // User-session preview probe (RBAC + storage policy as in production)
  const email = process.env.SMOKE_ADMIN_EMAIL?.trim() ?? process.env.BENCH_ADMIN_EMAIL?.trim();
  if (email) {
    console.log("\n--- user-session preview probe skipped (implement via benchmark-auth if needed) ---");
  }
}

void main();
