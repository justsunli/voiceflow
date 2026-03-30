# Engineering Design Doc: Voice-to-Text Recorder with Smart Action Extraction

## 1. Problem Statement

Users frequently capture quick thoughts or reminders by speaking, but raw transcription still leaves manual work — the user must read the transcript, identify actionable items, and enter them into the right tool (calendar, to-do list, etc.). This app closes that gap: record audio, transcribe it, and surface structured actions the user can confirm with one click.

---

## 2. Goals and Non-Goals

### Goals
- Record audio in the browser and transcribe it to text via the backend.
- Display transcriptions clearly with loading and error states.
- Save transcription history per user.
- Extract structured actions (calendar events, reminders) from transcripts and present them for user confirmation.
- Host the app live with a shareable URL.
- Authenticate users via Google OAuth (dual-purpose: identity + calendar access).

### Non-Goals
- Real-time streaming transcription (first version uses batch).
- Fully autonomous action execution without user confirmation.
- RAG, LangChain, or knowledge-base retrieval.
- Multi-user collaboration or sharing.
- Multi-language support in v1.
- Building a custom auth system (Google OAuth covers this).

---

## 3. User Flow

```
1. User visits the app → lands on login page
2. User signs in with Google OAuth → redirected to main recorder view
3. User clicks "Record" → browser requests mic permission → recording starts
4. User clicks "Stop" → audio blob sent to backend
5. Backend transcribes audio → returns transcript text
6. Frontend displays transcript with copy-to-clipboard option
7. Backend analyzes transcript for actionable content
8. If action detected → show action suggestion card (title, date, time, type)
9. User confirms → action saved (and optionally pushed to Google Calendar)
   User dismisses → action discarded
10. User can view transcription history from sidebar/list view
```

---

## 4. Functional Requirements

### 4.1 Authentication
- Google OAuth 2.0 login (via `django-allauth` or `social-auth-app-django`).
- Store OAuth refresh token for Google Calendar API access.
- Session-based auth after login (Django sessions, not JWT — simpler for server-rendered OAuth flow).

### 4.2 Audio Recording
- Browser-side recording via MediaRecorder API.
- Clear UI states: idle, recording, processing, complete, error.
- Graceful handling of mic permission denial.

### 4.3 Transcription
- Upload audio as a file (WebM/Opus from MediaRecorder) to the backend.
- Backend calls OpenAI Whisper API for transcription.
- Return transcript text to frontend.
- Show loading indicator during processing.

### 4.4 Transcript Display and History
- Display transcript with timestamp and copy button.
- List of past transcriptions (per user), ordered by recency.
- Each record shows: transcript text, creation time, any extracted action.

### 4.5 Smart Action Extraction
- After transcription, pass transcript text to OpenAI GPT API with a structured extraction prompt.
- Extract: action type (event / reminder / to-do), title, date, time, and confidence indicator.
- Use function calling / JSON mode to enforce output schema — not free-form text generation.
- If no action detected, skip the suggestion card silently.
- **Timezone and date grounding**: The extraction prompt must include the current date and the user's timezone (sent from the frontend via `Intl.DateTimeFormat().resolvedOptions().timeZone`) so that relative phrases like "this Friday" and "tomorrow" resolve to correct absolute dates.

### 4.6 Action Confirmation
- Show a confirmation card with extracted fields, editable by the user.
- "Confirm" saves the action to the database.
- "Add to Google Calendar" (stretch) creates a Google Calendar event via the Calendar API using the stored OAuth token.
- "Dismiss" discards the suggestion.

---

## 5. System Architecture

```
┌──────────────────┐         ┌──────────────────────────────┐
│   React Frontend │  HTTP   │       Django Backend          │
│                  │◄───────►│                               │
│  - MediaRecorder │         │  - Django REST Framework      │
│  - Auth flow     │         │  - Google OAuth (allauth)     │
│  - Transcript UI │         │  - Whisper API client         │
│  - Action cards  │         │  - GPT extraction client      │
│                  │         │  - PostgreSQL (via DJ ORM)    │
└──────────────────┘         │  - Google Calendar API client │
                             └──────────────────────────────┘
                                        │
                              ┌─────────┴──────────┐
                              │   External APIs     │
                              │  - OpenAI Whisper   │
                              │  - OpenAI GPT       │
                              │  - Google Calendar   │
                              │  - Google OAuth      │
                              └────────────────────┘
```

### Deployment topology
- **Frontend**: React app built as static files, served by Django (or deployed separately on Vercel/Netlify).
- **Backend**: Django on Render/Railway with gunicorn.
- **Database**: PostgreSQL (Render/Neon free tier).
- **Why not SQLite**: Most PaaS platforms use ephemeral filesystems. SQLite data would be lost on redeploy. PostgreSQL is the standard Django production database and is available free on Render.

---

## 6. API Design

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google/login/` | Initiate Google OAuth flow |
| GET | `/auth/google/callback/` | OAuth callback, creates session |
| POST | `/api/auth/logout/` | End session |
| GET | `/api/auth/me/` | Return current user info |

### Transcription
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcriptions/` | Upload audio file, returns transcription |
| GET | `/api/transcriptions/` | List user's transcription history |
| GET | `/api/transcriptions/{id}/` | Get single transcription detail |

**POST `/api/transcriptions/`**
- Request: `multipart/form-data` with `audio` file field
- Response:
```json
{
  "id": 1,
  "transcript": "I have a doctor appointment this Friday at 10 AM",
  "created_at": "2026-03-25T14:30:00Z",
  "action_suggestion": {
    "type": "event",
    "title": "Doctor appointment",
    "date": "2026-03-27",
    "time": "10:00",
    "confidence": "high"
  }
}
```
- If no action detected, `action_suggestion` is `null`.

### Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/` | Confirm and save an extracted action |
| GET | `/api/actions/` | List user's confirmed actions |
| POST | `/api/actions/{id}/add-to-calendar/` | Push action to Google Calendar (stretch) |

**POST `/api/actions/`**
- Request:
```json
{
  "transcription_id": 1,
  "type": "event",
  "title": "Doctor appointment",
  "date": "2026-03-27",
  "time": "10:00"
}
```
- The user may edit fields before confirming, so the request contains the final values, not necessarily the raw extraction output.

---

## 7. Data Model

```
User (Django built-in + social auth)
├── id
├── email
├── google_oauth_token (managed by allauth/social-auth)
└── ...

Transcription
├── id (PK)
├── user (FK → User)
├── audio_file (FileField, stored in cloud storage or local media)
├── transcript (TextField)
├── raw_action_suggestion (JSONField, nullable — stores the LLM extraction output)
├── user_timezone (CharField — e.g. "America/New_York", sent from frontend)
├── processing_duration_ms (IntegerField, nullable — total Whisper + GPT time for observability)
├── created_at (DateTimeField)

Action
├── id (PK)
├── user (FK → User)
├── transcription (OneToOneField → Transcription, nullable — unique constraint prevents duplicate actions)
├── type (CharField: "event" | "reminder" | "todo")
├── title (CharField)
├── date (DateField, nullable)
├── time (TimeField, nullable)
├── status (CharField: "confirmed" | "synced_to_calendar")
├── calendar_event_id (CharField, nullable — Google Calendar event ID)
├── created_at (DateTimeField)
```

### Notes
- `raw_action_suggestion` on Transcription preserves the original LLM output for debugging and future improvement, separate from what the user actually confirmed.
- Audio files: for the hosted version, use Django's default file storage pointed to a cloud bucket (S3 or Render disk), or skip persisting audio and only store the transcript to simplify deployment.

---

## 8. Key Technical Decisions and Trade-offs

### Django + React over FastAPI + React
**Decision**: Django with DRF for the backend.
**Why**: The target role lists Django and React. Django provides a batteries-included framework with ORM, migrations, admin panel, and mature auth libraries (django-allauth). For a 1-week project, not having to wire up an ORM, migration tool, and auth library separately is a real time savings.
**Trade-off**: FastAPI is lighter and async-native, which would be better for a pure API microservice. But this project benefits from Django's full-stack conventions, and the evaluator likely wants to see Django competency.

### Batch transcription over streaming
**Decision**: Record full audio, then upload and transcribe in one request.
**Why**: Batch is simpler to implement, test, and demo. The Whisper API accepts full audio files and returns complete transcripts. Streaming would require WebSocket plumbing, chunked audio processing, and partial result assembly — high complexity for marginal UX gain on short recordings.
**Trade-off**: Users see no text until recording stops. For recordings under 1-2 minutes (the expected use case), this delay is acceptable. Streaming can be added later as a clear upgrade.

### Confirmation-before-action over auto-execution
**Decision**: Always show extracted actions as suggestions that require explicit user confirmation.
**Why**: Auto-executing actions from AI extraction is risky — a misparse could create wrong calendar events or reminders. Confirmation keeps the user in control, builds trust, and is much easier to reason about and test. It also avoids needing rollback/undo logic for incorrectly created events.
**Trade-off**: Slightly more friction in the UX. But for an AI-suggested action, one extra click is the right default.

### OpenAI Whisper API over local Whisper model
**Decision**: Use the hosted Whisper API, not a self-hosted model.
**Why**: The hosted API avoids GPU provisioning, model loading time, and deployment complexity. For a take-home project, API reliability and simplicity outweigh cost concerns.
**Trade-off**: Adds an external dependency and per-request cost. Acceptable at demo scale.

### GPT function calling for extraction over regex/NLP
**Decision**: Use OpenAI's GPT API with structured output (function calling or JSON mode) to extract actions.
**Why**: Natural language is messy — regex-based extraction would fail on anything beyond trivial patterns. GPT with a constrained output schema provides reliable structured extraction with minimal code. Function calling enforces the schema at the API level.
**Trade-off**: Adds latency (~1-2s) and cost per transcription. Worth it for the quality of extraction. The schema-constrained approach avoids the unpredictability of open-ended generation.

### Why RAG is not needed
The app extracts structured data from a single transcript. There is no corpus to retrieve from, no knowledge base to query, and no conversation history to search. RAG solves a retrieval problem; this is a parsing problem. Adding RAG would increase complexity without improving the core flow.

### Google OAuth as the sole auth method
**Decision**: Use Google OAuth for both authentication and Calendar API access.
**Why**: Google Calendar integration requires OAuth tokens anyway. Using Google as the login method means one auth flow covers both identity and API access. No need to build username/password registration, email verification, or password reset.
**Trade-off**: Users without Google accounts cannot use the app. Acceptable for a demo project. Adding more providers later is straightforward with django-allauth.

### PostgreSQL over SQLite for deployment
**Decision**: Use PostgreSQL in both development and production.
**Why**: Most PaaS platforms (Render, Railway) use ephemeral filesystems — SQLite data is lost on every deploy. PostgreSQL is Django's best-supported database and available free on Render/Neon. Using the same DB in dev and prod eliminates "works on my machine" issues.
**Trade-off**: Slightly more setup than SQLite (need to run Postgres locally or use a remote dev DB). Docker Compose makes this trivial.

### Synchronous request handling over task queues
**Decision**: Whisper + GPT calls run synchronously within the HTTP request, with a 30-second timeout.
**Why**: Introducing Celery or RQ requires Redis, a worker process, and a polling/WebSocket mechanism to deliver results — a significant infrastructure jump for a 1-week project. The expected total API latency (Whisper ~2-4s + GPT ~1-2s) fits within a single HTTP request. The frontend shows a clear loading state during this time.
**Trade-off**: If API latency spikes, the request could time out. Mitigations: set per-call timeouts on the OpenAI client, return the transcript immediately and treat extraction failure as non-blocking. A task queue (Celery + Redis) is the right move for production scale but is not justified here.

---

## 9. Error Handling and Edge Cases

| Scenario | Handling |
|----------|----------|
| Mic permission denied | Show clear message with browser-specific guidance to re-enable |
| Empty/silent recording | Backend detects empty transcript, frontend shows "No speech detected" |
| Whisper API failure | Return 502, frontend shows retry button with error message |
| GPT extraction failure | Transcript still displays normally; action suggestion section simply doesn't appear |
| Extraction returns low confidence | Show suggestion with a visual indicator; still require confirmation |
| Audio too long (>5 min) | Frontend enforces max recording duration; backend validates file size |
| Google OAuth token expired | Use refresh token to renew; if refresh fails, prompt re-login |
| Google Calendar API failure | Show error on the calendar sync button; action remains saved locally |
| Network failure during upload | Frontend shows error with retry option; no partial state on backend |
| Concurrent requests from same user | Django ORM handles this; each transcription is an independent record |

### Design principle
Action extraction failures must never block the core transcription flow. The extraction layer is additive — if it fails, the user still gets their transcript.

### Idempotency and duplicate submission
- Frontend disables the submit/confirm button during pending requests to prevent accidental double-clicks.
- `POST /api/actions/` enforces a unique constraint on `transcription_id` — one confirmed action per transcription. Duplicate POSTs return the existing action rather than creating a second one.

### Security and data handling
- **Minimal OAuth scopes**: Request only `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/calendar.events` (not the broad `calendar` scope).
- **Token storage**: OAuth tokens managed by django-allauth are stored in the database. For production, these should be encrypted at rest (e.g., `django-encrypted-model-fields`). For the take-home scope, the default allauth storage is acceptable.
- **Audio retention policy**: Audio files are used only for transcription. Once the transcript is saved, the audio file can be deleted. For v1, we skip persisting audio entirely and only store the transcript text — this simplifies deployment and avoids storing sensitive voice data.
- **HTTPS**: Enforced in production via the PaaS platform (Render provides HTTPS by default).

---

## 10. Incremental Implementation Plan

### Phase 1: Project scaffold and auth (Day 1)
- Django project setup with DRF, PostgreSQL, and django-allauth.
- React app setup (Vite + TypeScript).
- Google OAuth login/logout flow working end-to-end.
- Basic deployment pipeline to Render (backend) and Vercel or Render static (frontend).
- **Milestone**: User can log in with Google and see a home page.

### Phase 2: Core recording and transcription (Days 2-3)
- MediaRecorder integration in React.
- Audio upload endpoint in Django.
- Whisper API integration for transcription.
- Transcript display with loading and error states.
- **Milestone**: User can record audio and see the transcript. Core assignment requirement is met.

### Phase 3: History and polish (Day 4)
- Transcription history list (per user).
- Copy-to-clipboard on transcript text.
- UI polish: recording timer, waveform indicator, responsive layout.
- **Milestone**: App feels complete for the base requirements.

### Phase 4: Smart action extraction (Day 5)
- GPT extraction endpoint with function calling / JSON mode.
- Action suggestion card in the UI (title, date, time, type).
- Confirm/dismiss flow; save confirmed actions to database.
- **Milestone**: The AI automation feature works end-to-end.

### Phase 5: Stretch and demo prep (Days 6-7)
- Google Calendar integration for confirmed events (stretch).
- Final UI polish and edge case fixes.
- README, architecture documentation, demo narrative.
- Deploy final version to live URL.
- **Milestone**: Demo-ready, hosted, documented.

### Risk buffer
Phase 2 (core transcription) is the hard dependency. If it takes longer than expected, Phases 4-5 shrink. The app is a viable submission after Phase 3.

---

## 11. Testing Strategy

### Backend
- **Unit tests**: Model validation, serializer logic, extraction prompt formatting.
- **Integration tests**: Transcription endpoint with mocked Whisper API response. Action confirmation endpoint with database assertions.
- **Manual/API tests**: Hit endpoints with real audio files during development.

### Frontend
- **Component tests**: Recording button states, transcript display, action card rendering (React Testing Library).
- **Manual E2E**: Full flow testing in the browser — record, transcribe, extract, confirm.

### What NOT to test (given 1-week scope)
- Full E2E automation (Cypress/Playwright) — too much setup overhead for a demo project.
- Load testing — irrelevant at demo scale.
- Whisper/GPT output quality — these are external APIs; test the integration, not the model.

### Key test cases
1. Happy path: record → transcribe → extract action → confirm.
2. No action detected: transcript displays, no action card shown.
3. API failure: error message shown, no crash.
4. Empty recording: handled gracefully.
5. Auth required: unauthenticated requests return 401.

---

## 12. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Whisper API latency causes poor UX | Medium | Medium | Show clear loading state; set reasonable timeout; consider client-side Web Speech API as fallback |
| Google OAuth setup takes too long | Low | High | Use django-allauth which handles most of the complexity; follow Google's OAuth quickstart |
| Google Calendar integration is too complex for the timeline | Medium | Low | It's a stretch goal — the app works fully without it. Confirmed actions save locally regardless |
| GPT extraction produces bad results | Low | Medium | Constrain output with function calling schema; always require user confirmation; show raw transcript regardless |
| Deployment issues eat into dev time | Medium | Medium | Deploy early (Day 1) with a hello-world; iterate from there rather than deploying at the end |
| Scope creep | High | High | Phases are ordered by priority; cut from the bottom. The app is submittable after Phase 3 |

---

## 13. Future Improvements

- **Real-time streaming transcription**: WebSocket connection with chunked Whisper or Deepgram for live text display while recording.
- **Async task processing**: Move Whisper/GPT calls to Celery + Redis workers for better reliability and scalability. Return a job ID and poll or push results via WebSocket.
- **Multiple action extraction**: Detect multiple actions in a single transcript ("meeting at 2 and pick up groceries at 5").
- **Multi-language support**: Whisper already supports multiple languages; surface a language selector and pass it to the API.
- **Reminder notifications**: Push notifications or email reminders for confirmed to-do items.
- **Audio playback**: Let users replay recordings alongside transcripts.
- **Export**: Download transcript as text/PDF, or export actions as .ics calendar files.
- **Richer action types**: Emails, Slack messages, task assignments.
- **Prompt tuning**: Improve extraction accuracy with few-shot examples or fine-tuned prompts based on user correction patterns.
- **Observability**: Add Prometheus + Grafana for production monitoring — request latency, transcription duration histograms, extraction success rate, and calendar sync failure rate. For the take-home version, `processing_duration_ms` on the Transcription model and Django logging provide lightweight observability sufficient for demo storytelling (e.g., "average transcription latency is 3.2s across 20 test recordings").
