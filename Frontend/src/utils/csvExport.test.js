import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  BULK_LEAD_LIMIT,
  parseLeadsCsv,
  downloadResultsAsCsv,
  getLeadRowIssues,
} from "./csvExport";

function makeFile(content, name = "leads.csv") {
  return new File([content], name, { type: "text/csv" });
}

describe("parseLeadsCsv", () => {
  it("maps common headers and returns lead objects", async () => {
    const file = makeFile(
      "Name,Company,Title,Email,Notes\nJane,Acme,CEO,jane@acme.com,Met at conf\n"
    );
    const leads = await parseLeadsCsv(file);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: "Jane",
      company: "Acme",
      role: "CEO",
      email: "jane@acme.com",
      notes: "Met at conf",
      issues: [],
    });
  });

  it("keeps rows missing a name and marks issues for preview", async () => {
    const file = makeFile("name,company\n,Acme\n");
    const leads = await parseLeadsCsv(file);
    expect(leads).toHaveLength(1);
    expect(leads[0].company).toBe("Acme");
    expect(leads[0].issues).toContain("Missing name");
  });

  it("rejects more than the bulk limit client-side", async () => {
    const header = "name,company\n";
    const rows = Array.from({ length: BULK_LEAD_LIMIT + 1 }, (_, i) => `Lead ${i},Co\n`).join("");
    const file = makeFile(header + rows);
    await expect(parseLeadsCsv(file)).rejects.toThrow(/up to 200/i);
  });

  it("rejects empty CSV", async () => {
    const file = makeFile("name,company\n");
    await expect(parseLeadsCsv(file)).rejects.toThrow(/No leads found/i);
  });
});

describe("getLeadRowIssues", () => {
  it("flags invalid emails", () => {
    expect(getLeadRowIssues({ name: "Jane", email: "not-an-email" })).toContain(
      "Invalid email"
    );
  });
});

describe("downloadResultsAsCsv", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("triggers a browser download", () => {
    const click = vi.fn();
    const remove = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click,
    });
    vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
    vi.spyOn(document.body, "removeChild").mockImplementation(remove);

    downloadResultsAsCsv([
      {
        leadName: "Jane",
        leadEmail: "jane@acme.com",
        leadCompany: "Acme",
        success: true,
        generatedEmail: "Hello Jane",
      },
    ]);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
