import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption at rest for calendar OAuth tokens (the flagged
 * Phase-7 security item).
 *
 * The 32-byte key is derived as sha256(CALENDAR_TOKEN_ENCRYPTION_KEY), so
 * any sufficiently long secret works verbatim — base64, hex, or a raw
 * passphrase. Rotating the key orphans every stored ciphertext: decryptToken
 * returns null and callers must treat the connection as revoked, forcing a
 * re-connect.
 *
 * With the env var unset (dev mode) encryptToken passes plaintext through;
 * decryptToken passes anything without the "enc:v1:" prefix through, so
 * legacy plaintext rows keep working either way.
 */

const PREFIX = "enc:v1:";
const IV_LENGTH = 12; // GCM-recommended nonce size
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

/** Ciphertext format: "enc:v1:" + base64(iv | authTag | ciphertext). */
export function encryptToken(plain: string): string {
  const key = getKey();
  if (!key) return plain;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/**
 * Returns the input unchanged for non-"enc:v1:" values (legacy plaintext
 * rows), the decrypted token for valid ciphertext, and null on any failure
 * (missing key, truncated payload, auth-tag mismatch after key rotation).
 */
export function decryptToken(stored: string): string | null {
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getKey();
  if (!key) return null;

  try {
    const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(0, IV_LENGTH));
    decipher.setAuthTag(payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH));
    return Buffer.concat([
      decipher.update(payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
