//! Sign only the fixed native SOL transfer used by the synthetic exit drill.
mod exit_quorum;

use std::{
  env, fs,
  io::{self, Write},
};
use wallet_ed25519_signing_experiment::sign;

const PARTIAL_AMOUNT: u64 = 2_000_000;
const SWEEP_AMOUNT: u64 = 9_995_000;
const SYSTEM_PROGRAM: [u8; 32] = [0; 32];

struct SolTransfer {
  payer: [u8; 32],
  recipient: [u8; 32],
  blockhash: [u8; 32],
  lamports: u64,
}

impl SolTransfer {
  fn decode(bytes: &[u8], expected_account: [u8; 32]) -> Result<Self, Box<dyn std::error::Error>> {
    let bytes: &[u8; 112] = bytes
      .try_into()
      .map_err(|_| "invalid SOL transfer fixture length")?;
    let tag = &bytes[..8];
    let payer = &bytes[8..40];
    let recipient = &bytes[40..72];
    let blockhash = &bytes[72..104];
    let lamports = u64::from_le_bytes(bytes[104..].try_into()?);
    if tag != b"KUKASOL1" {
      return Err("invalid SOL transfer fixture tag".into());
    }
    if payer != expected_account {
      return Err("transfer payer differs from pinned account".into());
    }
    if recipient == payer || recipient == SYSTEM_PROGRAM || blockhash == SYSTEM_PROGRAM {
      return Err("unexpected recipient or blockhash for fixture".into());
    }
    if !matches!(lamports, PARTIAL_AMOUNT | SWEEP_AMOUNT) {
      return Err("unexpected fixture amount".into());
    }
    Ok(Self {
      payer: expected_account,
      recipient: recipient.try_into()?,
      blockhash: blockhash.try_into()?,
      lamports,
    })
  }

  fn message(&self) -> Vec<u8> {
    // Legacy header: one signer, no read-only signer, one read-only key. The three keys follow.
    let mut message = vec![1, 0, 1, 3];
    message.extend(self.payer);
    message.extend(self.recipient);
    message.extend(SYSTEM_PROGRAM);
    message.extend(self.blockhash);
    // One instruction invokes key 2 with accounts 0 and 1 and twelve data bytes.
    message.extend([1, 2, 2, 0, 1, 12]);
    message.extend(2u32.to_le_bytes()); // SystemInstruction::Transfer
    message.extend(self.lamports.to_le_bytes());
    message
  }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Vec<_> = env::args_os().skip(1).collect();
  let [device, recovery, public, expected_account, transfer] = args.as_slice() else {
    return Err(
      "expected device, recovery, public package, pinned account and SOL transfer fixture files"
        .into(),
    );
  };
  let (shares, public, account) = exit_quorum::load(device, recovery, public, expected_account)?;
  let transfer = SolTransfer::decode(&fs::read(transfer)?, account)?;
  let signature = sign(&shares, &public, &transfer.message())?;
  io::stdout().write_all(&signature.serialize()?)?;
  Ok(())
}
