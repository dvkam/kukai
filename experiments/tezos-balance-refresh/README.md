# Tezos portfolio refresh

This experiment runs Kukai's `ActivityService.updateTransactions()` in Chromium. It includes TzKT response parsing, cached metadata lookup, the account counter hash, balance reconciliation, operation parsing, and both writes to local storage. The timer starts before subscription and ends after the observable completes.

A fresh account has no stored balances. A returning account starts with a stored portfolio, keeps 80% of those assets, removes the other 20%, and receives new assets. Some retained balances change. The metadata catalog combines the bundled mainnet catalog with deterministic fixture entries. The one-token returning case has 3,000 unrelated cached fixture entries to exercise a single balance against a large catalog.

esbuild compiles each checkout into an isolated, minified browser bundle with the production mainnet configuration. The experiment replaces Angular dependency injection, Taquito metadata providers, and external provider calls with local fixtures. It exercises the real account, indexer, metadata lookup, activity, hashing, and wallet storage code. It intercepts every provider request and records metadata discovery requests without fetching metadata. The fixture uses only synthetic watch accounts and local provider responses. The timings cover the refresh service through persisted state. They exclude Angular rendering, live network time, and metadata downloads.

## Run

Use Node with the Kukai dependencies installed, Python with Playwright, and Chromium. Set `CHROMIUM` if the executable differs from `/usr/bin/chromium`. Run these commands from the candidate checkout. Set `base_checkout` to a Kukai checkout at the revision to compare.

```sh
experiment=experiments/tezos-balance-refresh
output=$(mktemp -d)
node "$experiment/bundle.cjs" "$base_checkout" "$output/base"
node "$experiment/bundle.cjs" . "$output/candidate"
python "$experiment/run.py" "$output" --warmup 20 --output "$output/comparison.json"
```

The default run uses five paired blocks of 24 attempts per side for each fixture. It reverses the order within alternate pairs. Setup and assertions run outside the timed interval. Each accepted attempt checks balances and order, the other account, persisted contents, the account counter and activity, notifications, metadata discovery, and provider calls. Separate controls cover unchanged refreshes, empty portfolios, legacy IDs, zero and negative balances, and duplicates.

Capture diagnostic profiles separately from timing. The readable bundle preserves statement locations for V8's line samples.

```sh
node "$experiment/bundle.cjs" "$base_checkout" "$output/profile/base" --profile
python "$experiment/run.py" "$output/profile" --profile --modes returning --sizes 2000 --warmup 6 --samples 10 \
  --output "$output/diagnostics"
python "$experiment/run.py" "$output" --trace --modes returning --sizes 2000 --warmup 5 --samples 5 \
  --output "$output/diagnostics"
```

## V8 diagnosis

The baseline returned 2,000 balances and scanned a catalog of 3,042 known token IDs. V8 attributed 2,428 of 5,068 samples to the `knownTokenIds.includes(token.tokenId)` statement in `TzktService.accountInfo`. Samples cover the whole diagnostic batch, including fixture work outside the timer. Balance reconciliation was the next largest wallet call site. The candidate builds a set for multiple balances and uses the array scan for a single balance. [Profile counts and build hashes](observations/chromium-156-diagnostics.json)

The CPU profile covers ten verified refreshes. The separate Chrome trace contains five verified refresh spans marked `portfolio-refresh`. Decompress the CPU profile to load it in DevTools. [Raw CPU profile](observations/chromium-156-baseline.cpuprofile.gz) · [Chrome trace](observations/chromium-156-baseline-trace.json.gz)

## Chromium 156 comparison

The returning 2,000-token fixture completed in 108.5 ms at p50, compared with 231.6 ms on the baseline. The five baseline block medians ranged from 174.1 to 261.3 ms. The five candidate block medians ranged from 76.4 to 149.2 ms. All 1,920 attempts across eight fixtures and two builds passed. The 500-token returning fixture had overlapping block median ranges. Neither 25-token fixture showed a p50 difference.

| Fixture   | Balances | Baseline p50 | Candidate p50 | Baseline p90 | Candidate p90 | Baseline p95 | Candidate p95 | Baseline p99 | Candidate p99 |
| --------- | -------: | -----------: | ------------: | -----------: | ------------: | -----------: | ------------: | -----------: | ------------: |
| Fresh     |        1 |          1.3 |           1.3 |          5.2 |           5.9 |         10.0 |          11.7 |         18.5 |          22.7 |
| Returning |        1 |          2.1 |           1.4 |         10.7 |           7.2 |         17.7 |           9.9 |         26.2 |          27.2 |
| Fresh     |       25 |          1.3 |           1.3 |          5.1 |           2.5 |         10.2 |           3.5 |         21.5 |           6.7 |
| Returning |       25 |          1.2 |           1.2 |          2.2 |           3.8 |          2.5 |           5.1 |         16.7 |          43.4 |
| Fresh     |      500 |         24.4 |          14.1 |         84.5 |          27.7 |        141.8 |          29.9 |        213.4 |          38.2 |
| Returning |      500 |         17.1 |          10.9 |         36.5 |          31.2 |         52.3 |          47.0 |        131.9 |          58.7 |
| Fresh     |    2,000 |        293.5 |         148.9 |        608.6 |         245.6 |        866.7 |         300.5 |       1392.1 |         463.5 |
| Returning |    2,000 |        231.6 |         108.5 |        430.7 |         242.0 |        475.4 |         383.7 |        652.5 |         557.7 |

Values are milliseconds. Each percentile uses the nearest rank across 120 attempts per fixture and build. The single-token returning case still uses an array scan, so its timing difference gives a sense of shared-host variation. Background Angular builds were active and the load average was 7.43 at the start, with a 4-CPU quota. Treat small differences and the tails as inconclusive. Chromium 156.0.8078.79 used V8 15.6.75.27 on Linux x86-64 with an Intel Xeon Platinum 8573C. Both builds used the same Chromium executable, a 1280 × 720 viewport, and no CPU or network throttle. [Raw samples, block ranges, and build hashes](observations/chromium-156-shared-host.json)
