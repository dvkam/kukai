export function restoreInvokerFocus(targets: readonly (HTMLElement | undefined)[] = []): void {
  for (const target of targets) {
    if (!target?.isConnected || !target.getClientRects().length || target.closest('[hidden], [inert]')) continue;
    target.focus({ preventScroll: true });
    if (target.ownerDocument.activeElement === target) break;
  }
}
