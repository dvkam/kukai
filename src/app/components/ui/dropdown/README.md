# Triggered panels

Use `TriggerPanelDirective` on an absolutely positioned flex menu that stays mounted between activations. Bind the invoking HTML element to `walletPanelTrigger` and the menu's boolean state to `panelOpen`. Keep the state with the existing component. Its expanded class still controls the resting display. The account picker and mobile navigation show real callers.

The panel measures its position and the trigger's center when a transition starts. Their difference gives the transform origin in panel coordinates. A second toggle reverses the animation. A closed panel becomes inert immediately. Users who prefer reduced motion get the new state immediately. A request arriving from a dApp has no local invoker and does not use this behavior.

Mobile navigation uses a named button with an expanded state, links for destinations, and buttons for actions. Escape returns focus to the menu button. The `--focus-ring` token maps the theme accent to keyboard focus. The template linter checks pointer-only handlers, focus support and image alternatives. Run npm run lint and npm run test:ci after changing the menu or directive.

The inherited wallet review tracks the outstanding dialogs, disclosures and tooltips. [UX review](https://github.com/dvkam/kukai/issues/55)

The strict Angular template target runs in `npm run typecheck`. It checks the directive example and every external component template using `walletPanelTrigger`. It requires the missing-input diagnostic for an omitted `panelOpen` and the boolean-input diagnostic for a string binding. The advanced toggle uses the same check for switches and disclosures. [Directive example](trigger-panel.directive.spec.ts) · [Advanced toggle contract](../button/toggle/advanced/README.md)
