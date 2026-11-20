# Wallet program charter

Owner: `dvkam`. Date: 20 November 2026. Source: [program plan v0.5.1](program-plan-v0.5.1.md). Execution ticket: [P0-01](https://github.com/dvkam/kukai/issues/1).

The owner accepted v0.5.1 as the planning baseline and authorized implementation of the published issues. This charter records that scope and the owner's assignment of `dvkam` to the open decisions and risks. It does not pass G0 or approve unresolved proposals.

## Accepted scope

The project builds a new social-first wallet and signing infrastructure over the Kukai fork. Reuse is selective. Kukai accounts, keystores, derivation paths, UI, and embedded protocol compatibility are not requirements.

Release 1 targets web and native iOS, with Solana, Tezos, Ethereum mainnet, and Base. The minimum owned keys are Ed25519 for Solana and Tezos tz1, and secp256k1 for Ethereum and Base. If either minimum fails admission, release 1 waits. Owned tz2, tz3, and tz4 accounts require separate admission evidence. All five Tezos address types are recognized, with operations offered only when the connected protocol permits them.

Users alone hold a complete signing quorum. Exit requires no authorization or share release from the project or a third party. Public RPC access and chain availability remain dependencies. The exit tool must sign independently, export exportable keys, and move transferable assets and supported authorities with every project-operated host blocked. Standard seed-format Ed25519 export is unavailable. Frozen tokens, soulbound NFTs, timelocks, and nonassignable roles remain explicit exceptions. Moving assets does not retire a compromised old key.

The program uses open-source threshold cryptography and its own authentication orchestration. Social identity providers and replaceable data services remain permitted dependencies. The full NFT gallery and read-only agent explanations are release 1 decisions. Rust is fixed for the cryptography, signer, and client core. The services-language choice remains open until the Phase 3 comparison.

## Accepted exclusions and unresolved scope

Android is release 2. Arbitrum and Polygon follow release 1. Agent preparation and delegation are Phase 7b. Owned tz5 accounts wait for protocol activation and a reviewed threshold scheme. Plain 2-of-2 custody and third-party escrow exit are excluded. Proprietary wallet infrastructure is excluded by DEC-003.

Browser extensions, swaps, bridging, on-ramps, and hardware-wallet support are proposed deferrals for G0 to decide. They are not accepted exclusions yet. The browser-extension question Q-14 remains deferred until after release 1. Plan v2 and its dependency ledger are historical sources, not an implementation backlog. Only appendix W's accepted web foundation carries forward.

## Research starting point

The primary audience remains Q-11. Candidates are mainstream newcomers, existing multichain-wallet users, advanced users, and agent builders. No audience has been selected or studied in this work.

The research hypotheses are that users can act without managing networks, understand the authority they grant, and benefit from bounded assistance. These are unvalidated hypotheses. Unilateral exit is an accepted requirement, not evidence of product usability. Asset-first, intent-first, and contextual concepts remain separate candidates for comparison.

The plan references 16 dimensions in `C:\Users\David\Desktop\kukai.txt`. That handover was not supplied. The supplied v0.2 through v0.5.1 Markdown files reference the dimensions without enumerating them. No dimensions or findings have been reconstructed. [P1-01](https://github.com/dvkam/kukai/issues/8) must recover the source or explicitly approve a replacement research rubric before claiming coverage of those dimensions.

## Accountability and acceptance

The [owner register](owners.md) assigns all 33 open questions and 27 risks. `dvkam` acts as project owner and interim product decision owner. [P0-04](https://github.com/dvkam/kukai/issues/4) must assign delivery capacity and specialist reviewers before G0. Security and cryptography review, independent protocol review, and qualified legal review are unfilled. No AI review substitutes for those roles.

An accepted decision has an ID, a named accountable owner, a dated choice, reasons, evidence, rejected alternatives, remaining assumptions, and required reviewer outcomes. The owner accepts project scope and product decisions. Security outcomes also need the specialist reviewer specified by the ticket. Legal outcomes require qualified counsel's advice and the owner's decision. A reviewer recommendation alone is not a project decision.

The [decision record](decisions.md) distinguishes the inherited decisions from proposals. Changes to accepted decisions need a new linked entry. Counterexamples reopen affected decisions and gates. Gate acceptance requires the ticket's evidence and named reviewers. Closing an issue, merging a document, or assigning an owner does not pass a gate.
