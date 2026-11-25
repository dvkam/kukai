use alloy_consensus::TxEip1559;
use alloy_primitives::{Address, TxKind, U256};
use cggmp24::{key_share::IncompleteKeyShare, supported_curves::Secp256k1};
use rand_core::{OsRng, RngCore};

pub const DEVICE: u16 = 0;
pub const RECOVERY: u16 = 2;
pub const PARTICIPANTS: u16 = 3;
pub const THRESHOLD: u16 = 2;

pub fn execution_id() -> [u8; 32] {
  let mut id = [0; 32];
  OsRng.fill_bytes(&mut id);
  id
}

pub fn dkg() -> Vec<IncompleteKeyShare<Secp256k1>> {
  let id = execution_id();
  let shares = round_based::sim::run(PARTICIPANTS, |i, party| async move {
    cggmp24::keygen::<Secp256k1>(cggmp24::ExecutionId::new(&id), i, PARTICIPANTS)
      .set_threshold(THRESHOLD)
      .start(&mut OsRng, party)
      .await
  })
  .unwrap()
  .expect_ok()
  .into_vec();
  for share in &shares {
    assert_eq!(share.shared_public_key(), shares[0].shared_public_key());
    assert_eq!(share.min_signers(), THRESHOLD);
  }
  shares
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

pub fn exit_fixture_transfer(chain_id: u64, nonce: u64) -> Result<TxEip1559, &'static str> {
  if !matches!(chain_id, 1 | 8453) {
    return Err("expected Ethereum or Base fixture chain ID");
  }
  let mut tx = transfer(chain_id);
  tx.nonce = nonce;
  Ok(tx)
}
