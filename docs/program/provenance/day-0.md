# Prepare the public fork for later release

This is a proposed procedure, not completed cleanup. `dvkam` owns acceptance and credential remediation. Run it only when the relevant work is authorized.

## Clean up the fork

Use this sequence for the existing public fork.

1. Record the public state and preserve upstream history. No visibility change or history rewrite is required for the PoC.
2. Complete the secret-scan procedure below before any release claim. A prior public exposure cannot be undone by changing visibility.
3. Select only code and assets with confirmed provenance. Exclude unresolved copies from new application packages.
4. Add scoped licenses, NOTICE, per-file identifiers, modification attribution, and DCO contribution instructions in a separate initialization change.
5. Replace inherited branding in the new product. Keep the original application identifiable as the upstream reference until its removal is deliberately scoped.
6. Revisit the release gates when the owner expands beyond POC-001. Publishing a research PR does not complete day-0 cleanup.

## Full-history secret scan plan

The scan has not run. `dvkam` owns the scan and any remediation. Source credentials and suspected values must never appear in public reports or issue comments.

The procedure requires these steps:

1. Fetch all authorized branches and tags into an isolated scan checkout. Record refs and SHAs, and verify that the clone is not shallow. Include Git LFS content and submodules where present. Document inaccessible refs and deleted history as coverage limits.
2. Pin a reviewed Gitleaks release and its configuration. Verify the download checksum. Run a current-tree scan and a Git history scan over all fetched refs with full redaction enabled. Keep machine reports in restricted local storage outside the repository.
3. Review findings privately. For each candidate, record only a rule ID, commit, file location, affected provider, confidence, and remediation state. Treat wallet seeds and shares as key compromise, not just API-token exposure.
4. Have the owner revoke or rotate valid credentials with the provider. For wallet material, assess affected assets and authorities before any movement. Do not test a suspected secret against a live service to classify it.
5. Rescan after remediation. Any history purge requires an explicit owner-approved plan, coordination with other clones, and evidence of revocation first. Removing a string from Git cannot revoke it.
6. Publish only a redacted coverage and remediation summary. Record remaining gaps. Never label the repository secret-free based on a scanner's exit code alone.
