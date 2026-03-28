import type { Transcription } from "../types";
import { formatDateTime } from "../utils";

type LatestTranscriptCardProps = {
  latestTranscription?: Transcription;
  onCopy: (text: string) => void;
};

export function LatestTranscriptCard({ latestTranscription, onCopy }: LatestTranscriptCardProps) {
  return (
    <section className="card">
      <div className="title-row">
        <h2>Latest Transcript</h2>
        {latestTranscription ? (
          <button className="secondary-btn" onClick={() => onCopy(latestTranscription.transcript)}>
            Copy
          </button>
        ) : null}
      </div>
      {latestTranscription ? (
        <>
          <p className="muted">{formatDateTime(latestTranscription.created_at)}</p>
          <p>{latestTranscription.transcript}</p>
        </>
      ) : (
        <p className="muted">No transcript yet.</p>
      )}
    </section>
  );
}
