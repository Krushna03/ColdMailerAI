import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useCreateSegment, usePreviewSegment, useWorkspaceTags } from "../../hooks/useSegments";
import { useToast } from "@/hooks/use-toast";
import { LEAD_STATUS_OPTIONS } from "./leadUtils";
import {
  Sparkles,
  Filter,
  Loader2,
  Check,
  Briefcase,
  Building2,
  Tag,
  Clock,
  Sliders,
  Users,
} from "lucide-react";

const COLOR_OPTIONS = [
  { value: "purple", name: "Purple", bg: "bg-purple-500", ring: "ring-purple-400", border: "border-purple-400/40" },
  { value: "brand", name: "Indigo", bg: "bg-brand-500", ring: "ring-brand-400", border: "border-brand-400/40" },
  { value: "emerald", name: "Emerald", bg: "bg-emerald-500", ring: "ring-emerald-400", border: "border-emerald-400/40" },
  { value: "sky", name: "Sky", bg: "bg-sky-500", ring: "ring-sky-400", border: "border-sky-400/40" },
  { value: "amber", name: "Amber", bg: "bg-amber-500", ring: "ring-amber-400", border: "border-amber-400/40" },
  { value: "rose", name: "Rose", bg: "bg-rose-500", ring: "ring-rose-400", border: "border-rose-400/40" },
];

const SUGGESTED_ROLES = ["CEO", "Founder", "CTO", "VP Sales", "Director"];
const SUGGESTED_INDUSTRIES = ["SaaS", "Fintech", "AI / ML", "Healthcare", "E-commerce"];
const QUICK_DAYS = [3, 7, 14, 30];

export default function CreateSegmentDialog({ open, onOpenChange, onSegmentCreated }) {
  const { toast } = useToast();
  const createSegment = useCreateSegment();
  const previewSegment = usePreviewSegment();
  const { data: workspaceTags = [] } = useWorkspaceTags();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jobTitles, setJobTitles] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState(["new"]);
  const [tags, setTags] = useState("");
  const [daysAgo, setDaysAgo] = useState("");
  const [color, setColor] = useState("purple");
  const [previewResult, setPreviewResult] = useState(null);

  const toggleStatus = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSelectAllStatuses = () => {
    if (selectedStatuses.length === LEAD_STATUS_OPTIONS.length) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(LEAD_STATUS_OPTIONS.map((o) => o.value));
    }
  };

  const appendSuggestion = (currentStr, setter, val) => {
    const items = currentStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.includes(val)) {
      setter([...items, val].join(", "));
    }
  };

  const buildFiltersPayload = () => {
    const filters = {};
    const titles = jobTitles.split(",").map((t) => t.trim()).filter(Boolean);
    if (titles.length > 0) filters.jobTitle = titles;

    const industries = industry.split(",").map((i) => i.trim()).filter(Boolean);
    if (industries.length > 0) filters.industry = industries;

    if (selectedStatuses.length > 0) filters.status = selectedStatuses;

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) filters.tags = tagList;

    if (daysAgo !== "" && !Number.isNaN(Number(daysAgo))) {
      filters.lastContactedDaysAgo = Number(daysAgo);
    }

    return filters;
  };

  const handlePreview = async () => {
    try {
      const filters = buildFiltersPayload();
      const res = await previewSegment.mutateAsync({ filters, limit: 5 });
      setPreviewResult(res);
    } catch (err) {
      toast({
        title: "Preview failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Auto-reset preview on filter change
  useEffect(() => {
    setPreviewResult(null);
  }, [jobTitles, industry, selectedStatuses, tags, daysAgo]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    try {
      const filters = buildFiltersPayload();
      const created = await createSegment.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        color,
        filters,
      });

      toast({
        title: "Segment created",
        description: `"${created.name}" is active and dynamically evaluating leads.`,
      });

      onSegmentCreated?.(created._id);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast({
        title: "Failed to create segment",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setJobTitles("");
    setIndustry("");
    setSelectedStatuses(["new"]);
    setTags("");
    setDaysAgo("");
    setColor("purple");
    setPreviewResult(null);
  };

  const availableSuggestedTags =
    workspaceTags.length > 0
      ? workspaceTags.slice(0, 6)
      : ["Enterprise", "Series B", "Decision Maker", "High Priority"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-surface-900 border border-white/15 text-white p-0 gap-0 shadow-2xl rounded-2xl overflow-hidden font-sans">
        {/* Header with glowing icon & gradient accent */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <div className="flex items-start gap-3.5">
            <div className="pr-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Create Dynamic Segment
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400 mt-1 leading-normal">
                Define rules to automatically group matching leads. Saved queries run dynamically in real time.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body with custom subtle scrollbar */}
        <form
          onSubmit={handleSave}
          className="max-h-[75vh] sm:max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5 text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {/* Segment Identity Row */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-8">
                <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                  Segment Name <span className="text-brand-400">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Uncontacted SaaS CEOs"
                  className="h-10 bg-surface-950/80 border-white/15 text-sm placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:border-brand-400"
                  required
                />
              </div>

              {/* Color Picker */}
              <div className="sm:col-span-4">
                <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-1.5 h-10 px-2.5 rounded-md border border-white/10 bg-surface-950/50">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`h-5 w-5 rounded-full ${c.bg} flex items-center justify-center transition-all ${
                        color === c.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-surface-900 scale-110 shadow-sm"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {color === c.value && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1">
                Description <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of who this audience targets..."
                className="bg-surface-950/80 border-white/15 text-sm md:text-[14px] text-gray-200 placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:border-brand-400 resize-none"
              />
            </div>
          </div>

          {/* Dynamic Criteria Card */}
          <div className="rounded-xl border border-white/10 bg-surface-950/60 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-brand-300">
                <Sliders className="h-3.5 w-3.5" />
                <span>Filter Criteria</span>
              </div>
              <span className="text-[11px] text-gray-400">All rules combined via dynamic query</span>
            </div>

            {/* Job Titles & Industry Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                    <span>Job Titles</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Comma-separated</span>
                </div>
                <Input
                  value={jobTitles}
                  onChange={(e) => setJobTitles(e.target.value)}
                  placeholder="e.g. CEO, Founder, VP Sales"
                  className="h-9 bg-surface-900 border-white/15 text-xs placeholder:text-gray-500 focus-visible:ring-brand-400/40 sm:text-sm md:text-[12px]"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {SUGGESTED_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => appendSuggestion(jobTitles, setJobTitles, role)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors"
                    >
                      + {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <span>Industry</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Comma-separated</span>
                </div>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. SaaS, Fintech, AI"
                  className="h-9 bg-surface-900 border-white/15 text-xs placeholder:text-gray-500 focus-visible:ring-brand-400/40 sm:text-sm md:text-[12px]"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {SUGGESTED_INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => appendSuggestion(industry, setIndustry, ind)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors"
                    >
                      + {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags & Inactivity Period Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-gray-400" />
                    <span>Required Tags</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Comma-separated</span>
                </div>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. Enterprise, Series B"
                  className="h-9 bg-surface-900 border-white/15 text-xs placeholder:text-gray-500 focus-visible:ring-brand-400/40 sm:text-sm md:text-[13px]"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {availableSuggestedTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => appendSuggestion(tags, setTags, t)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Inactivity Period</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Not contacted in</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={daysAgo}
                    onChange={(e) => setDaysAgo(e.target.value)}
                    placeholder="e.g. 7"
                    className="h-9 bg-surface-900 border-white/15 text-xs placeholder:text-gray-500 pr-12 focus-visible:ring-brand-400/40 sm:text-sm md:text-[12px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 pointer-events-none">
                    days
                  </span>
                </div>
                {/* Quick Days Selector */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-gray-500">Quick set:</span>
                  {QUICK_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysAgo(daysAgo === String(d) ? "" : String(d))}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                        daysAgo === String(d)
                          ? "bg-brand/20 border-brand text-brand-300 font-semibold"
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead Status Multi-select */}
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <span>Lead Statuses</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllStatuses}
                  className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                >
                  {selectedStatuses.length === LEAD_STATUS_OPTIONS.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {LEAD_STATUS_OPTIONS.map((opt) => {
                  const active = selectedStatuses.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleStatus(opt.value)}
                      className={`h-8 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                        active
                          ? "bg-brand/20 border-brand text-white shadow-sm ring-1 ring-brand/40"
                          : "bg-surface-900 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-brand-400 shrink-0" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Preview Banner */}
          {previewResult !== null && (
            <div className="rounded-xl border border-brand/30 bg-gradient-to-r from-brand/15 via-purple-500/10 to-transparent p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {previewResult.totalMatching}{" "}
                    {previewResult.totalMatching === 1 ? "lead matches" : "leads match"} this segment
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Query criteria tested against your live workspace leads.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-2 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Live Preview Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewSegment.isPending}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-xs text-gray-200 hover:text-gray-100 h-9 px-3 gap-1.5 justify-center sm:justify-start"
            >
              {previewSegment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
              ) : (
                null
              )}
              <span>{previewSegment.isPending ? "Evaluating Query..." : "Preview Matching Leads"}</span>
            </Button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-gray-400 hover:text-white h-9 px-4 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSegment.isPending}
                className="bg-brand text-white hover:bg-brand-400 h-9 px-5 text-xs font-semibold shadow-lg shadow-brand/25 transition-all rounded-lg"
              >
                {createSegment.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Dynamic Segment"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
