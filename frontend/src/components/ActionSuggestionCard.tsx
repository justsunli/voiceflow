import type { ActionSuggestion } from "../types";

type ActionSuggestionCardProps = {
  suggestion: ActionSuggestion;
  saving: boolean;
  error: string | null;
  draftTitle: string;
  draftDate: string;
  draftTime: string;
  onChangeTitle: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeTime: (value: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function ActionSuggestionCard({
  suggestion,
  saving,
  error,
  draftTitle,
  draftDate,
  draftTime,
  onChangeTitle,
  onChangeDate,
  onChangeTime,
  onConfirm,
  onDismiss,
}: ActionSuggestionCardProps) {
  const confidence = suggestion.confidence || "unknown";

  return (
    <section className="card">
      <h2>Suggested Action</h2>
      <p className="muted confidence-row">
        Confidence: {confidence}
        <span
          className={`confidence-dot confidence-${confidence}`}
          aria-hidden="true"
        />
      </p>

      <div className="field-grid">
        <label>
          Title
          <input value={draftTitle} onChange={(e) => onChangeTitle(e.target.value)} />
        </label>

        <label>
          Date
          <input type="date" value={draftDate} onChange={(e) => onChangeDate(e.target.value)} />
        </label>

        <label>
          Time
          <input type="time" value={draftTime} onChange={(e) => onChangeTime(e.target.value)} />
        </label>
      </div>

      <div className="history-actions">
        <button disabled={saving} onClick={onConfirm}>
          Confirm
        </button>
        <button className="secondary-btn" disabled={saving} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
