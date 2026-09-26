import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  handlePaymentFailure,
  getPaymentPlans
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validatePaymentData } from "../middlewares/payment.middleware.js";

const router = express.Router();

router.route("/plans").get(getPaymentPlans);

router.route("/create-order").post(verifyJWT, createOrder);

router.route("/verify-payment").post(verifyJWT, validatePaymentData, verifyPayment);

router.route("/history").get(verifyJWT, getPaymentHistory);

router.route("/failure").post(verifyJWT, handlePaymentFailure);

export default router;
