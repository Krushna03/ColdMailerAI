import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import {
  createSequence,
  getSequence,
  listSequences,
  updateSequence,
  updateSequenceStatus,
  deleteSequence,
  saveSteps,
  enrollLeads,
  listEnrollments,
  updateEnrollmentStatus,
  processNow,
  listSendJobs,
  getSendJobStats,
  retrySendJob,
  listEmailEvents,
} from "../controllers/sequence.controller.js";

const router = express.Router();

router.use(verifyJWT, workspaceMiddleware, idempotencyMiddleware);

// Core listing and creation
router.route("/").get(listSequences).post(createSequence);

// Sending Engine endpoints (must precede /:id)
router.route("/send-jobs").get(listSendJobs);
router.route("/send-jobs/stats").get(getSendJobStats);
router.route("/send-jobs/:id/retry").post(retrySendJob);
router.route("/email-events").get(listEmailEvents);

// Manual trigger for testing/sync runs
router.route("/process-now").post(processNow);

// Individual sequence routes
router
  .route("/:id")
  .get(getSequence)
  .put(updateSequence)
  .delete(deleteSequence);

router.route("/:id/status").patch(updateSequenceStatus);

// Steps pipeline management
router.route("/:id/steps").put(saveSteps);

// Lead enrollment
router.route("/:id/enroll").post(enrollLeads);
router.route("/:id/enrollments").get(listEnrollments);
router.route("/:id/enrollments/:enrollmentId").patch(updateEnrollmentStatus);

export default router;
