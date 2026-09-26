import { useState, useMemo, useEffect, useRef } from "react";
import { useBatchJobs, useBatchJobStatus, useDeleteBatchJob } from "../hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Copy,
  ChevronRight,
  Mail,
  Loader2,
  Trash2,
} from "lucide-react";
import Seo from "../components/common/Seo";
import ConfirmDeleteDialog from "../components/common/ConfirmDeleteDialog";
import { format } from "date-fns";
import { BatchJobSummary } from "../types/lead";

export default function BatchHistory() {
  const { toast } = useToast();
  const {
    data,
    isLoading: isListLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useBatchJobs();

  const jobsList = useMemo<BatchJobSummary[]>(() => {
    return data?.pages.flatMap((page) => page.jobs) ?? [];
  }, [data]);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const deleteBatchJob = useDeleteBatchJob();

  const handleDeleteBatchJob = async (jobId: string | null) => {
    if (!jobId) return;
    try {
      await deleteBatchJob.mutateAsync(jobId);
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
      }
      toast({
        title: "Batch job deleted",
        description: "The batch job has been cancelled and deleted.",
      });
    } catch (err: any) {
      toast({
        title: "Could not delete batch job",
        description: err?.response?.data?.message || err.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Poll status of selected job if it is still processing
  const { data: polledJobDetail } = useBatchJobStatus(selectedJobId || undefined);

  // Attach infinite scroll listener to batch history container
  useEffect(() => {
    const scrollContainer = sidebarScrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isFetchingNextPage || !hasNextPage) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 80;

      if (nearBottom) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Use the polled details for the selected job, otherwise find it in the jobsList
  const selectedJob = useMemo(() => {
    if (polledJobDetail && polledJobDetail._id === selectedJobId) {
      return polledJobDetail as any;
    }
    return jobsList?.find((job) => job._id === selectedJobId) || null;
  }, [selectedJobId, polledJobDetail, jobsList]);

  // Set the first job as selected by default when the list loads
  useEffect(() => {
    if (jobsList?.length > 0 && !selectedJobId) {
      setSelectedJobId(jobsList[0]._id);
    }
  }, [jobsList, selectedJobId]);

  // Filter results of selected job by search term
  const filteredResults = useMemo(() => {
    if (!selectedJob?.results) return [];
    return selectedJob.results.filter((res: any) => {
      const term = searchTerm.toLowerCase();
      return (
        (res.leadName || "").toLowerCase().includes(term) ||
        (String(res.leadCompany || "")).toLowerCase().includes(term) ||
        (res.leadEmail || "").toLowerCase().includes(term) ||
        (res.error || "").toLowerCase().includes(term)
      );
    });
  }, [selectedJob, searchTerm]);

  const handleCopyEmail = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Email body copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        );
      case "completed_with_errors":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Completed with errors
          </span>
        );
      case "processing":
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 animate-pulse">
            <Clock className="h-3.5 w-3.5 animate-spin" /> {status === "processing" ? "Processing" : "Pending"}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
            <XCircle className="h-3.5 w-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-semibold text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-6rem)] font-sans">
      <Seo title="Batch History" path="/dashboard/batches" noIndex />

      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3.5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Batch Email History
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Audit logs and AI outreach statistics for bulk email jobs.
          </p>
        </div>
      </div>

      {isListLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-gray-400 text-xs font-medium">Loading generation history...</p>
          </div>
        </div>
      ) : !jobsList || jobsList.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-surface-900 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/5 text-gray-300 border border-white/10">
            <History className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-white">No Batch History Found</h3>
          <p className="mt-1 max-w-sm text-xs text-gray-400">
            You haven&apos;t executed any batch email jobs yet. Select leads from your Leads table to start a batch.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          {/* Left Column: History List */}
          <div
            ref={sidebarScrollRef}
            className="w-full lg:w-[320px] shrink-0 flex flex-col gap-3 overflow-y-auto custom-scroll pr-1"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-1">
              Previous Operations ({jobsList.length})
            </div>
            <div className="space-y-2">
              {jobsList.map((job) => {
                const isActive = job._id === selectedJobId;
                const dateLabel = (job as any).createdAt
                  ? format(new Date((job as any).createdAt), "MMM d, yyyy 'at' h:mm a")
                  : "Unknown date";
                return (
                  <button
                    key={job._id}
                    onClick={() => {
                      setSelectedJobId(job._id);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left rounded-lg border p-3.5 transition-colors flex items-center justify-between ${
                      isActive
                        ? "border-brand bg-brand/10 text-white"
                        : "border-white/10 bg-surface-900 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getStatusBadge(job.status)}
                        <span className="text-[11px] font-mono text-gray-400">
                          #{job._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-200 truncate">
                        {(job as any).purpose || "Generated Outreach"}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                        <span>{dateLabel}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{job.totalLeads} leads</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        isActive ? "text-white translate-x-0.5" : ""
                      }`}
                    />
                  </button>
                );
              })}

              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Detail Panel */}
          <div className="flex-1 flex flex-col min-w-0 rounded-lg border border-white/10 bg-surface-900 p-5">
            {selectedJob ? (
              <div className="flex flex-col flex-1 min-h-0 gap-4">
                {/* Job Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <h2 className="text-base font-semibold text-white truncate">
                        Batch #{selectedJob._id.slice(-8).toUpperCase()}
                      </h2>
                      {getStatusBadge(selectedJob.status)}
                    </div>
                    <p className="text-xs text-gray-400 block mb-1">
                      Tone: <span className="text-white capitalize font-medium">{selectedJob.tone}</span>
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed max-w-2xl italic">
                      &ldquo;{selectedJob.purpose || "No custom purpose provided."}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Created At</p>
                      <p className="text-xs font-medium text-white font-mono">
                        {selectedJob.createdAt
                          ? format(new Date(selectedJob.createdAt), "PPP p")
                          : "N/A"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteBatchJob.isPending}
                      onClick={() => setDeletingJobId(selectedJob._id)}
                      className="h-8 border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 gap-1.5"
                      title="Delete this batch job record"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Progress Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-md border border-white/10 bg-surface-950 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Leads</p>
                    <p className="mt-1 text-lg font-semibold text-white font-mono">{selectedJob.totalLeads}</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-surface-950 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Processed</p>
                    <p className="mt-1 text-lg font-semibold text-brand font-mono">{selectedJob.processedLeads}</p>
                  </div>
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Succeeded</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400 font-mono">
                      {selectedJob.successCount ?? selectedJob.successfulCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-[11px] font-medium text-red-400 uppercase tracking-wider">Failed</p>
                    <p className="mt-1 text-lg font-semibold text-red-400 font-mono">
                      {selectedJob.failureCount ?? selectedJob.failedCount ?? 0}
                    </p>
                  </div>
                </div>

                {/* Processing State Progress Bar */}
                {selectedJob.status === "processing" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Generating emails ({selectedJob.processedLeads}/{selectedJob.totalLeads})</span>
                      <span className="font-semibold text-brand font-mono">
                        {Math.round((selectedJob.processedLeads / selectedJob.totalLeads) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                      <div
                        className="h-full bg-brand transition-all duration-500 ease-out"
                        style={{
                          width: `${(selectedJob.processedLeads / selectedJob.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Search Results Filter & Results List */}
                <div className="flex-1 flex flex-col min-h-0 gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search lead name, company, email, or error..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 rounded-md border-white/15 bg-surface-950 text-xs text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40"
                      />
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="flex-1 overflow-y-auto rounded-md border border-white/10 bg-surface-950 p-3 space-y-2 font-sans scrollbar-thin">
                    {!selectedJob.results || selectedJob.results.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-brand mb-2" />
                        <p className="text-xs text-gray-400">Waiting for generation results...</p>
                      </div>
                    ) : filteredResults.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 text-xs">
                        No results matching &ldquo;{searchTerm}&rdquo;
                      </div>
                    ) : (
                      filteredResults.map((res: any, idx: number) => (
                        <div
                          key={res._id || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-md border border-white/5 bg-surface-900/60 hover:bg-white/5 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-xs text-white truncate">
                                {res.leadName || "Lead"}
                              </span>
                              {res.leadCompany && (
                                <span className="text-[11px] text-gray-400 truncate">
                                  ({String(res.leadCompany)})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate font-mono">{res.leadEmail || "—"}</p>
                            {!res.success && res.error && (
                              <p className="mt-1 text-xs text-red-400 font-medium">
                                Error: {res.error}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {res.success ? (
                              <>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                  Success
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedResult(res);
                                    setEmailModalOpen(true);
                                  }}
                                  className="h-7 gap-1 border border-white/10 text-white rounded-md text-xs px-2.5 font-medium"
                                >
                                  <Mail className="h-3 w-3" /> View Draft
                                </Button>
                              </>
                            ) : (
                              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                                Failed
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
                <p className="text-gray-400 text-xs">Select a batch operation to inspect details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Draft Dialog */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden border-white/10 bg-surface-900 p-0 text-white sm:rounded-xl">
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 text-left">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" /> Generated Email Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Recipient: <span className="text-white font-medium">{selectedResult?.leadName}</span>
              {selectedResult?.leadCompany && ` (${selectedResult.leadCompany})`} — {selectedResult?.leadEmail}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="rounded-md border border-white/10 bg-surface-950 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text scrollbar-thin text-gray-200">
              {selectedResult?.generatedEmail || "No draft content available."}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-surface-950">
            <span className="text-xs text-gray-400">
              Ready to send via your email client.
            </span>
            <Button
              onClick={() => handleCopyEmail(selectedResult?.generatedEmail)}
              className="bg-brand text-white hover:bg-brand-400 gap-1.5 rounded-md h-8 px-3 text-xs font-medium shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deletingJobId}
        onOpenChange={(val: boolean) => {
          if (!val) setDeletingJobId(null);
        }}
        title="Are you sure you want to delete this batch job?"
        description="This action will permanently delete this batch job record from your history."
        confirmText="Yes, Delete Batch"
        isDeleting={deleteBatchJob.isPending}
        onConfirm={async () => {
          if (deletingJobId) {
            await handleDeleteBatchJob(deletingJobId);
            setDeletingJobId(null);
          }
        }}
      />
    </div>
  );
}
