// Structured Logger for ColdMailer
// Emits timestamped, level-tagged structured log entries.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevelName = (
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug")
).toLowerCase() as LogLevel;

const currentLevel: number =
  LOG_LEVELS[currentLevelName] ?? LOG_LEVELS.info;

function formatLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}): string {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }

  // Human-readable format in local development / test
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${entry.level}] ${message}${metaStr}`;
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
