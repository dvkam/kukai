# Logged-out wallet performance

Measure cold Home and warm mobile navigation on the inherited web wallet. Use the same runner, network conditions and viewport for each revision. The release targets and reference-device protocol are tracked in [issue #10](https://github.com/dvkam/kukai/issues/10). Report local runs in [issue #52](https://github.com/dvkam/kukai/issues/52).

For warm account switching after wallet restoration, see the [returning-account fixture and measurements](returning-accounts.md).

## Run

Use Node 24.22.1, Python 3.12, and Chrome or Chromium on Linux. Install the wallet's locked Node dependencies in each checkout and install Playwright with `python -m pip install -r requirements-ci.txt`. The runner looks for `chromium` or `google-chrome`. Set `CHROME_BIN` to choose a specific binary.

From the baseline checkout, run the following. The output directory must be new. The build uses Angular's production configuration and disables external font inlining. Script and style optimization remain enabled. Use a checkout with clean application inputs. The build checks those inputs and the commit before and after Angular runs. It writes their digests, the emitted JavaScript and CSS digests, and the Node and Angular versions next to the assets.

```sh
bench_dir="$PWD/experiments/web-wallet-performance"
build_dir="$(mktemp -d)"
node --max-old-space-size=4096 "$bench_dir/build.cjs" "$build_dir/baseline"
python "$bench_dir/run.py" "$build_dir/baseline" > "$build_dir/baseline.json"
```

For a comparison, build the second revision from its checkout with the same helper. Keep both checkouts and their dependencies fixed while building.

```sh
(cd /path/to/candidate && node --max-old-space-size=4096 "$bench_dir/build.cjs" "$build_dir/candidate")
python "$bench_dir/run.py" "$build_dir/baseline" --candidate "$build_dir/candidate" > "$build_dir/comparison.json"
```

The default is 200 measured attempts per build. `--samples 1` checks the setup. One warm-up per build primes the shared browser process and static server and has its own record outside the percentiles. The runner alternates the order of a baseline and candidate pair on successive attempts. Before collecting comparison data, check host load and allow unrelated builds or tests to finish. Record the power profile and note any CPU contention.

## What each sample measures

The runner serves the builds over loopback. Every attempt starts a fresh browser context at 390 by 650 CSS pixels, with service workers blocked and normal motion. Routing disables the browser HTTP cache and blocks external HTTP requests and WebSockets. The browser process and server stay open across attempts. The fixture pre-accepts the terms and stays logged out. It has zero assets and contains no keys, funds, transactions or login credentials.

| Workflow | Start | Visible completion |
| --- | --- | --- |
| Cold Home | Browser navigation time origin | Home heading, Google sign-in button and closed mobile menu button render. The local hero image has loaded. |
| Warm menu | Pointer click on Wallet navigation | The expanded menu contains the Import Wallet link. Its animations have settled. |
| Warm Import | Pointer click on Import Wallet | The Import wallet heading and Keystore File browse control render on `/import`. The menu has closed. |
| Warm Seed Words | Pointer click on Seed Words | The selected Seed Words method displays an empty, editable recovery textarea. |

The renderer records the click in the capture phase and checks completion across three consecutive animation-frame callbacks. This allows two paint opportunities after the first matching frame. Headless Chromium cannot measure physical display latency. Warm actions stay in the app instance opened by the cold navigation. Time to dispatch an automated pointer click falls outside each warm interval.

A menu that stays open over the Import form fails the Import attempt. The runner then presses Escape and records Seed Words under `warm_seed_form_after_escape_ms` if the menu dismisses and the form works. This keeps that result separate from a successful journey through the menu.

## Read the result

The JSON includes the browser version, host settings, each raw timing, blocked request counts and validation failures. The runner checks the JavaScript, CSS and index digests before and after measuring. Earlier manifests carry hashes observed at measurement time. Each step has a 15-second completion timeout. A failed validation has no timing for that action. Uncaught page errors and failed local requests invalidate the trial's timings. A failed journey makes the command exit nonzero after writing its report. If a warm-up cannot render Home, the runner skips the timed attempts.

Each workflow reports attempted, successful, failed and skipped counts. Percentiles use nearest rank on successful samples in ascending order. For percentile `p` over `n` measurements, take the one-based element at `ceil(n × p / 100)`. The report also gives the conventional median and the minimum and maximum. At 100 successful measurements, p99 is the second-slowest sample. A small number of samples can reveal a broken flow. Use repeated matched runs to assess a timing difference.

This fixture measures logged-out browser work with fallback fonts and a warm server and OS cache. Live RPC and authentication, cryptography, large asset lists, transaction approval and recovery require their own fixtures. Re-run on WebKit and a physical reference iPhone before comparing iOS performance.

## Mobile navigation measurement, November 25, 2026

At 390 × 650 CSS pixels, each of 120 alternating pairs started from a fresh context with accepted terms and no stored wallet. Chromium ran the optimized web app on a shared Linux host with a four-CPU quota. The runner used loopback HTTP, blocked external requests and checked the visible result of each action. One warm-up per build was excluded. [Raw trials, failures, host settings and bundle hashes](evidence/mobile-navigation-2026-11-25.json)

| Revision | Workflow | Valid / failed / skipped | p50 ms | p90 ms | p95 ms | p99 ms | Range ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 27f7bae0 | cold_home_ms | 120 / 0 / 0 | 2075.1 | 4078.1 | 4642.4 | 8392.1 | 1563.1 to 9475.6 |
| 27f7bae0 | warm_menu_ms | 120 / 0 / 0 | 208.5 | 233.4 | 252.7 | 400.0 | 200.4 to 428.5 |
| 27f7bae0 | warm_import_ms | 0 / 120 / 0 | - | - | - | - | - |
| 27f7bae0 | warm_seed_form_ms | 0 / 0 / 120 | - | - | - | - | - |
| 27f7bae0 | warm_seed_form_after_escape_ms | 120 / 0 / 0 | 43.4 | 57.9 | 78.1 | 194.2 | 26.4 to 253.7 |
| 16859b5f | cold_home_ms | 120 / 0 / 0 | 2124.1 | 4106.7 | 5570.7 | 6606.3 | 1604.7 to 7898.2 |
| 16859b5f | warm_menu_ms | 120 / 0 / 0 | 208.6 | 232.6 | 252.8 | 300.3 | 196.2 to 309.7 |
| 16859b5f | warm_import_ms | 120 / 0 / 0 | 241.1 | 313.3 | 337.1 | 482.3 | 222.6 to 519.3 |
| 16859b5f | warm_seed_form_ms | 120 / 0 / 0 | 43.9 | 48.3 | 66.2 | 115.3 | 27.0 to 179.1 |
| 16859b5f | warm_seed_form_after_escape_ms | 0 / 0 / 120 | - | - | - | - | - |

On the inherited build every Import attempt left the menu over the form. Pressing Escape made it possible to continue. Those Seed Words timings have their own row. With the menu fix, all 120 journeys reached the seed form directly. Host load changed substantially during the run. The cold-load and menu latency differences do not establish a speedup. These samples cover desktop Chromium at a mobile viewport. Physical iPhone and WebKit measurements remain open. [Menu fix](https://github.com/dvkam/kukai/pull/60)

## Isolate the 3D viewer cost on Home

Use a clean optimized build with the global model-viewer tag removed and the locked model-viewer 3.5.0 npm dependency installed. This comparison serves the same build in both conditions. One condition adds the former module tag immediately after the favicon link. Its script response comes from the locked package. The other condition serves the original build. External HTTP and WebSockets are blocked. Home has no visible 3D models in either condition.

```sh
python experiments/web-wallet-performance/viewer.py /path/to/optimized-build --samples 100 > viewer-comparison.json
```

The runner alternates the order of measured pairs. Each visit has a fresh context. The first pair warms the shared browser process and is reported separately. Each accepted visit must stay on the original Home document, render the Google sign-in button, register the viewer exactly when expected, and make the expected number of viewer requests. The interval ends at DOMContentLoaded. It excludes subsequent paint, interaction readiness and remote CDN latency. A final bundle check detects changes during the run.

### Home viewer measurement, November 25, 2026

Chromium 156 loaded the same optimized Home document in 100 alternating pairs. The eager variant fetched 935,194 viewer bytes on every visit. The on-demand variant fetched none. All 200 measured visits reached Home with no 3D model and passed the request and registration checks. One warm-up pair is reported separately. [Raw trials, browser settings and observed bundle hashes](evidence/viewer-2026-11-25.json)

| Home at 390 × 650 | Valid visits | p50 ms | p90 ms | p95 ms | p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Eager viewer | 100 | 9,025.5 | 17,031.1 | 19,410.6 | 25,048.9 |
| On-demand viewer | 100 | 8,774.3 | 16,299.3 | 18,886.6 | 26,376.1 |

The on-demand version removed the Home viewer request. Its p99 DOMContentLoaded time was 1,327.2 ms higher on this shared host. Load varied during the run, so these observations do not establish a consistent latency gain. The earlier CPU profile recorded 54 Home samples in eager viewer evaluation and zero after the change. [Viewer change and profile](https://github.com/dvkam/kukai/pull/62)
