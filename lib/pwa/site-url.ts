import { resolveCanonicalSiteOrigin } from "@/lib/core/site-origin";

/** Origin assoluto per metadataBase e URL Open Graph. */
export function resolveSiteMetadataBase(): URL {
  return new URL(`${resolveCanonicalSiteOrigin().origin}/`);
}
