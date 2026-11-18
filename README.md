# The Dark Odds

A responsive football-analysis and premium-membership landing site built with Vite.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
A GitHub Actions workflow builds the site and deploys it to GitHub Pages on every push to `main`. In repository Settings → Pages, set the source to **GitHub Actions**.

## Launch limitations
- Payments currently use manual M-Pesa Send Money instructions to the owner-provided number **+254746771677**.
- Payment is **not** automatically verified and this static site does not unlock or expire paid accounts. A secure backend and Daraja credentials (consumer key/secret, shortcode, passkey, callback URL) plus verified transaction flow are required before automated STK Push and membership activation can go live.
- Match cards are clearly marked demo placeholders. Replace them with researched fixtures and current odds before publishing predictions.
- Never put Daraja secrets in frontend code or commit them to GitHub. Store secrets only in encrypted server-side environment variables.
- Betting is risky; 18+ only and no outcomes are guaranteed.

 
## Daraja STK Push backend (sandbox first)

The frontend calls a separate Node.js API. GitHub Pages hosts only the static site; it cannot run the payment server.

1. Deploy this repository's `server/index.js` as a Node web service on a backend host that supports persistent disk storage.
2. Set the backend environment variables from `.env.example` in that host's encrypted Environment/Secrets settings. Set `DARAJA_CALLBACK_URL` to the public backend URL plus `/api/daraja/callback`.
3. Set `DARAJA_ENV=sandbox`, the Sandbox app Consumer Key/Secret, Sandbox shortcode and Sandbox passkey. Keep all secrets on the backend only.
4. Set `VITE_API_BASE` in the frontend build environment to the backend's public base URL, then rebuild/redeploy the GitHub Pages site.
5. Test with Daraja's Sandbox test MSISDN and confirm the callback marks a KSh 360 payment as PAID.

The SQLite database must be stored on a persistent disk (set `DATA_DIR` to its mounted path). Without persistent storage, payment and membership records can be lost on restart. Do not switch to production until Safaricom has approved your live shortcode and production app credentials.

**Important limitations:** This initial integration grants 24-hour access against the phone number after a successful callback, but it does not yet provide member login or a protected VIP content page. A production launch needs authentication and server-side protection for premium content, plus end-to-end testing. Never put Consumer Secret or Passkey in Vite variables or frontend code.
