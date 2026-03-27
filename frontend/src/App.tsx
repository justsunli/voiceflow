import { useEffect, useMemo, useRef, useState } from "react";

type User = {
  id: number;
  email: string;
  name: string;
};

type MeResponse = {
  authenticated: boolean;
  user: User | null;
};

type Transcription = {
  id: number;
  transcript: string;
  created_at: string;
};

type RecorderState = "idle" | "recording" | "processing";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";").map((entry) => entry.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const googleLoginUrl = useMemo(
    () => `${API_BASE_URL}/accounts/google/login/?process=login`,
    [],
  );

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

  async function uploadAudio(blob: Blob) {
    const csrfToken = getCookie("csrftoken");
    const formData = new FormData();
    formData.append("audio", blob, `recording-${Date.now()}.webm`);

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (recordedBlob.size === 0) {
          setRecorderState("idle");
          setTranscriptionError("Empty recording. Please try again.");
          return;
        }

        try {
          setRecorderState("processing");
          await uploadAudio(recordedBlob);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unexpected error";
          setTranscriptionError(message);
        } finally {
          setRecorderState("idle");
        }
      };

      mediaRecorder.start();
      setRecorderState("recording");
    } catch {
      setTranscriptionError("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (me?.authenticated) {
      fetchTranscriptions();
    }
  }, [me?.authenticated]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (loading) {
    return <main className="container">Checking auth status...</main>;
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

  const latestTranscription = transcriptions[0];

  return (
    <main className="container">
      <header className="header-row">
        <div>
          <h1>Voiceflow</h1>
          <p>Welcome, {me.user.name}</p>
          <p className="muted">{me.user.email}</p>
        </div>
        <button onClick={handleLogout}>Log out</button>
      </header>

      <section className="card">
        <h2>Recorder</h2>
        <div className="button-group">
          <button
            onClick={startRecording}
            disabled={recorderState === "recording" || recorderState === "processing"}
          >
            {recorderState === "recording" ? "Recording..." : "Start Recording"}
          </button>
          <button onClick={stopRecording} disabled={recorderState !== "recording"}>
            Stop
          </button>
        </div>
        {recorderState === "processing" ? <p>Transcribing audio...</p> : null}
        {transcriptionError ? <p className="error">{transcriptionError}</p> : null}
      </section>

      <section className="card">
        <h2>Latest Transcript</h2>
        {latestTranscription ? (
          <>
            <p className="muted">{formatDateTime(latestTranscription.created_at)}</p>
            <p>{latestTranscription.transcript}</p>
          </>
        ) : (
          <p className="muted">No transcript yet.</p>
        )}
      </section>

      <section className="card">
        <h2>History</h2>
        {historyLoading ? <p>Loading history...</p> : null}
        {!historyLoading && transcriptions.length === 0 ? (
          <p className="muted">No records found.</p>
        ) : null}
        <ul className="history-list">
          {transcriptions.map((entry) => (
            <li key={entry.id} className="history-item">
              <p className="muted">{formatDateTime(entry.created_at)}</p>
              <p>{entry.transcript}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
