// ══════════════════════════════════════════════════════════════
// INTRO PAGE — mirrors HomePage layout with video hero (pre-login)
// Drop-in replacement for the existing IntroPage function.
// Props: { onGoToLogin }
// ══════════════════════════════════════════════════════════════

function IntroPage({ onGoToLogin }) {
  const [muted, setMuted] = React.useState(true)
  const videoRef = React.useRef(null)

  const toggleMute = () => {
    setMuted(m => {
      const next = !m
      if (videoRef.current) videoRef.current.muted = next
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top colour stripe ── */}
      <div style={{ height: 4, display: 'flex', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#c8102e' }} />
        <div style={{ flex: 1, background: '#0a1f5d' }} />
        <div style={{ flex: 1, background: '#c8102e' }} />
      </div>

      {/* ── Nav ── */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', background: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 28, letterSpacing: '.15em', color: '#0a0a0a' }}>DRYNN</span>
        <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 12 }} onClick={onGoToLogin}>Sign In →</button>
      </div>

      {/* ══ HERO — full-width background video, mirrors HomePage hero ══ */}
      <div style={{ position: 'relative', width: '100%', minHeight: 520, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Background video */}
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src="https://res.cloudinary.com/dfhdyp4oq/video/upload/v1780972479/video_20260609_080102_edit_n46bhf.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay — same feel as HomePage hero gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(10,31,93,.82) 0%,rgba(10,10,10,.60) 100%)', zIndex: 1, pointerEvents: 'none' }} />
        {/* Red radial accent, mirrors HomePage */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%,rgba(200,16,46,.22) 0%,transparent 55%)', zIndex: 1, pointerEvents: 'none' }} />

        {/* Mute / Unmute */}
        <button onClick={toggleMute} style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 3,
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
          backdropFilter: 'blur(8px)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          )}
        </button>

        {/* Hero copy — identical wording / layout to HomePage hero */}
        <div style={{ position: 'relative', zIndex: 2, padding: '56px 20px 52px', maxWidth: 1100, margin: '0 auto', width: '100%' }} className="fade-in">
          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,16,46,.18)', border: '1px solid rgba(200,16,46,.35)', borderRadius: 100, padding: '5px 14px', marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8102e' }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c8102e' }}>Tamil Nadu's #1 Custom Print</span>
          </div>
          <h1 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(36px,9vw,72px)', color: '#fff', letterSpacing: '.02em', lineHeight: 1.05, marginBottom: 16 }}>
            YOUR DESIGN.<br/>
            <span style={{ color: '#c8102e' }}>YOUR STYLE.</span> YOUR DRYNN.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.72)', maxWidth: 440, lineHeight: 1.85, marginBottom: 28 }}>
            Upload artwork, pick a garment, and we deliver premium custom clothing across India in 5–7 days.
          </p>
          <div className="hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ padding: '14px 28px', fontSize: 14 }} onClick={onGoToLogin}>
              Design Now
            </button>
            <button
              style={{ padding: '14px 28px', fontSize: 14, background: 'rgba(255,255,255,.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,.35)', borderRadius: 4, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
              onClick={onGoToLogin}
            >
              Shop Products
            </button>
          </div>
        </div>
      </div>

      {/* ══ FEATURE BAR — identical to HomePage feature bar ══ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div className="feature-bar" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '0 16px' }}>
          {[
            { label: 'Free Delivery',     sub: 'Above ₹1,500' },
            { label: 'Easy Returns',      sub: 'Manufacturing defects' },
            { label: 'Secure Pay',        sub: 'UPI · Razorpay · Secure' },
            { label: 'WhatsApp Support',  sub: '2-hour response' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 8px', borderRight: i < 3 ? '1px solid #f0f0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FEATURED PRODUCTS — same grid as HomePage, cards open login ══ */}
      <div style={{ padding: '32px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span className="sec-label">Our Collection</span>
              <h2 className="sec-title">FEATURED PRODUCTS</h2>
            </div>
            <button className="btn-secondary" style={{ padding: '9px 18px', fontSize: 12 }} onClick={onGoToLogin}>View All →</button>
          </div>
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {PRODUCTS.slice(0, 4).map(p => (
              <IntroProductCard key={p.id} p={p} onGoToLogin={onGoToLogin} />
            ))}
          </div>
        </div>
      </div>

      {/* ══ HOW IT WORKS — identical to HomePage steps section ══ */}
      <div style={{ background: '#f8f8f8', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span className="sec-label" style={{ textAlign: 'center', display: 'block' }}>Process</span>
          <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: 32 }}>HOW IT WORKS</h2>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '20px 20px', borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 40, color: s.color, lineHeight: 1, marginBottom: 8 }}>{s.num}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ REVIEWS — identical to HomePage reviews section ══ */}
      <div style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <span className="sec-label" style={{ textAlign: 'center', display: 'block' }}>Customer Reviews</span>
          <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: 32 }}>WHAT THEY SAY</h2>
          <div className="reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {REVIEWS.slice(0, 3).map((r, i) => (
              <div key={i} className="review-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{r.location}</div>
                  </div>
                  <StarRating rating={r.rating} />
                </div>
                <div style={{ width: 32, height: 3, background: r.color, marginBottom: 12, borderRadius: 2 }} />
                <p style={{ fontSize: 13, lineHeight: 1.75, color: '#555' }}>"{r.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CTA BANNER — mirrors HomePage CTA ══ */}
      <div style={{ background: 'linear-gradient(135deg,#c8102e,#0a1f5d)', padding: '56px 16px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(28px,6vw,52px)', color: '#fff', letterSpacing: '.03em', marginBottom: 10 }}>
          READY TO PRINT YOUR DESIGN?
        </h2>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, marginBottom: 24 }}>
          Free delivery above ₹1,500 · UPI & Razorpay · Delivered in 5–7 days
        </p>
        <button className="btn-primary" style={{ fontSize: 14, padding: '14px 32px', background: '#fff', color: '#c8102e' }} onClick={onGoToLogin}>
          Start Designing →
        </button>
      </div>

      {/* ══ FOOTER MINI ══ */}
      <div style={{ background: '#0a0a0a', color: '#555', padding: '20px', textAlign: 'center', fontSize: 11 }}>
        © 2025 DRYNN · Tamil Nadu, India · UPI / Razorpay Accepted
      </div>

    </div>
  )
}

// ── Intro product card (no cart — prompts sign-in instead) ─────
function IntroProductCard({ p, onGoToLogin }) {
  const pViews = [p.img_front || p.image_url, p.img_back].filter(Boolean)
  const [vi, setVi] = React.useState(0)

  return (
    <div
      className="product-card"
      onClick={onGoToLogin}
      onMouseEnter={() => { if (pViews.length > 1) setVi(1) }}
      onMouseLeave={() => setVi(0)}
    >
      <div style={{ background: '#f8f8f8', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {pViews[vi]
          ? <img src={pViews[vi]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'opacity .2s' }} />
          : (
            /* Placeholder garment icon */
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
            </svg>
          )
        }
        <div style={{ position: 'absolute', top: 10, left: 10, background: p.tagColor || '#c8102e', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2 }}>
          {p.tag}
        </div>
        {/* Lock overlay hint */}
        <div style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          ♡
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <StarRating rating={p.rating} />
          <span style={{ fontSize: 11, color: '#aaa' }}>({p.reviews})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>₹{Number(p.price).toLocaleString()}</span>
          <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>₹{Number(p.mrp).toLocaleString()}</span>
        </div>
        <div style={{ fontSize: 11, color: '#00a86b', fontWeight: 600, marginBottom: 10 }}>{disc(p.price, p.mrp)}% off</div>
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '9px', fontSize: 12 }}
          onClick={e => { e.stopPropagation(); onGoToLogin() }}
        >
          Sign in to Buy
        </button>
      </div>
    </div>
  )
}
