import type { MezzoLinkStatus } from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoLinkOrigin } from "@/lib/schede/scheda-ingresso-mezzo-match";

export type MezzoPrefillPolicy = "manual_selected" | "confirmed_match" | "no_prefill";

export function canPrefillSchedaFromMezzo(policy: MezzoPrefillPolicy): boolean {
  return policy === "manual_selected" || policy === "confirmed_match";
}

export function resolveMezzoPrefillPolicy(input: {
  linkOrigin?: MezzoLinkOrigin | null;
  linkStatus: MezzoLinkStatus;
  confirmed?: boolean;
}): MezzoPrefillPolicy {
  const { linkOrigin, linkStatus, confirmed } = input;

  if (linkOrigin === "created_new") return "no_prefill";
  if (linkOrigin === "unresolved_duplicate") return "no_prefill";

  if (linkStatus === "unconfirmed_match") return "no_prefill";

  if (linkStatus === "linked") {
    if (linkOrigin === "selected_by_user") return "manual_selected";
    if (linkOrigin === "auto_confirmed" && confirmed) return "confirmed_match";
    if (confirmed) return "confirmed_match";
    return "no_prefill";
  }

  return "no_prefill";
}

export function mezzoLinkOriginFromPrefillPolicy(
  policy: MezzoPrefillPolicy,
): MezzoLinkOrigin | null {
  if (policy === "manual_selected") return "selected_by_user";
  if (policy === "confirmed_match") return "auto_confirmed";
  return null;
}
