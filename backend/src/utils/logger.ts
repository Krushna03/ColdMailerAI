// Structured & Human-Friendly Logger for ColdMailer
// Supports ANSI colorized console logs for development and clean JSON when LOG_FORMAT=json.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevelName = (
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "test" ? "error" : "debug")
).toLowerCase() as LogLevel;

const currentLevel: number =
  LOG_LEVELS[currentLevelName] ?? LOG_LEVELS.info;

// ANSI Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  brightRed: "\x1b[91m",
  bgRed: "\x1b[41m\x1b[37m",
};

function formatTimestamp(date: Date): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function getLevelBadge(level: LogLevel): string {
  switch (level) {
    case "debug":
      return `${colors.dim}[DEBUG]${colors.reset}`;
    case "info":
      return `${colors.green}${colors.bold}[INFO ]${colors.reset}`;
    case "warn":
      return `${colors.yellow}${colors.bold}[WARN ]${colors.reset}`;
    case "error":
      return `${colors.brightRed}${colors.bold}[ERROR]${colors.reset}`;
  }
}

function getMethodBadge(method: string): string {
  const m = method.toUpperCase().padEnd(6);
  switch (method.toUpperCase()) {
    case "GET":
      return `${colors.green}${m}${colors.reset}`;
    case "POST":
      return `${colors.blue}${m}${colors.reset}`;
    case "PUT":
      return `${colors.yellow}${m}${colors.reset}`;
    case "PATCH":
      return `${colors.magenta}${m}${colors.reset}`;
    case "DELETE":
      return `${colors.red}${m}${colors.reset}`;
    default:
      return `${colors.white}${m}${colors.reset}`;
  }
}

function getStatusBadge(code: number): string {
  if (code >= 500) return `${colors.brightRed}${colors.bold}${code}${colors.reset}`;
  if (code >= 400) return `${colors.yellow}${colors.bold}${code}${colors.reset}`;
  if (code >= 300) return `${colors.cyan}${code}${colors.reset}`;
  return `${colors.green}${code}${colors.reset}`;
}

function formatDuration(ms?: number): string {
  if (typeof ms !== "number") return "";
  if (ms < 100) return `${colors.green}${ms.toFixed(1)}ms${colors.reset}`;
  if (ms < 500) return `${colors.yellow}${ms.toFixed(1)}ms${colors.reset}`;
  return `${colors.brightRed}${ms.toFixed(1)}ms${colors.reset}`;
}

function formatPrettyLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}): string {
  const now = new Date();
  const timeStr = `${colors.dim}${formatTimestamp(now)}${colors.reset}`;
  const badge = getLevelBadge(level);

  // Check if this is an HTTP request log
  if (meta.method && meta.statusCode !== undefined) {
    const method = getMethodBadge(String(meta.method));
    const path = `${colors.bold}${meta.path || ""}${colors.reset}`;
    const status = getStatusBadge(Number(meta.statusCode));
    const duration = meta.durationMs !== undefined ? `(${formatDuration(Number(meta.durationMs))})` : "";
    const userTag = meta.userId ? `${colors.dim}user:${meta.userId}${colors.reset}` : "";

    const parts = [timeStr, badge, method, path, status, duration, userTag].filter(Boolean);
    return parts.join(" ");
  }

  // Non-HTTP log line
  let line = `${timeStr} ${badge} ${message}`;

  // If there's an error stack trace, print it clearly
  const errorObj = meta.error instanceof Error ? meta.error : meta.err instanceof Error ? meta.err : undefined;
  const stack = meta.stack || (errorObj ? errorObj.stack : undefined);
  const remainingMeta: Record<string, unknown> = { ...meta };
  delete remainingMeta.stack;
  delete remainingMeta.requestId;
  if (errorObj) {
    delete remainingMeta.error;
    delete remainingMeta.err;
  }

  // Add extra meta if any meaningful properties remain
  if (Object.keys(remainingMeta).length > 0) {
    line += `\n  ${colors.dim}${JSON.stringify(remainingMeta, null, 2).replace(/\n/g, "\n  ")}${colors.reset}`;
  }

  if (stack && typeof stack === "string") {
    const formattedStack = stack
      .split("\n")
      .map((s, idx) => (idx === 0 ? `${colors.red}${s}${colors.reset}` : `${colors.dim}${s}${colors.reset}`))
      .join("\n  ");
    line += `\n  ${formattedStack}`;
  }

  return line;
}

function formatLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}): string {
  // Use machine JSON only when explicitly requested (e.g. LOG_FORMAT=json for log aggregators)
  if (process.env.LOG_FORMAT === "json") {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...meta,
    });
  }

  return formatPrettyLog(level, message, meta);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog("debug", message, meta));
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatLog("info", message, meta));
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog("warn", message, meta));
    }
  },

  error(message: string, meta?: Record<string, unknown>) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatLog("error", message, meta));
    }
  },
};
