import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { parseLeadsCsv } from "../../utils/csvExport";
import { useToast } from "@/hooks/use-toast";
import CsvImportPreviewDialog, { CsvLeadRow } from "./CsvImportPreviewDialog";

interface CsvUploadButtonProps {
  onImport: (
    leads: any[],
    options: { categoryId: string; verifyEmails: boolean }
  ) => Promise<any>;
  isImporting: boolean;
  categories?: any[];
  existingLeads?: any[];
  onAddCategory?: () => void;
}

export default function CsvUploadButton({
  onImport,
  isImporting,
  categories = [],
  existingLeads = [],
  onAddCategory,
}: CsvUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<CsvLeadRow[]>([]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const leads = await parseLeadsCsv(file);
      setPreviewRows(leads as CsvLeadRow[]);
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        title: "CSV import failed",
        description: error?.message || "Could not import that file.",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async (leads: any[], options: { categoryId: string; verifyEmails: boolean }) => {
    const res = await onImport(leads, options);
    setPreviewOpen(false);
    setPreviewRows([]);
    return res;
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <Input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isImporting}
          onClick={() => inputRef.current?.click()}
          className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white text-xs"
        >
          <Upload className="h-3 w-3" />
          Upload CSV
        </Button>
      </div>

      <CsvImportPreviewDialog
        open={previewOpen}
        onOpenChange={(next) => {
          setPreviewOpen(next);
          if (!next) setPreviewRows([]);
        }}
        rows={previewRows}
        onConfirm={handleConfirm}
        isImporting={isImporting}
        categories={categories}
        existingLeads={existingLeads}
        onAddCategory={onAddCategory}
      />
    </>
  );
}
