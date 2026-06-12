import { NextRequest } from "next/server";
import sharp from "sharp";
import { fetchBrandingLogoBytes, fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";

export const runtime = "nodejs";

type OutputFormat = "avif" | "webp" | "png";

function resolveOutputFormat(req: NextRequest, sourceContentType: string): OutputFormat {
  const forced = req.nextUrl.searchParams.get("f");
  if (forced === "avif" || forced === "webp" || forced === "png") return forced;
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("image/avif")) return "avif";
  if (accept.includes("image/webp")) return "webp";
  if (sourceContentType.includes("svg")) return "png";
  return "webp";
}

function contentTypeFor(format: OutputFormat): string {
  if (format === "avif") return "image/avif";
  if (format === "png") return "image/png";
  return "image/webp";
}

export async function GET(req: NextRequest) {
  try {
    const settings = await fetchBrandingSettingsFromDb();
    const { bytes, contentType: sourceType } = await fetchBrandingLogoBytes(settings);
    const widthParam = req.nextUrl.searchParams.get("w");
    const maxWidth = widthParam ? Math.min(800, Math.max(32, Number.parseInt(widthParam, 10) || 0)) : 0;

    const isDefaultAsset = !settings.logoStoragePath;
    const format = isDefaultAsset && maxWidth === 0 ? "png" : resolveOutputFormat(req, sourceType);

    if (isDefaultAsset && format === "png" && maxWidth === 0) {
      return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    let pipeline = sharp(bytes, { failOn: "none" }).rotate();
    if (maxWidth > 0) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let output: Buffer;
    if (format === "avif") {
      output = await pipeline.avif({ quality: 75 }).toBuffer();
    } else if (format === "webp") {
      output = await pipeline.webp({ quality: 78 }).toBuffer();
    } else {
      output = await pipeline.png().toBuffer();
    }

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(format),
        "Cache-Control": settings.logoStoragePath ? "public, max-age=3600" : "public, max-age=86400, immutable",
        Vary: "Accept",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
