import { NextRequest } from "next/server";
import sharp from "sharp";
import { recordDecisionAlignment } from "@/lib/decision/assert-decision-alignment";
import { buildRequestContextFromServer } from "@/lib/decision/request-context";
import { getCachePolicy } from "@/lib/decision/request-decision-registry";
import { validateMediaImagePath } from "@/lib/edge/validators/media-path";
import { recordAssetCacheFromRequest } from "@/lib/observability/asset-cache-telemetry.server";
import { verifyMediaImagePathAccess } from "@/lib/media/media-image-auth.server";
import type { MediaDeliveryFormat } from "@/lib/media/media-delivery-url";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

export const runtime = "nodejs";

function parseFormat(raw: string | null, accept: string | null): MediaDeliveryFormat {
  if (raw === "avif" || raw === "webp" || raw === "jpeg") return raw;
  if (accept?.includes("image/avif")) return "avif";
  if (accept?.includes("image/webp")) return "webp";
  return "webp";
}

function contentTypeForFormat(format: MediaDeliveryFormat): string {
  if (format === "avif") return "image/avif";
  if (format === "jpeg") return "image/jpeg";
  return "image/webp";
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path");
  const pathValidation = validateMediaImagePath(rawPath, "server");
  if (!pathValidation.ok) {
    return new Response(pathValidation.error, { status: 400 });
  }

  const ctx = buildRequestContextFromServer(req);
  ctx.flags = { ...ctx.flags, normalizedStoragePath: pathValidation.normalizedPath };
  const cache = getCachePolicy(ctx);
  recordDecisionAlignment({
    ctx,
    decisionKind: "cache",
    serverValue: cache.tier,
    edgeHint: req.headers.get("x-edge-cache-policy"),
  });

  const normalized = pathValidation.normalizedPath;
  const allowed = await verifyMediaImagePathAccess(normalized);
  if (!allowed) {
    return new Response(null, { status: 403 });
  }

  const widthRaw = req.nextUrl.searchParams.get("w");
  const maxWidth = widthRaw ? Math.min(2400, Math.max(1, Number.parseInt(widthRaw, 10) || 0)) : 0;
  const format = parseFormat(req.nextUrl.searchParams.get("f"), req.headers.get("accept"));
  const t0 = performance.now();

  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb.storage.from(STORAGE_BUCKETS.images).download(normalized);
    if (error || !data) {
      return new Response(null, { status: 404 });
    }

    const input = Buffer.from(await data.arrayBuffer());
    let pipeline = sharp(input, { failOn: "none" }).rotate();
    if (maxWidth > 0) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let output: Buffer;
    if (format === "avif") {
      output = await pipeline.avif({ quality: 72 }).toBuffer();
    } else if (format === "jpeg") {
      output = await pipeline.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    } else {
      output = await pipeline.webp({ quality: 78 }).toBuffer();
    }

    const latencyMs = Math.round(performance.now() - t0);

    recordAssetCacheFromRequest(
      {
        assetType: "image",
        cacheStatus: "MISS",
        entityType: "image",
        entityId: normalized,
        latencyMs,
        source: "proxy",
        meta: {
          path: normalized,
          format,
          maxWidth,
          httpCacheImmutable: cache.tier === "immutable",
        },
      },
      req,
    );

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForFormat(format),
        "Cache-Control": cache.cacheControl,
        Vary: "Accept",
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
