import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

function defaultDueDate(): Date {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(9, 0, 0, 0);
  return date;
}

function combineDateAndTime(date: Date, time: string = "09:00"): Date {
  const [hours = "9", minutes = "0"] = String(time).split(":");
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return next;
}

interface AddFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { dueAt: string; note: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  isReplied?: boolean;
  hasActiveSequence?: boolean;
}

interface FormValues {
  dueDate: Date;
  dueTime: string;
  note: string;
}

export default function AddFollowUpDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  isReplied,
  hasActiveSequence,
}: AddFollowUpDialogProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      dueDate: defaultDueDate(),
      dueTime: "09:00",
      note: "",
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCalendarOpen(false);
      reset({
        dueDate: defaultDueDate(),
        dueTime: "09:00",
        note: "",
      });
    }
    onOpenChange(nextOpen);
  };

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      dueAt: combineDateAndTime(data.dueDate, data.dueTime).toISOString(),
      note: data.note?.trim() || "",
    });
    reset({
      dueDate: defaultDueDate(),
      dueTime: "09:00",
      note: "",
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl border border-white/10 bg-surface-900 p-0 text-white sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-5 pr-12 text-left bg-surface-950/60">
          <DialogTitle className="text-lg font-semibold text-white">
            Schedule follow-up
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Set a reminder date and an optional note. This stays on the lead timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pt-0 py-5">
          {hasActiveSequence && !isReplied && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <strong>Note:</strong> Automated emails are already running. Use this reminder for tasks like a phone call or LinkedIn message.
            </div>
          )}

          {isReplied && (
            <div className="rounded-md border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-300">
              <strong>Prospect replied:</strong> Automated emails are paused. Set a reminder below for your next step, like a call or demo.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1.4fr,0.8fr]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Due date <span className="text-red-400">*</span>
              </label>
              <Controller
                name="dueDate"
                control={control}
                rules={{ required: "Due date is required" }}
                render={({ field }) => (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-start text-left font-normal border border-white/15 bg-surface-900 text-white hover:bg-white/5 text-xs sm:text-sm rounded-md",
                          !field.value && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto border border-white/15 bg-surface-900 p-0 rounded-lg shadow-xl"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (!date) return;
                          field.onChange(date);
                          setCalendarOpen(false);
                        }}
                        disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dueDate && (
                <p className="mt-1 text-xs text-red-400">{errors.dueDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="followup-time" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Time
              </label>
              <Input
                id="followup-time"
                type="time"
                className="h-9 border border-white/15 bg-surface-900 text-white focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 text-xs sm:text-sm rounded-md"
                {...register("dueTime")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="followup-note" className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Note
            </label>
            <Textarea
              id="followup-note"
              placeholder="Ask about pricing, share case study…"
              className="min-h-[90px] border border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 focus-visible:ring-offset-0 text-xs md:text-sm rounded-md"
              {...register("note")}
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
              className="h-9 px-4 bg-brand text-white hover:bg-brand-400 text-xs sm:text-[13px] font-semibold rounded-md"
            >
              {isSubmitting ? "Saving..." : "Add follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
