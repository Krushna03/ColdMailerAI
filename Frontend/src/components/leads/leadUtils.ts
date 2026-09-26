import { Lead, LeadCompany, LeadStatus, EmailVerificationStatus, FollowUpStatus, LeadCategory } from "../../types/lead";
export type { LeadCategory };

export interface StatusOption {
  value: LeadStatus;
  label: string;
  disabled?: boolean;
}

export const LEAD_STATUS_OPTIONS: StatusOption[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

export const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "archived"],
  contacted: ["replied", "archived"],
  replied: ["meeting", "closed", "archived"],
  meeting: ["closed", "archived"],
  closed: ["archived"],
  archived: ["new"],
};

export const getAllowedNextStatuses = (currentStatus: LeadStatus | string): StatusOption[] => {
  const allowed = STATUS_TRANSITIONS[currentStatus as LeadStatus] || [];
  return LEAD_STATUS_OPTIONS.map((opt) => ({
    ...opt,
    disabled: opt.value !== currentStatus && !allowed.includes(opt.value),
  }));
};

export const statusLabel = (status?: string | null): string =>
  LEAD_STATUS_OPTIONS.find((s) => s.value === status)?.label || status || "New";

export const statusBadgeClass = (status?: string | null): string => {
  switch (status) {
    case "contacted":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "replied":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "meeting":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "closed":
      return "bg-zinc-500/20 text-zinc-300 ring-zinc-500/30";
    case "archived":
      return "bg-zinc-700/40 text-zinc-400 ring-zinc-600/40";
    case "new":
    default:
      return "bg-brand/15 text-brand-200 ring-brand/30";
  }
};

export const formatShortDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const isFollowUpOverdue = (
  dueAt?: string | Date | null,
  status: FollowUpStatus | string = "pending"
): boolean => {
  if (status !== "pending" || !dueAt) return false;
  return new Date(dueAt) < new Date();
};

export const emailPreview = (body?: string | null, max = 140): string => {
  if (!body) return "";
  const flat = String(body).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…`;
};

export const getLeadCompanyName = (company?: LeadCompany | string | null): string => {
  if (!company) return "";
  if (typeof company === "object") return company.name || "";
  return String(company);
};

export const getLeadJobTitle = (lead?: Partial<Lead> | any): string => {
  if (!lead) return "";
  return lead.jobTitle || lead.role || "";
};

const TAG_COLOR_PALETTES = [
  "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
];

export const getTagBadgeClass = (tag = ""): string => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTES.length;
  return TAG_COLOR_PALETTES[index];
};

export interface VerificationOption {
  value: EmailVerificationStatus | "all";
  label: string;
}

export const EMAIL_VERIFICATION_STATUS_OPTIONS: VerificationOption[] = [
  { value: "all", label: "All Deliverability" },
  { value: "valid", label: "Valid" },
  { value: "risky", label: "Risky" },
  { value: "catch_all", label: "Catch-All" },
  { value: "disposable", label: "Disposable" },
  { value: "invalid", label: "Invalid" },
  { value: "unknown", label: "Unverified" },
];

export const verificationLabel = (status?: string | null): string => {
  switch (status) {
    case "valid":
      return "Valid";
    case "risky":
      return "Risky";
    case "catch_all":
      return "Catch-All";
    case "disposable":
      return "Disposable";
    case "invalid":
      return "Invalid";
    case "unknown":
    default:
      return "Unverified";
  }
};

export const verificationBadgeClass = (status?: string | null): string => {
  switch (status) {
    case "valid":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "risky":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "catch_all":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "disposable":
      return "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30";
    case "invalid":
      return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
    case "unknown":
    default:
      return "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30";
  }
};

export const verificationScoreColor = (score?: number | null): string => {
  if (score === null || score === undefined) return "text-zinc-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
};
