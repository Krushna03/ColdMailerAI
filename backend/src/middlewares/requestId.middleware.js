import crypto from "crypto";

// Middleware to assign or propagate correlation Request ID
// Sets req.id and header X-Request-Id on response.
export const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers["x-request-id"] || req.headers["x-correlation-id"];

  const requestId = typeof incomingId === "string" && incomingId.trim()
    ? incomingId.trim()
    : crypto.randomUUID();

  req.id = requestId;

  res.setHeader("X-Request-Id", requestId);
  
  next();
};
