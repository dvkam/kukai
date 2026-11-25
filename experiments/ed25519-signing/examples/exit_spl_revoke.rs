//! Sign a fixed classic SPL Token Revoke message for the synthetic exit drill.
mod exit_quorum;

use std::{
  env,
  io::{self, Write},
};
use wallet_ed25519_signing_experiment::sign;

const SOURCE: [u8; 32] = [b'P'; 32];
// TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
const TOKEN_PROGRAM: [u8; 32] = [
  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
  95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];
// The initial recent blockhash of the pinned local LiteSVM. The signer accepts no blockhash input.
const FIXTURE_BLOCKHASH: [u8; 32] = [
  174, 235, 173, 74, 121, 111, 204, 46, 21, 220, 76, 96, 97, 180, 94, 217, 179, 115, 242, 106, 223,
  199, 152, 202, 125, 45, 140, 197, 129, 130, 113, 142,
];

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Vec<_> = env::args_os().skip(1).collect();
  let [device, recovery, public, expected_account] = args.as_slice() else {
    return Err("expected device, recovery, public package and pinned account files".into());
  };
  let (shares, public, owner) = exit_quorum::load(device, recovery, public, expected_account)?;
  // Legacy header: one signer, no read-only signer and one read-only key. Three keys follow.
  let mut message = vec![1, 0, 1, 3];
  message.extend(owner);
  message.extend(SOURCE);
  message.extend(TOKEN_PROGRAM);
  message.extend(FIXTURE_BLOCKHASH);
  // One instruction invokes key 2 with source (key 1), owner (key 0) and the Revoke discriminator.
  message.extend([1, 2, 2, 1, 0, 1, 5]);
  let signature = sign(&shares, &public, &message)?;
  io::stdout().write_all(&signature.serialize()?)?;
  Ok(())
}
