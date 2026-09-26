import { Request, Response } from "express";
import UserModel from "../models/User.model.js";
import bcrypt from "bcryptjs";
import { client } from "../config/google-client.js";
import { generateAccessAndRefreshTokens } from "../utils/token.js";
import { getCookieOptions } from "../utils/cookie.js";

const verifyGoogleToken = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string | undefined;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
      });
    }

    const email = payload.email.trim().toLowerCase();

    let user = await UserModel.findOne({ email });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      user = await UserModel.create({
        username: payload.name || email.split("@")[0],
        email,
        password: hashedPassword,
        authProvider: "google"
      });
    }
    
    const { accessToken } = await generateAccessAndRefreshTokens(user?._id);

    const options = getCookieOptions();

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .json({
        success: true,
        token: accessToken,
        data: { user }
      });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to authenticate with Google"
    });
  }
};

export { verifyGoogleToken };
