import './style.css'

if (new URLSearchParams(location.search).get('admin') === '1') {
  import('./admin.js')
} else {

const API = new URL(import.meta.env.VITE_API_BASE || 'https://the-dark-odds-api.onrender.com').origin
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const root = document.querySelector('#root')
root.innerHTML = `
<header class="topbar"><a class="brand" href="/"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a><nav><a href="#games">Paid games</a><a href="#how">How it works</a></nav><a class="nav-cta" href="#premium">Get access <span>↗</span></a></header>
<main>
<section class="hero"><div class="hero-copy"><div class="eyebrow"><i></i> FOOTBALL INSIGHT • KENYA</div><h1>READ THE GAME.<br><em>NOT THE HYPE.</em></h1><p>Premium football selections and match analysis. Every listed game is a paid pick. No free prediction feed and no guaranteed outcomes.</p><div class="hero-actions"><a class="button primary" href="#games">View paid games <span>→</span></a><a class="text-link" href="#premium">Buy access ↓</a></div><div class="trust-line"><span>01 / RESEARCH</span><span>02 / DISCIPLINE</span><span>03 / TRANSPARENCY</span></div></div><div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ball">D<span>O</span></div><div class="art-label">THE EDGE IS<br>IN THE DETAILS.</div><div class="art-index">TDO / 001</div></div></section>
<section class="ticker"><span>THE DARK ODDS</span><span>PAID PICKS ONLY</span><span>BET RESPONSIBLY • 18+</span></section>
<section class="section" id="games"><div class="section-head"><div><div class="eyebrow">01 — THE BOARD</div><h2>Games to <em>buy</em></h2></div><span class="muted">VIP SELECTIONS</span></div><div class="notice"><b>Paid picks only:</b> Match details are public. The selection and analysis are reserved for members after payment is verified.</div><div class="match-grid" id="game-list"><article class="match-card"><p>Loading paid games…</p></article></div></section>
<section class="premium-section" id="premium"><div class="premium-copy"><div class="eyebrow">02 — MEMBERSHIP</div><h2>Unlock the<br><em>selection.</em></h2><p>Pay KSh 360 with M-Pesa. Your payment must be confirmed by Safaricom before membership is recorded.</p><ul><li>Access to published paid selections</li><li>Match reasoning and risk notes</li><li>24-hour membership after confirmed payment</li></ul></div><div class="price-card"><div class="card-top"><span>THE DARK ODDS / VIP</span><span class="lock">✦</span></div><div class="price">KSh 360<small> / 24 hours</small></div><p>One-time payment. Enter the phone number registered with M-Pesa.</p><div class="divider"></div><h3>Pay with M-Pesa</h3><form id="stk-form" class="stk-form"><label for="mpesa-phone">M-Pesa phone number</label><input id="mpesa-phone" name="phone" type="tel" inputmode="tel" placeholder="07XXXXXXXX" autocomplete="tel" required><button class="button primary full" id="stk-submit" type="submit">Send payment prompt ↗</button><p id="stk-message" class="fine-print" role="status">Approve the prompt on your phone. Never enter your M-Pesa PIN on this website.</p></form><a class="text-link" href="https://wa.me/254746771677">Need help? Contact support ↗</a></div></section>
<section class="section how-section" id="how"><div class="section-head"><div><div class="eyebrow">03 — SIMPLE & CLEAR</div><h2>How it <em>works</em></h2></div></div><div class="steps"><div><b>01</b><h3>Choose</h3><p>Browse the published paid games.</p></div><div><b>02</b><h3>Subscribe</h3><p>Pay KSh 360 using M-Pesa.</p></div><div><b>03</b><h3>Verify</h3><p>Safaricom confirms the payment through Daraja.</p></div><div><b>04</b><h3>Unlock</h3><p>Member access follows successful verification.</p></div></div></section>
<section class="responsible"><span>18+ ONLY</span><p>Betting involves financial risk. There are no guaranteed wins. Only participate where legal, never stake money you cannot afford to lose, and take a break if betting stops being enjoyable.</p></section>
</main><footer><a class="brand" href="/"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a><span>© ${new Date().getFullYear()} THE DARK ODDS</span><a href="https://wa.me/254746771677">CONTACT SUPPORT ↗</a></footer>`

async function loadGames() {
  const list = document.querySelector('#game-list')
  try {
    const response = await fetch(API + '/api/games')
    if (!response.ok) throw new Error('Could not load paid games.')
    const { games = [] } = await response.json()
    list.innerHTML = games.length ? games.map((game, i) => `<article class="match-card"><div class="card-top"><span>${esc(game.league)}</span><span>0${i+1}</span></div><div class="teams"><div><small>HOME</small><strong>${esc(game.home)}</strong></div><div class="versus">VS</div><div class="away"><small>AWAY</small><strong>${esc(game.away)}</strong></div></div><div class="match-date">${esc(game.kickoff)}</div><div class="pick"><span>VIP SELECTION</span><b class="locked-pick">🔒 PAID PICK — LOCKED</b></div><p>${game.odds ? 'Listed odds: '+esc(game.odds) : 'Selection and analysis available to members.'}</p><a class="button primary full" href="#premium">Buy this game / Unlock ↗</a></article>`).join('') : '<div class="empty-board"><h3>No paid games published yet</h3><p>New selections will appear here when the administrator publishes them.</p></div>'
  } catch { list.innerHTML = '<div class="empty-board"><h3>Paid games are temporarily unavailable</h3><p>Please refresh in a moment or contact support.</p></div>' }
}
loadGames()

const stkForm = document.querySelector('#stk-form')
stkForm.addEventListener('submit', async event => {
  event.preventDefault()
  const phone = document.querySelector('#mpesa-phone').value.trim()
  const message = document.querySelector('#stk-message')
  const submit = document.querySelector('#stk-submit')
  submit.disabled = true; message.textContent = 'Connecting to M-Pesa…'
  try {
    const response = await fetch(API + '/api/stkpush', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone}) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not start payment.')
    message.textContent = data.message + ' Keep this page open while we confirm payment.'
    const checkoutId = data.checkoutRequestId
    let attempts = 0
    const poll = async () => {
      if (attempts++ >= 24) { message.textContent = 'Payment is still pending. If approved, contact support with your M-Pesa confirmation.'; submit.disabled = false; return }
      try {
        const check = await fetch(API + '/api/payment/' + encodeURIComponent(checkoutId))
        const status = await check.json()
        if (status.status === 'PAID') { message.textContent = 'Payment confirmed. Membership recorded until ' + new Date(status.activeUntil).toLocaleString() + '. Member content access is being finalized.'; submit.disabled = false; return }
        if (status.status === 'FAILED') { message.textContent = 'Payment was not completed. You can try again.'; submit.disabled = false; return }
      } catch {}
      setTimeout(poll, 5000)
    }
    setTimeout(poll, 5000)
  } catch (error) { message.textContent = error.message; submit.disabled = false }
})

}
