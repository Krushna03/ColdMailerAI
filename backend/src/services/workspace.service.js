import { Workspace } from "../models/Workspace.model.js";
import UserModel from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";


// Ensures the given user has a default workspace provisioned.
// Backward-compatible: Automatically assigns or creates on the fly.
export const ensureDefaultWorkspaceForUser = async (user) => {
  if (!user || !user._id) return null;

  // 1. If user already has activeWorkspaceId, verify it exists
  if (user.activeWorkspaceId) {
    const existingActive = await Workspace.findById(user.activeWorkspaceId);
    if (existingActive) return existingActive;
  }

  // 2. Check if user owns any workspace
  let existingOwned = await Workspace.findOne({ ownerId: user._id, isDefault: true });
  if (!existingOwned) {
    existingOwned = await Workspace.findOne({ ownerId: user._id });
  }

  if (existingOwned) {
    await UserModel.findByIdAndUpdate(user._id, {
      activeWorkspaceId: existingOwned._id
    });
    user.activeWorkspaceId = existingOwned._id;
    return existingOwned;
  }

  // 3. Check if user is a member of any workspace
  const memberWorkspace = await Workspace.findOne({ "members.userId": user._id });
  if (memberWorkspace) {
    await UserModel.findByIdAndUpdate(user._id, {
      activeWorkspaceId: memberWorkspace._id
    });
    user.activeWorkspaceId = memberWorkspace._id;
    return memberWorkspace;
  }

  // 4. Provision new default workspace
  const baseName = user.username ? `${user.username}'s Workspace` : "My Workspace";
  const slug = slugify(user.username || "default");

  const newWorkspace = await Workspace.create({
    name: baseName,
    slug: `${slug}-${String(user._id).slice(-4)}`,
    ownerId: user._id,
    isDefault: true,
    members: [
      {
        userId: user._id,
        role: "owner",
        joinedAt: new Date()
      }
    ]
  });

  await UserModel.findByIdAndUpdate(user._id, {
    activeWorkspaceId: newWorkspace._id
  });
  user.activeWorkspaceId = newWorkspace._id;

  return newWorkspace;
};


// List all workspaces accessible by the user
export const getUserWorkspacesService = async (userId) => {
  let workspaces = await Workspace.find({
    $or: [{ ownerId: userId }, { "members.userId": userId }]
  })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  if (!workspaces || workspaces.length === 0) {
    const user = await UserModel.findById(userId);
    if (user) {
      const defaultWs = await ensureDefaultWorkspaceForUser(user);
      if (defaultWs) {
        workspaces = [defaultWs.toObject ? defaultWs.toObject() : defaultWs];
      }
    }
  }

  return workspaces || [];
};


// Get single workspace with permission check
export const getWorkspaceByIdService = async ({ workspaceId, userId }) => {
  if (!isValidObjectId(workspaceId)) {
    throw new ApiError(400, "Invalid workspace ID");
  }

  const workspace = await Workspace.findById(workspaceId)
    .populate("ownerId", "username email")
    .populate("members.userId", "username email")
    .lean();

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const isOwner = String(workspace.ownerId?._id || workspace.ownerId) === String(userId);

  const member = workspace.members?.find((m) => String(m.userId?._id || m.userId) === String(userId));

  if (!isOwner && !member) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  const role = isOwner ? "owner" : member.role;

  return {
    workspace,
    role
  };
};


// Create a new workspace
export const createWorkspaceService = async ({ name, userId, settings = {} }) => {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Workspace name is required");
  }

  const baseSlug = slugify(name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  const workspace = await Workspace.create({
    name: name.trim(),
    slug: uniqueSlug,
    ownerId: userId,
    isDefault: false,
    settings,
    members: [
      {
        userId,
        role: "owner",
        joinedAt: new Date()
      }
    ]
  });

  await UserModel.findByIdAndUpdate(userId, {
    activeWorkspaceId: workspace._id
  });

  return workspace;
};


// Switch the user's active workspace
export const switchActiveWorkspaceService = async ({ userId, workspaceId }) => {
  if (!isValidObjectId(workspaceId)) {
    throw new ApiError(400, "Invalid workspace ID");
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const role = workspace.getUserRole(userId);
  if (!role) {
    throw new ApiError(403, "You do not have access to switch to this workspace");
  }

  await UserModel.findByIdAndUpdate(userId, {
    activeWorkspaceId: workspace._id
  });

  return {
    success: true,
    activeWorkspaceId: workspace._id,
    workspaceName: workspace.name,
    role
  };
};


// Add a member to a workspace
export const addWorkspaceMemberService = async ({ workspaceId, callerId, targetEmail, role = "member" }) => {
  if (!isValidObjectId(workspaceId)) {
    throw new ApiError(400, "Invalid workspace ID");
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const callerRole = workspace.getUserRole(callerId);
  if (callerRole !== "owner" && callerRole !== "admin") {
    throw new ApiError(403, "Only workspace owners and admins can invite members");
  }

  const targetUser = await UserModel.findOne({ email: (targetEmail || "").trim().toLowerCase() });
  if (!targetUser) {
    throw new ApiError(404, "User with this email not found");
  }

  const alreadyMember = workspace.members.some(
    (m) => String(m.userId) === String(targetUser._id)
  );
  if (alreadyMember) {
    throw new ApiError(409, "User is already a member of this workspace");
  }

  workspace.members.push({
    userId: targetUser._id,
    role,
    joinedAt: new Date()
  });

  await workspace.save();

  return workspace;
};
