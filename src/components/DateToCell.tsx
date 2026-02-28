import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  value: string | null;
  onChange: (val: string | null) => void;
};

export function DateToCell({ value, onChange }: Props) {
  const [extended, setExtended] = useState(!!value);

  const handleToggle = (checked: boolean) => {
    setExtended(checked);
    if (!checked) {
      onChange(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 w-full h-full px-1">
      <Checkbox
        checked={extended}
        onCheckedChange={(c) => handleToggle(!!c)}
        className="h-3.5 w-3.5 shrink-0"
      />
      {extended ? (
        <input
          type="date"
          className="border border-border rounded px-1 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-[10px] text-muted-foreground italic">Extended</span>
      )}
    </div>
  );
}
