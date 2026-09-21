import { MailboxCredential } from "../models/MailboxCredential.model.js";
import { encryptCredential, decryptCredential } from "../utils/encryption.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Encrypts and securely persists sensitive mailbox credentials at rest.
 */
export async function saveMailboxCredentials({
  mailboxId,
  workspaceId,
  provider,
  authType,
  credentials,
}) {
  if (!mailboxId || !workspaceId || !provider || !authType || !credentials) {
    throw new ApiError(400, "Missing required parameters to save credentials");
  }

  const { encryptedData, iv, authTag, algorithm, keyVersion } =
    encryptCredential(credentials);

  const updated = await MailboxCredential.findOneAndUpdate(
    { mailboxId },
    {
      workspaceId,
      provider,
      authType,
      encryptedData,
      iv,
      authTag,
      algorithm,
      keyVersion,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return updated;
}

/**
 * Retrieves and decrypts credentials for a given mailbox.
 * Throws 404 if credentials do not exist or 500 if decryption fails.
 */
export async function getDecryptedMailboxCredentials(mailboxId) {
  if (!mailboxId) {
    throw new ApiError(400, "Mailbox ID is required to fetch credentials");
  }

  const record = await MailboxCredential.findOne({ mailboxId }).select(
    "+encryptedData +iv +authTag"
  );

  if (!record) {
    throw new ApiError(404, "Mailbox credentials not found or deleted");
  }

  try {
    const decrypted = decryptCredential({
      encryptedData: record.encryptedData,
      iv: record.iv,
      authTag: record.authTag,
    });

    return {
      provider: record.provider,
      authType: record.authType,
      credentials: decrypted,
    };
  } catch (error) {
    console.error(`Failed to decrypt credentials for mailbox ${mailboxId}:`, error);
    throw new ApiError(500, "Failed to decrypt mailbox credentials at rest");
  }
}

/**
 * Deletes credentials for a given mailbox (e.g. during disconnect/cascade).
 */
export async function deleteMailboxCredentials(mailboxId) {
  if (!mailboxId) return;
  await MailboxCredential.deleteOne({ mailboxId });
}
