// Structured Logger for ColdMailer
// Emits timestamped, level-tagged structured log entries.

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevelName = (process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();

const currentLevel = LOG_LEVELS[currentLevelName] ?? LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }

  // Human-readable format in local development / test
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${entry.level}] ${message}${metaStr}`;
}

export const logger = {
  debug(message, meta) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog("debug", message, meta));
    }
  },

  info(message, meta) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatLog("info", message, meta));
    }
  },

  warn(message, meta) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog("warn", message, meta));
    }
  },

  error(message, meta) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatLog("error", message, meta));
    }
  }
};
