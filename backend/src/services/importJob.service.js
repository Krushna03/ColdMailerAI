import { ImportJob } from "../models/ImportJob.model.js";
import { Lead } from "../models/Lead.model.js";
import { verifyEmailAddress } from "./emailVerification.service.js";
import { assertCategoryAccessible } from "./leadCategory.service.js";
import { logActivity } from "./activity.service.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const IMPORT_CONCURRENCY = 5;

/**
 * Worker pool helper for parallel execution
 */
const runWithPool = async (items, concurrency, workerFn) => {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIdx = index++;
      await workerFn(items[currentIdx], currentIdx);
    }
  });
  await Promise.all(workers);
};

/**
 * Atomically claim the next eligible pending import job from MongoDB
 */
export const claimNextImportJob = async () => {
  return await ImportJob.findOneAndUpdate(
    {
      status: "pending",
      $expr: { $lt: ["$attempts", "$maxAttempts"] }
    },
    {
      $set: {
        status: "processing",
        startedAt: new Date(),
        lockedAt: new Date()
      },
      $inc: { attempts: 1 }
    },
    { new: true, sort: { createdAt: 1 } }
  );
};

/**
 * Crash / Stalled Job Recovery Engine:
 * Recovers jobs stuck in 'processing' when a server crashed or restarted mid-run.
 */
export const recoverStaleImportJobs = async (staleMinutes = 5) => {
  const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);

  // Mark permanently failed if attempts exceeded maxAttempts
  await ImportJob.updateMany(
    {
      status: "processing",
      lockedAt: { $lt: staleThreshold },
      $expr: { $gte: ["$attempts", "$maxAttempts"] }
    },
    {
      $set: {
        status: "failed",
        failedReason: "Exceeded max attempts after worker stall / server crash",
        completedAt: new Date()
      }
    }
  );

  // Reset eligible stalled jobs back to 'pending' to be picked up again
  const result = await ImportJob.updateMany(
    {
      status: "processing",
      lockedAt: { $lt: staleThreshold },
      $expr: { $lt: ["$attempts", "$maxAttempts"] }
    },
    {
      $set: {
        status: "pending",
        lockedAt: null
      }
    }
  );

  return result.modifiedCount || 0;
};

/**
 * Background worker processing lead import and asynchronous email verification.
 * Supports direct execution or invocation by queue drainers.
 */
export const processImportJobWorker = async (
  jobId,
  leads = null,
  options = {}
) => {
  let job = await ImportJob.findById(jobId);
  if (!job || job.status === "cancelled") return;

  const userId = options.userId || job.userId;
  const workspaceId = options.workspaceId !== undefined ? options.workspaceId : job.workspaceId;
  const categoryId = options.categoryId !== undefined ? options.categoryId : job.categoryId;
  const verifyEmails = options.verifyEmails !== undefined ? options.verifyEmails : job.verifyEmails;

  // Determine items to process: use explicit leads or read from persisted payload
  const leadsToProcess =
    Array.isArray(leads) && leads.length > 0
      ? leads
      : Array.isArray(job.payload) && job.payload.length > 0
      ? job.payload
      : [];

  const now = new Date();
  const effectiveWorkspaceId = workspaceId || null;

  // Ensure job is marked processing and heartbeat is initialized
  if (job.status === "pending") {
    await ImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: "processing",
        startedAt: job.startedAt || now,
        lockedAt: now
      },
      $inc: { attempts: 1 }
    });
  }

  let processedRows = job.processedRows || 0;
  let validCount = job.validCount || 0;
  let invalidCount = job.invalidCount || 0;
  let riskyCount = job.riskyCount || 0;
  let disposableCount = job.disposableCount || 0;
  let catchAllCount = job.catchAllCount || 0;
  let duplicateCount = job.duplicateCount || 0;

  try {
    // 1. Gather existing emails in category to deduplicate
    const categoryIds = categoryId ? [categoryId] : [];
    const existingDocs = await Lead.find({
      userId,
      ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}),
      ...(categoryIds.length > 0 ? { categoryId: { $in: categoryIds } } : {}),
      email: { $ne: "" }
    })
      .select("email")
      .lean();

    const existingSet = new Set(existingDocs.map((d) => d.email.toLowerCase()));
    const seenInBatch = new Set();

    const verifiedLeadsToInsert = [];
    const errors = [];

    // 2. Process leads with controlled concurrency
    await runWithPool(leadsToProcess, IMPORT_CONCURRENCY, async (rawLead) => {
      // Check if job got cancelled mid-flight
      const currentJobCheck = await ImportJob.findById(jobId).select("status");
      if (currentJobCheck?.status === "cancelled") return;

      const normEmail = (rawLead.email || "").trim().toLowerCase();

      // Deduplication check
      if (normEmail) {
        if (existingSet.has(normEmail) || seenInBatch.has(normEmail)) {
          duplicateCount++;
          processedRows++;
          return;
        }
        seenInBatch.add(normEmail);
      }

      let verificationResult = {
        status: "unknown",
        provider: "built-in",
        score: 0,
        reason: "Email verification skipped",
        mxRecords: [],
        checkedAt: null
      };

      // Perform verification if requested and email exists
      if (verifyEmails && normEmail) {
        try {
          verificationResult = await verifyEmailAddress(normEmail);
        } catch (vErr) {
          verificationResult = {
            status: "risky",
            provider: "built-in",
            score: 40,
            reason: vErr.message || "Verification failed unexpectedly",
            mxRecords: [],
            checkedAt: now
          };
        }

        // Tally statistics
        if (verificationResult.status === "valid") validCount++;
        else if (verificationResult.status === "invalid") invalidCount++;
        else if (verificationResult.status === "risky") riskyCount++;
        else if (verificationResult.status === "disposable") disposableCount++;
        else if (verificationResult.status === "catch_all") catchAllCount++;
      }

      verifiedLeadsToInsert.push({
        ...rawLead,
        email: normEmail,
        userId,
        workspaceId: effectiveWorkspaceId,
        createdBy: userId,
        updatedBy: userId,
        assignedTo: rawLead.assignedTo || userId,
        categoryId: categoryId || rawLead.categoryId || null,
        emailVerification: verificationResult,
        source: "csv_import",
        lastActivityAt: now
      });

      processedRows++;

      // Periodically persist heartbeat & progress atomically
      if (processedRows % 10 === 0) {
        await ImportJob.findByIdAndUpdate(jobId, {
          $set: {
            processedRows,
            validCount,
            invalidCount,
            riskyCount,
            disposableCount,
            catchAllCount,
            duplicateCount,
            lockedAt: new Date()
          }
        });
      }
    });

    // 3. Insert verified leads into MongoDB
    let insertedDocs = [];
    if (verifiedLeadsToInsert.length > 0) {
      insertedDocs = await Lead.insertMany(verifiedLeadsToInsert, { ordered: false });

      // Log import activity
      await Promise.all(
        insertedDocs.map((created) =>
          logActivity({
            userId,
            workspaceId: effectiveWorkspaceId,
            performedBy: userId,
            leadId: created._id,
            type: "LEAD_CREATED",
            title: `Lead imported & verified: ${created.name}`,
            metadata: {
              name: created.name,
              email: created.email,
              verificationStatus: created.emailVerification?.status,
              deliverabilityScore: created.emailVerification?.score
            }
          })
        )
      );
    }

    // 4. Finalize job status and clean up payload to prevent DB bloat
    await ImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        processedRows,
        validCount,
        invalidCount,
        riskyCount,
        disposableCount,
        catchAllCount,
        duplicateCount,
        insertedCount: insertedDocs.length,
        insertedLeadIds: insertedDocs.map((d) => d._id),
        completedAt: new Date(),
        lockedAt: new Date(),
        payload: []
      }
    });
  } catch (fatalErr) {
    await ImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: "failed",
        failedReason: fatalErr.message || "Fatal worker error",
        completedAt: new Date()
      },
      $push: {
        errors: { row: 0, email: "", message: fatalErr.message || "Fatal worker error" }
      }
    });
  }
};

let isDrainingQueue = false;

/**
 * Drain loop for processing pending jobs in the queue
 */
export const drainImportJobQueue = async () => {
  if (isDrainingQueue) return;
  isDrainingQueue = true;

  try {
    while (true) {
      const job = await claimNextImportJob();
      if (!job) break;

      await processImportJobWorker(job._id, job.payload, {
        userId: job.userId,
        workspaceId: job.workspaceId,
        categoryId: job.categoryId,
        verifyEmails: job.verifyEmails
      });
    }
  } catch (err) {
    console.error("[ImportJob Queue Drain Error]", err);
  } finally {
    isDrainingQueue = false;
  }
};

/**
 * Trigger queue drain in background
 */
export const triggerImportJobQueue = () => {
  setImmediate(() => {
    drainImportJobQueue().catch((err) => {
      console.error("[ImportJob Trigger Error]", err);
    });
  });
};

/**
 * Create asynchronous ImportJob and trigger background verification worker
 */
export const createImportJobService = async ({
  userId,
  workspaceId,
  leads,
  categoryId,
  fileName = "leads.csv",
  fileSize = 0,
  verifyEmails = true
}) => {
  if (!Array.isArray(leads) || leads.length === 0) {
    throw new ApiError(400, "No valid leads provided for import");
  }

  if (categoryId) {
    await assertCategoryAccessible({ categoryId, userId });
  }

  // Persist job document with payload so it is crash-resilient across server restarts
  const job = await ImportJob.create({
    userId,
    workspaceId: workspaceId || null,
    totalRows: leads.length,
    categoryId: categoryId || null,
    fileName,
    fileSize,
    verifyEmails,
    payload: leads,
    status: "pending"
  });

  // Launch queue drainer asynchronously
  triggerImportJobQueue();

  return job;
};

/**
 * Retrieve ImportJob status for polling
 */
export const getImportJobStatusService = async ({ jobId, userId, workspaceId }) => {
  if (!isValidObjectId(jobId)) {
    throw new ApiError(400, "Invalid import job ID");
  }

  const scope = workspaceId
    ? { _id: jobId, $or: [{ workspaceId }, { userId }] }
    : { _id: jobId, userId };

  const job = await ImportJob.findOne(scope).select("-payload").lean();
  if (!job) {
    throw new ApiError(404, "Import job not found");
  }

  const percentComplete =
    job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;

  return {
    ...job,
    percentComplete
  };
};

/**
 * List recent import jobs for user / workspace
 */
export const listImportJobsService = async ({ userId, workspaceId, limit = 20, page = 0 }) => {
  const scope = workspaceId
    ? { $or: [{ workspaceId }, { userId }] }
    : { userId };

  const skip = page * limit;

  const [jobs, total] = await Promise.all([
    ImportJob.find(scope)
      .select("-payload")
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    ImportJob.countDocuments(scope)
  ]);

  return {
    jobs,
    total,
    hasMore: skip + jobs.length < total
  };
};

/**
 * On-demand email verification for a single lead
 */
export const verifySingleLeadService = async ({ leadId, userId, workspaceId }) => {
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

  if (!lead.email) {
    throw new ApiError(400, "Lead has no email address to verify");
  }

  const verificationResult = await verifyEmailAddress(lead.email);

  lead.emailVerification = verificationResult;
  lead.lastActivityAt = new Date();
  await lead.save();

  await logActivity({
    userId,
    workspaceId: lead.workspaceId,
    performedBy: userId,
    leadId: lead._id,
    type: "LEAD_UPDATED",
    title: `Email verified: ${verificationResult.status.toUpperCase()} (${verificationResult.score}/100)`,
    metadata: {
      email: lead.email,
      status: verificationResult.status,
      score: verificationResult.score,
      reason: verificationResult.reason,
      provider: verificationResult.provider
    }
  });

  return lead;
};
