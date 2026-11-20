import express from "express";
import rateLimit from "express-rate-limit";
import {
  currentUser,
  getUserCount,
  login,
  logoutUser,
  register,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyGoogleToken } from "../controllers/google.auth.controller.js";
import {
  validateRegister,
  validateLogin,
} from "../validators/user.validators.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes.",
  },
});

router.route("/register").post(authLimiter, validateRegister, register);

router.route("/login").post(authLimiter, validateLogin, login);

router.route("/getCurrentUser").get(verifyJWT, currentUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/google/callback").get(verifyGoogleToken);

router.route("/get-user-count").get(getUserCount);

export default router;
