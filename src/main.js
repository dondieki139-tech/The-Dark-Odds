import './style.css'

const paymentNumber = '+254746771677'
const price = 'KSh 360'
const matches = [
  { league: 'MATCH ANALYSIS', home: 'Home team', away: 'Away team', date: 'Add fixture date', pick: 'Analysis coming soon', odds: '—', note: 'Illustrative preview card. Replace with a verified fixture and researched selection.' },
  { league: 'MATCH ANALYSIS', home: 'Team A', away: 'Team B', date: 'Add fixture date', pick: 'Analysis coming soon', odds: '—', note: 'No live odds are displayed until checked against a bookmaker.' },
  { league: 'MATCH ANALYSIS', home: 'Team C', away: 'Team D', date: 'Add fixture date', pick: 'Analysis coming soon', odds: '—', note: 'Use this space for form, team news and a reasoned pick.' }
]

document.querySelector('#root').innerHTML = `
  <header class="topbar">
    <a class="brand" href="#"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a>
    <nav><a href="#analysis">Analysis</a><a href="#premium">Premium</a><a href="#how">How it works</a></nav>
    <a class="nav-cta" href="#premium">Get access <span>↗</span></a>
  </header>
  <main>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><i></i> FOOTBALL INSIGHT • KENYA</div>
        <h1>READ THE GAME.<br><em>NOT THE HYPE.</em></h1>
        <p>Thoughtful football analysis, match previews and premium selections. Make informed decisions — never guaranteed outcomes.</p>
        <div class="hero-actions"><a class="button primary" href="#premium">Unlock premium <span>→</span></a><a class="text-link" href="#analysis">Explore analysis ↓</a></div>
        <div class="trust-line"><span>01 / RESEARCH</span><span>02 / DISCIPLINE</span><span>03 / TRANSPARENCY</span></div>
      </div>
      <div class="hero-art" aria-label="Dark football-inspired graphic"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ball">D<span>O</span></div><div class="art-label">THE EDGE IS<br>IN THE DETAILS.</div><div class="art-index">TDO / 001</div></div>
    </section>
    <section class="ticker"><span>THE DARK ODDS</span><span>ANALYSIS OVER PROMISES</span><span>BET RESPONSIBLY • 18+</span></section>
    <section class="section" id="analysis">
      <div class="section-head"><div><div class="eyebrow">01 — THE BOARD</div><h2>Match <em>analysis</em></h2></div><span class="muted">PREVIEW FORMAT</span></div>
      <div class="notice"><b>Demo content:</b> These are layout examples, not current fixtures or betting recommendations. Live match data and verified selections have not been connected yet.</div>
      <div class="match-grid">${matches.map((m,i)=>`<article class="match-card"><div class="card-top"><span>${m.league}</span><span>0${i+1}</span></div><div class="teams"><div><small>HOME</small><strong>${m.home}</strong></div><div class="versus">VS</div><div class="away"><small>AWAY</small><strong>${m.away}</strong></div></div><div class="match-date">${m.date}</div><div class="pick"><span>EDITOR'S NOTE</span><b>${m.pick}</b></div><p>${m.note}</p></article>`).join('')}</div>
    </section>
    <section class="premium-section" id="premium">
      <div class="premium-copy"><div class="eyebrow">02 — MEMBERSHIP</div><h2>Go beyond<br><em>the ordinary.</em></h2><p>Your membership is recorded after Daraja confirms payment. The secure VIP member portal is still being completed.</p><ul><li>Premium match analysis</li><li>Selection reasoning and risk notes</li><li>Daily access for 24 hours after approval</li></ul></div>
      <div class="price-card"><div class="card-top"><span>THE DARK ODDS / VIP</span><span class="lock">✦</span></div><div class="price">${price}<small> / 24 hours</small></div><p>One-time payment. Membership is recorded after Daraja confirms the payment.</p><div class="divider"></div><h3>Pay securely with M-Pesa</h3><p>Enter the phone number registered with M-Pesa. We'll send a payment prompt for KSh 360.</p><form id="stk-form" class="stk-form"><label for="mpesa-phone">M-Pesa phone number</label><input id="mpesa-phone" name="phone" type="tel" inputmode="tel" placeholder="07XXXXXXXX" autocomplete="tel" required><button class="button primary full" id="stk-submit" type="submit">Send payment prompt ↗</button><p id="stk-message" class="fine-print" role="status">Your PIN is entered only on your phone's official M-Pesa prompt — never on this website.</p></form><a class="text-link" href="https://wa.me/254746771677">Need help? Contact support ↗</a></div>
    </section>
    <section class="section how-section" id="how"><div class="section-head"><div><div class="eyebrow">03 — SIMPLE & CLEAR</div><h2>How it <em>works</em></h2></div></div><div class="steps"><div><b>01</b><h3>Explore</h3><p>Read the public match previews and analysis.</p></div><div><b>02</b><h3>Subscribe</h3><p>Pay KSh 360 using the M-Pesa number above.</p></div><div><b>03</b><h3>Verify</h3><p>Daraja confirms the payment automatically through its callback.</p></div><div><b>04</b><h3>Membership</h3><p>Your 24-hour membership is recorded. Contact support while the secure VIP portal is being completed.</p></div></div></section>
    <section class="responsible"><span>18+ ONLY</span><p>Betting involves financial risk. There are no guaranteed wins. Only participate where legal, never stake money you cannot afford to lose, and take a break if betting stops being enjoyable.</p></section>
  </main>
  <footer><a class="brand" href="#"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a><span>© ${new Date().getFullYear()} THE DARK ODDS</span><a href="https://wa.me/254746771677">CONTACT SUPPORT ↗</a></footer>
`


const stkForm = document.querySelector('#stk-form')
if (stkForm) {
  const message = document.querySelector('#stk-message')
  const submit = document.querySelector('#stk-submit')
  const apiBase = new URL(import.meta.env.VITE_API_BASE || 'https://the-dark-odds-api.onrender.com').origin
  stkForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const phone = document.querySelector('#mpesa-phone').value.trim()
    submit.disabled = true
    message.textContent = 'Connecting to M-Pesa…'
    try {
      const response = await fetch(apiBase + '/api/stkpush', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not start payment.')
      message.textContent = data.message + ' Keep this page open while we confirm payment.'
      const checkoutId = data.checkoutRequestId
      let attempts = 0
      const poll = async () => {
        if (attempts++ >= 24) { message.textContent = 'Payment is still pending. If you approved the prompt, contact support with your M-Pesa confirmation.'; submit.disabled = false; return }
        try {
          const check = await fetch(apiBase + '/api/payment/' + encodeURIComponent(checkoutId))
          const status = await check.json()
          if (status.status === 'PAID') {
            message.textContent = 'Payment confirmed! Your 24-hour membership is recorded until ' + new Date(status.activeUntil).toLocaleString() + '. The secure VIP portal is still being completed; contact support for access.'
            submit.disabled = false
            return
          }
          if (status.status === 'FAILED') {
            message.textContent = 'Payment was not completed. You can try again.'
            submit.disabled = false
            return
          }
        } catch {}
        setTimeout(poll, 5000)
      }
      setTimeout(poll, 5000)
    } catch (error) {
      message.textContent = error.message
      submit.disabled = false
    }
  })
}
