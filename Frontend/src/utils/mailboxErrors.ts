export interface MailboxErrorDetail {
  category: "oauth_expired" | "smtp_auth" | "timeout" | "quota" | "general";
  title: string;
  message: string;
  actionDescription: string;
  actionType: "reconnect_google" | "reconnect_outlook" | "configure_smtp" | "edit_settings" | "test";
  actionLabel: string;
}

/**
 * Transforms raw backend/OAuth/SMTP errors into concise, user-specific diagnostics.
 */
export function parseMailboxError(
  rawError?: string | null,
  provider?: string
): MailboxErrorDetail {
  const err = (rawError || "").trim();
  const lower = err.toLowerCase();
  const prov = (provider || "").toLowerCase();

  // 1. Google / Microsoft / OAuth Token Expired or Revoked
  if (
    lower.includes("token has been expired or revoked") ||
    lower.includes("invalid_grant") ||
    lower.includes("token expired") ||
    lower.includes("token revoked") ||
    lower.includes("failed to refresh google access token") ||
    lower.includes("failed to refresh") ||
    lower.includes("refresh_token") ||
    lower.includes("interaction_required") ||
    ((prov === "gmail" || prov === "outlook") &&
      (lower.includes("unauthorized") || lower.includes("401")))
  ) {
    const isGmail = prov === "gmail" || lower.includes("google") || lower.includes("gmail");
    const isOutlook = prov === "outlook" || lower.includes("microsoft") || lower.includes("azure");
    const providerName = isGmail ? "Google" : isOutlook ? "Microsoft" : "OAuth";

    return {
      category: "oauth_expired",
      title: `${providerName} Session Expired`,
      message: `${providerName} authorization expired or was revoked.`,
      actionDescription: `Reconnect to restore sending without losing sequences.`,
      actionType: isGmail ? "reconnect_google" : "reconnect_outlook",
      actionLabel: `Reconnect ${providerName}`,
    };
  }

  // 2. SMTP Authentication Rejected
  if (
    lower.includes("535") ||
    lower.includes("authentication failed") ||
    lower.includes("invalid login") ||
    lower.includes("badcredentials") ||
    lower.includes("username and password not accepted") ||
    lower.includes("credentials rejected")
  ) {
    return {
      category: "smtp_auth",
      title: "SMTP Auth Failed",
      message: "Server rejected credentials. App Password may be required.",
      actionDescription: "Update your SMTP password in settings.",
      actionType: "configure_smtp",
      actionLabel: "Update Password",
    };
  }

  // 3. Network / Timeout
  if (
    lower.includes("etimedout") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("greeting never received")
  ) {
    return {
      category: "timeout",
      title: "Server Unreachable",
      message: "Could not connect to the mail server.",
      actionDescription: "Check host, port (465/587), and firewall rules.",
      actionType: prov === "smtp" ? "configure_smtp" : "test",
      actionLabel: prov === "smtp" ? "Check Settings" : "Retry Test",
    };
  }

  // 4. Rate Limiting / Quota Reached
  if (
    lower.includes("quota") ||
    lower.includes("daily limit") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("exceeded")
  ) {
    return {
      category: "quota",
      title: "Daily Limit Reached",
      message: "Mailbox reached its daily sending limit.",
      actionDescription: "Sending resumes tomorrow or adjust quota in Settings.",
      actionType: "edit_settings",
      actionLabel: "Adjust Limit",
    };
  }

  // 5. General Fallback
  const cleanSummary = err
    ? err.replace(/^(Connection test failed:|\s*Error:\s*)/i, "").trim()
    : "Connection check failed.";

  return {
    category: "general",
    title: "Connection Failed",
    message: cleanSummary,
    actionDescription: "Test again or re-authenticate your mailbox.",
    actionType: prov === "gmail" ? "reconnect_google" : prov === "outlook" ? "reconnect_outlook" : "test",
    actionLabel: prov === "gmail" ? "Reconnect Google" : prov === "outlook" ? "Reconnect Outlook" : "Retry Test",
  };
}
