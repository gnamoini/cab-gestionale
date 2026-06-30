export type BodyScrollLockProbe = {
  evaluate<T>(fn: () => T): Promise<T>;
};

export type GestionaleMainScrollProbe = {
  hasMain: boolean;
  inlineOverflow: string;
  inlineTouchAction: string;
  mainScrollLockAttr: string | null;
  computedOverflowY: string;
  scrollable: boolean;
  scrollTop: number;
};

/** Dopo chiusura modale/drawer il documento non deve restare bloccato. */
export async function assertNoBodyScrollLock(page: BodyScrollLockProbe): Promise<void> {
  const styles = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    bodyTouchAction: document.body.style.touchAction,
    htmlOverflow: document.documentElement.style.overflow,
    htmlTouchAction: document.documentElement.style.touchAction,
    lockAttr: document.body.getAttribute("data-cab-scroll-lock-count"),
  }));
  if (
    styles.bodyOverflow === "hidden" ||
    styles.bodyTouchAction === "none" ||
    styles.htmlOverflow === "hidden" ||
    styles.htmlTouchAction === "none" ||
    styles.lockAttr
  ) {
    throw new Error(
      `assertNoBodyScrollLock: scroll still locked (${JSON.stringify(styles)})`,
    );
  }
}

/** Body + main.gestionale-scroll-y sbloccati dopo chiusura overlay (app shell). */
export async function assertGestionalePageScrollUnlocked(page: BodyScrollLockProbe): Promise<void> {
  await assertNoBodyScrollLock(page);

  const main = await page.evaluate((): GestionaleMainScrollProbe => {
    const mainEl = document.querySelector("main.gestionale-scroll-y");
    if (!(mainEl instanceof HTMLElement)) {
      return {
        hasMain: false,
        inlineOverflow: "",
        inlineTouchAction: "",
        mainScrollLockAttr: null,
        computedOverflowY: "",
        scrollable: true,
        scrollTop: 0,
      };
    }
    const before = mainEl.scrollTop;
    mainEl.scrollTop = before + 120;
    const scrolled = mainEl.scrollTop > before;
    mainEl.scrollTop = before;
    const computedOverflowY = window.getComputedStyle(mainEl).overflowY;
    return {
      hasMain: true,
      inlineOverflow: mainEl.style.overflow,
      inlineTouchAction: mainEl.style.touchAction,
      mainScrollLockAttr: mainEl.getAttribute("data-cab-main-scroll-lock"),
      computedOverflowY,
      scrollable: scrolled || mainEl.scrollHeight <= mainEl.clientHeight + 1,
      scrollTop: mainEl.scrollTop,
    };
  });

  if (!main.hasMain) return;

  if (
    main.inlineOverflow === "hidden" ||
    main.inlineTouchAction === "none" ||
    main.mainScrollLockAttr ||
    (main.computedOverflowY !== "auto" && main.computedOverflowY !== "scroll")
  ) {
    throw new Error(
      `assertGestionalePageScrollUnlocked: main scroll still locked (${JSON.stringify(main)})`,
    );
  }

  if (!main.scrollable) {
    throw new Error(
      `assertGestionalePageScrollUnlocked: main not scrollable (${JSON.stringify(main)})`,
    );
  }
}
