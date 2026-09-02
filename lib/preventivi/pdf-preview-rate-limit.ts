import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  clientKeyFromRequest,
  isIpRateLimited,
  isRateLimitedWithMemoryFallback,
  type IpRateLimitConfig,
} from "@/lib/security/ip-rate-limit";

const PDF_PREVIEW_LIMIT: IpRateLimitConfig = {
  namespace: "pdf-preview-post",
  windowMs: 60_000,
  maxAttempts: 30,
};

/** Rate limit POST anteprima PDF (staff autenticato: memory/Upstash; anon: fail-closed IP). */
export async function isPdfPreviewPostRateLimited(request: Request): Promise<boolean> {
  const session = await getServerSession();
  const userId = session?.user?.id?.trim();
  if (userId) {
    return isRateLimitedWithMemoryFallback(PDF_PREVIEW_LIMIT, `user:${userId}`);
  }
  return isIpRateLimited(PDF_PREVIEW_LIMIT, clientKeyFromRequest(request));
}
