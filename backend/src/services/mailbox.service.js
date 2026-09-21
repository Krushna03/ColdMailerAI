import nodemailer from "nodemailer";
import { Mailbox } from "../models/Mailbox.model.js";
import {
  saveMailboxCredentials,
  getDecryptedMailboxCredentials,
  deleteMailboxCredentials,
} from "./mailboxEncryption.service.js";
import {
  exchangeGoogleAuthCode,
  exchangeMicrosoftAuthCode,
  refreshGoogleTokens,
  refreshMicrosoftTokens,
} from "./mailboxOAuth.service.js";
import { ApiError } from "../utils/ApiError.js";


// List all mailboxes in the active workspace with refreshed quotas.
export async function listMailboxesService({ workspaceId }) {
  const mailboxes = await Mailbox.find({ workspaceId }).sort({ createdAt: -1 });

  const updated = await Promise.all(
    mailboxes.map(async (mb) => {
      mb.checkAndResetDailyQuota();
      if (mb.isModified("sentToday")) {
        await mb.save();
      }
      return mb;
    })
  );

  return updated;
}


// Get details for a single mailbox.
export async function getMailboxByIdService({ mailboxId, workspaceId }) {
  const mailbox = await Mailbox.findOne({ _id: mailboxId, workspaceId });
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found in current workspace");
  }
  mailbox.checkAndResetDailyQuota();
  return mailbox;
}


// Connects and tests a custom SMTP / IMAP mailbox.
export async function connectSmtpMailboxService({
  workspaceId,
  userId,
  email,
  name,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  smtpPass,
  imapHost,
  imapPort,
  imapSecure,
  imapUser,
  imapPass,
  dailyLimit = 50,
}) {
  const cleanEmail = email.toLowerCase().trim();

  const port = Number(smtpPort) || 587;

  // Fix: Boolean("false") === true in JS, so we must handle string values explicitly
  const isSecure = smtpSecure === true || smtpSecure === "true" || port === 465;

  console.log(`[SMTP] Attempting connection → host=${smtpHost}, port=${port}, secure=${isSecure}, user=${smtpUser || cleanEmail}`);

  // 1. Verify SMTP connection before saving
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: isSecure, // true = implicit TLS (port 465), false = STARTTLS (port 587)
    auth: {
      user: smtpUser || cleanEmail,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    connectionTimeout: 10000,  // 10s to establish TCP connection
    greetingTimeout: 10000,    // 10s to receive SMTP greeting
    socketTimeout: 15000,      // 15s inactivity timeout
  });

  try {
    await transporter.verify();
    console.log("[SMTP] Connection verified successfully");
  } catch (error) {
    console.error("SMTP verification failed:", error);

    const msg = (error.message || "").toLowerCase();
    let userMessage = "Unable to connect. Please check your SMTP settings.";

    if (msg.includes("auth") || msg.includes("credentials") || msg.includes("password")) {
      userMessage = "Invalid username or password. Try using an App Password if 2FA is enabled.";
    } 
    else if (msg.includes("connection closed") || msg.includes("socket closed")) {
      userMessage = "Connection dropped. Check your port and SSL/TLS settings.";
    } 
    else if (msg.includes("timeout") || msg.includes("timed out")) {
      userMessage = "Connection timed out. Verify the SMTP host and port.";
    } 
    else if (msg.includes("getaddrinfo") || msg.includes("enotfound")) {
      userMessage = "SMTP host not found. Double-check the hostname.";
    }

    throw new ApiError(400, userMessage);
  }

  // 2. Create or update Mailbox identity
  let mailbox = await Mailbox.findOne({ workspaceId, email: cleanEmail });

  if (!mailbox) {
    mailbox = new Mailbox({
      workspaceId,
      userId,
      provider: "smtp",
      email: cleanEmail,
      name: name || "",
      dailyLimit: Number(dailyLimit) || 50,
      status: "active",
      health: {
        score: 100,
        status: "excellent",
        lastTestedAt: new Date(),
      },
      smtpConfig: {
        host: smtpHost,
        port: Number(smtpPort),
        secure: Boolean(smtpSecure),
        username: smtpUser || cleanEmail,
      },
      imapConfig: imapHost
        ? {
            host: imapHost,
            port: Number(imapPort) || 993,
            secure: imapSecure !== undefined ? Boolean(imapSecure) : true,
            username: imapUser || cleanEmail,
          }
        : undefined,
    });
  } 
  else {
    mailbox.provider = "smtp";
    mailbox.name = name || mailbox.name;
    mailbox.dailyLimit = Number(dailyLimit) || mailbox.dailyLimit;
    mailbox.status = "active";
    mailbox.health.score = 100;
    mailbox.health.status = "excellent";
    mailbox.health.lastTestedAt = new Date();
    mailbox.health.lastError = null;
    mailbox.smtpConfig = {
      host: smtpHost,
      port: Number(smtpPort),
      secure: Boolean(smtpSecure),
      username: smtpUser || cleanEmail,
    };
    if (imapHost) {
      mailbox.imapConfig = {
        host: imapHost,
        port: Number(imapPort) || 993,
        secure: imapSecure !== undefined ? Boolean(imapSecure) : true,
        username: imapUser || cleanEmail,
      };
    }
  }

  await mailbox.save();

  // 3. Encrypt and persist credentials
  await saveMailboxCredentials({
    mailboxId: mailbox._id,
    workspaceId,
    provider: "smtp",
    authType: "password",
    credentials: {
      smtpUser: smtpUser || cleanEmail,
      smtpPass,
      imapUser: imapUser || cleanEmail,
      imapPass: imapPass || null,
    },
  });

  return mailbox;
}


// Connects Gmail mailbox via OAuth2 code exchange.
export async function connectGoogleMailboxService({
  workspaceId,
  userId,
  code,
  redirectUri,
  dailyLimit = 100,
}) {
  const { email, name, tokens } = await exchangeGoogleAuthCode({ code, redirectUri });

  let mailbox = await Mailbox.findOne({ workspaceId, email });

  if (!mailbox) {
    mailbox = new Mailbox({
      workspaceId,
      userId,
      provider: "gmail",
      email,
      name,
      dailyLimit: Number(dailyLimit) || 100,
      status: "active",
      tokenExpiresAt: tokens.tokenExpiresAt,
      health: {
        score: 100,
        status: "excellent",
        lastTestedAt: new Date(),
      },
    });
  } else {
    mailbox.provider = "gmail";
    mailbox.status = "active";
    mailbox.tokenExpiresAt = tokens.tokenExpiresAt;
    mailbox.health.score = 100;
    mailbox.health.status = "excellent";
    mailbox.health.lastTestedAt = new Date();
    mailbox.health.lastError = null;
    if (name) mailbox.name = name;
  }

  await mailbox.save();

  // Persist encrypted tokens
  await saveMailboxCredentials({
    mailboxId: mailbox._id,
    workspaceId,
    provider: "gmail",
    authType: "oauth2",
    credentials: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });

  return mailbox;
}


// Connects Microsoft Outlook mailbox via OAuth2 code exchange.
export async function connectMicrosoftMailboxService({
  workspaceId,
  userId,
  code,
  redirectUri,
  dailyLimit = 100,
}) {
  const { email, name, tokens } = await exchangeMicrosoftAuthCode({ code, redirectUri });

  let mailbox = await Mailbox.findOne({ workspaceId, email });

  if (!mailbox) {
    mailbox = new Mailbox({
      workspaceId,
      userId,
      provider: "outlook",
      email,
      name,
      dailyLimit: Number(dailyLimit) || 100,
      status: "active",
      tokenExpiresAt: tokens.tokenExpiresAt,
      health: {
        score: 100,
        status: "excellent",
        lastTestedAt: new Date(),
      },
    });
  } else {
    mailbox.provider = "outlook";
    mailbox.status = "active";
    mailbox.tokenExpiresAt = tokens.tokenExpiresAt;
    mailbox.health.score = 100;
    mailbox.health.status = "excellent";
    mailbox.health.lastTestedAt = new Date();
    mailbox.health.lastError = null;
    if (name) mailbox.name = name;
  }

  await mailbox.save();

  // Persist encrypted tokens
  await saveMailboxCredentials({
    mailboxId: mailbox._id,
    workspaceId,
    provider: "outlook",
    authType: "oauth2",
    credentials: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });

  return mailbox;
}


// Updates mailbox settings (daily limit, sender name, status, default flag).
export async function updateMailboxSettingsService({
  mailboxId,
  workspaceId,
  name,
  dailyLimit,
  status,
  isDefault,
  warmupEnabled,
}) {
  const mailbox = await Mailbox.findOne({ _id: mailboxId, workspaceId });
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  if (name !== undefined) mailbox.name = String(name).trim();
  if (dailyLimit !== undefined) {
    const limitNum = Number(dailyLimit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 2000) {
      throw new ApiError(400, "Daily limit must be a number between 1 and 2000");
    }
    mailbox.dailyLimit = limitNum;
  }
  if (status !== undefined) {
    if (!["active", "paused"].includes(status)) {
      throw new ApiError(400, "Status must be either 'active' or 'paused'");
    }
    mailbox.status = status;
  }
  if (isDefault !== undefined) {
    mailbox.isDefault = Boolean(isDefault);
    if (mailbox.isDefault) {
      // Unset other default mailboxes in the workspace
      await Mailbox.updateMany(
        { workspaceId, _id: { $ne: mailbox._id } },
        { $set: { isDefault: false } }
      );
    }
  }
  if (warmupEnabled !== undefined) {
    mailbox.warmupEnabled = Boolean(warmupEnabled);
  }

  await mailbox.save();
  return mailbox;
}


// Tests connection / diagnostics for an existing mailbox.
export async function testMailboxConnectionService({ mailboxId, workspaceId }) {
  const mailbox = await Mailbox.findOne({ _id: mailboxId, workspaceId });
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  const { credentials } = await getDecryptedMailboxCredentials(mailbox._id);

  try {
    if (mailbox.provider === "smtp") {
      const transporter = nodemailer.createTransport({
        host: mailbox.smtpConfig.host,
        port: Number(mailbox.smtpConfig.port),
        secure: Boolean(mailbox.smtpConfig.secure),
        auth: {
          user: credentials.smtpUser || mailbox.email,
          pass: credentials.smtpPass,
        },
        tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
      });
      await transporter.verify();
    } 
    else if (mailbox.provider === "gmail") {
      await refreshGoogleTokens({ refreshToken: credentials.refreshToken });
    } 
    else if (mailbox.provider === "outlook") {
      await refreshMicrosoftTokens({ refreshToken: credentials.refreshToken });
    }

    mailbox.health.lastTestedAt = new Date();
    mailbox.health.consecutiveFailures = 0;
    mailbox.health.score = 100;
    mailbox.health.status = "excellent";
    mailbox.health.lastError = null;
    if (mailbox.status === "error") {
      mailbox.status = "active";
    }

    await mailbox.save();
    return { success: true, health: mailbox.health, message: "Connection test succeeded" };
  } 
  catch (error) {
    await mailbox.recordSendFailure(error.message);
    throw new ApiError(502, `Connection test failed: ${error.message}`);
  }
}


// Disconnects and deletes a mailbox, removing its encrypted credentials.
export async function deleteMailboxService({ mailboxId, workspaceId }) {
  
  const mailbox = await Mailbox.findOne({ _id: mailboxId, workspaceId });
  
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  await deleteMailboxCredentials(mailbox._id);
  await Mailbox.deleteOne({ _id: mailbox._id });

  return { success: true, message: `Mailbox ${mailbox.email} deleted successfully` };
}
