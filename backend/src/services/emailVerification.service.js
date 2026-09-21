import dns from "dns";

// Comprehensive set of known disposable / temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.biz",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "tempmailaddress.com",
  "10minutemail.com",
  "10minutemail.net",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "dispostable.com",
  "getairmail.com",
  "fakeinbox.com",
  "getnada.com",
  "generator.email",
  "nada.ltd",
  "mohmal.com",
  "crazymailing.com",
  "burnermail.io",
  "inboxkitten.com",
  "mytemp.email",
  "fakemailgenerator.com",
  "emailondeck.com",
  "tempail.com",
  "dropmail.me",
  "mintemail.com",
  "maildrop.cc",
  "zillamail.com",
  "throwaway.email",
  "trashmail.me",
  "eyepaste.com",
  "harakirimail.com",
  "byom.de",
  "dayrep.com",
  "teleworm.us",
  "rhyta.com",
  "armyspy.com",
  "cuvox.de",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "superrito.com"
]);

// Free consumer webmail domains
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.ca",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "zoho.com",
  "mail.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru"
]);

const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate syntax according to RFC standards
 */
export const validateSyntax = (email) => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) return false;

  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || local.length > 64) return false;
  if (!domain || domain.length > 253) return false;

  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;

  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  return RFC_EMAIL_REGEX.test(trimmed);
};

/**
 * Check if a domain is a known burner / disposable service
 */
export const isDisposableDomain = (domain) => {
  if (!domain) return false;
  const cleanDomain = domain.toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(cleanDomain);
};

/**
 * Identify mail server provider based on MX exchange hosts
 */
const detectMailProvider = (mxRecords) => {
  const exchanges = mxRecords.map((r) => r.exchange.toLowerCase()).join(" ");
  if (exchanges.includes("google.com") || exchanges.includes("googlemail.com")) {
    return "Google Workspace";
  }
  if (exchanges.includes("outlook.com") || exchanges.includes("office365.com")) {
    return "Microsoft 365";
  }
  if (exchanges.includes("zoho.com") || exchanges.includes("zoho.eu")) {
    return "Zoho Mail";
  }
  if (exchanges.includes("protonmail.ch") || exchanges.includes("proton.me")) {
    return "Proton Mail";
  }
  if (exchanges.includes("mimecast.com")) {
    return "Mimecast";
  }
  if (exchanges.includes("pphosted.com")) {
    return "Proofpoint";
  }
  return "Custom Business MX";
};

/**
 * Resolves MX records for a domain with timeout guard
 */
export const resolveMxWithTimeout = async (domain, timeoutMs = 3500) => {
  const promise = dns.promises.resolveMx(domain);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("DNS query timeout")), timeoutMs)
  );

  return Promise.race([promise, timeout]);
};

/**
 * Resolves fallback A record if no MX record exists
 */
export const resolveAWithTimeout = async (domain, timeoutMs = 3500) => {
  const promise = dns.promises.resolve4(domain);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("DNS query timeout")), timeoutMs)
  );

  return Promise.race([promise, timeout]);
};

/**
 * Comprehensive verification pipeline for a single email address
 */
export const verifyEmailAddress = async (email) => {
  const now = new Date();
  const normalized = (email || "").trim().toLowerCase();

  // Step 1: Syntax Validation
  if (!validateSyntax(normalized)) {
    return {
      status: "invalid",
      provider: "built-in",
      score: 0,
      reason: "Malformed email address Syntax",
      mxRecords: [],
      checkedAt: now
    };
  }

  const [, domain] = normalized.split("@");

  // Step 2: Disposable Domain Check
  if (isDisposableDomain(domain)) {
    return {
      status: "disposable",
      provider: "built-in",
      score: 0,
      reason: "Disposable or temporary burner email domain",
      mxRecords: [],
      checkedAt: now
    };
  }

  // Step 3: DNS & MX Records Validation
  let mxRecords = [];
  try {
    const rawMx = await resolveMxWithTimeout(domain);
    if (Array.isArray(rawMx) && rawMx.length > 0) {
      mxRecords = rawMx
        .sort((a, b) => a.priority - b.priority)
        .map((r) => r.exchange);
    }
  } catch (err) {
    // If MX lookup fails with ENOTFOUND or NODATA, try fallback A record
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      try {
        const aRecords = await resolveAWithTimeout(domain);
        if (Array.isArray(aRecords) && aRecords.length > 0) {
          mxRecords = [domain]; // RFC fallback: domain itself acts as mail exchanger
        }
      } catch {
        return {
          status: "invalid",
          provider: "built-in",
          score: 0,
          reason: "Domain does not exist or has no active mail exchange (MX) records",
          mxRecords: [],
          checkedAt: now
        };
      }
    } else {
      // Timeout or temporary DNS resolution failure -> classified as risky
      return {
        status: "risky",
        provider: "built-in",
        score: 45,
        reason: `DNS lookup error: ${err.message || "Temporary resolution failure"}`,
        mxRecords: [],
        checkedAt: now
      };
    }
  }

  if (mxRecords.length === 0) {
    return {
      status: "invalid",
      provider: "built-in",
      score: 0,
      reason: "No active mail exchange (MX) records found for domain",
      mxRecords: [],
      checkedAt: now
    };
  }

  // Step 4: Provider & Deliverability Risk Scoring
  const isFreeWebmail = FREE_EMAIL_DOMAINS.has(domain);
  const detectedProvider = detectMailProvider(
    mxRecords.map((exchange) => ({ exchange, priority: 10 }))
  );

  if (isFreeWebmail) {
    return {
      status: "valid",
      provider: detectedProvider,
      score: 85,
      reason: "Active consumer webmail provider (verified MX records)",
      mxRecords: mxRecords.slice(0, 3),
      checkedAt: now
    };
  }

  // Business domain with verified MX
  return {
    status: "valid",
    provider: detectedProvider,
    score: 95,
    reason: `Verified business domain host (${detectedProvider})`,
    mxRecords: mxRecords.slice(0, 3),
    checkedAt: now
  };
};
