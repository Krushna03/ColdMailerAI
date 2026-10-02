import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { getDecryptedMailboxCredentials } from "../services/mailboxEncryption.service.js";
import { refreshGoogleTokens } from "../services/mailboxOAuth.service.js";
import { Mailbox } from "../models/Mailbox.model.js";

dotenv.config();

async function testOAuth() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return;
  await mongoose.connect(mongoUri);

  const mailbox = await Mailbox.findById("6abe63e05b8e70bdf477d657");
  console.log("Mailbox email:", mailbox?.email);

  const decrypted = await getDecryptedMailboxCredentials("6abe63e05b8e70bdf477d657");
  const refreshToken = decrypted?.credentials?.refreshToken;
  console.log("RefreshToken present:", !!refreshToken);

  console.log("Testing token refresh with GMAIL_CLIENT_SECRET:", process.env.GMAIL_CLIENT_SECRET);
  try {
    const refreshed = await refreshGoogleTokens({ refreshToken });
    console.log("Refresh successful! New accessToken received:", !!refreshed?.accessToken);

    const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: mailbox!.email,
        clientId,
        clientSecret,
        refreshToken,
        accessToken: refreshed.accessToken,
      },
    } as any);

    console.log("Verifying transporter...");
    await transporter.verify();
    console.log("Transporter verification SUCCESSFUL!");
  } catch (err: any) {
    console.error("OAuth test failed:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }

  await mongoose.disconnect();
}

testOAuth().catch(console.error);
