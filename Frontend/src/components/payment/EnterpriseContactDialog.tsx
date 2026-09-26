import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useContactMutation } from "../../hooks/useAuth";

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0";

interface EnterpriseContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultEmail?: string;
}

interface FormValues {
  name: string;
  email: string;
  company: string;
  monthlyVolume: string;
  message: string;
}

export default function EnterpriseContactDialog({
  open,
  onOpenChange,
  defaultName = "",
  defaultEmail = "",
}: EnterpriseContactDialogProps) {
  const { toast } = useToast();
  const showErrorToast = useErrorToast();
  const { mutate: sendContact, isPending } = useContactMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      company: "",
      monthlyVolume: "",
      message: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: defaultName || "",
      email: defaultEmail || "",
      company: "",
      monthlyVolume: "",
      message: "",
    });
  }, [open, defaultName, defaultEmail, reset]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset({
        name: "",
        email: "",
        company: "",
        monthlyVolume: "",
        message: "",
      });
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = handleSubmit((data) => {
    sendContact(
      {
        name: data.name.trim(),
        email: data.email.trim(),
        company: data.company.trim(),
        monthlyVolume: data.monthlyVolume.trim(),
        message: data.message.trim(),
        source: "enterprise",
      },
      {
        onSuccess: (res: any) => {
          if (res.status === 200) {
            handleClose(false);
            toast({
              title: "Inquiry submitted",
              description: "Thanks — we received your requirements and will get back to you soon.",
            });
            return;
          }

          toast({
            title: "Could not submit inquiry",
            description: res.data?.message || "Please try again.",
            variant: "destructive",
          });
        },
        onError: (error) => {
          showErrorToast(error, {
            title: "Could not submit inquiry",
            fallback: "An unexpected error occurred. Please try again later.",
          });
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            Contact sales
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Tell us your volume and requirements. We’ll review your inquiry and follow up soon.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="enterprise-name" className="mb-1.5 block text-sm text-gray-300">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="enterprise-name"
              className={fieldClass}
              placeholder="Jane Smith"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="enterprise-email" className="mb-1.5 block text-sm text-gray-300">
              Work email <span className="text-red-400">*</span>
            </label>
            <Input
              id="enterprise-email"
              type="email"
              className={fieldClass}
              placeholder="jane@company.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email",
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="enterprise-company" className="mb-1.5 block text-sm text-gray-300">
                Company
              </label>
              <Input
                id="enterprise-company"
                className={fieldClass}
                placeholder="Acme Inc."
                {...register("company")}
              />
            </div>
            <div>
              <label htmlFor="enterprise-volume" className="mb-1.5 block text-sm text-gray-300">
                Monthly email volume
              </label>
              <Input
                id="enterprise-volume"
                className={fieldClass}
                placeholder="e.g. 500–2000"
                {...register("monthlyVolume")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="enterprise-message" className="mb-1.5 block text-sm text-gray-300">
              Requirements <span className="text-red-400">*</span>
            </label>
            <Textarea
              id="enterprise-message"
              rows={5}
              className="min-h-[120px] rounded-xl border-white/15 bg-surface-900 px-4 py-3 text-xs md:text-sm text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0"
              placeholder="Team size, use cases, must-have features, timeline..."
              {...register("message", { required: "Please share your requirements" })}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-400">{errors.message.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-white/10 pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-white/15 bg-transparent text-gray-200 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-brand text-white hover:bg-brand-400"
            >
              {isPending ? "Submitting..." : "Submit inquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
