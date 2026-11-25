# React toolchain experiment

This project renders a read-only account preview using sample data. It lives under the Kukai repository with its own package manifest and lockfile. The Angular wallet continues to use the root package scripts.

Run the checks from this directory with Node 26.13.1 and pnpm 12.23.0.

```sh
pnpm install --frozen-lockfile
pnpm dedupe --check
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

For local development, run `pnpm dev`. After editing a CSS module, run `pnpm styles:types` and include the updated declaration. The typecheck verifies both declaration freshness and the entire TypeScript 7.0.2 project.

A separate TypeScript 7.1 beta probe with `typed-css-modules-mapper` inferred CSS classes straight from the stylesheet and rejected a misspelled class with TS2551. The probe required `--runExternalCode` to run the mapper. The experiment checks generated declarations with stable TypeScript. [TypeScript 7.1 beta](https://github.com/microsoft/TypeScript/releases/tag/v7.1-beta) · [CSS Modules mapper](https://github.com/JoviDeCroock/typed-css-modules-mapper)

Oxlint 1.95.0 uses the separately installed Rust `tsrs` backend for all 62 type-aware rules in that release. The config enables 64 of 85 native React rules, including all 22 native compiler checks and both core hooks rules. JSX accessibility, TypeScript, and Vitest also use the built-in correctness category. The pinned Oxlint lacks upstream rules such as `config`, `gating`, and `component-hook-factories`. Check the resolved settings with `pnpm exec oxlint --print-config`. [Oxlint type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html) · [Native React Compiler checks](https://oxc.rs/blog/2026-08-18-react-compiler-support#oxlint) · [React hooks rule list](https://react.dev/reference/eslint-plugin-react-hooks)

The config leaves 21 registered React rules disabled.

- The automatic JSX runtime needs no `react-in-jsx-scope` rule.
- The six optional project conventions are `forbid-component-props`, `forbid-dom-props`, `forbid-elements`, `jsx-filename-extension`, `jsx-no-literals`, and `no-multi-comp`.
- The fourteen optional style rules are `function-component-definition`, `hook-use-state`, `jsx-boolean-value`, `jsx-curly-brace-presence`, `jsx-fragments`, `jsx-handler-names`, `jsx-max-depth`, `jsx-pascal-case`, `jsx-props-no-spreading`, `no-redundant-should-component-update`, `no-set-state`, `prefer-es6-class`, `self-closing-comp`, and `state-in-constructor`.

Verification on Node 26.13.1 included a fresh frozen install and all checks above. A temporary change confirmed that an unhandled promise, a conditional hook, a missing effect dependency, mutated React state, and a stale CSS declaration fail their corresponding checks.

The Vite plugin uses the experimental native React Compiler in automatic mode. The transformed account preview calls the React Compiler runtime and uses its memoization cache. `StrictMode` covers the preview in development. [Vite React plugin](https://github.com/vitejs/vite-plugin-react/tree/plugin-react%406.3.0/packages/plugin-react#rust-react-compiler) · [React Strict Mode](https://react.dev/reference/react/StrictMode)

To inspect a sample render in Chromium, run `pnpm build:profile` and `pnpm preview:profile`. Load the preview and inspect `performance.getEntriesByName('Account preview render')` in DevTools. Each entry gives the start-to-commit interval and includes React's render phase, actual duration, and base duration in `detail`. The regular production bundle omits the profiler wrapper and callback. [React profiling builds](https://react.dev/reference/dev-tools/react-performance-tracks#using-profiling-builds) · [React Profiler](https://react.dev/reference/react/Profiler)
