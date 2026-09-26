import express from "express";
import { getHealth, getMetrics } from "../controllers/system.controller.js";

const router = express.Router();

router.get("/health", getHealth);

router.get("/metrics", getMetrics);

export default router;
