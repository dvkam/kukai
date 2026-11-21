// WebAuthn Level 3 PRF extension, absent from the wallet's TypeScript 5.2 DOM definitions.
interface AuthenticationExtensionsClientInputs {
  prf?: { eval?: { first: BufferSource } };
}

interface AuthenticationExtensionsClientOutputs {
  prf?: { enabled?: boolean; results?: { first: ArrayBuffer } };
}
