import { supabase } from "@/integrations/supabase/client";

const CSV_HEADERS = [
  "name",
  "email",
  "phone",
  "company_name",
  "source",
  "service_interest",
  "status",
  "notes",
] as const;

const REQUIRED_FIELDS = ["name", "email", "phone"] as const;

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function exportLeadsCsv(leads: any[]) {
  const headerRow = CSV_HEADERS.join(",");
  const rows = leads.map((lead) =>
    CSV_HEADERS.map((h) => escapeCsvField(String(lead[h] ?? ""))).join(",")
  );
  const csv = [headerRow, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

export async function importLeadsCsv(file: File): Promise<ImportResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { success: 0, errors: [{ row: 0, message: "CSV file is empty or has no data rows" }] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const missingRequired = REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missingRequired.length > 0) {
    return {
      success: 0,
      errors: [{ row: 0, message: `Missing required columns: ${missingRequired.join(", ")}` }],
    };
  }

  const result: ImportResult = { success: 0, errors: [] };
  const validLeads: Record<string, string | null>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Validate required fields
    const rowErrors: string[] = [];
    if (!row.name?.trim()) rowErrors.push("name is required");
    if (!row.email?.trim()) rowErrors.push("email is required");
    if (!row.phone?.trim()) rowErrors.push("phone is required");

    if (rowErrors.length > 0) {
      result.errors.push({ row: i + 1, message: rowErrors.join("; ") });
      continue;
    }

    validLeads.push({
      name: row.name.trim(),
      email: row.email.trim(),
      phone: row.phone.trim(),
      company_name: row.company_name?.trim() || null,
      source: row.source?.trim() || null,
      service_interest: row.service_interest?.trim() || null,
      notes: row.notes?.trim() || null,
    });
  }

  // Batch insert in chunks of 50
  const CHUNK_SIZE = 50;
  for (let i = 0; i < validLeads.length; i += CHUNK_SIZE) {
    const chunk = validLeads.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("leads").insert(chunk as any);
    if (error) {
      result.errors.push({
        row: i + 2,
        message: `Batch insert failed: ${error.message}`,
      });
    } else {
      result.success += chunk.length;
    }
  }

  return result;
}

export function downloadCsvTemplate() {
  const csv = CSV_HEADERS.join(",") + "\nJohn Doe,john@example.com,+1234567890,Acme Corp,google,SEO,,Initial contact";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leads-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
