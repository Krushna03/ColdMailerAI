import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Trash2Icon } from "lucide-react";

export const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "persuasive", label: "Persuasive" },
  { value: "formal", label: "Formal" },
];

const fieldClass =
  "h-9 border-white/15 bg-surface-900 text-white placeholder:text-gray-500 focus-visible:ring-brand-400/40 focus-visible:ring-offset-surface-900";

export default function BatchGenerateDialog({
  open,
  onOpenChange,
  leads,
  onGenerate,
  isGenerating,
  categoryHint = null,
}) {
  const [draftLeads, setDraftLeads] = useState([]);
  const [tone, setTone] = useState("professional");
  const [purpose, setPurpose] = useState("");
  const [isStartingJob, setIsStartingJob] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftLeads(
      (leads || []).map((lead) => ({
        _id: lead._id,
        name: lead.name || "",
        company: lead.company || "",
        role: lead.role || "",
        email: lead.email || "",
        notes: lead.notes || "",
      }))
    );
    setTone("professional");
    setPurpose("");
  }, [open, leads]);

  const readyCount = useMemo(
    () => draftLeads.filter((lead) => lead.name.trim()).length,
    [draftLeads]
  );

  const updateLead = (id, patch) => {
    setDraftLeads((prev) =>
      prev.map((lead) => (lead._id === id ? { ...lead, ...patch } : lead))
    );
  };

  const removeLead = (id) => {
    setDraftLeads((prev) => prev.filter((lead) => lead._id !== id));
  };

  const handleGenerate = async () => {
    const ready = draftLeads.filter((lead) => lead.name.trim());
    setIsStartingJob(true);
    try {
      await onGenerate({
        leads: ready,
        tone,
        purpose: purpose.trim(),
      });
    } catch (err) {
      console.error("Failed to initiate batch job:", err);
    } finally {
      setIsStartingJob(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-7xl flex-col overflow-hidden border-white/10 bg-surface-900 p-0 text-white sm:rounded-xl [&>button]:text-slate-400 [&>button]:hover:text-white">
        <DialogHeader className="space-y-1 border-b border-white/10 px-6 pb-4 pt-4 pr-12 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            Generate emails
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {categoryHint
              ? `Category: ${categoryHint}. Set one purpose for this whole batch, pick a tone, then generate.`
              : "Preview selected leads, set one purpose and tone for the batch, then generate."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger
                  aria-label="Email tone"
                  className="h-11 rounded-xl border-white/15 bg-surface-900 text-white"
                >
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="batch-purpose" className="mb-1.5 block text-sm text-gray-300">
                Purpose to contact
              </label>
              <Textarea
                id="batch-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Introduce our outbound tool and ask for a 15-min intro call"
                className="min-h-[44px] border-white/15 bg-surface-900 text-white placeholder:text-gray-500 sm:min-h-[88px] focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:ring-offset-0 md:text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-white">
                Selected leads ({draftLeads.length})
              </h3>
              <p className="text-xs text-gray-400">
                Edits here update the lead before generation
              </p>
            </div>

            {draftLeads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-gray-400">
                No leads selected. Close this dialog and select leads from the table.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border border-white/10">
                <Table className="min-w-[720px] text-sm">
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Company</TableHead>
                      <TableHead className="text-gray-400">Role</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Notes / context</TableHead>
                      <TableHead className="w-20 text-gray-400"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftLeads.map((lead) => (
                      <TableRow key={lead._id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="align-top">
                          <Input
                            value={lead.name}
                            onChange={(e) =>
                              updateLead(lead._id, { name: e.target.value })
                            }
                            className={fieldClass}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            value={lead.company}
                            onChange={(e) =>
                              updateLead(lead._id, { company: e.target.value })
                            }
                            className={fieldClass}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            value={lead.role}
                            onChange={(e) =>
                              updateLead(lead._id, { role: e.target.value })
                            }
                            className={fieldClass}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            value={lead.email}
                            onChange={(e) =>
                              updateLead(lead._id, { email: e.target.value })
                            }
                            className={fieldClass}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            value={lead.notes}
                            onChange={(e) =>
                              updateLead(lead._id, { notes: e.target.value })
                            }
                            className={fieldClass}
                            placeholder="Why reach out to this person"
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLead(lead._id)}
                            className="text-gray-400 hover:bg-white/10 hover:text-red-500"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
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
            disabled={isGenerating || isStartingJob || readyCount === 0}
            onClick={handleGenerate}
            className="bg-brand text-white hover:bg-brand-400"
          >
            {isGenerating || isStartingJob
              ? "Starting..."
              : `Generate ${readyCount} email${readyCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
