import {
  LeadCategory,
  DEFAULT_LEAD_CATEGORIES,
  ILeadCategory,
} from "../models/LeadCategory.model.js";
import { Lead } from "../models/Lead.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const slugify = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const ensureDefaultCategories = async (): Promise<void> => {
  for (const category of DEFAULT_LEAD_CATEGORIES) {
    await LeadCategory.updateOne(
      { slug: category.slug, isDefault: true, userId: null },
      {
        $setOnInsert: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          isDefault: true,
          userId: null,
        },
      },
      { upsert: true }
    );
  }
};

export const listCategoriesForUser = async (
  userId: any
): Promise<ILeadCategory[]> => {
  await ensureDefaultCategories();

  const categories = await LeadCategory.find({
    $or: [{ isDefault: true, userId: null }, { userId }],
  })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  return categories as unknown as ILeadCategory[];
};

export const assertCategoryAccessible = async ({
  categoryId,
  userId,
}: {
  categoryId: any;
  userId: any;
}): Promise<ILeadCategory> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const category = await LeadCategory.findOne({
    _id: categoryId,
    $or: [{ isDefault: true, userId: null }, { userId }],
  }).lean();

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category as unknown as ILeadCategory;
};

export const createCustomCategory = async ({
  userId,
  name,
  description = "",
}: {
  userId: any;
  name: string;
  description?: string;
}): Promise<any> => {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new ApiError(400, "Category name is required");
  }

  const baseSlug = slugify(trimmedName) || "custom";
  let slug = baseSlug;
  let attempt = 1;

  while (
    await LeadCategory.exists({
      slug,
      $or: [{ userId }, { isDefault: true, userId: null }],
    })
  ) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  try {
    const category = await LeadCategory.create({
      name: trimmedName,
      slug,
      description: String(description || "").trim(),
      isDefault: false,
      userId,
    });
    return category;
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ApiError(409, "You already have a category with this name");
    }
    throw error;
  }
};

export const deleteCustomCategory = async ({
  categoryId,
  userId,
}: {
  categoryId: any;
  userId: any;
}) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(400, "Invalid category ID");
  }

  const category = await LeadCategory.findOne({
    _id: categoryId,
    userId,
    isDefault: false,
  });

  if (!category) {
    throw new ApiError(404, "Custom category not found");
  }

  const inUse = await Lead.countDocuments({ userId, categoryId });
  if (inUse > 0) {
    throw new ApiError(
      409,
      `Cannot delete this category while ${inUse} lead(s) still use it. Move or delete those leads first.`
    );
  }

  await category.deleteOne();
  return { success: true };
};
