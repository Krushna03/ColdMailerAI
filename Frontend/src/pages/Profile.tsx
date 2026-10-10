import React, { useState, useEffect } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  CreditCard,
  ArrowRight,
  Copy,
  Check,
  Lock,
  UserRound,
  Sliders,
  Shield,
  Sparkles,
  LogOut,
  Save,
  Laptop,
  CheckCircle2,
  Mail,
  Zap,
  Clock,
  Workflow,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import Seo from "../components/common/Seo";
import { useCurrentUser } from "../hooks/useUser";
import { usePlanUsage } from "../hooks/usePlanUsage";
import { usePaymentHistory } from "../hooks/usePayment";
import { formatDate } from "../components/payment/utils";
import { getUserData, getToken } from "../utils";
import { User } from "../types/user";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { useLogout } from "../helpers/tokenValidation";
import { login } from "../context/authSlice";
import { useTheme } from "../context/ThemeContext";

const GoogleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
    />
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
    />
    <path
      fill="#FBBC05"
      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
    />
    <path
      fill="#34A853"
      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
    />
  </svg>
);

type SettingsTab = "profile" | "preferences" | "security" | "billing";

interface UserPreferences {
  defaultTone: string;
  autoStopOnReply: boolean;
  verifyDeliverability: boolean;
  quotaWarningThreshold: number;
  trackEmailOpens: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultTone: "professional",
  autoStopOnReply: true,
  verifyDeliverability: true,
  quotaWarningThreshold: 80,
  trackEmailOpens: true,
};

export default function Profile() {
  const { toast } = useToast();
  const logoutUser = useLogout();
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  useCurrentUser();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTab) || "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const token = getToken();
  const storedUser = getUserData() as User | null;
  const reduxUser = useSelector((state: any) => state.auth.userData as User | null);
  const user = reduxUser || storedUser;

  const { planUsage, usageLoading } = usePlanUsage();
  const { data: paymentHistory } = usePaymentHistory(Boolean(token && user));

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable display name state
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [isSavingName, setIsSavingName] = useState(false);

  // Outreach & AI Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem("coldmailer_preferences");
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PREFERENCES;
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    if (user?.username && !displayName) {
      setDisplayName(user.username);
    }
  }, [user?.username]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const initial = (user?.username || user?.email || "U").charAt(0).toUpperCase();

  const isGoogle = user?.authProvider === "google";
  const authLabel = isGoogle
    ? "Google OAuth"
    : user?.authProvider
    ? String(user.authProvider)
    : "Email & Password";

  // Quota metrics
  const monthly = planUsage?.usage?.monthlyEmailGenerations;
  const limit = monthly?.limit;
  const used = monthly?.used ?? 0;
  const remaining = typeof limit === "number" ? Math.max(limit - used, 0) : "Unlimited";
  const percentUsed =
    typeof limit === "number" && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : 0;

  const resetDate = monthly?.windowEnd ? new Date(monthly.windowEnd) : null;
  const resetLabel = resetDate
    ? `Resets on ${resetDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : "Recurring monthly cycle";

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({
        title: `${label} copied`,
        description: "Value copied to clipboard.",
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please copy the value manually.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a valid display name.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingName(true);
    try {
      if (user) {
        const updated = { ...user, username: displayName.trim() };
        localStorage.setItem("user", JSON.stringify(updated));
        dispatch(login(updated));
      }
      toast({
        title: "Display name updated",
        description: `Your profile name is now set to "${displayName.trim()}".`,
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSavePreferences = () => {
    setIsSavingPrefs(true);
    try {
      localStorage.setItem("coldmailer_preferences", JSON.stringify(preferences));
      toast({
        title: "Preferences saved",
        description: "Your outreach presets and AI writing options have been updated.",
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser({
      title: "Logged out",
      message: "You have been logged out of ColdMailerAI.",
      variant: "default",
      redirectTo: "/",
    });
  };

  const effectivePaymentInfo = user?.paymentInfo || paymentHistory?.paymentInfo;

  return (
    <div className="min-w-0 max-w-full space-y-6 font-sans">
      <Seo title="Profile & Settings" path="/dashboard/profile" noIndex />

      {/* 1. Header Section */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Account & Settings
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Manage your personal profile, outreach preferences, security standing, and plan subscription.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-9 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors shadow-none"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sign Out
          </Button>

          <NavLink
            to="/dashboard/pricing"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-400 shadow-none"
          >
            <CreditCard className="h-4 w-4" />
            Manage Plan
          </NavLink>
        </div>
      </section>

      {/* 2. Settings & Profile Tabs Bar */}
      <div className="flex border-b border-white/10 gap-2 sm:gap-6 overflow-x-auto custom-scroll">
        <button
          type="button"
          onClick={() => handleTabChange("profile")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "profile"
              ? "text-white font-semibold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <UserRound className="h-4 w-4" />
          Profile & Identity
          {activeTab === "profile" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("preferences")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "preferences"
              ? "text-white font-semibold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Outreach & AI Preferences
          {activeTab === "preferences" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("security")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "security"
              ? "text-white font-semibold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Shield className="h-4 w-4" />
          Security & Access
          {activeTab === "security" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("billing")}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "billing"
              ? "text-white font-semibold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Subscription & Quota
          {activeTab === "billing" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: Profile & Identity */}
      {activeTab === "profile" && (
        <div className="space-y-5">
          {/* User Identity Banner Card */}
          <article className="overflow-hidden rounded-lg border border-white/10 bg-surface-900">
            <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between bg-surface-950">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl font-semibold text-white font-mono">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base sm:text-lg font-semibold text-white">
                      {user?.username || "ColdMailer User"}
                    </h2>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
                      {user?.planName || paymentHistory?.currentPlan || "Free"}
                    </span>
                    {user?.isPaidUser ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20 font-sans">
                        Paid Subscriber
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/5 text-gray-400 ring-1 ring-inset ring-white/10 font-sans">
                        Starter Access
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs sm:text-sm text-gray-400 font-mono">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {user?.email && (
                  <Button
                    type="button"
                    onClick={() => copyToClipboard(user.email, "email", "Email")}
                    className="h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors"
                  >
                    {copiedKey === "email" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied Email
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                        Copy Email
                      </>
                    )}
                  </Button>
                )}

                {user?._id && (
                  <Button
                    type="button"
                    onClick={() => copyToClipboard(user._id, "id", "Account ID")}
                    className="h-8 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors"
                  >
                    {copiedKey === "id" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied ID
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                        Copy Account ID
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Highlights Row */}
            <div className="grid grid-cols-2 divide-x divide-white/5 sm:grid-cols-4 bg-surface-900">
              <div className="p-4 px-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Auth Provider
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {isGoogle ? <GoogleIcon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                  <span className="text-xs sm:text-sm font-medium text-white">{authLabel}</span>
                </div>
              </div>
              <div className="p-4 px-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Billing Standing
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-white">
                  {user?.isPaidUser ? "Active Pro Member" : "Free Starter Tier"}
                </p>
              </div>
              <div className="p-4 px-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Member Since
                </p>
                <p className="mt-1 text-xs sm:text-sm font-mono text-gray-300">
                  {user?.createdAt ? formatDate(user.createdAt) : "—"}
                </p>
              </div>
              <div className="p-4 px-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Quota Reset
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-white truncate">
                  {resetLabel}
                </p>
              </div>
            </div>
          </article>

          {/* Edit Profile Form & Credentials Table */}
          <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Edit Profile Form */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Personal Information
                </h2>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Editable
                </span>
              </div>

              <form onSubmit={handleSaveDisplayName} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your username"
                    className="h-9 w-full rounded-md border border-white/15 bg-surface-950 px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-sans transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Your name displayed in sequence headers and email templates.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="h-9 w-full rounded-md border border-white/10 bg-surface-950/60 px-3 py-1.5 text-sm text-gray-400 font-mono cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Primary login email. To update, please re-authenticate.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingName}
                    className="h-8 px-4 text-xs sm:text-[13px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save Name
                  </Button>
                </div>
              </form>
            </article>

            {/* Read-Only Identity Attributes */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  System Credentials
                </h2>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Metadata
                </span>
              </div>

              <div className="divide-y divide-white/5">
                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Internal Account ID</p>
                    <p className="truncate text-xs text-gray-400">Unique MongoDB identifier</p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-gray-300 font-mono">
                    {user?._id || "—"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Sign-in Provider</p>
                    <p className="truncate text-xs text-gray-400">Identity gateway</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isGoogle ? <GoogleIcon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                    <span className="text-xs sm:text-sm text-white font-medium">{authLabel}</span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Workspace Role</p>
                    <p className="truncate text-xs text-gray-400">Permissions tier</p>
                  </div>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 text-white ring-1 ring-inset ring-white/20 font-sans">
                    Workspace Owner
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Registration Date</p>
                    <p className="truncate text-xs text-gray-400">Account creation time</p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                    {formatDate(user?.createdAt)}
                  </span>
                </div>

                {user?.activeWorkspaceId && (
                  <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-medium text-white">Workspace UUID</p>
                      <p className="truncate text-xs text-gray-400">Active organization</p>
                    </div>
                    <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                      {user.activeWorkspaceId}
                    </span>
                  </div>
                )}
              </div>
            </article>
          </section>
        </div>
      )}

      {/* TAB 2: Outreach & AI Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-5">
          <article className="overflow-hidden rounded-lg border border-white/10 bg-surface-900">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  AI Email Studio & Writing Preferences
                </h2>
                <p className="text-xs text-gray-400">
                  Default presets applied when launching email generation workflows
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Customization
              </span>
            </div>

            <div className="p-5 space-y-6">
              {/* Appearance & Interface Theme */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Appearance & Theme (Dashboard Workspace)
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-start gap-3.5 rounded-lg p-4 border text-left transition-all cursor-pointer ${
                      theme === "light"
                        ? "border-brand bg-brand/10 text-white"
                        : "border-white/10 bg-surface-950 text-gray-300 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="rounded-md bg-white/5 p-2 text-gray-300 border border-white/5 shrink-0">
                      <Sun className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">White Theme</p>
                        <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-medium bg-brand/20 text-brand-300 font-sans">
                          Default
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Clean, high-contrast, modern white aesthetic for all workspace views.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-start gap-3.5 rounded-lg p-4 border text-left transition-all cursor-pointer ${
                      theme === "dark"
                        ? "border-brand bg-brand/10 text-white"
                        : "border-white/10 bg-surface-950 text-gray-300 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="rounded-md bg-white/5 p-2 text-gray-300 border border-white/5 shrink-0">
                      <Moon className="h-4 w-4 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Obsidian Dark Theme</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Deep obsidian background with purple brand highlights and hairline borders.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Default Tone Setting */}
              <div className="pt-4 border-t border-white/5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Default AI Writing Tone
                </label>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { id: "professional", title: "Professional", desc: "Balanced, authoritative & formal" },
                    { id: "casual", title: "Casual", desc: "Warm, conversational & approachable" },
                    { id: "direct", title: "Direct Value", desc: "Concise, to the point with hard metrics" },
                    { id: "urgent", title: "Urgent", desc: "Action-oriented with time sensitivity" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPreferences({ ...preferences, defaultTone: t.id })}
                      className={`text-left rounded-lg p-3.5 border transition-all ${
                        preferences.defaultTone === t.id
                          ? "border-brand bg-brand/10 text-white"
                          : "border-white/10 bg-surface-950 text-gray-300 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <p className="text-xs font-semibold">{t.title}</p>
                      <p className="mt-1 text-[11px] text-gray-400">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outreach Safeguards & Behavior Toggles */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Outreach Automation Safeguards
                </h3>

                <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-surface-950">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-white">Stop Sequence on Reply</p>
                      <p className="text-xs text-gray-400">
                        Automatically cancel subsequent sequence steps once a recipient responds.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.autoStopOnReply}
                      onChange={(e) =>
                        setPreferences({ ...preferences, autoStopOnReply: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/20 bg-surface-900 text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-white">Deliverability Verification Warning</p>
                      <p className="text-xs text-gray-400">
                        Warn when queueing emails to leads with unverified MX or deliverability records.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.verifyDeliverability}
                      onChange={(e) =>
                        setPreferences({ ...preferences, verifyDeliverability: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/20 bg-surface-900 text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-white">Open & Reply Engagement Tracking</p>
                      <p className="text-xs text-gray-400">
                        Inject lightweight tracking headers to calculate sequence reply rates.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.trackEmailOpens}
                      onChange={(e) =>
                        setPreferences({ ...preferences, trackEmailOpens: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/20 bg-surface-900 text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSavingPrefs}
                  className="h-9 px-4 text-xs sm:text-[13px] font-semibold rounded-md bg-brand text-white hover:bg-brand-400 transition shadow-none"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Outreach Preferences
                </Button>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* TAB 3: Security & Access */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Auth Gateway Status */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Authentication & Login Provider
                </h2>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Security
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3.5 rounded-lg border border-white/10 bg-surface-950 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    {isGoogle ? <GoogleIcon className="h-5 w-5" /> : <Lock className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{authLabel}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {isGoogle
                        ? "Google OAuth 2.0 with token verification"
                        : "Encrypted password credentials with bcrypt"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Session Security</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Signed in & Valid
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-gray-400">JWT Token Expiry</span>
                    <span className="text-gray-300 font-mono">Rolling session</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-gray-400">Two-Factor Authentication</span>
                    <span className="text-gray-400">Managed via OAuth / Email</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Active Session & Device Standing */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Active Web Session
                </h2>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Device
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3.5 rounded-lg border border-white/10 bg-surface-950 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">Current Browser Session</p>
                      <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                        This Device
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Active on ColdMailerAI Web Client
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-gray-400">IP Protection</span>
                    <span className="text-gray-300 font-mono">TLS 1.3 Encrypted</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-gray-400">Sign-in Timestamp</span>
                    <span className="text-gray-300 font-mono">
                      {user?.updatedAt ? formatDate(user.updatedAt) : "Current active session"}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* Danger Zone */}
          <article className="overflow-hidden rounded-lg border border-red-500/20 bg-surface-900">
            <div className="flex items-center justify-between border-b border-red-500/20 px-5 py-3.5 bg-red-500/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-sm sm:text-base font-semibold text-red-300">
                  Session & Account Termination
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                Danger Zone
              </span>
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Log Out of All Active Sessions</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Terminates your current access token and clears your stored authorization session.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleLogout}
                className="h-9 px-4 text-xs sm:text-[13px] font-semibold rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition shadow-none shrink-0"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                End Session
              </Button>
            </div>
          </article>
        </div>
      )}

      {/* TAB 4: Subscription & Quota */}
      {activeTab === "billing" && (
        <div className="space-y-5">
          {/* AI Generation Quota & Consumption Panel */}
          <article className="overflow-hidden rounded-lg border border-white/10 bg-surface-900">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Monthly AI Email Generation Quota
                </h2>
                <p className="text-xs text-gray-400">
                  Calculated against your monthly subscription tier allowance
                </p>
              </div>
              <NavLink
                to="/dashboard/pricing"
                className="text-xs sm:text-sm font-medium text-brand-300 hover:text-white"
              >
                Upgrade plan
              </NavLink>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Generation Allowance
                  </p>
                  <p className="mt-1 text-base font-semibold text-white tracking-tight font-mono">
                    {usageLoading
                      ? "Loading quota..."
                      : typeof limit === "number"
                      ? `${used} / ${limit} emails generated`
                      : `${used} emails generated (Unlimited plan)`}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-gray-400 font-mono">
                    {typeof limit === "number" ? `${remaining} remaining` : "No limit"} · {resetLabel}
                  </span>
                </div>
              </div>

              {typeof limit === "number" && (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentUsed >= 85 ? "bg-amber-400" : "bg-brand"
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                    <span>0%</span>
                    <span>{percentUsed}% capacity used</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-3 border-t border-white/5">
                <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Batch Engine
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    High-volume multi-lead AI generation
                  </p>
                </div>
                <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Deliverability Check
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    Zero-bounce MX & deliverability verification
                  </p>
                </div>
                <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Sequence Automations
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    Branching cadences that stop on reply
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Subscription & Payment Audit Split */}
          <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Plan Status */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Subscription Standing
                </h2>
                <NavLink
                  to="/dashboard/pricing"
                  className="text-xs sm:text-sm font-medium text-brand-300 hover:text-white"
                >
                  Manage tiers
                </NavLink>
              </div>

              <div className="divide-y divide-white/5">
                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Active Plan</p>
                    <p className="truncate text-xs text-gray-400">Current tier capabilities</p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-white font-semibold">
                    {user?.planName || paymentHistory?.currentPlan || "Free Plan"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Billing Standing</p>
                    <p className="truncate text-xs text-gray-400">Payment processor state</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      user?.isPaidUser
                        ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20"
                        : "bg-white/10 text-white ring-1 ring-inset ring-white/20"
                    }`}
                  >
                    {user?.isPaidUser ? "Active Subscription" : "Free Starter"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Plan Activated</p>
                    <p className="truncate text-xs text-gray-400">Last activation marker</p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                    {formatDate(user?.planActivatedAt)}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">Expiration / Renewal</p>
                    <p className="truncate text-xs text-gray-400">Next billing cycle</p>
                  </div>
                  <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                    {user?.isPaidUser
                      ? formatDate(user?.planExpiresAt || paymentHistory?.planExpiresAt)
                      : "No scheduled expiration"}
                  </span>
                </div>
              </div>
            </article>

            {/* Payment Audit Record */}
            <article className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-surface-900">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-surface-950">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Payment History & Gateway Records
                </h2>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Receipts
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {effectivePaymentInfo?.razorpay_payment_id ? (
                  <>
                    <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-medium text-white">Razorpay Payment ID</p>
                        <p className="truncate text-xs text-gray-400">Gateway reference</p>
                      </div>
                      <span className="min-w-0 truncate text-xs sm:text-sm text-gray-300 font-mono">
                        {effectivePaymentInfo.razorpay_payment_id}
                      </span>
                    </div>

                    {effectivePaymentInfo.razorpay_order_id && (
                      <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm font-medium text-white">Razorpay Order ID</p>
                          <p className="truncate text-xs text-gray-400">Transaction invoice record</p>
                        </div>
                        <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                          {effectivePaymentInfo.razorpay_order_id}
                        </span>
                      </div>
                    )}

                    {effectivePaymentInfo.paymentDate && (
                      <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm font-medium text-white">Payment Timestamp</p>
                          <p className="truncate text-xs text-gray-400">Processed date</p>
                        </div>
                        <span className="min-w-0 truncate text-xs sm:text-sm text-gray-400 font-mono">
                          {formatDate(effectivePaymentInfo.paymentDate)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-xs sm:text-sm text-gray-400">
                      No payment transactions recorded yet on this account.
                    </p>
                    <NavLink
                      to="/dashboard/pricing"
                      className="mt-3 inline-flex text-xs font-semibold text-brand-300 hover:text-white"
                    >
                      Browse upgrade tiers <ArrowRight className="h-3 w-3 ml-1 inline" />
                    </NavLink>
                  </div>
                )}
              </div>
            </article>
          </section>
        </div>
      )}

      {/* 4. Quick Actions Panels (Universal at Bottom) */}
      <section className="pt-2">
        <h2 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Quick actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Manage subscription & billing",
              description: "Review invoice records, upgrade limits, and explore tier pricing.",
              to: "/dashboard/pricing",
            },
            {
              title: "Outreach sender mailboxes",
              description: "Configure SMTP, Google, or Outlook mailboxes for automated sending pools.",
              to: "/dashboard/mailboxes",
            },
            {
              title: "AI email generation studio",
              description: "Open the focused outreach editor to tailor personalized cold pitches.",
              to: "/generate-email",
            },
          ].map((action) => (
            <NavLink
              key={action.to}
              to={action.to}
              className="group rounded-lg border border-white/10 bg-surface-900 p-5 transition hover:border-white/20 hover:bg-white/5"
            >
              <p className="mt-1 text-base font-semibold text-white">{action.title}</p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">
                {action.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white">
                Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  );
}
