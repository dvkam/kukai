use alloy_consensus::{transaction::RlpEcdsaDecodableTx, SignableTransaction, TxEip1559};
use alloy_primitives::{Address, TxKind, B256, U256};
use sha3::{Digest, Sha3_256};

const DOMAIN: &[u8] = b"kukai-approval-binding-v1\0";
const RENDERING_VERSION: u32 = 1;
const MAX_APPROVAL_SECONDS: u64 = 120;
const MAX_PAYLOAD_BYTES: usize = 128;
const TRANSFER_GAS: u64 = 21_000;

#[derive(Clone, Copy)]
pub struct ActiveContext {
  pub chain_id: u64,
  pub account: Address,
  pub rendering_version: u32,
  pub session_id: B256,
  pub device_generation: u64,
  pub selection_epoch: u64,
}

#[derive(Clone, Copy)]
pub enum SimulationOutcome {
  CodeEmptyTransfer,
  Failed,
  ProviderDisagreement,
  UnsupportedRecipient,
}

#[derive(Clone, Copy)]
pub struct Simulation {
  pub chain_id: u64,
  pub account: Address,
  pub payload_hash: B256,
  pub block_hash: B256,
  pub result_hash: B256,
  pub outcome: SimulationOutcome,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Refusal {
  UnsupportedEnvelope,
  InvalidEncoding,
  UnsupportedChain,
  ChainMismatch,
  UnsupportedTransfer,
  UnsupportedRenderingVersion,
  MissingSession,
  MissingSimulation,
  FailedSimulation,
  ProviderDisagreement,
  UnsupportedRecipient,
  SimulationSubjectMismatch,
  MissingSimulationHash,
  InvalidLifetime,
  ApprovalInactive,
  ApprovalMismatch,
}

#[derive(Debug)]
pub struct TransferReview {
  pub chain_id: u64,
  pub account: Address,
  pub recipient: Address,
  pub value_wei: U256,
  pub gas_limit: u64,
  pub max_fee_per_gas_wei: u128,
  pub max_priority_fee_per_gas_wei: u128,
  pub max_execution_fee_wei: U256,
}

#[derive(Debug, Clone, Copy)]
pub struct Approval {
  pub digest: B256,
  pub reviewed_at: u64,
  pub expires_at: u64,
}

#[derive(Debug)]
pub struct Review {
  pub transfer: TransferReview,
  pub approval: Approval,
}

pub fn prepare_review(
  active: ActiveContext,
  payload: &[u8],
  simulation: Option<Simulation>,
  reviewed_at: u64,
  expires_at: u64,
) -> Result<Review, Refusal> {
  if !matches!(
    expires_at.checked_sub(reviewed_at),
    Some(1..=MAX_APPROVAL_SECONDS)
  ) {
    return Err(Refusal::InvalidLifetime);
  }
  if active.rendering_version != RENDERING_VERSION {
    return Err(Refusal::UnsupportedRenderingVersion);
  }
  if active.session_id == B256::ZERO {
    return Err(Refusal::MissingSession);
  }

  let transfer = decode_transfer(active, payload)?;
  let simulation = simulation.ok_or(Refusal::MissingSimulation)?;
  check_simulation(active, payload, simulation)?;
  let digest = approval_digest(active, payload, simulation, reviewed_at, expires_at);
  Ok(Review {
    transfer,
    approval: Approval {
      digest,
      reviewed_at,
      expires_at,
    },
  })
}

pub fn check_approval(
  approved: Approval,
  active: ActiveContext,
  payload: &[u8],
  simulation: Option<Simulation>,
  now: u64,
) -> Result<(), Refusal> {
  if now < approved.reviewed_at || now >= approved.expires_at {
    return Err(Refusal::ApprovalInactive);
  }
  let current = prepare_review(
    active,
    payload,
    simulation,
    approved.reviewed_at,
    approved.expires_at,
  )?;
  if current.approval.digest != approved.digest {
    return Err(Refusal::ApprovalMismatch);
  }
  Ok(())
}

fn decode_transfer(active: ActiveContext, payload: &[u8]) -> Result<TransferReview, Refusal> {
  let Some((0x02, mut remaining)) = payload.split_first() else {
    return Err(Refusal::UnsupportedEnvelope);
  };
  if payload.len() > MAX_PAYLOAD_BYTES {
    return Err(Refusal::InvalidEncoding);
  }
  let tx = TxEip1559::rlp_decode(&mut remaining).map_err(|_| Refusal::InvalidEncoding)?;
  if !remaining.is_empty() || tx.encoded_for_signing() != payload {
    return Err(Refusal::InvalidEncoding);
  }
  if !matches!(tx.chain_id, 1 | 8453) {
    return Err(Refusal::UnsupportedChain);
  }
  if tx.chain_id != active.chain_id {
    return Err(Refusal::ChainMismatch);
  }

  let TxKind::Call(recipient) = tx.to else {
    return Err(Refusal::UnsupportedTransfer);
  };
  if !tx.input.is_empty()
    || !tx.access_list.0.is_empty()
    || tx.value.is_zero()
    || tx.gas_limit != TRANSFER_GAS
    || tx.max_fee_per_gas == 0
    || tx.max_priority_fee_per_gas > tx.max_fee_per_gas
  {
    return Err(Refusal::UnsupportedTransfer);
  }
  Ok(TransferReview {
    chain_id: tx.chain_id,
    account: active.account,
    recipient,
    value_wei: tx.value,
    gas_limit: tx.gas_limit,
    max_fee_per_gas_wei: tx.max_fee_per_gas,
    max_priority_fee_per_gas_wei: tx.max_priority_fee_per_gas,
    max_execution_fee_wei: U256::from(tx.gas_limit) * U256::from(tx.max_fee_per_gas),
  })
}

fn check_simulation(
  active: ActiveContext,
  payload: &[u8],
  simulation: Simulation,
) -> Result<(), Refusal> {
  match simulation.outcome {
    SimulationOutcome::CodeEmptyTransfer => {}
    SimulationOutcome::Failed => return Err(Refusal::FailedSimulation),
    SimulationOutcome::ProviderDisagreement => return Err(Refusal::ProviderDisagreement),
    SimulationOutcome::UnsupportedRecipient => return Err(Refusal::UnsupportedRecipient),
  }
  if simulation.chain_id != active.chain_id
    || simulation.account != active.account
    || simulation.payload_hash != sha3(payload)
  {
    return Err(Refusal::SimulationSubjectMismatch);
  }
  if simulation.block_hash == B256::ZERO || simulation.result_hash == B256::ZERO {
    return Err(Refusal::MissingSimulationHash);
  }
  Ok(())
}

fn approval_digest(
  active: ActiveContext,
  payload: &[u8],
  simulation: Simulation,
  reviewed_at: u64,
  expires_at: u64,
) -> B256 {
  let mut digest = Sha3_256::new();
  digest.update(DOMAIN);
  digest.update(active.chain_id.to_be_bytes());
  digest.update(active.account.as_slice());
  digest.update((payload.len() as u32).to_be_bytes());
  digest.update(payload);
  digest.update(simulation.block_hash.as_slice());
  digest.update(simulation.result_hash.as_slice());
  digest.update(active.rendering_version.to_be_bytes());
  digest.update(active.session_id.as_slice());
  digest.update(active.device_generation.to_be_bytes());
  digest.update(active.selection_epoch.to_be_bytes());
  digest.update(reviewed_at.to_be_bytes());
  digest.update(expires_at.to_be_bytes());
  B256::new(digest.finalize().into())
}

pub fn sha3(bytes: &[u8]) -> B256 {
  B256::new(Sha3_256::digest(bytes).into())
}
