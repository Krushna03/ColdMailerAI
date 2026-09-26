import { Request } from "express";
import { Document, Types } from "mongoose";

export interface IUserPaymentInfo {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  paymentDate?: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  authProvider?: "google" | "email" | null;
  refreshToken?: string | null;
  isPaidUser: boolean;
  planId: string;
  planName: string;
  planActivatedAt?: Date | null;
  planExpiresAt?: Date | null;
  paymentInfo?: IUserPaymentInfo;
  activeWorkspaceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export type IUserDocument = Document<unknown, {}, IUser> & IUser & IUserMethods;

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument | any;
      workspaceId?: string | Types.ObjectId;
      workspace?: any;
      workspaceRole?: string;
      requestId?: string;
      id?: string;
      rawBody?: string;
    }
  }
}
