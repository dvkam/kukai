mod support;

use alloy_consensus::{transaction::SignerRecoverable, SignableTransaction, TxEnvelope};
use alloy_eips::eip2718::{Decodable2718, Encodable2718};
use alloy_primitives::{Address, Signature, U256};
use cggmp24::{
  generic_ec::Point,
  key_share::{reconstruct_secret_key, AnyKeyShare},
};

#[test]
fn device_and_recovery_shares_reconstruct_without_service_share() {
  let mut shares = support::dkg();
  let public = shares[0].shared_public_key();
  drop(shares.remove(1));
  let secret = reconstruct_secret_key(&shares).unwrap();
  assert_eq!(Point::generator() * &secret, public);
  let exported = k256::ecdsa::SigningKey::from_slice(&secret.as_ref().to_be_bytes()).unwrap();
  let account = Address::from_raw_public_key(&public.to_bytes(false)[1..]);
  for chain in [1, 8453] {
    let tx = support::transfer(chain);
    let (signature, recovery_id) = exported
      .sign_prehash_recoverable(tx.signature_hash().as_slice())
      .unwrap();
    let signature = Signature::from_signature_and_parity(signature, recovery_id.is_y_odd());
    assert_eq!(tx.into_signed(signature).recover_signer().unwrap(), account);
  }
  for share in shares {
    assert!(reconstruct_secret_key(&[share]).is_err());
  }
}

#[test]
fn duplicate_and_mixed_key_shares_cannot_reconstruct() {
  let shares = support::dkg();
  let other = support::dkg();
  assert!(reconstruct_secret_key(&[shares[0].clone(), shares[0].clone()]).is_err());
  assert!(reconstruct_secret_key(&[shares[0].clone(), other[2].clone()]).is_err());
}

#[test]
fn user_quorum_signs_ethereum_and_base_transactions_without_service() {
  let mut shares = support::complete_dkg();
  let public = shares[0].shared_public_key().to_bytes(false);
  let account = Address::from_raw_public_key(&public[1..]);
  for key in &shares {
    let id = support::execution_id();
    let data = cggmp24::DataToSign::digest::<sha3::Keccak256>(b"insufficient quorum probe");
    let rejected = round_based::sim::run(1, |i, party| async move {
      cggmp24::signing(cggmp24::ExecutionId::new(&id), i, &[key.i], key)
        .sign(&mut rand_core::OsRng, party, &data)
        .await
    })
    .unwrap()
    .into_vec();
    assert_eq!(rejected.len(), 1);
    assert!(rejected[0].is_err());
  }
  drop(shares.remove(1));

  for chain in [1, 8453] {
    let tx = support::transfer(chain);
    let signature = support::threshold_sign(&shares, &tx);
    let envelope: TxEnvelope = tx.clone().into_signed(signature).into();
    let encoded = envelope.encoded_2718();
    let decoded = TxEnvelope::decode_2718_exact(&encoded).unwrap();
    assert_eq!(decoded, envelope);
    assert_eq!(decoded.recover_signer().unwrap(), account);
    let mut changed_value = tx.clone();
    changed_value.value += U256::from(1);
    assert_ne!(
      changed_value
        .into_signed(signature)
        .recover_signer()
        .unwrap(),
      account
    );
    let mut changed_chain = tx;
    changed_chain.chain_id = if chain == 1 { 8453 } else { 1 };
    assert_ne!(
      changed_chain
        .into_signed(signature)
        .recover_signer()
        .unwrap(),
      account
    );
  }

  // Only long-lived key packages are serialized. Nonces and presignatures never enter the backup.
  let backup = serde_json::to_vec(&shares).unwrap();
  let restored: Vec<cggmp24::KeyShare<cggmp24::supported_curves::Secp256k1>> =
    serde_json::from_slice(&backup).unwrap();
  let tx = support::transfer(8453);
  let signature = support::threshold_sign(&restored, &tx);
  assert_eq!(tx.into_signed(signature).recover_signer().unwrap(), account);
  // Restoration did not replace the original shares. A retained old quorum still has the key.
  let original_key = reconstruct_secret_key(&shares).unwrap();
  let restored_key = reconstruct_secret_key(&restored).unwrap();
  assert_eq!(
    Point::generator() * original_key,
    Point::generator() * restored_key
  );
}
