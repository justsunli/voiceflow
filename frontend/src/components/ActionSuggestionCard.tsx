import type { ActionSuggestion, ActionType } from "../types";

type ActionSuggestionCardProps = {
  suggestion: ActionSuggestion;
  saving: boolean;
  error: string | null;
  draftType: ActionType;
  draftTitle: string;
  draftDate: string;
  draftTime: string;
  onChangeType: (value: ActionType) => void;
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
  draftType,
  draftTitle,
  draftDate,
  draftTime,
  onChangeType,
  onChangeTitle,
  onChangeDate,
  onChangeTime,
  onConfirm,
  onDismiss,
}: ActionSuggestionCardProps) {
  return (
    <section className="card">
      <h2>Suggested Action</h2>
      <p className="muted">Confidence: {suggestion.confidence || "unknown"}</p>

      <div className="field-grid">
        <label>
          Type
          <select value={draftType} onChange={(e) => onChangeType(e.target.value as ActionType)}>
            <option value="event">event</option>
            <option value="reminder">reminder</option>
            <option value="todo">todo</option>
          </select>
        </label>

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
