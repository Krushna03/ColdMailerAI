import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
import { Mailbox } from "../models/Mailbox.model.js";
import { SendJob } from "../models/SendJob.model.js";
import { Sequence } from "../models/Sequence.model.js";
import { SequenceEnrollment } from "../models/SequenceEnrollment.model.js";

dotenv.config();

async function heal() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("No MONGODB_URI");
    return;
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for healing");

  const activeMailbox = await Mailbox.findOne({
    workspaceId: new Types.ObjectId("6aae4a877607e49cc5f7b9dd"),
    status: "active",
  });

  if (!activeMailbox) {
    console.error("No active mailbox found in workspace 6aae4a877607e49cc5f7b9dd");
    return;
  }

  console.log(`Active Mailbox found: ${activeMailbox._id} (${activeMailbox.email})`);

  // 1. Heal Sequences
  const seqResult = await Sequence.updateMany(
    {
      workspaceId: new Types.ObjectId("6aae4a877607e49cc5f7b9dd"),
      $or: [
        { "settings.mailboxId": new Types.ObjectId("6ab810df9dcc8a7e34947570") },
        { "settings.mailboxId": { $exists: false } },
        { "settings.mailboxId": null },
      ],
    },
    {
      $set: { "settings.mailboxId": activeMailbox._id },
    }
  );
  console.log(`Updated ${seqResult.modifiedCount} sequences to active mailbox`);

  // 2. Heal Enrollments
  const enrResult = await SequenceEnrollment.updateMany(
    {
      workspaceId: new Types.ObjectId("6aae4a877607e49cc5f7b9dd"),
      $or: [
        { mailboxId: new Types.ObjectId("6ab810df9dcc8a7e34947570") },
        { mailboxId: { $exists: false } },
        { mailboxId: null },
      ],
    },
    {
      $set: { mailboxId: activeMailbox._id },
    }
  );
  console.log(`Updated ${enrResult.modifiedCount} enrollments to active mailbox`);

  // 3. Heal and Re-queue SendJobs
  const jobResult = await SendJob.updateMany(
    {
      workspaceId: new Types.ObjectId("6aae4a877607e49cc5f7b9dd"),
    },
    {
      $set: {
        mailboxId: activeMailbox._id,
        status: "queued",
        attempts: 0,
        lockedAt: null,
        lockedBy: null,
        failedAt: null,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    }
  );
  console.log(`Updated and re-queued ${jobResult.modifiedCount} send jobs to active mailbox`);

  await mongoose.disconnect();
  console.log("Healing complete!");
}

heal().catch(console.error);
