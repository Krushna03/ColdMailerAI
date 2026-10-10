import React from "react";
import { Controller, useForm } from "react-hook-form";
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
import CategorySelect from "./CategorySelect";
import { LeadCategory } from "./leadUtils";

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void> | void;
  isSubmitting?: boolean;
  categories?: LeadCategory[];
  onAddCategory?: () => void;
}

interface FormValues {
  name: string;
  company: string;
  role: string;
  email: string;
  notes: string;
  categoryId: string;
}

export default function AddLeadDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  categories = [],
  onAddCategory,
}: AddLeadDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      company: "",
      role: "",
      email: "",
      notes: "",
      categoryId: "",
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      email: data.email?.trim().toLowerCase() || "",
    });
    reset();
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl border border-white/10 bg-surface-900 p-0 text-white sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 pr-12 text-left bg-surface-950/60">
          <DialogTitle className="text-lg font-semibold text-white">
            Add lead
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Save a recipient and pick the outreach category for this lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pt-0 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Category <span className="text-red-400">*</span>
            </label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <CategorySelect
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  onAddCategory={onAddCategory}
                  className="w-full"
                  triggerClassName="w-full h-9"
                />
              )}
            />
            {errors.categoryId && (
              <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-name" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="lead-name"
              placeholder="Jane Smith"
              className="h-9 border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-company" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Company
              </label>
              <Input
                id="lead-company"
                placeholder="Acme Inc"
                className="h-9 border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
                {...register("company")}
              />
            </div>
            <div>
              <label htmlFor="lead-role" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Role
              </label>
              <Input
                id="lead-role"
                placeholder="Head of Growth"
                className="h-9 border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
                {...register("role")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lead-email" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email
            </label>
            <Input
              id="lead-email"
              type="email"
              placeholder="jane@acme.com"
              className="h-9 border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
              {...register("email")}
            />
          </div>

          <div>
            <label htmlFor="lead-notes" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Notes
            </label>
            <Textarea
              id="lead-notes"
              placeholder="Met at SaaS meetup; interested in outbound tooling"
              className="min-h-[90px] border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 focus-visible:ring-offset-0 text-xs sm:text-sm rounded-md"
              {...register("notes")}
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
              {isSubmitting ? "Saving..." : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
