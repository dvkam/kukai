use std::{collections::BTreeMap, ffi::OsStr, fs};

use frost_ed25519::{
  keys::{KeyPackage, PublicKeyPackage},
  Identifier,
};

type Quorum = (BTreeMap<Identifier, KeyPackage>, PublicKeyPackage, [u8; 32]);

pub fn load(
  device: &OsStr,
  recovery: &OsStr,
  public: &OsStr,
  expected_account: &OsStr,
) -> Result<Quorum, Box<dyn std::error::Error>> {
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
  Ok((shares, public, account))
}
