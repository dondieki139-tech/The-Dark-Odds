import express from 'express'
import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'

const app = express()
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '100kb' }))

const required = ['DARAJA_CONSUMER_KEY','DARAJA_CONSUMER_SECRET','DARAJA_SHORTCODE','DARAJA_PASSKEY','DARAJA_CALLBACK_URL']
const missing = required.filter(k => !process.env[k])
const port = Number(process.env.PORT || 3000)
const baseUrl = process.env.DARAJA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'
const dbDir = process.env.DATA_DIR || './data'
fs.mkdirSync(dbDir, { recursive: true })
const db = new Database(path.join(dbDir, 'dark-odds.sqlite'))
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    checkout_id TEXT PRIMARY KEY, merchant_id TEXT, phone TEXT NOT NULL,
    amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
    receipt TEXT, result_code TEXT, created_at TEXT NOT NULL,
    paid_at TEXT
  );
  CREATE TABLE IF NOT EXISTS memberships (
    phone TEXT PRIMARY KEY, expires_at TEXT NOT NULL, receipt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY, league TEXT NOT NULL, home TEXT NOT NULL, away TEXT NOT NULL,
    kickoff TEXT NOT NULL, pick TEXT NOT NULL, odds TEXT, analysis TEXT,
    published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );
`)

let tokenCache = { value: null, expires: 0 }
async function accessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expires) return tokenCache.value
  const auth = Buffer.from(process.env.DARAJA_CONSUMER_KEY + ':' + process.env.DARAJA_CONSUMER_SECRET).toString('base64')
  const response = await fetch(baseUrl + '/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: 'Basic ' + auth }
  })
  const data = await response.json()
  if (!response.ok || !data.access_token) throw new Error('Daraja OAuth failed')
  tokenCache = { value: data.access_token, expires: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 }
  return tokenCache.value
}
function kenyaPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (/^07\d{8}$/.test(digits)) return '254' + digits.slice(1)
  if (/^01\d{8}$/.test(digits)) return '254' + digits.slice(1)
  if (/^254[17]\d{8}$/.test(digits)) return digits
  return null
}
function stkPassword(timestamp) {
  return Buffer.from(process.env.DARAJA_SHORTCODE + process.env.DARAJA_PASSKEY + timestamp).toString('base64')
}

app.get('/api/health', (_req, res) => res.json({
  ok: true, darajaConfigured: missing.length === 0,
  mode: process.env.DARAJA_ENV || 'sandbox'
}))

app.post('/api/stkpush', async (req, res) => {
  if (missing.length) return res.status(503).json({ error: 'Daraja server configuration is incomplete.' })
  const phone = kenyaPhone(req.body?.phone)
  if (!phone) return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa number.' })
  try {
    const token = await accessToken()
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const body = {
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: stkPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: process.env.DARAJA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: 360,
      PartyA: phone,
      PartyB: process.env.DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: 'DARKODDS',
      TransactionDesc: 'The Dark Odds 24-hour VIP'
    }
    const response = await fetch(baseUrl + '/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await response.json()
    if (!response.ok || data.ResponseCode !== '0') {
      return res.status(502).json({ error: data.errorMessage || data.ResponseDescription || 'Daraja rejected the STK request.' })
    }
    db.prepare(`INSERT OR REPLACE INTO payments
      (checkout_id, merchant_id, phone, amount, status, created_at)
      VALUES (?, ?, ?, 360, 'PENDING', ?)`)
      .run(data.CheckoutRequestID, data.MerchantRequestID || null, phone, new Date().toISOString())
    res.json({ ok: true, checkoutRequestId: data.CheckoutRequestID, message: 'Check your phone and enter your M-Pesa PIN to approve.' })
  } catch (error) {
    console.error('STK request failed:', error.message)
    res.status(502).json({ error: 'Could not start M-Pesa payment. Please try again.' })
  }
})

app.post('/api/daraja/callback', (req, res) => {
  // Daraja callbacks are acknowledged quickly; only successful, matching payments grant access.
  try {
    const callback = req.body?.Body?.stkCallback
    if (!callback?.CheckoutRequestID) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    const payment = db.prepare('SELECT * FROM payments WHERE checkout_id = ?').get(callback.CheckoutRequestID)
    if (!payment || payment.status === 'PAID') return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    const resultCode = String(callback.ResultCode)
    if (resultCode !== '0') {
      db.prepare('UPDATE payments SET status = ?, result_code = ? WHERE checkout_id = ?')
        .run('FAILED', resultCode, payment.checkout_id)
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
    const items = callback.CallbackMetadata?.Item || []
    const field = name => items.find(item => item.Name === name)?.Value
    const amount = Number(field('Amount'))
    const receipt = String(field('MpesaReceiptNumber') || '')
    const paidPhone = String(field('PhoneNumber') || '')
    if (amount !== 360 || !receipt || paidPhone !== payment.phone) {
      db.prepare('UPDATE payments SET status = ?, result_code = ? WHERE checkout_id = ?')
        .run('REVIEW', 'CALLBACK_MISMATCH', payment.checkout_id)
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
    const now = new Date()
    const existing = db.prepare('SELECT expires_at FROM memberships WHERE phone = ?').get(payment.phone)
    const start = existing && new Date(existing.expires_at) > now ? new Date(existing.expires_at) : now
    const expiry = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const grant = db.transaction(() => {
      db.prepare("UPDATE payments SET status = 'PAID', receipt = ?, result_code = '0', paid_at = ? WHERE checkout_id = ?")
        .run(receipt, now.toISOString(), payment.checkout_id)
      db.prepare(`INSERT INTO memberships(phone, expires_at, receipt) VALUES (?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET expires_at = excluded.expires_at, receipt = excluded.receipt`)
        .run(payment.phone, expiry, receipt)
    })
    grant()
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('Callback processing failed:', error.message)
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})

app.get('/api/payment/:checkoutId', (req, res) => {
  const payment = db.prepare('SELECT status, phone FROM payments WHERE checkout_id = ?').get(req.params.checkoutId)
  if (!payment) return res.status(404).json({ error: 'Payment not found.' })
  const membership = db.prepare('SELECT expires_at FROM memberships WHERE phone = ?').get(payment.phone)
  res.json({ status: payment.status, activeUntil: membership?.expires_at || null })
})

app.get('/api/membership', (req, res) => {
  const phone = kenyaPhone(req.query.phone)
  if (!phone) return res.status(400).json({ error: 'Valid phone number required.' })
  const membership = db.prepare('SELECT expires_at FROM memberships WHERE phone = ?').get(phone)
  const active = Boolean(membership && new Date(membership.expires_at) > new Date())
  res.json({ active, expiresAt: active ? membership.expires_at : null })
})


const adminPassword = process.env.ADMIN_PASSWORD || ''
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || ''
function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
function signAdminToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', adminSessionSecret).update(encoded).digest('base64url')
  return encoded + '.' + signature
}
function requireAdmin(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const parts = token.split('.')
  if (!adminSessionSecret || parts.length !== 2) return res.status(401).json({ error: 'Admin sign-in required.' })
  const expected = crypto.createHmac('sha256', adminSessionSecret).update(parts[0]).digest('base64url')
  if (!safeEqual(expected, parts[1])) return res.status(401).json({ error: 'Admin session is invalid. Sign in again.' })
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    if (payload.exp < Date.now() || payload.role !== 'admin') return res.status(401).json({ error: 'Admin session expired. Sign in again.' })
  } catch {
    return res.status(401).json({ error: 'Admin session is invalid.' })
  }
  next()
}
function cleanGame(body) {
  const value = {
    league: String(body?.league || '').trim().slice(0, 80),
    home: String(body?.home || '').trim().slice(0, 80),
    away: String(body?.away || '').trim().slice(0, 80),
    kickoff: String(body?.kickoff || '').trim().slice(0, 40),
    pick: String(body?.pick || '').trim().slice(0, 160),
    odds: String(body?.odds || '').trim().slice(0, 30),
    analysis: String(body?.analysis || '').trim().slice(0, 2000),
    published: body?.published === true ? 1 : 0
  }
  if (!value.league || !value.home || !value.away || !value.kickoff || !value.pick) return null
  return value
}
app.post('/api/admin/login', (req, res) => {
  if (!adminPassword || !adminSessionSecret) return res.status(503).json({ error: 'Admin access is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Render.' })
  if (!safeEqual(req.body?.password || '', adminPassword)) return res.status(401).json({ error: 'Incorrect admin password.' })
  const token = signAdminToken({ role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 })
  res.json({ token, expiresIn: 43200 })
})
app.get('/api/games', (_req, res) => {
  const games = db.prepare('SELECT id, league, home, away, kickoff, odds FROM games WHERE published = 1 ORDER BY kickoff ASC').all()
  res.json({ games })
})
app.get('/api/admin/games', requireAdmin, (_req, res) => {
  res.json({ games: db.prepare('SELECT * FROM games ORDER BY created_at DESC').all() })
})
app.post('/api/admin/games', requireAdmin, (req, res) => {
  const game = cleanGame(req.body)
  if (!game) return res.status(400).json({ error: 'Complete the league, teams, kickoff, and paid selection fields.' })
  const id = crypto.randomUUID()
  db.prepare(`INSERT INTO games (id, league, home, away, kickoff, pick, odds, analysis, published, created_at)
    VALUES (@id, @league, @home, @away, @kickoff, @pick, @odds, @analysis, @published, @created_at)`)
    .run({ id, ...game, created_at: new Date().toISOString() })
  res.status(201).json({ ok: true, id })
})
app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
  const game = cleanGame(req.body)
  if (!game) return res.status(400).json({ error: 'Complete the league, teams, kickoff, and paid selection fields.' })
  const result = db.prepare(`UPDATE games SET league=@league, home=@home, away=@away, kickoff=@kickoff,
    pick=@pick, odds=@odds, analysis=@analysis, published=@published WHERE id=@id`).run({ ...game, id: req.params.id })
  if (!result.changes) return res.status(404).json({ error: 'Game not found.' })
  res.json({ ok: true })
})
app.delete('/api/admin/games/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id)
  if (!result.changes) return res.status(404).json({ error: 'Game not found.' })
  res.json({ ok: true })
})

app.listen(port, () => console.log(`The Dark Odds API listening on ${port}`))
