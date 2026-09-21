import nodemailer from "nodemailer";
import { Mailbox } from "../models/Mailbox.model.js";
import { Email } from "../models/Email.model.js";
import { Lead } from "../models/Lead.model.js";
import { getDecryptedMailboxCredentials, saveMailboxCredentials } from "./mailboxEncryption.service.js";
import { refreshGoogleTokens, refreshMicrosoftTokens } from "./mailboxOAuth.service.js";
import { syncLeadStatsFromEmails } from "./lead.service.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Ensures credentials have an active, non-expired access token.
 * Refreshes OAuth2 tokens automatically if within 5 minutes of expiring.
 */
async function ensureValidCredentials(mailbox, decryptedPayload) {
  const { provider, authType, credentials } = decryptedPayload;

  if (authType !== "oauth2") {
    return credentials;
  }

  const now = Date.now();
  const tokenExpiresAt = mailbox.tokenExpiresAt ? new Date(mailbox.tokenExpiresAt).getTime() : 0;
  const isExpiringSoon = tokenExpiresAt - now < 5 * 60 * 1000;

  if (!isExpiringSoon && credentials.accessToken) {
    return credentials;
  }

  // Refresh token
  let newTokens;
  if (provider === "gmail") {
    newTokens = await refreshGoogleTokens({ refreshToken: credentials.refreshToken });
  } else if (provider === "outlook") {
    newTokens = await refreshMicrosoftTokens({ refreshToken: credentials.refreshToken });
  }

  if (newTokens) {
    const updatedCredentials = {
      ...credentials,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken || credentials.refreshToken,
    };

    await saveMailboxCredentials({
      mailboxId: mailbox._id,
      workspaceId: mailbox.workspaceId,
      provider: mailbox.provider,
      authType: "oauth2",
      credentials: updatedCredentials,
    });

    mailbox.tokenExpiresAt = newTokens.tokenExpiresAt;
    await mailbox.save();

    return updatedCredentials;
  }

  return credentials;
}

/**
 * Sends email via Gmail OAuth2 using Nodemailer transport.
 */
async function sendViaGmail({ mailbox, credentials, to, subject, html, text }) {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: mailbox.email,
      clientId,
      clientSecret,
      refreshToken: credentials.refreshToken,
      accessToken: credentials.accessToken,
    },
  });

  const fromAddress = mailbox.name ? `"${mailbox.name}" <${mailbox.email}>` : mailbox.email;

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text: text || "",
    html: html || text,
  });

  return { messageId: info.messageId || info.response };
}

/**
 * Sends email via Microsoft Graph API sendMail.
 */
async function sendViaMicrosoft({ mailbox, credentials, to, subject, html, text }) {
  const sendMailUrl = "https://graph.microsoft.com/v1.0/me/sendMail";

  const payload = {
    message: {
      subject,
      body: {
        contentType: html ? "HTML" : "Text",
        content: html || text || "",
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: "true",
  };

  const response = await fetch(sendMailUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Microsoft sendMail failed with status ${response.status}`);
  }

  return { messageId: `msg-${Date.now()}` };
}

/**
 * Sends email via Custom SMTP.
 */
async function sendViaSmtp({ mailbox, credentials, to, subject, html, text }) {
  const { host, port, secure } = mailbox.smtpConfig || {};
  const user = credentials.smtpUser || mailbox.smtpConfig?.username || mailbox.email;
  const pass = credentials.smtpPass;

  if (!host || !port) {
    throw new ApiError(400, "SMTP host and port are not properly configured on this mailbox");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Boolean(secure),
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  const fromAddress = mailbox.name ? `"${mailbox.name}" <${mailbox.email}>` : mailbox.email;

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text: text || "",
    html: html || text,
  });

  return { messageId: info.messageId };
}

/**
 * Main dispatcher to send an email through a connected mailbox.
 */
export async function sendEmailViaMailbox({
  mailboxId,
  to,
  subject,
  html,
  text,
  leadId,
  emailId,
  userId,
  workspaceId,
}) {
  if (!mailboxId) throw new ApiError(400, "Mailbox ID is required");
  if (!to) throw new ApiError(400, "Recipient email address is required");
  if (!subject) throw new ApiError(400, "Email subject is required");
  if (!html && !text) throw new ApiError(400, "Email body (HTML or text) is required");

  const mailbox = await Mailbox.findById(mailboxId);
  if (!mailbox) {
    throw new ApiError(404, "Mailbox not found");
  }

  if (workspaceId && String(mailbox.workspaceId) !== String(workspaceId)) {
    throw new ApiError(403, "Access denied to this mailbox in current workspace");
  }

  // Quota & state check
  const sendCheck = mailbox.canSend();
  if (!sendCheck.allowed) {
    const isLimit = sendCheck.reason.includes("Daily sending limit");
    throw new ApiError(isLimit ? 429 : 400, sendCheck.reason);
  }

  const decryptedRecord = await getDecryptedMailboxCredentials(mailbox._id);
  const activeCredentials = await ensureValidCredentials(mailbox, decryptedRecord);

  let sendResult;
  try {
    if (mailbox.provider === "gmail") {
      sendResult = await sendViaGmail({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else if (mailbox.provider === "outlook") {
      sendResult = await sendViaMicrosoft({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else if (mailbox.provider === "smtp") {
      sendResult = await sendViaSmtp({
        mailbox,
        credentials: activeCredentials,
        to,
        subject,
        html,
        text,
      });
    } else {
      throw new ApiError(400, `Unsupported mailbox provider: ${mailbox.provider}`);
    }

    // Success bookkeeping
    await mailbox.recordSendSuccess();

    // Update Email record if provided
    let updatedEmail = null;
    if (emailId) {
      updatedEmail = await Email.findById(emailId);
      if (updatedEmail) {
        updatedEmail.sendStatus = "sent";
        updatedEmail.sentAt = new Date();
        await updatedEmail.save();
      }
    }

    // Update Lead pipeline status if linked
    const targetLeadId = leadId || (updatedEmail ? updatedEmail.leadId : null);
    if (targetLeadId) {
      const lead = await Lead.findById(targetLeadId);
      if (lead) {
        if (lead.status === "new") {
          lead.status = "contacted";
        }
        lead.lastContactedAt = new Date();
        lead.lastActivityAt = new Date();
        await lead.save();
        await syncLeadStatsFromEmails(lead._id);

        await logActivity({
          userId: userId || mailbox.userId,
          workspaceId: workspaceId || mailbox.workspaceId,
          leadId: lead._id,
          type: "EMAIL_SENT",
          title: `Sent cold email via ${mailbox.email}`,
          metadata: {
            mailboxId: mailbox._id,
            provider: mailbox.provider,
            emailId: emailId || null,
            messageId: sendResult.messageId,
          },
        });
      }
    }

    return {
      success: true,
      messageId: sendResult.messageId,
      mailbox: {
        id: mailbox._id,
        email: mailbox.email,
        provider: mailbox.provider,
        sentToday: mailbox.sentToday,
        dailyLimit: mailbox.dailyLimit,
      },
    };
  } catch (error) {
    console.error(`Failed to send email via mailbox ${mailbox.email}:`, error);
    await mailbox.recordSendFailure(error.message);
    throw new ApiError(502, `Sending failed through mailbox: ${error.message}`);
  }
}
