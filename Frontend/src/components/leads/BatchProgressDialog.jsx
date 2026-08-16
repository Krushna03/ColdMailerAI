import { useEffect } from "react";
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

export default function BatchProgressDialog({
  activeJobId,
  onComplete,
  onClose,
  fallbackReadyCount = 0,
}) {
  const { data: job } = useBatchJobStatus(activeJobId);

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

  // Auto-close when completed successfully after 2 seconds
  useEffect(() => {
    if (isFinished && job) {
      const timer = setTimeout(() => {
        onComplete(job);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isFinished, job, onComplete]);

  return (
    <Dialog open={!!activeJobId} onOpenChange={(val) => {
      if (isFinished && !val) {
        onClose();
      }
    }}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {descText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Progress Bar & Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-gray-300">
                {processed} of {total} completed
              </span>
              <span className="text-brand font-semibold">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isFinished && hasErrors
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-brand to-brand-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-center">
              <div className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider">Successful</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">{successCount}</div>
            </div>
            <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-center">
              <div className="text-xs font-medium text-red-400/80 uppercase tracking-wider">Failed</div>
              <div className="mt-1 text-2xl font-bold text-red-400">{failureCount}</div>
            </div>
          </div>

          {/* Results Live Log */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generation Log</h4>
            <div className="max-h-[220px] min-h-[120px] overflow-y-auto rounded-xl border border-white/5 bg-surface-950 p-4 space-y-2 text-xs font-mono scrollbar-thin">
              {job?.results?.length === 0 && (
                <div className="text-gray-500 animate-pulse">Initializing batch generation job...</div>
              )}
              {job?.results?.map((res, idx) => (
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
            <Button
              type="button"
              onClick={() => onComplete(job)}
              className="w-full bg-brand text-white hover:bg-brand-400 rounded-xl py-6 font-semibold"
            >
              View Generated Emails
            </Button>
          ) : (
            <div className="w-full text-center text-xs text-gray-500 py-2">
              Do not close this window. Processing batch queue...
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
