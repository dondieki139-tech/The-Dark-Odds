# The Dark Odds

Responsive football-analysis website built with Vite and an Express API. Paid prediction packages cost KSh 360 each.

## Render services

- Frontend: `https://the-dark-odds.onrender.com`
- Backend API: `https://the-dark-odds-api.onrender.com`
- Frontend build: `npm install && npm run build`
- Frontend publish directory: `dist`
- Backend start: `npm start`

The frontend reads `VITE_API_BASE` at build time.

## IntaSend M-Pesa configuration

The backend starts an IntaSend M-Pesa STK Push from `POST /api/stkpush`. It creates a pending payment reference before contacting IntaSend and grants package access only after a verified `collection_event` webhook reports `COMPLETE`, KES 360, the matching customer phone, M-Pesa provider and receipt.

Set these only in the backend Render service's Environment page. Never commit or expose the secret key:

- `INTASEND_SECRET_KEY` — sandbox key first (`ISSecretKey_test_...`), then live key only after sandbox tests.
- `INTASEND_WEBHOOK_CHALLENGE` — a long random secret string shared with the webhook configuration.

In IntaSend Dashboard → Settings → Webhooks, create a webhook with:

- Endpoint: `https://the-dark-odds-api.onrender.com/api/intasend/webhook`
- Challenge: exactly the same value as `INTASEND_WEBHOOK_CHALLENGE`
- Event: `collection_event`

IntaSend API base: `https://api.intasend.com/api/v1/`. Test with sandbox keys before switching to live keys. Do not interpret a pending STK request or browser redirect as a successful payment; only a verified COMPLETE webhook unlocks the package.

## Launch blockers — do not accept live payments until resolved

- The backend uses SQLite. Render's default filesystem is ephemeral; attach a persistent disk and set `DATA_DIR` to its mount path, or migrate to a managed database, before relying on payment or package records.
- Paid content access currently uses the phone number supplied by the customer as its lookup credential. Add a secure purchase/session token before public launch; a phone number alone is not strong authentication.
- Match cards are admin-entered placeholders, not automatically verified live fixtures or guaranteed predictions.
- Complete sandbox STK, webhook, callback replay, amount/phone mismatch, and package-unlock tests before live activation.
- Confirm the IntaSend account is approved for this digital-predictions business and verify its settlement/withdrawal options and fees in the IntaSend dashboard.

## Admin dashboard

- Open `https://the-dark-odds.onrender.com/?admin=1`.
- Set `ADMIN_PASSWORD` privately in the backend Render environment.
- `ADMIN_SESSION_SECRET` is used to sign admin sessions.
- Admins can create, edit, publish and update prediction packages.
- Configure persistent storage before relying on saved packages and payment history.
