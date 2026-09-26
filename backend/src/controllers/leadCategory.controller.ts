import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateUserAuth } from "../validators/email.validators.js";
import {
  listCategoriesForUser,
  createCustomCategory,
  deleteCustomCategory,
} from "../services/leadCategory.service.js";
import { z } from "zod";

const firstIssueMessage = (error: any, fallback = "Invalid input") =>
  (error?.issues ?? error?.errors ?? [])[0]?.message ?? fallback;

const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(80),
  description: z.string().trim().max(200).optional().default(""),
});


// GET /api/v1/lead/categories
// Defaults for everyone + custom categories for this user
const getLeadCategories = asyncHandler(async (req: Request, res: Response) => {
  if (!validateUserAuth(req.user, res)) return;

  const categories = await listCategoriesForUser(req.user!._id);

  return res.status(200).json({
    success: true,
    categories,
    message: "Categories fetched successfully",
  });
});

/**
 * POST /api/v1/lead/categories
 * Create a user-specific custom category
 */
const createLeadCategory = asyncHandler(async (req: Request, res: Response) => {
  if (!validateUserAuth(req.user, res)) return;

  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: firstIssueMessage(parsed.error),
    });
  }

  const category = await createCustomCategory({
    userId: req.user!._id,
    name: parsed.data.name,
    description: parsed.data.description,
  });

  return res.status(201).json({
    success: true,
    category,
    message: "Category created successfully",
  });
});

/**
 * DELETE /api/v1/lead/categories/:categoryId
 * Delete a custom category owned by this user
 */
const deleteLeadCategory = asyncHandler(async (req: Request, res: Response) => {
  if (!validateUserAuth(req.user, res)) return;

  await deleteCustomCategory({
    categoryId: req.params.categoryId,
    userId: req.user!._id,
  });

  return res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

export { getLeadCategories, createLeadCategory, deleteLeadCategory };
