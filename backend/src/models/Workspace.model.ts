import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface IWorkspaceMember {
  userId: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface IWorkspaceSettings {
  timezone: string;
  customDomain: string;
  dailySendLimit: number;
}

export interface IWorkspace {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  members: IWorkspaceMember[];
  isDefault: boolean;
  settings: IWorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceMethods {
  getUserRole(userId: any): WorkspaceRole | null;
}

export type IWorkspaceDocument = Document<unknown, {}, IWorkspace> & IWorkspace & IWorkspaceMethods;

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace, Model<IWorkspace, {}, IWorkspaceMethods>, IWorkspaceMethods>(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      maxlength: 100
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    members: [WorkspaceMemberSchema],

    isDefault: {
      type: Boolean,
      default: false
    },

    settings: {
      timezone: {
        type: String,
        default: "UTC"
      },
      customDomain: {
        type: String,
        default: ""
      },
      dailySendLimit: {
        type: Number,
        default: 500
      }
    }
  },
  { timestamps: true }
);

WorkspaceSchema.index({ "members.userId": 1 });
WorkspaceSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
WorkspaceSchema.index({ ownerId: 1, isDefault: 1 });

// Check if a user has access to this workspace and return their role.
WorkspaceSchema.methods.getUserRole = function (this: IWorkspaceDocument, userId: any): WorkspaceRole | null {
  if (!userId) return null;

  const uid = String(userId);

  if (String(this.ownerId) === uid) return "owner";

  const member = this.members.find((m) => String(m.userId) === uid);

  return member ? member.role : null;
};

export const Workspace: Model<IWorkspace, {}, IWorkspaceMethods> = mongoose.model<IWorkspace, Model<IWorkspace, {}, IWorkspaceMethods>>("Workspace", WorkspaceSchema as any);
