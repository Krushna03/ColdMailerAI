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
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          disabled={isImporting}
          onClick={() => inputRef.current?.click()}
          className="bg-brand text-white hover:bg-brand-400 text-xs sm:text-[13px] px-3 h-8 rounded-md shadow-none flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
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
