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

Edit `backend/.env`.

Minimum local values:

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5433
POSTGRES_DB=voiceflow
POSTGRES_USER=voiceflow
POSTGRES_PASSWORD=voiceflow

OPENAI_API_KEY=<your-openai-key>

CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173

LOGIN_REDIRECT_URL=http://localhost:5173/
LOGOUT_REDIRECT_URL=http://localhost:5173/

GOOGLE_OAUTH_CALLBACK_URL=http://localhost:8000/accounts/google/login/callback/
```

Then run:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at:

```text
http://localhost:8000
```


### 3. Configure and run the frontend

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

Frontend runs at:

```text
http://localhost:5173
```


### 4. Configure Google OAuth for local testing

Google sign-in is handled by the Django backend via `django-allauth`, so the OAuth callback is configured on the backend origin.

In Google Cloud Console, for your OAuth client, add:

#### Authorized JavaScript origins

* `http://localhost:8000`

#### Authorized redirect URIs

* `http://localhost:8000/accounts/google/login/callback/`

Then in Django admin at:

```text
http://localhost:8000/admin/
```

configure:

#### Sites

* domain: `localhost:8000`
* name: `VoiceFlow`

#### Social applications

* provider: Google
* client ID: `<your Google client ID>`
* secret key: `<your Google client secret>`
* attach the `localhost:8000` site

---

### 5. Smoke test locally

1. Open `http://localhost:5173`
2. Click **Continue as Guest**
3. Record audio in **Note** mode
4. Sign in with Google
5. Record audio in **Action** mode
6. Confirm a suggested action
7. Optionally test **Add to Calendar**

## API Overview

### Auth

* `GET /api/auth/me/`
* `POST /api/auth/logout/`
* `GET /api/auth/csrf/`
* allauth routes under `/accounts/*`

### Transcriptions

* `POST /api/transcriptions/`
* `GET /api/transcriptions/`
* `PATCH /api/transcriptions/{id}/`
* `DELETE /api/transcriptions/{id}/`

### Actions

* `POST /api/actions/`
* `GET /api/actions/`
* `DELETE /api/actions/{id}/`
* `POST /api/actions/{id}/add-to-calendar/`

## Deployment

VoiceFlow is deployed with:

* **Neon** for PostgreSQL
* **Render** for the Django backend
* **Vercel** for the React frontend

### Recommended deploy order

1. Create a Neon Postgres database and copy `DATABASE_URL`
2. Deploy the backend on Render
3. Configure Google OAuth redirect URI to the backend callback
4. Deploy the frontend on Vercel
5. Verify auth, transcription, actions, and calendar sync

---

## Backend Deployment (Render)

### Render settings

* Root directory: `backend`
* Build command:

```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput
```

* Pre-deploy command:

```bash
python manage.py migrate
```

* Start command:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

### Required backend environment variables

```env
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=<render-domain>
DATABASE_URL=<neon-database-url>
DB_SSL_REQUIRE=1

OPENAI_API_KEY=<server-side-openai-key>

CORS_ALLOWED_ORIGINS=https://<vercel-domain>
CSRF_TRUSTED_ORIGINS=https://<vercel-domain>,https://<render-domain>

LOGIN_REDIRECT_URL=https://<vercel-domain>/
LOGOUT_REDIRECT_URL=https://<vercel-domain>/
GOOGLE_OAUTH_CALLBACK_URL=https://<render-domain>/accounts/google/login/callback/

USE_SECURE_COOKIES=1
SESSION_COOKIE_SAMESITE=None
CSRF_COOKIE_SAMESITE=None

TRANSCRIPTION_POST_RATE_LIMIT=20/hour
CALENDAR_SYNC_POST_RATE_LIMIT=30/hour
MAX_AUDIO_UPLOAD_BYTES=15728640
ALLOWED_AUDIO_CONTENT_TYPES=audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/flac
APP_LOG_LEVEL=INFO
```

---

## Frontend Deployment (Vercel)

### Vercel settings

* Root directory: `frontend`
* Framework preset: `Vite`
* Build command:

```bash
npm run build
```

* Output directory:

```text
dist
```

### Required frontend environment variables

```env
VITE_API_BASE_URL=https://<render-domain>
```

## Security and Abuse Protection

The deployed demo includes a minimal abuse-protection layer:

* OpenAI API key is used on the backend only
* High-cost endpoints are rate-limited
* Calendar sync endpoints require authentication
* Upload requests are validated by size and MIME type
* Provider-facing raw errors are logged on the backend only
* User-facing errors are sanitized before reaching the UI

## Known Limitation

If the frontend and backend are deployed on different root domains, such as `*.vercel.app` and `*.onrender.com`, some mobile browsers may handle cross-site session cookies more strictly. As a result, desktop OAuth is more reliable in the current hosted preview setup.


## Troubleshooting

### CSRF Failed: CSRF token missing

* Confirm the frontend calls `GET /api/auth/csrf/`
* Confirm state-changing requests send `X-CSRFToken`
* Confirm `credentials: include` is enabled on authenticated requests
* Confirm `CSRF_TRUSTED_ORIGINS` includes your frontend domain

### Google login loops back to sign-in

* Check that the OAuth redirect URI exactly matches the backend callback URL
* Check Django `Site` configuration
* Check the Google `SocialApp` binding in Django admin
* Check session cookie behavior in your browser

## Future Improvements

- Use a shared custom domain for frontend and backend to improve mobile auth reliability.
- **Real-time streaming transcription**: WebSocket connection with chunked Whisper or Deepgram for live text display while recording.
- **Multiple action extraction**: Detect multiple actions in a single transcript ("meeting at 2 and pick up groceries at 5").
- **Richer action types**: Emails, Slack messages, task assignments.
- **Sentiment analysis and note analytics**: Help users track emotional tone, recurring topics, and longer-term personal patterns across their voice notes.
- **Audio file import**: Support importing existing audio files in common formats such as MP3, so users can transcribe recordings captured outside the app instead of only using live browser recording.
- **Async task processing**: Move Whisper calls to Celery + Redis workers for better reliability and scalability. Return a job ID and poll or push results via WebSocket.
- **Observability**: Add Prometheus + Grafana for production monitoring — request latency, transcription duration histograms, extraction success rate, and calendar sync failure rate.