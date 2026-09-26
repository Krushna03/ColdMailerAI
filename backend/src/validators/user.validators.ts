import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const normalizedEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.string().email("Invalid email format")
);

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be atleast 3 characters")
    .max(30, "Username must not exceed 30 characters"),

  email: normalizedEmailSchema,

  password: z.string().min(5, "Password must be at least 5 characters long"),
});

export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(5, "Password must be at least 5 characters long"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Zod exposes validation problems on `issues`
const firstIssueMessage = (err: any, fallback = "Invalid input") =>
  (err?.issues ?? err?.errors ?? [])[0]?.message ?? fallback;

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = registerSchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: firstIssueMessage(err),
    });
  }
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = loginSchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: firstIssueMessage(err),
    });
  }
};
