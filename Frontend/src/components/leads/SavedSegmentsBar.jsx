import { useState } from "react";
import { Plus, Filter, X, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useSegments, useDeleteSegment } from "../../hooks/useSegments";
import CreateSegmentDialog from "./CreateSegmentDialog";
import { useToast } from "@/hooks/use-toast";

const COLOR_CHIP_MAP = {
  purple: "bg-purple-400",
  brand: "bg-brand-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

export default function SavedSegmentsBar({
  activeSegmentId,
  onSelectSegment,
  totalLeadsCount = 0,
}) {
  const { toast } = useToast();
  const { data: segments = [], isLoading } = useSegments();
  const deleteSegment = useDeleteSegment();
  const [createOpen, setCreateOpen] = useState(false);

  const handleDelete = async (e, segment) => {
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
    } catch (err) {
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
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 shrink-0 mr-1 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-brand-300" />
            Segments:
          </span>

          {/* All Leads Pill */}
          <button
            type="button"
            onClick={() => onSelectSegment(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border ${
              !activeSegmentId
                ? "bg-white/10 border-brand text-white shadow-sm ring-1 ring-brand/50"
                : "bg-surface-900 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            <span>All Leads</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono text-gray-300">
              {totalLeadsCount}
            </span>
          </button>

          {/* Saved Segments */}
          {segments.map((segment) => {
            const isActive = activeSegmentId === segment._id;
            const dotColor = COLOR_CHIP_MAP[segment.color] || COLOR_CHIP_MAP.purple;

            return (
              <button
                key={segment._id}
                type="button"
                onClick={() => onSelectSegment(isActive ? null : segment._id)}
                className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? "bg-brand/15 border-brand text-white ring-1 ring-brand/50 shadow-sm"
                    : "bg-surface-900 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                <span className="max-w-[150px] truncate">{segment.name}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono text-gray-300">
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
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
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
          className="shrink-0 h-8 border-dashed border-white/20 bg-surface-900/60 hover:text-brand-300 hover:bg-brand/10 hover:border-brand/40 text-xs text-brand-200 gap-1.5"
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
