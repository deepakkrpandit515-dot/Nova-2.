# NOVA V11 — Master Merged Build

This package consolidates the NOVA features from the current Global Intelligence + Voice build into one repository-root ZIP. Upload the **contents** of this ZIP (not an extra enclosing folder) to the `NOVA11` GitHub repository.

## Included
- AI Chat with Gemini/Groq provider fallback (server-side keys)
- Hindi browser voice: START, RUKO/STOP, speech output and repeat/listening flow
- Global Intelligence: market research, international trade, competitor and customer research, opportunity radar, business ideas
- Tasks, reminders/workspace, money records, social drafts, memory/notes and chat history
- Local file vault, backup/import, photo/video tools, PWA install support and 3D hologram
- NOVA hologram artwork integrated into the 3D hero, optimized WebP asset
- Responsive mobile/desktop UI
- PostgreSQL-backed account/cloud sync integration for supported records
- Optional Tavily search integration and source display
- Health/provider/cloud status endpoints

## Deploy to Render
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health endpoint: `/api/health`
- Add secret environment values in Render Dashboard only; never commit `.env`.

## Required configuration to activate connected features
- `GEMINI_API_KEY` or `GROQ_API_KEY` for AI (provider quota/availability applies)
- `DATABASE_URL` and a strong unique `NOVA_AUTH_SECRET` for PostgreSQL cloud sync
- `TAVILY_API_KEY` for optional live search
- Configure these in Render Environment. Cloud login/sync and live research are not active until configured and verified.
- Check `/api/cloud/status` after deployment.

## Important boundaries
- API keys, Render/GitHub account connection, deployment, and account authorization must be completed by the owner. This ZIP cannot connect accounts or deploy itself.
- Without database configuration, data remains on the device/browser; it will not magically sync between phones and PCs.
- Files in the local vault are not uploaded to cloud by this build.
- Voice depends on Chrome/browser support, HTTPS and microphone permission; it is not always-on listening.
- Money tracker is manual. NOVA does not automatically make payments, trade, publish, contact customers or execute external actions.
- Research is AI-assisted. Verify market data, sources, customs/tax rules and prices independently. Earnings are not guaranteed.

## Quick checks
Run `npm install`, then `npm run check`, then `npm start`.
