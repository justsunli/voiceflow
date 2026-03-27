# Voiceflow - Phase 1 Implementation

This repository now includes a Phase 1 scaffold based on `design-doc.md`:

- `backend/`: Django + DRF + django-allauth + PostgreSQL configuration
- `frontend/`: React + Vite + TypeScript auth shell
- Google OAuth login flow wiring and auth status endpoint

## Phase 1 Checklist

- [x] Django project setup with DRF, PostgreSQL, and django-allauth
- [x] React app setup (Vite + TypeScript)
- [x] Google OAuth login/logout flow wiring
- [x] Basic authenticated home page
- [ ] Deployment pipeline (left for environment-specific setup)

## Quick start

1. Start PostgreSQL (`backend/docker-compose.yml` provided).
2. Setup and run backend: see [backend/README.md](backend/README.md)
3. Setup and run frontend: see [frontend/README.md](frontend/README.md)
4. Configure Google OAuth credentials and allauth Social Application.

## Implemented endpoints

- `GET /api/auth/me/`
- `POST /api/auth/logout/`
- allauth routes: `/accounts/*`
