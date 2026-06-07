import { fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await fetchBrandingSettingsFromDb();
    return Response.json(settings, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return Response.json({ primaryColor: null, logoStoragePath: null, updatedAt: null });
  }
}
