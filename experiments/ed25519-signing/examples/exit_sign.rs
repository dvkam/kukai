//! Synthetic proof of control using retained FROST packages for A1. Inputs are test keys.
mod exit_quorum;

use std::{
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
  let (shares, public, _) = exit_quorum::load(device, recovery, public, expected_account)?;
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
