import React, { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchableCellEditor } from "@/components/SearchableCellEditor";

type EditorRef = {
  getValue: () => string;
  isCancelAfterEnd: () => boolean;
};

describe("SearchableCellEditor", () => {
  it("commits dropdown selection on pointer interaction", () => {
    const stopEditing = vi.fn();
    const ref = createRef<EditorRef>();

    render(
      <SearchableCellEditor
        ref={ref}
        value=""
        values={["ATP-026", "DanishL-037"]}
        stopEditing={stopEditing}
      />
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "ATP-026" }));

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect(ref.current?.getValue()).toBe("ATP-026");
  });

  it("commits typed free text on blur", () => {
    const stopEditing = vi.fn();
    const ref = createRef<EditorRef>();

    render(
      <SearchableCellEditor
        ref={ref}
        value=""
        values={["LNB", "NIFL"]}
        freeText
        stopEditing={stopEditing}
      />
    );

    const input = screen.getByPlaceholderText("Type or select...");
    fireEvent.change(input, { target: { value: "NBL" } });
    fireEvent.blur(input);

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect(ref.current?.getValue()).toBe("NBL");
  });
});
