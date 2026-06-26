Backend for HMBMS

Setup

1. Copy environment variables into `.env` at the `backend/` folder root:

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

API

- POST /api/auth/login
  - body: { username, password }
  - response: { user }

Notes

- This example validates plaintext passwords against the `users` table in Supabase. For production, use hashed passwords and a proper auth flow.
