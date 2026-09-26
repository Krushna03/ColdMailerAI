import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BellRing, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePayment, usePaymentPlans, usePaymentHistory } from "../../hooks/usePayment";
import { usePlanUsage } from "../../hooks/usePlanUsage";
import { ensureAuthenticated, useLogout } from "../../helpers/tokenValidation";
import HeroSection from "./HeroSection";
import Highlights from "./Highlights";
import PlanInsights from "./PlanInsights";
import PlanGrid from "./PlanGrid";
import HistoryModal from "./HistoryModal";
import EnterpriseContactDialog from "./EnterpriseContactDialog";
import { formatDate, formatDaysLabel, getDaysUntil } from "./utils";
import { login } from "@/context/authSlice";
import { getToken, getUserData } from "../../utils";
import Seo from "../common/Seo";
import { RootState } from "../../context/store";

const DEFAULT_REMINDER_WINDOW_DAYS = 2;

const PaymentComponent: React.FC = () => {
  const {
    loading: paymentLoading,
    error,
    success,
    processPayment,
    resetPaymentState,
  } = usePayment();
  const dispatch = useDispatch();

  const [showHistory, setShowHistory] = useState(false);
  const [showEnterpriseContact, setShowEnterpriseContact] = useState(false);

  const token = getToken();
  const userData = useSelector((state: RootState) => state.auth.userData);
  const storedUserData = useMemo(() => getUserData(), []);
  const user = userData || storedUserData || null;

  const { data: plans = [], isLoading: plansLoading } = usePaymentPlans();

  const {
    data: paymentHistory,
    isFetching: historyLoading,
    refetch: refetchPaymentHistory,
  } = usePaymentHistory(Boolean(token && user));
  const { planUsage } = usePlanUsage();

  const usageResetLabel = useMemo(() => {
    const windowEnd = planUsage?.usage?.monthlyEmailGenerations?.windowEnd;
    if (!windowEnd) return null;
    const resetDate = new Date(windowEnd);
    if (Number.isNaN(resetDate.getTime())) return null;
    return `Resets on ${resetDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }, [planUsage]);

  const syncUserPlanWithHistory = useCallback((historySnapshot: any) => {
    if (!historySnapshot || !user) return;

    const hasPlanChanged =
      user.isPaidUser !== historySnapshot.isPaidUser ||
      user.planName !== historySnapshot.currentPlan ||
      user.planActivatedAt !== historySnapshot.planActivatedAt ||
      user.planExpiresAt !== historySnapshot.planExpiresAt;

    if (!hasPlanChanged) return;

    const updatedUserSnapshot = {
      ...user,
      isPaidUser: historySnapshot.isPaidUser,
      planName: historySnapshot.currentPlan,
      planActivatedAt: historySnapshot.planActivatedAt,
      planExpiresAt: historySnapshot.planExpiresAt
    };

    dispatch(login(updatedUserSnapshot));
  }, [dispatch, user]);

  const logoutUser = useLogout();
  const { toast } = useToast();

  useEffect(() => {
    if (paymentHistory) {
      syncUserPlanWithHistory(paymentHistory);
    }
  }, [paymentHistory, syncUserPlanWithHistory]);

  const handleHistoryModal = () => {
    if (paymentHistory) {
      setShowHistory(true);
      return;
    }
    refetchPaymentHistory().then(() => setShowHistory(true));
  };

  const handlePayment = useCallback(async (planId: string) => {
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
        phone: user?.phoneNumber || user?.contactNumber || ""
      });
      await refetchPaymentHistory();
    } catch (err) {
      console.error("Payment failed:", err);
    }
  }, [
    token,
    logoutUser,
    plans,
    toast,
    user,
    resetPaymentState,
    processPayment,
    refetchPaymentHistory
  ]);

  const reminderWindowDays = paymentHistory?.reminderWindowInDays || DEFAULT_REMINDER_WINDOW_DAYS;

  const paidPlanId = useMemo(() => plans.find((plan: any) => plan.requiresPayment)?.id, [plans]);

  const { planActivatedAt, planExpiryDate, daysUntilExpiry } = useMemo(() => {
    const activation = user?.planActivatedAt || paymentHistory?.planActivatedAt || null;
    const expiryRaw = user?.planExpiresAt || paymentHistory?.planExpiresAt || null;
    const expiryDate = expiryRaw ? new Date(expiryRaw) : null;

    let computedDays = typeof paymentHistory?.daysUntilExpiry === "number"
      ? paymentHistory.daysUntilExpiry
      : getDaysUntil(expiryDate);

    if (Number.isNaN(computedDays)) {
      computedDays = null;
    }

    return {
      planActivatedAt: activation,
      planExpiryDate: expiryDate,
      daysUntilExpiry: typeof computedDays === "number" ? computedDays : null
    };
  }, [paymentHistory, user]);

  const shouldShowRenewalReminder = Boolean(
    user?.isPaidUser &&
      typeof daysUntilExpiry === "number" &&
      daysUntilExpiry > 0 &&
      daysUntilExpiry <= reminderWindowDays
  );

  const handleRenewalClick = useCallback(() => {
    if (!paidPlanId) {
      toast({
        title: "Plan unavailable",
        description: "Please refresh the pricing plans and try again.",
        variant: "destructive",
      });
      return;
    }
    handlePayment(paidPlanId);
  }, [paidPlanId, handlePayment, toast]);
  
  const highlightCards = useMemo(() => {
    const membershipDate = paymentHistory?.memberSince || user?.createdAt || null;

    return [
      {
        title: "Current Plan",
        value: user?.planName || "Free",
        subtext: user?.isPaidUser ? "Premium access active" : "Free tier running",
        icon: ShieldCheck,
      },
      {
        title: "Billing Status",
        value: user?.isPaidUser ? "Active" : "Trial",
        subtext: user?.isPaidUser
          ? (planActivatedAt ? `Cycle started ${formatDate(planActivatedAt)}` : "Premium benefits unlocked")
          : "No payments yet",
        icon: Sparkles,
      },
      {
        title: "Member Since",
        value: formatDate(membershipDate),
        subtext: "Thanks for growing with us",
        icon: Clock,
      },
      {
        title: "Next Renewal",
        value: user?.isPaidUser && planExpiryDate ? formatDate(planExpiryDate) : "Not scheduled",
        subtext: user?.isPaidUser
          ? (typeof daysUntilExpiry === "number" && daysUntilExpiry > 0
              ? `${formatDaysLabel(daysUntilExpiry)} remaining`
              : "Renew to stay active")
          : "Upgrade to enable renewals",
        icon: BellRing,
      },
    ];
  }, [user, paymentHistory, planActivatedAt, planExpiryDate, daysUntilExpiry]);

  return (
    <>
      <Seo title="Upgrade Plan" path="/dashboard/pricing" noIndex />
      <div className="space-y-6 font-sans">
        <HeroSection  
          user={user}
          paidPlanId={paidPlanId}
          plansLoading={plansLoading}
          paymentLoading={paymentLoading}
          historyLoading={historyLoading}
          onUpgrade={handlePayment}
          onHistory={handleHistoryModal}
        />

        {shouldShowRenewalReminder && planExpiryDate && (
          <RenewalReminder
            expiresOn={planExpiryDate}
            daysLeft={daysUntilExpiry}
            onRenew={handleRenewalClick}
            disabled={!paidPlanId || paymentLoading || plansLoading}
          />
        )}

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-300">
            {error}
          </div>
        )}

        <Highlights cards={highlightCards} />

        <PlanInsights
          user={user}
          paymentHistory={paymentHistory}
          planActivatedAt={planActivatedAt}
          planExpiresAt={planExpiryDate}
          daysUntilExpiry={daysUntilExpiry}
          reminderWindowDays={reminderWindowDays}
          usageResetLabel={usageResetLabel}
        />

        <PlanGrid
          plans={plans}
          plansLoading={plansLoading}
          user={user}
          onSelectPlan={handlePayment}
        />

        {success && (
          <div className="flex justify-center">
            <Badge className="bg-green-500/20 text-green-200 border border-green-400/30">
              Payment verified!
            </Badge>
          </div>
        )}
      </div>

      <HistoryModal
        open={showHistory && Boolean(paymentHistory)}
        paymentHistory={paymentHistory}
        loading={historyLoading}
        onClose={() => setShowHistory(false)}
      />

      <EnterpriseContactDialog
        open={showEnterpriseContact}
        onOpenChange={setShowEnterpriseContact}
        defaultName={user?.username || ""}
        defaultEmail={user?.email || ""}
      />
    </>
  );
};

interface RenewalReminderProps {
  expiresOn: Date;
  daysLeft?: number | null;
  onRenew: () => void;
  disabled?: boolean;
}

const RenewalReminder: React.FC<RenewalReminderProps> = ({ expiresOn, daysLeft, onRenew, disabled }) => (
  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between font-sans">
    <div className="flex items-center gap-3">
      <BellRing className="h-4 w-4 text-amber-400 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-white">Plan expires soon</p>
        <p className="text-xs text-amber-200/80">
          Renew by {formatDate(expiresOn)} to avoid interruptions — {formatDaysLabel(daysLeft)} remaining.
        </p>
      </div>
    </div>
    <Button
      onClick={onRenew}
      disabled={disabled}
      className="bg-white text-black hover:bg-gray-200 h-8 px-3 text-xs font-medium rounded-md shrink-0 shadow-none"
    >
      Renew plan
    </Button>
  </div>
);

export default PaymentComponent;
