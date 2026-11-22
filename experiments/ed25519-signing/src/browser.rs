//! Runs only with temporary keys inside the browser feasibility experiment.
use super::{dkg, sign, tezos_digest, Group, SERVICE};
use frost_ed25519::Identifier;
use tezos_crypto_rs::{
  hash::{Ed25519Signature, HashTrait, PublicKeyEd25519},
  PublicKeySignatureVerifier,
};
use wasm_bindgen::prelude::*;
use web_sys::Performance;

fn user_quorum(clock: &Performance) -> (Group, f64) {
  let start = clock.now();
  let mut group = dkg();
  let elapsed = clock.now() - start;
  drop(group.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  let remaining: Vec<_> = group.shares.keys().copied().collect();
  assert_eq!(
    remaining,
    [
      Identifier::try_from(1).unwrap(),
      Identifier::try_from(3).unwrap()
    ]
  );
  (group, elapsed)
}

fn sign_timed(group: &Group, message: &[u8], clock: &Performance) -> ([u8; 64], f64) {
  let start = clock.now();
  let signature = sign(&group.shares, &group.public, message).unwrap();
  let elapsed = clock.now() - start;
  (signature.serialize().unwrap().try_into().unwrap(), elapsed)
}

/// Returns raw milliseconds in Solana DKG, Solana signing, Tezos DKG, Tezos signing order.
/// Each sample runs two independent ceremonies. Only timings leave the module.
#[wasm_bindgen]
pub fn run_sample() -> Vec<f64> {
  let clock = web_sys::window().unwrap().performance().unwrap();
  let (solana, solana_dkg) = user_quorum(&clock);
  let (tezos, tezos_dkg) = user_quorum(&clock);
  let solana_key = solana.public.verifying_key().serialize().unwrap();
  let tezos_key = tezos.public.verifying_key().serialize().unwrap();
  assert_ne!(solana_key, tezos_key);

  let message = b"wallet PoC: Solana signing bytes, not a transaction";
  let (raw, solana_sign) = sign_timed(&solana, message, &clock);
  let signature = solana_signature::Signature::from(raw);
  assert!(signature.verify(&solana_key, message));
  assert!(!signature.verify(&tezos_key, message));
  assert!(!signature.verify(&solana_key, &message[1..]));

  let watermarked = b"\x03wallet PoC: Tezos bytes, not a forged operation";
  let (raw, tezos_sign) = sign_timed(&tezos, &tezos_digest(watermarked), &clock);
  let signature = Ed25519Signature::try_from_bytes(&raw).unwrap();
  let key = PublicKeyEd25519::try_from_bytes(&tezos_key).unwrap();
  assert!(key.verify_signature(&signature, watermarked).unwrap());
  assert!(!key
    .verify_signature(&signature, &watermarked[1..])
    .unwrap_or(false));
  let other = PublicKeyEd25519::try_from_bytes(&solana_key).unwrap();
  assert!(!other
    .verify_signature(&signature, watermarked)
    .unwrap_or(false));
  vec![solana_dkg, solana_sign, tezos_dkg, tezos_sign]
}
