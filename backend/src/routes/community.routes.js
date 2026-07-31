import express from "express";
import { getCommunityTemplates } from "../controllers/community.controller.js";

const router = express.Router();

router.route("/templates").get(getCommunityTemplates);

export default router;
