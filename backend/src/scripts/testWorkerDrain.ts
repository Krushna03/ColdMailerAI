import mongoose from "mongoose";
import dotenv from "dotenv";
import { drainSendJobQueue } from "../services/sendJob.service.js";
import { SendJob } from "../models/SendJob.model.js";

import { Mailbox } from "../models/Mailbox.model.js";

dotenv.config();

async function testDrain() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return;

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  // Reactivate mailboxes that were tripped into error state
  await Mailbox.updateMany({}, {
    $set: {
      status: "active",
      "health.consecutiveFailures": 0,
      "health.score": 100,
      "health.status": "excellent",
      "health.lastError": null,
    },
  });

  // Reset any dead-letter test jobs
  await SendJob.updateMany({}, { $set: { status: "queued", attempts: 0, nextAttemptAt: new Date(), lastError: null } });

  const beforeJobs = await SendJob.find().lean();
  console.log("Jobs before drain:", beforeJobs.map(j => ({ id: j._id, status: j.status, attempts: j.attempts, mailboxId: j.mailboxId })));

  console.log("Draining queue...");
  const stats = await drainSendJobQueue(5, "diagnostic-worker");
  console.log("Drain stats result:", stats);

  const afterJobs = await SendJob.find().lean();
  console.log("Jobs after drain:", afterJobs.map(j => ({ id: j._id, status: j.status, attempts: j.attempts, lastError: j.lastError })));

  await mongoose.disconnect();
}

testDrain().catch(console.error);
