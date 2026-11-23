import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { CheckCircle2, AlertTriangle, ShieldCheck, Zap, Dot, DotIcon } from "lucide-react";
import PlanGrid from "./PlanGrid";
import EnterpriseContactDialog from "./EnterpriseContactDialog";
import { usePayment, usePaymentPlans, usePaymentHistory } from "../../hooks/usePayment";
import { ensureAuthenticated, useLogout } from "../../helpers/tokenValidation";
import { getToken, getUserData } from "../../utils";
import { useToast } from "@/hooks/use-toast";
import { RootState } from "../../context/store";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const token = getToken();
  const userData = useSelector((state: RootState) => state.auth.userData);
  const storedUser = useMemo(() => getUserData(), []);
  const user = userData || storedUser || null;
  const logoutUser = useLogout();
  const { toast } = useToast();

  const [showEnterpriseContact, setShowEnterpriseContact] = useState(false);

  const { data: plans = [], isLoading: plansLoading } = usePaymentPlans();
  const { refetch: refetchPaymentHistory } = usePaymentHistory(Boolean(token && user));

  const {
    loading: paymentLoading,
    error: paymentError,
    success: paymentSuccess,
    processPayment,
    resetPaymentState,
  } = usePayment();

  const handlePayment = useCallback(
    async (planId: string) => {
      if (!ensureAuthenticated(token, logoutUser)) return;

      const selectedPlan = plans.find((plan: any) => plan.id === planId);
      if (!selectedPlan) {
        toast({
          title: "Plan unavailable",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedPlan.requiresPayment) {
        if (selectedPlan.isCustom) {
          setShowEnterpriseContact(true);
          return;
        }
        toast({
          title: "No payment required",
          description: "This plan is already included in your account.",
        });
        return;
      }

      if (user?.isPaidUser && user?.planName && user.planName !== "Free") {
        toast({
          title: "Plan already active",
          description: `You already have the ${user.planName} plan.`,
        });
        return;
      }

      try {
        resetPaymentState();
        await processPayment(selectedPlan.id, {
          username: user?.username,
          email: user?.email,
          userId: user?._id,
          phone: (user as any)?.phoneNumber || (user as any)?.contactNumber || "",
        });
        await refetchPaymentHistory();
      } catch (err) {
        console.error("Payment failed:", err);
      }
    },
    [token, logoutUser, plans, toast, user, resetPaymentState, processPayment, refetchPaymentHistory]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] sm:w-full p-6 max-h-[90vh] overflow-y-auto custom-scroll rounded-xl border border-white/10 bg-surface-900 shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/10 pb-4 pr-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              PLANS & UPGRADES
            </p>
            <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-1">
              Choose what fits your workflow
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Scale your outbound outreach volume with high-deliverability AI email generation, multi-channel sequences, and dedicated mailbox integration.
            </DialogDescription>
          </div>

          {/* Status Feedback */}
          {paymentSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-300 flex items-center gap-2.5 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Payment verified successfully! Your account tier has been updated.</span>
            </div>
          )}

          {paymentError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-red-300 flex items-center gap-2.5 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Plan Grid */}
          <div className="py-2">
            <PlanGrid
              plans={plans}
              plansLoading={plansLoading || paymentLoading}
              user={user}
              onSelectPlan={handlePayment}
            />
          </div>

          {/* Trust badges footer */}
          <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-0.5 text-gray-300">
               {" •  "} Secure 256-bit encryption
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                {" •  "} Instant activation
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              Cancel or switch anytime
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <EnterpriseContactDialog
        open={showEnterpriseContact}
        onOpenChange={setShowEnterpriseContact}
        defaultName={user?.username || ""}
        defaultEmail={user?.email || ""}
      />
    </>
  );
}
