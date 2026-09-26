import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPlanAmount } from "./utils";

export interface PlanItem {
  id: string;
  name: string;
  amount: number;
  currency?: string;
  billingPeriod?: string;
  description?: string;
  features?: string[];
  popular?: boolean;
  requiresPayment?: boolean;
  isCustom?: boolean;
  buttonText?: string;
}

interface PlanGridProps {
  plans: PlanItem[];
  plansLoading: boolean;
  user?: any;
  onSelectPlan: (planId: string) => void;
}

const PlanGrid: React.FC<PlanGridProps> = ({ plans, plansLoading, user, onSelectPlan }) => {
  if (plansLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 font-sans">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`plan-skeleton-${index}`}
            className="rounded-lg border border-white/10 bg-surface-900 p-5 animate-pulse space-y-3"
          >
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-8 w-20 rounded bg-white/10" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 4 }).map((__, featureIdx) => (
                <div key={featureIdx} className="h-3 w-full rounded bg-white/5" />
              ))}
            </div>
            <div className="h-8 w-full rounded bg-white/10 mt-4" />
          </div>
        ))}
      </section>
    );
  }

  if (!plans.length) {
    return (
      <section className="rounded-lg border border-white/10 bg-surface-900 p-6 text-center text-xs text-gray-400 font-sans">
        No plans available at the moment. Please check back later.
      </section>
    );
  }

  const hasActivePlan = user?.isPaidUser && user?.planName && user.planName !== "Free";

  return (
    <section className="space-y-6 font-sans">
      <div className="flex items-center justify-center text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Plans</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">Choose what fits your workflow</h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan =
            user?.planName?.toLowerCase() === plan.name?.toLowerCase() && hasActivePlan;
          const isCustomPlan = Boolean(plan.isCustom);
          const isFreePlan = !plan.requiresPayment && !isCustomPlan;
          const isDisabled = isFreePlan || isCurrentPlan;

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border bg-surface-900 p-5 sm:p-6 transition-colors ${
                plan.popular ? "border-brand ring-1 ring-brand/40" : "border-white/10"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-3 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wider">
                  Most popular
                </span>
              )}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {plan.billingPeriod || "one-time"}
                </p>
                <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                  <span>{plan.name}</span>
                  {isCurrentPlan && (
                    <Badge className="bg-white/10 text-white border-white/20 text-xs px-2.5 py-0.5">Current</Badge>
                  )}
                </h3>
                <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight font-mono">
                  {isCustomPlan
                    ? "Custom"
                    : formatPlanAmount(plan.amount, plan.currency || "USD")}
                  {!isCustomPlan && plan.amount > 0 && (
                    <span className="text-sm font-normal text-gray-400 font-sans">
                      {" "}
                      / {plan.billingPeriod || "month"}
                    </span>
                  )}
                  {isCustomPlan && (
                    <span className="text-sm font-normal text-gray-400 font-sans"> pricing</span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{plan.description}</p>
                )}
                <ul className="space-y-2 text-xs sm:text-sm text-gray-300 pt-1">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => onSelectPlan(plan.id)}
                disabled={isDisabled}
                className={`mt-6 w-full h-9 text-xs sm:text-sm font-semibold rounded-md shadow-none ${
                  isDisabled
                    ? "cursor-not-allowed bg-surface-950 text-gray-500 border border-white/5"
                    : "bg-brand text-white hover:bg-brand-400"
                }`}
              >
                {isFreePlan
                  ? "Included in workspace"
                  : isCurrentPlan
                    ? "Current plan"
                    : plan.buttonText || (isCustomPlan ? "Contact sales" : "Choose Plan")}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PlanGrid;
