import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Flag } from "lucide-react";

type Props = {
  impactLevel: "high" | "low" | null;
  description: string;
  onSave: (impact: "high" | "low", description: string) => void;
  onClear: () => void;
};

export function ReportCell({ impactLevel, description, onSave, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<"high" | "low">(impactLevel ?? "low");
  const [desc, setDesc] = useState(description);

  const handleOpen = () => {
    setImpact(impactLevel ?? "low");
    setDesc(description);
    setOpen(true);
  };

  const handleSave = () => {
    onSave(impact, desc);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  const bgClass =
    impactLevel === "high"
      ? "bg-red-500/20 text-red-700 dark:text-red-400"
      : impactLevel === "low"
      ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
      : "";

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        className={`w-full h-full flex items-center justify-center text-[10px] font-medium transition-colors hover:opacity-80 ${bgClass}`}
        title={impactLevel ? `${impactLevel} impact: ${description}` : "Add report"}
      >
        {impactLevel === "high" && <AlertTriangle className="h-3.5 w-3.5" />}
        {impactLevel === "low" && <Flag className="h-3.5 w-3.5" />}
        {!impactLevel && <span className="text-muted-foreground">—</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Incident Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Impact Level</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImpact("high")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    impact === "high"
                      ? "border-red-500 bg-red-500/15 text-red-700 dark:text-red-400"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  High Impact
                </button>
                <button
                  type="button"
                  onClick={() => setImpact("low")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    impact === "low"
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  Low Impact
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe the incident..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {impactLevel && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
                Clear Report
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
