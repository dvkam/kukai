# Toolchain constraints and experiment resources

Retrieved on 20 November 2026 for P0-03. These are experiment candidates, not an initialized application toolchain. Exact release URLs are in [sources.json](sources.json).

| Tool | Source observation | Compatibility and current result |
| --- | --- | --- |
| Node | Official distribution index identifies v26.13.1 as LTS, codename Lithium. | The shell initially has v24.22.1. Node 26 is not installed or tested here. Do not use GitHub's “latest” alpha-tagged release as a stable candidate. |
| pnpm | GitHub release v12.21.0. | The shell has 11.25.0. Node 26 with pnpm 12 needs a fresh web-project check before adoption. |
| Rust | Release 1.100.0. | Installed in a workspace-local rustup directory. FROST 3.0.0 and CGGMP24 alpha.3 compile for the native host and WASM. No shared wallet toolchain changed. |
| OCaml and Dune | Releases 5.5.2 and 3.25.0. | Not installed or built here. OCaml 5.5.2 conflicts with Gospel 0.3.1's declared upper bound. |
| Swift | swift-6.4.2-RELEASE. | Xcode, supported SDKs, deployment target, signing, and physical-device execution remain unconfirmed. Linux Rust compilation supplies no iOS evidence. |
| TLC | TLA+ tools v1.7.4. | No model run. Java availability alone does not establish a supported runtime/tool combination. |
| Apalache | v0.63.0. | No solver/model run or JVM compatibility check. |
| Tamarin | 1.12.0. | Maude and prover dependencies have not been installed or tested. |
| Creusot | v0.14.0. | Its release `rust-toolchain` pins `nightly-2026-08-03`, with rustc-dev and llvm-tools. Run it in its own toolchain context. |
| Verus | release/0.2026.11.02.8bf68ee. | Its release toolchain pins Rust 1.99.1 with compiler internals. Rust 1.100.0 is not a verified substitute. |
| Kani | kani-0.68.0. | Its release toolchain pins `nightly-2026-08-21`, rustc-dev, rust-src, and llvm-tools. No Kani check has run. |

The [official Node index](https://nodejs.org/dist/index.json) was read directly. The verifier pins come from `rust-toolchain` or `rust-toolchain.toml` at the release tags above. Separate toolchain directories prevent one verifier's compiler requirements from changing another experiment.

## OCaml proof-tool conflict

At opam-repository revision `ee6d1bde9494ed71412cec9e645d1171bbdcef16`, [Gospel 0.3.1](https://github.com/ocaml/opam-repository/blob/ee6d1bde9494ed71412cec9e645d1171bbdcef16/packages/gospel/gospel.0.3.1/opam) requires OCaml `>= 4.11` and `<= 5.3.0`, plus Dune `>= 3.0.0`. OCaml 5.5.2 therefore cannot satisfy that declared combination. The Cameleer package directory was absent at that registry revision. This is a registry observation, not proof that Cameleer is unavailable elsewhere.

The [Cameleer source](https://github.com/ocaml-gospel/cameleer/blob/d9899b8e87680acc1611d91937c515b54ced1e0b/cameleer.opam) is available at `d9899b8e87680acc1611d91937c515b54ced1e0b`. It requires Why3 >= 1.4.0, Why3 IDE >= 1.5.0, and pins Gospel development revision `c20125aeb2154b3853e0e5411c4548f568541096`. That development revision declares OCaml >= 4.09 without an upper bound. It is a different candidate from released Gospel 0.3.1, and its unconstrained range does not prove compatibility with OCaml 5.5.2.

P3-07 must establish a complete OCaml, Gospel, Cameleer, Why3, and solver combination. A compiler within Gospel's bound is a candidate, not a tested solution. Keep this blocker visible rather than modifying package constraints or presenting unrun combinations as supported. The Rust verifier choices likewise require their own pinned compiler and solver tests.

## Resources

| Resource | Current status | Evidence required before claiming readiness |
| --- | --- | --- |
| Linux x86_64 and network access | Available. Rust library checks run. | Record compiler, lockfiles, commands, target, and logs per run. |
| Browser runtime and entropy source | Not exercised by the library checks. | Run the selected WASM wrapper in named browser versions, test secure entropy, transport, memory handling, and reload/crash behavior. |
| macOS and Xcode | Owner deferred access. | Record supported Mac architecture, macOS, Xcode build, SDK, and signing capability. |
| Physical iPhone | Owner deferred access. | Name the reference model and iOS build. Test device storage, biometrics, recovery, signing, and measured latency on that device. |
| Independent cryptography and formal-methods reviewers | Unfilled for production under POC-001. | Actual scoped review, with reviewed source revisions and findings, before baseline admission. |

All build observations are local feasibility evidence. Stable release numbers and declared version ranges do not establish security, mutual compatibility, or production suitability.
