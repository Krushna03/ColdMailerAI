import { Button } from "@/components/ui/button";
import { Lock, Sparkles, X } from "lucide-react";

export interface IterationLimitModalProps {
  open: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onUpgrade: () => void;
  maxVersions?: number;
}

const IterationLimitModal = ({
  open,
  onClose,
  onCreateNew,
  onUpgrade,
  maxVersions = 2,
}: IterationLimitModalProps) => {
  if (!open) return null;

  const updatesAllowed = Math.max(maxVersions - 1, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-surface-900 p-6 text-white animate-in fade-in zoom-in-50 duration-200"
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/40 bg-brand-900/60">
            <Lock className="h-6 w-6 text-brand-300" />
          </div>

          <h3 className="text-xl font-semibold">You&apos;ve reached the free limit</h3>

          <p className="text-sm leading-relaxed text-slate-300">
            Free accounts can create up to{" "}
            <span className="font-semibold text-white">{maxVersions} versions</span> per email
            (1 original + {updatesAllowed} update{updatesAllowed === 1 ? "" : "s"}). Upgrade for more
            revisions, or start a brand-new email.
          </p>

          <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row">
            <Button
              onClick={onCreateNew}
              variant="outline"
              className="flex-1 cursor-pointer border-white/20 text-white transition hover:bg-white/10"
            >
              Create new email
            </Button>
            <Button
              onClick={onUpgrade}
              className="flex-1 cursor-pointer gap-1 bg-brand-700 text-white hover:bg-brand-600"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IterationLimitModal;
