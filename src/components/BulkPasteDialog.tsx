import React, { useState } from "react";
import { ClipboardPaste, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type BulkColumn = {
  key: string;
  label: string;
  required?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: BulkColumn[];
  onImport: (rows: Record<string, string>[]) => Promise<void>;
};

function parsePaste(text: string, columns: BulkColumn[]): Record<string, string>[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("\t");
    const row: Record<string, string> = {};
    columns.forEach((col, i) => {
      row[col.key] = (parts[i] ?? "").trim();
    });
    return row;
  });
}

export default function BulkPasteDialog({ open, onOpenChange, title, columns, onImport }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = text.trim() ? parsePaste(text, columns) : [];
  const valid = preview.filter((r) =>
    columns.filter((c) => c.required).every((c) => r[c.key]?.length > 0)
  );
  const invalid = preview.length - valid.length;

  const handleImport = async () => {
    if (!valid.length) return;
    setLoading(true);
    try {
      await onImport(valid);
      toast.success(`Imported ${valid.length} rows`);
      setText("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Bulk Import — {title}</DialogTitle>
          <DialogDescription>
            Paste tab-separated data. Columns: {columns.map((c) => c.label).join(" | ")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={8}
          placeholder={columns.map((c) => c.label).join("\t")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-xs"
        />

        {preview.length > 0 && (
          <div className="border border-border rounded overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {columns.map((c) => (
                    <th key={c.key} className="px-2 py-1 text-left font-semibold text-muted-foreground">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => {
                  const isValid = columns
                    .filter((c) => c.required)
                    .every((c) => row[c.key]?.length > 0);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-b-0 ${
                        !isValid ? "bg-destructive/10 text-destructive" : ""
                      }`}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className="px-2 py-1 truncate max-w-[200px]">
                          {row[c.key] || <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {preview.length} row{preview.length !== 1 ? "s" : ""} parsed
          {invalid > 0 && <span className="text-destructive ml-1">({invalid} invalid, will be skipped)</span>}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" disabled={!valid.length || loading} onClick={handleImport}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Import {valid.length} row{valid.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
