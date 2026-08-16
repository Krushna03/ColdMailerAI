import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Calendar, UserRound, CreditCard, Mail, Shield, Sparkles } from "lucide-react";
import Seo from "../components/common/Seo";
import { PlanUsageNotice } from "../components/email/PlanUsageNotice";
import { usePlanUsage } from "../hooks/usePlanUsage";
import { formatDate } from "../components/payment/utils";
import { getUserData } from "../utils";

function DetailRow({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
      <span className="mt-0.5 rounded-lg bg-brand/15 p-2 text-brand-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const storedUser = getUserData();
  const reduxUser = useSelector((state) => state.auth.userData);
  const user = reduxUser || storedUser;
  const { planUsage, usageLoading } = usePlanUsage();

  const initial = (user?.username || user?.email || "U").charAt(0).toUpperCase();
  const authLabel =
    user?.authProvider === "google"
      ? "Google"
      : user?.authProvider
        ? String(user.authProvider)
        : "Email & password";

  return (
    <div className="space-y-7">
      <Seo title="Profile" path="/dashboard/profile" noIndex />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-200">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Your profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Account details, plan status, and current usage for your ColdMailerAI workspace.
          </p>
        </div>
        <NavLink
          to="/dashboard/pricing"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-400"
        >
          <CreditCard className="h-4 w-4" />
          Manage plan
        </NavLink>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-brand/20 text-2xl font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-white">
              {user?.username || "ColdMailer user"}
            </h2>
            <p className="mt-1 truncate text-sm text-gray-400">{user?.email || "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                {user?.planName || "Free"} plan
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  user?.isPaidUser
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-gray-300"
                }`}
              >
                {user?.isPaidUser ? "Premium active" : "Starter access"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <DetailRow icon={UserRound} label="Username" value={user?.username} />
          <DetailRow icon={Mail} label="Email" value={user?.email} />
          <DetailRow icon={Shield} label="Sign-in method" value={authLabel} />
          <DetailRow
            icon={CreditCard}
            label="Current plan"
            value={user?.planName || "Free"}
          />
          <DetailRow
            icon={Calendar}
            label="Member since"
            value={formatDate(user?.createdAt)}
          />
          <DetailRow
            icon={Sparkles}
            label="Plan activated"
            value={formatDate(user?.planActivatedAt)}
          />
          <DetailRow
            icon={Calendar}
            label="Plan expires"
            value={
              user?.isPaidUser
                ? formatDate(user?.planExpiresAt)
                : "Not scheduled"
            }
          />
          <DetailRow
            icon={Shield}
            label="Billing status"
            value={user?.isPaidUser ? "Active" : "Free / trial"}
          />
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 text-lg font-semibold text-white">Usage this month</h2>
        <PlanUsageNotice
          usage={planUsage}
          loading={usageLoading}
          onUpgrade={() => navigate("/dashboard/pricing")}
          className="w-full"
        />
        <NavLink
          to="/dashboard/pricing"
          className="mt-3 inline-flex text-sm text-brand-200 hover:text-white"
        >
          View pricing and upgrade options
        </NavLink>
      </section>
    </div>
  );
}
