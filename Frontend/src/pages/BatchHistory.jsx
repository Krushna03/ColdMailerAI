import { useState, useMemo, useEffect } from "react";
import { useBatchJobs, useBatchJobStatus } from "../hooks/useLeads";
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
  ExternalLink,
  Copy,
  ChevronRight,
  Mail,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Seo from "../components/common/Seo";
import { format } from "date-fns";

export default function BatchHistory() {
  const { toast } = useToast();
  const { data: jobsList, isLoading: isListLoading } = useBatchJobs();

  const [selectedJobId, setSelectedJobId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Poll status of selected job if it is still processing
  const { data: polledJobDetail } = useBatchJobStatus(selectedJobId);

  // Use the polled details for the selected job, otherwise find it in the jobsList
  const selectedJob = useMemo(() => {
    if (polledJobDetail && polledJobDetail._id === selectedJobId) {
      return polledJobDetail;
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
    return selectedJob.results.filter((res) => {
      const term = searchTerm.toLowerCase();
      return (
        (res.leadName || "").toLowerCase().includes(term) ||
        (res.leadCompany || "").toLowerCase().includes(term) ||
        (res.leadEmail || "").toLowerCase().includes(term) ||
        (res.error || "").toLowerCase().includes(term)
      );
    });
  }, [selectedJob, searchTerm]);

  const handleCopyEmail = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Email body copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status) => {
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
    <div className="flex flex-col gap-6 h-[calc(100vh-6.5rem)]">
      <Seo title="Batch History" path="/dashboard/batches" noIndex />

      {/* Page Header */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="h-6 w-6 text-brand" /> Batch Email History
          </h1>
          <p className="text-sm text-gray-400">
            View the historical logs and AI outreach generation statistics for your bulk operations.
          </p>
        </div>
      </div>

      {isListLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-gray-400 text-sm">Loading generation history...</p>
          </div>
        </div>
      ) : !jobsList || jobsList.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-surface-900/50 p-8 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <History className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No Batch History Yet</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            You haven't run any batch generation jobs yet. Navigate to your Leads page and select multiple leads to kickstart your first bulk outreach!
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
          
          {/* Left Column: History List */}
          <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
              Previous Operations ({jobsList.length})
            </h2>
            <div className="space-y-3">
              {jobsList.map((job) => {
                const isActive = job._id === selectedJobId;
                const dateLabel = job.createdAt
                  ? format(new Date(job.createdAt), "MMM d, yyyy 'at' h:mm a")
                  : "Unknown date";
                return (
                  <button
                    key={job._id}
                    onClick={() => {
                      setSelectedJobId(job._id);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-250 backdrop-blur-md flex items-center justify-between ${
                      isActive
                        ? "border-brand/40 bg-brand/5 shadow-[0_0_15px_rgba(var(--brand-rgb),0.1)]"
                        : "border-white/5 bg-surface-900/40 hover:border-white/15 hover:bg-surface-900/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {getStatusBadge(job.status)}
                        <span className="text-[11px] font-mono text-gray-500">
                          {job._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-300 truncate">
                        {job.purpose || "Generated Outreach"}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                        <span>{dateLabel}</span>
                        <span>•</span>
                        <span>{job.totalLeads} leads</span>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${isActive ? "text-brand translate-x-0.5" : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Detail Panel */}
          <div className="flex-1 flex flex-col min-w-0 rounded-3xl border border-white/10 bg-surface-900/30 p-6 backdrop-blur-xl">
            {selectedJob ? (
              <div className="flex flex-col flex-1 min-h-0 gap-6">
                
                {/* Job Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/15">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white truncate">
                        Batch {selectedJob._id.slice(-8).toUpperCase()}
                      </h2>
                      {getStatusBadge(selectedJob.status)}
                    </div>
                    <p className="text-sm font-semibold text-gray-400 block mb-1">
                      Tone: <span className="text-white capitalize">{selectedJob.tone}</span>
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed max-w-2xl italic">
                      &ldquo;{selectedJob.purpose || "No custom purpose provided."}&rdquo;
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="text-sm font-medium text-white">
                      {selectedJob.createdAt
                        ? format(new Date(selectedJob.createdAt), "PPP p")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Progress Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-white/5 bg-surface-900/60 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</p>
                    <p className="mt-1 text-2xl font-bold text-white">{selectedJob.totalLeads}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-surface-900/60 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Processed</p>
                    <p className="mt-1 text-2xl font-bold text-brand">{selectedJob.processedLeads}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                    <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">Succeeded</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">{selectedJob.successCount}</p>
                  </div>
                  <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
                    <p className="text-xs font-semibold text-red-400/80 uppercase tracking-wider">Failed</p>
                    <p className="mt-1 text-2xl font-bold text-red-400">{selectedJob.failureCount}</p>
                  </div>
                </div>

                {/* Processing State Progress Bar */}
                {selectedJob.status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Generating emails ({selectedJob.processedLeads}/{selectedJob.totalLeads})</span>
                      <span className="font-semibold text-brand">
                        {Math.round((selectedJob.processedLeads / selectedJob.totalLeads) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                      <div
                        className="h-full bg-gradient-to-r from-brand to-brand-400 transition-all duration-500 ease-out"
                        style={{
                          width: `${(selectedJob.processedLeads / selectedJob.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Search Results Filter & Results List */}
                <div className="flex-1 flex flex-col min-h-0 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Search leads, emails, or errors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 border-white/10 bg-surface-900/60 placeholder:text-gray-500 text-white focus-visible:ring-brand-400/40"
                      />
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-surface-950 p-4 space-y-3 scrollbar-thin">
                    {!selectedJob.results || selectedJob.results.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-brand mb-2" />
                        <p className="text-xs text-gray-500">Waiting for generation results...</p>
                      </div>
                    ) : filteredResults.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500 text-sm">
                        No matches found for &ldquo;{searchTerm}&rdquo;
                      </div>
                    ) : (
                      filteredResults.map((res, idx) => (
                        <div
                          key={res._id || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl border border-white/5 bg-surface-900/20 hover:bg-surface-900/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-white truncate">
                                {res.leadName || "Lead"}
                              </span>
                              {res.leadCompany && (
                                <span className="text-xs text-gray-500 truncate">
                                  ({res.leadCompany})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{res.leadEmail || "No email"}</p>
                            {!res.success && res.error && (
                              <p className="mt-1.5 text-xs text-red-400 font-medium">
                                Error: {res.error}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            {res.success ? (
                              <>
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                                  Success
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedResult(res);
                                    setEmailModalOpen(true);
                                  }}
                                  className="h-8 gap-1.5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs"
                                >
                                  <Mail className="h-3.5 w-3.5" /> View Draft
                                </Button>
                              </>
                            ) : (
                              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
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
                <p className="text-gray-400 text-sm">Select a batch from the history list to view details.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Email Draft Dialog */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl">
          <DialogHeader className="space-y-1.5 border-b border-white/10 px-6 pb-4 pt-6 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand" /> Outreach Email Draft
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-400">
              Generated for <span className="text-white font-medium">{selectedResult?.leadName}</span>
              {selectedResult?.leadCompany && ` at ${selectedResult.leadCompany}`} ({selectedResult?.leadEmail})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-surface-950 p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text scrollbar-thin text-gray-200">
              {selectedResult?.generatedEmail || "No draft content found."}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-surface-950/40">
            <div className="text-xs text-gray-500">
              You can copy this template to send it via your favorite mailer client.
            </div>
            <Button
              onClick={() => handleCopyEmail(selectedResult?.generatedEmail)}
              className="bg-brand text-white hover:bg-brand-400 gap-2 rounded-xl py-5 px-4 font-semibold shrink-0"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
