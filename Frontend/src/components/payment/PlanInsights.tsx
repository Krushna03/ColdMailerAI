import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDaysLabel } from "./utils";

interface PlanInsightsProps {
  user?: any;
  paymentHistory?: any;
  planActivatedAt?: string | Date | null;
  planExpiresAt?: string | Date | null;
  daysUntilExpiry?: number | null;
  reminderWindowDays?: number;
  usageResetLabel?: string | null;
}

const PlanInsights: React.FC<PlanInsightsProps> = ({
  user,
  paymentHistory,
  planActivatedAt,
  planExpiresAt,
  daysUntilExpiry,
  reminderWindowDays,
  usageResetLabel,
}) => (
  <div className="rounded-lg border border-white/10 bg-surface-900 p-4 sm:p-5 font-sans">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-sm sm:text-base font-semibold text-white">Plan Insights</h2>
        <p className="text-xs text-gray-400 mt-0.5">Real-time overview of your membership status.</p>
      </div>
      <Badge className="bg-brand/10 text-brand-300 border border-brand/20 text-[11px] px-2 py-0.5 font-medium">
        {user?.isPaidUser ? "Pro access" : "Free tier"}
      </Badge>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <InsightCard
        label="Emails / month"
        value={user?.isPaidUser ? "100" : "10"}
        helper={usageResetLabel || "Based on your current plan"}
      />
      <InsightCard
        label="Plan activated"
        value={user?.isPaidUser && planActivatedAt ? formatDate(planActivatedAt) : "--"}
        helper={user?.isPaidUser ? "Current billing cycle" : "Upgrade to activate"}
      />
      <InsightCard
        label="Plan expires"
        value={user?.isPaidUser && planExpiresAt ? formatDate(planExpiresAt) : "--"}
        helper={
          user?.isPaidUser
            ? (typeof daysUntilExpiry === "number" && daysUntilExpiry > 0
                ? `${formatDaysLabel(daysUntilExpiry)} left • reminder ${reminderWindowDays || 2} days prior`
                : "Renew now to stay active")
            : "Renewal reminders unlock on upgrade"
        }
      />
      <InsightCard
        label="Member since"
        value={formatDate(paymentHistory?.memberSince || user?.createdAt)}
        helper="Thank you for building with us"
      />
    </div>
  </div>
);

const InsightCard: React.FC<{ label: string; value: string; helper: string }> = ({ label, value, helper }) => (
  <div className="rounded-md border border-white/10 bg-surface-950 p-3.5">
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-base sm:text-lg font-semibold text-white mt-1 font-mono">{value}</p>
    <p className="text-[11px] text-gray-400 mt-1">{helper}</p>
  </div>
);

export default PlanInsights;
