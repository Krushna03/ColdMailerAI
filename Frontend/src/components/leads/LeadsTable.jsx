import { useNavigate } from "react-router-dom";
import { MdDelete } from "react-icons/md";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import LeadsTableSkeleton from "../../loaders/LeadsTableSkeleton";
import {
  formatShortDate,
  isFollowUpOverdue,
  statusBadgeClass,
  statusLabel,
} from "./leadUtils";
import { getCategoryName } from "./CategorySelect";

export default function LeadsTable({
  leads,
  selectedLeadIds,
  onToggleLead,
  onToggleAll,
  onDeleteLead,
  isLoading,
  isDeleting,
}) {
  const navigate = useNavigate();
  const allSelected =
    leads.length > 0 && leads.every((lead) => selectedLeadIds.has(lead._id));
  const someSelected = leads.some((lead) => selectedLeadIds.has(lead._id));

  if (isLoading && leads.length === 0) {
    return <LeadsTableSkeleton />;
  }

  if (!isLoading && leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-surface-900 px-6 py-12 text-center">
        <p className="text-base font-semibold text-white">No leads found</p>
        <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">
          There are currently no leads matching your search or filters. Try adjusting your filters or adding a new lead.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-surface-900">
      <Table className="min-w-full text-left text-xs sm:text-sm text-gray-200">
        <TableHeader className="border-b border-white/10 bg-surface-950 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-9 px-3.5 py-2">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all leads"
                />
              </TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium">Name</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium">Category</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium">Company</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium">Status</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium text-center">Generated</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium text-center">Sent</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium">Next follow-up</TableHead>
              <TableHead className="h-9 px-3.5 py-2 font-medium text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {leads.map((lead) => {
              const checked = selectedLeadIds.has(lead._id);
              const overdue = isFollowUpOverdue(lead.nextFollowUpAt, "pending");

              return (
                <TableRow
                  key={lead._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/leads/${lead._id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/dashboard/leads/${lead._id}`);
                    }
                  }}
                  className="cursor-pointer border-b border-white/5 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none transition-colors"
                >
                  <TableCell
                    className="px-3.5 py-2.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleLead(lead._id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 font-medium text-white">
                    <span className="hover:underline underline-offset-2">
                      {lead.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-gray-300">
                    {getCategoryName(lead.categoryId)}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-gray-300">
                    {lead.company || "—"}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusBadgeClass(
                        lead.status
                      )}`}
                    >
                      {statusLabel(lead.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-gray-300 text-center font-mono text-xs">
                    {lead.emailsGeneratedCount ?? 0}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-gray-300 text-center font-mono text-xs">
                    {lead.emailsSentCount ?? 0}
                  </TableCell>
                  <TableCell
                    className={`px-3.5 py-2.5 text-xs ${
                      overdue ? "font-medium text-red-400" : "text-gray-300"
                    }`}
                  >
                    {lead.nextFollowUpAt
                      ? `${formatShortDate(lead.nextFollowUpAt)}${
                          overdue ? " · Overdue" : ""
                        }`
                      : "—"}
                  </TableCell>
                  <TableCell
                    className="px-3.5 py-2.5 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => onDeleteLead(lead._id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:bg-red-500/10 hover:text-red-300 rounded-md"
                      aria-label={`Delete ${lead.name}`}
                    >
                      <MdDelete className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
