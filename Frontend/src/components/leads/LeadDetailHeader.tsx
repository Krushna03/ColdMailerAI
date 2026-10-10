import { Link } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Mail, Send, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import {
  statusBadgeClass,
  statusLabel,
  getLeadCompanyName,
  getLeadJobTitle,
} from "./leadUtils";

interface LeadDetailHeaderProps {
  lead: {
    name?: string;
    status?: string;
    company?: any;
    jobTitle?: string;
    role?: string;
    email?: string;
    [key: string]: any;
  };
  onAddFollowUp?: () => void;
  onGenerate?: () => void;
  onOpenContextualAI?: () => void;
  onMarkLatestSent?: () => void;
  isGenerating?: boolean;
  isMarkingSent?: boolean;
  canMarkLatestSent?: boolean;
}

export default function LeadDetailHeader({
  lead,
  onAddFollowUp,
  onGenerate,
  onOpenContextualAI,
  onMarkLatestSent,
  isGenerating,
  isMarkingSent,
  canMarkLatestSent,
}: LeadDetailHeaderProps) {
  const companyName = getLeadCompanyName(lead?.company);
  const jobTitle = getLeadJobTitle(lead);

  return (
    <>
      <div className="-mb-4">
        <Link
          to="/dashboard/leads"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>
      </div>

      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 border-b border-white/10 bg-surface-950/95 backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-xl font-semibold text-white sm:text-[22px]">
                {lead.name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                  lead.status
                )}`}
              >
                {statusLabel(lead.status)}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-gray-400">
              {[jobTitle, companyName].filter(Boolean).join(" · ") || "No company/role yet"}
              {lead.email ? ` · ${lead.email}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onAddFollowUp}
              className="border border-white/15 bg-surface-900 text-white hover:bg-white/5 hover:text-gray-100 text-xs sm:text-[12px] px-3 h-8 rounded-md"
            >
              <CalendarPlus className="h-3 w-3" />
              Add follow-up
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canMarkLatestSent || isMarkingSent}
              onClick={onMarkLatestSent}
              className="border border-white/15 bg-surface-900 text-white hover:bg-white/5 disabled:opacity-40 hover:text-gray-100 text-xs sm:text-[12.5px] px-3 h-8 rounded-md"
            >
              <Send className="h-3.5 w-3.5" />
              {isMarkingSent ? "Marking..." : "Mark latest sent"}
            </Button>
            {onOpenContextualAI && (
              <Button
                type="button"
                onClick={onOpenContextualAI}
                className="bg-brand text-white hover:bg-brand-400 text-xs sm:text-[12.5px] px-3 h-8 rounded-md font-semibold shadow-none flex items-center"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Intelligence
              </Button>
            )}
            <Button
              type="button"
              disabled={isGenerating}
              onClick={onGenerate}
              className="bg-brand text-white hover:bg-brand-400 text-xs sm:text-[12.5px] px-3 h-8 rounded-md font-semibold shadow-none"
            >
              <Mail className="h-3.5 w-3.5" />
              {isGenerating ? "Generating..." : "Generate email"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
