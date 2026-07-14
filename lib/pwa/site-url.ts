/** Origin assoluto per metadataBase e URL Open Graph. */
export function resolveSiteMetadataBase(): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const normalized = site.replace(/\/+$/, "");
    return new URL(`${normalized}/`);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return new URL(`https://${host}/`);
  }
  return new URL("http://localhost:3000/");
}
