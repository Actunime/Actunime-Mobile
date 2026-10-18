import * as Crypto from 'expo-crypto';

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface IPkcePair {
  verifier: string;
  challenge: string;
}

/** PKCE S256 (RFC 7636) : verifier de 43 caractères et son empreinte SHA-256 en base64url. */
export async function createPkcePair(): Promise<IPkcePair> {
  const bytes = Crypto.getRandomBytes(32);
  const verifier = toBase64Url(btoa(String.fromCharCode(...bytes)));
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return { verifier, challenge: toBase64Url(digest) };
}

export function createState(): string {
  return toBase64Url(btoa(String.fromCharCode(...Crypto.getRandomBytes(16))));
}
