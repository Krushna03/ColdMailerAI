import mongoose, { Schema } from "mongoose";

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"];

const WorkspaceMemberSchema = new Schema(
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

const WorkspaceSchema = new Schema(
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
WorkspaceSchema.methods.getUserRole = function (userId) {
  if (!userId) return null;

  const uid = String(userId);

  if (String(this.ownerId) === uid) return "owner";

  const member = this.members.find((m) => String(m.userId) === uid);

  return member ? member.role : null;
};

export const Workspace = mongoose.model("Workspace", WorkspaceSchema);
