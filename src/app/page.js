'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// ── Supabase client ──────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const GOOGLE_SHEET_WEBHOOK = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK

// ── Static data ──────────────────────────────────────────────
const PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', price: '699', tag: 'Best Seller', tagColor: '#c8102e' },
  { id: 2, name: 'Premium Hoodie', price: '1,299', tag: 'New', tagColor: '#0a1f5d' },
  { id: 3, name: 'Slim Fit Polo', price: '849', tag: 'Popular', tagColor: '#00a86b' },
  { id: 4, name: 'Cargo Joggers', price: '999', tag: 'New', tagColor: '#0a0a0a' },
]
const STEPS = [
  { num: '01', color: '#c8102e', title: 'Choose Garment', desc: 'Pick from t-shirts, hoodies, polos, or joggers in your preferred color.' },
  { num: '02', color: '#0a1f5d', title: 'Upload Design', desc: 'Upload your artwork in PNG, JPG, or SVG. Minimum 300 DPI recommended.' },
  { num: '03', color: '#00a86b', title: 'Preview & Order', desc: 'Confirm your design placement, size, and place your order securely.' },
  { num: '04', color: '#0a0a0a', title: 'Delivered to You', desc: 'We print and deliver your custom piece within 5-7 working days across India.' },
]
const REVIEWS = [
  { name: 'Arjun R.', location: 'Chennai', color: '#c8102e', text: 'The print quality is outstanding. Ordered 10 jerseys for our college team and every piece was perfect.' },
  { name: 'Priya S.', location: 'Bangalore', color: '#0a1f5d', text: 'Upload was easy, delivery was fast, and the hoodie feels premium. Will definitely order again.' },
  { name: 'Karthik M.', location: 'Coimbatore', color: '#00a86b', text: 'Best custom print service in Tamil Nadu. Price is fair and quality is top level.' },
]
const GARMENTS = ['T-Shirt', 'Hoodie', 'Polo', 'Joggers']
const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const TABS = ['All', 'T-Shirts', 'Hoodies', 'Polos', 'Joggers']
const SWATCHES = ['#ffffff', '#0a0a0a', '#c8102e', '#0a1f5d', '#00a86b', '#f5a623', '#9b59b6', '#888888']
const NAV = ['Home', 'Products', 'Custom Print', 'About', 'Contact']

// ── SCREEN 1: Logo Splash ────────────────────────────────────
function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      minHeight: '100vh', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background circles */}
      {[600, 400, 200].map(size => (
        <div key={size} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: size, height: size,
          border: `1px solid rgba(0,0,0,${size === 200 ? 0.08 : size === 400 ? 0.05 : 0.03})`,
          borderRadius: '50%', pointerEvents: 'none',
        }} />
      ))}
      {/* Red + blue corner glows */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 15% 50%, rgba(200,16,46,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(10,31,93,0.06) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />

      <div className="drynn-splash-logo" style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Top accent */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
          <div style={{ width: 32, height: 3, background: '#c8102e' }} />
          <div style={{ width: 32, height: 3, background: '#0a1f5d' }} />
        </div>

        <div style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 'clamp(80px, 18vw, 150px)',
          letterSpacing: '0.2em',
          color: '#0a0a0a',
          lineHeight: 1,
        }}>DRYNN</div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10,
        }}>
          <div style={{ width: 24, height: 1.5, background: '#c8102e' }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#aaa' }}>
            Custom Print · Tamil Nadu
          </span>
          <div style={{ width: 24, height: 1.5, background: '#0a1f5d' }} />
        </div>

        {/* Animated dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 52 }}>
          {[{ bg: '#c8102e', delay: '0s' }, { bg: '#0a1f5d', delay: '0.2s' }, { bg: '#0a0a0a', delay: '0.4s' }].map((d, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%', background: d.bg,
              animation: `drynn-dot 1.3s ${d.delay} ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SCREEN 2: Intro + Google Login ───────────────────────────
function IntroScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err) {
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  const features = [
    { icon: '👕', label: 'Custom Print', desc: 'Any design on premium garments', color: 'rgba(200,16,46,0.08)' },
    { icon: '🚚', label: 'Fast Delivery', desc: '5–7 days across India, COD available', color: 'rgba(10,31,93,0.08)' },
    { icon: '💎', label: 'Quality Guaranteed', desc: 'Heat press, 100% print guarantee', color: 'rgba(200,16,46,0.08)' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top stripe */}
      <div style={{ height: 4, display: 'flex' }}>
        <div style={{ flex: 1, background: '#c8102e' }} />
        <div style={{ flex: 1, background: '#0a1f5d' }} />
        <div style={{ flex: 1, background: '#c8102e' }} />
      </div>

      {/* Bg glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at top right, rgba(200,16,46,0.04) 0%, transparent 45%), radial-gradient(ellipse at bottom left, rgba(10,31,93,0.04) 0%, transparent 45%)',
        pointerEvents: 'none',
      }} />

      {/* Nav */}
      <nav style={{ padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.15em', color: '#0a0a0a' }}>DRYNN</span>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8102e' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0a1f5d' }} />
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', zIndex: 1 }}>
        <div style={{ maxWidth: 980, width: '100%' }}>
          <div className="drynn-intro-layout" style={{ display: 'flex', gap: 72, alignItems: 'center' }}>

            {/* Left */}
            <div className="drynn-intro-left" style={{ flex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(200,16,46,0.07)', border: '1px solid rgba(200,16,46,0.18)',
                borderRadius: 100, padding: '5px 14px', marginBottom: 24,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8102e' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c8102e' }}>
                  Tamil Nadu's #1 Custom Print
                </span>
              </div>

              <h1 style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 'clamp(44px, 6.5vw, 76px)',
                lineHeight: 1.0, color: '#0a0a0a', letterSpacing: '0.02em', marginBottom: 20,
              }}>
                YOUR DESIGN.<br />
                <span style={{ color: '#c8102e' }}>YOUR STYLE.</span><br />
                YOUR DRYNN.
              </h1>

              <p style={{ fontSize: 15, lineHeight: 1.85, color: '#555', maxWidth: 400, marginBottom: 36 }}>
                Upload your artwork, pick your garment, and we'll deliver premium custom clothing straight to your door — anywhere in India.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, background: f.color, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, flexShrink: 0,
                    }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 1 }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Login Card */}
            <div className="drynn-login-card" style={{
              flexShrink: 0, width: 340,
              background: '#fff', border: '1px solid #ebebeb',
              boxShadow: '0 24px 80px rgba(0,0,0,0.09)', padding: 36,
              position: 'relative',
            }}>
              {/* Card top gradient bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, #c8102e 0%, #0a1f5d 100%)',
              }} />

              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  fontFamily: 'Bebas Neue, sans-serif', fontSize: 22,
                  letterSpacing: '0.12em', color: '#0a0a0a', marginBottom: 8,
                }}>GET STARTED</div>
                <p style={{ fontSize: 12, color: '#999', lineHeight: 1.65 }}>
                  Sign in to place orders, track deliveries, and manage your account.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
                <span style={{ fontSize: 9, color: '#ccc', fontWeight: 700, letterSpacing: '0.12em' }}>SIGN IN WITH</span>
                <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="drynn-google-btn"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '13px 16px',
                  background: loading ? '#f8f8f8' : '#fff',
                  border: '1.5px solid #e0e0e0',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#0a0a0a',
                  transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {loading ? (
                  <div style={{
                    width: 16, height: 16,
                    border: '2px solid #e0e0e0', borderTopColor: '#0a1f5d',
                    borderRadius: '50%', animation: 'drynn-spin 0.7s linear infinite',
                  }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>

              {error && (
                <div style={{
                  marginTop: 14, fontSize: 11, color: '#c8102e', textAlign: 'center',
                  background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.15)',
                  padding: '8px 12px',
                }}>{error}</div>
              )}

              <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
                By continuing you agree to DRYNN's Terms & Privacy Policy.
              </p>

              {/* Mini stats */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 28, paddingTop: 20, borderTop: '1px solid #f5f5f5',
              }}>
                {[['500+', 'Orders'], ['5–7d', 'Delivery'], ['100%', 'Quality']].map(([n, l]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: '0.04em', color: '#0a0a0a' }}>{n}</div>
                    <div style={{ fontSize: 8, color: '#bbb', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Privacy Policy Page ──────────────────────────────────────
function PrivacyPage({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a1f5d 0%, #1a0a2e 100%)', padding: '60px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(200,16,46,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <button onClick={onBack} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>← Back</button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '6px 16px', marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>Your Data, Your Rights</span>
        </div>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 10vw, 64px)', color: '#fff', letterSpacing: '0.04em', marginBottom: 16 }}>PRIVACY POLICY</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.7 }}>At DRYNN, protecting your personal information is our highest priority.</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Last updated: June 2025</p>
      </div>

      {/* Trust badges */}
      <div style={{ maxWidth: 600, margin: '-30px auto 0', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {[
          { title: 'Encrypted & Secure', desc: 'All data encrypted in transit and at rest.', color: '#0a1f5d', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
          { title: 'No Data Selling', desc: 'We never sell your personal information.', color: '#00a86b', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M1 1l22 22M10.5 10.677A2 2 0 0013.45 13M12 20.94c1.16-.81 4.48-3.3 6-6M17.94 17.94A10 10 0 012 12c0-2.12.66-4.09 1.79-5.71"/></svg> },
          { title: 'Full Control', desc: 'View, edit, or delete your data anytime.', color: '#c8102e', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map((b, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{b.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#0a0a0a', marginBottom: 2 }}>{b.title}</p>
              <p style={{ fontSize: 12, color: '#888' }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px 80px' }}>
        {[
          { num: '01', title: 'Information We Collect', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a1f5d" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>, content: 'When you use DRYNN, we collect: your name, email, and phone number during sign-up; delivery address and order details when you place an order; your uploaded design files; and device/browser info for security purposes.' },
          { num: '02', title: 'How We Use Your Data', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>, content: 'We use your information to process and deliver your orders, contact you via WhatsApp about your order status, improve our printing and delivery service, and send occasional updates about new products (you can opt out anytime).' },
          { num: '03', title: 'Data Sharing', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00a86b" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>, content: 'We do not sell your personal data. We share only what is necessary: delivery address with our courier partners, and payment info with our payment processors (Razorpay/UPI). All third parties are bound by confidentiality.' },
          { num: '04', title: 'Data Security', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a1f5d" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, content: 'Your data is stored securely via Supabase with encryption at rest and in transit. We follow industry-standard security practices and regularly review our systems.' },
          { num: '05', title: 'Your Rights', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, content: 'You can request access to your personal data, ask us to correct or delete it, or withdraw consent at any time. Contact us on WhatsApp or email to exercise these rights.' },
          { num: '06', title: 'Contact', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00a86b" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, content: 'For any privacy concerns, reach us at: WhatsApp +91 99447 61306, or through the contact form on our website. We respond within 48 hours.' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 36, paddingBottom: 36, borderBottom: i < 5 ? '1px solid #f0f0f0' : 'none' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, background: '#f0f4ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#c8102e', textTransform: 'uppercase', marginBottom: 4 }}>SECTION {s.num}</p>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Terms of Service Page ─────────────────────────────────────
function TermsPage({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0a1f5d 100%)', padding: '60px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(200,16,46,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <button onClick={onBack} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>← Back</button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '6px 16px', marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.1em' }}>Legal Agreement</span>
        </div>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 10vw, 64px)', color: '#fff', letterSpacing: '0.04em', marginBottom: 16 }}>TERMS OF SERVICE</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto 16px', lineHeight: 1.7 }}>Please review these terms carefully before using the DRYNN platform.</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Effective: June 2025</p>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 80px' }}>
        {[
          { num: '01', title: 'Acceptance of Terms', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a1f5d" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, content: 'By accessing or using DRYNN, you agree to be bound by these Terms of Service. DRYNN is operated from Tamil Nadu, India. These terms constitute a legally binding agreement between you ("User") and DRYNN ("we", "us").' },
          { num: '02', title: 'Orders & Payments', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>, content: 'All orders are subject to availability and confirmation. Prices are in Indian Rupees (INR). We accept UPI, Razorpay, and Cash on Delivery (COD). Orders are confirmed only after payment is received or COD is arranged.' },
          { num: '03', title: 'Custom Print Policy', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00a86b" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, content: 'You confirm that you own or have rights to any designs you upload. DRYNN is not responsible for copyright infringement by users. We reserve the right to reject orders with offensive, illegal, or copyrighted content.' },
          { num: '04', title: 'Delivery & Returns', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a1f5d" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, content: 'Standard delivery is 5–7 working days across India. We offer returns/replacements only for manufacturing defects or incorrect items delivered. Custom printed items cannot be returned due to change of mind.' },
          { num: '05', title: 'Intellectual Property', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/></svg>, content: 'The DRYNN brand, logo, website design, and all content are our intellectual property. You may not reproduce or distribute any part of our platform without written permission.' },
          { num: '06', title: 'Limitation of Liability', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00a86b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, content: 'DRYNN shall not be liable for any indirect or consequential damages. Our maximum liability is limited to the value of your order. We are not responsible for delays caused by courier partners or circumstances beyond our control.' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 36, paddingBottom: 36, borderBottom: i < 5 ? '1px solid #f0f0f0' : 'none' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, background: '#f0f4ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#0a1f5d', textTransform: 'uppercase', marginBottom: 4 }}>SECTION {s.num}</p>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SCREEN 3: Main DRYNN Site ────────────────────────────────
function MainSite({ user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePage, setActivePage] = useState('home') // 'home' | 'privacy' | 'terms'
  const [activeTab, setActiveTab] = useState('All')
  const [garment, setGarment] = useState('T-Shirt')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState('M')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || '', phone: '', qty: 1, address: '' })
  const [orderStatus, setOrderStatus] = useState('')

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) setUploadedFile(file.name)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address || !uploadedFile) {
      alert('Please fill name, phone, address and upload your design.')
      return
    }
    setOrderStatus('saving')

    const orderId = crypto.randomUUID()
    const placedAt = new Date().toISOString()

    try {
      // Save order to Supabase
      const { error: dbError } = await supabase
        .from('drynn_orders')
        .insert({
          id: orderId,
          user_id: user?.id || null,
          name: form.name,
          phone: form.phone,
          garment,
          color,
          size,
          qty: Number(form.qty),
          address: form.address,
          design_file: uploadedFile,
          placed_at: placedAt,
        })

      if (dbError) console.error('Order DB error:', dbError.message)

      // Save order to Google Sheets
      if (GOOGLE_SHEET_WEBHOOK) {
        fetch(GOOGLE_SHEET_WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheet: 'DRYNN_Orders',
            orderId, userId: user?.id || '',
            name: form.name, phone: form.phone,
            garment, color, size, qty: form.qty,
            address: form.address, placedAt,
          }),
        }).catch(e => console.error('Sheet error:', e))
      }

      setOrderStatus('done')
      setTimeout(() => setOrderStatus(''), 4000)
      setForm({ name: user?.user_metadata?.full_name || '', phone: '', qty: 1, address: '' })
      setUploadedFile(null)
    } catch (err) {
      console.error(err)
      setOrderStatus('')
      alert('Something went wrong. Please try again.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (activePage === 'privacy') return <PrivacyPage onBack={() => setActivePage('home')} />
  if (activePage === 'terms') return <TermsPage onBack={() => setActivePage('home')} />

  return (
    <div>
      {/* ── NAVBAR (desktop) ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: '0.15em', color: '#0a0a0a', textDecoration: 'none' }}>DRYNN</a>
          <div className="desktop-nav" style={{ display: 'flex', gap: 32 }}>
            {NAV.map(l => <a key={l} href="#" className="nav-link">{l}</a>)}
          </div>
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #f0f0f0' }} />
                )}
                <button onClick={handleLogout} style={{
                  background: 'none', border: '1px solid #e0e0e0', padding: '6px 12px',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', color: '#888', fontFamily: 'DM Sans, sans-serif',
                }}>Logout</button>
              </div>
            )}
            <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 10 }}>Order Now</button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: '#fff', borderTop: '1px solid #ebebeb',
        height: 64, alignItems: 'center', justifyContent: 'space-around',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
      }}>
        {[
          { label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
          { label: 'Products', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg> },
          { label: 'Order', special: true, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg> },
          { label: 'Studio', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
          { label: 'Account', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => { if (item.label === 'Account' && user) handleLogout() }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, background: item.special ? '#c8102e' : 'none',
              border: 'none', cursor: 'pointer',
              padding: item.special ? '12px 20px' : '8px 12px',
              borderRadius: item.special ? 50 : 8,
              transform: item.special ? 'translateY(-14px)' : 'none',
              boxShadow: item.special ? '0 4px 18px rgba(200,16,46,0.4)' : 'none',
              minWidth: 48,
            }}
          >
            {item.icon}
            {!item.special && (
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: '#bbb', textTransform: 'uppercase' }}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── HERO ── */}
      <section style={{ borderBottom: '1px solid #f0f0f0' }}>
        <div className="hero-grid" style={{ display: 'flex', maxWidth: 1200, margin: '0 auto' }}>
          <div className="hero-content" style={{ flex: 1, padding: '80px 48px 80px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="section-label">Custom Print Service — Tamil Nadu, India</span>
            <h1 className="section-title" style={{ marginBottom: 24 }}>YOUR DESIGN.<br />YOUR STYLE.<br />YOUR DRYNN.</h1>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#555', maxWidth: 420, marginBottom: 36 }}>
              Upload your design, choose your garment and color. We print and deliver premium quality custom clothing across India.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary">Start Custom Order</button>
              <button className="btn-outline">View Products</button>
            </div>

          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ background: '#0a0a0a', color: '#fff', padding: '13px 0', overflow: 'hidden' }}>
        <div className="marquee-track" style={{ display: 'flex', gap: 0, whiteSpace: 'nowrap' }}>
          {['FREE DELIVERY ABOVE RS.1500', 'PREMIUM HEAT PRESS PRINT', 'ALL COLORS AVAILABLE', '5-7 DAY DELIVERY', '100% QUALITY GUARANTEE', 'CUSTOM DESIGNS ACCEPTED', 'COD AVAILABLE'].map((t, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', padding: '0 28px', borderRight: '1px solid #333' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── PRODUCTS ── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span className="section-label">Our Collection</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
            <h2 className="section-title">PRODUCTS</h2>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0' }}>
              {TABS.map(t => (
                <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {PRODUCTS.map(p => (
              <div key={p.id} className="product-card">
                <div style={{ background: '#f9f9f9', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <div style={{ width: 100, height: 120, background: '#fff', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, background: p.tagColor, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px' }}>{p.tag}</div>
                </div>
                <div style={{ padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Rs. {p.price}</span>
                    <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 9 }}>Add to Cart</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOM ORDER FORM ── */}
      <section style={{ background: '#f9f9f9', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span className="section-label">Design Studio</span>
            <h2 className="section-title">CUSTOM PRINT ORDER</h2>
            <p style={{ fontSize: 15, color: '#555', marginTop: 14, maxWidth: 480, margin: '14px auto 0', lineHeight: 1.8 }}>
              Upload your design and we print it on your chosen garment and deliver to your door.
            </p>
          </div>
          <div className="custom-grid" style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, background: '#fff', padding: 32, border: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>Order Details</p>

              {orderStatus === 'done' && (
                <div style={{
                  background: 'rgba(0,168,107,0.08)', border: '1px solid rgba(0,168,107,0.25)',
                  padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#00a86b', fontWeight: 600,
                }}>
                  ✓ Order placed! We'll contact you on WhatsApp within 2 hours.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Full Name</label>
                  <input className="input-field" placeholder="Your full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Phone Number</label>
                  <input className="input-field" placeholder="+91 00000 00000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Garment Type</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GARMENTS.map(g => (
                      <button key={g} className={`garment-btn${garment === g ? ' selected' : ''}`} onClick={() => setGarment(g)}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Garment Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SWATCHES.map(c => (
                      <div key={c} className={`color-swatch${color === c ? ' selected' : ''}`} onClick={() => setColor(c)} style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #d0d0d0' : 'none' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Size</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {SIZES.map(s => (
                      <button key={s} className={`garment-btn${size === s ? ' selected' : ''}`} onClick={() => setSize(s)} style={{ padding: '8px 14px' }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Quantity</label>
                  <input className="input-field" type="number" min="1" placeholder="1" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} style={{ maxWidth: 120 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Upload Your Design</label>
                  <div className="upload-zone" onClick={() => document.getElementById('fileInput').click()}>
                    <input id="fileInput" type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display: 'none' }} onChange={handleFile} />
                    {uploadedFile ? (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#00a86b' }}>{uploadedFile}</p>
                        <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Click to upload design</p>
                        <p style={{ fontSize: 11, color: '#888' }}>PNG, JPG, SVG — Min 300 DPI recommended</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 8 }}>Delivery Address</label>
                  <textarea className="input-field" rows={3} placeholder="Full address with pincode" style={{ resize: 'vertical' }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: 16, fontSize: 12, marginTop: 4, opacity: orderStatus === 'saving' ? 0.6 : 1 }}
                  onClick={handleSubmit}
                  disabled={orderStatus === 'saving'}
                >
                  {orderStatus === 'saving' ? 'Placing Order...' : 'Place Custom Order'}
                </button>
                <p style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
                  Our team will contact you on WhatsApp within 2 hours to confirm pricing and delivery.
                </p>
              </div>
            </div>

        </div>
      </section>

      {/* ── 3D MOCKUP STUDIO ── */}
      <section style={{ background: '#0d1b3e', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(200,16,46,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 100, padding: '5px 16px', marginBottom: 20 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8102e' }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c8102e' }}>Design Studio</span>
            </div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 7vw, 64px)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1, marginBottom: 16 }}>
              CONVERT YOUR 2D DESIGNS TO 3D
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Pick a template, add your design, and preview photorealistic mockups before ordering.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { title: 'Regular T-Shirt Studio', url: 'https://www.virtualthreads.io/configerator-regular-t-shirt', svg: '👕' },
              { title: 'Fitted T-Shirt Studio', url: 'https://www.virtualthreads.io/configurator', svg: '👔' },
              { title: 'Hoodie Studio', url: 'https://www.virtualthreads.io/configerator-hoodie', svg: '🧥' },
              { title: 'Zip Hoodie Studio', url: 'https://www.virtualthreads.io/studio/sweatsl', svg: '🫱' },
              { title: 'Joggers Studio', url: 'https://www.virtualthreads.io/info/3d-joggers-mockup', svg: '👖' },
            ].map((studio, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Garment preview area */}
                <div style={{
                  height: 140,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                }}>
                  {studio.svg}
                </div>

                {/* Info */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{studio.title}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['6 CAMERA ANIMATIONS', '6 GARMENT ANIMATIONS', '4K EXPORT'].map(feat => (
                      <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => window.open(studio.url, '_blank')}
                  style={{
                    background: '#fff', color: '#0a1f5d',
                    border: 'none', borderRadius: 50,
                    padding: '12px 20px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', width: '100%',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >Open Studio →</button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Powered by VirtualThreads.io · Free to preview · No sign-up required
          </p>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="section-label">Customer Reviews</span>
            <h2 className="section-title">WHAT THEY SAY</h2>
          </div>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {REVIEWS.map((r, i) => (
              <div key={i} className="review-card">
                <div style={{ width: 36, height: 4, background: r.color, marginBottom: 20 }} />
                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#555', marginBottom: 20 }}>"{r.text}"</p>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</p>
                <p style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>{r.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0a0a0a', color: '#fff', padding: '60px 24px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.15em', marginBottom: 16 }}>DRYNN</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: '#666', maxWidth: 260 }}>Premium custom print clothing service based in Tamil Nadu. We bring your designs to life.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                {['#c8102e', '#0a1f5d', '#00a86b'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
              </div>
            </div>
            {[
              { title: 'Shop', links: ['T-Shirts', 'Hoodies', 'Polos', 'Joggers'] },
              { title: 'Support', links: ['Custom Order', 'Track Order', 'Returns', 'FAQ'] },
              { title: 'Company', links: ['About Us', 'Contact', 'Terms', 'Privacy'] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18, color: '#fff' }}>{col.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {col.links.map(l => <a key={l} href="#" className="footer-link" onClick={() => {
                  if (l === 'Privacy') setActivePage('privacy')
                  if (l === 'Terms') setActivePage('terms')
                }}>{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 11, color: '#444' }}>2024 DRYNN. All rights reserved. Tamil Nadu, India.</p>
            <p style={{ fontSize: 11, color: '#444' }}>UPI / Razorpay / COD Accepted</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── ROOT CONTROLLER ──────────────────────────────────────────
export default function Home() {
  // 'splash' | 'intro' | 'main'
  const [screen, setScreen] = useState('splash')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setScreen('main')
        // Save to Google Sheets in background (non-blocking)
        sendToGoogleSheet(session.user)
      }
      setChecking(false)
    })

    // Listen for auth state changes (after Google redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setScreen('main')
        // Save to Google Sheets in background (non-blocking)
        sendToGoogleSheet(session.user)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setScreen('intro')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Only sends to Google Sheets — no Supabase table write on login
  // Supabase Auth automatically records the user in Authentication → Users
  const sendToGoogleSheet = (u) => {
    if (!GOOGLE_SHEET_WEBHOOK) return
    fetch(GOOGLE_SHEET_WEBHOOK, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet: 'DRYNN_Users',
        userId: u.id,
        name: u.user_metadata?.full_name || '',
        email: u.email,
        registeredAt: new Date().toISOString(),
      }),
    }).catch(e => console.error('Google Sheet error:', e))
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: '0.15em', color: '#0a0a0a', animation: 'drynn-pulse 1.5s ease-in-out infinite' }}>DRYNN</div>
        <style>{`@keyframes drynn-pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes drynn-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1.25); }
        }
        @keyframes drynn-spin { to { transform: rotate(360deg); } }
        .drynn-splash-logo {
          animation: drynn-fadein 0.9s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        .drynn-intro-left {
          animation: drynn-fadein 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        .drynn-login-card {
          animation: drynn-fadein 0.7s 0.12s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        @keyframes drynn-fadein {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .drynn-google-btn:hover:not(:disabled) {
          border-color: #0a1f5d !important;
          box-shadow: 0 4px 16px rgba(10,31,93,0.12) !important;
        }
        @media (max-width: 768px) {
          .drynn-intro-layout { flex-direction: column !important; gap: 36px !important; }
          .drynn-login-card { width: 100% !important; }
          .desktop-nav { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
          body { padding-bottom: 64px; }
        }
      `}</style>

      {screen === 'splash' && <SplashScreen onDone={() => setScreen(s => s === 'main' ? 'main' : 'intro')} />}
      {screen === 'intro' && <IntroScreen onLogin={() => {}} />}
      {screen === 'main' && <MainSite user={user} />}
    </>
  )
}
