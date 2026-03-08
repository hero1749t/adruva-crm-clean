import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importLeadsCsv, downloadCsvTemplate, type ImportResult } from "@/lib/csv-utils";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportLeadsDialog = ({ open, onOpenChange }: ImportLeadsDialogProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === "text/csv") {
      setFile(f);
      setResult(null);
    } else if (f) {
      toast({ title: "Invalid file", description: "Please select a CSV file", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await importLeadsCsv(file);
      setResult(res);
      if (res.success > 0) {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        toast({ title: `${res.success} leads imported successfully` });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV file with lead data. Required columns: name, email, phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={downloadCsvTemplate}
          >
            <FileText className="h-4 w-4" />
            Download CSV Template
          </Button>

          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Click to select a CSV file"}
            </p>
            {file && (
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.success} leads imported successfully
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {result.errors.length} error{result.errors.length > 1 ? "s" : ""}
                  </div>
                  <div className="max-h-[120px] overflow-y-auto text-xs text-muted-foreground">
                    {result.errors.map((e, i) => (
                      <p key={i}>Row {e.row}: {e.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? "Importing…" : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadsDialog;
