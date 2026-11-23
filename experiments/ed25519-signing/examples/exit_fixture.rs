//! Prepare ephemeral fixture files or independently verify a detached challenge signature.
use std::{env, fs, path::Path};
use wallet_ed25519_signing_experiment::{dkg, refresh, Group};

fn save(folder: &Path, group: &Group) -> Result<(), Box<dyn std::error::Error>> {
  fs::create_dir(folder)?;
  for (number, name) in [(1u16, "device"), (3, "recovery")] {
    fs::write(
      folder.join(name),
      group.shares[&number.try_into()?].serialize()?,
    )?;
  }
  fs::write(folder.join("public"), group.public.serialize()?)?;
  Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Vec<_> = env::args().skip(1).collect();
  match args.as_slice() {
    [action, directory] if action == "prepare" => {
      let root = Path::new(directory);
      let mut directory = fs::DirBuilder::new();
      #[cfg(unix)]
      {
        use std::os::unix::fs::DirBuilderExt;
        directory.mode(0o700);
      }
      directory.create(root)?;
      let old = dkg();
      let fresh = refresh(&old, None)?;
      fs::write(
        root.join("account"),
        old.public.verifying_key().serialize()?,
      )?;
      save(&root.join("old"), &old)?;
      save(&root.join("fresh"), &fresh)?;
    }
    [action, account, challenge, signature] if action == "verify" => {
      let public: [u8; 32] = fs::read(account)?
        .try_into()
        .map_err(|_| "bad account length")?;
      let input: [u8; 32] = fs::read(challenge)?
        .try_into()
        .map_err(|_| "bad challenge length")?;
      let raw: [u8; 64] = fs::read(signature)?
        .try_into()
        .map_err(|_| "bad signature length")?;
      let message = [b"Kukai PoC offline exit challenge v1\0".as_slice(), &input].concat();
      if !solana_signature::Signature::from(raw).verify(&public, &message) {
        return Err("signature did not verify".into());
      }
    }
    _ => return Err("expected prepare DIRECTORY or verify ACCOUNT CHALLENGE SIGNATURE".into()),
  }
  Ok(())
}
