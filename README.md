# VoiceFlow

VoiceFlow is a full-stack voice notes app:

- Record audio in the browser
- Transcribe speech to text
- Use **Note** mode (transcript only) or **Action** mode (transcript + suggested action)
- Confirm actions and sync to Google Calendar
- Use guest mode for Note-only access

## Tech Stack

- Frontend: React + Vite + TypeScript
- Backend: Django + Django REST Framework + django-allauth
- Database: PostgreSQL
- AI: OpenAI transcription + action extraction
- Auth: Google OAuth (session-based)

## Repository Structure

- `frontend/` React app
- `backend/` Django app and REST API
- `design-doc.md` architecture and phase notes
- `render.yaml` Render deployment blueprint

## Features

- Google OAuth login/logout
- Guest mode (Note only)
- Audio recording with MediaRecorder
- Mode-controlled pipeline:
  - Note mode: transcription only
  - Action mode: transcription plus action extraction
- Transcript history with copy/edit/delete
- Confirmed actions with add-to-calendar
- Demo-safe protections:
  - Rate limiting on expensive endpoints
  - Upload validation (size and MIME type)
  - Sanitized provider error responses

## Run Locally

### Prerequisites

- Python 3.12
- Node.js 18+
- npm
- Docker (recommended for local Postgres)
- OpenAI API key
- Google OAuth client (for sign-in and calendar flow testing)

### 1) Start PostgreSQL

```bash
cd backend
docker compose up -d
```

The included Docker setup exposes Postgres on `localhost:5433`.

### 2) Start backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env` minimum values:

```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5433
POSTGRES_DB=voiceflow
POSTGRES_USER=voiceflow
POSTGRES_PASSWORD=voiceflow

OPENAI_API_KEY=your-openai-key

CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173

LOGIN_REDIRECT_URL=http://localhost:5173/
LOGOUT_REDIRECT_URL=http://localhost:5173/

GOOGLE_OAUTH_CALLBACK_URL=http://localhost:8000/accounts/google/login/callback/
```

Run migrations and server:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend URL: `http://localhost:8000`

### 3) Start frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Make sure `frontend/.env` contains:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Frontend URL: `http://localhost:5173`

### 4) Configure Google OAuth (local)

In Google Cloud Console, for your OAuth client:

- Authorized JavaScript origins:
  - `http://localhost:8000`
- Authorized redirect URIs:
  - `http://localhost:8000/accounts/google/login/callback/`

In Django admin (`http://localhost:8000/admin/`):

1. Configure `Site` with domain `localhost:8000`
2. Create/update Google `SocialApp`
3. Attach the app to the `localhost:8000` site

### 5) Local smoke test

1. Open `http://localhost:5173`
2. Continue as Guest and test Note mode recording
3. Sign in with Google
4. Test Action mode and suggestion flow
5. Confirm action and test add-to-calendar

## API Overview

- Auth:
  - `GET /api/auth/me/`
  - `POST /api/auth/logout/`
  - allauth routes under `/accounts/`
- Transcriptions:
  - `POST /api/transcriptions/`
  - `GET /api/transcriptions/`
  - `PATCH /api/transcriptions/{id}/`
  - `DELETE /api/transcriptions/{id}/`
- Actions:
  - `POST /api/actions/`
  - `GET /api/actions/`
  - `DELETE /api/actions/{id}/`
  - `POST /api/actions/{id}/add-to-calendar/`

## Deployment

### Backend on Render

- Root: `backend`
- Build:
  - `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- Pre-deploy:
  - `python manage.py migrate`
- Start:
  - `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

Required backend env vars:

```env
DJANGO_SECRET_KEY=strong-random-secret
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=your-backend-domain.onrender.com
DATABASE_URL=your-neon-database-url
DB_SSL_REQUIRE=1

OPENAI_API_KEY=your-openai-key

CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.vercel.app,https://your-backend-domain.onrender.com

LOGIN_REDIRECT_URL=https://your-frontend-domain.vercel.app/
LOGOUT_REDIRECT_URL=https://your-frontend-domain.vercel.app/
GOOGLE_OAUTH_CALLBACK_URL=https://your-backend-domain.onrender.com/accounts/google/login/callback/

USE_SECURE_COOKIES=1
SESSION_COOKIE_SAMESITE=None
CSRF_COOKIE_SAMESITE=None

TRANSCRIPTION_POST_RATE_LIMIT=20/hour
CALENDAR_SYNC_POST_RATE_LIMIT=30/hour
MAX_AUDIO_UPLOAD_BYTES=15728640
ALLOWED_AUDIO_CONTENT_TYPES=audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/flac
APP_LOG_LEVEL=INFO
```

### Frontend on Vercel

- Root: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Required frontend env var:

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

## Security Notes

- OpenAI key is backend-only.
- Calendar sync endpoints require authentication.
- Guest requests remain rate-limited.
- Raw provider errors are logged server-side; user-facing messages are sanitized.

## Troubleshooting

### CSRF token missing

- Confirm frontend first calls `GET /api/auth/me/`
- Confirm state-changing requests include `X-CSRFToken`
- Confirm requests use `credentials: include`
- Confirm `CSRF_TRUSTED_ORIGINS` includes frontend origin

### Google login loops back to sign-in

- Verify OAuth redirect URI exact match, including trailing slash
- Verify Django `Site` and Google `SocialApp` binding
- Verify cookie settings are correct for your deployment topology

### redirect_uri_mismatch

Set OAuth redirect URI exactly to:

`https://your-backend-domain.onrender.com/accounts/google/login/callback/`

### Desktop login works but mobile fails

If frontend and backend are on different root domains (for example `*.vercel.app` and `*.onrender.com`), mobile browsers may block cross-site cookies more aggressively. For better mobile auth reliability, use the same apex domain with subdomains (for example `app.example.com` and `api.example.com`).
