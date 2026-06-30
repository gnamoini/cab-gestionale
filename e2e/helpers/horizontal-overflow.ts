/** Assert orizzontale: shell, main e document — nessun clip oltre innerWidth. */
export type HorizontalOverflowAudit = {
  ok: boolean;
  innerWidth: number;
  shell: { scrollWidth: number; clientWidth: number } | null;
  main: { scrollWidth: number; clientWidth: number } | null;
  document: { scrollWidth: number; clientWidth: number };
  offenders: Array<{ tag: string; right: number; innerWidth: number }>;
};

export type ModalHorizontalOverflowAudit = {
  ok: boolean;
  innerWidth: number;
  modal: { scrollWidth: number; clientWidth: number; right: number; left: number } | null;
  document: { scrollWidth: number; clientWidth: number };
};

export async function auditHorizontalOverflow(page: import("@playwright/test").Page): Promise<HorizontalOverflowAudit> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const shell = document.querySelector(".cab-app-shell");
    const main = document.querySelector("main.gestionale-scroll-y, main");
    const doc = document.documentElement;

    const offenders: Array<{ tag: string; right: number; innerWidth: number }> = [];
    const probe = document.querySelector(".cab-page-header-top-row, .lavorazioni-scroll-scope, main");
    if (probe instanceof HTMLElement) {
      const rect = probe.getBoundingClientRect();
      if (rect.right > innerWidth + 2) {
        offenders.push({ tag: probe.tagName, right: rect.right, innerWidth });
      }
    }

    const shellOk =
      !shell || (shell instanceof HTMLElement && shell.scrollWidth <= shell.clientWidth + 2);
    const mainOk =
      !main || (main instanceof HTMLElement && main.scrollWidth <= main.clientWidth + 2);
    const docOk = doc.scrollWidth <= doc.clientWidth + 2;
    const offenderOk = offenders.length === 0;

    return {
      ok: shellOk && mainOk && docOk && offenderOk,
      innerWidth,
      shell:
        shell instanceof HTMLElement
          ? { scrollWidth: shell.scrollWidth, clientWidth: shell.clientWidth }
          : null,
      main:
        main instanceof HTMLElement
          ? { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth }
          : null,
      document: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth },
      offenders,
    };
  });
}

/** Assert orizzontale sul dialog modale aperto (`data-cab-modal-root`). */
export async function auditModalHorizontalOverflow(
  page: import("@playwright/test").Page,
): Promise<ModalHorizontalOverflowAudit> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const modal = document.querySelector("[data-cab-modal-root]");
    const doc = document.documentElement;

    let modalData: ModalHorizontalOverflowAudit["modal"] = null;
    let modalOk = true;
    if (modal instanceof HTMLElement) {
      const rect = modal.getBoundingClientRect();
      modalData = {
        scrollWidth: modal.scrollWidth,
        clientWidth: modal.clientWidth,
        right: rect.right,
        left: rect.left,
      };
      modalOk =
        modal.scrollWidth <= modal.clientWidth + 2 &&
        rect.right <= innerWidth + 2 &&
        rect.left >= -2;
    }

    const docOk = doc.scrollWidth <= doc.clientWidth + 2;

    return {
      ok: modalOk && docOk,
      innerWidth,
      modal: modalData,
      document: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth },
    };
  });
}
