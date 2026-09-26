import Papa from "papaparse";

const BULK_LEAD_LIMIT = 200;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const normalizeHeader = (header: any) =>
  String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const COLUMN_MAP: Record<string, string> = {
  name: "name",
  fullname: "name",
  company: "company",
  organization: "company",
  role: "role",
  title: "role",
  jobtitle: "role",
  email: "email",
  emailaddress: "email",
  notes: "notes",
  note: "notes",
};

export function getLeadRowIssues(
  lead: any,
  existingDbEmails: Set<string> = new Set(),
  fileDuplicateEmails: Set<string> = new Set()
): string[] {
  const issues: string[] = [];
  if (!String(lead?.name ?? "").trim()) {
    issues.push("Missing name");
  }
  const email = String(lead?.email ?? "").trim().toLowerCase();
  if (email) {
    if (!EMAIL_REGEX.test(email)) {
      issues.push("Invalid email");
    } else {
      if (fileDuplicateEmails.has(email)) {
        issues.push("Duplicate in file");
      }
      if (existingDbEmails.has(email)) {
        issues.push("Duplicate lead");
      }
    }
  }
  return issues;
}

// Parse an uploaded CSV into previewable lead rows.
// Invalid rows are kept with issues so the user can edit/skip before import.
export function parseLeadsCsv(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const key = normalizeHeader(header);
        return COLUMN_MAP[key] || key;
      },
      complete: (result: any) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0].message || "Failed to parse CSV"));
          return;
        }

        const rows = result.data || [];
        if (!rows.length) {
          reject(new Error("No leads found in the CSV file"));
          return;
        }

        if (rows.length > BULK_LEAD_LIMIT) {
          reject(
            new Error(
              `You can upload up to ${BULK_LEAD_LIMIT} leads at a time. This file has ${rows.length}.`
            )
          );
          return;
        }

        const leads = rows.map((row: any, index: number) => {
          const lead = {
            id: `csv-${index}-${Date.now()}`,
            name: String(row.name ?? "").trim(),
            company: String(row.company ?? "").trim(),
            role: String(row.role ?? "").trim(),
            email: String(row.email ?? "").trim(),
            notes: String(row.notes ?? "").trim(),
          };
          return {
            ...lead,
            issues: getLeadRowIssues(lead),
          };
        });

        resolve(leads);
      },
      error: (error: any) => {
        reject(new Error(error?.message || "Failed to parse CSV"));
      },
    });
  });
}

// Download batch generation results as a CSV file (client-side only).
export function downloadResultsAsCsv(results: any[], filename = "coldmailer-batch-results.csv") {
  const rows = (results || []).map((item) => ({
    name: item.leadName ?? "",
    email: item.leadEmail ?? "",
    company:
      typeof item.leadCompany === "object"
        ? item.leadCompany?.name ?? ""
        : item.leadCompany ?? "",
    success: item.success ? "yes" : "no",
    generatedEmail: item.generatedEmail ?? "",
    error: item.error ?? "",
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { BULK_LEAD_LIMIT };
