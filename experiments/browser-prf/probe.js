/* exported exercisePRF */
// Runs inside the test origin. Only the case verdict leaves the browser.
/** @param {boolean} expectedSupport */
async function exercisePRF(expectedSupport) {
  const fresh = () => crypto.getRandomValues(new Uint8Array(32));
  const options = { prf: {} };
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: fresh(),
      rp: { name: 'Wallet PoC' },
      user: { id: fresh(), name: 'fixture', displayName: 'Fixture' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { userVerification: 'required' },
      extensions: options,
      timeout: 8000
    }
  });
  if (!(credential instanceof window.PublicKeyCredential)) throw Error('Registration failed');
  const credentialId = credential.rawId;
  const enabled = credential.getClientExtensionResults().prf?.enabled === true;
  if (enabled !== expectedSupport) throw Error('Unexpected PRF capability at registration');

  /** @param {Uint8Array} salt */
  async function getKey(salt) {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: fresh(),
        allowCredentials: [{ type: 'public-key', id: credentialId }],
        userVerification: 'required',
        extensions: { prf: { eval: { first: salt } } },
        timeout: 8000
      }
    });
    if (!(assertion instanceof window.PublicKeyCredential)) throw Error('Assertion failed');
    const output = assertion.getClientExtensionResults().prf?.results?.first;
    if (!output || output.byteLength !== 32) return null;
    return crypto.subtle.importKey('raw', output, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  const salt = fresh();
  const first = await getKey(salt);
  if (!enabled) {
    if (first !== null) throw Error('Unexpected wrapping key from unsupported authenticator');
    return 'refused: no PRF output';
  }
  if (!first) throw Error('PRF enabled without usable output');
  const repeated = await getKey(salt);
  const distinct = await getKey(fresh());
  if (!repeated || !distinct) throw Error('Missing PRF output on subsequent assertion');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const algorithm = { name: 'AES-GCM', iv };
  const fixture = fresh();
  const ciphertext = await crypto.subtle.encrypt(algorithm, first, fixture);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(algorithm, repeated, ciphertext));
  if (!fixture.every((value, index) => value === plaintext[index])) throw Error('Restore mismatch');
  try {
    await crypto.subtle.decrypt(algorithm, distinct, ciphertext);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      return 'restored with same salt and rejected changed salt';
    }
    throw error;
  }
  throw Error('Changed salt opened the fixture');
}
