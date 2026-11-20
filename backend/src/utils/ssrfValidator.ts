import dns from "node:dns/promises";
import net from "node:net";


// Checks if an IPv4 address belongs to a private, loopback, link-local, or reserved range.
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud Instance Metadata Services)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 224) return true;

  return false;
}

// Checks if an IPv6 address belongs to a private, loopback, link-local, or unique-local range.
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1) or Unspecified (::)
  if (normalized === "::1" || normalized === "::" || /^0*(:0*)*:?1$/.test(normalized)) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (normalized.includes("::ffff:")) {
    const ipv4Part = normalized.split("::ffff:")[1];
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Link-local: fe80::/10 (fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Unique local: fc00::/7 (fc, fd)
  if (/^f[cd]/i.test(normalized)) return true;

  return false;
}

// Determines whether an IP address is private, loopback, or reserved.
export function isPrivateIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // Not a valid IP -> unsafe
}

// Validates a URL to prevent Server-Side Request Forgery (SSRF).
// Rejects non-HTTP(S) protocols, localhost, cloud metadata services, and internal/private IP ranges.
export async function validateSafeWebhookUrl(rawUrl: string): Promise<{ safe: boolean; reason?: string; parsedUrl?: URL }> {
  try {
    const parsed = new URL(rawUrl);

    // Protocol validation: only http and https allowed
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: `Disallowed protocol: '${parsed.protocol}'. Only HTTP and HTTPS are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, known loopbacks, and cloud metadata hostnames
    const blockedHosts = [
      "localhost",
      "metadata.google.internal",
      "instance-data",
      "169.254.169.254",
      "fd00:ec2::254",
    ];

    if (blockedHosts.includes(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return { safe: false, reason: `Target host '${hostname}' is restricted.` };
    }

    // If hostname is directly an IP address
    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return { safe: false, reason: `Target IP '${hostname}' is in a private or reserved range.` };
      }
      return { safe: true, parsedUrl: parsed };
    }

    // Resolve DNS records to verify resolved IPs
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return { safe: false, reason: `Could not resolve hostname '${hostname}'.` };
      }

      for (const record of addresses) {
        if (isPrivateIP(record.address)) {
          return {
            safe: false,
            reason: `Hostname '${hostname}' resolved to private or restricted address '${record.address}'.`,
          };
        }
      }
    } catch (dnsErr: any) {
      return { safe: false, reason: `DNS lookup failed for '${hostname}': ${dnsErr.message}` };
    }

    return { safe: true, parsedUrl: parsed };
  } catch (err: any) {
    return { safe: false, reason: `Invalid URL: ${err.message}` };
  }
}

// Safely executes a webhook HTTP request with SSRF validation, strict timeout,
// and disabled redirects (to prevent redirect-based SSRF bypass).
export async function safeFetchWebhook(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }
): Promise<Response> {
  const validation = await validateSafeWebhookUrl(url);
  if (!validation.safe) {
    throw new Error(`[SSRF Protection] Webhook blocked: ${validation.reason}`);
  }

  const timeoutMs = options.timeoutMs || 10000;

  return await fetch(url, {
    method: options.method || "POST",
    headers: options.headers,
    body: options.body,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error", // Prevent open-redirect attacks from bypassing SSRF checks
  });
}
