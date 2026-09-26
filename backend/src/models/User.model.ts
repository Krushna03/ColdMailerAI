import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { IUser, IUserMethods } from "../types/express.js";

export type UserModelType = Model<IUser, {}, IUserMethods>;

const UserSchema = new Schema<IUser, UserModelType, IUserMethods>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please use valid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    authProvider: {
      type: String,
      enum: ["google", "email"],
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    isPaidUser: {
      type: Boolean,
      default: false,
    },

    planId: {
      type: String,
      default: "GETSTARTED",
    },

    planName: {
      type: String,
      default: "Free",
    },

    planActivatedAt: {
      type: Date,
      default: null,
    },

    planExpiresAt: {
      type: Date,
      default: null,
    },

    paymentInfo: {
      razorpay_order_id: String,
      razorpay_payment_id: String,
      razorpay_signature: String,
      paymentDate: Date,
    },

    activeWorkspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (this: any, next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (this: any, password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function (this: any): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || "1d") as any,
    }
  );
};

UserSchema.methods.generateRefreshToken = function (this: any): string {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRY || "10d") as any,
    }
  );
};

const UserModel = (mongoose.models.User as UserModelType) || mongoose.model<IUser, UserModelType>("User", UserSchema);

export default UserModel;
