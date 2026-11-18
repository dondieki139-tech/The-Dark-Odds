import express from 'express'
import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'

const app = express()
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '100kb' }))

const intasendConfigured = Boolean(process.env.INTASEND_SECRET_KEY && process.env.INTASEND_WEBHOOK_CHALLENGE)
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
  CREATE TABLE IF NOT EXISTS bet_packages (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, bet_date TEXT NOT NULL, release_at TEXT NOT NULL,
    team1 TEXT NOT NULL, selection1 TEXT NOT NULL, analysis1 TEXT NOT NULL DEFAULT '', status1 TEXT NOT NULL DEFAULT 'PENDING',
    team2 TEXT NOT NULL, selection2 TEXT NOT NULL, analysis2 TEXT NOT NULL DEFAULT '', status2 TEXT NOT NULL DEFAULT 'PENDING',
    team3 TEXT NOT NULL, selection3 TEXT NOT NULL, analysis3 TEXT NOT NULL DEFAULT '', status3 TEXT NOT NULL DEFAULT 'PENDING',
    published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS package_access (
    phone TEXT NOT NULL, package_id TEXT NOT NULL, expires_at TEXT NOT NULL, receipt TEXT NOT NULL,
    PRIMARY KEY(phone, package_id)
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY, league TEXT NOT NULL, home TEXT NOT NULL, away TEXT NOT NULL,
    kickoff TEXT NOT NULL, pick TEXT NOT NULL, odds TEXT, analysis TEXT,
    published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );
`)

// Add package_id safely for databases created by earlier versions.
if (!db.prepare('PRAGMA table_info(payments)').all().some(c => c.name === 'package_id')) {
  db.exec('ALTER TABLE payments ADD COLUMN package_id TEXT')
}
const betColumns = db.prepare('PRAGMA table_info(bet_packages)').all().map(c => c.name)
for (const [name, definition] of [
  ['analysis1', "TEXT NOT NULL DEFAULT ''"], ['status1', "TEXT NOT NULL DEFAULT 'PENDING'"],
  ['analysis2', "TEXT NOT NULL DEFAULT ''"], ['status2', "TEXT NOT NULL DEFAULT 'PENDING'"],
  ['analysis3', "TEXT NOT NULL DEFAULT ''"], ['status3', "TEXT NOT NULL DEFAULT 'PENDING'"]
]) if (!betColumns.includes(name)) db.exec('ALTER TABLE bet_packages ADD COLUMN ' + name + ' ' + definition)
function normalizeGameStatus(value) {
  const status = String(value || 'PENDING').toUpperCase()
  return ['PENDING','WON','LOST','VOID'].includes(status) ? status : 'PENDING'
}
function betResult(bet) {
  const statuses = [bet.status1, bet.status2, bet.status3].map(normalizeGameStatus)
  if (statuses.every(status => status === 'WON')) return 'WON'
  if (statuses.some(status => status === 'LOST')) return 'LOST'
  if (statuses.every(status => status === 'VOID')) return 'VOID'
  return 'OPEN'
}
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
  ok: true, intasendConfigured,
  paymentProvider: 'intasend',
  mode: process.env.INTASEND_SECRET_KEY?.includes('_live_') ? 'live' : 'sandbox'
}))

app.post('/api/stkpush', async (req, res) => {
  if (!intasendConfigured) return res.status(503).json({ error: 'IntaSend is not configured yet. Add the secret key and webhook challenge in Render.' })
  const phone = kenyaPhone(req.body?.phone)
  const packageId = String(req.body?.packageId || '')
  const pack = db.prepare('SELECT id FROM bet_packages WHERE id = ? AND published = 1').get(packageId)
  if (!pack) return res.status(400).json({ error: 'Choose an available published prediction package before paying.' })
  if (!phone) return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa number.' })

  const apiRef = 'DARKODDS-' + crypto.randomUUID()
  db.prepare(`INSERT INTO payments
    (checkout_id, merchant_id, phone, amount, status, created_at, package_id)
    VALUES (?, NULL, ?, 360, 'PENDING', ?, ?)`)
    .run(apiRef, phone, new Date().toISOString(), packageId)

  try {
    const response = await fetch('https://api.intasend.com/api/v1/payment/mpesa-stk-push/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.INTASEND_SECRET_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 360, phone_number: phone, api_ref: apiRef })
    })
    const data = await response.json().catch(() => ({}))
    const invoiceId = data.invoice?.invoice_id || data.invoice_id || data.id || null
    if (!response.ok || !invoiceId) {
      db.prepare("UPDATE payments SET status = 'FAILED', result_code = ? WHERE checkout_id = ?")
        .run(String(data.message || data.errors || 'INTASEND_REQUEST_FAILED').slice(0, 200), apiRef)
      return res.status(502).json({ error: data.message || data.errors || 'IntaSend could not start the M-Pesa request.' })
    }
    db.prepare('UPDATE payments SET merchant_id = ? WHERE checkout_id = ?').run(String(invoiceId), apiRef)
    res.json({
      ok: true,
      checkoutRequestId: apiRef,
      message: 'M-Pesa request sent through IntaSend. Check your phone and enter your PIN to approve.'
    })
  } catch (error) {
    console.error('IntaSend STK request failed:', error.message)
    db.prepare("UPDATE payments SET status = 'FAILED', result_code = 'INTASEND_NETWORK_ERROR' WHERE checkout_id = ?").run(apiRef)
    res.status(502).json({ error: 'Could not start the IntaSend payment. Please try again.' })
  }
})

app.post('/api/intasend/webhook', (req, res) => {
  try {
    const received = String(req.body?.challenge || '')
    const expected = String(process.env.INTASEND_WEBHOOK_CHALLENGE || '')
    if (!expected || !received || !safeEqual(received, expected)) {
      return res.status(401).json({ error: 'Invalid webhook challenge.' })
    }
    if (req.body?.topic !== 'collection_event') return res.json({ ok: true })

    const apiRef = String(req.body?.api_ref || '')
    if (!apiRef) return res.status(400).json({ error: 'Missing payment reference.' })
    const payment = db.prepare('SELECT * FROM payments WHERE checkout_id = ?').get(apiRef)
    if (!payment || payment.status === 'PAID') return res.json({ ok: true })

    const state = String(req.body?.state || '').toUpperCase()
    if (state === 'FAILED' || state === 'CANCELED') {
      db.prepare("UPDATE payments SET status = 'FAILED', result_code = ? WHERE checkout_id = ? AND status <> 'PAID'")
        .run(String(req.body?.failed_code || state), apiRef)
      return res.json({ ok: true })
    }
    if (state !== 'COMPLETE') return res.json({ ok: true })

    const amount = Number(req.body?.value)
    const currency = String(req.body?.currency || '').toUpperCase()
    const paidPhone = kenyaPhone(req.body?.account)
    const provider = String(req.body?.provider || '').toUpperCase()
    const receipt = String(req.body?.mpesa_reference || req.body?.provider_ref || '')
    if (amount !== 360 || currency !== 'KES' || paidPhone !== payment.phone || provider !== 'M-PESA' || !receipt) {
      db.prepare("UPDATE payments SET status = 'REVIEW', result_code = 'INTASEND_CALLBACK_MISMATCH' WHERE checkout_id = ? AND status <> 'PAID'")
        .run(apiRef)
      return res.json({ ok: true })
    }

    const now = new Date()
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const grant = db.transaction(() => {
      db.prepare("UPDATE payments SET status = 'PAID', receipt = ?, result_code = '0', paid_at = ? WHERE checkout_id = ? AND status <> 'PAID'")
        .run(receipt, now.toISOString(), apiRef)
      if (payment.package_id) db.prepare(`INSERT INTO package_access(phone, package_id, expires_at, receipt) VALUES (?, ?, ?, ?)
        ON CONFLICT(phone, package_id) DO UPDATE SET expires_at = excluded.expires_at, receipt = excluded.receipt`)
        .run(payment.phone, payment.package_id, expiry, receipt)
    })
    grant()
    res.json({ ok: true })
  } catch (error) {
    console.error('IntaSend webhook processing failed:', error.message)
    res.status(500).json({ error: 'Webhook processing failed.' })
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
    // A verified purchase unlocks its package immediately for 24 hours.
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const grant = db.transaction(() => {
      db.prepare("UPDATE payments SET status = 'PAID', receipt = ?, result_code = '0', paid_at = ? WHERE checkout_id = ?")
        .run(receipt, now.toISOString(), payment.checkout_id)
      if (payment.package_id) db.prepare(`INSERT INTO package_access(phone, package_id, expires_at, receipt) VALUES (?, ?, ?, ?)
        ON CONFLICT(phone, package_id) DO UPDATE SET expires_at = excluded.expires_at, receipt = excluded.receipt`)
        .run(payment.phone, payment.package_id, expiry, receipt)
    })
    grant()
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('Callback processing failed:', error.message)
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})

app.get('/api/payment/:checkoutId', (req, res) => {
  const payment = db.prepare('SELECT status, phone, package_id FROM payments WHERE checkout_id = ?').get(req.params.checkoutId)
  if (!payment) return res.status(404).json({ error: 'Payment not found.' })
  const membership = db.prepare('SELECT expires_at FROM memberships WHERE phone = ?').get(payment.phone)
  const access = payment.package_id ? db.prepare('SELECT expires_at FROM package_access WHERE phone = ? AND package_id = ?').get(payment.phone, payment.package_id) : null
  res.json({ status: payment.status, packageId: payment.package_id, activeUntil: access?.expires_at || membership?.expires_at || null })
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
app.get('/api/admin/payments', requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT p.checkout_id, p.phone, p.amount, p.status, p.receipt, p.created_at, p.paid_at,
           COALESCE(b.title, 'Deleted prediction package') AS package_title
    FROM payments p LEFT JOIN bet_packages b ON b.id = p.package_id
    ORDER BY p.created_at DESC LIMIT 100
  `).all().map(p => ({
    ...p,
    phone: p.phone.length >= 4 ? '••••' + p.phone.slice(-4) : '••••',
  }))
  const totals = db.prepare(`
    SELECT COUNT(*) AS paid_count, COALESCE(SUM(amount), 0) AS paid_total
    FROM payments WHERE status = 'PAID'
  `).get()
  res.json({ payments: rows, paidCount: totals.paid_count, paidTotal: totals.paid_total })
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


app.get('/api/bets', (_req, res) => {
  const bets = db.prepare('SELECT id, title, bet_date, release_at, team1, team2, team3, status1, status2, status3 FROM bet_packages WHERE published = 1 ORDER BY bet_date ASC, release_at ASC, title ASC').all()
  res.json({ bets: bets.map(bet => ({ ...bet, result: betResult(bet) })) })
})
app.get('/api/bets/:id', (req, res) => {
  const phone = kenyaPhone(req.query.phone)
  if (!phone) return res.status(400).json({ error: 'Enter the M-Pesa phone number used for this prediction package.' })
  const pack = db.prepare('SELECT * FROM bet_packages WHERE id = ? AND published = 1').get(req.params.id)
  if (!pack) return res.status(404).json({ error: 'Bet slip not found.' })
  const access = db.prepare('SELECT expires_at FROM package_access WHERE phone = ? AND package_id = ?').get(phone, pack.id)
  if (!access || new Date(access.expires_at) <= new Date()) return res.status(403).json({ error: 'Payment for this specific prediction package is required.' })
  res.json({ bet: { id: pack.id, title: pack.title, betDate: pack.bet_date, releaseAt: pack.release_at, result: betResult(pack),
    selections: [
      { team: pack.team1, selection: pack.selection1, analysis: pack.analysis1, status: normalizeGameStatus(pack.status1) },
      { team: pack.team2, selection: pack.selection2, analysis: pack.analysis2, status: normalizeGameStatus(pack.status2) },
      { team: pack.team3, selection: pack.selection3, analysis: pack.analysis3, status: normalizeGameStatus(pack.status3) }
    ] } })
})
app.get('/api/admin/bets', requireAdmin, (_req, res) => {
  res.json({ bets: db.prepare('SELECT * FROM bet_packages ORDER BY bet_date DESC, created_at DESC').all() })
})
app.post('/api/admin/bets', requireAdmin, (req, res) => {
  const b = req.body || {}
  const values = [b.title, b.betDate, b.releaseAt, b.team1, b.selection1, b.analysis1, b.team2, b.selection2, b.analysis2, b.team3, b.selection3, b.analysis3].map(v => String(v || '').trim())
  if (values.some((v, i) => !v && [0,1,3,4,6,7,9,10].includes(i))) return res.status(400).json({ error: 'Complete the title, date, release time and all 3 games and selections.' })
  const statuses = [b.status1, b.status2, b.status3].map(normalizeGameStatus)
  const id = crypto.randomUUID()
  db.prepare(`INSERT INTO bet_packages(id,title,bet_date,release_at,team1,selection1,analysis1,status1,team2,selection2,analysis2,status2,team3,selection3,analysis3,status3,published,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, values[0], values[1], values[2], values[3], values[4], values[5], statuses[0], values[6], values[7], values[8], statuses[1], values[9], values[10], values[11], statuses[2], b.published === true ? 1 : 0, new Date().toISOString())
  res.status(201).json({ ok: true, id })
})
app.put('/api/admin/bets/:id', requireAdmin, (req, res) => {
  const b = req.body || {}
  const values = [b.title, b.betDate, b.releaseAt, b.team1, b.selection1, b.analysis1, b.team2, b.selection2, b.analysis2, b.team3, b.selection3, b.analysis3].map(v => String(v || '').trim())
  if (values.some((v, i) => !v && [0,1,3,4,6,7,9,10].includes(i))) return res.status(400).json({ error: 'Complete the title, date, release time and all 3 games and selections.' })
  const statuses = [b.status1, b.status2, b.status3].map(normalizeGameStatus)
  const result = db.prepare(`UPDATE bet_packages SET title=?,bet_date=?,release_at=?,team1=?,selection1=?,analysis1=?,status1=?,team2=?,selection2=?,analysis2=?,status2=?,team3=?,selection3=?,analysis3=?,status3=?,published=? WHERE id=?`)
    .run(values[0], values[1], values[2], values[3], values[4], values[5], statuses[0], values[6], values[7], values[8], statuses[1], values[9], values[10], values[11], statuses[2], b.published === true ? 1 : 0, req.params.id)
  if (!result.changes) return res.status(404).json({ error: 'Bet slip not found.' })
  res.json({ ok: true })
})
app.delete('/api/admin/bets/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM package_access WHERE package_id = ?').run(req.params.id)
  const result = db.prepare('DELETE FROM bet_packages WHERE id = ?').run(req.params.id)
  if (!result.changes) return res.status(404).json({ error: 'Bet slip not found.' })
  res.json({ ok: true })
})

app.listen(port, () => console.log(`The Dark Odds API listening on ${port}`))
