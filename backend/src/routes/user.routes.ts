import express from "express";
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

router.route("/register").post(validateRegister, register);

router.route("/login").post(validateLogin, login);

router.route("/getCurrentUser").get(verifyJWT, currentUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/google/callback").get(verifyGoogleToken);

router.route("/get-user-count").get(getUserCount);

export default router;
