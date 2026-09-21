import { BaseRepository } from "./base.repository.js";
import { LeadCategory } from "../models/LeadCategory.model.js";

export class LeadCategoryRepository extends BaseRepository {
  constructor() {
    super(LeadCategory);
  }

  buildScopeFilter({ workspaceId, userId }) {
    const userOrWorkspace = [];
    if (workspaceId) userOrWorkspace.push({ workspaceId });
    if (userId) userOrWorkspace.push({ userId });

    return {
      $or: [{ isDefault: true }, ...userOrWorkspace]
    };
  }

  async findAccessibleCategories({ workspaceId, userId }) {
    const filter = this.buildScopeFilter({ workspaceId, userId });
    return this.find(filter, { sort: { isDefault: -1, name: 1 } });
  }

  async findAccessibleCategoryById({ categoryId, workspaceId, userId }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.findOne({ _id: categoryId, ...scope });
  }
}

export const leadCategoryRepository = new LeadCategoryRepository();
