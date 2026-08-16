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
      <div className="rounded-2xl border border-dashed border-white/15 bg-surface-800/40 px-6 py-16 text-center">
        <p className="text-xl font-semibold text-gray-200">No leads yet</p>
        <p className="mt-2 text-sm text-gray-400">
          Add a lead manually or upload a CSV to start batch generation.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-800/60">
      <Table className="min-w-full text-left text-sm text-gray-200">
        <TableHeader className="border-b border-white/10 bg-surface-900/80 text-xs uppercase tracking-wide text-gray-400">
          <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-auto px-4 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all leads"
                />
              </TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Name</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Category</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Company</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Status</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Generated</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Sent</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Next follow-up</TableHead>
              <TableHead className="h-auto px-4 py-3 font-medium">Action</TableHead>
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
                  className="cursor-pointer border-white/5 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                >
                  <TableCell
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleLead(lead._id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-white">
                    <span className="underline-offset-2 group-hover:underline">
                      {lead.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-300">
                    {getCategoryName(lead.categoryId)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-300">
                    {lead.company || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(
                        lead.status
                      )}`}
                    >
                      {statusLabel(lead.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-300">
                    {lead.emailsGeneratedCount ?? 0}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-300">
                    {lead.emailsSentCount ?? 0}
                  </TableCell>
                  <TableCell
                    className={`px-4 py-3 ${
                      overdue ? "font-medium text-red-300" : "text-gray-300"
                    }`}
                  >
                    {lead.nextFollowUpAt
                      ? `${formatShortDate(lead.nextFollowUpAt)}${
                          overdue ? " · Overdue" : ""
                        }`
                      : "—"}
                  </TableCell>
                  <TableCell
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => onDeleteLead(lead._id)}
                      className="h-8 px-2 text-red-300 hover:bg-white/10 hover:text-red-200"
                      aria-label={`Delete ${lead.name}`}
                    >
                      <MdDelete />
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
