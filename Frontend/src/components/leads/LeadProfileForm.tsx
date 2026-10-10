import React, { useEffect, useState } from "react";
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
import { getAllowedNextStatuses, getTagBadgeClass } from "./leadUtils";
import CategorySelect, { getCategoryId } from "./CategorySelect";
import { Plus, X, Tag, Sliders } from "lucide-react";

const fieldClass =
  "h-10 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900 text-xs sm:text-sm";

interface LeadProfileFormProps {
  lead?: {
    name?: string;
    company?: any;
    jobTitle?: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    location?: string;
    timezone?: string;
    notes?: string;
    status?: string;
    categoryId?: any;
    tags?: string[];
    customFields?: Record<string, any>;
    [key: string]: any;
  } | null;
  onSave: (payload: any) => Promise<any> | void;
  isSaving?: boolean;
  categories?: any[];
  onAddCategory?: () => void;
}

interface FormValues {
  name: string;
  companyName: string;
  companyDomain: string;
  companyIndustry: string;
  companySize: string;
  companyRevenue: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  location: string;
  timezone: string;
  notes: string;
  status: string;
  categoryId: string;
}

export default function LeadProfileForm({
  lead,
  onSave,
  isSaving,
  categories = [],
  onAddCategory,
}: LeadProfileFormProps) {
  const [tagsList, setTagsList] = useState<string[]>(lead?.tags || []);
  const [newTag, setNewTag] = useState("");

  const [customFieldsState, setCustomFieldsState] = useState<Record<string, any>>(
    lead?.customFields && typeof lead?.customFields === "object" ? lead.customFields : {}
  );
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: lead?.name || "",
      companyName: typeof lead?.company === "object" ? lead?.company?.name || "" : lead?.company || "",
      companyDomain: lead?.company?.domain || "",
      companyIndustry: lead?.company?.industry || "",
      companySize: lead?.company?.size || "",
      companyRevenue: lead?.company?.revenue || "",
      jobTitle: lead?.jobTitle || lead?.role || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      linkedinUrl: lead?.linkedinUrl || "",
      location: lead?.location || "",
      timezone: lead?.timezone || "",
      notes: lead?.notes || "",
      status: lead?.status || "new",
      categoryId: getCategoryId(lead?.categoryId),
    },
  });

  useEffect(() => {
    reset({
      name: lead?.name || "",
      companyName: typeof lead?.company === "object" ? lead?.company?.name || "" : lead?.company || "",
      companyDomain: lead?.company?.domain || "",
      companyIndustry: lead?.company?.industry || "",
      companySize: lead?.company?.size || "",
      companyRevenue: lead?.company?.revenue || "",
      jobTitle: lead?.jobTitle || lead?.role || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      linkedinUrl: lead?.linkedinUrl || "",
      location: lead?.location || "",
      timezone: lead?.timezone || "",
      notes: lead?.notes || "",
      status: lead?.status || "new",
      categoryId: getCategoryId(lead?.categoryId),
    });
    setTagsList(lead?.tags || []);
    setCustomFieldsState(
      lead?.customFields && typeof lead?.customFields === "object" ? lead.customFields : {}
    );
  }, [lead, reset]);

  const handleAddTag = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const clean = newTag.trim();
    if (clean && !tagsList.includes(clean)) {
      setTagsList([...tagsList, clean]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter((t) => t !== tagToRemove));
  };

  const handleAddCustomField = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const key = newFieldKey.trim();
    const val = newFieldValue.trim();
    if (key) {
      setCustomFieldsState({
        ...customFieldsState,
        [key]: val,
      });
      setNewFieldKey("");
      setNewFieldValue("");
    }
  };

  const handleRemoveCustomField = (keyToRemove: string) => {
    const updated = { ...customFieldsState };
    delete updated[keyToRemove];
    setCustomFieldsState(updated);
  };

  const submit = handleSubmit(async (data) => {
    await onSave({
      name: data.name.trim(),
      company: {
        name: data.companyName.trim(),
        domain: data.companyDomain.trim(),
        industry: data.companyIndustry.trim(),
        size: data.companySize.trim(),
        revenue: data.companyRevenue.trim(),
      },
      jobTitle: data.jobTitle.trim(),
      role: data.jobTitle.trim(),
      email: data.email?.trim().toLowerCase() || "",
      phone: data.phone?.trim() || "",
      linkedinUrl: data.linkedinUrl?.trim() || "",
      location: data.location?.trim() || "",
      timezone: data.timezone?.trim() || "",
      notes: data.notes?.trim() || "",
      status: data.status,
      categoryId: data.categoryId,
      tags: tagsList,
      customFields: customFieldsState,
    });
  });

  const hasTagChanges = JSON.stringify(tagsList) !== JSON.stringify(lead?.tags || []);
  const hasCustomFieldChanges =
    JSON.stringify(customFieldsState) !== JSON.stringify(lead?.customFields || {});
  const canSave = isDirty || hasTagChanges || hasCustomFieldChanges;

  return (
    <section className="rounded-lg border border-white/10 bg-surface-900 p-4 sm:p-5 space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white">Lead Profile</h2>
          <p className="mt-0.5 text-xs text-gray-400">Enterprise contact, company data, tags & custom fields</p>
        </div>
        {canSave && (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={submit}
            className="bg-brand text-white hover:bg-brand-400 text-xs px-4 h-8 font-semibold"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Basic info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-xs font-medium text-gray-300">
              Full Name *
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
            <label className="mb-1 block text-xs font-medium text-gray-300">Category *</label>
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

        {/* Persona & Status */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="profile-jobTitle" className="mb-1 block text-xs font-medium text-gray-300">
              Job Title / Role
            </label>
            <Input
              id="profile-jobTitle"
              placeholder="e.g. VP of Sales"
              className={fieldClass}
              {...register("jobTitle")}
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1 block text-xs font-medium text-gray-300">
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              placeholder="lead@company.com"
              className={fieldClass}
              {...register("email")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-300">Status</label>
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
        </div>

        {/* Contact info: Phone, LinkedIn, Location */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="profile-phone" className="mb-1 block text-xs font-medium text-gray-300">
              Phone
            </label>
            <Input
              id="profile-phone"
              placeholder="+1-555-123-4567"
              className={fieldClass}
              {...register("phone")}
            />
          </div>
          <div>
            <label htmlFor="profile-linkedin" className="mb-1 block text-xs font-medium text-gray-300">
              LinkedIn URL
            </label>
            <Input
              id="profile-linkedin"
              placeholder="https://linkedin.com/in/..."
              className={fieldClass}
              {...register("linkedinUrl")}
            />
          </div>
          <div>
            <label htmlFor="profile-location" className="mb-1 block text-xs font-medium text-gray-300">
              Location
            </label>
            <Input
              id="profile-location"
              placeholder="San Francisco, CA"
              className={fieldClass}
              {...register("location")}
            />
          </div>
        </div>

        {/* Company card */}
        {/* Company card */}
        <div className="rounded-lg border border-white/10 bg-surface-950 p-3.5 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Company Details
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="company-name" className="mb-1 block text-xs text-gray-400">
                Company Name
              </label>
              <Input
                id="company-name"
                placeholder="Acme Corp"
                className={fieldClass}
                {...register("companyName")}
              />
            </div>
            <div>
              <label htmlFor="company-domain" className="mb-1 block text-xs text-gray-400">
                Domain
              </label>
              <Input
                id="company-domain"
                placeholder="acme.com"
                className={fieldClass}
                {...register("companyDomain")}
              />
            </div>
            <div>
              <label htmlFor="company-industry" className="mb-1 block text-xs text-gray-400">
                Industry
              </label>
              <Input
                id="company-industry"
                placeholder="SaaS, E-commerce..."
                className={fieldClass}
                {...register("companyIndustry")}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="company-size" className="mb-1 block text-xs text-gray-400">
                Company Size
              </label>
              <Input
                id="company-size"
                placeholder="50-100, 1000+"
                className={fieldClass}
                {...register("companySize")}
              />
            </div>
            <div>
              <label htmlFor="company-revenue" className="mb-1 block text-xs text-gray-400">
                Revenue
              </label>
              <Input
                id="company-revenue"
                placeholder="$10M, Series B..."
                className={fieldClass}
                {...register("companyRevenue")}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="rounded-lg border border-white/10 bg-surface-950 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-brand-300" />
              Tags
            </span>
            <span className="text-[11px] text-gray-400">Multi-tagging support</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {tagsList.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getTagBadgeClass(
                  tag
                )}`}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {tagsList.length === 0 && (
              <span className="text-xs text-gray-400 italic">No tags assigned yet</span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(e);
                }
              }}
              placeholder="Add a tag (e.g. Decision Maker)"
              className="h-8 bg-surface-900 border-white/15 text-xs text-white"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddTag}
              className="h-8 border border-white/15 bg-surface-900 hover:bg-white/5 text-xs text-white shrink-0 rounded-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="rounded-lg border border-white/10 bg-surface-950 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-3 w-3 text-brand-300" />
              Custom Fields (Metadata)
            </span>
            <span className="text-[11px] text-gray-400">Flexible key-value attributes</span>
          </div>

          <div className="space-y-1.5">
            {Object.entries(customFieldsState).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-900 border border-white/10 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-brand-300">{k}:</span>
                  <span className="text-white">{String(v)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(k)}
                  className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {Object.keys(customFieldsState).length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No custom fields defined (e.g. companyTech, fundingStage).
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              placeholder="Field name (e.g. companyTech)"
              className="h-8 bg-surface-900 border-white/15 text-xs text-white w-1/2"
            />
            <Input
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder="Value (e.g. React)"
              className="h-8 bg-surface-900 border-white/15 text-xs text-white w-1/2"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddCustomField}
              className="h-8 border border-white/15 bg-surface-900 hover:bg-white/5 text-xs text-white shrink-0 rounded-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="profile-notes" className="mb-1 block text-xs font-medium text-gray-300">
            Notes & Context
          </label>
          <Textarea
            id="profile-notes"
            className="min-h-[80px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 text-xs sm:text-sm md:text-[13px]"
            {...register("notes")}
          />
        </div>
      </form>
    </section>
  );
}
