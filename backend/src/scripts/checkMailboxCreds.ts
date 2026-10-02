import mongoose from "mongoose";
import dotenv from "dotenv";
import { Mailbox } from "../models/Mailbox.model.js";
import { getDecryptedMailboxCredentials } from "../services/mailboxEncryption.service.js";

dotenv.config();

async function check() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return;
  await mongoose.connect(mongoUri);

  const mailbox = await Mailbox.findById("6abe63e05b8e70bdf477d657");
  console.log("Mailbox:", {
    id: mailbox?._id,
    email: mailbox?.email,
    provider: mailbox?.provider,
    smtpConfig: mailbox?.smtpConfig,
  });

  const decrypted = await getDecryptedMailboxCredentials("6abe63e05b8e70bdf477d657");
  console.log("Decrypted authType:", decrypted?.authType);
  console.log("Decrypted provider:", decrypted?.provider);
  console.log("Has credentials:", !!decrypted?.credentials);
  console.log("Credential keys:", Object.keys(decrypted?.credentials || {}));
  if (decrypted?.credentials?.smtpUser) {
    console.log("smtpUser:", decrypted.credentials.smtpUser);
  }
  if (decrypted?.credentials?.smtpPass) {
    console.log("smtpPass length:", decrypted.credentials.smtpPass.length);
    console.log("smtpPass preview:", decrypted.credentials.smtpPass.slice(0, 3) + "..." + decrypted.credentials.smtpPass.slice(-3));
    console.log("Contains spaces:", decrypted.credentials.smtpPass.includes(" "));
  }

  await mongoose.disconnect();
}

check().catch(console.error);
