import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User.model.js";
import { PAYMENT_PLANS, getAuthorizedDeveloperEmails } from "../config/paymentPlans.js";

dotenv.config();

const emailArg = process.argv[2];

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI not found in .env");
    process.exit(1);
  }

  const authorizedEmails = getAuthorizedDeveloperEmails();
  const targetEmail = (emailArg || authorizedEmails[0] || "").trim().toLowerCase();

  if (!targetEmail) {
    console.error("Usage: npx tsx src/scripts/setTestPlan.ts <user-email>");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);

  const user = await UserModel.findOne({ email: targetEmail });
  if (!user) {
    console.error(`User with email "${targetEmail}" not found in database.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.planId = "TESTING";
  user.planName = PAYMENT_PLANS.TESTING.name;
  user.isPaidUser = true;
  user.planActivatedAt = new Date();
  user.planExpiresAt = null as any;

  await user.save();

  console.log("--------------------------------------------------");
  console.log(`Successfully assigned TESTING plan to: ${targetEmail}`);
  console.log(`Plan Name: ${user.planName}`);
  console.log(`isPaidUser: ${user.isPaidUser}`);
  console.log(`Plan Expiry: None (Permanent Developer Access)`);
  console.log(`Limits: Unlimited emails, revisions, and batch size`);
  console.log("--------------------------------------------------");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
