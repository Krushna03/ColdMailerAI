import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import {
  verificationBadgeClass,
  verificationLabel,
  verificationScoreColor,
  formatDateTime,
} from "./leadUtils";

interface LeadDeliverabilityCardProps {
  lead?: {
    email?: string;
    emailVerification?: {
      status?: string;
      score?: number;
      checkedAt?: string | Date;
      provider?: string;
      reason?: string;
      mxRecords?: string[];
    };
    [key: string]: any;
  } | null;
  onVerify?: () => void;
  isVerifying?: boolean;
}

export default function LeadDeliverabilityCard({
  lead,
  onVerify,
  isVerifying,
}: LeadDeliverabilityCardProps) {
  const verification = lead?.emailVerification || {};
  const status = verification.status || "unknown";
  const score = verification.score;
  const checkedAt = verification.checkedAt;
  const provider = verification.provider;
  const reason = verification.reason;
  const mxRecords = verification.mxRecords || [];

  return (
    <section className="rounded-lg border border-white/10 bg-surface-900 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-850 border border-white/10 text-white">
            {status === "valid" ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : status === "risky" || status === "catch_all" ? (
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            ) : status === "invalid" || status === "disposable" ? (
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">
                Email Deliverability
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${verificationBadgeClass(
                  status
                )}`}
              >
                {verificationLabel(status)}
              </span>
              {score !== null && score !== undefined && status !== "unknown" && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-950 border border-white/10 ${verificationScoreColor(
                    score
                  )}`}
                >
                  Score: {score}/100
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {reason || (status === "unknown" ? "Email has not been verified yet." : "Deliverability check completed.")}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isVerifying || !lead?.email}
          onClick={onVerify}
          className="border border-white/15 bg-surface-900 text-xs text-white hover:bg-white/5 self-start sm:self-center shrink-0 h-8 px-3"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${isVerifying ? "animate-spin text-brand" : "text-gray-400"}`}
          />
          {isVerifying ? "Verifying..." : status === "unknown" ? "Verify Deliverability" : "Re-verify Email"}
        </Button>
      </div>

      {(status !== "unknown" || checkedAt) && (
        <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400 block text-[11px] font-semibold uppercase tracking-wider">Provider</span>
            <span className="font-medium text-white">
              {provider && provider !== "unknown" ? provider : "Standard MX"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px] font-semibold uppercase tracking-wider">MX Records</span>
            <span className="font-medium text-white">
              {mxRecords.length > 0 ? `${mxRecords.length} host(s) found` : "None"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px] font-semibold uppercase tracking-wider">Last Checked</span>
            <span className="font-medium text-white">
              {checkedAt ? formatDateTime(checkedAt) : "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px] font-semibold uppercase tracking-wider">Target Email</span>
            <span className="font-mono text-gray-400 truncate block" title={lead?.email}>
              {lead?.email || "—"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
