use std::{
  env, error::Error, fs, io::Write, os::unix::fs::OpenOptionsExt, path::Path, process::ExitCode,
};

use alloy_consensus::{transaction::SignerRecoverable, SignableTransaction, TxEnvelope};
use alloy_eips::eip2718::Decodable2718;
use alloy_primitives::{Address, U256};
use k256::ecdsa::{signature::hazmat::PrehashVerifier, RecoveryId, Signature, VerifyingKey};
use sha3::{Digest, Keccak256};
use wallet_secp256k1_signing_experiment::{dkg, exit_fixture_transfer, DEVICE, RECOVERY};

fn write_private(path: &Path, data: &[u8]) -> std::io::Result<()> {
  fs::OpenOptions::new()
    .write(true)
    .create_new(true)
    .mode(0o600)
    .open(path)?
    .write_all(data)
}

fn prepare(folder: &Path) -> Result<(), Box<dyn Error>> {
  fs::create_dir(folder)?;
  let shares = dkg();
  let public = shares[usize::from(DEVICE)]
    .shared_public_key()
    .to_bytes(false);
  let account = Address::from_raw_public_key(&public[1..]);
  for (role, filename) in [(DEVICE, "device"), (RECOVERY, "recovery")] {
    let share = &shares[usize::from(role)];
    if share.i != role {
      return Err("unexpected fixture participant index".into());
    }
    write_private(&folder.join(filename), &serde_json::to_vec(share)?)?;
  }
  write_private(&folder.join("account"), account.as_slice())?;
  write_private(&folder.join("public"), &public)?;
  Ok(())
}

fn verify(chain: u64, nonce: u64) -> Result<(), Box<dyn Error>> {
  let account = fs::read("account")?;
  let public = fs::read("public")?;
  let expected = exit_fixture_transfer(chain, nonce)?;
  let envelope = TxEnvelope::decode_2718_exact(&fs::read("transaction")?)?;
  let signed = envelope
    .as_eip1559()
    .ok_or("expected an EIP-1559 envelope")?;
  if signed.tx() != &expected || envelope.recover_signer()?.as_slice() != account {
    return Err("wrong fixture transaction or account".into());
  }

  let public = VerifyingKey::from_sec1_bytes(&public)?;
  let public_bytes = public.to_encoded_point(false);
  let derived_account = Keccak256::digest(&public_bytes.as_bytes()[1..]);
  if derived_account[12..] != account {
    return Err("retained public key differs from expected account".into());
  }

  let alloy_signature = signed.signature();
  let signature = Signature::from_scalars(
    alloy_signature.r().to_be_bytes::<32>(),
    alloy_signature.s().to_be_bytes::<32>(),
  )?;
  let recovery_id = RecoveryId::new(alloy_signature.v(), false);
  let hash = expected.signature_hash();
  public.verify_prehash(hash.as_slice(), &signature)?;
  if VerifyingKey::recover_from_prehash(hash.as_slice(), &signature, recovery_id)? != public {
    return Err("independent recovery differs from retained public key".into());
  }

  let mut changed_value = expected.clone();
  changed_value.value += U256::from(1);
  let changed_chain = exit_fixture_transfer(if chain == 1 { 8453 } else { 1 }, nonce)?;
  for changed in [changed_value, changed_chain] {
    if public
      .verify_prehash(changed.signature_hash().as_slice(), &signature)
      .is_ok()
    {
      return Err("changed transaction verified".into());
    }
  }
  Ok(())
}

fn run() -> Result<(), Box<dyn Error>> {
  let arguments: Vec<_> = env::args().skip(1).collect();
  match arguments.as_slice() {
    [verb, folder] if verb == "prepare" => prepare(Path::new(folder)),
    [verb, chain, nonce] if verb == "verify" => verify(chain.parse()?, nonce.parse()?),
    _ => Err("usage: exit_fixture prepare DIR | verify CHAIN NONCE".into()),
  }
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
