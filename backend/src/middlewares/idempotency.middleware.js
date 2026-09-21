import crypto from "crypto";
import { IdempotencyKey } from "../models/IdempotencyKey.model.js";

const hashBody = (body) => {
  if (!body || Object.keys(body).length === 0) return "";
  try {
    return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
  } catch {
    return "";
  }
};

// Enterprise Idempotency Middleware
// Prevents double-execution of sensitive mutations (emails, lead creation, batch operations).
export const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];

  // If no idempotency key provided or it's a GET / HEAD / OPTIONS request, proceed transparently
  if (!key || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const userId = req.user?._id;

  if (!userId) {
    return next();
  }

  const trimmedKey = String(key).trim();

  const requestHash = hashBody(req.body);

  try {
    const existing = await IdempotencyKey.findOne({
      userId,
      key: trimmedKey
    });

    if (existing) {
      if (existing.status === "completed") {
        res.setHeader("Idempotent-Replayed", "true");
        res.setHeader("X-Cache", "IDEMPOTENT-HIT");
        return res.status(existing.responseStatus).json(existing.responseBody);
      }

      if (existing.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "A request with this idempotency key is currently in progress."
        });
      }
    }

    // Create pending idempotency entry
    let idempotencyDoc;

    try {
      idempotencyDoc = await IdempotencyKey.create({
        key: trimmedKey,
        userId,
        workspaceId: req.workspaceId || null,
        path: req.originalUrl || req.path,
        method: req.method,
        requestHash,
        status: "pending"
      });
    }
    catch (createErr) {
      // Race condition: another concurrent request created the pending record first
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A request with this idempotency key is currently in progress."
        });
      }
      return next(createErr);
    }

    // Wrap res.json to capture output upon completion
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Save result asynchronously without blocking response
      const isSuccess = res.statusCode < 500;

      IdempotencyKey.findByIdAndUpdate(idempotencyDoc._id, {
        status: isSuccess ? "completed" : "failed",
        responseStatus: res.statusCode,
        responseBody: body
      }).catch((err) => {
        // Silently catch write errors on background completion
      });

      return originalJson(body);
    };

    next();

  } catch (err) {
    next(err);
  }
};
