#[path = "approval/binding.rs"]
mod binding;

use alloy_consensus::{SignableTransaction, TxEip1559};
use alloy_primitives::{Address, TxKind, B256, U256};
use binding::{check_approval, prepare_review, sha3, ActiveContext, Simulation, SimulationOutcome};

const REVIEWED_AT: u64 = 1_700_000_000;
const EXPIRES_AT: u64 = REVIEWED_AT + 90;

fn context(chain_id: u64) -> ActiveContext {
  ActiveContext {
    chain_id,
    account: Address::from([0x11; 20]),
    rendering_version: 1,
    session_id: B256::from([0x33; 32]),
    device_generation: 3,
    selection_epoch: 8,
  }
}

fn transaction(chain_id: u64) -> TxEip1559 {
  TxEip1559 {
    chain_id,
    nonce: 7,
    gas_limit: 21_000,
    max_fee_per_gas: 30_000_000_000,
    max_priority_fee_per_gas: 2_000_000_000,
    to: TxKind::Call(Address::from([0x22; 20])),
    value: U256::from(1_000_000_000_000_000_u64),
    ..Default::default()
  }
}

fn simulation(active: ActiveContext, payload: &[u8]) -> Simulation {
  Simulation {
    chain_id: active.chain_id,
    account: active.account,
    payload_hash: sha3(payload),
    block_hash: B256::from([0xb1; 32]),
    result_hash: B256::from([0xc2; 32]),
    outcome: SimulationOutcome::CodeEmptyTransfer,
  }
}

#[test]
fn prepares_and_verifies_review_from_native_transfer_bytes() {
  for chain_id in [1, 8453] {
    let active = context(chain_id);
    let payload = transaction(chain_id).encoded_for_signing();
    let simulation = simulation(active, &payload);
    let review =
      prepare_review(active, &payload, Some(simulation), REVIEWED_AT, EXPIRES_AT).unwrap();

    assert_eq!(review.transfer.chain_id, chain_id);
    assert_eq!(review.transfer.account, active.account);
    assert_eq!(review.transfer.recipient, Address::from([0x22; 20]));
    assert_eq!(review.transfer.gas_limit, 21_000);
    assert_eq!(review.transfer.max_fee_per_gas_wei, 30_000_000_000);
    assert_eq!(review.transfer.max_priority_fee_per_gas_wei, 2_000_000_000);
    assert_eq!(
      review.transfer.value_wei,
      U256::from(1_000_000_000_000_000_u64)
    );
    assert_eq!(
      review.transfer.max_execution_fee_wei,
      U256::from(630_000_000_000_000_u64)
    );
    assert_eq!(
      check_approval(
        review.approval,
        active,
        &payload,
        Some(simulation),
        EXPIRES_AT - 1
      ),
      Ok(())
    );
  }
}

#[test]
fn rejects_signed_trailing_noncanonical_and_other_envelopes() {
  use alloy_eips::eip2718::Encodable2718;
  use alloy_primitives::Signature;
  use binding::Refusal;

  let active = context(1);
  let tx = transaction(1);
  let canonical = tx.encoded_for_signing();
  let signed = tx
    .into_signed(Signature::new(U256::from(1), U256::from(2), false))
    .encoded_2718();
  let mut trailing = canonical.clone();
  trailing.push(0);
  let mut noncanonical = canonical.clone();
  assert_eq!(&noncanonical[2..4], &[1, 7]);
  noncanonical[1] += 1;
  noncanonical.insert(3, 0x81); // Nonminimal RLP string encoding of nonce 7.
  let mut authorization_type = canonical.clone();
  authorization_type[0] = 4;

  for (payload, expected) in [
    (signed.as_slice(), Refusal::InvalidEncoding),
    (&trailing, Refusal::InvalidEncoding),
    (&noncanonical, Refusal::InvalidEncoding),
    (&canonical[..canonical.len() - 1], Refusal::InvalidEncoding),
    (&canonical[1..], Refusal::UnsupportedEnvelope),
    (&authorization_type, Refusal::UnsupportedEnvelope),
    (&[], Refusal::UnsupportedEnvelope),
  ] {
    assert_eq!(
      prepare_review(
        active,
        payload,
        Some(simulation(active, payload)),
        REVIEWED_AT,
        EXPIRES_AT
      )
      .unwrap_err(),
      expected
    );
  }
}

#[test]
fn refuses_unsupported_transfer_fields_and_chain() {
  use alloy_eips::eip2930::AccessListItem;
  use binding::Refusal;

  let tx = transaction(1);
  let active = context(1);
  let check = |tx: TxEip1559, active| {
    let payload = tx.encoded_for_signing();
    prepare_review(
      active,
      &payload,
      Some(simulation(active, &payload)),
      REVIEWED_AT,
      EXPIRES_AT,
    )
    .unwrap_err()
  };

  let mut listed = tx.clone();
  listed.access_list.0.push(AccessListItem {
    address: Address::from([0x44; 20]),
    storage_keys: vec![],
  });
  for candidate in [
    listed,
    TxEip1559 {
      input: vec![1].into(),
      ..tx.clone()
    },
    TxEip1559 {
      value: U256::ZERO,
      ..tx.clone()
    },
    TxEip1559 {
      to: TxKind::Create,
      ..tx.clone()
    },
    TxEip1559 {
      gas_limit: 22_000,
      ..tx.clone()
    },
    TxEip1559 {
      max_fee_per_gas: 0,
      max_priority_fee_per_gas: 0,
      ..tx.clone()
    },
    TxEip1559 {
      max_priority_fee_per_gas: tx.max_fee_per_gas + 1,
      ..tx.clone()
    },
  ] {
    assert_eq!(check(candidate, active), Refusal::UnsupportedTransfer);
  }
  assert_eq!(check(transaction(1), context(8453)), Refusal::ChainMismatch);
  assert_eq!(
    check(transaction(10), context(10)),
    Refusal::UnsupportedChain
  );
}

#[test]
fn requires_a_successful_simulation_for_this_chain_account_and_payload() {
  use binding::Refusal;

  let active = context(1);
  let payload = transaction(1).encoded_for_signing();
  let evidence = simulation(active, &payload);
  let check =
    |evidence| prepare_review(active, &payload, evidence, REVIEWED_AT, EXPIRES_AT).unwrap_err();
  assert_eq!(check(None), Refusal::MissingSimulation);
  for (outcome, expected) in [
    (SimulationOutcome::Failed, Refusal::FailedSimulation),
    (
      SimulationOutcome::ProviderDisagreement,
      Refusal::ProviderDisagreement,
    ),
    (
      SimulationOutcome::UnsupportedRecipient,
      Refusal::UnsupportedRecipient,
    ),
  ] {
    assert_eq!(
      check(Some(Simulation {
        outcome,
        ..evidence
      })),
      expected
    );
  }
  for different_subject in [
    Simulation {
      chain_id: 8453,
      ..evidence
    },
    Simulation {
      account: Address::from([0x44; 20]),
      ..evidence
    },
    Simulation {
      payload_hash: sha3(b"other bytes"),
      ..evidence
    },
  ] {
    assert_eq!(
      check(Some(different_subject)),
      Refusal::SimulationSubjectMismatch
    );
  }
  for missing_hash in [
    Simulation {
      block_hash: B256::ZERO,
      ..evidence
    },
    Simulation {
      result_hash: B256::ZERO,
      ..evidence
    },
  ] {
    assert_eq!(check(Some(missing_hash)), Refusal::MissingSimulationHash);
  }
}

#[test]
fn rejects_each_changed_approval_input_even_with_matching_simulation_subject() {
  use binding::Refusal;

  let tx = transaction(1);
  let payload = tx.encoded_for_signing();
  let active = context(1);
  let evidence = simulation(active, &payload);
  let approval = prepare_review(active, &payload, Some(evidence), REVIEWED_AT, EXPIRES_AT)
    .unwrap()
    .approval;
  let check = |context, payload: &[u8], evidence| {
    check_approval(approval, context, payload, Some(evidence), REVIEWED_AT)
  };

  for changed in [
    TxEip1559 {
      nonce: tx.nonce + 1,
      ..tx.clone()
    },
    TxEip1559 {
      to: TxKind::Call(Address::from([0x55; 20])),
      ..tx.clone()
    },
    TxEip1559 {
      value: tx.value + U256::from(1),
      ..tx.clone()
    },
    TxEip1559 {
      max_fee_per_gas: tx.max_fee_per_gas + 1,
      ..tx.clone()
    },
    TxEip1559 {
      max_priority_fee_per_gas: tx.max_priority_fee_per_gas + 1,
      ..tx
    },
  ] {
    let changed = changed.encoded_for_signing();
    assert_eq!(
      check(active, &changed, simulation(active, &changed)),
      Err(Refusal::ApprovalMismatch)
    );
  }
  let other_chain = context(8453);
  let other_payload = transaction(8453).encoded_for_signing();
  assert_eq!(
    check(
      other_chain,
      &other_payload,
      simulation(other_chain, &other_payload)
    ),
    Err(Refusal::ApprovalMismatch)
  );

  for changed in [
    ActiveContext {
      account: Address::from([0x44; 20]),
      ..active
    },
    ActiveContext {
      session_id: B256::from([0x66; 32]),
      ..active
    },
    ActiveContext {
      device_generation: active.device_generation + 1,
      ..active
    },
    // The same chain and account were selected again after switching away.
    ActiveContext {
      selection_epoch: active.selection_epoch + 2,
      ..active
    },
  ] {
    assert_eq!(
      check(changed, &payload, simulation(changed, &payload)),
      Err(Refusal::ApprovalMismatch)
    );
  }
  assert_eq!(
    check(
      ActiveContext {
        rendering_version: 2,
        ..active
      },
      &payload,
      evidence
    ),
    Err(Refusal::UnsupportedRenderingVersion)
  );

  for changed in [
    Simulation {
      block_hash: B256::from([0x77; 32]),
      ..evidence
    },
    Simulation {
      result_hash: B256::from([0x88; 32]),
      ..evidence
    },
  ] {
    assert_eq!(
      check(active, &payload, changed),
      Err(Refusal::ApprovalMismatch)
    );
  }
}

#[test]
fn checks_session_and_review_lifetime() {
  use binding::{Approval, Refusal};

  let active = context(8453);
  let payload = transaction(8453).encoded_for_signing();
  let evidence = Some(simulation(active, &payload));
  assert_eq!(
    prepare_review(
      ActiveContext {
        session_id: B256::ZERO,
        ..active
      },
      &payload,
      evidence,
      REVIEWED_AT,
      EXPIRES_AT
    )
    .unwrap_err(),
    Refusal::MissingSession
  );
  for invalid_expiry in [REVIEWED_AT - 1, REVIEWED_AT, REVIEWED_AT + 121] {
    assert_eq!(
      prepare_review(active, &payload, evidence, REVIEWED_AT, invalid_expiry).unwrap_err(),
      Refusal::InvalidLifetime
    );
  }
  let approval = prepare_review(active, &payload, evidence, REVIEWED_AT, EXPIRES_AT)
    .unwrap()
    .approval;
  for now in [REVIEWED_AT - 1, EXPIRES_AT, EXPIRES_AT + 1] {
    assert_eq!(
      check_approval(approval, active, &payload, evidence, now),
      Err(Refusal::ApprovalInactive)
    );
  }
  for changed in [
    Approval {
      expires_at: EXPIRES_AT + 1,
      ..approval
    },
    Approval {
      reviewed_at: REVIEWED_AT - 1,
      ..approval
    },
  ] {
    assert_eq!(
      check_approval(changed, active, &payload, evidence, REVIEWED_AT),
      Err(Refusal::ApprovalMismatch)
    );
  }
}

#[test]
fn reproduces_independent_base_digest_vector() {
  let vector: serde_json::Value =
    serde_json::from_str(include_str!("approval/vector.json")).unwrap();
  let number = |field: &str| vector[field].as_u64().unwrap();
  let string = |field: &str| vector[field].as_str().unwrap();
  let active = ActiveContext {
    chain_id: number("chain_id"),
    account: string("account").parse().unwrap(),
    rendering_version: u32::try_from(number("rendering_version")).unwrap(),
    session_id: string("session_id").parse().unwrap(),
    device_generation: number("device_generation"),
    selection_epoch: number("selection_epoch"),
  };
  let payload = alloy_primitives::hex::decode(string("unsigned_transaction")).unwrap();
  let evidence = Simulation {
    chain_id: active.chain_id,
    account: active.account,
    payload_hash: string("simulation_payload_hash").parse().unwrap(),
    block_hash: string("simulation_block_hash").parse().unwrap(),
    result_hash: string("simulation_result_hash").parse().unwrap(),
    outcome: SimulationOutcome::CodeEmptyTransfer,
  };
  assert_eq!(transaction(active.chain_id).encoded_for_signing(), payload);
  let review = prepare_review(
    active,
    &payload,
    Some(evidence),
    number("reviewed_at"),
    number("expires_at"),
  )
  .unwrap();
  assert_eq!(
    review.transfer.recipient,
    string("recipient").parse::<Address>().unwrap()
  );
  assert_eq!(
    review.transfer.value_wei,
    string("value_wei").parse::<U256>().unwrap()
  );
  assert_eq!(
    review.transfer.max_execution_fee_wei,
    string("max_execution_fee_wei").parse::<U256>().unwrap()
  );
  assert_eq!(
    review.approval.digest,
    string("approval_digest").parse::<B256>().unwrap()
  );
}
