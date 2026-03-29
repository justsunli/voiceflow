# Voiceflow - Phase 1 + Phase 2 Implementation

This repo now includes Phase 1 and Phase 2 implementation based on `design-doc.md`:

- `backend/`: Django + DRF + django-allauth + PostgreSQL configuration
- `frontend/`: React + Vite + TypeScript auth + recorder/transcription UI
- Google OAuth login flow, session-based auth endpoints, and transcription APIs

## Checklist

- [x] Django project setup with DRF, PostgreSQL, and django-allauth
- [x] React app setup (Vite + TypeScript)
- [x] Google OAuth login/logout flow wiring
- [x] Basic authenticated home page
- [x] Audio recording in browser (MediaRecorder)
- [x] Audio upload + backend transcription endpoint
- [x] Transcript history list for the signed-in user
- [ ] Deployment pipeline (left for environment-specific setup)

## Quick start

1. Start PostgreSQL (`backend/docker-compose.yml` provided).
2. Setup and run backend: see [backend/README.md](backend/README.md)
3. Setup and run frontend: see [frontend/README.md](frontend/README.md)
4. Configure Google OAuth credentials and allauth Social Application.

## Deployment (Vercel + Render + Neon)

### Project roots

- Frontend root: `frontend/`
- Backend root: `backend/`
- Django settings module: `config.settings`
- Vite build output: `frontend/dist`

### Deploy order

1. Create Neon Postgres and copy connection string.
2. Deploy backend to Render (web service, root `backend/`) and set env vars.
3. Configure Google OAuth redirect URI to Render backend callback URL.
4. Deploy frontend to Vercel (root `frontend/`) with backend URL env.
5. Update Render CORS/CSRF env vars to the final Vercel domain if needed.
6. Verify login, transcription, action mode, and calendar sync in production.

### Render backend commands

- Build:
  - `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- Pre-deploy:
  - `python manage.py migrate`
- Start:
  - `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

You can use blueprint:
- [`render.yaml`](render.yaml)

### Required Render env vars

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=0`
- `DJANGO_ALLOWED_HOSTS=<render-domain>`
- `DATABASE_URL=<neon-url>`
- `DB_SSL_REQUIRE=1`
- `OPENAI_API_KEY`
- `CORS_ALLOWED_ORIGINS=https://<vercel-domain>`
- `CSRF_TRUSTED_ORIGINS=https://<vercel-domain>,https://<render-domain>`
- `LOGIN_REDIRECT_URL=https://<vercel-domain>/`
- `LOGOUT_REDIRECT_URL=https://<vercel-domain>/`
- `GOOGLE_OAUTH_CALLBACK_URL=https://<render-domain>/accounts/google/login/callback/`
- `USE_SECURE_COOKIES=1`
- `SESSION_COOKIE_SAMESITE=None`
- `CSRF_COOKIE_SAMESITE=None`

### Required Vercel env vars

- `VITE_API_BASE_URL=https://<render-domain>`

### Vercel settings

- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

## Implemented endpoints

- `GET /api/auth/me/`
- `POST /api/auth/logout/`
- `POST /api/transcriptions/`
- `GET /api/transcriptions/`
- allauth routes: `/accounts/*`
