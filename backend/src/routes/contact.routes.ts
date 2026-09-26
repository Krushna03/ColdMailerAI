import express from "express";
import { contact } from "../controllers/contact.controller.js";

const router = express.Router();

router.route("/new-contact").post(contact);

export default router;
