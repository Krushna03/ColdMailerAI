import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getUserWorkspacesService,
  getWorkspaceByIdService,
  createWorkspaceService,
  switchActiveWorkspaceService,
  addWorkspaceMemberService
} from "../services/workspace.service.js";


// List all workspaces for current user
// GET /api/v1/workspaces
export const getUserWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await getUserWorkspacesService(req.user._id);

  return res.status(200).json({
    success: true,
    workspaces,
    activeWorkspaceId: req.user.activeWorkspaceId,
    message: "Workspaces fetched successfully"
  });
});


// Get workspace details
// GET /api/v1/workspaces/:workspaceId
export const getWorkspaceById = asyncHandler(async (req, res) => {
  const result = await getWorkspaceByIdService({
    workspaceId: req.params.workspaceId,
    userId: req.user._id
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Workspace fetched successfully"
  });
});


// Create a new workspace
// POST /api/v1/workspaces
export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, settings } = req.body;

  const workspace = await createWorkspaceService({
    name,
    userId: req.user._id,
    settings
  });

  return res.status(201).json({
    success: true,
    workspace,
    message: "Workspace created successfully"
  });
});


// Switch active workspace
// PATCH /api/v1/workspaces/:workspaceId/switch
export const switchActiveWorkspace = asyncHandler(async (req, res) => {
  const result = await switchActiveWorkspaceService({
    userId: req.user._id,
    workspaceId: req.params.workspaceId
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Active workspace switched successfully"
  });
});


// Invite / add member to workspace
// POST /api/v1/workspaces/:workspaceId/members
export const addWorkspaceMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const workspace = await addWorkspaceMemberService({
    workspaceId: req.params.workspaceId,
    callerId: req.user._id,
    targetEmail: email,
    role
  });

  return res.status(200).json({
    success: true,
    workspace,
    message: "Member added to workspace"
  });
});
