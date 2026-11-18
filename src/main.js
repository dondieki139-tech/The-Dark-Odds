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
<section class="section" id="games"><div class="section-head"><div><div class="eyebrow">01 — THE BOARD</div><h2>Three daily <em>bet slips</em></h2></div><span class="muted">VIP SELECTIONS</span></div><div class="notice"><b>Paid picks only:</b> Three separate slips are posted daily. Each slip has 3 games and costs KSh 360. Pay separately for each slip.</div><div class="match-grid" id="game-list"><article class="match-card"><p>Loading paid games…</p></article></div></section>
<section class="premium-section" id="premium"><div class="premium-copy"><div class="eyebrow">02 — MEMBERSHIP</div><h2>Unlock the<br><em>selection.</em></h2><p>Choose a specific bet slip and pay KSh 360 by M-Pesa. Each payment unlocks only that slip.</p><ul><li>One payment unlocks one 3-game slip</li><li>Three separate slips can be bought daily</li><li>Each slip costs KSh 360</li></ul></div><div class="price-card"><div class="card-top"><span>THE DARK ODDS / VIP</span><span class="lock">✦</span></div><div class="price">KSh 360<small> / 24 hours</small></div><p>KSh 360 per slip. Select a slip above and enter your M-Pesa number.</p><div class="divider"></div><h3>Pay with M-Pesa</h3><form id="stk-form" class="stk-form"><label for="mpesa-phone">M-Pesa phone number</label><input id="mpesa-phone" name="phone" type="tel" inputmode="tel" placeholder="07XXXXXXXX" autocomplete="tel" required><button class="button primary full" id="stk-submit" type="submit">Send payment prompt ↗</button><p id="stk-message" class="fine-print" role="status">Select a bet slip above first. Never enter your M-Pesa PIN on this website.</p></form><a class="text-link" href="https://wa.me/254746771677">Need help? Contact support ↗</a></div></section>
<section class="section how-section" id="how"><div class="section-head"><div><div class="eyebrow">03 — SIMPLE & CLEAR</div><h2>How it <em>works</em></h2></div></div><div class="steps"><div><b>01</b><h3>Choose</h3><p>Browse the published paid games.</p></div><div><b>02</b><h3>Subscribe</h3><p>Pay KSh 360 using M-Pesa.</p></div><div><b>03</b><h3>Verify</h3><p>Safaricom confirms the payment through Daraja.</p></div><div><b>04</b><h3>Unlock</h3><p>Member access follows successful verification.</p></div></div></section>
<section class="responsible"><span>18+ ONLY</span><p>Betting involves financial risk. There are no guaranteed wins. Only participate where legal, never stake money you cannot afford to lose, and take a break if betting stops being enjoyable.</p></section>
</main><footer><a class="brand" href="/"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a><span>© ${new Date().getFullYear()} THE DARK ODDS</span><a href="https://wa.me/254746771677">CONTACT SUPPORT ↗</a></footer>`

let selectedBetId = ''
async function loadGames() {
  const list = document.querySelector('#game-list')
  try {
    const response = await fetch(API + '/api/bets')
    if (!response.ok) throw new Error('Could not load upcoming bet slips.')
    const { bets = [] } = await response.json()
    list.innerHTML = bets.length ? bets.map((bet, i) => `<article class="match-card"><div class="card-top"><span>${esc(bet.title)}</span><span>BET 0${i+1}</span></div><div class="teams"><div><small>GAME 1</small><strong>${esc(bet.team1)}</strong></div><div class="versus">VS</div><div class="away"><small>GAME 2</small><strong>${esc(bet.team2)}</strong></div></div><div class="teams"><div><small>GAME 3</small><strong>${esc(bet.team3)}</strong></div><div class="versus">3</div><div class="away"><small>BET DATE</small><strong>${esc(bet.bet_date)}</strong></div></div><div class="pick"><span>GAME RESULTS</span><b class="result-status ${bet.result==='WON'?'result-won':bet.result==='LOST'?'result-lost':''}">${bet.result==='WON'?'BET WON — CONGRATULATIONS 🎉🎉':bet.result==='LOST'?'BET LOST':'BET OPEN'}</b><small>Game 1: ${esc(bet.status1||'PENDING')} · Game 2: ${esc(bet.status2||'PENDING')} · Game 3: ${esc(bet.status3||'PENDING')}</small></div><div class="pick"><span>YOUR PREDICTIONS & ANALYSIS</span><b class="locked-pick">🔒 HIDDEN UNTIL PURCHASE</b></div><p>See the teams and public results. Predictions and analysis unlock only after paying for this bet.</p><button class="button primary full" data-buy-bet="${esc(bet.id)}">Buy this bet — KSh 360 ↗</button><div class="fine-print" id="bet-access-${esc(bet.id)}"></div></article>`).join('') : '<div class="empty-board"><h3>No upcoming bets published yet</h3><p>Check back for today’s three separate bet slips.</p></div>'
    list.querySelectorAll('[data-buy-bet]').forEach(btn=>btn.addEventListener('click',()=>{selectedBetId=btn.dataset.buyBet;document.querySelector('#premium').scrollIntoView({behavior:'smooth'});document.querySelector('#stk-message').textContent='Selected bet slip. Enter your M-Pesa number to pay KSh 360.'}))
  } catch { list.innerHTML = '<div class="empty-board"><h3>Bet slips temporarily unavailable</h3><p>Please refresh in a moment or contact support.</p></div>' }
}
loadGames()

const stkForm = document.querySelector('#stk-form')
stkForm.addEventListener('submit', async event => {
  event.preventDefault()
  const phone = document.querySelector('#mpesa-phone').value.trim()
  const message = document.querySelector('#stk-message')
  if (!selectedBetId) { message.textContent = 'Please choose the specific bet slip you want to buy first.'; return }
  const submit = document.querySelector('#stk-submit')
  submit.disabled = true; message.textContent = 'Connecting to M-Pesa…'
  try {
    const response = await fetch(API + '/api/stkpush', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone, packageId:selectedBetId}) })
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
        if (status.status === 'PAID') { message.textContent = 'Payment confirmed. Unlocking your purchased bet slip…'; try { const reveal=await fetch(API+'/api/bets/'+encodeURIComponent(status.packageId)+'?phone='+encodeURIComponent(phone)); const result=await reveal.json(); if(reveal.ok){ const box=document.querySelector('#bet-access-'+CSS.escape(status.packageId)); if(box) box.innerHTML='<strong>YOUR PAID BET & ANALYSIS:</strong>'+(result.bet.result==='WON'?'<p class="result-banner">BET WON — CONGRATULATIONS 🎉🎉</p>':result.bet.result==='LOST'?'<p class="result-banner result-lost">BET LOST</p>':'')+result.bet.selections.map((p,i)=>'<div class="paid-game"><p>'+(i+1)+'. '+esc(p.team)+' — '+esc(p.selection)+' <b class="result-status '+(p.status==='WON'?'result-won':p.status==='LOST'?'result-lost':'')+'">'+esc(p.status)+'</b></p><p>'+esc(p.analysis||'No analysis added.')+'</p></div>').join('') } else { message.textContent='Payment confirmed. Your slip will unlock at its scheduled release time. '+(result.error||'') } } catch { message.textContent='Payment confirmed. Refresh this page to access your slip at its release time.' } submit.disabled = false; return }
        if (status.status === 'FAILED') { message.textContent = 'Payment was not completed. You can try again.'; submit.disabled = false; return }
      } catch {}
      setTimeout(poll, 5000)
    }
    setTimeout(poll, 5000)
  } catch (error) { message.textContent = error.message; submit.disabled = false }
})

}
