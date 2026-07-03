import { createHash } from "node:crypto";
import { canonicalizeSlug } from "../canonicalize";
import { slugifyStatoId } from "@/lib/lavorazioni/stati-dynamic";

export function tkbSlugFromLabel(label: string, suffix?: string): string {
  const base = slugifyStatoId(label) || "item";
  if (!suffix) return base.slice(0, 80);
  const hash = createHash("sha256").update(suffix).digest("hex").slice(0, 6);
  return canonicalizeSlug(`${base}_${hash}`).slice(0, 80);
}

export function activityIdFromText(text: string, prefix = "act"): string {
  const slug = tkbSlugFromLabel(text, text);
  const id = `${prefix}_${slug}`.replace(/__+/g, "_").slice(0, 80);
  if (id.length >= 4 && /^[a-z0-9_]+$/.test(id)) return id;
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 8);
  return `${prefix}_${hash}`;
}
