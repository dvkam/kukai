use std::collections::BTreeMap;

use blake2::{digest::consts::U32, Blake2b, Digest};
use frost_ed25519 as frost;
use rand_core::OsRng;

pub const SERVICE: u16 = 2;

pub fn tezos_digest(message: &[u8]) -> Vec<u8> {
  Blake2b::<U32>::digest(message).to_vec()
}

pub struct Group {
  pub shares: BTreeMap<frost::Identifier, frost::keys::KeyPackage>,
  pub public: frost::keys::PublicKeyPackage,
}

pub type SignatureShares = BTreeMap<frost::Identifier, frost::round2::SignatureShare>;

pub fn dkg() -> Group {
  ceremony(None, None).unwrap()
}

// Drop one private round-two delivery to model an interrupted refresh.
pub fn refresh(
  old: &Group,
  dropped: Option<(frost::Identifier, frost::Identifier)>,
) -> Result<Group, frost::Error> {
  ceremony(Some(old), dropped)
}

fn ceremony(
  old: Option<&Group>,
  dropped: Option<(frost::Identifier, frost::Identifier)>,
) -> Result<Group, frost::Error> {
  let mut secrets = BTreeMap::new();
  let mut broadcasts = BTreeMap::new();
  for number in 1u16..=3 {
    let id = number.try_into().unwrap();
    let (secret, broadcast) = match old {
      None => frost::keys::dkg::part1(id, 3, 2, OsRng),
      Some(_) => frost::keys::refresh::refresh_dkg_part1(id, 3, 2, OsRng),
    }?;
    secrets.insert(id, secret);
    broadcasts.insert(id, broadcast);
  }

  let mut round1_inputs = BTreeMap::new();
  let mut round2_secrets = BTreeMap::new();
  let mut deliveries = BTreeMap::new();
  for (id, secret) in secrets {
    let received = broadcasts
      .iter()
      .filter(|(sender, _)| **sender != id)
      .map(|(sender, package)| (*sender, package.clone()))
      .collect();
    let (secret, outgoing) = match old {
      None => frost::keys::dkg::part2(secret, &received),
      Some(_) => frost::keys::refresh::refresh_dkg_part2(secret, &received),
    }?;
    round1_inputs.insert(id, received);
    round2_secrets.insert(id, secret);
    for (recipient, package) in outgoing {
      if dropped == Some((id, recipient)) {
        continue;
      }
      deliveries
        .entry(recipient)
        .or_insert_with(BTreeMap::new)
        .insert(id, package);
    }
  }

  let mut shares = BTreeMap::new();
  let mut agreed_public = None;
  for (id, secret) in round2_secrets {
    let (key, public) = match old {
      None => frost::keys::dkg::part3(&secret, &round1_inputs[&id], &deliveries[&id]),
      Some(group) => frost::keys::refresh::refresh_dkg_shares(
        &secret,
        &round1_inputs[&id],
        &deliveries[&id],
        group.public.clone(),
        group.shares[&id].clone(),
      ),
    }?;
    if let Some(previous) = &agreed_public {
      assert_eq!(previous, &public, "participants disagree on DKG output");
    } else {
      agreed_public = Some(public);
    }
    shares.insert(id, key);
  }
  Ok(Group {
    shares,
    public: agreed_public.unwrap(),
  })
}

pub fn sign(
  shares: &BTreeMap<frost::Identifier, frost::keys::KeyPackage>,
  public: &frost::keys::PublicKeyPackage,
  message: &[u8],
) -> Result<frost::Signature, frost::Error> {
  let (package, shares) = signature_shares(shares, message)?;
  frost::aggregate(&package, &shares, public)
}

pub fn signature_shares(
  shares: &BTreeMap<frost::Identifier, frost::keys::KeyPackage>,
  message: &[u8],
) -> Result<(frost::SigningPackage, SignatureShares), frost::Error> {
  let mut nonces = BTreeMap::new();
  let mut commitments = BTreeMap::new();
  for (id, key) in shares {
    let (nonce, commitment) = frost::round1::commit(key.signing_share(), &mut OsRng);
    nonces.insert(*id, nonce);
    commitments.insert(*id, commitment);
  }
  let package = frost::SigningPackage::new(commitments, message);
  let mut signature_shares = BTreeMap::new();
  for (id, nonce) in nonces {
    signature_shares.insert(id, frost::round2::sign(&package, &nonce, &shares[&id])?);
  }
  Ok((package, signature_shares))
}

#[cfg(target_arch = "wasm32")]
mod browser;
