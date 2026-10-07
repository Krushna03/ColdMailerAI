import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, Trash2, Search, X, Clock, CheckCircle2, Loader2, AlertCircle, Workflow } from "lucide-react";
import Seo from "../components/common/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "../hooks/useUser";
import {
  useLeads,
  useCreateLead,
  useBulkCreateLeads,
  useDeleteLead,
  useBulkDeleteLeads,
  useUpdateLead,
  useGenerateBatchEmails,
  useLeadCategories,
  useCreateLeadCategory,
  useBatchJobStatus,
  useDeleteBatchJob,
  useCreateImportJob,
  useImportJobStatus,
} from "../hooks/useLeads";
import LeadsTable from "../components/leads/LeadsTable";
import AddLeadDialog from "../components/leads/AddLeadDialog";
import AddCategoryDialog from "../components/leads/AddCategoryDialog";
import CsvUploadButton from "../components/leads/CsvUploadButton";
import BatchGenerateDialog from "../components/leads/BatchGenerateDialog";
import BatchProgressDialog from "../components/leads/BatchProgressDialog";
import ConfirmDeleteDialog from "../components/common/ConfirmDeleteDialog";
import CategorySelect, { getCategoryName } from "../components/leads/CategorySelect";
import { LEAD_STATUS_OPTIONS, EMAIL_VERIFICATION_STATUS_OPTIONS } from "../components/leads/leadUtils";
import SavedSegmentsBar from "../components/leads/SavedSegmentsBar";
import EnrollSelectedLeadsModal from "../components/leads/EnrollSelectedLeadsModal";
import { Lead, LeadCategory } from "../types/lead";

export default function Leads() {
  useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => new Set());
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [confirmDeleteBatchOpen, setConfirmDeleteBatchOpen] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(null);

  const { data: activeJob } = useBatchJobStatus(activeJobId || undefined);
  const isJobActive = Boolean(activeJob && ["pending", "processing"].includes(activeJob.status));

  const { data: activeImportJob } = useImportJobStatus(activeImportJobId || undefined);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const { data: categories = [] } = useLeadCategories();
  const createCategory = useCreateLeadCategory();

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
  } = useLeads({
    status: statusFilter || undefined,
    verificationStatus: verificationFilter === "all" ? undefined : (verificationFilter || undefined),
    categoryId: categoryFilter || undefined,
    overdueOnly,
    search: debouncedSearch || undefined,
    segmentId: activeSegmentId || undefined,
  });

  const createLead = useCreateLead();
  const bulkCreate = useBulkCreateLeads();
  const createImportJob = useCreateImportJob();
  const deleteLead = useDeleteLead();
  const bulkDelete = useBulkDeleteLeads();
  const updateLead = useUpdateLead();
  const generateBatch = useGenerateBatchEmails();
  const deleteBatchJob = useDeleteBatchJob();

  const handleDeleteBatchJob = async (jobId: string | null) => {
    if (!jobId) return;
    try {
      await deleteBatchJob.mutateAsync(jobId);
      if (activeJobId === jobId) {
        setActiveJobId(null);
        setProgressOpen(false);
      }
      toast({
        title: "Batch job deleted",
        description: "The batch processing job has been cancelled and deleted.",
      });
    } catch (err: any) {
      toast({
        title: "Could not delete batch job",
        description: err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const leads = useMemo<Lead[]>(
    () => data?.pages.flatMap((page) => page.leads) ?? [],
    [data]
  );

  const selectedLeads = useMemo<Lead[]>(
    () => leads.filter((lead) => selectedLeadIds.has(lead._id)),
    [leads, selectedLeadIds]
  );

  const selectedCategoryLabel = useMemo(() => {
    if (!categoryFilter) return null;
    const match = categories.find((c: LeadCategory) => c._id === categoryFilter);
    return match?.name || null;
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (!isError) return;
    toast({
      title: "Error loading leads",
      description:
        (error as any)?.response?.data?.message ||
        "Could not load leads. Please try again.",
      variant: "destructive",
    });
  }, [isError, error, toast]);

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedLeadIds((prev) => {
      const allSelected = leads.length > 0 && leads.every((l) => prev.has(l._id));
      if (allSelected) return new Set();
      return new Set(leads.map((l) => l._id));
    });
  };

  const handleCreateLead = async (leadData: Partial<Lead>) => {
    try {
      await createLead.mutateAsync(leadData);
      toast({ title: "Lead added", description: "Lead saved successfully." });
      setAddOpen(false);
    } catch (err: any) {
      toast({
        title: "Could not add lead",
        description:
          err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleCreateCategory = async (payload: { name: string; description?: string }) => {
    try {
      await createCategory.mutateAsync(payload);
      toast({ title: "Category added" });
      setCategoryOpen(false);
    } catch (err: any) {
      toast({
        title: "Could not add category",
        description:
          err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleBulkImport = async (parsedLeads: any[], options: any = {}) => {
    if (options.verifyEmails !== false) {
      try {
        const res = await createImportJob.mutateAsync({
          leads: parsedLeads,
          categoryId: options.categoryId,
          verifyEmails: true,
        });
        if (res?.job?._id) {
          setActiveImportJobId(res.job._id);
          toast({
            title: "Verification import started",
            description: `Queued ${parsedLeads.length} leads for deliverability verification & import.`,
          });
          return { isAsyncJob: true, jobId: res.job._id };
        }
      } catch (err: any) {
        toast({
          title: "Import job failed",
          description: err?.response?.data?.message || err.message || "Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    }
    return await bulkCreate.mutateAsync(parsedLeads);
  };

  const handleDeleteLead = (leadId: string) => {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        setSelectedLeadIds((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
        toast({ title: "Lead deleted" });
      },
      onError: (err: any) => {
        toast({
          title: "Delete failed",
          description:
            err?.response?.data?.message || "Could not delete that lead.",
          variant: "destructive",
        });
      },
    });
  };

  const handleBulkDelete = () => {
    const leadIds = Array.from(selectedLeadIds);
    if (leadIds.length === 0) return;

    bulkDelete.mutate(leadIds, {
      onSuccess: (data: any) => {
        setSelectedLeadIds(new Set());
        toast({
          title: "Leads deleted",
          description:
            data?.message ||
            `${data?.deletedCount ?? leadIds.length} lead(s) removed.`,
        });
      },
      onError: (err: any) => {
        toast({
          title: "Delete failed",
          description:
            err?.response?.data?.message ||
            err.message ||
            "Could not delete selected leads.",
          variant: "destructive",
        });
      },
    });
  };

  const handleGenerate = async ({ leads: draftLeads, tone, purpose }: { leads: any[]; tone?: string; purpose?: string }) => {
    try {
      const originalsById = new Map(selectedLeads.map((lead) => [lead._id, lead]));

      for (const draft of draftLeads) {
        const original = originalsById.get(draft._id);
        if (!original) continue;

        const updates: Record<string, any> = {};
        for (const key of ["name", "company", "role", "email", "notes"]) {
          const nextValue = (draft[key] || "").trim();
          const prevValue = ((original as any)?.[key] || "").toString().trim();
          if (nextValue !== prevValue) updates[key] = nextValue;
        }

        if (Object.keys(updates).length > 0) {
          await updateLead.mutateAsync({ leadId: draft._id, ...updates });
        }
      }

      const data = await generateBatch.mutateAsync({
        leadIds: draftLeads.map((lead) => lead._id),
        tone,
        purpose,
      });

      if (data?.jobId) {
        setActiveJobId(data.jobId);
        setGenerateOpen(false);
        setProgressOpen(true);
      }
      return data.jobId;
    } catch (err: any) {
      toast({
        title: "Batch generation failed",
        description:
          err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <Seo title="Leads" path="/dashboard/leads" noIndex />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-2 -mt-[2px]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight sm:text-3xl">Leads</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Manage lead contacts, filter category & status, and launch tailored cold email batches.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedLeadIds.size > 0 ? (
            <>
              <Button
                type="button"
                disabled={generateBatch.isPending || isJobActive}
                onClick={() => setGenerateOpen(true)}
                title={isJobActive ? "A batch job is currently in progress. Please wait for it to complete." : ""}
                className="bg-brand text-white hover:bg-brand-400 text-xs sm:text-[13px] px-3 h-9 rounded-md shadow-none flex items-center gap-1.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJobActive
                  ? "Batch in progress..."
                  : `Generate emails (${selectedLeadIds.size})`}
              </Button>
              <Button
                type="button"
                onClick={() => setEnrollModalOpen(true)}
                className="bg-brand text-white hover:bg-brand-400 text-xs sm:text-[13px] px-3 h-9 rounded-md shadow-none flex items-center gap-1.5 font-semibold"
              >
                Enroll in Sequence ({selectedLeadIds.size})
              </Button>
              <Button
                type="button"
                disabled={bulkDelete.isPending || deleteLead.isPending || isJobActive}
                onClick={() => setConfirmBulkDeleteOpen(true)}
                title={isJobActive ? "Cannot delete leads while a batch generation is active" : ""}
                className="border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs sm:text-sm px-3 h-9 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {bulkDelete.isPending
                  ? "Deleting..."
                  : `Delete (${selectedLeadIds.size})`}
              </Button>
            </>
          ) : (
            <>
              <CsvUploadButton
                onImport={handleBulkImport}
                isImporting={bulkCreate.isPending}
                categories={categories}
                existingLeads={leads}
                onAddCategory={() => setCategoryOpen(true)}
              />
              <Button
                type="button"
                onClick={() => setAddOpen(true)}
                className="border border-white/15 bg-surface-900 text-white hover:bg-white/5 text-xs sm:text-[14px] px-3 h-8 rounded-md flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add lead
              </Button>
            </>
          )}
        </div>
      </div>

      <SavedSegmentsBar
        activeSegmentId={activeSegmentId}
        onSelectSegment={setActiveSegmentId}
        totalLeadsCount={(data?.pages?.[0] as any)?.total ?? leads.length}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-[380px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search name, email, company, role..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="h-9 pl-9 pr-7 text-xs sm:text-sm border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900 rounded-md w-full"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <CategorySelect
            categories={categories}
            value={categoryFilter}
            onChange={setCategoryFilter}
            onAddCategory={() => setCategoryOpen(true)}
            allowEmpty
            emptyLabel="All categories"
            triggerClassName="h-8 w-[220px] rounded-lg text-xs"
            prefix={
              <>
                <span className="text-gray-400 font-normal mr-0.5">Category:</span>
              </>
            }
          />

          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
          >
            <SelectTrigger
              aria-label="Filter leads by status"
              className="h-8 px-3 w-[140px] rounded-lg border-white/15 bg-surface-900 text-white text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-normal mr-0.5">Status:</span>
                <span className="truncate">
                  <SelectValue placeholder="All" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {LEAD_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={verificationFilter || "all"}
            onValueChange={(value) => setVerificationFilter(value === "all" ? "" : value)}
          >
            <SelectTrigger
              aria-label="Filter leads by deliverability"
              className="h-8 px-3 w-[150px] rounded-lg border-white/15 bg-surface-900 text-white text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-400 font-normal mr-0.5">Quality:</span>
                <span className="truncate">
                  <SelectValue placeholder="All" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {EMAIL_VERIFICATION_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`h-8 px-3 text-xs rounded-lg border transition-all duration-200 flex items-center gap-1.5 font-normal ${overdueOnly
                ? "bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20 hover:text-red-100"
                : "border-white/15 bg-surface-900 text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            <Clock className={`h-3.5 w-3.5 transition-colors ${overdueOnly ? "text-red-400" : "text-gray-400"}`} />
            <span>Overdue</span>
          </Button>
        </div>
      </div>

      {selectedCategoryLabel && (
        <p className="text-sm text-gray-400">
          Showing <span className="text-white">{selectedCategoryLabel}</span> leads.
          Generate will use one purpose for this list.
        </p>
      )}

      {activeImportJobId && activeImportJob && (
        <div className="relative rounded-xl border border-emerald-500/30 bg-surface-900 p-4 shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 pr-6 sm:pr-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeImportJob.status === "completed" || activeImportJob.status === "completed_with_errors"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : activeImportJob.status === "failed"
                      ? "bg-red-500/10 border border-red-500/30 text-red-400"
                      : "bg-brand/10 border border-brand/30 text-brand"
                  }`}
              >
                {activeImportJob.status === "completed" || activeImportJob.status === "completed_with_errors" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : activeImportJob.status === "failed" ? (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {activeImportJob.status === "completed"
                      ? "Lead import & deliverability check complete!"
                      : activeImportJob.status === "completed_with_errors"
                        ? "Import completed with some errors"
                        : activeImportJob.status === "failed"
                          ? "Import job failed"
                          : "Verifying email deliverability & importing..."}
                  </h4>
                  <span className="text-xs font-mono font-medium text-emerald-400">
                    {activeImportJob.processedRows || 0}/{activeImportJob.totalRows || 0} ({Math.round(((activeImportJob.processedRows || 0) / (activeImportJob.totalRows || 1)) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap font-mono">
                  <span className="text-emerald-300">
                    ✓ {activeImportJob.validCount || 0} valid
                  </span>
                  {(activeImportJob.riskyCount ?? 0) > 0 && (
                    <span className="text-amber-300">
                      ⚡ {activeImportJob.riskyCount} risky
                    </span>
                  )}
                  {(activeImportJob.catchAllCount ?? 0) > 0 && (
                    <span className="text-sky-300">
                      ~ {activeImportJob.catchAllCount} catch-all
                    </span>
                  )}
                  {(activeImportJob.disposableCount ?? 0) > 0 && (
                    <span className="text-fuchsia-300">
                      ✕ {activeImportJob.disposableCount} disposable
                    </span>
                  )}
                  {(activeImportJob.invalidCount ?? 0) > 0 && (
                    <span className="text-rose-400">
                      ✕ {activeImportJob.invalidCount} invalid
                    </span>
                  )}
                  {(activeImportJob.duplicateCount ?? 0) > 0 && (
                    <span className="text-gray-400">
                      ⊘ {activeImportJob.duplicateCount} duplicates
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveImportJobId(null)}
                className="h-8 px-2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 w-full overflow-hidden rounded-full bg-surface-800 h-1.5">
            <div
              className={`h-full transition-all duration-300 ${activeImportJob.status === "failed" ? "bg-red-500" : "bg-emerald-500"
                }`}
              style={{ width: `${Math.round(((activeImportJob.processedRows || 0) / (activeImportJob.totalRows || 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {activeJobId && activeJob && (
        <div className="relative rounded-xl border border-brand/30 bg-surface-900 p-4 shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 pr-6 sm:pr-0">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeJob.status === "completed" || activeJob.status === "completed_with_errors"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : activeJob.status === "failed"
                    ? "bg-red-500/10 border border-red-500/30 text-red-400"
                    : "bg-brand/10 border border-brand/30 text-brand"
                }`}>
                {activeJob.status === "completed" || activeJob.status === "completed_with_errors" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : activeJob.status === "failed" ? (
                  <X className="h-5 w-5 text-red-400" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-brand" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {activeJob.status === "completed"
                      ? "Batch generation complete!"
                      : activeJob.status === "completed_with_errors"
                        ? "Batch completed with errors"
                        : activeJob.status === "failed"
                          ? "Batch generation failed"
                          : "Generating outreach emails..."}
                  </h4>
                  <span className="text-xs font-mono font-medium text-brand">
                    {activeJob.processedLeads || 0}/{activeJob.totalLeads || 0} ({Math.round(((activeJob.processedLeads || 0) / (activeJob.totalLeads || 1)) * 100)}%)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {["completed", "completed_with_errors", "failed"].includes(activeJob.status)
                    ? `${(activeJob as any).successCount || activeJob.successfulCount || 0} succeeded, ${(activeJob as any).failureCount || activeJob.failedCount || 0} failed.`
                    : "Gemini is crafting tailored messages for your selected leads."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProgressOpen(true)}
                className="h-8 border-white/15 bg-white/5 text-xs text-white hover:bg-white/10 hover:text-white gap-1.5"
              >
                View Live Progress
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleteBatchJob.isPending}
                onClick={() => setConfirmDeleteBatchOpen(true)}
                className="h-8 border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 hover:text-red-300 gap-1.5"
                title="Cancel and delete this batch job"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                {isJobActive ? "Cancel Batch" : "Delete Batch"}
              </Button>
              {["completed", "completed_with_errors"].includes(activeJob.status) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate("/dashboard/batches")}
                  className="h-8 bg-brand text-xs text-white hover:bg-brand-400 gap-1.5"
                >
                  View Drafts
                </Button>
              )}
              {["completed", "completed_with_errors", "failed"].includes(activeJob.status) && (
                <button
                  type="button"
                  onClick={() => setActiveJobId(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  title="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
            <div
              className={`h-full transition-all duration-500 ease-out ${activeJob.status === "completed_with_errors" || activeJob.status === "failed"
                  ? "bg-amber-500"
                  : "bg-brand"
                }`}
              style={{
                width: `${Math.round(((activeJob.processedLeads || 0) / (activeJob.totalLeads || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <LeadsTable
        leads={leads}
        selectedLeadIds={selectedLeadIds}
        onToggleLead={toggleLead}
        onToggleAll={toggleAll}
        onDeleteLead={(id: string) => setLeadToDeleteId(id)}
        isLoading={isFetching && leads.length === 0}
        isDeleting={deleteLead.isPending || bulkDelete.isPending || isJobActive}
      />

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="text-gray-300 hover:bg-white/10 hover:text-white"
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreateLead}
        isSubmitting={createLead.isPending}
        categories={categories}
        onAddCategory={() => setCategoryOpen(true)}
      />

      <AddCategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        onSubmit={handleCreateCategory}
        isSubmitting={createCategory.isPending}
      />

      <BatchGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        leads={selectedLeads}
        onGenerate={handleGenerate}
        isGenerating={generateBatch.isPending || updateLead.isPending}
        categoryHint={
          selectedCategoryLabel ||
          (selectedLeads[0] ? getCategoryName(selectedLeads[0].categoryId) : null)
        }
      />

      <BatchProgressDialog
        activeJobId={activeJobId}
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        onDelete={() => setConfirmDeleteBatchOpen(true)}
        onComplete={(job: any) => {
          setProgressOpen(false);
          navigate("/dashboard/batches");
          toast({
            title: "Batch complete",
            description: `Generated ${job.successCount}/${job.results?.length ?? 0} emails.`,
          });
        }}
        fallbackReadyCount={selectedLeads.length}
      />

      {/* Confirmation Modals */}
      <ConfirmDeleteDialog
        open={confirmDeleteBatchOpen}
        onOpenChange={setConfirmDeleteBatchOpen}
        title={isJobActive ? "Are you sure you want to cancel & delete?" : "Are you sure you want to delete?"}
        description={
          isJobActive
            ? "Cancelling will immediately stop background email generation and remove this batch."
            : "Are you sure you want to delete this batch job record? This action cannot be undone."
        }
        confirmText={isJobActive ? "Yes, Cancel & Delete" : "Yes, Delete Batch"}
        isDeleting={deleteBatchJob.isPending}
        onConfirm={async () => {
          await handleDeleteBatchJob(activeJobId);
          setConfirmDeleteBatchOpen(false);
        }}
      />

      <ConfirmDeleteDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        title="Are you sure you want to delete selected leads?"
        description={`This will permanently remove ${selectedLeadIds.size} lead(s) and their email stats.`}
        confirmText="Yes, Delete Leads"
        isDeleting={bulkDelete.isPending}
        onConfirm={async () => {
          await handleBulkDelete();
          setConfirmBulkDeleteOpen(false);
        }}
      />

      <ConfirmDeleteDialog
        open={!!leadToDeleteId}
        onOpenChange={(val: boolean) => {
          if (!val) setLeadToDeleteId(null);
        }}
        title="Are you sure you want to delete this lead?"
        description="This action will permanently delete the lead contact."
        confirmText="Yes, Delete Lead"
        isDeleting={deleteLead.isPending}
        onConfirm={async () => {
          if (leadToDeleteId) {
            handleDeleteLead(leadToDeleteId);
            setLeadToDeleteId(null);
          }
        }}
      />

      <EnrollSelectedLeadsModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        selectedLeadIds={Array.from(selectedLeadIds)}
        leads={leads}
        onSuccess={() => setSelectedLeadIds(new Set())}
      />
    </div>
  );
}
