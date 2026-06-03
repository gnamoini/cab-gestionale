import { clientKeyFromRequest, isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const PDF_PREVIEW_LIMIT: IpRateLimitConfig = {
  namespace: "pdf-preview-post",
  windowMs: 60_000,
  maxAttempts: 30,
};

/** Rate limit POST anteprima PDF (per IP; Upstash se configurato). */
export async function isPdfPreviewPostRateLimited(request: Request): Promise<boolean> {
  return isIpRateLimited(PDF_PREVIEW_LIMIT, clientKeyFromRequest(request));
}
