export type User = {
  id: number;
  email: string;
  name: string;
};

export type MeResponse = {
  authenticated: boolean;
  user: User | null;
};

export type Transcription = {
  id: number;
  mode: "transcript" | "action";
  transcript: string;
  created_at: string;
  action_suggestion: ActionSuggestion | null;
};

export type RecorderState = "idle" | "recording" | "processing";

export type ActionType = "event" | "reminder" | "todo";

export type ActionSuggestion = {
  type: ActionType;
  title: string;
  date: string | null;
  time: string | null;
  confidence: "high" | "medium" | "low" | null;
};

export type ActionRecord = {
  id: number;
  type: ActionType;
  title: string;
  date: string | null;
  time: string | null;
  status: "confirmed" | "synced_to_calendar";
  calendar_event_id: string | null;
  calendar_event_link?: string | null;
  created_at: string;
};
