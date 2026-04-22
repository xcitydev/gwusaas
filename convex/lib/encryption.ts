import { v } from "convex/values";

/**
 * Encryption utility using Web Crypto API (AES-GCM)
 * Requires ENCRYPTION_KEY in environment variables
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // Standard for AES-GCM

/**
 * Gets the raw encryption key as a CryptoKey
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const password = process.env.ENCRYPTION_KEY;
  if (!password) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }

  const pwEncoded = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", pwEncoded);
  
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string and returns a base64 string containing:
 * iv (12 bytes) + ciphertext
 */
export async function encrypt(text: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encoded
  );

  // Combine IV and Ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string (iv + ciphertext)
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Convert base64 to Uint8Array
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
