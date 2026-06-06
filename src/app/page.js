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

// ── SCREEN 3: Main DRYNN Site ────────────────────────────────
function MainSite({ user }) {
  const [menuOpen, setMenuOpen] = useState(false)
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

  return (
    <div>
      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: '0.15em', color: '#0a0a0a', textDecoration: 'none' }}>DRYNN</a>
          <div className="desktop-nav" style={{ display: 'flex', gap: 32 }}>
            {NAV.map(l => <a key={l} href="#" className="nav-link">{l}</a>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', flexDirection: 'column', gap: 5, padding: 4 }}
            >
              {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 22, height: 2, background: '#0a0a0a' }} />)}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, background: '#fff' }}>
            {NAV.map(l => <a key={l} href="#" className="nav-link" style={{ fontSize: 14 }} onClick={() => setMenuOpen(false)}>{l}</a>)}
          </div>
        )}
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
            <div className="stats-row" style={{ display: 'flex', gap: 40, marginTop: 48, paddingTop: 36, borderTop: '1px solid #f0f0f0' }}>
              {[['500+', 'Orders Delivered'], ['5-7', 'Days Delivery'], ['100%', 'Quality Guaranteed']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, letterSpacing: '0.04em' }}>{n}</div>
                  <div style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual" style={{ flex: 1, minHeight: 480, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 180, height: 220, background: '#fff', borderRadius: 4, margin: '0 auto', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 80, height: 90, background: '#f0f0f0', borderRadius: 2 }} />
                <div style={{ width: 100, height: 8, background: '#f0f0f0', borderRadius: 2 }} />
                <div style={{ width: 70, height: 8, background: '#f0f0f0', borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['#c8102e', '#0a1f5d', '#00a86b', '#0a0a0a'].map(c => (
                    <div key={c} style={{ width: 18, height: 18, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <p style={{ marginTop: 10, fontSize: 10, color: '#888', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>All Colors Available</p>
              </div>
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

            {/* HOW IT WORKS */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 32 }}>How It Works</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {STEPS.map((s, i) => (
                  <div key={s.num} style={{ display: 'flex', gap: 20, paddingBottom: i < STEPS.length - 1 ? 32 : 0, borderBottom: i < STEPS.length - 1 ? '1px solid #f0f0f0' : 'none', marginBottom: i < STEPS.length - 1 ? 32 : 0 }}>
                    <div className="step-number" style={{ color: s.color, minWidth: 56 }}>{s.num}</div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</h4>
                      <p style={{ fontSize: 13, color: '#666', lineHeight: 1.75 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 36, background: '#0a0a0a', color: '#fff', padding: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>Need Help?</p>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: '#999', marginBottom: 20 }}>Contact us on WhatsApp for pricing, bulk orders, or design guidance.</p>
                <button className="btn-white" style={{ fontSize: 10 }} onClick={() => window.open('https://wa.me/919944761306', '_blank')}>WhatsApp Us</button>
              </div>
            </div>
          </div>
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
      <footer style={{ background: '#0a0a0a', color: '#fff', padding: '60px 24px 28px' }}>
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
                  {col.links.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
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
        setScreen('splash')
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
        }
      `}</style>

      {screen === 'splash' && <SplashScreen onDone={() => setScreen('intro')} />}
      {screen === 'intro' && <IntroScreen onLogin={() => {}} />}
      {screen === 'main' && <MainSite user={user} />}
    </>
  )
}
