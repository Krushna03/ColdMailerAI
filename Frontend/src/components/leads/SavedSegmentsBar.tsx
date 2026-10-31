import React, { useState } from "react";
import { Plus, Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { useSegments, useDeleteSegment } from "../../hooks/useSegments";
import CreateSegmentDialog from "./CreateSegmentDialog";
import { useToast } from "@/hooks/use-toast";

interface SavedSegmentsBarProps {
  activeSegmentId?: string | null;
  onSelectSegment: (id: string | null) => void;
  totalLeadsCount?: number;
}

export default function SavedSegmentsBar({
  activeSegmentId,
  onSelectSegment,
  totalLeadsCount = 0,
}: SavedSegmentsBarProps) {
  const { toast } = useToast();
  const { data: segments = [] } = useSegments();
  const deleteSegment = useDeleteSegment();
  const [createOpen, setCreateOpen] = useState(false);

  const handleDelete = async (e: React.SyntheticEvent, segment: any) => {
    e.stopPropagation();
    try {
      await deleteSegment.mutateAsync(segment._id);
      if (activeSegmentId === segment._id) {
        onSelectSegment(null);
      }
      toast({
        title: "Segment deleted",
        description: `"${segment.name}" has been removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Could not delete segment",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap">
          <span className="text-[12px] font-semibold text-gray-400 flex items-center gap-1.5 shrink-0 mr-1 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-brand-300" />
            Segments:
          </span>

          {/* All Leads Pill */}
          <button
            type="button"
            onClick={() => onSelectSegment(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 border ${
              !activeSegmentId
                ? "bg-white/10 border-brand text-white shadow-sm ring-1 ring-brand/50"
                : "bg-surface-900 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            <span>All Leads</span>
            <span className="px-1 py-0.2- rounded-full bg-white/10 text-[10px] font-mono text-gray-300">
              {totalLeadsCount}
            </span>
          </button>

          {/* Saved Segments */}
          {segments.map((segment: any) => {
            const isActive = activeSegmentId === segment._id;

            return (
              <button
                key={segment._id}
                type="button"
                onClick={() => onSelectSegment(isActive ? null : segment._id)}
                className={`group inline-flex items-center px-3 pr-1.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? "bg-brand/10 border-brand text-white ring-1 ring-brand/50 shadow-sm"
                    : "bg-surface-900 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="max-w-[150px] truncate mr-1">{segment.name}</span>
                <span className="mr-0.5 px-1.5 py-0.1 rounded-full bg-white/10 text-[10px] font-mono text-gray-300">
                  {segment.leadCount ?? 0}
                </span>

                {/* Delete button on hover/active */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(e, segment)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDelete(e, segment);
                    }
                  }}
                  className="hover:text-red-400 transition-opacity p-0.5"
                  title="Delete segment"
                  aria-label="Delete segment"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>

        {/* New Segment Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 h-7 border-dashed border-white/20 bg-surface-900/60 hover:text-brand-100 hover:bg-brand/10 hover:border-brand/40 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Segment</span>
        </Button>
      </div>

      <CreateSegmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSegmentCreated={(newId) => onSelectSegment(newId)}
      />
    </>
  );
}
