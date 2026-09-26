import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";
import { formatDate, formatDaysLabel } from "./utils";

interface HistoryModalProps {
  open: boolean;
  paymentHistory?: any;
  loading: boolean;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ open, paymentHistory, loading, onClose }) => {
  if (!open || !paymentHistory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-3xl border border-white/20 bg-surface-900 p-6 text-white animate-in fade-in zoom-in-50 duration-200"
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Payment history</p>
            <h3 className="text-2xl font-semibold">Latest billing snapshot</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Current plan</p>
              <p className="text-xl font-semibold mt-2">{paymentHistory.currentPlan || "Free"}</p>
              <p className="text-xs text-slate-500 mt-1">
                Status: {paymentHistory.isPaidUser ? "Active" : "Free Plan"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Member since</p>
              <p className="text-xl font-semibold mt-2">{formatDate(paymentHistory.memberSince)}</p>
              <p className="text-xs text-slate-500 mt-1">Automatic billing records enabled</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Plan expires</p>
              <p className="text-xl font-semibold mt-2">
                {paymentHistory.planExpiresAt ? formatDate(paymentHistory.planExpiresAt) : "--"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {paymentHistory.planExpiresAt
                  ? (typeof paymentHistory.daysUntilExpiry === "number" && paymentHistory.daysUntilExpiry > 0
                      ? `${formatDaysLabel(paymentHistory.daysUntilExpiry)} remaining`
                      : "Renew to keep premium access")
                  : "Upgrade to unlock reminders"}
                {paymentHistory.planExpiresAt && paymentHistory.reminderWindowInDays
                  ? ` • Reminder ${paymentHistory.reminderWindowInDays} days prior`
                  : ""}
              </p>
            </div>
          </div>

          {paymentHistory.paymentInfo ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-[0.3em]">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Last payment
              </div>
              <p>
                <span className="text-slate-400">Payment ID:</span> {paymentHistory.paymentInfo.razorpay_payment_id}
              </p>
              <p>
                <span className="text-slate-400">Order ID:</span> {paymentHistory.paymentInfo.razorpay_order_id}
              </p>
              <p>
                <span className="text-slate-400">Date:</span> {formatDate(paymentHistory.paymentInfo.paymentDate)}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              No payments recorded yet. Complete your first upgrade to see the full audit trail here.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-black hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              {loading ? "Closing..." : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
