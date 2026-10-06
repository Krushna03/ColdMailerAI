import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Workflow, Plus, Play, Pause, Clock, CheckCircle2, ArrowRight } from "lucide-react";
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
  sequenceEnrollments?: any[];
}

export default function LeadSequencesCard({
  leadId,
  sequenceEnrollments = [],
}: LeadSequencesCardProps) {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const { data: sequencesData } = useSequences({ status: "active" });
  const enrollMutation = useEnrollLeadsInSequence();

  const activeSequences = sequencesData?.sequences || [];

  const handleEnroll = async () => {
    if (!selectedSequenceId) return;

    await enrollMutation.mutateAsync({
      sequenceId: selectedSequenceId,
      leadIds: [leadId],
    });

    setSelectedSequenceId("");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-surface-900/90 p-5 shadow-lg backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-white">Automated Cadence Sequences</h3>
            <p className="text-xs text-gray-400">
              Active multi-step follow-up and engagement pipelines for this lead.
            </p>
          </div>
        </div>

        {/* Quick enroll in sequence */}
        {activeSequences.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedSequenceId}
              onValueChange={setSelectedSequenceId}
            >
              <SelectTrigger className="bg-surface-950 border-white/10 text-xs text-white h-8 w-[200px] rounded-md focus:ring-brand">
                <SelectValue placeholder="Enroll in sequence..." />
              </SelectTrigger>
              <SelectContent className="bg-surface-950 border-white/15 text-white max-h-56">
                {activeSequences.map((seq) => (
                  <SelectItem key={seq._id} value={seq._id} className="text-xs">
                    {seq.name} ({seq.stepsCount} steps)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!selectedSequenceId || enrollMutation.isPending}
              onClick={handleEnroll}
              className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold h-8"
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
            </Button>
          </div>
        )}
      </div>

      {sequenceEnrollments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/5 bg-surface-950/40 p-4 text-center text-xs text-gray-400">
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
                className="flex items-center justify-between p-3 rounded-lg bg-surface-950 border border-white/5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/sequences/${seqId}`}
                      className="font-bold text-white hover:text-brand transition flex items-center gap-1"
                    >
                      {seqName}
                      <ArrowRight className="h-3 w-3 opacity-60" />
                    </Link>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                        isReplied
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
                        <span className="flex items-center gap-1 text-amber-400">
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
                    className="h-7 text-[11px] border-white/10 bg-white/5 text-gray-100 hover:text-white hover:bg-transparent"
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
