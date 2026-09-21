import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Mail,
  ShieldCheck,
  Send,
  RefreshCw,
  Server,
  Activity,
  Settings,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  Lock,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import Seo from "../components/common/Seo";
import {
  useMailboxes,
  useConnectSmtpMailbox,
  useConnectGoogleMailbox,
  useConnectMicrosoftMailbox,
  useUpdateMailboxSettings,
  useTestMailboxConnection,
  useDeleteMailbox,
} from "../hooks/useMailboxes";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import ConfirmDeleteDialog from "../components/common/ConfirmDeleteDialog";
import { useToast } from "../hooks/use-toast";
import { api } from "../utils";

const GoogleIcon = ({ className = "h-4 w-4" }) => (
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

const OutlookIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#0078D4" d="M11 2H2v9h9V2z" />
    <path fill="#002050" d="M22 2h-9v9h9V2z" />
    <path fill="#40E0D0" d="M11 13H2v9h9v-9z" />
    <path fill="#2899F5" d="M22 13h-9v9h9v-9z" />
  </svg>
);

export default function Mailboxes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const { data: mailboxes = [], isLoading, isFetching } = useMailboxes();
  const connectSmtpMutation = useConnectSmtpMailbox();
  const connectGoogleMutation = useConnectGoogleMailbox();
  const connectMicrosoftMutation = useConnectMicrosoftMailbox();
  const updateSettingsMutation = useUpdateMailboxSettings();
  const testConnectionMutation = useTestMailboxConnection();
  const deleteMailboxMutation = useDeleteMailbox();

  // Modals state
  const [smtpModalOpen, setSmtpModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState(null);
  const [isOAuthRedirecting, setIsOAuthRedirecting] = useState(false);
  const [smtpHelpOpen, setSmtpHelpOpen] = useState(false);
  const [smtpHelpProvider, setSmtpHelpProvider] = useState("gmail");
  const [copiedField, setCopiedField] = useState(null);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mailboxToDelete, setMailboxToDelete] = useState(null);

  // Form states
  const [smtpForm, setSmtpForm] = useState({
    email: "",
    name: "",
    smtpHost: "",
    smtpPort: "587",
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    dailyLimit: "50",
  });

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    dailyLimit: 50,
    isDefault: false,
    warmupEnabled: false,
  });

  // Handle OAuth callback on mount
  useEffect(() => {
    const callbackType = searchParams.get("callback");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    let provider = callbackType;
    if (!provider && code && state) {
      try {
        const decoded = JSON.parse(atob(state.replace(/-/g, "+").replace(/_/g, "/")));
        const payload = JSON.parse(decoded.payload);
        if (payload.provider === "gmail") provider = "google";
        if (payload.provider === "outlook") provider = "outlook";
      } catch {
        provider = "google";
      }
    }

    if (code && provider) {
      const redirectUri = `${window.location.origin}/dashboard/mailboxes`;
      if (provider === "google") {
        connectGoogleMutation.mutate(
          { code, redirectUri },
          {
            onSettled: () => {
              searchParams.delete("code");
              searchParams.delete("callback");
              searchParams.delete("state");
              searchParams.delete("scope");
              searchParams.delete("prompt");
              searchParams.delete("authuser");
              setSearchParams(searchParams, { replace: true });
            },
          }
        );
      } else if (provider === "outlook") {
        connectMicrosoftMutation.mutate(
          { code, redirectUri },
          {
            onSettled: () => {
              searchParams.delete("code");
              searchParams.delete("callback");
              searchParams.delete("state");
              searchParams.delete("session_state");
              setSearchParams(searchParams, { replace: true });
            },
          }
        );
      }
    }
  }, [searchParams]);

  // Initiate Google OAuth
  const handleConnectGmail = async () => {
    try {
      setIsOAuthRedirecting(true);
      const redirectUri = `${window.location.origin}/dashboard/mailboxes`;
      const res = await api.get(
        `/api/v1/mailboxes/oauth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setIsOAuthRedirecting(false);
      toast({
        title: "OAuth Initialization Failed",
        description:
          err.response?.data?.message || "Could not generate Google authorization URL.",
        variant: "destructive",
      });
    }
  };

  // Initiate Microsoft OAuth
  const handleConnectOutlook = async () => {
    try {
      setIsOAuthRedirecting(true);
      const redirectUri = `${window.location.origin}/dashboard/mailboxes`;
      const res = await api.get(
        `/api/v1/mailboxes/oauth/microsoft/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setIsOAuthRedirecting(false);
      toast({
        title: "OAuth Initialization Failed",
        description:
          err.response?.data?.message ||
          "Could not generate Microsoft authorization URL.",
        variant: "destructive",
      });
    }
  };

  // Handle SMTP form submit
  const handleSmtpSubmit = (e) => {
    e.preventDefault();
    if (!smtpForm.email || !smtpForm.smtpHost || !smtpForm.smtpPass) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in email, host, port, and password.",
        variant: "destructive",
      });
      return;
    }

    connectSmtpMutation.mutate(
      {
        ...smtpForm,
        smtpPort: Number(smtpForm.smtpPort),
        dailyLimit: Number(smtpForm.dailyLimit) || 50,
      },
      {
        onSuccess: () => {
          setSmtpModalOpen(false);
          setSmtpForm({
            email: "",
            name: "",
            smtpHost: "",
            smtpPort: "587",
            smtpSecure: false,
            smtpUser: "",
            smtpPass: "",
            dailyLimit: "50",
          });
        },
      }
    );
  };

  // Open settings modal
  const openSettings = (mailbox) => {
    setActiveMailbox(mailbox);
    setSettingsForm({
      name: mailbox.name || "",
      dailyLimit: mailbox.dailyLimit || 50,
      isDefault: Boolean(mailbox.isDefault),
      warmupEnabled: Boolean(mailbox.warmupEnabled),
    });
    setSettingsModalOpen(true);
  };

  const handleSettingsSave = (e) => {
    e.preventDefault();
    if (!activeMailbox) return;

    updateSettingsMutation.mutate(
      {
        mailboxId: activeMailbox._id,
        name: settingsForm.name,
        dailyLimit: Number(settingsForm.dailyLimit),
        isDefault: settingsForm.isDefault,
        warmupEnabled: settingsForm.warmupEnabled,
      },
      {
        onSuccess: () => {
          setSettingsModalOpen(false);
          setActiveMailbox(null);
        },
      }
    );
  };

  // Toggle pause/active
  const togglePause = (mailbox) => {
    const newStatus = mailbox.status === "paused" ? "active" : "paused";
    updateSettingsMutation.mutate({
      mailboxId: mailbox._id,
      status: newStatus,
    });
  };

  // Open delete dialog
  const promptDelete = (mailbox) => {
    setMailboxToDelete(mailbox);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!mailboxToDelete) return;
    deleteMailboxMutation.mutate(mailboxToDelete._id, {
      onSettled: () => {
        setDeleteConfirmOpen(false);
        setMailboxToDelete(null);
      },
    });
  };

  // Aggregated stats
  const totalMailboxes = mailboxes.length;
  const activeCount = mailboxes.filter((m) => m.status === "active").length;
  const totalSentToday = mailboxes.reduce((acc, m) => acc + (m.sentToday || 0), 0);
  const totalDailyCapacity = mailboxes.reduce((acc, m) => acc + (m.dailyLimit || 50), 0);
  const avgHealth =
    totalMailboxes > 0
      ? Math.round(
        mailboxes.reduce((acc, m) => acc + (m.health?.score ?? 100), 0) /
        totalMailboxes
      )
      : 100;

  return (
    <div className="min-w-0 max-w-full space-y-6 font-sans">
      <Seo title="Mailboxes" path="/dashboard/mailboxes" noIndex />

      {/* Standard Header Section matching Leads and Dashboard */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight sm:text-3xl">
            Mailbox
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-400">
            Connect accounts, distribute daily quotas, and monitor reputation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleConnectGmail}
            disabled={isOAuthRedirecting}
            className="h-9 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors hover:text-white"
          >
            <GoogleIcon className="h-3 w-3 mr-0.5" />
            Connect Gmail
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleConnectOutlook}
            disabled={isOAuthRedirecting}
            className="h-9 px-3 text-xs sm:text-[13px] font-medium rounded-md border border-white/15 bg-surface-900 text-white hover:bg-white/5 transition-colors hover:text-white"
          >
            <OutlookIcon className="h-3 w-3 mr-0.5" />
            Connect Outlook
          </Button>

          <Button
            type="button"
            onClick={() => setSmtpModalOpen(true)}
            className="h-9 px-3.5 text-xs sm:text-[13px] rounded-md bg-brand text-white hover:bg-brand-400 font-medium shadow-none transition-colors flex items-center gap-1.5 hover:text-white"
          >
            <Server className="h-3 w-3" />
            Connect SMTP
          </Button>
        </div>
      </section>

      {/* Overview Stat Cards matching Dashboard.jsx */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Connected mailboxes */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Connected mailboxes
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Mail className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {totalMailboxes}
            </p>
            {totalMailboxes > 0 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 font-sans">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Automated round-robin sending pool
          </p>
        </article>

        {/* Daily Send Capacity */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Daily send capacity
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Send className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              {totalSentToday}{" "}
              <span className="text-sm font-normal text-gray-400 font-mono">
                / {totalDailyCapacity}
              </span>
            </p>
            <span className="text-xs text-gray-400 font-sans">emails</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{
                width: `${totalDailyCapacity > 0
                  ? Math.min(100, Math.round((totalSentToday / totalDailyCapacity) * 100))
                  : 0
                  }%`,
              }}
            />
          </div>
        </article>

        {/* Deliverability Health */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Deliverability health
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p
              className={`text-xl sm:text-xl font-semibold tracking-tight font-mono ${avgHealth >= 90
                ? "text-emerald-400"
                : avgHealth >= 70
                  ? "text-amber-400"
                  : "text-rose-400"
                }`}
            >
              {avgHealth}%
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset font-sans ${avgHealth >= 90
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : avgHealth >= 70
                  ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                  : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
                }`}
            >
              {avgHealth >= 90 ? "Optimal" : avgHealth >= 70 ? "Good" : "Action Needed"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Continuous inbox reputation monitor
          </p>
        </article>

        {/* Credential Security */}
        <article className="rounded-lg border border-white/10 bg-surface-900 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Credential security
            </p>
            <span className="rounded-md bg-white/5 p-1.5 text-gray-300 border border-white/5">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl sm:text-xl font-semibold text-white tracking-tight font-mono">
              AES-256-GCM
            </p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-500/15 text-purple-300 ring-1 ring-inset ring-purple-500/30 font-sans">
              Encrypted
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Isolated credentials with AEAD encryption
          </p>
        </article>
      </section>

      {/* Mailbox List / Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Configured Mailboxes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Inboxes in active rotation for automated outreach campaigns
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono bg-surface-900 border border-white/10 px-2.5 py-1 rounded-md">
            {mailboxes.length} {mailboxes.length === 1 ? "mailbox" : "mailboxes"} available
          </span>
        </div>

        {mailboxes.length === 0 ? (
          /* Empty State matching LeadsTable / Dashboard aesthetic */
          <div className="rounded-lg border border-dashed border-white/15 bg-surface-900 p-8 sm:p-9 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300">
              <Mail className="h-5 w-5 text-brand-300" />
            </div>

            <h3 className="mt-3 text-base sm:text-lg font-semibold text-white tracking-tight">
              No Mailboxes Connected
            </h3>
            <p className="mx-auto mt-1 max-w-lg text-xs sm:text-sm text-gray-400">
              Connect your Google Workspace, Microsoft 365, or custom domain SMTP account to start sending automated cold emails.
            </p>

            {/* Provider Connection Cards */}
            <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3 max-w-5xl mx-auto">
              {/* Google Workspace */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleConnectGmail}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleConnectGmail()}
                className="group relative rounded-lg border border-white/10 bg-surface-950 p-5 transition hover:border-white/20 hover:bg-white/5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <GoogleIcon className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                    Google Workspace
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">
                    1-Click OAuth 2.0 connection with Gmail API sending and rate limits.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white transition-colors">
                  <span>Connect Google</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* Microsoft 365 */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleConnectOutlook}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleConnectOutlook()}
                className="group relative rounded-lg border border-white/10 bg-surface-950 p-5 transition hover:border-white/20 hover:bg-white/5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <OutlookIcon className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                    Microsoft 365
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">
                    Azure OAuth 2.0 authorization for Office 365 and Outlook enterprise mail.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white transition-colors">
                  <span>Connect Outlook</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* Custom SMTP */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSmtpModalOpen(true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSmtpModalOpen(true)}
                className="group relative rounded-lg border border-white/10 bg-surface-950 p-5 transition hover:border-white/20 hover:bg-white/5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <Server className="h-5 w-5 text-brand-300" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                    Custom SMTP
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-400">
                    Custom domain SMTP, SendGrid, Amazon SES, or private mail servers.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-300 group-hover:text-white transition-colors">
                  <span>Configure SMTP</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Mailboxes Grid */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {mailboxes.map((mailbox) => {
              const quotaPercent = Math.min(
                100,
                Math.round(((mailbox.sentToday || 0) / (mailbox.dailyLimit || 50)) * 100)
              );
              const isTesting =
                testConnectionMutation.isPending &&
                testConnectionMutation.variables === mailbox._id;

              return (
                <div
                  key={mailbox._id}
                  className="rounded-lg border border-white/10 bg-surface-900 p-5 transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-surface-950">
                        {mailbox.provider === "gmail" ? (
                          <GoogleIcon className="h-4 w-4" />
                        ) : mailbox.provider === "outlook" ? (
                          <OutlookIcon className="h-4 w-4" />
                        ) : (
                          <Server className="h-4 w-4 text-brand-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-semibold text-white">
                            {mailbox.email}
                          </p>
                          {mailbox.isDefault && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-brand/15 text-brand-200 ring-1 ring-inset ring-brand/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-400 mt-0.5">
                          {mailbox.name ? `${mailbox.name} • ` : ""}
                          Provider: {mailbox.provider.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${mailbox.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                          : mailbox.status === "paused"
                            ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                            : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
                          }`}
                      >
                        {mailbox.status}
                      </span>
                    </div>
                  </div>

                  {/* Quota & Health Section */}
                  <div className="mt-4 space-y-3 rounded-md border border-white/5 bg-surface-950 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Daily Send Quota</span>
                        <span className="font-semibold text-white font-mono">
                          {mailbox.sentToday || 0} / {mailbox.dailyLimit} sent
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${quotaPercent > 90 ? "bg-amber-500" : "bg-brand"
                            }`}
                          style={{ width: `${quotaPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Health: {mailbox.health?.score ?? 100}%</span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          ({mailbox.health?.status || "optimal"})
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {mailbox.health?.lastTestedAt
                          ? `Tested ${new Date(mailbox.health.lastTestedAt).toLocaleDateString()}`
                          : "Untested"}
                      </span>
                    </div>

                    {mailbox.health?.lastError && (
                      <p className="text-[11px] text-red-400 bg-red-500/10 p-2 rounded-md border border-red-500/20">
                        Error: {mailbox.health.lastError}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => testConnectionMutation.mutate(mailbox._id)}
                        disabled={isTesting}
                        className="h-8 gap-1.5 rounded-md border border-white/15 bg-surface-900 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin text-brand" : ""}`} />
                        {isTesting ? "Testing..." : "Test"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => togglePause(mailbox)}
                        className="h-8 gap-1.5 rounded-md border border-white/15 bg-surface-900 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {mailbox.status === "paused" ? (
                          <>
                            <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                            Resume
                          </>
                        ) : (
                          <>
                            <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
                            Pause
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openSettings(mailbox)}
                        className="h-8 w-8 p-0 rounded-md border border-white/15 bg-surface-900 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        title="Edit Settings"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => promptDelete(mailbox)}
                        className="h-8 w-8 p-0 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                        title="Disconnect Mailbox"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Connect Custom SMTP Modal */}
      <Dialog open={smtpModalOpen} onOpenChange={setSmtpModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] border border-white/10 bg-surface-900 p-0 text-white sm:rounded-xl overflow-y-auto [&>button]:text-slate-400 [&>button]:hover:text-white">
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
              Connect Custom SMTP Mailbox
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Provide your SMTP host and authentication credentials. We&apos;ll verify the connection before encrypting.
            </DialogDescription>
          </DialogHeader>

          {/* SMTP Help Guide - Collapsible */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => setSmtpHelpOpen(!smtpHelpOpen)}
              className="flex w-full items-center justify-between px-6 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-2 text-xs -mt-4 py-3 font-medium text-brand-300">
                <HelpCircle className="h-3.5 w-3.5" />
                How to find your SMTP details?
              </span>
              {smtpHelpOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              )}
            </button>

            {smtpHelpOpen && (
              <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Provider Tabs */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { id: "gmail", label: "Gmail", color: "#EA4335" },
                    { id: "outlook", label: "Outlook", color: "#0078D4" },
                    { id: "zoho", label: "Zoho", color: "#E8453C" },
                    { id: "sendgrid", label: "SendGrid", color: "#1A82E2" },
                    { id: "mailgun", label: "Mailgun", color: "#F06B57" },
                    { id: "ses", label: "Amazon SES", color: "#FF9900" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSmtpHelpProvider(p.id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${smtpHelpProvider === p.id
                        ? "bg-white/10 text-white ring-1 ring-white/20"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                        }`}
                      style={smtpHelpProvider === p.id ? { borderBottom: `2px solid ${p.color}` } : {}}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Provider Content */}
                {(() => {
                  const providers = {
                    gmail: {
                      host: "smtp.gmail.com",
                      port: "587",
                      secure: false,
                      username: "Your full Gmail address",
                      steps: [
                        { text: "Enable 2-Factor Authentication on your Google Account", link: "https://myaccount.google.com/signinoptions/two-step-verification" },
                        { text: "Go to App Passwords page", link: "https://myaccount.google.com/apppasswords" },
                        { text: 'Select "Mail" as the app → Generate' },
                        { text: "Copy the 16-character password and use it as SMTP Password" },
                      ],
                    },
                    outlook: {
                      host: "smtp.office365.com",
                      port: "587",
                      secure: false,
                      username: "Your full Outlook / Microsoft 365 email",
                      steps: [
                        { text: "Go to Microsoft Security settings", link: "https://account.microsoft.com/security" },
                        { text: 'Navigate to Advanced Security → App Passwords' },
                        { text: "Create a new App Password and copy it" },
                        { text: "Use your email as username, app password as SMTP Password" },
                      ],
                    },
                    zoho: {
                      host: "smtp.zoho.com",
                      port: "465",
                      secure: true,
                      username: "Your full Zoho email address",
                      steps: [
                        { text: "Go to Zoho Accounts → Security", link: "https://accounts.zoho.com/home#security/security_pwd" },
                        { text: "Generate an Application-Specific Password" },
                        { text: "Use port 465 with SSL/TLS enabled" },
                        { text: "Use the app-specific password as SMTP Password" },
                      ],
                    },
                    sendgrid: {
                      host: "smtp.sendgrid.net",
                      port: "587",
                      secure: false,
                      username: "apikey (use this literal string)",
                      steps: [
                        { text: "Go to SendGrid Dashboard → Settings → API Keys", link: "https://app.sendgrid.com/settings/api_keys" },
                        { text: 'Create an API Key with "Mail Send" permissions' },
                        { text: 'Set SMTP Username to the literal word: apikey' },
                        { text: "Paste your API key as the SMTP Password" },
                      ],
                    },
                    mailgun: {
                      host: "smtp.mailgun.org",
                      port: "587",
                      secure: false,
                      username: "Your Mailgun SMTP username",
                      steps: [
                        { text: "Go to Mailgun Dashboard → Sending → Domain Settings", link: "https://app.mailgun.com/mg/sending/domains" },
                        { text: 'Select your domain → SMTP Credentials' },
                        { text: "Copy the SMTP username (e.g. postmaster@yourdomain.com)" },
                        { text: "Reset or copy the SMTP password" },
                      ],
                    },
                    ses: {
                      host: "email-smtp.<region>.amazonaws.com",
                      port: "587",
                      secure: false,
                      username: "SMTP credentials from IAM",
                      steps: [
                        { text: "Go to AWS SES Console → SMTP Settings", link: "https://console.aws.amazon.com/ses/home#/smtp" },
                        { text: '"Create SMTP Credentials" → downloads an IAM user CSV' },
                        { text: "Replace <region> in host with your SES region (e.g. us-east-1)" },
                        { text: "Use the SMTP Username & Password from the CSV file" },
                      ],
                    },
                  };

                  const p = providers[smtpHelpProvider];
                  const copyToClipboard = (text, field) => {
                    navigator.clipboard.writeText(text);
                    setCopiedField(field);
                    setTimeout(() => setCopiedField(null), 1500);
                  };

                  return (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      {/* Quick-fill settings */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Host", value: p.host, key: "host" },
                          { label: "Port", value: p.port, key: "port" },
                          { label: "SSL/TLS", value: p.secure ? "Yes" : "No", key: "secure" },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className="group relative rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-2 cursor-pointer hover:bg-white/[0.07] transition-colors"
                            onClick={() => copyToClipboard(item.value, item.key)}
                            title={`Click to copy: ${item.value}`}
                          >
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{item.label}</div>
                            <div className="text-xs text-white font-mono flex items-center justify-between">
                              <span className="truncate">{item.value}</span>
                              {copiedField === item.key ? (
                                <Check className="h-3 w-3 text-green-400 shrink-0 ml-1" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">Username</div>
                        <div className="text-xs text-gray-200">{p.username}</div>
                      </div>

                      {/* Auto-fill button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSmtpForm((prev) => ({
                            ...prev,
                            smtpHost: p.host.includes("<region>") ? prev.smtpHost : p.host,
                            smtpPort: p.port,
                            smtpSecure: p.secure,
                            smtpUser: smtpHelpProvider === "sendgrid" ? "apikey" : prev.smtpUser,
                          }));
                        }}
                        className="w-full rounded-md border border-brand/20 px-3 py-1.5 text-[11px] font-medium text-brand-300 hover:bg-brand/5 transition-colors"
                      >
                        Auto-fill Host, Port & Security settings
                      </button>

                      {/* Steps */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Steps to get your password</div>
                        <ol className="space-y-1">
                          {p.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
                              <span className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-white/[0.06] text-[9px] font-bold text-gray-400 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">
                                {step.text}
                                {step.link && (
                                  <a
                                    href={step.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 ml-1 text-brand-300 hover:text-brand-200 underline decoration-brand-300/30 hover:decoration-brand-200/50"
                                  >
                                    Open <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <form onSubmit={handleSmtpSubmit}>
            <div className="space-y-3.5 px-6 py-5 -mt-5">
              <div>
                <label className="text-xs font-medium text-gray-300">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={smtpForm.email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })}
                  className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300">
                  Sender Display Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Alex from Acme"
                  value={smtpForm.name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, name: e.target.value })}
                  className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-300">
                    SMTP Host <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="smtp.mailgun.org"
                    value={smtpForm.smtpHost}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                    className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-300">
                    SMTP Port <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    placeholder="587"
                    value={smtpForm.smtpPort}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })}
                    className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-300">SMTP Username</label>
                  <Input
                    type="text"
                    placeholder="Same as email if blank"
                    value={smtpForm.smtpUser}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                    className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-300">
                    SMTP Password <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={smtpForm.smtpPass}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                    className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white focus-visible:ring-brand-400/40 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="smtp-secure-toggle"
                    checked={smtpForm.smtpSecure}
                    onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, smtpSecure: Boolean(checked) })}
                  />
                  <label htmlFor="smtp-secure-toggle" className="text-xs text-gray-300 cursor-pointer select-none">
                    Use SSL/TLS (Port 465)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Daily Limit:</span>
                  <Input
                    type="number"
                    min="1"
                    max="2000"
                    value={smtpForm.dailyLimit}
                    onChange={(e) => setSmtpForm({ ...smtpForm, dailyLimit: e.target.value })}
                    className="h-8 w-20 bg-surface-950 border-white/15 text-xs text-center text-white rounded-md"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-white/10 bg-surface-950/50 px-6 py-3.5 flex flex-row items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSmtpModalOpen(false)}
                className="border-white/15 bg-white/5 text-xs sm:text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded-md h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connectSmtpMutation.isPending}
                className="bg-brand hover:bg-brand-400 text-white font-medium text-xs sm:text-sm shadow-none rounded-md h-8"
              >
                {connectSmtpMutation.isPending ? "Verifying & Saving..." : "Test & Connect"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-surface-900 p-0 text-white sm:rounded-xl overflow-hidden [&>button]:text-slate-400 [&>button]:hover:text-white">
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
              Mailbox Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Configure sender name, daily quotas, and default routing for {activeMailbox?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSettingsSave}>
            <div className="space-y-4 px-6 py-4 -mt-4">
              <div>
                <label className="text-xs font-medium text-gray-300">Sender Display Name</label>
                <Input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white rounded-md"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300">
                  Daily Send Limit (emails / day)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="2000"
                  value={settingsForm.dailyLimit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dailyLimit: e.target.value })}
                  className="mt-1 h-9 bg-surface-950 border-white/15 text-xs sm:text-sm text-white rounded-md"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Recommended safe limit: 50 emails/day for newly connected inboxes.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-default-toggle"
                    checked={settingsForm.isDefault}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, isDefault: Boolean(checked) })
                    }
                  />
                  <label htmlFor="settings-default-toggle" className="text-xs text-gray-300 cursor-pointer select-none">
                    Set as default sender for this workspace
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-warmup-toggle"
                    checked={settingsForm.warmupEnabled}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, warmupEnabled: Boolean(checked) })
                    }
                  />
                  <label htmlFor="settings-warmup-toggle" className="text-xs text-gray-300 cursor-pointer select-none">
                    Enable automated gradual warmup schedule
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-white/10 bg-surface-950/50 px-6 py-3.5 flex flex-row items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsModalOpen(false)}
                className="border-white/15 bg-white/5 text-xs sm:text-xs text-gray-300 hover:bg-white/10 hover:text-white rounded-md h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="bg-brand hover:bg-brand-400 text-white font-medium text-xs sm:text-xs shadow-none rounded-md h-8"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disconnect Mailbox Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Disconnect Mailbox"
        description={`Are you sure you want to disconnect ${mailboxToDelete?.email}? This will immediately revoke sending capabilities and securely wipe its encrypted credentials from the database.`}
        confirmText="Disconnect"
        isDeleting={deleteMailboxMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
