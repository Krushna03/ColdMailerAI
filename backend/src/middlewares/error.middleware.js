import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const requestId = req?.id;

  logger.error(err.message || "Unhandled server error", {
    requestId,
    name: err.name,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    path: req?.originalUrl || req?.path,
    userId: req?.user?._id ? String(req.user._id) : undefined,
    workspaceId: req?.workspaceId ? String(req.workspaceId) : undefined
  });

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
      errors: err.errors || []
    });
  }

  // Handle validation errors (e.g., from mongoose)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      requestId,
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle cast errors (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      requestId
    });
  }

  // Default error handler
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" && statusCode === 500
    ? "Something went wrong"
    : (err.message || "Internal Server Error");

  res.status(statusCode).json({
    success: false,
    message,
    requestId
  });
};