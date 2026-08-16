import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { LEAD_STATUS_OPTIONS, getAllowedNextStatuses } from "./leadUtils";
import CategorySelect, { getCategoryId } from "./CategorySelect";

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

export default function LeadProfileForm({
  lead,
  onSave,
  isSaving,
  categories = [],
  onAddCategory,
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm({
    defaultValues: {
      name: lead?.name || "",
      company: lead?.company || "",
      role: lead?.role || "",
      email: lead?.email || "",
      notes: lead?.notes || "",
      status: lead?.status || "new",
      categoryId: getCategoryId(lead?.categoryId),
    },
  });

  useEffect(() => {
    reset({
      name: lead?.name || "",
      company: lead?.company || "",
      role: lead?.role || "",
      email: lead?.email || "",
      notes: lead?.notes || "",
      status: lead?.status || "new",
      categoryId: getCategoryId(lead?.categoryId),
    });
  }, [lead, reset]);

  const submit = handleSubmit(async (data) => {
    await onSave({
      ...data,
      email: data.email?.trim().toLowerCase() || "",
    });
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-800/50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        {isDirty && (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={submit}
            className="bg-brand text-white hover:bg-brand-400"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm text-gray-300">
              Name
            </label>
            <Input
              id="profile-name"
              className={fieldClass}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Category</label>
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
                  triggerClassName={`w-full ${fieldClass}`}
                />
              )}
            />
            {errors.categoryId && (
              <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => {
                const statusOptions = getAllowedNextStatuses(lead?.status || "new");
                return (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      aria-label="Lead status"
                      className={`${fieldClass} w-full`}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.disabled}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          </div>
          <div>
            <label htmlFor="profile-company" className="mb-1.5 block text-sm text-gray-300">
              Company
            </label>
            <Input id="profile-company" className={fieldClass} {...register("company")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-role" className="mb-1.5 block text-sm text-gray-300">
              Role
            </label>
            <Input id="profile-role" className={fieldClass} {...register("role")} />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-sm text-gray-300">
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              className={fieldClass}
              {...register("email")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-notes" className="mb-1.5 block text-sm text-gray-300">
            Notes
          </label>
          <Textarea
            id="profile-notes"
            className="min-h-[100px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
            {...register("notes")}
          />
        </div>
      </form>
    </section>
  );
}
