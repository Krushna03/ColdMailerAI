import { BaseRepository } from "./base.repository.js";
import { LeadCategory } from "../models/LeadCategory.model.js";

export interface CategoryScopeFilterParams {
  workspaceId?: any;
  userId?: any;
}

export class LeadCategoryRepository extends BaseRepository {
  constructor() {
    super(LeadCategory);
  }

  buildScopeFilter({ workspaceId, userId }: CategoryScopeFilterParams) {
    const userOrWorkspace: any[] = [];
    if (workspaceId) userOrWorkspace.push({ workspaceId });
    if (userId) userOrWorkspace.push({ userId });

    return {
      $or: [{ isDefault: true }, ...userOrWorkspace]
    };
  }

  async findAccessibleCategories({ workspaceId, userId }: CategoryScopeFilterParams) {
    const filter = this.buildScopeFilter({ workspaceId, userId });
    return this.find(filter, { sort: { isDefault: -1, name: 1 } });
  }

  async findAccessibleCategoryById({ categoryId, workspaceId, userId }: CategoryScopeFilterParams & { categoryId: any }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.findOne({ _id: categoryId, ...scope });
  }
}

export const leadCategoryRepository = new LeadCategoryRepository();
