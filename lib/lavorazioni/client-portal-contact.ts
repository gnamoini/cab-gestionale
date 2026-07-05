/** SSOT contatti Portale Cliente — solo link nativi (tel / mailto / wa.me). */
export const CLIENT_PORTAL_CONTACT = {
  email: "service@autocompattatori.it",
  phoneDisplay: "+39 3480712791",
  telHref: "tel:+393480712791",
  mailtoHref: "mailto:service@autocompattatori.it",
  whatsappHref: "https://wa.me/393480712791",
} as const;

/** ponytail: fallback programmatico — WebView/modali a volte ignorano click su mailto/tel. */
export function openNativeContactHref(href: string): void {
  if (typeof window === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
