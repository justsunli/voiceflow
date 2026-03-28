# Backend (Django + DRF)

## 1) Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## 2) PostgreSQL

Create a local DB/user matching `.env` values (or update env vars accordingly).

## 3) Migrate & run

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## 4) Google OAuth Provider Setup

1. Open Django Admin: `http://localhost:8000/admin/`
2. Create/edit `Site` with domain `localhost:8000`.
3. Add Social Application:
- Provider: Google
- Client id / secret from Google Cloud OAuth credential
- Sites: attach the `localhost:8000` site
4. Ensure redirect URI is registered in Google Cloud:
- `http://localhost:8000/accounts/google/login/callback/`

## 5) Auth endpoints

- `GET /api/auth/me/`
- `POST /api/auth/logout/`
- Allauth routes under `/accounts/`.

## 6) Transcription endpoints (Phase 2)

- `POST /api/transcriptions/` with `multipart/form-data` field `audio`
- `GET /api/transcriptions/`
- `PATCH /api/transcriptions/{id}/`
- `DELETE /api/transcriptions/{id}/`
- `POST /api/actions/`
- `GET /api/actions/`

Required env vars:

- `OPENAI_API_KEY`
- Optional: `OPENAI_TRANSCRIPTION_MODEL` (default: `whisper-1`)
- Optional: `OPENAI_TRANSCRIPTION_LANGUAGE` (e.g. `zh`, `en`)
- Optional: `OPENAI_TRANSCRIPTION_PROMPT` (hint text for recognition style)
- Optional: `OPENAI_ACTION_MODEL` (default: `gpt-4.1-mini`)
- Optional: `MAX_AUDIO_UPLOAD_BYTES` (default: `15728640`)
