import mongoose, { Schema, Model, Types, Document } from "mongoose";

export interface DefaultCategory {
  name: string;
  slug: string;
  description: string;
}

export const DEFAULT_LEAD_CATEGORIES: DefaultCategory[] = [
  {
    name: "Job Outreach",
    slug: "job-outreach",
    description: "Roles, referrals, and opportunities for professionals",
  },
  {
    name: "Client Sales",
    slug: "client-sales",
    description: "Sell your product or services to B2B and B2C buyers",
  },
  {
    name: "Agency Partnerships",
    slug: "agency-partnerships",
    description: "Collaborate with agencies, freelancers, and partners",
  },
];

export interface ILeadCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  userId?: Types.ObjectId | null;
  workspaceId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ILeadCategoryDocument = Document<unknown, {}, ILeadCategory> &
  ILeadCategory;
export type LeadCategoryModelType = Model<ILeadCategory>;

const LeadCategorySchema = new Schema<ILeadCategory, LeadCategoryModelType>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: 80,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

LeadCategorySchema.index({ slug: 1, userId: 1 }, { unique: true });
LeadCategorySchema.index({ userId: 1, name: 1 });
LeadCategorySchema.index({ isDefault: 1 });
LeadCategorySchema.index({ workspaceId: 1, name: 1 });

export const LeadCategory =
  (mongoose.models.LeadCategory as LeadCategoryModelType) ||
  mongoose.model<ILeadCategory, LeadCategoryModelType>(
    "LeadCategory",
    LeadCategorySchema
  );
