# Frontend (React + Vite + TypeScript)

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment

- `VITE_API_BASE_URL`: backend base url, defaults to `http://localhost:8000`

## Production deployment (Vercel)

- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required env vars on Vercel:

- `VITE_API_BASE_URL=https://<your-render-backend-domain>`

Notes:

- The app reads API base URL from Vite env at build time.
- Favicon and static assets are served from `public/` and bundled into `dist/`.

## Auth flow

- Unauthenticated view: show "Continue with Google"
- After OAuth login callback: frontend checks `GET /api/auth/me/`
- Authenticated view: show user profile, recorder, latest transcript, and history

## Phase 2 flow

- Record audio with browser `MediaRecorder`
- Upload to `POST /api/transcriptions/`
- Load history from `GET /api/transcriptions/`
