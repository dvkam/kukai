# Advanced toggle

Use `app-ui-toggle-advanced` to turn a setting on or off or to disclose optional content. Both variants render a native button. Supply a short `text` label that names the setting or the content and stays the same when state changes. Missing or blank text falls back to `Advanced:`.

| Input or output | Type                       | Behavior                                                                                                                    |
| --------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `mode`          | `'switch' \| 'disclosure'` | `switch` is the compatibility default. A switch reports `aria-checked`. A disclosure reports `aria-expanded` on its button. |
| `state`         | `boolean`                  | The caller can set or reset the current state. Use `[(state)]` when the same property drives visibility.                    |
| `default`       | `boolean`                  | Initial state when the caller omits `state`. It defaults to `false`.                                                        |
| `stateChange`   | `boolean`                  | Emits the next state once per activation. Setting an input does not emit.                                                   |
| `controls`      | `string`, optional         | ID of a related element that stays mounted. The button omits `aria-controls` when there is no ID.                           |

Tab focuses the button. Enter, Space and pointer activation toggle the state. Focus stays on the button when opened or closed from there. Place disclosed fields after their button in the tab order. If another action closes the disclosure with focus inside, the caller must move focus to the button or the next logical control. The caller owns content visibility, disabled fields and local errors. Associate validation messages with their fields. A control embedded in a form does not submit it.

The outline uses the `--focus-ring` theme role. The indicator uses `--motion-toggle-duration`. With reduced motion the indicator snaps to the new state. The content's visibility changes immediately in either mode.

Ledger import uses a named switch to enable its derivation path. [Ledger template](../../../../views/start/login-types/connect-ledger/connect-ledger.component.html)

Recovery import uses a disclosure with a persistent ID for the optional passphrase. [Recovery template](../../../../views/start/login-types/mnemonic-import/mnemonic-import.component.html)

The operation dialog uses a disclosure for fee options. [Fee template](../../../../modals/operations/fee-display/fee-display.component.html)

Run `npm run lint` and `npm run typecheck`. CI checks the control, the complete Ledger and fee templates, and toggle bindings in other real callers. It also checks intentional invalid consumers. The template linter checks button content, type, keyboard activation and focus. Run the toggle and import specs in Chrome to check behavior. [Toggle spec](advanced.component.spec.ts) · [Import spec](../../../../views/start/login-types/mnemonic-import/mnemonic-import.component.spec.ts)
