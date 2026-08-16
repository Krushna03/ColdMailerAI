import { useState } from "react";
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

function defaultDueDate() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(9, 0, 0, 0);
  return date;
}

function combineDateAndTime(date, time = "09:00") {
  const [hours = "9", minutes = "0"] = String(time).split(":");
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return next;
}

export default function AddFollowUpDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dueDate: defaultDueDate(),
      dueTime: "09:00",
      note: "",
    },
  });

  const handleClose = (nextOpen) => {
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
      <DialogContent className="max-w-xl border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            Schedule follow-up
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Set a reminder date and an optional note. No notifications yet,
            this stays on the lead timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pt-0 py-5">
          <div className="grid gap-4 sm:grid-cols-[1.4fr,0.8fr]">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">
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
                          fieldClass,
                          "w-full justify-start text-left font-normal hover:bg-surface-800 hover:text-white",
                          !field.value && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto border-white/15 bg-surface-900 p-0"
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
              <label htmlFor="followup-time" className="mb-1.5 block text-sm text-gray-300">
                Time
              </label>
              <Input
                id="followup-time"
                type="time"
                className={fieldClass}
                {...register("dueTime")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="followup-note" className="mb-1.5 block text-sm text-gray-300">
              Note
            </label>
            <Textarea
              id="followup-note"
              placeholder="Ask about pricing, share case study…"
              className="min-h-[90px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
              {...register("note")}
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
              {isSubmitting ? "Saving..." : "Add follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
