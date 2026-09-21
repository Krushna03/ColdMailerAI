import { BaseRepository } from "./base.repository.js";
import { Workspace } from "../models/Workspace.model.js";

export class WorkspaceRepository extends BaseRepository {
  constructor() {
    super(Workspace);
  }

  async findUserWorkspaces(userId) {
    return this.find(
      { $or: [{ ownerId: userId }, { "members.userId": userId }] },
      { sort: { isDefault: -1, createdAt: -1 } }
    );
  }

  async findWorkspaceForUser({ workspaceId, userId }) {
    return this.findOne({
      _id: workspaceId,
      $or: [{ ownerId: userId }, { "members.userId": userId }]
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
