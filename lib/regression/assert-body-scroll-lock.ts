export type BodyScrollLockProbe = {
  evaluate<T>(fn: () => T): Promise<T>;
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
