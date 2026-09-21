import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for AES-GCM
const KEY_LENGTH = 32; // 256-bit key

/**
 * Derives a deterministic 32-byte encryption key.
 * Prioritizes process.env.ENCRYPTION_KEY if provided (hex or plain).
 * Falls back safely to a SHA-256 hash of ACCESS_TOKEN_SECRET.
 */
function getMasterKey() {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    return crypto.createHash("sha256").update(envKey).digest();
  }

  // Deterministic fallback based on ACCESS_TOKEN_SECRET for local dev / tests
  const baseSecret = process.env.ACCESS_TOKEN_SECRET || "coldmailer-default-aes-key-salt-2026";
  return crypto.createHash("sha256").update(`coldmailer_master_key:${baseSecret}`).digest();
}

/**
 * Encrypts arbitrary text or JSON object using AES-256-GCM.
 * Returns { encryptedData, iv, authTag, algorithm, keyVersion }
 */
export function encryptCredential(plainTextOrObject) {
  if (plainTextOrObject === undefined || plainTextOrObject === null) {
    throw new Error("Cannot encrypt empty data");
  }

  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  const payload =
    typeof plainTextOrObject === "string"
      ? plainTextOrObject
      : JSON.stringify(plainTextOrObject);

  let encrypted = cipher.update(payload, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag,
    algorithm: ALGORITHM,
    keyVersion: 1,
  };
}

/**
 * Decrypts AES-256-GCM payload using provided IV and authTag.
 * Throws an error if ciphertext or tag was tampered with.
 */
export function decryptCredential({ encryptedData, iv, authTag }) {
  if (!encryptedData || !iv || !authTag) {
    throw new Error("Missing encryptedData, iv, or authTag for decryption");
  }

  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
