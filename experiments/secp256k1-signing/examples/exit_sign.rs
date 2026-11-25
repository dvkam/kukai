use std::{
  env,
  error::Error,
  fs,
  io::{self, Write},
  process::ExitCode,
};

use alloy_consensus::{SignableTransaction, TxEnvelope};
use alloy_eips::eip2718::Encodable2718;
use alloy_primitives::{Address, Signature};
use cggmp24::{
  generic_ec::Point,
  key_share::{reconstruct_secret_key, IncompleteKeyShare},
  supported_curves::Secp256k1,
};
use k256::ecdsa::SigningKey;
use wallet_secp256k1_signing_experiment::{
  exit_fixture_transfer, DEVICE, PARTICIPANTS, RECOVERY, THRESHOLD,
};

fn read_share(file: &str, role: u16) -> Result<IncompleteKeyShare<Secp256k1>, Box<dyn Error>> {
  let bytes = fs::read(file).map_err(|error| format!("{file}: {error}"))?;
  let share: IncompleteKeyShare<Secp256k1> =
    serde_json::from_slice(&bytes).map_err(|_| format!("invalid {file} key share"))?;
  if share.i != role || share.n() != PARTICIPANTS || share.min_signers() != THRESHOLD {
    return Err(format!("unexpected {file} role or quorum").into());
  }
  Ok(share)
}

fn run() -> Result<(), Box<dyn Error>> {
  let arguments: Vec<_> = env::args().skip(1).collect();
  let [chain, nonce] = arguments.as_slice() else {
    return Err("usage: exit_sign CHAIN NONCE".into());
  };
  let transaction = exit_fixture_transfer(chain.parse()?, nonce.parse()?)?;
  let account = fs::read("account")?;
  let device = read_share("device", DEVICE)?;
  let recovery = read_share("recovery", RECOVERY)?;
  let public = device.shared_public_key();
  if recovery.shared_public_key() != public {
    return Err("retained shares represent different keys".into());
  }
  if Address::from_raw_public_key(&public.to_bytes(false)[1..]).as_slice() != account {
    return Err("retained shares differ from expected account".into());
  }

  let secret = reconstruct_secret_key(&[device, recovery])?;
  if Point::generator() * &secret != public {
    return Err("reconstructed key differs from expected public key".into());
  }
  // This is the conventional 32-byte secp256k1 private key export. Keep it in memory.
  let signing_key = SigningKey::from_slice(&secret.as_ref().to_be_bytes())?;
  let (signature, recovery_id) =
    signing_key.sign_prehash_recoverable(transaction.signature_hash().as_slice())?;
  if recovery_id.is_x_reduced() {
    return Err("fixture signature recovery ID cannot be represented by EIP-1559".into());
  }
  let signature = Signature::from_signature_and_parity(signature, recovery_id.is_y_odd());
  let envelope: TxEnvelope = transaction.into_signed(signature).into();
  io::stdout().write_all(&envelope.encoded_2718())?;
  Ok(())
}

fn main() -> ExitCode {
  match run() {
    Ok(()) => ExitCode::SUCCESS,
    Err(error) => {
      eprintln!("{error}");
      ExitCode::FAILURE
    }
  }
}
