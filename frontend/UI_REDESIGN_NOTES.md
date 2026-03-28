# VoiceFlow Frontend Redesign Notes (Scheme B)

## 1) Reference vs Current App
- `ui-reference.html` emphasizes:
  - sticky top app bar + greeting hero
  - soft material-like cards
  - floating bottom dock with segmented mode pill + primary record action
  - stronger typography and color system
- Existing React app already has complete business flow:
  - auth/session UI
  - recording + transcription upload
  - suggestion confirm/dismiss
  - transcription history edit/delete
  - confirmed actions add-to-calendar/delete

## 2) Reusable Pieces
- Kept existing React data flow and API calls in `App.tsx`.
- Reused all functional components:
  - `RecorderCard`
  - `LatestTranscriptCard`
  - `ActionSuggestionCard`
  - `HistoryCard`
- Reused existing classes (`card`, `history-list`, `history-item`, etc.) and upgraded visual tokens in CSS.

## 3) Incremental Implementation Applied
- Step A: Introduced new page shell:
  - sticky topbar (`.vf-topbar`)
  - greeting section (`.vf-welcome`)
  - 2-column content layout (`.vf-content-grid`)
- Step B: Preserved all existing feature panels and moved them into new layout structure.
- Step C: Added floating bottom dock:
  - mode selection pills (`Transcript` / `Action`)
  - primary recording FAB that maps to existing `startRecording`/`stopRecording`
- Step D: Reworked style system (`styles.css`) to match reference direction while keeping current component contracts untouched.

## 4) Functionality Preservation Checklist
- Recording and stop: unchanged API flow
- Transcription upload: unchanged
- Suggested action confirm/dismiss: unchanged
- History edit/delete: unchanged
- Confirmed action add-to-calendar/delete: unchanged
- Auth/login/logout flow: unchanged
