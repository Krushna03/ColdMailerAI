import React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useBatchJobStatus } from "../../hooks/useLeads";

interface BatchProgressDialogProps {
  activeJobId: string | null;
  open?: boolean;
  onComplete: (job: any) => void;
  onClose: () => void;
  onDelete?: () => void;
  fallbackReadyCount?: number;
}

export default function BatchProgressDialog({
  activeJobId,
  open = true,
  onComplete,
  onClose,
  onDelete,
  fallbackReadyCount = 0,
}: BatchProgressDialogProps) {
  const { data: job } = useBatchJobStatus(activeJobId || undefined);

  const total = job?.totalLeads || fallbackReadyCount || 0;
  const processed = job?.processedLeads || 0;
  const successCount = job?.successCount || 0;
  const failureCount = job?.failureCount || 0;
  const status = job?.status || "pending";
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isFinished = ["completed", "completed_with_errors", "failed", "cancelled"].includes(status);
  const hasErrors = status === "completed_with_errors" || status === "failed";

  const titleText = !isFinished
    ? "Generating outreach emails..."
    : hasErrors
      ? "Generation Completed with Errors"
      : "Generation Complete";

  const descText = !isFinished
    ? "Gemini is crafting tailored messages for your selected leads."
    : hasErrors
      ? `${successCount} succeeded, ${failureCount} failed. You can view the successful drafts now.`
      : "You can now view the results and manage the drafted emails.";

  return (
    <Dialog
      open={open && !!activeJobId}
      onOpenChange={(val) => {
        if (!val) {
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden border-white/10 bg-surface-900 p-0 text-white sm:rounded-xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold text-white">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {descText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Progress Bar & Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-gray-300">
                {processed} of {total} completed
              </span>
              <span className="text-brand font-semibold">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isFinished && hasErrors
                    ? "bg-amber-500"
                    : "bg-brand"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center">
              <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Successful</div>
              <div className="mt-1 text-xl font-semibold text-emerald-400">{successCount}</div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-center">
              <div className="text-xs font-medium text-red-400 uppercase tracking-wider">Failed</div>
              <div className="mt-1 text-xl font-semibold text-red-400">{failureCount}</div>
            </div>
          </div>

          {/* Results Live Log */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generation Log</h4>
            <div className="max-h-[220px] min-h-[120px] overflow-y-auto rounded-xl border border-white/5 bg-surface-950 p-4 space-y-2 text-xs font-mono scrollbar-thin">
              {job?.results?.length === 0 && (
                <div className="text-gray-500 animate-pulse">Initializing batch generation job...</div>
              )}
              {job?.results?.map((res: any, idx: number) => (
                <div key={res._id || idx} className="flex items-start gap-2 text-gray-300">
                  {res.success ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : (
                    <span className="text-red-400 font-bold">✕</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-white">{res.leadName || "Lead"}</span>
                    {res.leadCompany && <span className="text-gray-500"> ({res.leadCompany})</span>}
                    {res.success ? (
                      <span className="text-emerald-400/95 ml-1.5">- Email generated</span>
                    ) : (
                      <span className="text-red-400/90 ml-1.5 block leading-relaxed mt-0.5 font-sans">
                        Error: {res.error || "Generation failed"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 border-t border-white/10 px-6 py-4">
          {isFinished ? (
            <div className="flex w-full items-center justify-between gap-3">
              {onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDelete}
                  className="border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 hover:text-red-300 px-3 py-2 font-medium flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Job
                </Button>
              )}
              <Button
                type="button"
                onClick={() => onComplete(job)}
                className="flex-1 bg-brand text-white hover:bg-brand-400 rounded-xl py-2.5 font-semibold text-xs sm:text-sm"
              >
                View Generated Emails
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-gray-400 text-center sm:text-left">
                Emails are generating in background. You can cancel or close anytime.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDelete}
                    className="flex-1 sm:flex-initial border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 text-xs px-3 py-2 font-medium flex items-center justify-center gap-1.5"
                  >
                    Cancel & Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs px-4 py-2 font-medium"
                >
                  Run in Background
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
