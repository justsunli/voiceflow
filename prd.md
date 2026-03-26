# PRD: Voice-to-Text Recorder with Smart Action Extraction

## 1. Overview

### Product Name

Voice-to-Text Recorder with Smart Action Extraction

### Summary

Build a lightweight web application that lets users record audio in the browser, transcribe it into text, and optionally extract actionable items such as reminders, appointments, or to-dos from the transcript. The app is designed to satisfy the take-home assignment requirements while also demonstrating thoughtful product scoping, practical AI integration, and engineering trade-off awareness.

### Why this product

The assignment requires a voice-to-text app with recording, transcription, and transcript display. To make the project more differentiated without overengineering it, this product adds a lightweight automation layer: after transcription, the system can detect whether the user said something actionable, present a suggested structured action, and let the user confirm it.

This keeps the core flow simple and robust while adding an AI-driven automation feature that is relevant to the role.

---

## 2. Goals

### Primary Goals

* Allow users to record audio directly from the browser.
* Transcribe recorded audio into text.
* Display transcription results clearly in the UI.
* Handle basic failure cases cleanly, including microphone denial and transcription errors.
* host the web app live with URL

### Secondary Goals

* Save past transcriptions for later viewing.
* Provide polished loading and result states.
* Extract possible actions from transcript text, such as calendar events or reminders, connect with google calendar.
* Let users confirm an extracted action before it is saved or executed.

### Non-Goals

* Real-time streaming transcription in the first version.
* Full autonomous agent behavior.
* Complex retrieval-augmented generation or knowledge-base search.
* Full journaling analytics platform.
* Multi-user collaboration.

---

## 3. Users and Use Cases

### Target User

A user who wants to quickly speak a note and turn it into usable text, with optional help extracting a structured follow-up action.

### Core Use Cases

1. A user records a short voice memo and reads the transcript.
2. A user says something like, “I have a doctor appointment Friday at 10 AM,” and the app detects it as a possible event.
3. A user reviews a suggested action and confirms it.
4. A user revisits previous transcriptions in a simple history view.

---

## 4. Problem Statement

Users often capture quick thoughts or spoken reminders, but raw transcription alone still leaves manual work. If the app can extract likely actions from the transcript and present them in a safe, confirmation-based way, it becomes more useful while still staying lightweight.

---

## 5. Product Principles

* **Core flow first:** The assignment requirements must work end-to-end before extra features are added.
* **Automation with guardrails:** The system should suggest actions, not silently execute them.
* **Practical AI over buzzwords:** AI should solve a real problem in the flow, not be added for its own sake.
* **Clarity over complexity:** Trade-offs should favor reliability and explainability in a one-week build.
* **Incremental delivery:** The app should be developed in clearly documented milestones.

---

## 6. Functional Requirements

### 6.1 Audio Recording

* The user can start recording from the browser.
* The user can stop recording.
* The UI shows recording state clearly.
* The app requests microphone permissions from the browser.
* If permission is denied, the app shows a clear error state.

### 6.2 Audio Upload / Processing

* After recording ends, the audio is packaged and sent to the backend.
* The backend accepts an audio file and creates a transcription job or request.
* The backend validates the uploaded input.

### 6.3 Transcription

* The backend transcribes the audio into text using a speech-to-text model or API.
* The app returns the transcription result to the frontend.
* The UI displays transcription status while processing.
* If transcription fails, the UI shows an understandable error message.

### 6.4 Transcript Display

* The user can view the resulting transcript in the UI.
* The transcript should be readable and clearly separated from controls.
* The user can copy transcript text.

### 6.5 Transcription History

* The system stores past transcription results.
* The user can view a list of prior transcripts.
* Each transcription record includes at least transcript text and creation time.

### 6.6 Smart Action Extraction

* After transcription, the backend can analyze the transcript for possible structured actions.
* Supported initial action types:

  * Calendar event
  * Reminder / to-do
* If an action is detected, the app shows a suggested action card.
* The suggestion should include structured fields where available, such as title, date, time, and action type.
* The user must confirm before the action is saved or executed.

### 6.7 Action Confirmation

* The user can accept a suggested action.
* The user can dismiss a suggested action.
* For the initial version, confirmed actions may be saved in-app rather than pushed to an external service.
* If time permits, a future version may integrate with Google Calendar.

---

## 7. Non-Functional Requirements

### Reliability

* The app should support the full happy path consistently.
* Basic edge cases should not break the UI.

### Usability

* The interface should be understandable without extra explanation.
* The user should always know whether the app is recording, processing, failed, or complete.

### Performance

* Short recordings should transcribe within a reasonable amount of time.
* The UI should show visible progress or loading feedback during processing.

### Maintainability

* The codebase should be structured clearly enough to support future additions, such as Google Calendar integration.
* API contracts should be documented.

---

## 8. User Stories

### Required

* As a user, I want to record my voice so that I can capture spoken input.
* As a user, I want my audio transcribed into text so that I can read what I said.
* As a user, I want the transcript displayed in the app so that I can use it immediately.

### Value-Add

* As a user, I want to review past transcriptions so that I can refer back to them later.
* As a user, I want the app to detect possible reminders or events from my transcript so that I can save time.
* As a user, I want to confirm a suggested action before it is saved so that I stay in control.

---

## 9. Success Criteria

### Must-Have Success Criteria

* A user can record audio.
* A user can submit audio for transcription.
* A transcript is returned and shown in the UI.
* Permission and failure cases are handled visibly.

### Nice-to-Have Success Criteria

* A user can view prior transcripts.
* A user can copy transcript text.
* The app can extract at least one valid action type from natural spoken input.
* The user can confirm and save an extracted action.

---

## 10. Metrics for Demo Evaluation

Since this is a take-home project rather than a production launch, the key evaluation metrics are qualitative:

* End-to-end flow works reliably.
* UX feels polished and understandable.
* Engineering choices are clearly justified.
* Scope is ambitious but controlled.
* Trade-offs are explained honestly.

Potential demo metrics to mention:

* Number of supported action types.
* Average transcription turnaround on short recordings.
* Number of handled error states.

---

## 11. Scope and Milestones

### V0.1

* Project setup
* React frontend scaffold
* Django backend scaffold
* PRD and architecture outline

### V0.2

* Browser audio recording
* Upload audio to backend

### V0.3

* Transcription API integrated
* Transcript displayed in UI
* Loading and error states

### V0.4

* Save transcription history
* Copy transcript action
* Improved UI polish

### V0.5

* Action extraction from transcript
* Suggested action card
* Confirm / dismiss flow

### V1.0

* Final bug fixes
* README and local run instructions
* Architecture and trade-offs documentation
* Demo-ready version

### Stretch Goal

* Google Calendar integration for confirmed event suggestions

---

## 12. Technical Approach

### Frontend

* React for UI
* Browser MediaRecorder API for audio capture
* Simple state-driven views for recording, loading, result, and history

### Backend

* Django + Django REST Framework for API endpoints
* Speech-to-text model or API for transcription
* Optional structured extraction layer for action suggestion

### Storage

* SQLite for local development and take-home simplicity
* Store transcription metadata and text

### AI Layer

* Use speech-to-text for the main requirement.
* Use a lightweight extraction step for structured action suggestions.
* Prefer schema-based extraction over open-ended generation.

---

## 13. Key Trade-Offs

### Django vs FastAPI

Chosen approach: Django.

Reasoning:

* Better alignment with the target role’s listed tech stack.
* Good structure for a small but complete web application.
* Easier to frame as a maintainable internal tool.

Trade-off:

* FastAPI may be faster to spin up for a pure API service, but Django provides stronger alignment and a more conventional full-project structure.

### Batch Transcription vs Real-Time Streaming

Chosen approach: Batch transcription after recording ends.

Reasoning:

* Lower integration complexity.
* More reliable within a one-week take-home timeline.
* Easier to demonstrate clearly.

Trade-off:

* Real-time streaming is more impressive, but riskier and less necessary for a strong submission.

### Action Suggestion vs Full Autonomous Agent

Chosen approach: Suggest and confirm.

Reasoning:

* Safer UX.
* Easier to explain and test.
* Still demonstrates automation value.

Trade-off:

* Less “autonomous,” but more practical and trustworthy.

### No RAG in Initial Scope

Chosen approach: Do not include RAG unless a genuinely useful retrieval use case emerges.

Reasoning:

* The core problem is transcription plus structured extraction, not knowledge retrieval.
* Adding RAG without a strong use case would increase complexity without improving the main flow.

---

## 14. Risks and Mitigations

### Risk: Microphone permissions fail

Mitigation:

* Show clear browser-permission guidance and a recoverable UI state.

### Risk: Transcription API or model call fails

Mitigation:

* Add clear error messages and retry guidance.
* Keep logs on the backend for debugging.

### Risk: Calendar integration takes too long

Mitigation:

* Keep external integration as a stretch goal.
* Make the in-app confirmation flow complete on its own.

### Risk: Scope grows too large

Mitigation:

* Lock the must-have scope early.
* Treat polish and integrations as optional layers.

---

## 15. Demo Narrative

Recommended demo flow:

1. Record a short spoken note.
2. Show the transcript appearing in the UI.
3. Show a second example with an actionable phrase like “I have a dentist appointment Friday at 10 AM.”
4. Show the extracted event suggestion.
5. Confirm the action and save it.
6. Open transcription history to show persistence.
7. Briefly explain trade-offs, what was intentionally left out, and future extensions.

---

## 16. Future Work

* Google Calendar integration
* Real-time streaming transcription
* Multi-language support
* Audio waveform visualization improvements
* Sentiment tagging for journal-style usage
* Smarter action extraction with multiple suggestions
* Export transcript or action summaries

---

## 17. Deliverables Checklist

* Public GitHub repository
* README with local setup instructions
* Working app demo
* Brief architecture / design documentation
* 5–10 minute presentation covering:

  * product demo
  * design choices
  * challenges
  * trade-offs
