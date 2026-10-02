import React from "react";
import { CheckCircle2, Clock, AlertCircle, SkipForward, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { SequenceEnrollment } from "../../types/sequence";

interface StepHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: SequenceEnrollment | null;
}

export default function StepHistoryDialog({
  open,
  onOpenChange,
  enrollment,
}: StepHistoryDialogProps) {
  if (!enrollment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-surface-950 border border-white/10 text-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand" />
            <span>Cadence Timeline: {enrollment.leadSnapshot?.name || "Lead"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            {enrollment.leadSnapshot?.email} • {enrollment.leadSnapshot?.company} • Status:{" "}
            <span className="font-semibold text-white uppercase">{enrollment.status}</span>
            {enrollment.stopReason && (
              <span className="text-amber-400 ml-1">({enrollment.stopReason})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scroll py-3 space-y-4 pr-1">
          {enrollment.stepHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No steps executed yet.</p>
              {enrollment.nextRunAt && (
                <p className="mt-1 text-gray-400">
                  Next step scheduled for: {new Date(enrollment.nextRunAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="relative border-l border-white/10 ml-3.5 space-y-6">
              {enrollment.stepHistory.map((log, index) => {
                const isSuccess = log.status === "success";
                const isSkipped = log.status === "skipped";

                return (
                  <div key={index} className="relative pl-6">
                    {/* Circle icon */}
                    <span
                      className={`absolute -left-3 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs border ${
                        isSuccess
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : isSkipped
                          ? "bg-gray-500/20 border-gray-500/50 text-gray-400"
                          : "bg-red-500/20 border-red-500/50 text-red-400"
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : isSkipped ? (
                        <SkipForward className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                    </span>

                    <div className="rounded-lg bg-surface-900/60 p-3 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                          Step #{log.stepOrder}: {log.type}
                        </span>
                        <span className="text-gray-400 text-[10px]">
                          {new Date(log.executedAt).toLocaleString()}
                        </span>
                      </div>

                      {log.subject && (
                        <p className="text-xs text-gray-300 font-medium">
                          Subject: {log.subject}
                        </p>
                      )}

                      {log.error && (
                        <p className="text-xs text-red-400 bg-red-500/10 p-1.5 rounded">
                          Error: {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-white/5 text-gray-300 hover:text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
