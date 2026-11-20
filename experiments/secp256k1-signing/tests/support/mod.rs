use std::time::Instant;

use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::{Address, Signature, TxKind, B256, U256};
use cggmp24::{
  key_share::{AnyKeyShare, IncompleteKeyShare},
  supported_curves::Secp256k1,
};
use rand_core::{OsRng, RngCore};
use sha3::Keccak256;

pub fn execution_id() -> [u8; 32] {
  let mut id = [0; 32];
  OsRng.fill_bytes(&mut id);
  id
}

pub fn dkg() -> Vec<IncompleteKeyShare<Secp256k1>> {
  let id = execution_id();
  let shares = round_based::sim::run(3, |i, party| async move {
    cggmp24::keygen::<Secp256k1>(cggmp24::ExecutionId::new(&id), i, 3)
      .set_threshold(2)
      .start(&mut OsRng, party)
      .await
  })
  .unwrap()
  .expect_ok()
  .into_vec();
  for share in &shares {
    assert_eq!(share.shared_public_key(), shares[0].shared_public_key());
    assert_eq!(share.min_signers(), 2);
  }
  shares
}

pub fn complete_dkg() -> Vec<cggmp24::KeyShare<Secp256k1>> {
  let started = Instant::now();
  let cores = dkg();
  eprintln!("phase=dkg elapsed_ms={}", started.elapsed().as_millis());
  let started = Instant::now();
  let primes: Vec<_> = std::thread::scope(|scope| {
    let workers: Vec<_> = (0..3)
      .map(|_| scope.spawn(|| cggmp24::PregeneratedPrimes::generate(&mut OsRng)))
      .collect();
    workers.into_iter().map(|w| w.join().unwrap()).collect()
  });
  eprintln!(
    "phase=safe_primes elapsed_ms={}",
    started.elapsed().as_millis()
  );
  let started = Instant::now();
  let id = execution_id();
  let auxiliary = round_based::sim::run_with_setup(primes, |i, party, primes| async move {
    cggmp24::aux_info_gen(cggmp24::ExecutionId::new(&id), i, 3, primes)
      .start(&mut OsRng, party)
      .await
  })
  .unwrap()
  .expect_ok()
  .into_vec();
  eprintln!(
    "phase=auxiliary elapsed_ms={}",
    started.elapsed().as_millis()
  );
  cores
    .into_iter()
    .zip(auxiliary)
    .map(|parts| cggmp24::KeyShare::from_parts(parts).unwrap())
    .collect()
}

pub fn transfer(chain_id: u64) -> TxEip1559 {
  TxEip1559 {
    chain_id,
    nonce: 7,
    gas_limit: 21_000,
    max_fee_per_gas: 2_000_000_000,
    max_priority_fee_per_gas: 1_000_000_000,
    to: TxKind::Call(Address::from([0x11; 20])),
    value: U256::from(1),
    ..Default::default()
  }
}

pub fn threshold_sign(shares: &[cggmp24::KeyShare<Secp256k1>], tx: &TxEip1559) -> Signature {
  let started = Instant::now();
  let mut preimage = Vec::new();
  tx.encode_for_signing(&mut preimage);
  let data = cggmp24::DataToSign::digest::<Keccak256>(&preimage);
  let id = execution_id();
  let indices: Vec<_> = shares.iter().map(|share| share.i).collect();
  let indices = &indices;
  let signature = round_based::sim::run_with_setup(shares, |i, party, key| async move {
    cggmp24::signing(cggmp24::ExecutionId::new(&id), i, indices, key)
      .sign(&mut OsRng, party, &data)
      .await
  })
  .unwrap()
  .expect_ok()
  .expect_eq();
  signature
    .verify(&shares[0].shared_public_key(), &data)
    .unwrap();
  let public = shares[0].shared_public_key().to_bytes(false);
  let account = Address::from_raw_public_key(&public[1..]);
  let signature = [false, true]
    .into_iter()
    .map(|parity| {
      Signature::from_scalars_and_parity(
        B256::from_slice(&signature.r.to_be_bytes()),
        B256::from_slice(&signature.s.to_be_bytes()),
        parity,
      )
    })
    .find(|sig| sig.recover_address_from_prehash(&tx.signature_hash()).ok() == Some(account))
    .expect("threshold signature must recover the DKG account");
  eprintln!(
    "phase=sign chain_id={} elapsed_ms={}",
    tx.chain_id,
    started.elapsed().as_millis()
  );
  signature
}
