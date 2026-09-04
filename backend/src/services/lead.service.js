import mongoose from "mongoose";
import { Lead, isValidStatusTransition } from "../models/Lead.model.js";
import { FollowUp } from "../models/FollowUp.model.js";
import { Email } from "../models/Email.model.js";
import { Activity } from "../models/Activity.model.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";
import { assertCategoryAccessible } from "./leadCategory.service.js";

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

export const createLeadService = async ({ leadData, userId }) => {
  await assertCategoryAccessible({
    categoryId: leadData.categoryId,
    userId
  });

  const email = (leadData.email || "").trim().toLowerCase();
  if (email) {
    const existing = await Lead.findOne({
      userId,
      categoryId: leadData.categoryId,
      email
    });
    if (existing) {
      throw new ApiError(409, "A lead with this email already exists in this category");
    }
  }

  const lead = await Lead.create({
    ...leadData,
    email,
    userId,
    lastActivityAt: new Date()
  });

  await logActivity({
    userId,
    leadId: lead._id,
    type: "LEAD_CREATED",
    title: `Lead created: ${lead.name}`,
    metadata: { name: lead.name, email: lead.email, company: lead.company }
  });

  return lead;
};

export const bulkCreateLeadsService = async ({ leads, userId }) => {
  const categoryIds = [...new Set(leads.map((lead) => String(lead.categoryId)))];
  await Promise.all(
    categoryIds.map((categoryId) => assertCategoryAccessible({ categoryId, userId }))
  );

  const now = new Date();

  const existingDocs = await Lead.find({
    userId,
    categoryId: { $in: categoryIds },
    email: { $ne: "" }
  })
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
      email: normEmail,
      userId,
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
  limit,
  page,
  status,
  overdueOnly,
  categoryId,
  search
}) => {
  const skip = page * limit;
  const filter = { userId };

  if (status) {
    filter.status = status;
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (overdueOnly) {
    filter.nextFollowUpAt = { $ne: null, $lt: new Date() };
  }

  if (search) {
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { company: { $regex: escapedSearch, $options: "i" } },
      { role: { $regex: escapedSearch, $options: "i" } }
    ];
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
  
  const allFollowUps = await FollowUp.find({ leadId: { $in: leadIds }, userId })
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

export const getLeadsByIdsService = async ({ leadIds, userId }) => {
  const leads = await Lead.find({
    _id: { $in: leadIds },
    userId
  })
    .populate("categoryId", "name slug description isDefault")
    .lean();

  if (!leads.length) {
    throw new ApiError(404, "No matching leads found");
  }

  return leads;
};

export const getLeadByIdService = async ({ leadId, userId }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const lead = await Lead.findOne({ _id: leadId, userId })
    .populate("categoryId", "name slug description isDefault")
    .lean();
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const [emails, followUps, activities] = await Promise.all([
    Email.find({ leadId, userId }).sort({ createdAt: -1 }).lean(),
    FollowUp.find({ leadId, userId }).sort({ dueAt: 1 }).lean(),
    Activity.find({ leadId, userId }).sort({ createdAt: -1 }).lean()
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

export const updateLeadService = async ({ leadId, userId, updates }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const lead = await Lead.findOne({ _id: leadId, userId });
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

  const allowed = ["name", "company", "role", "email", "notes", "status", "categoryId"];
  
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      lead[key] = updates[key];
    }
  }

  lead.lastActivityAt = new Date();
  await lead.save();

  if (updates.status !== undefined && updates.status !== oldStatus) {
    const formattedStatus = updates.status.charAt(0).toUpperCase() + updates.status.slice(1);
    await logActivity({
      userId,
      leadId,
      type: "STATUS_CHANGED",
      title: `Status → ${formattedStatus}`,
      metadata: { oldStatus, newStatus: updates.status }
    });

    if (updates.status === "meeting") {
      await logActivity({
        userId,
        leadId,
        type: "MEETING_SCHEDULED",
        title: "Meeting scheduled",
        metadata: { status: "meeting" }
      });
    }
  } else if (updates.notes !== undefined) {
    await logActivity({
      userId,
      leadId,
      type: "NOTE_ADDED",
      title: "Note updated",
      metadata: { notes: updates.notes }
    });
  } else {
    await logActivity({
      userId,
      leadId,
      type: "LEAD_UPDATED",
      title: "Lead details updated",
      metadata: updates
    });
  }

  return lead;
};

export const addFollowUpService = async ({ leadId, userId, dueAt, note }) => {
  if (!isValidObjectId(leadId)) {
    throw new ApiError(400, "Invalid lead ID");
  }

  const lead = await Lead.findOne({ _id: leadId, userId });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const followUp = await FollowUp.create({
    leadId,
    userId,
    dueAt: new Date(dueAt),
    note: note || "",
    status: "pending"
  });

  await logActivity({
    userId,
    leadId,
    type: "FOLLOWUP_CREATED",
    title: "Follow-up scheduled",
    metadata: { followUpId: followUp._id, dueAt, note }
  });

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId, userId }).sort({ dueAt: 1 }).lean();
  const leadObj = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const updateFollowUpService = async ({
  leadId,
  followUpId,
  userId,
  updates
}) => {
  if (!isValidObjectId(leadId) || !isValidObjectId(followUpId)) {
    throw new ApiError(400, "Invalid lead or follow-up ID");
  }

  const lead = await Lead.findOne({ _id: leadId, userId });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const followUpUpdates = {};
  if (updates.dueAt !== undefined) followUpUpdates.dueAt = new Date(updates.dueAt);
  if (updates.note !== undefined) followUpUpdates.note = updates.note;
  if (updates.status !== undefined) followUpUpdates.status = updates.status;

  const updatedFollowUp = await FollowUp.findOneAndUpdate(
    { _id: followUpId, leadId, userId },
    { $set: followUpUpdates },
    { new: true }
  );

  if (!updatedFollowUp) {
    throw new ApiError(404, "Follow-up not found");
  }

  if (updates.status === "done" || updates.status === "skipped") {
    await logActivity({
      userId,
      leadId,
      type: "FOLLOWUP_COMPLETED",
      title: `Follow-up ${updates.status === "done" ? "completed" : "skipped"}`,
      metadata: { followUpId, status: updates.status, note: updatedFollowUp.note }
    });
  }

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId, userId }).sort({ dueAt: 1 }).lean();
  const leadObj = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const deleteFollowUpService = async ({ leadId, followUpId, userId }) => {
  if (!isValidObjectId(leadId) || !isValidObjectId(followUpId)) {
    throw new ApiError(400, "Invalid lead or follow-up ID");
  }

  const lead = await Lead.findOne({ _id: leadId, userId });
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const deletedFollowUp = await FollowUp.findOneAndDelete({
    _id: followUpId,
    leadId,
    userId
  });

  if (!deletedFollowUp) {
    throw new ApiError(404, "Follow-up not found");
  }

  lead.nextFollowUpAt = await earliestPendingFollowUp(leadId);
  lead.lastActivityAt = new Date();
  await lead.save();

  const followUps = await FollowUp.find({ leadId, userId }).sort({ dueAt: 1 }).lean();
  const leadObj = lead.toObject();
  leadObj.followUps = followUps;
  return leadObj;
};

export const deleteLeadService = async ({ leadId, userId }) => {
  const deletedLead = await Lead.findOneAndDelete({
    _id: leadId,
    userId
  });

  if (!deletedLead) {
    throw new ApiError(404, "Lead not found or already deleted");
  }

  await FollowUp.deleteMany({ leadId, userId });

  return { success: true };
};

export const bulkDeleteLeadsService = async ({ leadIds, userId }) => {
  const result = await Lead.deleteMany({
    _id: { $in: leadIds },
    userId
  });

  await FollowUp.deleteMany({ leadId: { $in: leadIds }, userId });

  return {
    success: true,
    deletedCount: result.deletedCount ?? 0
  };
};
