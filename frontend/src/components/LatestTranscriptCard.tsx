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
        <h2>Latest</h2>
        {latestTranscription ? (
          <button
            className="card-icon-btn"
            aria-label="Copy latest transcript"
            onClick={() => onCopy(latestTranscription.transcript)}
          >
            <svg
              className="card-icon-svg"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path
                d="M6 7H5C3.89543 7 3 7.89543 3 9V19C3 20.1046 3.89543 21 5 21H15C16.1046 21 17 20.1046 17 19V18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {latestTranscription ? (
        <>
          <p className="meta-time">{formatDateTime(latestTranscription.created_at)}</p>
          <p className="card-body-text">{latestTranscription.transcript}</p>
        </>
      ) : (
        <p className="muted">No transcript yet.</p>
      )}
    </section>
  );
}
