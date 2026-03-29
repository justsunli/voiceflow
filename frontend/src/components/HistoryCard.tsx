import type { Transcription } from "../types";
import { formatDateTime } from "../utils";
import { CardActionsMenu } from "./CardActionsMenu";

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
  openMenuKey: string | null;
  onMenuToggle: (menuKey: string) => void;
  onMenuClose: () => void;
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
  openMenuKey,
  onMenuToggle,
  onMenuClose,
}: HistoryCardProps) {
  return (
    <section className="card">
      <h2>Recent Activity</h2>
      {historyLoading ? <p>Loading history...</p> : null}
      {!historyLoading && transcriptions.length === 0 ? <p className="muted">No records found.</p> : null}
      <ul className="history-list">
        {transcriptions.map((entry) => {
          const isEditing = editingId === entry.id;
          const busy = actionLoadingId === entry.id;
          const menuKey = `history-${entry.id}`;
          const menuOpen = openMenuKey === menuKey;
          return (
            <li key={entry.id} className="history-item">
              <div className="history-item-head">
                <p className="meta-time">{formatDateTime(entry.created_at)}</p>
                {!isEditing ? (
                  <div className="history-item-head-actions">
                    <button
                      className="card-icon-btn"
                      aria-label="Copy transcript"
                      onClick={() => onCopy(entry.transcript)}
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
                    <CardActionsMenu
                      open={menuOpen}
                      triggerLabel="Open actions menu"
                      onToggle={() => onMenuToggle(menuKey)}
                      onClose={onMenuClose}
                      actions={[
                        {
                          key: "edit",
                          label: "Edit",
                          disabled: busy || editingId !== null,
                          onSelect: () => onStartEditing(entry),
                        },
                        {
                          key: "delete",
                          label: "Delete",
                          danger: true,
                          disabled: busy || editingId !== null,
                          onSelect: () => onDelete(entry.id),
                        },
                      ]}
                    />
                  </div>
                ) : null}
              </div>
              <div className="history-item-body">
                {isEditing ? (
                  <textarea
                    className="transcript-editor"
                    value={editingText}
                    onChange={(event) => onChangeEditingText(event.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="card-body-text">{entry.transcript}</p>
                )}
              </div>
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
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
