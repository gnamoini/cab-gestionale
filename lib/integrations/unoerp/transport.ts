import { readUnoerpBaseUrl, readUnoerpTimeoutMs } from "@/lib/env/unoerp.server";
import { resolveUnoerpAuthToken } from "@/lib/integrations/unoerp/auth-connection";
import { UnoerpError } from "@/lib/integrations/unoerp/errors";
import { buildUnoerpFormBody, UNOERP_FORM_CONTENT_TYPE } from "@/lib/integrations/unoerp/request-encoding";

export async function unoerpTransportRequest<T = unknown>(params: Record<string, unknown>): Promise<T> {
  const base = readUnoerpBaseUrl();
  if (!base) throw new UnoerpError("UNOERP_AUTH_ERROR", "UNOERP_BASE_URL missing");
  const url = `${base.replace(/\/$/, "")}/intranet/api.php`;
  const auth = await resolveUnoerpAuthToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), readUnoerpTimeoutMs());
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": UNOERP_FORM_CONTENT_TYPE, Accept: "application/json" },
      body: buildUnoerpFormBody({ auth, ...params }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new UnoerpError("UNOERP_VALIDATION_ERROR", `Non-JSON response HTTP ${res.status}`, {
          httpStatus: res.status,
          retryable: false,
        });
      }
    }
    if (res.status === 401 || res.status === 403) {
      throw new UnoerpError("UNOERP_AUTH_ERROR", "UnoERP auth failed", { httpStatus: res.status, retryable: false });
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error?: unknown }).error)
          : `HTTP ${res.status}`;
      throw new UnoerpError("UNOERP_VALIDATION_ERROR", msg, { httpStatus: res.status, retryable: res.status >= 500 });
    }
    return parsed as T;
  } catch (e) {
    if (e instanceof UnoerpError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new UnoerpError("UNOERP_TIMEOUT", "UnoERP request timed out", { retryable: true });
    }
    throw new UnoerpError("UNOERP_NETWORK_ERROR", e instanceof Error ? e.message : "network", { retryable: true });
  } finally {
    clearTimeout(t);
  }
}
