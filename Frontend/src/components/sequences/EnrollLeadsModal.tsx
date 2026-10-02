import React, { useState } from "react";
import { Users, Filter, Check, Mail, Search, Layers, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../utils";
import { useMailboxes } from "../../hooks/useMailboxes";
import { useEnrollLeadsInSequence, useSequenceEnrollments } from "../../hooks/useSequences";
import { SequenceEnrollment } from "../../types/sequence";

interface EnrollLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequenceId: string;
  sequenceName: string;
  defaultMailboxId?: string | null;
  existingEnrollments?: SequenceEnrollment[];
  enrolledLeadIds?: string[];
}

export default function EnrollLeadsModal({
  open,
  onOpenChange,
  sequenceId,
  sequenceName,
  defaultMailboxId,
  existingEnrollments,
  enrolledLeadIds,
}: EnrollLeadsModalProps) {
  const [tab, setTab] = useState<"leads" | "segment">("leads");
  const [search, setSearch] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>(defaultMailboxId || "");

  const { data: mailboxes = [] } = useMailboxes();
  const enrollMutation = useEnrollLeadsInSequence();

  // Load existing enrollments for this sequence to exclude leads already enrolled
  const { data: sequenceEnrollmentsData } = useSequenceEnrollments(sequenceId, { limit: 1000 });

  const enrolledIdsSet = React.useMemo(() => {
    const set = new Set<string>();

    if (enrolledLeadIds) {
      enrolledLeadIds.forEach((id) => set.add(String(id)));
    }

    if (existingEnrollments) {
      existingEnrollments.forEach((enr) => {
        const id = typeof enr.leadId === "object" && enr.leadId ? enr.leadId._id : enr.leadId;
        if (id) set.add(String(id));
      });
    }

    if (sequenceEnrollmentsData?.enrollments) {
      sequenceEnrollmentsData.enrollments.forEach((enr) => {
        const id = typeof enr.leadId === "object" && enr.leadId ? enr.leadId._id : enr.leadId;
        if (id) set.add(String(id));
      });
    }

    return set;
  }, [enrolledLeadIds, existingEnrollments, sequenceEnrollmentsData?.enrollments]);

  // Load leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["workspace-leads-enrollment", search],
    queryFn: async () => {
      const res = await api.get("/api/v1/lead/get-user-leads", {
        params: { search: search.trim() || undefined, limit: 50 },
      });
      return res.data?.leads || [];
    },
    enabled: open && tab === "leads",
  });

  // Load segments
  const { data: segments = [], isLoading: segmentsLoading } = useQuery({
    queryKey: ["workspace-segments-enrollment"],
    queryFn: async () => {
      const res = await api.get("/api/v1/segments");
      return res.data?.data?.segments || [];
    },
    enabled: open && tab === "segment",
  });

  const rawLeads = leadsData || [];
  
  // Exclude leads that are already enrolled in this sequence
  const leads = React.useMemo(() => {
    return rawLeads.filter((lead: any) => !enrolledIdsSet.has(String(lead._id)));
  }, [rawLeads, enrolledIdsSet]);

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l: any) => l._id));
    }
  };

  const handleEnroll = async () => {
    if (tab === "leads" && selectedLeadIds.length === 0) return;
    if (tab === "segment" && !selectedSegmentId) return;

    await enrollMutation.mutateAsync({
      sequenceId,
      leadIds: tab === "leads" ? selectedLeadIds : undefined,
      segmentId: tab === "segment" ? selectedSegmentId : undefined,
      mailboxId: selectedMailboxId || null,
    });

    onOpenChange(false);
    setSelectedLeadIds([]);
    setSelectedSegmentId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-950 border border-white/10 text-white max-h-[85vh] flex flex-col pb-4 pt-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>Enroll Leads into "{sequenceName}"</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Select specific leads or enroll automatically from a dynamic saved segment.
          </DialogDescription>
        </DialogHeader>

        {/* Sender Mailbox Selection */}
        <div className="rounded-lg bg-surface-900/60 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 pl-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-300">Sending Mailbox:</span>
          </div>
          <Select
            value={selectedMailboxId || "auto"}
            onValueChange={(val) => setSelectedMailboxId(val === "auto" ? "" : val)}
          >
            <SelectTrigger className="bg-surface-950 border-white/10 text-xs text-white h-8 max-w-[260px] rounded-md focus:ring-brand">
              <SelectValue placeholder="Sequence Default / Auto Mailbox" />
            </SelectTrigger>
            <SelectContent className="bg-surface-950 border-white/15 text-white">
              <SelectItem value="auto" className="text-xs">
                Sequence Default / Auto Mailbox
              </SelectItem>
              {mailboxes.map((mb) => (
                <SelectItem key={mb._id} value={mb._id} className="text-xs">
                  {mb.email} ({mb.provider.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tab switcher: Leads vs Saved Segment */}
        <div className="flex border-b border-white/10 mt-1">
          <button
            type="button"
            onClick={() => setTab("leads")}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              tab === "leads"
                ? "border-brand text-brand"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Select from Leads ({selectedLeadIds.length} selected)
          </button>
          <button
            type="button"
            onClick={() => setTab("segment")}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              tab === "segment"
                ? "border-brand text-brand"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Dynamic Saved Segment
          </button>
        </div>

        {/* Tab 1: Leads list */}
        {tab === "leads" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads by name, email, or company..."
                  className="pl-9 h-8 text-xs bg-surface-900 border-white/10 text-white"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={leads.length === 0}
                className="h-8 text-xs border-white/10 bg-white/5 text-gray-300 hover:bg-gray-800/40 hover:text-white"
              >
                {selectedLeadIds.length === leads.length && leads.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            {/* Available leads count info */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 mb-1.5">
              <span>
                {leads.length} lead{leads.length === 1 ? "" : "s"} available
                {enrolledIdsSet.size > 0 && (
                  <span className="text-gray-500 ml-1">
                    ({enrolledIdsSet.size} already enrolled)
                  </span>
                )}
              </span>
              {selectedLeadIds.length > 0 && (
                <span className="text-brand-300 font-medium">
                  {selectedLeadIds.length} selected
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll space-y-1 pr-1 border border-white/5 rounded-lg bg-surface-900/40 p-1 min-h-[265px]">
              {leadsLoading ? (
                <div className="flex items-center justify-center h-40 text-gray-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading workspace leads...
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center p-4">
                  {rawLeads.length > 0 ? (
                    <p>All matching leads are already enrolled in this sequence.</p>
                  ) : (
                    <p>No leads found matching your search.</p>
                  )}
                </div>
              ) : (
                leads.map((lead: any) => {
                  const isSelected = selectedLeadIds.includes(lead._id);
                  const companyName =
                    typeof lead.company === "object" && lead.company?.name
                      ? lead.company.name
                      : typeof lead.company === "string"
                      ? lead.company
                      : "Company";

                  return (
                    <div
                      key={lead._id}
                      onClick={() => handleToggleSelectLead(lead._id)}
                      className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition text-xs border ${
                        isSelected
                          ? "bg-brand/10 border-brand/40 text-white"
                          : "bg-surface-950/60 border-white/5 text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isSelected
                              ? "bg-brand border-brand text-white"
                              : "border-white/20 bg-surface-900"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-white mr-2">
                            {lead.name || "Unnamed Lead"}
                          </span>
                          <span className="text-gray-400 mr-2">({companyName})</span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            {lead.email}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full uppercase bg-white/5 border border-white/10 text-gray-400 shrink-0">
                        {lead.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Segment selection */}
        {tab === "segment" && (
          <div className="flex-1 overflow-y-auto custom-scroll space-y-2">
            <p className="text-xs text-gray-400 mb-2">
              Select a dynamic segment to automatically enroll all matching leads:
            </p>
            {segmentsLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading saved segments...
              </div>
            ) : segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center border border-dashed border-white/10 rounded-lg p-4">
                <Layers className="h-6 w-6 mb-2 text-gray-400" />
                <p>No saved segments found in this workspace.</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Create a saved segment from the Leads page to dynamically enroll leads by filters.
                </p>
              </div>
            ) : (
              segments.map((seg: any) => {
                const isSelected = selectedSegmentId === seg._id;
                return (
                  <div
                    key={seg._id}
                    onClick={() => setSelectedSegmentId(seg._id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? "bg-brand/10 border-brand text-white"
                        : "bg-surface-900 border-white/5 text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-white">{seg.name}</span>
                      <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded text-gray-400">
                        {seg.leadCount ?? 0} leads
                      </span>
                    </div>
                    {seg.description && (
                      <p className="text-xs text-gray-400">{seg.description}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-white/10 gap-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-white/5 text-gray-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              enrollMutation.isPending ||
              (tab === "leads" && selectedLeadIds.length === 0) ||
              (tab === "segment" && !selectedSegmentId)
            }
            onClick={handleEnroll}
            className="bg-brand text-white hover:bg-brand-400 font-semibold"
          >
            {enrollMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrolling...
              </span>
            ) : (
              <span>
                Enroll {tab === "leads" ? `${selectedLeadIds.length} Leads` : "Segment"}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
