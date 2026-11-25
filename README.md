# Kukai

This fork contains the inherited Kukai Tezos web wallet and experiments for a separate multichain wallet. [Wallet program](docs/program/README.md)

## Development

The inherited application uses Angular 17.3. CI runs it with Node.js 24.22.1. Install the locked dependencies and start the development server.

```sh
npm ci
npm start
```

The lockfile includes an inherited Git dependency. If your network blocks Git or SSH transport, follow the HTTPS configuration in the [CI workflow](.github/workflows/ci.yml).

Run `npm run lint`, `npm run typecheck`, and `npm run test:ci` before submitting wallet changes. The test command uses headless Chrome.

## Historical security audit

Least Authority's 4 March 2022 report covers the upstream Kukai web wallet at review revision `ef36f7e5` and verification revision `8d069d54`. [Final audit report](audit/Least%20Authority%20-%20Tezos%20Foundation%20Kukai%20Wallet%20Final%20Audit%20Report.pdf)
