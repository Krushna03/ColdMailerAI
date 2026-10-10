import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

interface FormValues {
  name: string;
  description: string;
}

export default function AddCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddCategoryDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      name: data.name.trim(),
      description: data.description?.trim() || "",
    });
    reset();
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border border-white/10 bg-surface-900 p-0 text-white sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 pr-12 text-left bg-surface-950/60">
          <DialogTitle className="text-lg font-semibold text-white">
            Add category
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Create a custom outreach category for your leads only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pt-0 py-5">
          <div>
            <label htmlFor="category-name" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="category-name"
              placeholder="e.g. Investor Outreach"
              className="h-9 border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
              {...register("name", {
                required: "Category name is required",
                minLength: {
                  value: 2,
                  message: "Use at least 2 characters",
                },
              })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="category-description"
              className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              Description
            </label>
            <Textarea
              id="category-description"
              placeholder="Optional short note about when to use this category"
              className="min-h-[80px] border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 focus-visible:ring-offset-0 text-xs sm:text-sm rounded-md"
              {...register("description")}
            />
          </div>

          <DialogFooter className="gap-2 border-t border-white/10 px-0 pb-0 pt-4 sm:space-x-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-brand text-white hover:bg-brand-400 text-xs sm:text-sm font-semibold rounded-md"
            >
              {isSubmitting ? "Saving..." : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
