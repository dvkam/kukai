export function restoreInvokerFocus(targets: readonly (HTMLElement | undefined)[] = []): void {
  for (const target of targets) {
    if (!target?.isConnected || !target.getClientRects().length || target.closest('[hidden], [inert]')) continue;
    target.focus({ preventScroll: true });
    if (target.ownerDocument.activeElement === target) break;
  }
}

export function wrapDialogFocus(event: KeyboardEvent): void {
  const dialog = event.currentTarget as HTMLDialogElement;
  const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(
    (button) => button.tabIndex >= 0 && button.getClientRects().length && !button.closest('[hidden], [inert]')
  );
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.target === (event.shiftKey ? first : last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
