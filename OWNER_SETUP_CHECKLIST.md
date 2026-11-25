# Owner setup checklist

1. Upload ZIP contents to the root of GitHub repository `NOVA11`.
2. On Render, configure the Web Service: Node, `npm install`, `npm start`.
3. Add AI provider key(s) as Render environment variables.
4. For cloud sync, connect a PostgreSQL database and set `DATABASE_URL` plus a unique 32+ character `NOVA_AUTH_SECRET`.
5. For source-backed web research, add `TAVILY_API_KEY`.
6. Redeploy, verify `/api/health` and `/api/cloud/status`, then test cloud register/login from Settings.
7. Test voice on HTTPS Chrome; allow microphone permission; START and RUKO.
8. Test backup/export before importing or switching devices.

Never put keys, passwords, OTPs, database URLs or auth secrets in frontend files or GitHub.
