import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getLeadRowIssues } from "../../utils/csvExport";
import CategorySelect from "./CategorySelect";

const fieldClass =
  "h-9 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

export default function CsvImportPreviewDialog({
  open,
  onOpenChange,
  rows,
  onConfirm,
  isImporting,
  categories = [],
  existingLeads = [],
  onAddCategory,
}) {
  const [draftRows, setDraftRows] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftRows(rows || []);
    setCategoryId("");
    setCategoryError("");
    setSummary(null);
    setSummaryOpen(false);
  }, [open, rows]);

  // Set of existing DB emails for the currently selected category
  const existingDbEmailsSet = useMemo(() => {
    if (!categoryId) return new Set();
    const set = new Set();
    for (const lead of existingLeads) {
      const leadCatId = String(lead.categoryId?._id || lead.categoryId || "");
      if (leadCatId === String(categoryId) && lead.email) {
        set.add(String(lead.email).trim().toLowerCase());
      }
    }
    return set;
  }, [categoryId, existingLeads]);

  // Set of emails appearing more than once in the CSV draft
  const fileDuplicateEmailsSet = useMemo(() => {
    const counts = new Map();
    for (const row of draftRows) {
      const email = String(row.email || "").trim().toLowerCase();
      if (email) {
        counts.set(email, (counts.get(email) || 0) + 1);
      }
    }
    const duplicates = new Set();
    for (const [email, count] of counts.entries()) {
      if (count > 1) duplicates.add(email);
    }
    return duplicates;
  }, [draftRows]);

  // Compute issues dynamically for draft rows
  const evaluatedRows = useMemo(() => {
    return draftRows.map((row) => ({
      ...row,
      issues: getLeadRowIssues(row, existingDbEmailsSet, fileDuplicateEmailsSet),
    }));
  }, [draftRows, existingDbEmailsSet, fileDuplicateEmailsSet]);

  const validCount = useMemo(
    () => evaluatedRows.filter((r) => r.issues.length === 0).length,
    [evaluatedRows]
  );

  const duplicateCount = useMemo(
    () =>
      evaluatedRows.filter((r) =>
        r.issues.some((i) => i.includes("Duplicate"))
      ).length,
    [evaluatedRows]
  );

  const invalidCount = useMemo(
    () =>
      evaluatedRows.filter((r) =>
        r.issues.some((i) => i === "Missing name" || i === "Invalid email")
      ).length,
    [evaluatedRows]
  );

  const totalParsed = rows?.length || 0;

  const updateRow = (id, patch) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (id) => {
    setDraftRows((prev) => prev.filter((row) => row.id !== id));
  };

  const skipDuplicates = () => {
    setDraftRows((prev) =>
      evaluatedRows
        .filter((r) => !r.issues.some((i) => i.includes("Duplicate")))
        .map(({ issues, ...rest }) => rest)
    );
  };

  const skipInvalid = () => {
    setDraftRows((prev) =>
      evaluatedRows
        .filter(
          (r) => !r.issues.some((i) => i === "Missing name" || i === "Invalid email")
        )
        .map(({ issues, ...rest }) => rest)
    );
  };

  const skipAllIssues = () => {
    setDraftRows((prev) =>
      evaluatedRows
        .filter((r) => r.issues.length === 0)
        .map(({ issues, ...rest }) => rest)
    );
  };

  const handleConfirm = async () => {
    if (!categoryId) {
      setCategoryError("Choose a category for these leads");
      return;
    }
    setCategoryError("");

    const ready = evaluatedRows
      .filter((row) => row.issues.length === 0)
      .map(({ name, company, role, email, notes }) => ({
        name,
        company,
        role,
        email,
        notes,
        categoryId,
      }));

    try {
      const res = await onConfirm(ready);
      const insertedCount = res?.insertedCount ?? ready.length;
      const backendDuplicates = res?.duplicateCount ?? 0;
      const skippedDuplicates = duplicateCount + backendDuplicates;

      setSummary({
        total: totalParsed,
        insertedCount,
        duplicateCount: skippedDuplicates,
        invalidCount,
      });
      onOpenChange(false);
      setSummaryOpen(true);
    } catch {
      // Handled by caller toast
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-[1340px] flex-col overflow-hidden border-white/20 bg-surface-900 p-0 text-white sm:rounded-3xl [&>button]:text-slate-400 [&>button]:hover:text-white">
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-3 pt-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold text-white">
            Preview & Validate CSV Import
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Review each row before importing. We automatically detect duplicates and invalid emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 border-b border-white/10 px-6 pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[220px] max-w-[360px] flex-1">
              <label className="mb-2.5 block text-xs font-medium text-gray-300">
                Category for this upload <span className="text-red-400">*</span>
              </label>
              <CategorySelect
                categories={categories}
                value={categoryId}
                onChange={(next) => {
                  setCategoryId(next);
                  setCategoryError("");
                }}
                onAddCategory={onAddCategory}
                className="w-full "
                triggerClassName="w-full h-9 text-sm w-full"
              />
              {categoryError && (
                <p className="mt-1 text-xs text-red-400">{categoryError}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
              <div className="rounded-lg bg-surface-800 border border-white/10 px-3 py-1.5 text-gray-300">
                Total: <span className="font-semibold text-white">{totalParsed}</span>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-emerald-300">
                Ready: <span className="font-semibold">{validCount}</span>
              </div>
              {duplicateCount > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-amber-300">
                  Duplicates: <span className="font-semibold">{duplicateCount}</span>
                </div>
              )}
              {invalidCount > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-red-300">
                  Invalid: <span className="font-semibold">{invalidCount}</span>
                </div>
              )}

              {(duplicateCount > 0 || invalidCount > 0) && (
                <div className="flex items-center gap-2 border-l border-white/15 pl-2.5 ml-1">
                  {duplicateCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={skipDuplicates}
                      className="h-7 text-amber-300 border border-gray-200 hover:bg-white/10 hover:text-amber-200 text-xs px-2"
                    >
                      Skip duplicates ({duplicateCount})
                    </Button>
                  )}
                  {invalidCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={skipInvalid}
                      className="h-7 text-red-300 border border-gray-200 hover:bg-white/10 hover:text-red-200 text-xs px-2"
                    >
                      Skip invalid ({invalidCount})
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={skipAllIssues}
                    className="h-7 text-gray-300 border border-gray-200 hover:bg-white/10 hover:text-white text-xs px-2"
                  >
                    Skip all issues
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 flex flex-col overflow-hidden px-4 pt-0 pb-2 sm:px-6">
          {evaluatedRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-gray-400">
              No rows left to import. Upload another CSV or cancel.
            </div>
          ) : (
            <Table containerClassName="min-h-0 flex-1 overflow-auto" className="min-w-[760px] text-sm">
              <TableHeader className="sticky top-0 z-30  bg-surface-900">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="sticky top-0 z-30  bg-surface-900 text-gray-400 shadow-sm">Name</TableHead>
                  <TableHead className="sticky top-0 z-30  bg-surface-900 text-gray-400 shadow-sm">Company</TableHead>
                  <TableHead className="sticky top-0 z-30  bg-surface-900 text-gray-400 shadow-sm">Role</TableHead>
                  <TableHead className="sticky top-0 z-30  bg-surface-900 text-gray-400 shadow-sm">Email</TableHead>
                  <TableHead className="sticky top-0 z-30 bg-surface-900 text-gray-400 shadow-sm">Notes</TableHead>
                  <TableHead className="sticky top-0 z-30 bg-surface-900 text-gray-400 shadow-sm">Status</TableHead>
                  <TableHead className="w-12 sticky top-0 z-30 bg-surface-900 text-gray-400 shadow-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {evaluatedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`border-white/5 hover:bg-white/5 ${
                        row.issues.length ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <TableCell className="align-top">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          className={fieldClass}
                          placeholder="Required"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.company}
                          onChange={(e) =>
                            updateRow(row.id, { company: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.role}
                          onChange={(e) => updateRow(row.id, { role: e.target.value })}
                          className={fieldClass}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.email}
                          onChange={(e) =>
                            updateRow(row.id, { email: e.target.value })
                          }
                          className={fieldClass}
                          placeholder="optional"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={row.notes}
                          onChange={(e) =>
                            updateRow(row.id, { notes: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        {row.issues.length ? (
                          <div className="flex flex-col gap-1">
                            {row.issues.map((issue) => (
                              <span
                                key={issue}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  issue.includes("Duplicate")
                                    ? "bg-amber-500/20 text-amber-200"
                                    : "bg-red-500/20 text-red-200"
                                }`}
                              >
                                {issue}
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className=" text-left text-[11px] text-gray-400 underline-offset-2 hover:text-white hover:underline"
                            >
                              Skip row
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-emerald-300">
                            Ready
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(row.id)}
                          className="h-8 px-2 text-red-300 hover:bg-white/10 hover:text-red-200"
                          aria-label={`Remove ${row.name || "row"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
            )}
          </div>

          <DialogFooter className="gap-3 border-t border-white/10 px-6 py-3 sm:space-x-0">
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
              type="button"
              disabled={isImporting || validCount === 0}
              onClick={handleConfirm}
              className="bg-brand text-white hover:bg-brand-400"
            >
              {isImporting
                ? "Importing..."
                : `Import ${validCount} lead${validCount === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-md border-white/20 bg-surface-900 p-6 text-white sm:rounded-3xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-white">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              Import Completed
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Here is the breakdown of your CSV import results.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="my-4 rounded-2xl border border-white/10 bg-surface-800/60 p-4 space-y-3 text-sm text-gray-300">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Total Rows in File:</span>
                <span className="font-semibold text-white">{summary.total}</span>
              </div>
              <div className="flex justify-between text-emerald-300 font-medium">
                <span>Successfully Added:</span>
                <span>{summary.insertedCount}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Duplicates Skipped:</span>
                <span>{summary.duplicateCount}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Invalid Rows Skipped:</span>
                <span>{summary.invalidCount}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSummaryOpen(false)}
              className="w-full bg-brand text-white hover:bg-brand-400"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
