export interface UserPaymentInfo {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  paymentDate?: string | Date;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  authProvider?: "google" | "email" | null;
  isPaidUser?: boolean;
  planId?: string;
  planName?: string;
  planActivatedAt?: string | Date | null;
  planExpiresAt?: string | Date | null;
  paymentInfo?: UserPaymentInfo;
  activeWorkspaceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSuccessData {
  user: User;
  accessToken: string;
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data?: AuthSuccessData;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password?: string;
}
