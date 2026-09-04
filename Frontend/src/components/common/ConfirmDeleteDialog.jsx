import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDeleting = false,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-surface-900 p-6 shadow-2xl text-white">
        {/* Title with line at bottom separator */}
        <DialogHeader className="pb-3 border-b border-white/10 text-left">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-semibold text-white">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Description below separator */}
        <div className="py-2">
          <DialogDescription className="text-xs text-gray-300 leading-relaxed">
            {description}
          </DialogDescription>
        </div>

        {/* Buttons */}
        <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="border-white/15 bg-white/5 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-red-600 text-xs text-white hover:bg-red-500 font-semibold gap-1.5"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
