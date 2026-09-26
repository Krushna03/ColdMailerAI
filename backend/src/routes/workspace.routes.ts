import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import {
  getUserWorkspaces,
  getWorkspaceById,
  createWorkspace,
  switchActiveWorkspace,
  addWorkspaceMember
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.use(verifyJWT, workspaceMiddleware);

router.route("/").get(getUserWorkspaces).post(createWorkspace);

router.route("/:workspaceId").get(getWorkspaceById);

router.route("/:workspaceId/switch").patch(switchActiveWorkspace);

router.route("/:workspaceId/members").post(addWorkspaceMember);

export default router;
