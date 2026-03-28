import { useEffect, useMemo, useRef, useState } from "react";

import { ActionSuggestionCard } from "./components/ActionSuggestionCard";
import { CardActionsMenu } from "./components/CardActionsMenu";
import { HistoryCard } from "./components/HistoryCard";
import { LatestTranscriptCard } from "./components/LatestTranscriptCard";
import { RecorderCard } from "./components/RecorderCard";
import { formatDateTime } from "./utils";
import type {
  ActionRecord,
  ActionType,
  MeResponse,
  RecorderState,
  Transcription,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";
const MAX_RECORDING_SECONDS = 300;

type ActionDraft = {
  transcriptionId: number;
  type: ActionType;
  title: string;
  date: string;
  time: string;
};

type CaptureMode = "transcript" | "action";

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";").map((entry) => entry.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [activeSuggestionId, setActiveSuggestionId] = useState<number | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [calendarSyncLoadingId, setCalendarSyncLoadingId] = useState<number | null>(null);
  const [actionDeletingId, setActionDeletingId] = useState<number | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("transcript");
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const captureModeRef = useRef<CaptureMode>("transcript");

  const googleLoginUrl = useMemo(
    () => `${API_BASE_URL}/accounts/google/login/?process=login`,
    [],
  );

  const activeSuggestionTranscription = transcriptions.find(
    (item) => item.id === activeSuggestionId && item.action_suggestion,
  );

  function clearRecorderTimers() {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  }

  function cleanupMediaTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice("Copied to clipboard.");
      window.setTimeout(() => setCopyNotice(null), 1800);
    } catch {
      setTranscriptionError("Copy failed. Browser clipboard permission may be blocked.");
    }
  }

  async function fetchMe() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Auth status request failed (${response.status})`);
      }
      const data = (await response.json()) as MeResponse;
      setMe(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setMe({ authenticated: false, user: null });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTranscriptions() {
    try {
      setHistoryLoading(true);
      setTranscriptionError(null);
      const response = await fetch(`${API_BASE_URL}/api/transcriptions/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`History request failed (${response.status})`);
      }
      const data = (await response.json()) as Transcription[];
      setTranscriptions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setTranscriptionError(message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchActions() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/actions/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Actions request failed (${response.status})`);
      }
      const data = (await response.json()) as ActionRecord[];
      setActions(data);
    } catch {
      // Non-blocking for main transcription flow.
    }
  }

  async function uploadAudio(blob: Blob, mode: CaptureMode) {
    const csrfToken = getCookie("csrftoken");
    const formData = new FormData();
    formData.append("audio", blob, `recording-${Date.now()}.webm`);
    formData.append("mode", mode);

    const response = await fetch(`${API_BASE_URL}/api/transcriptions/`, {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(payload.detail || `Upload failed (${response.status})`);
    }

    const created = (await response.json()) as Transcription;
    setTranscriptions((prev) => [created, ...prev]);
    if (mode === "action" && created.action_suggestion) {
      setActiveSuggestionId(created.id);
    } else {
      setActiveSuggestionId(null);
      setActionDraft(null);
      setActionError(null);
    }
  }

  async function updateTranscript(id: number, transcript: string) {
    const csrfToken = getCookie("csrftoken");
    const response = await fetch(`${API_BASE_URL}/api/transcriptions/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(payload.detail || `Update failed (${response.status})`);
    }

    const updated = (await response.json()) as Transcription;
    setTranscriptions((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  async function deleteTranscript(id: number) {
    const csrfToken = getCookie("csrftoken");
    const response = await fetch(`${API_BASE_URL}/api/transcriptions/${id}/`, {
      method: "DELETE",
      credentials: "include",
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(payload.detail || `Delete failed (${response.status})`);
    }

    setTranscriptions((prev) => prev.filter((item) => item.id !== id));
    if (activeSuggestionId === id || actionDraft?.transcriptionId === id) {
      setActiveSuggestionId(null);
      setActionDraft(null);
    }
  }

  async function confirmActionSuggestion() {
    if (!actionDraft) {
      return;
    }
    if (!actionDraft.title.trim()) {
      setActionError("Action title cannot be empty.");
      return;
    }

    try {
      setActionSaving(true);
      setActionError(null);
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(`${API_BASE_URL}/api/actions/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify({
          transcription_id: actionDraft.transcriptionId,
          type: actionDraft.type,
          title: actionDraft.title,
          date: actionDraft.date || null,
          time: actionDraft.time || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || `Action confirm failed (${response.status})`);
      }

      const created = (await response.json()) as ActionRecord;
      setActions((prev) => [created, ...prev]);
      setActiveSuggestionId(null);
      setActionDraft(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setActionError(message);
    } finally {
      setActionSaving(false);
    }
  }

  async function addActionToCalendar(actionId: number) {
    try {
      setCalendarSyncLoadingId(actionId);
      setActionError(null);
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(`${API_BASE_URL}/api/actions/${actionId}/add-to-calendar/`, {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || `Calendar sync failed (${response.status})`);
      }

      const updated = (await response.json()) as ActionRecord;
      setActions((prev) => prev.map((action) => (action.id === actionId ? updated : action)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setActionError(message);
    } finally {
      setCalendarSyncLoadingId(null);
    }
  }

  async function deleteAction(actionId: number) {
    try {
      setActionDeletingId(actionId);
      setActionError(null);
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(`${API_BASE_URL}/api/actions/${actionId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || `Action delete failed (${response.status})`);
      }

      setActions((prev) => prev.filter((action) => action.id !== actionId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setActionError(message);
    } finally {
      setActionDeletingId(null);
    }
  }

  function dismissActionSuggestion() {
    if (!activeSuggestionTranscription) {
      return;
    }
    setActiveSuggestionId(null);
    setActionDraft(null);
    setActionError(null);
  }

  function startEditing(entry: Transcription) {
    setEditingId(entry.id);
    setEditingText(entry.transcript);
    setTranscriptionError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingText("");
  }

  async function saveEditing(id: number) {
    const nextText = editingText.trim();
    if (!nextText) {
      setTranscriptionError("Transcript cannot be empty.");
      return;
    }

    try {
      setActionLoadingId(id);
      setTranscriptionError(null);
      await updateTranscript(id, nextText);
      cancelEditing();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setTranscriptionError(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(id: number) {
    try {
      setActionLoadingId(id);
      setTranscriptionError(null);
      await deleteTranscript(id);
      if (editingId === id) {
        cancelEditing();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setTranscriptionError(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleLogout() {
    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      });
      if (!response.ok) {
        throw new Error(`Logout failed (${response.status})`);
      }
      setTranscriptions([]);
      setActions([]);
      setActionDraft(null);
      setActiveSuggestionId(null);
      await fetchMe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    }
  }

  async function startRecording() {
    setTranscriptionError(null);

    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setTranscriptionError("This browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingSeconds(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearRecorderTimers();
        cleanupMediaTracks();

        const recordedBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (recordedBlob.size === 0) {
          setRecorderState("idle");
          setTranscriptionError("No voice detected. Please try again.");
          return;
        }

        try {
          setRecorderState("processing");
          await uploadAudio(recordedBlob, captureModeRef.current);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unexpected error";
          setTranscriptionError(message);
        } finally {
          setRecorderState("idle");
          setRecordingSeconds(0);
        }
      };

      mediaRecorder.start();
      setRecorderState("recording");

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      autoStopTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          setTranscriptionError("Recording stopped at 5:00 max duration.");
          stopRecording();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      setTranscriptionError("Microphone permission denied or unavailable.");
    }
  }

  function stopRecording() {
    clearRecorderTimers();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupMediaTracks();
      setRecorderState("idle");
      setRecordingSeconds(0);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (me?.authenticated) {
      fetchTranscriptions();
      fetchActions();
    }
  }, [me?.authenticated]);

  useEffect(() => {
    if (!activeSuggestionTranscription?.action_suggestion) {
      setActionDraft(null);
      return;
    }

    if (actionDraft?.transcriptionId === activeSuggestionTranscription.id) {
      return;
    }

    setActionDraft({
      transcriptionId: activeSuggestionTranscription.id,
      type: activeSuggestionTranscription.action_suggestion.type,
      title: activeSuggestionTranscription.action_suggestion.title,
      date: activeSuggestionTranscription.action_suggestion.date || "",
      time: activeSuggestionTranscription.action_suggestion.time || "",
    });
    setActionError(null);
  }, [activeSuggestionTranscription?.id, actionDraft?.transcriptionId]);

  useEffect(() => {
    if (captureMode === "transcript") {
      setActiveSuggestionId(null);
      setActionDraft(null);
      setActionError(null);
    }
  }, [captureMode]);

  useEffect(() => {
    setOpenMenuKey(null);
  }, [editingId, actionDeletingId, calendarSyncLoadingId, transcriptions.length, actions.length]);

  useEffect(() => {
    captureModeRef.current = captureMode;
  }, [captureMode]);

  useEffect(() => {
    return () => {
      clearRecorderTimers();
      cleanupMediaTracks();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (loading) {
    return <main className="container auth-shell">Checking auth status...</main>;
  }

  if (error) {
    return (
      <main className="container">
        <h1>Voiceflow</h1>
        <p className="error">{error}</p>
        <button onClick={fetchMe}>Retry</button>
      </main>
    );
  }

  if (!me?.authenticated || !me.user) {
    return (
      <main className="container">
        <h1>Voiceflow</h1>
        <p>Sign in with Google to continue.</p>
        <a className="button-link" href={googleLoginUrl}>
          Continue with Google
        </a>
      </main>
    );
  }

  return (
    <main className="vf-shell">
      <header className="vf-topbar">
        <div className="vf-brand">
          <span className="vf-brand-wave">~</span>
          <h1>VoiceFlow</h1>
        </div>
        <div className="vf-topbar-actions">
          <div className="vf-user-meta">
            <p className="vf-user-name">{me.user.name}</p>
            <p className="vf-user-email">{me.user.email}</p>
          </div>
          <button className="secondary-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className="vf-welcome">
        <h2>{getGreeting()}</h2>
        <p>Ready to capture your thoughts and turn them into actions?</p>
      </section>

      <section className="vf-content-grid">
        <div className="vf-main-col">
          <LatestTranscriptCard
            latestTranscription={transcriptions[0]}
            onCopy={copyToClipboard}
          />

          {captureMode === "action" && activeSuggestionTranscription?.action_suggestion && actionDraft ? (
            <ActionSuggestionCard
              suggestion={activeSuggestionTranscription.action_suggestion}
              saving={actionSaving}
              error={actionError}
              draftType={actionDraft.type}
              draftTitle={actionDraft.title}
              draftDate={actionDraft.date}
              draftTime={actionDraft.time}
              onChangeType={(value) => setActionDraft((prev) => (prev ? { ...prev, type: value } : prev))}
              onChangeTitle={(value) =>
                setActionDraft((prev) => (prev ? { ...prev, title: value } : prev))
              }
              onChangeDate={(value) => setActionDraft((prev) => (prev ? { ...prev, date: value } : prev))}
              onChangeTime={(value) => setActionDraft((prev) => (prev ? { ...prev, time: value } : prev))}
              onConfirm={confirmActionSuggestion}
              onDismiss={dismissActionSuggestion}
            />
          ) : null}

          <HistoryCard
            transcriptions={transcriptions}
            historyLoading={historyLoading}
            editingId={editingId}
            editingText={editingText}
            actionLoadingId={actionLoadingId}
            onChangeEditingText={setEditingText}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
            onSaveEditing={saveEditing}
            onDelete={handleDelete}
            onCopy={copyToClipboard}
            openMenuKey={openMenuKey}
            onMenuToggle={(key) => setOpenMenuKey((prev) => (prev === key ? null : key))}
            onMenuClose={() => setOpenMenuKey(null)}
          />
        </div>

        <aside className="vf-side-col">
          <RecorderCard
            recorderState={recorderState}
            recordingSeconds={recordingSeconds}
            transcriptionError={transcriptionError}
            copyNotice={copyNotice}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />

          <section className="card">
            <h2>Confirmed Actions</h2>
            {actionError ? <p className="error">{actionError}</p> : null}
            {actions.length === 0 ? (
              <p className="muted">No actions confirmed yet.</p>
            ) : (
              <ul className="history-list">
                {actions.map((action) => (
                  <li key={action.id} className="history-item">
                    <div className="history-item-head">
                      <p>
                        <strong>{action.type}</strong> · {action.title}
                      </p>
                      <CardActionsMenu
                        open={openMenuKey === `action-${action.id}`}
                        triggerLabel="Open actions menu"
                        onToggle={() =>
                          setOpenMenuKey((prev) => (prev === `action-${action.id}` ? null : `action-${action.id}`))
                        }
                        onClose={() => setOpenMenuKey(null)}
                        actions={[
                          ...(action.status === "confirmed"
                            ? [
                                {
                                  key: "add-calendar",
                                  label: calendarSyncLoadingId === action.id ? "Syncing..." : "Add to Calendar",
                                  disabled: calendarSyncLoadingId === action.id,
                                  onSelect: () => addActionToCalendar(action.id),
                                },
                              ]
                            : []),
                          ...(action.calendar_event_link
                            ? [
                                {
                                  key: "open-calendar",
                                  label: "Open in Google Calendar",
                                  href: action.calendar_event_link,
                                },
                              ]
                            : []),
                          {
                            key: "delete",
                            label: actionDeletingId === action.id ? "Deleting..." : "Delete",
                            danger: true,
                            disabled: actionDeletingId === action.id || calendarSyncLoadingId === action.id,
                            onSelect: () => deleteAction(action.id),
                          },
                        ]}
                      />
                    </div>
                    <p className="muted">
                      {action.date || "no date"}
                      {action.time ? ` ${action.time}` : ""} · {formatDateTime(action.created_at)}
                    </p>
                    {action.calendar_event_id ? (
                      <p className="muted">
                        {action.calendar_event_link ? (
                          <a href={action.calendar_event_link} target="_blank" rel="noreferrer">
                            Open in Google Calendar
                          </a>
                        ) : (
                          "Synced to Google Calendar"
                        )}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </section>

      <div className="vf-dock">
        <div className="vf-mode-pill">
          <button
            className={captureMode === "transcript" ? "active" : ""}
            onClick={() => setCaptureMode("transcript")}
          >
            Transcript
          </button>
          <button
            className={captureMode === "action" ? "active" : ""}
            onClick={() => setCaptureMode("action")}
          >
            Action
          </button>
        </div>
        <button
          className="vf-fab"
          onClick={recorderState === "recording" ? stopRecording : startRecording}
          disabled={recorderState === "processing"}
        >
          {recorderState === "recording" ? "Stop" : "Record"}
        </button>
      </div>
    </main>
  );
}
