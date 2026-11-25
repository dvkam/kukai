# Accounts dialog

`app-account-list` takes a required `title: string` and an optional `activeAccount: Account | null`. It stays mounted on the signed-in routes and reads wallet updates for its rows and balances. The header opens it with the `account-list` modal event and a `DialogInvocation`. The picker captures the position of Show All before closing. Header supplies the initiating picker and its responsive counterpart as focus destinations.

The heading names the native dialog. Close receives initial focus. Tab cycles through account links and their separate Copy address buttons. Escape and Close return focus to the visible picker. Selecting an account dismisses the dialog and keeps the account subpage. Modified clicks follow the browser's link behavior. A missing account list shows an empty message with Close available. The read-only social picker exposes no Show All action.

`InvokedDialog` shares motion and teardown with Receive. `invokerBounds` preserves the location of a control in a closing panel. Without a captured box, the helper tracks the invoker while it remains visible. Normal motion scales and fades the panel about that point. Reduced motion skips the transition. Dismissal releases native modality before any exit animation finishes.

`--dialog-surface`, `--dialog-text` and `--dialog-focus-ring` map the shared dialog roles to the current wallet theme. `--account-current-surface` indicates the active account row, which the link also exposes with `aria-current`.
