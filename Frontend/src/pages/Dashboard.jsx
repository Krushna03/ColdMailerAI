import { ArrowRight, CreditCard, Mail, Sparkles, Users } from "lucide-react";
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
    icon: Users,
  },
  {
    title: "Generate email",
    description: "Open the focused AI email writing workspace.",
    to: "/generate-email",
    icon: Sparkles,
  },
  {
    title: "View pricing",
    description: "Review your plan, usage, billing, and upgrades.",
    to: "/dashboard/pricing",
    icon: CreditCard,
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
      icon: Sparkles,
    },
    {
      label: "Current plan",
      value: user?.planName || "Free",
      detail: user?.isPaidUser ? "Premium access active" : "Starter access",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-hidden">
      <Seo title="Dashboard" path="/dashboard" noIndex />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Your outreach dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Track lead activity, generation usage, and the next actions that move
            your outreach forward.
          </p>
        </div>
        <NavLink
          to="/generate-email"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-400"
        >
          <Sparkles className="h-4 w-4" />
          Generate Email
        </NavLink>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const SummaryIcon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-400">{card.label}</p>
                <span className="rounded-xl bg-brand/15 p-2 text-brand-200">
                  <SummaryIcon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Quick actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <NavLink
                key={action.to}
                to={action.to}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand/40 hover:bg-white/[0.06]"
              >
                <ActionIcon className="h-5 w-5 text-brand-200" />
                <p className="mt-4 font-medium text-white">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-400">{action.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-brand-200">
                  Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </NavLink>
            );
          })}
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Recent leads</h2>
            <NavLink to="/dashboard/leads" className="text-sm text-brand-200 hover:text-white">
              View all
            </NavLink>
          </div>
          <div className="divide-y divide-white/5">
            {leadsLoading ? (
              <p className="p-5 text-sm text-gray-400">Loading leads...</p>
            ) : leadsError ? (
              <p className="p-5 text-sm text-red-300">Could not load leads.</p>
            ) : recentLeads.length ? (
              recentLeads.map((lead) => (
                <div
                  key={lead._id}
                  className="flex min-w-0 items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{lead.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {[lead.role, lead.company].filter(Boolean).join(" at ") || "No company details"}
                    </p>
                  </div>
                  <span className="min-w-0 truncate text-xs text-gray-500">
                    {lead.email || "No email"}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-gray-400">No leads yet. Add your first recipient.</p>
            )}
          </div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Recent emails</h2>
            <NavLink to="/generate-email" className="text-sm text-brand-200 hover:text-white">
              Generate new
            </NavLink>
          </div>
          <div className="divide-y divide-white/5">
            {emailsLoading ? (
              <p className="p-5 text-sm text-gray-400">Loading emails...</p>
            ) : emailsError ? (
              <p className="p-5 text-sm text-red-300">Could not load email history.</p>
            ) : recentEmails.length ? (
              recentEmails.map((email) => (
                <NavLink
                  key={email._id}
                  to={`/email/history/${email._id}`}
                  className="flex min-w-0 items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.03]"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-gray-200">
                    {email.prompt}
                  </p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-600" />
                </NavLink>
              ))
            ) : (
              <p className="p-5 text-sm text-gray-400">No generated emails yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
