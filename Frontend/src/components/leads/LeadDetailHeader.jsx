import { Link } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Mail, Send } from "lucide-react";
import { Button } from "../ui/button";
import { statusBadgeClass, statusLabel } from "./leadUtils";

export default function LeadDetailHeader({
  lead,
  onAddFollowUp,
  onGenerate,
  onMarkLatestSent,
  isGenerating,
  isMarkingSent,
  canMarkLatestSent,
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 space-y-4 border-b border-white/10 bg-surface-950/90 px-1 pb-4 pt-1 backdrop-blur-md">
      <Link
        to="/dashboard/leads"
        className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">
              {lead.name}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                lead.status
              )}`}
            >
              {statusLabel(lead.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {[lead.role, lead.company].filter(Boolean).join(" · ") || "No company/role yet"}
            {lead.email ? ` · ${lead.email}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onAddFollowUp}
            className="border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white"
          >
            <CalendarPlus className="h-4 w-4" />
            Add follow-up
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canMarkLatestSent || isMarkingSent}
            onClick={onMarkLatestSent}
            className="border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {isMarkingSent ? "Marking..." : "Mark latest sent"}
          </Button>
          <Button
            type="button"
            disabled={isGenerating}
            onClick={onGenerate}
            className="bg-brand text-white hover:bg-brand-400"
          >
            <Mail className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
