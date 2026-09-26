import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserModel from "../models/User.model.js";
import { enforceSubscriptionFreshness } from "../utils/subscription.js";

interface JwtPayload {
  _id: string;
  email?: string;
  username?: string;
}

export const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized request",
      });
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as JwtPayload;

    const account = await UserModel.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const freshAccount = await enforceSubscriptionFreshness(account);

    req.user = freshAccount;

    next();
  } catch (error: any) {
    // JWT verification errors (expired, invalid, etc.)
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: error?.message || "Invalid or expired access token",
      });
    }

    // Other errors (database, etc.)
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};
