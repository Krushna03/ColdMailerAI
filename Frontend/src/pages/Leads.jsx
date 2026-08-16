import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, Trash2, Search, X, Clock } from "lucide-react";
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
} from "../hooks/useLeads";
import LeadsTable from "../components/leads/LeadsTable";
import AddLeadDialog from "../components/leads/AddLeadDialog";
import AddCategoryDialog from "../components/leads/AddCategoryDialog";
import CsvUploadButton from "../components/leads/CsvUploadButton";
import BatchGenerateDialog from "../components/leads/BatchGenerateDialog";
import BatchProgressDialog from "../components/leads/BatchProgressDialog";
import CategorySelect, { getCategoryName } from "../components/leads/CategorySelect";
import { LEAD_STATUS_OPTIONS } from "../components/leads/leadUtils";

export default function Leads() {
  useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
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
    categoryId: categoryFilter || undefined,
    overdueOnly,
    search: debouncedSearch || undefined,
  });

  const createLead = useCreateLead();
  const bulkCreate = useBulkCreateLeads();
  const deleteLead = useDeleteLead();
  const bulkDelete = useBulkDeleteLeads();
  const updateLead = useUpdateLead();
  const generateBatch = useGenerateBatchEmails();

  const leads = useMemo(
    () => data?.pages.flatMap((page) => page.leads) ?? [],
    [data]
  );

  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedLeadIds.has(lead._id)),
    [leads, selectedLeadIds]
  );

  const selectedCategoryLabel = useMemo(() => {
    if (!categoryFilter) return null;
    const match = categories.find((c) => c._id === categoryFilter);
    return match?.name || null;
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (!isError) return;
    toast({
      title: "Error loading leads",
      description:
        error?.response?.data?.message ||
        "Could not load leads. Please try again.",
      variant: "destructive",
    });
  }, [isError, error, toast]);

  const toggleLead = (leadId) => {
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

  const handleCreateLead = async (leadData) => {
    try {
      await createLead.mutateAsync(leadData);
      toast({ title: "Lead added", description: "Lead saved successfully." });
      setAddOpen(false);
    } catch (err) {
      toast({
        title: "Could not add lead",
        description:
          err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleCreateCategory = async (payload) => {
    try {
      await createCategory.mutateAsync(payload);
      toast({ title: "Category added" });
      setCategoryOpen(false);
    } catch (err) {
      toast({
        title: "Could not add category",
        description:
          err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleBulkImport = async (parsedLeads) => {
    return await bulkCreate.mutateAsync(parsedLeads);
  };

  const handleDeleteLead = (leadId) => {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        setSelectedLeadIds((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
        toast({ title: "Lead deleted" });
      },
      onError: (err) => {
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
      onSuccess: (data) => {
        setSelectedLeadIds(new Set());
        toast({
          title: "Leads deleted",
          description:
            data?.message ||
            `${data?.deletedCount ?? leadIds.length} lead(s) removed.`,
        });
      },
      onError: (err) => {
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

  const handleGenerate = async ({ leads: draftLeads, tone, purpose }) => {
    try {
      const originalsById = new Map(selectedLeads.map((lead) => [lead._id, lead]));

      for (const draft of draftLeads) {
        const original = originalsById.get(draft._id);
        if (!original) continue;

        const updates = {};
        for (const key of ["name", "company", "role", "email", "notes"]) {
          const nextValue = (draft[key] || "").trim();
          const prevValue = (original[key] || "").trim();
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
      }
      return data.jobId;
    } catch (err) {
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
    <div className="space-y-6">
      <Seo title="Leads" path="/dashboard/leads" noIndex />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Leads</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Filter by category, select leads, then generate with one shared purpose
            and tone.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedLeadIds.size > 0 && (
            <Button
              type="button"
              disabled={bulkDelete.isPending || deleteLead.isPending}
              onClick={handleBulkDelete}
              className="border border-red-400/40 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200 text-[12px] px-2.5"
            >
              <Trash2 className="h-3 w-3" />
              {bulkDelete.isPending
                ? "Deleting..."
                : `Delete all (${selectedLeadIds.size})`}
            </Button>
          )}
          <Button
            type="button"
            disabled={selectedLeadIds.size === 0 || generateBatch.isPending}
            onClick={() => setGenerateOpen(true)}
            className="bg-brand text-white hover:bg-brand-400 text-[12px] px-3"
          >
            <Mail className="h-3 w-3" />
            {selectedLeadIds.size > 0
              ? `Generate (${selectedLeadIds.size})`
              : "Generate emails"}
          </Button>
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
            className="border border-white/15 bg-transparent text-white hover:bg-white/10 text-[13px] px-2.5"
          >
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-[360px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search name, email, company, role..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900 rounded-lg w-full"
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

          <Button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`h-8 px-3 text-xs rounded-lg border transition-all duration-200 flex items-center gap-1.5 font-normal ${
              overdueOnly
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

      <LeadsTable
        leads={leads}
        selectedLeadIds={selectedLeadIds}
        onToggleLead={toggleLead}
        onToggleAll={toggleAll}
        onDeleteLead={handleDeleteLead}
        isLoading={isFetching && leads.length === 0}
        isDeleting={deleteLead.isPending || bulkDelete.isPending}
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
        onClose={() => setActiveJobId(null)}
        onComplete={(job) => {
          setActiveJobId(null);
          navigate("/dashboard/batches");
          toast({
            title: "Batch complete",
            description: `Generated ${job.successCount}/${job.results?.length ?? 0} emails.`,
          });
        }}
        fallbackReadyCount={selectedLeads.length}
      />
    </div>
  );
}
