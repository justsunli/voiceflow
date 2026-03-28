import type { RecorderState } from "../types";
import { formatDuration } from "../utils";

type RecorderCardProps = {
  recorderState: RecorderState;
  recordingSeconds: number;
  transcriptionError: string | null;
  copyNotice: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function RecorderCard({
  recorderState,
  recordingSeconds,
  transcriptionError,
  copyNotice,
  onStartRecording,
  onStopRecording,
}: RecorderCardProps) {
  return (
    <section className="card">
      <h2>Recorder</h2>
      <p className="muted">Max duration: 5:00</p>
      <div className="status-row">
        <span className="badge">{recorderState}</span>
        <span className="timer">{formatDuration(recordingSeconds)}</span>
      </div>
      <div className="button-group">
        <button
          onClick={onStartRecording}
          disabled={recorderState === "recording" || recorderState === "processing"}
        >
          {recorderState === "recording" ? "Recording..." : "Start Recording"}
        </button>
        <button onClick={onStopRecording} disabled={recorderState !== "recording"}>
          Stop
        </button>
      </div>
      {recorderState === "processing" ? <p>Transcribing audio...</p> : null}
      {transcriptionError ? <p className="error">{transcriptionError}</p> : null}
      {copyNotice ? <p className="ok-note">{copyNotice}</p> : null}
    </section>
  );
}
