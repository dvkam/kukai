use blst::{min_pk, BLST_ERROR};
use threshold_crypto::SecretKeySet;

const SIGN: &[u8] = b"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const PROVE: &[u8] = b"BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";

fn vector(line: &str) -> (Vec<u8>, min_pk::PublicKey, min_pk::Signature) {
  let fields: Vec<_> = line.split_whitespace().collect();
  assert_eq!(fields.len(), 3);
  let ikm = hex::decode(fields[1]).unwrap();
  let public = min_pk::SecretKey::key_gen(&ikm, &[]).unwrap().sk_to_pk();
  let signature = min_pk::Signature::sig_validate(&hex::decode(fields[2]).unwrap(), true).unwrap();
  (hex::decode(fields[0]).unwrap(), public, signature)
}

#[test]
fn octez_signature_and_possession_vectors_require_their_respective_domains() {
  let (message, public, sig) = vector(include_str!("../fixtures/sig_g2_pop.txt"));
  let (_, proof_key, proof) = vector(include_str!("../fixtures/pop_g2.txt"));
  assert_eq!(
    sig.verify(true, &message, SIGN, &[], &public, true),
    BLST_ERROR::BLST_SUCCESS
  );
  assert_eq!(
    proof.verify(true, &proof_key.to_bytes(), PROVE, &[], &proof_key, true),
    BLST_ERROR::BLST_SUCCESS
  );
  assert_eq!(
    proof.verify(true, &proof_key.to_bytes(), SIGN, &[], &proof_key, true),
    BLST_ERROR::BLST_VERIFY_FAIL
  );
}

#[test]
fn default_threshold_crypto_signatures_parse_but_fail_the_octez_domains() {
  // A degree-one polynomial gives a two-share quorum for this compatibility test.
  let dealer = SecretKeySet::random(1, &mut rand::thread_rng());
  let public_set = dealer.public_keys();
  let group_key = public_set.public_key();
  let public = min_pk::PublicKey::key_validate(&group_key.to_bytes()).unwrap();
  for (message, domain) in [
    (b"\x03tz4-screen".as_slice(), SIGN),
    (&group_key.to_bytes()[..], PROVE),
  ] {
    let partials = [0_u64, 2].map(|i| (i, dealer.secret_key_share(i).sign(message)));
    let signature = public_set
      .combine_signatures(partials.iter().map(|(i, s)| (*i, s)))
      .unwrap();
    assert!(group_key.verify(&signature, message));
    let candidate = min_pk::Signature::sig_validate(&signature.to_bytes(), true).unwrap();
    assert_eq!(
      candidate.verify(true, message, domain, &[], &public, true),
      BLST_ERROR::BLST_VERIFY_FAIL
    );
  }
}
