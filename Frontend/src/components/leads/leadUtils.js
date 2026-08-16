export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

export const STATUS_TRANSITIONS = {
  new: ["contacted", "archived"],
  contacted: ["replied", "archived"],
  replied: ["meeting", "closed", "archived"],
  meeting: ["closed", "archived"],
  closed: ["archived"],
  archived: ["new"],
};

export const getAllowedNextStatuses = (currentStatus) => {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return LEAD_STATUS_OPTIONS.map((opt) => ({
    ...opt,
    disabled: opt.value !== currentStatus && !allowed.includes(opt.value),
  }));
};

export const statusLabel = (status) =>
  LEAD_STATUS_OPTIONS.find((s) => s.value === status)?.label || status || "New";

export const statusBadgeClass = (status) => {
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

export const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
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

export const isFollowUpOverdue = (dueAt, status = "pending") => {
  if (status !== "pending" || !dueAt) return false;
  return new Date(dueAt) < new Date();
};

export const emailPreview = (body, max = 140) => {
  if (!body) return "";
  const flat = String(body).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}…`;
};
