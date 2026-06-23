import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// AES-256-GCM at-rest encryption for store-connector secrets (e.g. Square /
// Shopify refresh tokens). Wix uses a client_credentials + instance_id model
// and stores no long-lived token, but the helper is shared across connectors.
// Format: base64(iv).base64(authTag).base64(ciphertext).

function key(): Buffer {
  const raw = env.STORE_TOKEN_ENC_KEY;
  if (!raw) throw new Error("STORE_TOKEN_ENC_KEY is not set");
  // Derive a stable 32-byte key from whatever the operator provided.
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(enc: string): string {
  const [ivB64, tagB64, ctB64] = enc.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
