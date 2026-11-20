# Kukai provenance and reuse boundary

Research record for [P0-02](https://github.com/dvkam/kukai/issues/2), retrieved on 20 November 2026. Accountable owner and current PoC reviewer: `dvkam`. This is an engineering inventory, not a legal opinion or completed license audit.

## Source inventory

[sources.json](sources.json) pins every repository revision, the observed root declaration, the license-text checksum, and the file manifest. Each CSV records paths, Git object hashes, modes, and provisional reuse status. The manifests cover tracked files at those revisions, including assets. They exclude dependency contents fetched by package managers and do not establish authorship.

| Repository | Revision | Root declaration | Files |
| --- | --- | --- | --- |
| kukai-wallet/kukai | `f0fa7222a039012797383fe4a68594e10b92a888` | Apache-2.0 in License.md, MIT in package.json | 739 |
| kukai-wallet/kukai-mobile-ios | `cb8eb9ad8a97addd36c0549d77470183deb1fa31` | Apache-2.0 | 1378 |
| kukai-wallet/kukai-core-swift | `a761e3aee58fdfa20b4f3e71adcd20861e284fad` | MIT | 319 |
| kukai-wallet/kukai-crypto-swift | `7d9059b932a723d8d90e690ab29777ad4f1b7a8d` | MIT | 30 |
| kukai-wallet/CustomAuth | `ef401881391614923619b12d5095a79706aaeaec` | MIT in package.json, no license file found | 208 |
| kukai-wallet/test-dapp | `a27b72e776d77f41f8632c5e64d7f1e0597f0613` | No license file found in the pinned tree | 46 |

The [verification procedure](verify.md) reproduces these counts and compares the manifests with the pinned Git trees. Root license evidence is retained verbatim in [notices](notices/). These copies include the Swift libraries' MIT copyright and permission notices. They are evidence for those sources, not a license grant over the new project.

Every manifest file license is `NOASSERTION`. This is an SPDX sentinel for unresolved file-level licensing, not permission to reuse. Root grants alone do not resolve copied third-party content. No file has been approved for copying into the new wallet. This conservative result keeps uncertain code outside PoC implementation without deleting the inherited application.

## Copied code and asset questions

All findings below belong to `dvkam`. They remain open under issue #2 until source and notice evidence resolves them. A future reuse PR must identify the exact source, preserve its notices, assign the file identifier, and link the review outcome.

| Source and path | Observed evidence | Current treatment |
| --- | --- | --- |
| Web `src/assets/js/qr-scanner-worker.min.js` | Minified bundle with a source-map reference, no license header. package.json names qr-scanner, but that does not prove this file matches the package. | Exclude the bundled copy. If needed, obtain a pinned upstream release with its notices and compare the bytes. |
| Web `src/assets/fonts/Gilroy-Extrabold.woff2` | Font binary present without a companion license in the tracked tree. | Exclude. Do not infer redistribution rights from the wallet's root license. |
| Web `src/assets/fonts/Roboto/Flex.ttf` and `Flex.woff2` | Font binaries without a companion license in the tracked tree. | Exclude these copies until the exact source, version, and font license are verified. |
| Web `src/serviceworker/sw.js` | Authentication redirect implementation without a file-level license header. | Reference only. The new authentication design does not reuse the legacy flow. |
| Swift core `Sources/KukaiCoreSwift/Services/ledger_app_tezos.js` | Header credits Ledger, 2016-2017, under Apache-2.0. The enclosing repository declares MIT. | Preserve the Ledger header. Do not label the bundle MIT from the root grant. Complete bundled-dependency provenance remains unresolved. |
| Swift core `Sources/KukaiCoreSwift/Services/taquito_local_forging.js` | Header references `taquito_local_forging.js.LICENSE.txt`. That sidecar is absent from the pinned tree. | Exclude until the bundle's build inputs and complete notices are recovered. |
| Swift core `Sources/KukaiCoreSwift/Services/kukai-dex-calculations.js` | Minified bundle contains a `bigInt` implementation and no license header. | Exclude. Identify all bundled inputs before assigning a license. |
| iOS `Kukai Mobile/Fonts/Figtree-*.ttf` | Four font binaries embed 2022 Figtree Project Authors copyright, the upstream project URL, and a SIL Open Font License 1.1 declaration and URL in their name tables. No standalone font license file was found. | Retain this evidence. Exclude these copies until the exact upstream version and complete redistribution notices are verified. |
| CustomAuth and test-dapp | CustomAuth declares MIT in package.json but has no license file. test-dapp has neither a package license declaration nor a root license file, and also bundles fonts. | Reference only. Recover complete grant and notice evidence before considering copying. |

This inspection found specific unresolved files. It is not an exhaustive determination of every file's origin. The `NOASSERTION` status protects against treating the uninspected remainder as cleared. Package-lock files and Swift manifests identify further third-party dependencies that need their own notices when selected.

## Reuse decision for the PoC

No inherited runtime module is selected for copying. Rust is the accepted client-core and signer language, while the retained web application is Angular. The PoC can use Kukai behavior and tests as references without transferring unresolved source into new packages.

| Area | Treatment and reason |
| --- | --- |
| Web `src/app/libraries`, operation services, and their tests | Reference candidates for Tezos encodings and test cases. Implement against pinned chain specifications and compare behavior. Any copied fixture or test code requires a separate provenance check. |
| Swift core models and RPC services | Reference candidates for interface behavior. Whole-package reuse would also import the legacy CustomAuth dependency and bundled JavaScript. |
| Swift crypto wrappers | Reference candidates for compatibility. They do not establish a threshold protocol, and the program fixes cryptography in Rust. |
| Legacy wallet, import, keystore, and Torus authentication | Excluded from new runtime code. Account and keystore compatibility are not requirements. |
| Angular components, Kukai branding, fonts, logos, and bundled JavaScript | Excluded from new runtime code and assets. The product requires a new UI and verified asset provenance. |
| Direct upstream libraries | Candidate dependencies, selected through P0-03 and later admission tests. Their licenses and versions are checked independently of Kukai. |

Q-16 remains open for the release architecture. This PoC boundary permits original experiments without asserting that inherited modules have passed review. It can be revised by an explicit reuse decision with file-level evidence.

## License boundaries

The inherited web `License.md`, `package.json`, source headers, and notices remain unchanged. Their conflicting declarations are recorded, not resolved by choosing the convenient one. Evidence copies preserve the available MIT and Apache text. Missing notices are not fabricated.

DEC-022's dual license applies only to original project contributions. It does not change inherited licenses or sublicense third-party assets. A later initialization change must add scoped license files, a NOTICE, evidence-based SPDX identifiers, and modification attribution. That change must distinguish original files from modified inherited files. No blanket header or root relicensing occurs in this research ticket.

## Day-0 sequence for the existing public fork

GitHub reports `dvkam/kukai` as a public fork of `kukai-wallet/kukai`, with `production` as its default branch. DEC-021's private-first sequence cannot describe the fork's current state. GitHub also restricts visibility changes for public forks. See [GitHub's visibility documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).

The [proposed day-0 procedure](day-0.md) records cleanup and full-history secret-scan steps. These steps have not run. The procedure does not authorize changing visibility, rewriting history, or rotating credentials.
