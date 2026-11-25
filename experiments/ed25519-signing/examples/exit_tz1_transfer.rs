//! Sign one fixed synthetic Tezos tz1 transfer with the retained user quorum.
mod exit_quorum;

use std::{
  env,
  io::{self, Write},
};
use tezos_crypto_rs::{
  hash::{ContractTz1Hash, Ed25519Signature, HashTrait, PublicKeyEd25519},
  PublicKeySignatureVerifier, PublicKeyWithHash,
};
use wallet_ed25519_signing_experiment::{sign, tezos_digest};

// Fake block hash used by the Ushuaia codec comparison in experiments/tezos-encoding.
const BRANCH: [u8; 32] = [0x42; 32];
const DESTINATION: &str = "tz1YW31pcYhHMacKHZbZUTBVXXTptpDKLUEK";

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Vec<_> = env::args_os().skip(1).collect();
  let [device, recovery, public, expected_account] = args.as_slice() else {
    return Err("expected device, recovery, public package and pinned account files".into());
  };
  let (shares, public, account) = exit_quorum::load(device, recovery, public, expected_account)?;
  let source = PublicKeyEd25519::try_from_bytes(&account)?;
  let destination = ContractTz1Hash::from_b58check(DESTINATION)?;

  let mut watermarked = vec![0x03];
  watermarked.extend(BRANCH);
  watermarked.extend([108, 0]); // transaction tag and tz1 source tag
  watermarked.extend_from_slice(source.pk_hash().as_ref());
  // The manager fields are unsigned Zarith. The destination uses the implicit-contract tag.
  watermarked.extend([0xf4, 0x03]); // fee: 500 mutez
  watermarked.push(1); // counter
  watermarked.extend([0xdc, 0x0b]); // gas limit: 1,500
  watermarked.push(0); // storage limit
  watermarked.extend([0xc0, 0x84, 0x3d]); // amount: 1,000,000 mutez
  watermarked.extend([0, 0]); // implicit contract, tz1
  watermarked.extend_from_slice(destination.as_ref());
  watermarked.push(0); // absent parameters

  let raw = sign(&shares, &public, &tezos_digest(&watermarked))?.serialize()?;
  let signature = Ed25519Signature::try_from_bytes(&raw)?;
  if !source.verify_signature(&signature, &watermarked)? {
    return Err("Tezos signature did not verify".into());
  }
  let mut stdout = io::stdout().lock();
  for byte in &watermarked[1..] {
    write!(stdout, "{byte:02x}")?;
  }
  writeln!(stdout, "\n{}", signature.to_b58check())?;
  Ok(())
}
