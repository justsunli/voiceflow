import type { Transcription } from "../types";
import { formatDateTime } from "../utils";

type HistoryCardProps = {
  transcriptions: Transcription[];
  historyLoading: boolean;
  editingId: number | null;
  editingText: string;
  actionLoadingId: number | null;
  onChangeEditingText: (value: string) => void;
  onStartEditing: (entry: Transcription) => void;
  onCancelEditing: () => void;
  onSaveEditing: (id: number) => void;
  onDelete: (id: number) => void;
  onCopy: (text: string) => void;
};

export function HistoryCard({
  transcriptions,
  historyLoading,
  editingId,
  editingText,
  actionLoadingId,
  onChangeEditingText,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onDelete,
  onCopy,
}: HistoryCardProps) {
  return (
    <section className="card">
      <h2>History</h2>
      {historyLoading ? <p>Loading history...</p> : null}
      {!historyLoading && transcriptions.length === 0 ? <p className="muted">No records found.</p> : null}
      <ul className="history-list">
        {transcriptions.map((entry) => {
          const isEditing = editingId === entry.id;
          const busy = actionLoadingId === entry.id;
          return (
            <li key={entry.id} className="history-item">
              <p className="muted">{formatDateTime(entry.created_at)}</p>
              {isEditing ? (
                <textarea
                  className="transcript-editor"
                  value={editingText}
                  onChange={(event) => onChangeEditingText(event.target.value)}
                  rows={3}
                />
              ) : (
                <p>{entry.transcript}</p>
              )}
              <div className="history-actions">
                {isEditing ? (
                  <>
                    <button disabled={busy} onClick={() => onSaveEditing(entry.id)}>
                      Save
                    </button>
                    <button className="secondary-btn" disabled={busy} onClick={onCancelEditing}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="secondary-btn" onClick={() => onCopy(entry.transcript)}>
                      Copy
                    </button>
                    <button disabled={busy || editingId !== null} onClick={() => onStartEditing(entry)}>
                      Edit
                    </button>
                    <button
                      className="danger-btn"
                      disabled={busy || editingId !== null}
                      onClick={() => onDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
