import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

// Middleware to log request start and completion with latency and status
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Avoid noisy logging for health check pings and CORS preflights
  if (req.path === "/health" || req.method === "OPTIONS") {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const logMeta = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.user?._id ? String(req.user._id) : undefined,
      workspaceId: req.workspaceId ? String(req.workspaceId) : undefined,
      ip: req.ip || req.socket.remoteAddress
    };

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl || req.path} ${res.statusCode}`, logMeta);
    } 
    else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl || req.path} ${res.statusCode}`, logMeta);
    } 
    else {
      logger.info(`HTTP ${req.method} ${req.originalUrl || req.path} ${res.statusCode}`, logMeta);
    }
  });

  next();
};
