import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HistoryCard } from "./HistoryCard";

const sample = {
  id: 1,
  mode: "action" as const,
  transcript: "buy milk",
  created_at: "2026-03-27T10:00:00Z",
  action_suggestion: null,
};

describe("HistoryCard", () => {
  it("shows loading state", () => {
    cleanup();
    render(
      <HistoryCard
        transcriptions={[]}
        historyLoading
        editingId={null}
        editingText=""
        actionLoadingId={null}
        onChangeEditingText={() => undefined}
        onStartEditing={() => undefined}
        onCancelEditing={() => undefined}
        onSaveEditing={() => undefined}
        onDelete={() => undefined}
        onCopy={() => undefined}
        openMenuKey={null}
        onMenuToggle={() => undefined}
        onMenuClose={() => undefined}
      />,
    );

    expect(screen.getByText("Loading history...")).toBeInTheDocument();
  });

  it("calls edit callback when edit button is clicked", () => {
    cleanup();
    const onStartEditing = vi.fn();

    render(
      <HistoryCard
        transcriptions={[sample]}
        historyLoading={false}
        editingId={null}
        editingText=""
        actionLoadingId={null}
        onChangeEditingText={() => undefined}
        onStartEditing={onStartEditing}
        onCancelEditing={() => undefined}
        onSaveEditing={() => undefined}
        onDelete={() => undefined}
        onCopy={() => undefined}
        openMenuKey="history-1"
        onMenuToggle={() => undefined}
        onMenuClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onStartEditing).toHaveBeenCalledWith(sample);
  });

  it("shows textarea and save/cancel when editing", () => {
    cleanup();
    const onSaveEditing = vi.fn();

    render(
      <HistoryCard
        transcriptions={[sample]}
        historyLoading={false}
        editingId={1}
        editingText="updated"
        actionLoadingId={null}
        onChangeEditingText={() => undefined}
        onStartEditing={() => undefined}
        onCancelEditing={() => undefined}
        onSaveEditing={onSaveEditing}
        onDelete={() => undefined}
        onCopy={() => undefined}
        openMenuKey={null}
        onMenuToggle={() => undefined}
        onMenuClose={() => undefined}
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveEditing).toHaveBeenCalledWith(1);
  });
});
