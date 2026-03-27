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

## Auth flow

- Unauthenticated view: show "Continue with Google"
- After OAuth login callback: frontend checks `GET /api/auth/me/`
- Authenticated view: show user profile and logout button
