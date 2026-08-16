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

export default function AddCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleClose = (nextOpen) => {
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
      <DialogContent className="max-w-lg border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-2 border-b border-white/10 px-6 pb-4 pt-5 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            Add category
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Create a custom outreach category for your leads only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pb-5">
          <div>
            <label htmlFor="category-name" className="mb-1.5 block text-sm text-gray-300">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="category-name"
              placeholder="e.g. Investor Outreach"
              className={fieldClass}
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
              className="mb-1.5 block text-sm text-gray-300"
            >
              Description
            </label>
            <Textarea
              id="category-description"
              placeholder="Optional short note about when to use this category"
              className="min-h-[80px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
              {...register("description")}
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
              {isSubmitting ? "Saving..." : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
