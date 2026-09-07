import { ArrowRight, CreditCard, Mail, Infinity, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import Seo from "../components/common/Seo";
import { useLeads } from "../hooks/useLeads";
import { useEmailHistory } from "../hooks/useEmail";
import { usePlanUsage } from "../hooks/usePlanUsage";
import { getUserData } from "../utils";

const quickActions = [
  {
    title: "Manage leads",
    description: "Add recipients, import a CSV, and prepare a batch.",
    to: "/dashboard/leads",
  },
  {
    title: "Generate email",
    description: "Open the focused AI email writing workspace.",
    to: "/generate-email",
  },
  {
    title: "View pricing",
    description: "Review your plan, usage, billing, and upgrades.",
    to: "/dashboard/pricing",
  },
];

export default function Dashboard() {
  const storedUser = getUserData();
  const reduxUser = useSelector((state) => state.auth.userData);
  const user = reduxUser || storedUser;
  const userId = user?._id || null;

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError } = useLeads();
  const {
    data: emailData,
    isLoading: emailsLoading,
    isError: emailsError,
  } = useEmailHistory(userId);
  const { planUsage, usageLoading } = usePlanUsage();

  const firstLeadPage = leadsData?.pages?.[0];
  const recentLeads = firstLeadPage?.leads?.slice(0, 5) ?? [];
  const recentEmails = emailData?.pages?.[0]?.emails?.slice(0, 5) ?? [];
  const monthly = planUsage?.usage?.monthlyEmailGenerations;
  const limit = monthly?.limit;
  const used = monthly?.used ?? 0;
  const remaining = typeof limit === "number" ? Math.max(limit - used, 0) : "Unlimited";
  const resetDate = monthly?.windowEnd ? new Date(monthly.windowEnd) : null;
  const resetLabel = resetDate
    ? `Resets on ${resetDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : null;

  const summaryCards = [
    {
      label: "Total leads",
      value: leadsLoading ? "—" : firstLeadPage?.total ?? 0,
      detail: "Saved recipients",
      icon: Users,
    },
    {
      label: "Generated this month",
      value: usageLoading ? "—" : used,
      detail: resetLabel || "Individual and batch emails",
      icon: Mail,
    },
    {
      label: "Remaining quota",
      value: usageLoading ? "—" : remaining,
      detail:
        typeof limit === "number"
          ? `of ${limit} monthly${resetLabel ? ` · ${resetLabel}` : ""}`
          : resetLabel || "No monthly cap",
      icon: Infinity,
    },
    {
      label: "Current plan",
      value: user?.planName || "Free",
      detail: user?.isPaidUser ? "Premium access active" : "Starter access",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-6 font-sans">
      <Seo title="Dashboard" path="/dashboard" noIndex />

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Outreach Overview
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Track lead engagement, monitor email quota, and manage outbound workflows.
          </p>
        </div>
        <NavLink
          to="/generate-email"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-400 shadow-none"
        >
          Generate Email
        </NavLink>
      </section>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const SummaryIcon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-lg border border-white/10 bg-surface-900 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
                  <SummaryIcon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">{card.value}</p>
              <p className="mt-1 text-xs text-gray-400">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            return (
              <NavLink
                key={action.to}
                to={action.to}
                className="group rounded-lg border border-white/10 bg-surface-900 p-5 transition hover:border-white/20 hover:bg-white/5"
              >
                <p className="mt-1 text-base font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">{action.description}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white">
                  Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </NavLink>
            );
          })}
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
            <h2 className="text-sm sm:text-base font-semibold text-white">Recent leads</h2>
            <NavLink to="/dashboard/leads" className="text-xs sm:text-sm font-medium text-brand-300 hover:text-white">
              View all
            </NavLink>
          </div>
          <div className="divide-y divide-white/5">
            {leadsLoading ? (
              <p className="p-4 text-xs sm:text-sm text-gray-400">Loading leads...</p>
            ) : leadsError ? (
              <p className="p-4 text-xs sm:text-sm text-red-400">Could not load leads.</p>
            ) : recentLeads.length ? (
              recentLeads.map((lead) => (
                <div
                  key={lead._id}
                  className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">{lead.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {[lead.role, lead.company].filter(Boolean).join(" at ") || "No company details"}
                    </p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                    {lead.email || "—"}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-4 text-xs sm:text-sm text-gray-400">No leads found. Add your first recipient.</p>
            )}
          </div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
            <h2 className="text-sm sm:text-base font-semibold text-white">Recent generated emails</h2>
            <NavLink to="/generate-email" className="text-xs sm:text-sm font-medium text-brand-300 hover:text-white">
              Generate new
            </NavLink>
          </div>
          <div className="divide-y divide-white/5">
            {emailsLoading ? (
              <p className="p-4 text-xs sm:text-sm text-gray-400">Loading emails...</p>
            ) : emailsError ? (
              <p className="p-4 text-xs sm:text-sm text-red-400">Could not load email history.</p>
            ) : recentEmails.length ? (
              recentEmails.map((email) => (
                <NavLink
                  key={email._id}
                  to={`/email/history/${email._id}`}
                  className="flex min-w-0 items-center gap-4 px-5 py-3 transition hover:bg-white/5"
                >
                  <p className="min-w-0 flex-1 truncate text-xs sm:text-sm text-gray-200">
                    {email.prompt}
                  </p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
                </NavLink>
              ))
            ) : (
              <p className="p-4 text-xs sm:text-sm text-gray-400">No generated emails yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
