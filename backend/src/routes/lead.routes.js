import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
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
  bulkDeleteLeads
} from "../controllers/lead.controller.js";
import {
  getLeadCategories,
  createLeadCategory,
  deleteLeadCategory
} from "../controllers/leadCategory.controller.js";

const router = express.Router();

router.route("/create").post(verifyJWT, createLead);

router.route("/bulk-create").post(verifyJWT, bulkCreateLeads);

router.route("/get-user-leads").get(verifyJWT, getUserLeads);

router.route("/delete-lead").delete(verifyJWT, deleteLead);

router.route("/bulk-delete").delete(verifyJWT, bulkDeleteLeads);

router
  .route("/categories")
  .get(verifyJWT, getLeadCategories)
  .post(verifyJWT, createLeadCategory);

router.route("/categories/:categoryId").delete(verifyJWT, deleteLeadCategory);

router
  .route("/:leadId/follow-ups/:followUpId")
  .patch(verifyJWT, updateFollowUp)
  .delete(verifyJWT, deleteFollowUp);

router.route("/:leadId/follow-ups").post(verifyJWT, addFollowUp);

router.route("/:leadId").get(verifyJWT, getLeadById).patch(verifyJWT, updateLead);

export default router;
