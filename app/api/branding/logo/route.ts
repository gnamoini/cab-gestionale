import { fetchBrandingLogoBytes, fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await fetchBrandingSettingsFromDb();
    const { bytes, contentType } = await fetchBrandingLogoBytes(settings);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": settings.logoStoragePath ? "public, max-age=3600" : "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
