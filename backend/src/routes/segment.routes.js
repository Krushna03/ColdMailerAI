import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { workspaceMiddleware } from "../middlewares/workspace.middleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import {
  createSegment,
  listSegments,
  getSegmentById,
  getSegmentLeads,
  previewSegment,
  updateSegment,
  deleteSegment
} from "../controllers/segment.controller.js";

const router = express.Router();

router.use(verifyJWT, workspaceMiddleware, idempotencyMiddleware);

router.route("/").get(listSegments).post(createSegment);

router.route("/preview").post(previewSegment);

router
  .route("/:segmentId")
  .get(getSegmentById)
  .patch(updateSegment)
  .delete(deleteSegment);

router.route("/:segmentId/leads").get(getSegmentLeads);

export default router;
