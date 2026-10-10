import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Workflow, Clock, ArrowRight } from "lucide-react";
import { useSequences, useEnrollLeadsInSequence } from "../../hooks/useSequences";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useToast } from "../../hooks/use-toast";

interface LeadSequencesCardProps {
  leadId: string;
  leadStatus?: string;
  sequenceEnrollments?: any[];
}

export default function LeadSequencesCard({
  leadId,
  leadStatus,
  sequenceEnrollments = [],
}: LeadSequencesCardProps) {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const { data: sequencesData } = useSequences({ limit: 100 });
  const enrollMutation = useEnrollLeadsInSequence();

  const allSequences = sequencesData?.sequences || [];

  // IDs of sequences this lead is already enrolled in
  const enrolledSequenceIds = new Set(
    sequenceEnrollments.map((enr: any) =>
      String(enr.sequenceId?._id || enr.sequenceId)
    )
  );

  // Sequences ready for enrollment (active and not yet enrolled)
  const availableActiveSequences = allSequences.filter(
    (seq) => seq.status === "active" && !enrolledSequenceIds.has(String(seq._id))
  );

  // Sequences that are unavailable (already enrolled, paused, or draft)
  const unavailableSequences = allSequences.filter(
    (seq) => seq.status !== "active" || enrolledSequenceIds.has(String(seq._id))
  );

  const handleEnroll = async () => {
    if (!selectedSequenceId) return;

    try {
      const res: any = await enrollMutation.mutateAsync({
        sequenceId: selectedSequenceId,
        leadIds: [leadId],
      });

      if (res?.skippedCount > 0 && res?.enrolledCount === 0) {
        toast({
          title: "Lead Skipped",
          description:
            "This lead was skipped because they are already enrolled or their status prevents automated outreach.",
          variant: "destructive",
        });
      }
      setSelectedSequenceId("");
    } catch {
      // Handled by mutation toast
    }
  };

  const isReplied = leadStatus === "replied";

  return (
    <div className="rounded-lg border border-white/10 bg-surface-900 p-4 sm:p-5 shadow-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-semibold text-white">Automated Cadence Sequences</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Active multi-step follow-up and engagement pipelines for this lead.
            </p>
          </div>
        </div>

        {/* Quick enroll in sequence */}
        {allSequences.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedSequenceId}
              onValueChange={setSelectedSequenceId}
              disabled={availableActiveSequences.length === 0}
            >
              <SelectTrigger className="bg-surface-950 border-white/15 text-xs text-white h-8 w-[230px] rounded-md focus:ring-brand disabled:opacity-60">
                <SelectValue
                  placeholder={
                    availableActiveSequences.length > 0
                      ? "Enroll in sequence..."
                      : enrolledSequenceIds.size > 0
                        ? "All active cadences enrolled"
                        : "No active cadences"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-surface-950 border-white/15 text-white max-h-56">
                {availableActiveSequences.map((seq) => (
                  <SelectItem key={seq._id} value={seq._id} className="text-xs">
                    {seq.name} ({seq.stepsCount} steps)
                  </SelectItem>
                ))}
                {unavailableSequences.map((seq) => {
                  const alreadyEnrolled = enrolledSequenceIds.has(String(seq._id));
                  const statusNote = alreadyEnrolled
                    ? "Already enrolled"
                    : seq.status === "paused"
                      ? "Paused"
                      : "Draft";

                  return (
                    <SelectItem
                      key={seq._id}
                      value={seq._id}
                      disabled
                      className="text-xs opacity-50 cursor-not-allowed text-gray-400"
                    >
                      {seq.name} — ({statusNote})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!selectedSequenceId || enrollMutation.isPending || availableActiveSequences.length === 0}
              onClick={handleEnroll}
              className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold h-8 px-3 rounded-md disabled:opacity-40"
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
            </Button>
          </div>
        )}
      </div>

      {isReplied && (
        <div className="rounded-md border border-purple-500/10 px-3 py-2 text-xs text-purple-300 w-fit">
          <strong>Notice:</strong> Prospect replied. Automated sequence emails are halted to protect sender reputation.
        </div>
      )}

      {sequenceEnrollments.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-950/60 p-4 text-center text-xs text-gray-400">
          This lead is not currently enrolled in any active sequence. Enroll them above to begin automated cadence follow-ups.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sequenceEnrollments.map((enr: any) => {
            const seqName = enr.sequenceId?.name || "Outreach Cadence";
            const seqId = enr.sequenceId?._id || enr.sequenceId;
            const isReplied = enr.stopReason === "replied";
            const isActive = enr.status === "active";

            return (
              <div
                key={enr._id}
                className="flex items-center justify-between p-3 rounded-md bg-surface-950 border border-white/5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/sequences/${seqId}`}
                      className="font-medium text-white hover:text-brand transition flex items-center gap-1"
                    >
                      {seqName}
                      <ArrowRight className="h-3 w-3 opacity-60" />
                    </Link>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${isReplied
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                          : isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                        }`}
                    >
                      {isReplied ? "STOPPED: REPLIED" : enr.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 flex items-center gap-2">
                    <span>Current Step: #{enr.currentStepOrder}</span>
                    {enr.nextRunAt && isActive && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-400 font-mono">
                          <Clock className="h-3 w-3" />
                          Next run: {new Date(enr.nextRunAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] border border-white/15 bg-surface-900 text-white hover:bg-white/5 rounded-md"
                  >
                    <Link to={`/dashboard/sequences/${seqId}`}>View Cadence</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
