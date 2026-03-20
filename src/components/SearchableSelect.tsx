import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchableSelect({ options, value, onChange, placeholder = "—", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const updatePos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 1, left: rect.left, width: Math.max(rect.width, 120) });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      inputRef.current?.focus();
    }
  }, [open, updatePos]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-input rounded px-1 py-0.5 text-[10px] bg-background focus:outline-none focus:ring-1 focus:ring-ring truncate text-left min-h-[20px] gap-0.5"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-popover border border-border rounded shadow-lg"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          >
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
                if (e.key === "Enter" && filtered.length === 1) {
                  handleSelect(filtered[0].value);
                }
              }}
              className="w-full px-1.5 py-1 text-[11px] bg-background border-b border-border focus:outline-none"
              placeholder="Type to filter..."
            />
            <div className="max-h-[180px] overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full text-left px-1.5 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground ${
                  !value ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                {placeholder}
              </button>
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={`w-full text-left px-1.5 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground ${
                    value === o.value ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  {o.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-1.5 py-1 text-[11px] text-muted-foreground">No match</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
