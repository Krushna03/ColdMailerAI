import { Types } from "mongoose";
import { Sequence, ISequenceDocument, SequenceStatus } from "../models/Sequence.model.js";
import { SequenceStep, ISequenceStepDocument } from "../models/SequenceStep.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { CreateSequenceInput, UpdateSequenceInput } from "../validators/sequence.validators.js";

export interface ListSequencesParams {
  workspaceId: string | Types.ObjectId;
  status?: SequenceStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export async function createSequenceService({
  workspaceId,
  userId,
  data,
}: {
  workspaceId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  data: CreateSequenceInput;
}) {
  const sequence = await Sequence.create({
    workspaceId: new Types.ObjectId(String(workspaceId)),
    userId: new Types.ObjectId(String(userId)),
    name: data.name,
    description: data.description || "",
    status: data.status || "draft",
    settings: data.settings,
    enrollmentRules: data.enrollmentRules,
    stepsCount: data.steps ? data.steps.length : 0,
    stats: {
      totalEnrolled: 0,
      activeCount: 0,
      completedCount: 0,
      repliedCount: 0,
      bouncedCount: 0,
      stoppedCount: 0,
    },
  });

  // If initial steps were provided, create them
  if (data.steps && data.steps.length > 0) {
    const stepDocs = data.steps.map((step, idx) => ({
      sequenceId: sequence._id,
      workspaceId: sequence.workspaceId,
      order: step.order || idx + 1,
      type: step.type,
      title: step.title || `Step ${idx + 1}: ${step.type.toUpperCase()}`,
      delay: step.delay || { value: idx === 0 ? 0 : 3, unit: "days" },
      template: step.template || { subject: "", body: "" },
      conditions: step.conditions || { field: "none", operator: "is_false", actionOnFalse: "skip" },
      taskConfig: step.taskConfig || {},
      webhookConfig: step.webhookConfig || {},
      aiActionConfig: step.aiActionConfig || {},
      stats: {
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        repliedCount: 0,
        failedCount: 0,
      },
    }));

    await SequenceStep.insertMany(stepDocs);
  }

  return getSequenceByIdService(sequence._id, workspaceId);
}

export async function getSequenceByIdService(
  sequenceId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId
) {
  const sequence = await Sequence.findOne({
    _id: new Types.ObjectId(String(sequenceId)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  }).populate("settings.mailboxId", "name email provider status healthScore");

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  const steps = await SequenceStep.find({
    sequenceId: sequence._id,
  }).sort({ order: 1 });

  return {
    ...sequence.toObject(),
    steps,
  };
}

export async function listSequencesService({
  workspaceId,
  status,
  search,
  page = 1,
  limit = 20,
}: ListSequencesParams) {
  const query: any = {
    workspaceId: new Types.ObjectId(String(workspaceId)),
  };

  if (status) {
    query.status = status;
  }

  if (search && search.trim()) {
    query.name = { $regex: search.trim(), $options: "i" };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [sequences, total] = await Promise.all([
    Sequence.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("settings.mailboxId", "name email provider status"),
    Sequence.countDocuments(query),
  ]);

  return {
    sequences,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function updateSequenceService(
  sequenceId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId,
  updates: UpdateSequenceInput
) {
  const sequence = await Sequence.findOne({
    _id: new Types.ObjectId(String(sequenceId)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  if (updates.name !== undefined) sequence.name = updates.name;
  if (updates.description !== undefined) sequence.description = updates.description;
  if (updates.status !== undefined) sequence.status = updates.status;

  if (updates.settings) {
    const mailboxId = updates.settings.mailboxId
      ? new Types.ObjectId(String(updates.settings.mailboxId))
      : updates.settings.mailboxId === null
      ? null
      : sequence.settings.mailboxId;

    sequence.settings = {
      ...sequence.settings,
      ...updates.settings,
      mailboxId,
      sendWindow: {
        ...sequence.settings.sendWindow,
        ...(updates.settings.sendWindow || {}),
      },
    };
  }

  if (updates.enrollmentRules) {
    const autoEnrollSegmentId = updates.enrollmentRules.autoEnrollSegmentId
      ? new Types.ObjectId(String(updates.enrollmentRules.autoEnrollSegmentId))
      : updates.enrollmentRules.autoEnrollSegmentId === null
      ? null
      : sequence.enrollmentRules.autoEnrollSegmentId;

    sequence.enrollmentRules = {
      ...sequence.enrollmentRules,
      ...updates.enrollmentRules,
      autoEnrollSegmentId,
    };
  }

  await sequence.save();
  return getSequenceByIdService(sequence._id, workspaceId);
}

export async function updateSequenceStatusService(
  sequenceId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId,
  status: SequenceStatus
) {
  const sequence = await Sequence.findOneAndUpdate(
    {
      _id: new Types.ObjectId(String(sequenceId)),
      workspaceId: new Types.ObjectId(String(workspaceId)),
    },
    { $set: { status } },
    { new: true }
  );

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  return sequence;
}

export async function deleteSequenceService(
  sequenceId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId
) {
  const sequence = await Sequence.findOne({
    _id: new Types.ObjectId(String(sequenceId)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  // Delete sequence steps and enrollments
  await Promise.all([
    SequenceStep.deleteMany({ sequenceId: sequence._id }),
    SequenceEnrollment.deleteMany({ sequenceId: sequence._id }),
    Sequence.deleteOne({ _id: sequence._id }),
  ]);

  return { message: "Sequence deleted successfully" };
}

export async function saveSequenceStepsService(
  sequenceId: string | Types.ObjectId,
  workspaceId: string | Types.ObjectId,
  steps: any[]
) {
  const sequence = await Sequence.findOne({
    _id: new Types.ObjectId(String(sequenceId)),
    workspaceId: new Types.ObjectId(String(workspaceId)),
  });

  if (!sequence) {
    throw new ApiError(404, "Sequence not found");
  }

  // Clear existing steps and insert newly ordered steps
  await SequenceStep.deleteMany({ sequenceId: sequence._id });

  const preparedSteps = steps.map((step, index) => ({
    sequenceId: sequence._id,
    workspaceId: sequence.workspaceId,
    order: index + 1,
    type: step.type,
    title: step.title || `Step ${index + 1}: ${step.type.toUpperCase()}`,
    delay: step.delay || { value: index === 0 ? 0 : 3, unit: "days" },
    template: step.template || { subject: "", body: "" },
    conditions: step.conditions || { field: "none", operator: "is_false", actionOnFalse: "skip" },
    taskConfig: step.taskConfig || {},
    webhookConfig: step.webhookConfig || {},
    aiActionConfig: step.aiActionConfig || {},
    stats: step.stats || {
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      repliedCount: 0,
      failedCount: 0,
    },
  }));

  const createdSteps = await SequenceStep.insertMany(preparedSteps);

  sequence.stepsCount = createdSteps.length;
  await sequence.save();

  return createdSteps;
}

export async function recalculateSequenceStatsService(sequenceId: string | Types.ObjectId) {
  const seqId = new Types.ObjectId(String(sequenceId));

  const [enrollmentCounts, sequence] = await Promise.all([
    SequenceEnrollment.aggregate([
      { $match: { sequenceId: seqId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Sequence.findById(seqId),
  ]);

  if (!sequence) return;

  const counts: Record<string, number> = {
    active: 0,
    paused: 0,
    completed: 0,
    stopped: 0,
    failed: 0,
  };

  let total = 0;
  for (const item of enrollmentCounts) {
    counts[item._id] = item.count;
    total += item.count;
  }

  // Check how many stopped because of reply
  const repliedCount = await SequenceEnrollment.countDocuments({
    sequenceId: seqId,
    stopReason: "replied",
  });

  sequence.stats = {
    totalEnrolled: total,
    activeCount: counts.active || 0,
    completedCount: counts.completed || 0,
    repliedCount,
    bouncedCount: 0,
    stoppedCount: counts.stopped || 0,
  };

  await sequence.save();
}
