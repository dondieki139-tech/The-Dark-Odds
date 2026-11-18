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
