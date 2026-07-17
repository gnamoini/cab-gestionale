import type { NextRequest } from "next/server";
import { handleProxyRequest } from "@/src/middleware/proxy-handler";

/**
 * Thin entry — logica in `src/middleware/proxy-handler.ts` (no `config` lì)
 * per ridurre churn HMR / segment-config su Turbopack.
 */
export async function proxy(request: NextRequest) {
  return handleProxyRequest(request);
}

/** Compile-time literal only (no String.raw / dynamic builder). */
export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.webmanifest|sw.js|icons/).*)"],
};
