import { BaseRepository } from "./base.repository.js";
import { Lead } from "../models/Lead.model.js";

export class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  // Build tenancy filter supporting both workspaceId and legacy userId
  buildScopeFilter({ workspaceId, userId }) {
    if (workspaceId) {
      return { $or: [{ workspaceId }, { userId }] };
    }
    return { userId };
  }

  async findScopedLead({ leadId, userId, workspaceId, populate = [] }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.findOne({ _id: leadId, ...scope }, { populate });
  }

  async findScopedLeadDoc({ leadId, userId, workspaceId }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.model.findOne({ _id: leadId, ...scope });
  }

  async distinctTags({ workspaceId, userId }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    const tags = await this.model.distinct("tags", scope);
    return tags.filter(Boolean).sort();
  }
}

export const leadRepository = new LeadRepository();
