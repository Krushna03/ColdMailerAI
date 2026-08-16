import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function getCategoryId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
}

export function getCategoryName(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || "—";
}

export default function CategorySelect({
  categories = [],
  value,
  onChange,
  onAddCategory,
  placeholder = "Select category",
  disabled = false,
  className = "",
  triggerClassName = "",
  allowEmpty = false,
  emptyLabel = "All categories",
  id,
  prefix,
}) {
  const selected = value || (allowEmpty ? "all" : undefined);
  const textSizeClass = triggerClassName.match(/text-(xs|sm|base|lg|xl)/)?.[0] || "";

  return (
    <div
      className={cn(
        "relative flex items-center bg-surface-900 border border-white/15 rounded-lg h-10 overflow-hidden focus-within:ring-2 focus-within:ring-brand-400/40 focus-within:ring-offset-2 focus-within:ring-offset-surface-900 transition-all",
        className,
        triggerClassName
      )}
    >
      <Select
        value={selected}
        onValueChange={(next) => {
          if (allowEmpty && next === "all") onChange("");
          else onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label="Lead category"
          className={cn(
            "w-full h-full border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 pl-3 rounded-none [&>span]:line-clamp-1",
            onAddCategory ? "pr-10" : "pr-3",
            textSizeClass
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {prefix}
            <span className="truncate">
              <SelectValue placeholder={placeholder} />
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="all">{emptyLabel}</SelectItem>}
          {categories.map((category) => (
            <SelectItem
              key={category._id}
              value={category._id}
              className={cn("text-xs", textSizeClass)}
            >
              {category.name}
              {category.isDefault ? "" : " (custom)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onAddCategory && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
          <div className="w-[1px] h-3 bg-white/15 shrink-0" />
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddCategory();
            }}
            className="h-full px-2 shrink-0 border-0 rounded-none text-gray-300 hover:bg-transparent hover:text-white"
            aria-label="Add category"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
