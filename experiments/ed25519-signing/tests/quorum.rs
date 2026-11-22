#[path = "quorum/lifecycle.rs"]
mod lifecycle;
use wallet_ed25519_signing_experiment as support;

use std::collections::BTreeMap;

use frost_ed25519 as frost;
use support::{dkg, sign, SERVICE};
use tezos_crypto_rs::{
  hash::{Ed25519Signature, HashTrait, PublicKeyEd25519},
  PublicKeySignatureVerifier,
};

#[test]
fn user_quorum_signs_without_service_material_and_solana_verifies() {
  let mut group = dkg();
  drop(group.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  let message = b"wallet PoC: Solana signing bytes, not a transaction";
  let signature = sign(&group.shares, &group.public, message).unwrap();
  let bytes: [u8; 64] = signature.serialize().unwrap().try_into().unwrap();
  let verifier = solana_signature::Signature::from(bytes);
  let public_key = group.public.verifying_key().serialize().unwrap();
  assert!(verifier.verify(&public_key, message));
  assert!(!verifier.verify(&public_key, b"changed bytes"));
}

#[test]
fn separate_tezos_key_signs_watermarked_digest_without_service() {
  let solana = dkg();
  let mut tezos = dkg();
  assert_ne!(solana.public.verifying_key(), tezos.public.verifying_key());
  drop(tezos.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  let message = b"\x03wallet PoC: Tezos bytes, not a forged operation";
  let digest = support::tezos_digest(message);
  let signature = sign(&tezos.shares, &tezos.public, &digest).unwrap();
  let encoded = Ed25519Signature::try_from_bytes(&signature.serialize().unwrap()).unwrap();
  let public_key = tezos.public.verifying_key().serialize().unwrap();
  let verifier = PublicKeyEd25519::try_from_bytes(&public_key).unwrap();
  assert!(verifier.verify_signature(&encoded, message).unwrap());
  assert!(!verifier
    .verify_signature(&encoded, &message[1..])
    .unwrap_or(false));
  let wrong_key =
    PublicKeyEd25519::try_from_bytes(&solana.public.verifying_key().serialize().unwrap()).unwrap();
  assert!(!wrong_key
    .verify_signature(&encoded, message)
    .unwrap_or(false));
}

#[test]
fn no_single_participant_can_sign() {
  let group = dkg();
  for (id, key) in &group.shares {
    let only_one = BTreeMap::from([(*id, key.clone())]);
    assert_eq!(
      sign(&only_one, &group.public, b"threshold test").unwrap_err(),
      frost::Error::IncorrectNumberOfCommitments
    );
  }
}

#[test]
fn signature_share_cannot_be_replayed_into_fresh_signing_round() {
  let mut group = dkg();
  drop(group.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  let message = b"same message, separate signing attempts";
  let (previous, previous_shares) = support::signature_shares(&group.shares, message).unwrap();
  let (current, mut current_shares) = support::signature_shares(&group.shares, message).unwrap();
  assert_ne!(
    previous.signing_commitments(),
    current.signing_commitments()
  );
  assert!(frost::aggregate(&previous, &previous_shares, &group.public).is_ok());
  assert!(frost::aggregate(&current, &current_shares, &group.public).is_ok());
  let device = 1u16.try_into().unwrap();
  current_shares.insert(device, previous_shares[&device]);
  assert!(frost::aggregate(&current, &current_shares, &group.public).is_err());
}

#[test]
fn coordinator_cannot_change_message_after_collecting_signature_shares() {
  let mut group = dkg();
  drop(group.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  let (original, shares) = support::signature_shares(&group.shares, b"approved bytes").unwrap();
  assert!(frost::aggregate(&original, &shares, &group.public).is_ok());
  let changed = frost::SigningPackage::new(original.signing_commitments().clone(), b"other bytes");
  assert!(frost::aggregate(&changed, &shares, &group.public).is_err());
}

#[test]
fn every_two_share_combination_can_sign_for_the_same_account() {
  let group = dkg();
  let public_key = group.public.verifying_key().serialize().unwrap();
  for excluded in group.shares.keys() {
    let pair = group
      .shares
      .iter()
      .filter(|(id, _)| *id != excluded)
      .map(|(id, key)| (*id, key.clone()))
      .collect();
    let message = b"same account, every two-share quorum";
    let signature = sign(&pair, &group.public, message).unwrap();
    let bytes: [u8; 64] = signature.serialize().unwrap().try_into().unwrap();
    assert!(solana_signature::Signature::from(bytes).verify(&public_key, message));
  }
}

#[test]
fn share_from_another_key_cannot_complete_the_user_quorum() {
  let mut group = dkg();
  let mut unrelated = dkg();
  let recovery = 3u16.try_into().unwrap();
  drop(group.shares.remove(&SERVICE.try_into().unwrap()).unwrap());
  group
    .shares
    .insert(recovery, unrelated.shares.remove(&recovery).unwrap());
  assert!(sign(&group.shares, &group.public, b"mixed key test").is_err());
}
