import {
  isUnoerpConfigured,
  readUnoerpApiKey,
  readUnoerpApiPassword,
  readUnoerpApiUser,
  readUnoerpBaseUrl,
  readUnoerpTimeoutMs,
} from "@/lib/env/unoerp.server";
import { UnoerpError } from "@/lib/integrations/unoerp/errors";

type UnoerpAuthResponse = { auth?: string; uid?: string };

// ponytail: token in-memory; cold start / multi-instance = re-login. Upgrade: shared cache con TTL.
let cachedAuthToken: string | null = null;

function unoerpApiUrl(): string {
  const base = readUnoerpBaseUrl();
  if (!base) throw new UnoerpError("UNOERP_AUTH_ERROR", "UNOERP_BASE_URL missing");
  return `${base.replace(/\/$/, "")}/intranet/api.php`;
}

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

async function loginWithBasicAuth(): Promise<UnoerpAuthResponse> {
  const user = readUnoerpApiUser();
  const password = readUnoerpApiPassword();
  if (!user || password == null) {
    throw new UnoerpError("UNOERP_AUTH_ERROR", "UnoERP credentials missing");
  }
  const url = unoerpApiUrl();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), readUnoerpTimeoutMs());
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(user, password),
        Accept: "application/json",
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      throw new UnoerpError("UNOERP_AUTH_ERROR", "UnoERP login failed", { httpStatus: res.status, retryable: false });
    }
    if (!res.ok) {
      throw new UnoerpError("UNOERP_VALIDATION_ERROR", `UnoERP login HTTP ${res.status}`, {
        httpStatus: res.status,
        retryable: res.status >= 500,
      });
    }
    const data = (await res.json()) as UnoerpAuthResponse;
    if (!data.auth) {
      throw new UnoerpError("UNOERP_AUTH_ERROR", "UnoERP login response missing auth token", { retryable: false });
    }
    return data;
  } catch (e) {
    if (e instanceof UnoerpError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new UnoerpError("UNOERP_TIMEOUT", "UnoERP login timed out", { retryable: true });
    }
    throw new UnoerpError("UNOERP_NETWORK_ERROR", e instanceof Error ? e.message : "network", { retryable: true });
  } finally {
    clearTimeout(t);
  }
}

/** Solo login/token check — nessuna chiamata info/index/show/create/update/delete. */
export async function verifyUnoerpConnection(): Promise<{ ok: true; uid?: string }> {
  if (!isUnoerpConfigured()) {
    throw new UnoerpError("UNOERP_AUTH_ERROR", "UnoERP credentials missing");
  }
  const token = readUnoerpApiKey();
  if (token) return { ok: true };
  const data = await loginWithBasicAuth();
  return { ok: true, uid: data.uid };
}

export async function resolveUnoerpAuthToken(): Promise<string> {
  const token = readUnoerpApiKey();
  if (token) return token;
  if (cachedAuthToken) return cachedAuthToken;
  const data = await loginWithBasicAuth();
  cachedAuthToken = data.auth!;
  return data.auth!;
}
