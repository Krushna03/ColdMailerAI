import React, { useState } from "react";
import { Workflow, Mail, CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useSequences, useEnrollLeadsInSequence } from "../../hooks/useSequences";
import { useMailboxes } from "../../hooks/useMailboxes";
import { useToast } from "../../hooks/use-toast";
import { Link } from "react-router-dom";

interface EnrollSelectedLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  leads: any[];
  onSuccess: () => void;
}

export default function EnrollSelectedLeadsModal({
  open,
  onOpenChange,
  selectedLeadIds,
  leads,
  onSuccess,
}: EnrollSelectedLeadsModalProps) {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("");
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>("auto");

  const { data: sequencesData, isLoading: sequencesLoading } = useSequences({
    status: "active",
  });
  const { data: mailboxesData, isLoading: mailboxesLoading } = useMailboxes();
  const enrollMutation = useEnrollLeadsInSequence();

  const activeSequences = sequencesData?.sequences || [];
  const mailboxes = mailboxesData || [];

  const selectedLeadsPreview = leads.filter((l) => selectedLeadIds.includes(l._id)).slice(0, 4);
  const remainingCount = Math.max(0, selectedLeadIds.length - 4);

  const handleEnroll = async () => {
    if (!selectedSequenceId) {
      toast({
        title: "Please choose a sequence",
        description: "Select an active sequence cadence to enroll your prospects.",
        variant: "destructive",
      });
      return;
    }

    try {
      const chosenMailbox = selectedMailboxId === "auto" ? undefined : selectedMailboxId;
      const res = await enrollMutation.mutateAsync({
        sequenceId: selectedSequenceId,
        leadIds: selectedLeadIds,
        mailboxId: chosenMailbox,
      });

      toast({
        title: "Leads Enrolled Successfully",
        description:
          res?.message ||
          `Enrolled ${res?.enrolledCount || selectedLeadIds.length} prospects into automated cadence.`,
      });

      onSuccess();
      onOpenChange(false);
      setSelectedSequenceId("");
      setSelectedMailboxId("auto");
    } catch (err: any) {
      toast({
        title: "Enrollment Failed",
        description: err.response?.data?.message || err.message || "Could not enroll leads.",
        variant: "destructive",
      });
    }
  };

  const selectedSequence = activeSequences.find((s) => s._id === selectedSequenceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface-900 border border-white/10 text-white p-0 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-white/10 px-6 py-4 bg-surface-800/40 text-left">
          <div className="flex items-center gap-2.5">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white">
                Enroll {selectedLeadIds.length} Prospects into Cadence
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-0.5">
                Targeted leads will automatically progress through multi-step outreach follow-ups.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Target Sequence Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Target Sequence Cadence *</span>
              {activeSequences.length === 0 && !sequencesLoading && (
                <Link
                  to="/dashboard/sequences"
                  onClick={() => onOpenChange(false)}
                  className="text-brand-400 hover:text-brand-300 text-[11px]"
                >
                  + Create a sequence
                </Link>
              )}
            </label>

            {sequencesLoading ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/10 bg-surface-950 text-xs text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading active sequences...</span>
              </div>
            ) : activeSequences.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
                You do not have any active sequences. Please go to Sequences and create or activate a sequence first.
              </div>
            ) : (
              <Select
                value={selectedSequenceId}
                onValueChange={setSelectedSequenceId}
              >
                <SelectTrigger className="bg-surface-950 border-white/10 text-xs text-white h-9 rounded-lg focus:ring-brand">
                  <SelectValue placeholder="Choose an active sequence..." />
                </SelectTrigger>
                <SelectContent className="bg-surface-950 border-white/15 text-white max-h-56">
                  {activeSequences.map((seq) => (
                    <SelectItem key={seq._id} value={seq._id} className="text-xs">
                      {seq.name} ({seq.stepsCount} steps · {seq.status.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedSequence && (
              <p className="text-[11px] text-gray-400">
                Cadence contains {selectedSequence.stepsCount} steps. Stop-on-reply and auto-meeting pauses are enabled.
              </p>
            )}
          </div>

          {/* Sending Mailbox Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Dispatch Mailbox</span>
              {mailboxes.length === 0 && !mailboxesLoading && (
                <Link
                  to="/dashboard/mailboxes"
                  onClick={() => onOpenChange(false)}
                  className="text-brand-400 hover:text-brand-300 text-[11px]"
                >
                  + Connect mailbox
                </Link>
              )}
            </label>

            <Select
              value={selectedMailboxId}
              onValueChange={setSelectedMailboxId}
            >
              <SelectTrigger className="bg-surface-950 border-white/10 text-xs text-white h-9 rounded-lg focus:ring-brand">
                <SelectValue placeholder="Sequence Default / Auto Mailbox" />
              </SelectTrigger>
              <SelectContent className="bg-surface-950 border-white/15 text-white max-h-56">
                <SelectItem value="auto" className="text-xs">
                  Sequence Default / Auto Mailbox
                </SelectItem>
                {mailboxes.map((mb) => (
                  <SelectItem key={mb._id} value={mb._id} className="text-xs">
                    {mb.email} ({mb.provider.toUpperCase()} · Health: {mb.health?.score ?? 100}/100)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leads Preview Banner */}
          <div className="rounded-xl border border-white/10 bg-surface-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Selected Prospects:</span>
              <span className="font-mono text-brand-400 font-bold">{selectedLeadIds.length} leads</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedLeadsPreview.map((lead) => {
                const comp = typeof lead.company === "object" ? lead.company?.name : lead.company;
                return (
                  <span
                    key={lead._id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300 truncate max-w-[200px]"
                  >
                    <span className="truncate">{lead.name || lead.email}</span>
                    {comp && <span className="text-gray-500 font-mono">({comp})</span>}
                  </span>
                );
              })}
              {remainingCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-brand/10 border border-brand/20 text-[11px] text-brand-300 font-semibold">
                  +{remainingCount} more
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 px-6 py-3.5 bg-surface-800/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleEnroll}
            disabled={!selectedSequenceId || enrollMutation.isPending || activeSequences.length === 0}
            className="bg-brand text-white hover:bg-brand-400 text-xs font-semibold h-9 px-4 shadow-lg shadow-brand/20"
          >
            {enrollMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling Prospects...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Enroll {selectedLeadIds.length} Leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
