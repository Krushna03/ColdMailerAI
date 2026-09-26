import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Invalid file type. Only PNG, JPG, JPEG, and WebP images are allowed.") as any, false);
  }
};

const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).array("image", 2);

export const handleMulterError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 10MB limit",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

export const convertImageToBase64 = (files: any) => {
  if (!files) return null;
  const fileArray = Array.isArray(files) ? files : [files];
  const results = fileArray
    .filter(Boolean)
    .map((file: any) => {
      if (!file || !file.buffer) return null;
      return {
        mimeType: file.mimetype,
        data: file.buffer.toString("base64"),
      };
    })
    .filter(Boolean);
  return results.length === 0 ? null : (Array.isArray(files) ? results : results[0]);
};
