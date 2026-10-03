import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const MICROSOFT_SCOPES = [
  "offline_access",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
];

export interface OAuthStatePayload {
  workspaceId: any;
  userId: any;
  provider: "gmail" | "outlook";
}

// Creates and validates a tamper-proof CSRF state parameter for OAuth handshakes.
export function generateOAuthState({
  workspaceId,
  userId,
  provider,
}: OAuthStatePayload): string {
  const secret = process.env.ACCESS_TOKEN_SECRET || "coldmailer_oauth_state_secret";
  return jwt.sign({ workspaceId, userId, provider }, secret, {
    expiresIn: "15m",
  });
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET || "coldmailer_oauth_state_secret";
    return jwt.verify(state, secret) as OAuthStatePayload;
  } catch {
    throw new ApiError(
      400,
      "Invalid or expired OAuth state parameter. Please restart authorization."
    );
  }
}

// Google OAuth Helper
export function getGoogleOAuthClient(customRedirectUri?: string): OAuth2Client {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    customRedirectUri ||
    process.env.GMAIL_MAILBOX_REDIRECT_URI ||
    process.env.GMAIL_REDIRECT_URI ||
    `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/mailboxes`;

  if (!clientId || !clientSecret) {
    throw new ApiError(
      500,
      "Google OAuth client credentials (GMAIL_CLIENT_ID / SECRET) are not configured"
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function generateGoogleAuthUrl({
  workspaceId,
  userId,
  redirectUri,
}: {
  workspaceId: any;
  userId: any;
  redirectUri?: string;
}): { url: string; state: string } {
  const client = getGoogleOAuthClient(redirectUri);
  const state = generateOAuthState({ workspaceId, userId, provider: "gmail" });

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });

  return { url, state };
}

export async function exchangeGoogleAuthCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri?: string;
}) {
  if (!code) {
    throw new ApiError(400, "Authorization code is required");
  }

  const client = getGoogleOAuthClient(redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch user profile to identify connected email
    const userInfoRes: any = await client.request({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });

    const email = userInfoRes.data?.email?.toLowerCase().trim();
    const name = userInfoRes.data?.name || "";

    if (!email) {
      throw new ApiError(400, "Could not determine email address from Google profile");
    }

    return {
      email,
      name,
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
    };
  } catch (error: any) {
    console.error("Google OAuth token exchange error:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, `Failed to exchange Google OAuth code: ${error.message}`);
  }
}

export async function refreshGoogleTokens({
  refreshToken,
  redirectUri,
}: {
  refreshToken: string;
  redirectUri?: string;
}) {
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is missing for Google token refresh");
  }

  const client = getGoogleOAuthClient(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });

  try {
    const response = await client.refreshAccessToken();
    const credentials = response.credentials;

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      tokenExpiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000),
    };
  } catch (error: any) {
    const errorDesc =
      error.response?.data?.error_description ||
      error.response?.data?.error ||
      error.message ||
      "Unknown token refresh error";
    console.warn(`[Google OAuth] Token refresh failed: ${errorDesc}`);
    throw new ApiError(401, `Failed to refresh Google access token: ${errorDesc}`);
  }
}

/**
 * Microsoft Outlook OAuth Helper
 */
function getMicrosoftConfig(customRedirectUri?: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret =
    process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
  const redirectUri =
    customRedirectUri ||
    process.env.MICROSOFT_REDIRECT_URI ||
    `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/mailboxes?callback=outlook`;

  return { clientId, clientSecret, redirectUri };
}

export function generateMicrosoftAuthUrl({
  workspaceId,
  userId,
  redirectUri,
}: {
  workspaceId: any;
  userId: any;
  redirectUri?: string;
}): { url: string; state: string } {
  const { clientId, redirectUri: finalRedirect } = getMicrosoftConfig(redirectUri);

  if (!clientId) {
    throw new ApiError(
      500,
      "Microsoft OAuth Client ID is not configured in server environment"
    );
  }

  const state = generateOAuthState({ workspaceId, userId, provider: "outlook" });
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: finalRedirect,
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
  });

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  return { url, state };
}

export async function exchangeMicrosoftAuthCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri?: string;
}) {
  if (!code) {
    throw new ApiError(400, "Authorization code is required");
  }

  const { clientId, clientSecret, redirectUri: finalRedirect } =
    getMicrosoftConfig(redirectUri);

  if (!clientId || !clientSecret) {
    throw new ApiError(500, "Microsoft OAuth credentials are not fully configured");
  }

  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: finalRedirect,
    grant_type: "authorization_code",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new ApiError(
      400,
      data.error_description || data.error || "Microsoft token exchange failed"
    );
  }

  // Fetch user profile from Microsoft Graph
  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  const profile: any = await profileRes.json();
  const email = (profile.mail || profile.userPrincipalName || "")
    .toLowerCase()
    .trim();
  const name = profile.displayName || "";

  if (!email) {
    throw new ApiError(400, "Could not retrieve email from Microsoft profile");
  }

  const expiresInMs = (data.expires_in || 3600) * 1000;

  return {
    email,
    name,
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + expiresInMs),
    },
  };
}

export async function refreshMicrosoftTokens({
  refreshToken,
  redirectUri,
}: {
  refreshToken: string;
  redirectUri?: string;
}) {
  const { clientId, clientSecret, redirectUri: finalRedirect } =
    getMicrosoftConfig(redirectUri);

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required to refresh Microsoft token");
  }

  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    redirect_uri: finalRedirect,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new ApiError(
      401,
      data.error_description || data.error || "Microsoft token refresh failed"
    );
  }

  const expiresInMs = (data.expires_in || 3600) * 1000;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenExpiresAt: new Date(Date.now() + expiresInMs),
  };
}
