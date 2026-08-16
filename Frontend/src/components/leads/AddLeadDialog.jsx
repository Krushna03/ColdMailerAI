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

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

export default function AddLeadDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  categories = [],
  onAddCategory,
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      company: "",
      role: "",
      email: "",
      notes: "",
      categoryId: "",
    },
  });

  const handleClose = (nextOpen) => {
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
      <DialogContent className="max-w-xl border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            Add lead
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Save a recipient and pick the outreach category for this lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">
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
                  triggerClassName="w-full"
                />
              )}
            />
            {errors.categoryId && (
              <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-name" className="mb-1.5 block text-sm text-gray-300">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="lead-name"
              placeholder="Jane Smith"
              className={fieldClass}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-company" className="mb-1.5 block text-sm text-gray-300">
                Company
              </label>
              <Input
                id="lead-company"
                placeholder="Acme Inc"
                className={fieldClass}
                {...register("company")}
              />
            </div>
            <div>
              <label htmlFor="lead-role" className="mb-1.5 block text-sm text-gray-300">
                Role
              </label>
              <Input
                id="lead-role"
                placeholder="Head of Growth"
                className={fieldClass}
                {...register("role")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lead-email" className="mb-1.5 block text-sm text-gray-300">
              Email
            </label>
            <Input
              id="lead-email"
              type="email"
              placeholder="jane@acme.com"
              className={fieldClass}
              {...register("email")}
            />
          </div>

          <div>
            <label htmlFor="lead-notes" className="mb-1.5 block text-sm text-gray-300">
              Notes
            </label>
            <Textarea
              id="lead-notes"
              placeholder="Met at SaaS meetup; interested in outbound tooling"
              className="min-h-[90px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
              {...register("notes")}
            />
          </div>

          <DialogFooter className="gap-3 border-t border-white/10 px-0 pb-0 pt-4 sm:space-x-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="text-gray-300 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand text-white hover:bg-brand-400"
            >
              {isSubmitting ? "Saving..." : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
