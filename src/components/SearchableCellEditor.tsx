import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

type Props = {
  value: string;
  values: string[];
  stopEditing: () => void;
  freeText?: boolean;
};

export const SearchableCellEditor = forwardRef((props: Props, ref) => {
  const [search, setSearch] = useState(props.freeText ? (props.value || "") : "");
  const [selected, setSelected] = useState(props.value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Use a mutable ref so getValue always returns current value
  const valueRef = useRef(props.freeText ? (props.value || "") : (props.value || ""));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current,
    isCancelAfterEnd: () => false,
  }));

  useEffect(() => {
    if (props.freeText) valueRef.current = search;
  }, [search, props.freeText]);

  useEffect(() => {
    if (!props.freeText) valueRef.current = selected;
  }, [selected, props.freeText]);

  const filtered = search
    ? props.values.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : props.values;

  const handleSelect = (val: string) => {
    if (props.freeText) {
      setSearch(val);
    } else {
      setSelected(val);
    }
    valueRef.current = val;
    props.stopEditing();
  };

  const handlePointerSelect = (e: React.PointerEvent<HTMLButtonElement>, val: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelect(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (props.freeText) {
      valueRef.current = val;
    }
  };

  return (
    <div className="ag-custom-component-popup bg-popover border border-border rounded shadow-lg w-full min-w-[140px] z-[9999]">
      <input
        ref={inputRef}
        value={search}
        onChange={handleInputChange}
        onBlur={() => {
          if (!props.freeText) return;
          valueRef.current = search;
          props.stopEditing();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") props.stopEditing();
          if (e.key === "Enter") {
            if (props.freeText) {
              valueRef.current = search;
              props.stopEditing();
            } else if (filtered.length === 1) {
              handleSelect(filtered[0]);
            } else {
              const exact = props.values.find((v) => v.toLowerCase() === search.toLowerCase());
              if (exact) handleSelect(exact);
            }
          }
        }}
        className="w-full px-2 py-1 text-xs bg-background border-b border-border focus:outline-none"
        placeholder={props.freeText ? "Type or select..." : "Type to filter..."}
      />
      <div className="max-h-[200px] overflow-y-auto">
        {!props.freeText && (
          <button
            type="button"
            onPointerDown={(e) => handlePointerSelect(e, "")}
            className={`w-full text-left px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground ${!selected ? "bg-accent text-accent-foreground" : ""}`}
          >
            —
          </button>
        )}
        {filtered.map((v) => (
          <button
            key={v}
            type="button"
            onPointerDown={(e) => handlePointerSelect(e, v)}
            className={`w-full text-left px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground ${(props.freeText ? search === v : selected === v) ? "bg-accent text-accent-foreground" : ""}`}
          >
            {v}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-1 text-xs text-muted-foreground">No match</div>
        )}
      </div>
    </div>
  );
});

SearchableCellEditor.displayName = "SearchableCellEditor";