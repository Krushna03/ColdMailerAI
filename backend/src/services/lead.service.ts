import mongoose from "mongoose";
import { Lead, isValidStatusTransition } from "../models/Lead.model.js";
import { Segment } from "../models/Segment.model.js";
import { FollowUp } from "../models/FollowUp.model.js";
import { Email } from "../models/Email.model.js";
import { Activity } from "../models/Activity.model.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";
import { assertCategoryAccessible } from "./leadCategory.service.js";
import { leadRepository } from "../repositories/lead.repository.js";
import { buildMongoQueryFromSegment } from "../utils/segmentQueryBuilder.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const earliestPendingFollowUp = async (leadId) => {
  const pending = await FollowUp.findOne({ leadId, status: "pending" })
    .sort({ dueAt: 1 })
    .lean();
  return pending?.dueAt ?? null;
};

export const syncLeadStatsFromEmails = async (leadId) => {
  if (!leadId) return null;

  const [generatedCount, sentCount, latestEmail, nextDueAt, latestFollowUp] = await Promise.all([
    Email.countDocuments({ leadId }),
    Email.countDocuments({ leadId, sendStatus: "sent" }),
    Email.findOne({ leadId }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
    earliestPendingFollowUp(leadId),
    FollowUp.findOne({ leadId }).sort({ updatedAt: -1 }).select("updatedAt createdAt").lean()
  ]);

  const lead = await Lead.findById(leadId);
  if (!lead) return null;

  lead.emailsGeneratedCount = generatedCount;
  lead.emailsSentCount = sentCount;
  lead.nextFollowUpAt = nextDueAt;

  const followUpActivity = latestFollowUp?.updatedAt || latestFollowUp?.createdAt;
  const candidates = [latestEmail?.updatedAt, followUpActivity, lead.updatedAt].filter(Boolean);
  lead.lastActivityAt = candidates.length
    ? new Date(Math.max(...candidates.map((d) => new Date(d).getTime())))
    : lead.createdAt;

  await lead.save();
  return lead;
};

export const normalizeCompany = (company) => {
  if (!company) return { name: "", domain: "", industry: "", size: "", revenue: "" };
  
  if (typeof company === "string") return { name: company, domain: "", industry: "", size: "", revenue: "" };

  if (typeof company === "object") return { name: "", domain: "", industry: "", size: "", revenue: "", ...company };

  return { name: "", domain: "", industry: "", size: "", revenue: "" };
};

export const createLeadService = async ({ leadData, userId, workspaceId }) => {
  await assertCategoryAccessible({
    categoryId: leadData.categoryId,
    userId
  });

  const email = (leadData.email || "").trim().toLowerCase();
  const effectiveWorkspaceId = workspaceId || leadData.workspaceId || null;

  if (email) {
    const existingFilter = effectiveWorkspaceId
      ? { $or: [{ workspaceId: effectiveWorkspaceId }, { userId }], categoryId: leadData.categoryId, email }
      : { userId, categoryId: leadData.categoryId, email };

    const existing = await Lead.findOne(existingFilter);
    if (existing) {
      throw new ApiError(409, "A lead with this email already exists in this category");
    }
  }

  const company = normalizeCompany(leadData.company);

  const lead = await Lead.create({
    ...leadData,
    company,
    email,
    userId,
    workspaceId: effectiveWorkspaceId,
    createdBy: userId,
    updatedBy: userId,
    assignedTo: leadData.assignedTo || userId,
    lastActivityAt: new Date()
  });

  await logActivity({
    userId,
    workspaceId: effectiveWorkspaceId,
    performedBy: userId,
    leadId: lead._id,
    type: "LEAD_CREATED",
    title: `Lead created: ${lead.name}`,
    metadata: { name: lead.name, email: lead.email, company: lead.company?.name || "" }
  });

  return lead;
};

export const bulkCreateLeadsService = async ({ leads, userId, workspaceId }) => {
  const categoryIds = [...new Set(leads.map((lead) => String(lead.categoryId)))];
  await Promise.all(
    categoryIds.map((categoryId) => assertCategoryAccessible({ categoryId, userId }))
  );

  const now = new Date();
  const effectiveWorkspaceId = workspaceId || null;

  const existingFilter = effectiveWorkspaceId
    ? { $or: [{ workspaceId: effectiveWorkspaceId }, { userId }], categoryId: { $in: categoryIds }, email: { $ne: "" } }
    : { userId, categoryId: { $in: categoryIds }, email: { $ne: "" } };

  const existingDocs = await Lead.find(existingFilter)
    .select("categoryId email")
    .lean();

  const existingSet = new Set(
    existingDocs.map((d) => `${String(d.categoryId)}_${d.email.toLowerCase()}`)
  );

  const seenInBatch = new Set();
  const validLeadsToInsert = [];
  let duplicateCount = 0;

  for (const lead of leads) {
    const normEmail = (lead.email || "").trim().toLowerCase();
    const catIdStr = String(lead.categoryId);
    const key = normEmail ? `${catIdStr}_${normEmail}` : null;

    if (key) {
      if (existingSet.has(key) || seenInBatch.has(key)) {
        duplicateCount++;
        continue;
      }
      seenInBatch.add(key);
    }

    validLeadsToInsert.push({
      ...lead,
      company: normalizeCompany(lead.company),
      email: normEmail,
      userId,
      workspaceId: effectiveWorkspaceId,
      createdBy: userId,
      updatedBy: userId,
      assignedTo: lead.assignedTo || userId,
      lastActivityAt: now
    });
  }

  let createdLeads = [];
  if (validLeadsToInsert.length > 0) {
    createdLeads = await Lead.insertMany(validLeadsToInsert, { ordered: false });
    await Promise.all(
      createdLeads.map((created) =>
        logActivity({
          userId,
          workspaceId: effectiveWorkspaceId,
          performedBy: userId,
          leadId: created._id,
          type: "LEAD_CREATED",
          title: `Lead imported: ${created.name}`,
          metadata: { name: created.name, email: created.email, company: created.company }
        })
      )
    );
  }

  return {
    leads: createdLeads,
    totalReceived: leads.length,
    insertedCount: createdLeads.length,
    duplicateCount
  };
};

export const getUserLeadsService = async ({
  userId,
  workspaceId,
  limit,
  page,
  status,
  overdueOnly,
  categoryId,
  search,
  tags,
  segmentId,
  verificationStatus
}: any) => {
  const skip = page * limit;
  let filter: any = workspaceId
    ? { $or: [{ workspaceId }, { userId }] }
    : { userId };

  if (segmentId && isValidObjectId(segmentId)) {
    const segment = await Segment.findOne({
      _id: segmentId,
      ...(workspaceId ? { $or: [{ workspaceId }, { userId }] } : { userId })
    }).lean();

    if (segment?.filters) {
      const segmentFilter = buildMongoQueryFromSegment(segment.filters, 
      { workspaceId, userId });
      filter = { ...filter, ...segmentFilter };
    }
  }

  if (status) {
    filter.status = status;
  }

  if (verificationStatus) {
    filter['emailVerification.status'] = verificationStatus;
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (tags) {
    const tagArray = Array.isArray(tags)
      ? tags
      : String(tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray };
    }
  }

  if (overdueOnly) {
    filter.nextFollowUpAt = { $ne: null, $lt: new Date() };
  }

  if (search) {
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const searchConditions = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { "company.name": { $regex: escapedSearch, $options: "i" } },
      { "company.industry": { $regex: escapedSearch, $options: "i" } },
      { role: { $regex: escapedSearch, $options: "i" } },
      { jobTitle: { $regex: escapedSearch, $options: "i" } },
      { tags: { $regex: escapedSearch, $options: "i" } }
    ];

    if (filter.$or && Array.isArray(filter.$or) && filter.$or[0]?.workspaceId !== undefined) {
      // Tenancy scope exists on $or, use $and to combine cleanly
      const tenancyScope = { $or: filter.$or };
      delete filter.$or;
      filter.$and = [tenancyScope, { $or: searchConditions }];
    } 
    else if (filter.$and) {
      filter.$and.push({ $or: searchConditions });
    } 
    else {
      filter.$or = searchConditions;
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("categoryId", "name slug description isDefault")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    Lead.countDocuments(filter)
  ]);

  const leadIds = (leads || []).map((l) => l._id);
  
  const allFollowUps = await FollowUp.find({ leadId: { $in: leadIds } })
    .sort({ dueAt: 1 })
    .lean();

  const followUpsByLead = {};
  for (const f of allFollowUps) {
    const lid = String(f.leadId);
    if (!followUpsByLead[lid]) followUpsByLead[lid] = [];
    followUpsByLead[lid].push(f);
  }

  const enrichedLeads = (leads || []).map((l) => ({
    ...l,
    followUps: followUpsByLead[String(l._id)] || []
  }));

  return {
    leads: enrichedLeads,
    total,
    hasMore: skip + enrichedLeads.length < total
  };
};

export const getLeadsByIdsService = async ({
  leadIds,
  userId,
  workspaceId,
}: {
  leadIds: any[];
  userId: any;
  workspaceId?: any;
}) => {
  const scope = workspaceId
    ? { _id: { $in: leadIds }, $or: [{ workspaceId }, { userId }] }
    : { _id: { $in: leadIds }, userId };

  const leads = await Lead.find(scope)
    .populate("categoryId", "name slug description isDefault")
    .lean();

  if (!leads.length) {
    throw new ApiError(404, "No matching leads found");
  }

  return leads;
};

export const getLeadByIdService = async ({ leadId, userId, workspaceId }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const lead = await Lead.findOne(scope)
    .populate("categoryId", "name slug description isDefault")
    .lean();
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const [emails, followUps, activities] = await Promise.all([
    Email.find({ leadId }).sort({ createdAt: -1 }).lean(),
    FollowUp.find({ leadId }).sort({ dueAt: 1 }).lean(),
    Activity.find({ leadId }).sort({ createdAt: -1 }).lean()
  ]);

  const pendingFollowUps = followUps.filter((f) => f.status === "pending");
  const overdueFollowUps = pendingFollowUps.filter(
    (f) => f.dueAt && new Date(f.dueAt) < new Date()
  );

  return {
    lead: {
      ...lead,
      followUps,
      emailsGeneratedCount: emails.length,
      emailsSentCount: emails.filter((e) => e.sendStatus === "sent").length
    },
    emails,
    activities,
    stats: {
      emailsGenerated: emails.length,
      emailsSent: emails.filter((e) => e.sendStatus === "sent").length,
      pendingFollowUps: pendingFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
      lastActivityAt: lead.lastActivityAt,
      nextFollowUpAt: lead.nextFollowUpAt
    }
  };
};

export const updateLeadService = async ({ leadId, userId, workspaceId, updates }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const lead = await Lead.findOne(scope);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const oldStatus = lead.status;

  if (updates.categoryId !== undefined) {
    await assertCategoryAccessible({
      categoryId: updates.categoryId,
      userId
    });
  }

  if (updates.status !== undefined && updates.status !== lead.status) {
    if (!isValidStatusTransition(lead.status, updates.status)) {
      throw new ApiError(
        400,
        `Cannot transition lead status from '${lead.status}' to '${updates.status}'`
      );
    }
  }

  const allowed = [
    "name",
    "company",
    "role",
    "jobTitle",
    "email",
    "phone",
    "linkedinUrl",
    "location",
    "timezone",
    "notes",
    "status",
    "categoryId",
    "assignedTo",
    "source",
    "tags",
    "customFields"
  ];
  
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === "company") {
        const existingCompany =
          lead.company && typeof (lead.company as any).toObject === "function"
            ? (lead.company as any).toObject()
            : typeof lead.company === "object" && lead.company !== null
            ? lead.company
            : { name: typeof lead.company === "string" ? lead.company : "" };

        if (typeof updates.company === "string") {
          lead.company = {
            ...existingCompany,
            name: updates.company
          };
        } 
        else if (typeof updates.company === "object" && updates.company !== null) {
          lead.company = {
            ...existingCompany,
            ...updates.company
          };
        }
        lead.markModified("company");
      } 
      else if (key === "jobTitle") {
        lead.jobTitle = updates.jobTitle;
        if (updates.role === undefined) {
          lead.role = updates.jobTitle;
        }
      } 
      else if (key === "role") {
        lead.role = updates.role;
        if (updates.jobTitle === undefined) {
          lead.jobTitle = updates.role;
        }
      } 
      else if (key === "customFields") {
        lead.customFields = {
          ...(lead.customFields || {}),
          ...updates.customFields
        };
        lead.markModified("customFields");
      } 
      else {
        lead[key] = updates[key];
      }
    }
  }

  lead.updatedBy = userId;
  lead.lastActivityAt = new Date();
  await lead.save();

  if (updates.status !== undefined && updates.status !== oldStatus) {
    const formattedStatus = updates.status.charAt(0).toUpperCase() + updates.status.slice(1);
    await logActivity({
      userId,
      workspaceId: lead.workspaceId,
      performedBy: userId,
      leadId,
      type: "STATUS_CHANGED",
      title: `Status → ${formattedStatus}`,
      metadata: { oldStatus, newStatus: updates.status }
    });

    if (updates.status === "meeting") {
      await logActivity({
        userId,
        workspaceId: lead.workspaceId,
        performedBy: userId,
        leadId,
        type: "MEETING_SCHEDULED",
        title: "Meeting scheduled",
        metadata: { status: "meeting" }
      });
    }
  } else if (updates.notes !== undefined) {
    await logActivity({
      userId,
      workspaceId: lead.workspaceId,
      performedBy: userId,
      leadId,
      type: "NOTE_ADDED",
      title: "Note updated",
      metadata: { notes: updates.notes }
    });
  } else {
    await logActivity({
      userId,
      workspaceId: lead.workspaceId,
      performedBy: userId,
      leadId,
      type: "LEAD_UPDATED",
      title: "Lead details updated",
      metadata: updates
    });
  }

  return lead;
};

export const addFollowUpService = async ({ leadId, userId, workspaceId, dueAt, note }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const lead = await Lead.findOne(scope);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const followUp = await FollowUp.create({
    leadId,
    userId,
    workspaceId: lead.workspaceId || workspaceId || null,
    createdBy: userId,
    dueAt: new Date(dueAt),
    note: note || "",
    status: "pending"
  });

  await logActivity({
    userId,
    workspaceId: lead.workspaceId,
    performedBy: userId,
    leadId,
    type: "FOLLOWUP_CREATED",
    title: "Follow-up scheduled",
    metadata: { followUpId: followUp._id, dueAt, note }
  });

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId }).sort({ dueAt: 1 }).lean();
  const leadObj: any = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const updateFollowUpService = async ({
  leadId,
  followUpId,
  userId,
  workspaceId,
  updates
}: {
  leadId: any;
  followUpId: any;
  userId: any;
  workspaceId?: any;
  updates: any;
}) => {
  if (!isValidObjectId(leadId) || !isValidObjectId(followUpId)) {
    throw new ApiError(400, "Invalid lead or follow-up ID");
  }

  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const lead = await Lead.findOne(scope);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const followUpUpdates: Record<string, any> = {};
  if (updates.dueAt !== undefined) followUpUpdates.dueAt = new Date(updates.dueAt);
  if (updates.note !== undefined) followUpUpdates.note = updates.note;
  if (updates.status !== undefined) followUpUpdates.status = updates.status;

  const updatedFollowUp = await FollowUp.findOneAndUpdate(
    { _id: followUpId, leadId },
    { $set: followUpUpdates },
    { new: true }
  );

  if (!updatedFollowUp) {
    throw new ApiError(404, "Follow-up not found");
  }

  if (updates.status === "done" || updates.status === "skipped") {
    await logActivity({
      userId,
      workspaceId: lead.workspaceId,
      performedBy: userId,
      leadId,
      type: "FOLLOWUP_COMPLETED",
      title: `Follow-up ${updates.status === "done" ? "completed" : "skipped"}`,
      metadata: { followUpId, status: updates.status, note: updatedFollowUp.note }
    });
  }

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId }).sort({ dueAt: 1 }).lean();
  const leadObj: any = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const deleteFollowUpService = async ({ leadId, followUpId, userId, workspaceId }) => {
  if (!isValidObjectId(leadId) || !isValidObjectId(followUpId)) {
    throw new ApiError(400, "Invalid lead or follow-up ID");
  }

  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const lead = await Lead.findOne(scope);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const deletedFollowUp = await FollowUp.findOneAndDelete({
    _id: followUpId,
    leadId
  });

  if (!deletedFollowUp) {
    throw new ApiError(404, "Follow-up not found");
  }

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId }).sort({ dueAt: 1 }).lean();
  const leadObj: any = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const deleteLeadService = async ({ leadId, userId, workspaceId }) => {
  const scope = workspaceId
    ? { _id: leadId, $or: [{ workspaceId }, { userId }] }
    : { _id: leadId, userId };

  const deletedLead = await Lead.findOneAndDelete(scope);

  if (!deletedLead) {
    throw new ApiError(404, "Lead not found or already deleted");
  }

  await FollowUp.deleteMany({ leadId });

  return { success: true };
};

export const bulkDeleteLeadsService = async ({ leadIds, userId, workspaceId }) => {
  const scope = workspaceId
    ? { _id: { $in: leadIds }, $or: [{ workspaceId }, { userId }] }
    : { _id: { $in: leadIds }, userId };

  const result = await Lead.deleteMany(scope);

  await FollowUp.deleteMany({ leadId: { $in: leadIds } });

  return {
    success: true,
    deletedCount: result.deletedCount ?? 0
  };
};

export const getWorkspaceTagsService = async ({ userId, workspaceId }) => {
  return leadRepository.distinctTags({ workspaceId, userId });
};

export const bulkTagLeadsService = async ({ leadIds, tags, action = "add", userId, workspaceId }) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ApiError(400, "Select at least one lead");
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new ApiError(400, "Provide at least one tag");
  }

  const cleanTags = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))];
  const scope = workspaceId
    ? { _id: { $in: leadIds }, $or: [{ workspaceId }, { userId }] }
    : { _id: { $in: leadIds }, userId };

  const updateOp =
    action === "remove"
      ? { $pull: { tags: { $in: cleanTags } } }
      : { $addToSet: { tags: { $each: cleanTags } } };

  const result = await Lead.updateMany(scope, {
    ...updateOp,
    $set: { updatedBy: userId, lastActivityAt: new Date() }
  });

  return {
    success: true,
    modifiedCount: result.modifiedCount ?? 0,
    tags: cleanTags,
    action
  };
};

