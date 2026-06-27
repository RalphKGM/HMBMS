Backend for HMBMS

Setup

1. Copy `.env.example` to `.env` at the `backend/` folder root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_or_anon_key
PORT=4000
```

2. Install dependencies and start server:

```bash
cd backend
npm install
npm run start
```

3. Run `frontend/supabase/schema.sql` in the Supabase SQL editor.

API

- GET /api/setup/status
  - checks whether Supabase is configured and the required tables exist

- POST /api/auth/login
  - body: { username, password }
  - response: { user }

Notes

- New users are stored with bcrypt password hashes. Plaintext password checks are only kept as a fallback for older demo rows that may already exist in Supabase.
