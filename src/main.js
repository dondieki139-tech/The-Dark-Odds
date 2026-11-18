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
      <div class="premium-copy"><div class="eyebrow">02 — MEMBERSHIP</div><h2>Go beyond<br><em>the ordinary.</em></h2><p>Get access to our premium analysis feed when membership is activated and verified by the team.</p><ul><li>Premium match analysis</li><li>Selection reasoning and risk notes</li><li>Daily access for 24 hours after approval</li></ul></div>
      <div class="price-card"><div class="card-top"><span>THE DARK ODDS / VIP</span><span class="lock">✦</span></div><div class="price">${price}<small> / 24 hours</small></div><p>One-time payment. Access starts after manual payment verification.</p><div class="divider"></div><h3>Pay with M-Pesa</h3><ol><li>Open M-Pesa on your phone.</li><li>Choose <b>Send Money</b>.</li><li>Send ${price.replace('KSh ','')} to <b>${paymentNumber}</b>.</li><li>Keep your M-Pesa confirmation message.</li></ol><a class="button primary full" href="https://wa.me/254746771677?text=Hello%20The%20Dark%20Odds%2C%20I%20have%20paid%20for%20VIP%20access.%20Please%20tell%20me%20how%20to%20submit%20my%20M-Pesa%20confirmation.">I have paid — contact support ↗</a><small class="fine-print">Payment is not automatically verified on this website. Do not share your M-Pesa PIN or one-time password. Membership is activated only after the team confirms receipt.</small></div>
    </section>
    <section class="section how-section" id="how"><div class="section-head"><div><div class="eyebrow">03 — SIMPLE & CLEAR</div><h2>How it <em>works</em></h2></div></div><div class="steps"><div><b>01</b><h3>Explore</h3><p>Read the public match previews and analysis.</p></div><div><b>02</b><h3>Subscribe</h3><p>Pay KSh 360 using the M-Pesa number above.</p></div><div><b>03</b><h3>Verify</h3><p>Send your confirmation to support for a manual check.</p></div><div><b>04</b><h3>Get access</h3><p>Once approved, your 24-hour VIP period begins.</p></div></div></section>
    <section class="responsible"><span>18+ ONLY</span><p>Betting involves financial risk. There are no guaranteed wins. Only participate where legal, never stake money you cannot afford to lose, and take a break if betting stops being enjoyable.</p></section>
  </main>
  <footer><a class="brand" href="#"><span class="brand-mark">D</span><span>THE DARK <b>ODDS</b></span></a><span>© ${new Date().getFullYear()} THE DARK ODDS</span><a href="https://wa.me/254746771677">CONTACT SUPPORT ↗</a></footer>
`
