import React from "react";
import { ArrowRight, History as HistoryIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeroSectionProps {
  user?: any;
  paidPlanId?: string;
  plansLoading: boolean;
  paymentLoading: boolean;
  historyLoading: boolean;
  onUpgrade: (planId: string) => void;
  onHistory: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  user,
  paidPlanId,
  plansLoading,
  paymentLoading,
  historyLoading,
  onUpgrade,
  onHistory,
}) => (
  <section className="text-center space-y-3.5 font-sans">
    <Badge className="border border-white/10 bg-white/5 text-gray-300 text-xs px-3 py-0.5 font-medium">
      Billing & Access
    </Badge>
    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      Manage Your Plan
    </h1>
    <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
      Upgrade, verify and track every payment without leaving the workspace. Real-time access and automation limits stay synchronized.
    </p>
    <div className="flex flex-wrap justify-center gap-3 pt-1">
      {!user?.isPaidUser && (
        <Button
          onClick={() => paidPlanId && onUpgrade(paidPlanId)}
          disabled={plansLoading || paymentLoading || !paidPlanId}
          className="bg-brand hover:bg-brand-400 text-white h-9 px-5 text-sm font-semibold rounded-md shadow-none"
        >
          {plansLoading || paymentLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing checkout...
            </>
          ) : (
            <>
              Upgrade plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
      <Button
        variant="outline"
        onClick={onHistory}
        disabled={historyLoading}
        className="border-white/15 bg-surface-900 text-white hover:bg-white/5 h-9 px-4 text-sm font-medium rounded-md"
      >
        <HistoryIcon className="mr-2 h-4 w-4" />
        {historyLoading ? "Syncing history..." : "View history"}
      </Button>
    </div>
  </section>
);

export default HeroSection;
