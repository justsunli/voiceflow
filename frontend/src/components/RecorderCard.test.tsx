import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecorderCard } from "./RecorderCard";

describe("RecorderCard", () => {
  it("shows timer and handles start click", () => {
    cleanup();
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <RecorderCard
        recorderState="idle"
        recordingSeconds={5}
        transcriptionError={null}
        copyNotice={null}
        onStartRecording={onStart}
        onStopRecording={onStop}
      />,
    );

    expect(screen.getByText("00:05")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Recording" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("disables start button during recording", () => {
    cleanup();
    render(
      <RecorderCard
        recorderState="recording"
        recordingSeconds={30}
        transcriptionError={null}
        copyNotice={null}
        onStartRecording={() => undefined}
        onStopRecording={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Recording..." })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Stop" })[0]).toBeEnabled();
  });
});
