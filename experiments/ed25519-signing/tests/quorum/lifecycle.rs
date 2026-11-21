use super::support::{dkg, sign, Group};
use frost_ed25519::{keys::KeyPackage, Identifier};
use std::collections::BTreeMap;

const MESSAGE: &[u8] = b"post-refresh user-quorum check";

fn member(number: u16) -> Identifier {
  number.try_into().unwrap()
}

fn user_pair(device: &Group, recovery: &Group) -> BTreeMap<Identifier, KeyPackage> {
  BTreeMap::from([
    (member(1), device.shares[&member(1)].clone()),
    (member(3), recovery.shares[&member(3)].clone()),
  ])
}

fn verify_signature(shares: BTreeMap<Identifier, KeyPackage>, group: &Group) {
  let signature = sign(&shares, &group.public, MESSAGE).unwrap();
  let bytes: [u8; 64] = signature.serialize().unwrap().try_into().unwrap();
  assert!(solana_signature::Signature::from(bytes)
    .verify(&group.public.verifying_key().serialize().unwrap(), MESSAGE));
}

#[test]
fn refresh_preserves_the_account_and_separates_share_generations() {
  let old = dkg();
  let new = super::support::refresh(&old, None).unwrap();
  assert_eq!(old.public.verifying_key(), new.public.verifying_key());
  verify_signature(user_pair(&new, &new), &new);
  // A later service compromise must not make a stolen pre-refresh device share usable.
  let service = member(2);
  let device = member(1);
  let with_current_service = |device_group: &Group| {
    BTreeMap::from([
      (device, device_group.shares[&device].clone()),
      (service, new.shares[&service].clone()),
    ])
  };
  verify_signature(with_current_service(&new), &new);
  for public in [&old.public, &new.public] {
    assert!(sign(&with_current_service(&old), public, MESSAGE).is_err());
  }
  verify_signature(user_pair(&old, &old), &old);
  for group in [&old, &new] {
    for mixed in [user_pair(&new, &old), user_pair(&old, &new)] {
      assert!(sign(&mixed, &group.public, MESSAGE).is_err());
    }
  }
}

#[test]
fn interrupted_refresh_leaves_the_original_quorum_available_for_retry() {
  let original = dkg();
  assert!(matches!(
    super::support::refresh(&original, Some((member(1), member(3)))),
    Err(frost_ed25519::Error::IncorrectNumberOfPackages)
  ));
  verify_signature(user_pair(&original, &original), &original);
  let retried = super::support::refresh(&original, None).unwrap();
  assert_eq!(
    retried.public.verifying_key(),
    original.public.verifying_key()
  );
  verify_signature(user_pair(&retried, &retried), &retried);
}

#[test]
fn refreshed_recovery_backup_restores_a_user_quorum() {
  let old = dkg();
  let stale_backup = old.shares[&member(3)].serialize().unwrap();
  let new = super::support::refresh(&old, None).unwrap();
  let fresh_backup = new.shares[&member(3)].serialize().unwrap();
  let restore = |backup: &[u8]| {
    BTreeMap::from([
      (member(1), new.shares[&member(1)].clone()),
      (member(3), KeyPackage::deserialize(backup).unwrap()),
    ])
  };
  assert!(sign(&restore(&stale_backup), &new.public, MESSAGE).is_err());
  verify_signature(restore(&fresh_backup), &new);
}

#[test]
fn repairing_a_lost_device_share_restores_signing_without_revoking_a_copy() {
  use frost_ed25519::keys::repairable::{
    repair_share_part1, repair_share_part2, repair_share_part3,
  };
  use rand_core::OsRng;

  let mut group = dkg();
  let device = member(1);
  // Keep a copy outside the repair inputs to represent an un-erased lost device.
  let retained = group.shares.remove(&device).unwrap();
  let helpers = [member(2), member(3)];
  let mut received = BTreeMap::<_, Vec<_>>::new();
  for helper in helpers {
    let outgoing = repair_share_part1::<frost_ed25519::Ed25519Sha512, _>(
      &helpers,
      &group.shares[&helper],
      &mut OsRng,
      device,
    )
    .unwrap();
    for (recipient, delta) in outgoing {
      received.entry(recipient).or_default().push(delta);
    }
  }
  let sigmas = helpers.map(|helper| repair_share_part2(&received[&helper]));
  let repaired = repair_share_part3(&sigmas, device, &group.public).unwrap();
  assert_eq!(
    repaired.verifying_share(),
    &group.public.verifying_shares()[&device]
  );
  let recovery = member(3);
  for key in [repaired, retained] {
    verify_signature(
      BTreeMap::from([(device, key), (recovery, group.shares[&recovery].clone())]),
      &group,
    );
  }
}
