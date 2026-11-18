# The Dark Odds

Responsive football-analysis website built with Vite, with an Express API for Safaricom Daraja STK Push.

## Render services

- Frontend static site: `https://the-dark-odds.onrender.com`
- Backend API: `https://the-dark-odds-api.onrender.com`
- Frontend build: `npm install && npm run build`
- Frontend publish directory: `dist`
- Backend build: `npm install`
- Backend start: `npm start`

The frontend reads `VITE_API_BASE` at build time. Set it to the backend URL on the Render static site's Environment page.

## Daraja configuration

Set these only in the backend Render service's Environment page. Never commit secrets or place them in frontend variables:

- `DARAJA_ENV=sandbox` until Safaricom approves production credentials.
- `DARAJA_CONSUMER_KEY`
- `DARAJA_CONSUMER_SECRET`
- `DARAJA_SHORTCODE`
- `DARAJA_PASSKEY`
- `DARAJA_CALLBACK_URL=https://the-dark-odds-api.onrender.com/api/daraja/callback`
- `DARAJA_TRANSACTION_TYPE=CustomerPayBillOnline` for PayBill. Use the Safaricom-approved transaction type for a Till.
- `DATA_DIR` set to a persistent mounted disk path before relying on SQLite records.

The configured price is KSh 360 for 24 hours. Confirm the shortcode type and Daraja app credentials with Safaricom before switching to production. Do not send credentials in chat.

## Important launch blockers

- Match cards are explicitly demo placeholders, not live fixtures or verified predictions.
- The API currently records a 24-hour membership after a matching successful callback, but there is no secure member login or server-protected VIP content page yet. Do not advertise paid VIP content as available until this is implemented and tested.
- SQLite currently defaults to `./data`. Render's ephemeral filesystem can lose data on restart or redeploy. Attach persistent storage or migrate to a managed database before accepting real payments.
- Test STK Push and callback end-to-end in Daraja Sandbox first. Confirm the amount, phone, receipt and membership expiry. Only switch to production after Safaricom approves the live shortcode and production app.
- Add rate limiting, stronger callback/payment verification, and operational monitoring before public launch.

## Local development

```bash
npm install
npm run dev
```

Run the API with `npm start` after configuring backend environment variables.

## Admin dashboard

- Open `https://the-dark-odds.onrender.com/?admin=1`.
- Set `ADMIN_PASSWORD` in the backend Render service Environment page before signing in. Choose a unique password and do not put it in GitHub or share it in chat.
- `ADMIN_SESSION_SECRET` has been configured privately in the backend Render environment.
- The dashboard lets the administrator create, edit, delete, and publish paid games. Only published match details appear publicly; the paid selection and analysis are not returned by the public games endpoint.
- Game records are stored in SQLite. Configure a persistent disk and set `DATA_DIR` to its mount path before relying on saved games across restarts or deploys.
