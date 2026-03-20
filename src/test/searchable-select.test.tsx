import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchableSelect } from "@/components/SearchableSelect";

describe("SearchableSelect", () => {
  it("commits selected option", () => {
    const onChange = vi.fn();

    render(
      <SearchableSelect
        options={[
          { value: "LNB", label: "LNB" },
          { value: "NIFL", label: "NIFL" },
        ]}
        value=""
        onChange={onChange}
        freeText
      />
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "NIFL" }));

    expect(onChange).toHaveBeenCalledWith("NIFL");
  });

  it("commits typed free text on Enter", () => {
    const onChange = vi.fn();

    render(
      <SearchableSelect
        options={[{ value: "LNB", label: "LNB" }]}
        value=""
        onChange={onChange}
        freeText
      />
    );

    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByPlaceholderText("Type or select...");
    fireEvent.change(input, { target: { value: "Premier League" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Premier League");
  });
});
