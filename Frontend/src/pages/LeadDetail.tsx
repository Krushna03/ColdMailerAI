import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Seo from "../components/common/Seo";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "../hooks/useUser";
import {
  useLead,
  useUpdateLead,
  useAddFollowUp,
  useUpdateFollowUp,
  useDeleteFollowUp,
  useMarkEmailSent,
  useUnmarkEmailSent,
  useGenerateBatchEmails,
  useLeadCategories,
  useCreateLeadCategory,
  useBatchJobStatus,
  useVerifyLeadEmail,
} from "../hooks/useLeads";
import LeadDetailHeader from "../components/leads/LeadDetailHeader";
import LeadStatsStrip from "../components/leads/LeadStatsStrip";
import LeadDeliverabilityCard from "../components/leads/LeadDeliverabilityCard";
import LeadProfileForm from "../components/leads/LeadProfileForm";
import LeadTimeline from "../components/leads/LeadTimeline";
import AddFollowUpDialog from "../components/leads/AddFollowUpDialog";
import AddCategoryDialog from "../components/leads/AddCategoryDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import LeadDetailSkeleton from "../loaders/LeadDetailSkeleton";

export default function LeadDetail() {
  useCurrentUser();
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [instructions, setInstructions] = useState("");

  const { data, isLoading, isError, error } = useLead(leadId);
  const { data: categories = [] } = useLeadCategories();
  const createCategory = useCreateLeadCategory();
  const updateLead = useUpdateLead(leadId);
  const addFollowUp = useAddFollowUp(leadId || "");
  const updateFollowUp = useUpdateFollowUp(leadId || "");
  const deleteFollowUp = useDeleteFollowUp(leadId || "");
  const markSent = useMarkEmailSent(leadId);
  const unmarkSent = useUnmarkEmailSent(leadId);
  const generateBatch = useGenerateBatchEmails();
  const verifyEmail = useVerifyLeadEmail();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { data: job } = useBatchJobStatus(activeJobId || undefined);
  const jobStatus = job?.status;

  useEffect(() => {
    if (!activeJobId || !jobStatus) return;

    const isTerminal = ["completed", "completed_with_errors", "failed", "cancelled"].includes(jobStatus);
    if (!isTerminal) return;

    setGenerateOpen(false);
    setActiveJobId(null);
    setInstructions("");

    if (jobStatus === "failed" || jobStatus === "cancelled") {
      toast({
        title: "Generation failed",
        description: jobStatus === "cancelled" ? "Generation was cancelled." : "Please try again.",
        variant: "destructive",
      });
    } else {
      const result = (job as any)?.results?.[0];
      const ok = result?.success;
      toast({
        title: ok ? "Email generated" : "Generation failed",
        description: ok
          ? "The new draft is on this lead's timeline."
          : result?.error || "Please try again.",
        variant: ok ? "default" : "destructive",
      });
    }
  }, [jobStatus, activeJobId, job, toast]);

  const lead = data?.lead;
  const emails = data?.emails ?? [];
  const activities = data?.activities ?? [];
  const stats = data?.stats;

  const latestUnsent = useMemo(
    () => emails.find((email: any) => email.sendStatus !== "sent"),
    [emails]
  );

  if (isLoading) {
    return <LeadDetailSkeleton />;
  }

  if (isError || !lead) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-surface-800/40 px-6 py-16 text-center">
        <p className="text-xl font-semibold text-gray-200">Lead not found</p>
        <p className="mt-2 text-sm text-gray-400">
          {(error as any)?.response?.data?.message ||
            "This lead may have been deleted or you don’t have access."}
        </p>
        <Button
          type="button"
          className="mt-6 bg-brand text-white hover:bg-brand-400"
          onClick={() => navigate("/dashboard/leads")}
        >
          Back to leads
        </Button>
      </div>
    );
  }

  const handleSaveProfile = async (updates: any) => {
    try {
      await updateLead.mutateAsync(updates);
      toast({ title: "Lead updated" });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err.message,
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
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleAddFollowUp = async (payload: { dueAt: string | Date; note?: string }) => {
    try {
      await addFollowUp.mutateAsync(payload);
      toast({ title: "Follow-up scheduled" });
      setFollowUpOpen(false);
    } catch (err: any) {
      toast({
        title: "Could not schedule follow-up",
        description: err?.response?.data?.message || err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleGenerate = () => {
    if (!leadId) return;
    generateBatch.mutate(
      { leadIds: [leadId], instructions },
      {
        onSuccess: (result: any) => {
          setActiveJobId(result.jobId);
        },
        onError: (err: any) => {
          toast({
            title: "Generation failed",
            description:
              err?.response?.data?.message || err.message || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const runMark = (emailId: string) => {
    markSent.mutate(emailId, {
      onSuccess: () => toast({ title: "Marked as sent" }),
      onError: (err: any) =>
        toast({
          title: "Could not mark sent",
          description: err?.response?.data?.message || err.message,
          variant: "destructive",
        }),
    });
  };

  const runUnmark = (emailId: string) => {
    unmarkSent.mutate(emailId, {
      onSuccess: () => toast({ title: "Unmarked as sent" }),
      onError: (err: any) =>
        toast({
          title: "Could not undo",
          description: err?.response?.data?.message || err.message,
          variant: "destructive",
        }),
    });
  };

  const handleVerifyEmail = async () => {
    if (!leadId) return;
    try {
      const res = await verifyEmail.mutateAsync(leadId);
      const status = res?.verification?.status || "checked";
      const score = res?.verification?.score;
      toast({
        title: "Email deliverability verified",
        description: `Status: ${status.toUpperCase()}${score !== undefined ? ` (Score: ${score}/100)` : ""}`,
      });
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.response?.data?.message || err.message || "Could not verify email.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      <Seo title={`${lead.name} · Lead`} path={`/dashboard/leads/${leadId}`} noIndex />

      <LeadDetailHeader
        lead={lead}
        onAddFollowUp={() => setFollowUpOpen(true)}
        onGenerate={() => setGenerateOpen(true)}
        onMarkLatestSent={() => latestUnsent && runMark(latestUnsent._id)}
        isGenerating={generateBatch.isPending}
        isMarkingSent={markSent.isPending}
        canMarkLatestSent={Boolean(latestUnsent)}
      />

      <LeadStatsStrip stats={stats} />

      <LeadDeliverabilityCard
        lead={lead}
        onVerify={handleVerifyEmail}
        isVerifying={verifyEmail.isPending}
      />

      <LeadProfileForm
        lead={lead}
        onSave={handleSaveProfile}
        isSaving={updateLead.isPending}
        categories={categories}
        onAddCategory={() => setCategoryOpen(true)}
      />

      <LeadTimeline
        activities={activities}
        emails={emails}
        followUps={lead.followUps || []}
        onMarkSent={runMark}
        onUnmarkSent={runUnmark}
        markingEmailId={
          markSent.isPending
            ? markSent.variables
            : unmarkSent.isPending
              ? unmarkSent.variables
              : null
        }
        updatingFollowUpId={
          updateFollowUp.isPending
            ? (updateFollowUp.variables as any)?.followUpId
            : deleteFollowUp.isPending
              ? deleteFollowUp.variables
              : null
        }
        onCompleteFollowUp={(followUpId: string) =>
          updateFollowUp.mutate(
            { followUpId, status: "done" },
            {
              onSuccess: () => toast({ title: "Follow-up completed" }),
              onError: (err: any) =>
                toast({
                  title: "Update failed",
                  description: err?.response?.data?.message || err.message,
                  variant: "destructive",
                }),
            }
          )
        }
        onSkipFollowUp={(followUpId: string) =>
          updateFollowUp.mutate(
            { followUpId, status: "skipped" },
            {
              onSuccess: () => toast({ title: "Follow-up skipped" }),
              onError: (err: any) =>
                toast({
                  title: "Update failed",
                  description: err?.response?.data?.message || err.message,
                  variant: "destructive",
                }),
            }
          )
        }
        onDeleteFollowUp={(followUpId: string) =>
          deleteFollowUp.mutate(followUpId, {
            onSuccess: () => toast({ title: "Follow-up removed" }),
            onError: (err: any) =>
              toast({
                title: "Delete failed",
                description: err?.response?.data?.message || err.message,
                variant: "destructive",
              }),
          })
        }
      />

      <AddFollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        onSubmit={handleAddFollowUp}
        isSubmitting={addFollowUp.isPending}
      />

      <AddCategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        onSubmit={handleCreateCategory}
        isSubmitting={createCategory.isPending}
      />

      <Dialog open={generateOpen} onOpenChange={(val) => {
        const terminalStatuses = ["completed", "completed_with_errors", "failed", "cancelled"];
        const isJobRunning = !!activeJobId && !terminalStatuses.includes(jobStatus || "");
        if (!isJobRunning) setGenerateOpen(val);
      }}>
        <DialogContent className="max-w-xl border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
            <DialogTitle className="text-xl font-semibold text-white">
              Generate email for {lead.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Optional instructions are combined with this lead&apos;s profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4 pt-0 py-5">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={generateBatch.isPending || !!activeJobId}
              placeholder="Mention our new pricing, ask for a 15-min intro…"
              className="min-h-[160px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
            />
            <DialogFooter className="gap-3 border-t border-white/10 px-0 pb-0 pt-4 sm:space-x-0">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={generateBatch.isPending || !!activeJobId}
                  className="text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={generateBatch.isPending || !!activeJobId}
                onClick={handleGenerate}
                className="bg-brand text-white hover:bg-brand-400"
              >
                {generateBatch.isPending || !!activeJobId ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
