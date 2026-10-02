import mongoose from "mongoose";
import dotenv from "dotenv";
import { google } from "googleapis";
import { getDecryptedMailboxCredentials } from "../services/mailboxEncryption.service.js";
import { getGoogleOAuthClient } from "../services/mailboxOAuth.service.js";
import { Mailbox } from "../models/Mailbox.model.js";

dotenv.config();

function makeRawEmail(to: string, from: string, subject: string, body: string) {
  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function testGmailRest() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return;
  await mongoose.connect(mongoUri);

  const mailbox = await Mailbox.findById("6abe63e05b8e70bdf477d657");
  console.log("Mailbox:", mailbox?.email);

  const decrypted = await getDecryptedMailboxCredentials("6abe63e05b8e70bdf477d657");
  const refreshToken = decrypted?.credentials?.refreshToken;

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  console.log("Getting access token from refresh token...");
  const tokenRes = await oauth2Client.getAccessToken();
  console.log("Access token received:", !!tokenRes.token);
  const tokenInfo = await oauth2Client.getTokenInfo(tokenRes.token!);
  console.log("Token scopes granted by Google:", tokenInfo.scopes);
  console.log("Token email:", tokenInfo.email);
  console.log("Token expiry_date:", tokenInfo.expiry_date);

  oauth2Client.setCredentials({
    access_token: tokenRes.token!,
    refresh_token: refreshToken,
  });

  console.log("Sending test email via direct fetch to Gmail REST API...");
  try {
    const raw = makeRawEmail(
      mailbox!.email,
      mailbox!.email,
      "Test Sequence Send via Gmail API",
      "<p>This is a test from ColdMailer Sending Engine via official Gmail REST API!</p>"
    );

    const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const data = await resp.json();
    console.log("Response status:", resp.status);
    console.log("Response body:", data);
  } catch (err: any) {
    console.error("Direct fetch error:", err.message);
  }

  await mongoose.disconnect();
  process.exit(0);
}

testGmailRest().catch((e) => {
  console.error(e);
  process.exit(1);
});
