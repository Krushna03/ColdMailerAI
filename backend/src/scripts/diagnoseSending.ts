import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Mailbox } from "../models/Mailbox.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";

dotenv.config();

async function diagnose() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("No MONGODB_URI found");
    return;
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully");

  console.log("\n=== ALL MAILBOXES ===");
  const mailboxes = await Mailbox.find().lean();
  for (const m of mailboxes) {
    console.log({
      id: m._id.toString(),
      email: m.email,
      name: m.name,
      provider: m.provider,
      status: m.status,
      health: m.health,
      smtpConfig: m.smtpConfig,
      workspaceId: m.workspaceId?.toString(),
    });
  }

  console.log("\n=== LATEST SEND JOBS ===");
  const sendJobs = await SendJob.find().sort({ createdAt: -1 }).limit(5).lean();
  for (const j of sendJobs) {
    console.log({
      id: j._id.toString(),
      workspaceId: j.workspaceId?.toString(),
      status: j.status,
      mailboxId: j.mailboxId?.toString(),
      attempts: j.attempts,
      lastError: j.lastError,
      messagePayload: { to: j.messagePayload?.to, subject: j.messagePayload?.subject },
      createdAt: j.createdAt,
    });
  }

  console.log("\n=== SEQUENCES ===");
  const sequences = await Sequence.find().lean();
  for (const s of sequences) {
    console.log({
      id: s._id.toString(),
      workspaceId: s.workspaceId?.toString(),
      name: s.name,
      status: s.status,
      settingsMailboxId: s.settings?.mailboxId?.toString(),
    });
  }

  console.log("\n=== LATEST ENROLLMENTS ===");
  const enrollments = await SequenceEnrollment.find().sort({ createdAt: -1 }).limit(5).lean();
  for (const e of enrollments) {
    console.log({
      id: e._id.toString(),
      sequenceId: e.sequenceId?.toString(),
      leadId: e.leadId?.toString(),
      status: e.status,
      mailboxId: e.mailboxId?.toString(),
      currentStepOrder: e.currentStepOrder,
      stepHistory: e.stepHistory,
    });
  }

  await mongoose.disconnect();
}

diagnose().catch(console.error);
