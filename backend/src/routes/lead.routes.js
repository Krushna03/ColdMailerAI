import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import {
  createLead,
  bulkCreateLeads,
  getUserLeads,
  getLeadById,
  updateLead,
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  deleteLead,
  bulkDeleteLeads,
  getWorkspaceTags,
  bulkTagLeads,
  createImportJob,
  getImportJobStatus,
  listImportJobs,
  verifyLeadEmail
} from "../controllers/lead.controller.js";
import {
  getLeadCategories,
  createLeadCategory,
  deleteLeadCategory
} from "../controllers/leadCategory.controller.js";

const router = express.Router();

router.use(verifyJWT, workspaceMiddleware, idempotencyMiddleware);

router.route("/create").post(createLead);

router.route("/bulk-create").post(bulkCreateLeads);

router.route("/import-job").post(createImportJob);

router.route("/import-jobs").get(listImportJobs);

router.route("/import-jobs/:jobId").get(getImportJobStatus);

router.route("/get-user-leads").get(getUserLeads);

router.route("/delete-lead").delete(deleteLead);

router.route("/bulk-delete").delete(bulkDeleteLeads);

router.route("/tags").get(getWorkspaceTags);

router.route("/bulk-tag").post(bulkTagLeads);

router.route("/categories").get(getLeadCategories).post(createLeadCategory);

router.route("/categories/:categoryId").delete(deleteLeadCategory);

router.route("/:leadId/verify-email").post(verifyLeadEmail);

router.route("/:leadId/follow-ups/:followUpId").patch(updateFollowUp).delete(deleteFollowUp);

router.route("/:leadId/follow-ups").post(addFollowUp);

router.route("/:leadId").get(getLeadById).patch(updateLead);

export default router;
