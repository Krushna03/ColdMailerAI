import { BaseRepository } from "./base.repository.js";
import { Segment } from "../models/Segment.model.js";

export interface SegmentScopeParams {
  workspaceId?: any;
  userId?: any;
}

export class SegmentRepository extends BaseRepository {
  constructor() {
    super(Segment);
  }

  buildScopeFilter({ workspaceId, userId }: SegmentScopeParams) {
    if (workspaceId) {
      return { $or: [{ workspaceId }, { userId }] };
    }
    return { userId };
  }

  async findScopedSegment({ segmentId, userId, workspaceId }: SegmentScopeParams & { segmentId: any }) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.findOne({ _id: segmentId, ...scope });
  }

  async listScopedSegments({ userId, workspaceId }: SegmentScopeParams) {
    const scope = this.buildScopeFilter({ workspaceId, userId });
    return this.find(scope, { sort: { isStarred: -1, createdAt: -1 } });
  }
}

export const segmentRepository = new SegmentRepository();
