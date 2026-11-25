# Returning watch-only account picker

The account picker runner opens the production app with a persisted `WatchWallet` in a fresh Chromium context. The fixture has two checksummed Tezos addresses generated without keypairs, zero balances, and empty token and activity lists. The app restores the wallet through its regular storage path. During setup, a valid address outside the wallet and an address with an invalid checksum must both fall back to the first stored account. The runner also checks that Tab reaches the picker.

From the repository root, build the optimized wallet and set up Chromium using the [benchmark setup instructions](README.md#run). Then run the account fixture against that build.

```sh
python experiments/web-wallet-performance/account_picker.py "$build_dir/baseline" > "$build_dir/account-picker.json"
```

The runner verifies the attested HTML, JavaScript and CSS digests before and after measurement. It serves account deep links over loopback. Browser routing blocks external HTTP and WebSocket requests and disables the HTTP cache. Chromium's DNS and proxy settings also block speculative external connections. Service workers are disabled.

Use `--samples 1` for a smoke check. The default collects 100 round trips per input in the same restored document. Each round trip opens on the first account, selects the second account, opens on the second account, and returns to the first. Pointer and keyboard rounds alternate which goes first.

| Interval | Start | Completion |
| --- | --- | --- |
| Open on either account | Trusted click or Enter keydown on the picker button | The button reports expanded. The visible, interactive panel contains two visible account links and marks the current route with `aria-current="page"`. |
| Select the second account or return to the first | Trusted click or Enter keydown on the account link | The URL matches the destination route, the header shows the new account and its full accessible address, and Balances is visible. The picker is collapsed, hidden and inert. Focus returns to the picker button, with visible keyboard focus for Enter. |

Both intervals include the panel animation and the button's CSS transition with normal motion enabled. Each endpoint must hold across three animation-frame callbacks, which give the browser two paint opportunities after the first match. Page loads, font readiness, Tab navigation between controls, and one warm-up round per input are excluded from percentiles. The raw report includes the warm-ups, every attempted interval, failures, skips and blocked requests. A setup or cycle failure stops collection to preserve a consistent starting state.

This fixture covers local switching after wallet restoration in headless desktop Chromium at 390 × 650 CSS pixels. Authentication, unlock, signing, provider latency, WebKit and reference-device measurements have separate scopes.

### Account picker measurement, November 25, 2026

Chromium 156.0.8078.79 ran optimized revision `d77135e4`, the reviewed head of PR #76, on a shared Linux host with a four-CPU quota. [Account picker change](https://github.com/dvkam/kukai/pull/76) · [Raw trials, environment and bundle digests](evidence/account-picker-2026-11-25.json)

| Input | Interval | Valid / failed / skipped | p50 ms | p90 ms | p95 ms | p99 ms | Range ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pointer | `open_first_ms` | 100 / 0 / 0 | 307.4 | 317.3 | 341.4 | 385.6 | 281.2 to 390.8 |
| Pointer | `select_second_ms` | 100 / 0 / 0 | 308.7 | 329.3 | 339.0 | 353.7 | 286.4 to 355.1 |
| Pointer | `open_second_ms` | 100 / 0 / 0 | 308.0 | 312.5 | 345.1 | 375.5 | 285.7 to 397.5 |
| Pointer | `return_first_ms` | 100 / 0 / 0 | 309.6 | 339.8 | 368.5 | 407.0 | 287.5 to 563.9 |
| Keyboard | `open_first_ms` | 100 / 0 / 0 | 306.4 | 323.8 | 331.8 | 473.7 | 277.0 to 684.4 |
| Keyboard | `select_second_ms` | 100 / 0 / 0 | 308.9 | 330.0 | 338.2 | 363.6 | 287.9 to 367.5 |
| Keyboard | `open_second_ms` | 100 / 0 / 0 | 306.0 | 323.3 | 337.4 | 414.9 | 278.2 to 484.1 |
| Keyboard | `return_first_ms` | 100 / 0 / 0 | 312.3 | 345.1 | 386.2 | 503.6 | 284.4 to 558.2 |

The panel animation lasts 160 ms, and the trigger CSS transitions run for 250 ms. A separate Chrome DevTools trace of one pointer round trip recorded 3.3 to 7.8 ms of layout events and 58.5 to 63.2 ms of event dispatch during the two selections. The reference percentiles use the run with tracing disabled. The host's one-minute load average fell from 3.7 to 2.8 during that run.

An independent check confirmed that a wrong account, lost focus, or a closed panel left visible or interactive fails the completion test. All TCP connection attempts in the check targeted loopback. Chromium's IPv6 reachability probes sent zero bytes.
