import { Request, Response, NextFunction } from "express";
import { Workspace } from "../models/Workspace.model.js";
import { ensureDefaultWorkspaceForUser } from "../services/workspace.service.js";
import mongoose from "mongoose";

/**
 * Middleware to resolve the active workspace context for the authenticated user.
 * Guarantees req.workspaceId and req.workspace are always populated.
 */
export const workspaceMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user._id) {
      return next();
    }

    const explicitWorkspaceId =
      (req.headers["x-workspace-id"] as string) ||
      (req.query?.workspaceId as string) ||
      req.body?.workspaceId;

    let workspace: any = null;

    // 1. If explicit workspace ID passed, verify user has access
    if (explicitWorkspaceId && mongoose.Types.ObjectId.isValid(explicitWorkspaceId)) {
      const candidate = await Workspace.findById(explicitWorkspaceId);

      if (candidate) {
        const role = candidate.getUserRole(req.user._id);

        if (role) {
          workspace = candidate;
          req.workspaceRole = role;
        }
      }
    }

    // 2. Fallback to user's active or default workspace
    if (!workspace) {
      workspace = await ensureDefaultWorkspaceForUser(req.user);

      if (workspace) {
        req.workspaceRole = workspace.getUserRole(req.user._id) || "member";
      }
    }

    if (workspace) {
      req.workspace = workspace;
      req.workspaceId = workspace._id;
    }

    next();
  } catch (error) {
    next(error);
  }
};
