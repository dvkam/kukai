//! Synthetic proof of control using retained FROST packages for A1. Inputs are test keys.
use frost_ed25519::{
  keys::{KeyPackage, PublicKeyPackage},
  Identifier,
};
use std::{
  collections::BTreeMap,
  env, fs,
  io::{self, Write},
};
use wallet_ed25519_signing_experiment::sign;

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Vec<_> = env::args_os().skip(1).collect();
  let [device, recovery, public, expected_account, challenge] = args.as_slice() else {
    return Err(
      "expected device, recovery, public package, pinned account and challenge files".into(),
    );
  };
  let public = PublicKeyPackage::deserialize(&fs::read(public)?)?;
  let account: [u8; 32] = fs::read(expected_account)?
    .try_into()
    .map_err(|_| "bad account length")?;
  if public.verifying_key().serialize()?.as_slice() != account {
    return Err("public package differs from pinned account".into());
  }
  let mut shares = BTreeMap::new();
  for (number, path) in [(1u16, device), (3, recovery)] {
    let id = Identifier::try_from(number)?;
    let share = KeyPackage::deserialize(&fs::read(path)?)?;
    if share.identifier() != &id
      || *share.min_signers() != 2
      || share.verifying_key() != public.verifying_key()
      || public.verifying_shares().get(&id) != Some(share.verifying_share())
    {
      return Err("user package does not match the expected role and public package".into());
    }
    shares.insert(id, share);
  }
  let challenge: [u8; 32] = fs::read(challenge)?
    .try_into()
    .map_err(|_| "bad challenge length")?;
  let message = [
    b"Kukai PoC offline exit challenge v1\0".as_slice(),
    &challenge,
  ]
  .concat();
  let signature = sign(&shares, &public, &message)?;
  io::stdout().write_all(&signature.serialize()?)?;
  Ok(())
}
