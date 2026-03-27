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

## Implemented endpoints

- `GET /api/auth/me/`
- `POST /api/auth/logout/`
- `POST /api/transcriptions/`
- `GET /api/transcriptions/`
- allauth routes: `/accounts/*`
