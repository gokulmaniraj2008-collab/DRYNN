'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const GOOGLE_SHEET_WEBHOOK = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK

// ── Data ─────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', price: 699,  mrp: 999,  tag: 'Best Seller', tagColor: '#c8102e', category: 'T-Shirts',  emoji: '👕', rating: 4.5, reviews: 238 },
  { id: 2, name: 'Premium Hoodie',         price: 1299, mrp: 1799, tag: 'New',         tagColor: '#0a1f5d', category: 'Hoodies',   emoji: '🧥', rating: 4.7, reviews: 91  },
  { id: 3, name: 'Slim Fit Polo',          price: 849,  mrp: 1199, tag: 'Popular',     tagColor: '#00a86b', category: 'Polos',     emoji: '👔', rating: 4.3, reviews: 174 },
  { id: 4, name: 'Cargo Joggers',          price: 999,  mrp: 1399, tag: 'New',         tagColor: '#0a0a0a', category: 'Joggers',   emoji: '👖', rating: 4.4, reviews: 62  },
  { id: 5, name: 'Graphic Round Neck Tee', price: 599,  mrp: 849,  tag: 'Sale',        tagColor: '#c8102e', category: 'T-Shirts',  emoji: '👕', rating: 4.2, reviews: 312 },
  { id: 6, name: 'Zip-Up Hoodie',          price: 1499, mrp: 1999, tag: 'Trending',    tagColor: '#9b59b6', category: 'Hoodies',   emoji: '🧥', rating: 4.6, reviews: 55  },
  { id: 7, name: 'Classic Polo',           price: 749,  mrp: 999,  tag: 'Popular',     tagColor: '#00a86b', category: 'Polos',     emoji: '👔', rating: 4.1, reviews: 88  },
  { id: 8, name: 'Track Pants',            price: 899,  mrp: 1199, tag: 'New',         tagColor: '#0a0a0a', category: 'Joggers',   emoji: '👖', rating: 4.3, reviews: 43  },
]
const SWATCHES = ['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#00a86b','#f5a623','#9b59b6','#888888']
const SIZES = ['S','M','L','XL','XXL']
const GARMENTS = ['T-Shirt','Hoodie','Polo','Joggers']
const STEPS = [
  { num:'01', color:'#c8102e', title:'Choose Garment',   desc:'Pick from t-shirts, hoodies, polos, or joggers in your preferred color.' },
  { num:'02', color:'#0a1f5d', title:'Upload Design',    desc:'Upload your artwork in PNG, JPG, or SVG. Minimum 300 DPI recommended.' },
  { num:'03', color:'#00a86b', title:'Preview & Order',  desc:'Confirm your design placement, size, and place your order securely.' },
  { num:'04', color:'#0a0a0a', title:'Delivered to You', desc:'We print and deliver your custom piece within 5–7 working days across India.' },
]
const REVIEWS = [
  { name:'Arjun R.',   location:'Chennai',    color:'#c8102e', rating:5, text:'The print quality is outstanding. Ordered 10 jerseys for our college team and every piece was perfect.' },
  { name:'Priya S.',   location:'Bangalore',  color:'#0a1f5d', rating:5, text:'Upload was easy, delivery was fast, and the hoodie feels premium. Will definitely order again.' },
  { name:'Karthik M.', location:'Coimbatore', color:'#00a86b', rating:4, text:'Best custom print service in Tamil Nadu. Price is fair and quality is top level.' },
  { name:'Divya K.',   location:'Madurai',    color:'#9b59b6', rating:5, text:'Got my custom polo for a corporate event. Everyone loved it. Fast delivery too!' },
  { name:'Ravi T.',    location:'Trichy',     color:'#f5a623', rating:4, text:'Ordered joggers with our logo. Delivered in 5 days and the print is very clean and durable.' },
]
const FAQS = [
  { q:'How long does delivery take?',         a:'We deliver within 5–7 working days across India. Express delivery (2–3 days) is available for select pincodes.' },
  { q:'What file formats do you accept?',     a:'We accept PNG, JPG, JPEG, and SVG files. Minimum 300 DPI is recommended for best print quality.' },
  { q:'Do you offer Cash on Delivery?',       a:'Yes! We accept UPI, Razorpay, and Cash on Delivery (COD) for all orders across India.' },
  { q:'Can I return or exchange my order?',   a:'We offer replacements only for manufacturing defects or incorrect items. Custom printed items cannot be returned due to change of mind.' },
  { q:'What is the minimum order quantity?',  a:'We accept single piece orders. Bulk discounts apply for orders of 10+ pieces — contact us on WhatsApp for a custom quote.' },
  { q:'How do I track my order?',             a:'Once shipped, you will receive a WhatsApp message with your tracking link and courier details.' },
]

// ── Helpers ───────────────────────────────────────────────────
const StarRating = ({ rating }) => {
  const full = Math.floor(rating), half = rating % 1 >= 0.5
  return (
    <span style={{ color: '#f5a623', fontSize: 12, letterSpacing: 1 }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  )
}
const disc = (price, mrp) => Math.round((1 - price / mrp) * 100)

// ── Global CSS ────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-tap-highlight-color: transparent; }
  body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #0a0a0a; }
  input, textarea, button, select { font-family: inherit; }
  a { text-decoration: none; color: inherit; }
  img { max-width: 100%; display: block; }

  @keyframes drynn-dot   { 0%,100%{opacity:.2;transform:scale(.75)} 50%{opacity:1;transform:scale(1.25)} }
  @keyframes drynn-spin  { to{transform:rotate(360deg)} }
  @keyframes drynn-fade  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes drynn-pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
  @keyframes marquee     { from{transform:translateX(0)} to{transform:translateX(-50%)} }

  .fade-in   { animation: drynn-fade .6s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
  .fade-in-2 { animation: drynn-fade .6s .12s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }

  /* Buttons */
  .btn-primary {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    background:#c8102e; color:#fff; border:none; border-radius:4px;
    padding:12px 22px; font-size:13px; font-weight:700; letter-spacing:.04em;
    cursor:pointer; transition:background .15s, transform .1s; user-select:none;
  }
  .btn-primary:hover { background:#a80d25; }
  .btn-primary:active { transform:scale(.97); }
  .btn-secondary {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    background:#fff; color:#0a1f5d; border:2px solid #0a1f5d; border-radius:4px;
    padding:11px 22px; font-size:13px; font-weight:700; letter-spacing:.04em;
    cursor:pointer; transition:all .15s; user-select:none;
  }
  .btn-secondary:hover { background:#0a1f5d; color:#fff; }

  /* Cards */
  .product-card {
    background:#fff; border-radius:8px; overflow:hidden;
    border:1px solid #f0f0f0; transition:box-shadow .2s, transform .2s;
    cursor:pointer; position:relative;
  }
  .product-card:hover { box-shadow:0 8px 32px rgba(0,0,0,0.10); transform:translateY(-2px); }

  /* Inputs */
  .input-field {
    width:100%; border:1.5px solid #e8e8e8; border-radius:4px;
    padding:11px 14px; font-size:14px; outline:none; transition:border-color .15s;
    background:#fff;
  }
  .input-field:focus { border-color:#0a1f5d; }

  /* Bottom Nav */
  .bnav-item { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; cursor:pointer; padding:8px 4px; flex:1; transition:color .15s; }
  .bnav-item.active svg path, .bnav-item.active svg rect, .bnav-item.active svg circle { stroke:#c8102e !important; }
  .bnav-item.active span { color:#c8102e !important; }

  /* Section headings */
  .sec-label { font-size:10px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#c8102e; display:block; margin-bottom:8px; }
  .sec-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(28px,5vw,48px); letter-spacing:.03em; line-height:1.05; }

  /* Upload zone */
  .upload-zone {
    border:2px dashed #e0e0e0; border-radius:8px; padding:28px 16px;
    text-align:center; cursor:pointer; transition:border-color .15s;
    background:#fafafa;
  }
  .upload-zone:hover { border-color:#0a1f5d; }

  /* Swatch */
  .swatch { width:28px; height:28px; border-radius:50%; cursor:pointer; transition:box-shadow .15s; border:2px solid transparent; }
  .swatch.active { box-shadow:0 0 0 2px #fff, 0 0 0 4px #c8102e; }
  .swatch.white { border-color:#d0d0d0; }

  /* Size btn */
  .size-btn { padding:7px 14px; border:1.5px solid #e0e0e0; background:#fff; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; }
  .size-btn.active { border-color:#c8102e; background:#c8102e; color:#fff; }

  /* Tab */
  .tab-btn { padding:10px 18px; border:none; background:none; font-size:13px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; color:#888; transition:all .15s; white-space:nowrap; }
  .tab-btn.active { color:#c8102e; border-bottom-color:#c8102e; }

  /* Review card */
  .review-card { background:#fff; border:1px solid #f0f0f0; border-radius:8px; padding:24px; }

  /* FAQ */
  .faq-item { border-bottom:1px solid #f0f0f0; }
  .faq-q { width:100%; background:none; border:none; text-align:left; padding:18px 0; font-size:15px; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .faq-a { font-size:14px; color:#555; line-height:1.8; padding-bottom:18px; }

  /* Toast */
  .toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#0a0a0a; color:#fff; padding:12px 22px; border-radius:50px; font-size:13px; font-weight:600; z-index:9999; white-space:nowrap; box-shadow:0 4px 20px rgba(0,0,0,0.25); animation:drynn-fade .3s forwards; }

  /* Cart badge */
  .cart-badge { position:absolute; top:-6px; right:-6px; background:#c8102e; color:#fff; font-size:9px; font-weight:700; width:17px; height:17px; border-radius:50%; display:flex; align-items:center; justify-content:center; }

  /* Responsive */
  @media(max-width:768px){
    .hide-mobile { display:none !important; }
    .products-grid { grid-template-columns:repeat(2,1fr) !important; gap:12px !important; }
    .footer-cols { grid-template-columns:1fr 1fr !important; gap:28px !important; }
    .steps-grid { grid-template-columns:1fr 1fr !important; }
    .reviews-grid { grid-template-columns:1fr !important; }
    .hero-cta { flex-direction:column !important; }
    .intro-split { flex-direction:column !important; gap:32px !important; }
    .intro-login-card { width:100% !important; }
  }
  @media(min-width:769px){
    .hide-desktop { display:none !important; }
    .mobile-bottom-nav { display:none !important; }
  }
  @media(max-width:480px){
    .products-grid { grid-template-columns:repeat(2,1fr) !important; }
    .tab-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .tab-scroll::-webkit-scrollbar { display:none; }
  }
`

// ══════════════════════════════════════════════════════════════
// SPLASH
// ══════════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
      <div style={{ textAlign:'center' }} className="fade-in">
        <div style={{ display:'flex', justifyContent:'center', gap:4, marginBottom:16 }}>
          <div style={{ width:36, height:4, background:'#c8102e', borderRadius:2 }} />
          <div style={{ width:36, height:4, background:'#0a1f5d', borderRadius:2 }} />
        </div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(72px,20vw,140px)', letterSpacing:'.2em', color:'#0a0a0a', lineHeight:1 }}>DRYNN</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:8 }}>
          <div style={{ width:20, height:1.5, background:'#c8102e' }} />
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.28em', textTransform:'uppercase', color:'#aaa' }}>Custom Print · Tamil Nadu</span>
          <div style={{ width:20, height:1.5, background:'#0a1f5d' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:48 }}>
          {[['#c8102e','0s'],['#0a1f5d','.2s'],['#0a0a0a','.4s']].map(([bg,delay],i) => (
            <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:bg, animation:`drynn-dot 1.3s ${delay} ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// INTRO PAGE (brand info — no login)
// ══════════════════════════════════════════════════════════════
function IntroPage({ onGoToLogin }) {
  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column' }}>
      {/* Top stripe */}
      <div style={{ height:4, display:'flex' }}>
        <div style={{ flex:1, background:'#c8102e' }} /><div style={{ flex:1, background:'#0a1f5d' }} /><div style={{ flex:1, background:'#c8102e' }} />
      </div>
      {/* Nav */}
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #f5f5f5' }}>
        <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'.15em' }}>DRYNN</span>
        <button className="btn-primary" style={{ padding:'10px 20px', fontSize:12 }} onClick={onGoToLogin}>Sign In →</button>
      </div>
      {/* Hero */}
      <div style={{ padding:'48px 20px 32px', maxWidth:680, margin:'0 auto', width:'100%' }} className="fade-in">
        <span className="sec-label">Tamil Nadu's #1 Custom Print</span>
        <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(42px,10vw,80px)', letterSpacing:'.02em', lineHeight:1, marginBottom:16, color:'#0a0a0a' }}>
          YOUR DESIGN.<br/><span style={{ color:'#c8102e' }}>YOUR STYLE.</span><br/>YOUR DRYNN.
        </h1>
        <p style={{ fontSize:15, lineHeight:1.85, color:'#555', marginBottom:28, maxWidth:480 }}>
          Upload your artwork, pick your garment, and we deliver premium custom clothing straight to your door — anywhere in India.
        </p>
        <div className="hero-cta" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button className="btn-primary" style={{ fontSize:14, padding:'14px 28px' }} onClick={onGoToLogin}>Get Started Free</button>
          <button className="btn-secondary" style={{ fontSize:14, padding:'14px 28px' }} onClick={onGoToLogin}>View Products</button>
        </div>
      </div>
      {/* Feature strips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, padding:'0 20px 48px', maxWidth:900, margin:'0 auto', width:'100%' }}>
        {[
          { icon:'👕', label:'Custom Print',        desc:'Any design, any garment, any colour',    bg:'rgba(200,16,46,0.07)'  },
          { icon:'🚚', label:'Fast Delivery',        desc:'5–7 days across India, COD available',   bg:'rgba(10,31,93,0.07)'   },
          { icon:'💎', label:'Quality Guaranteed',   desc:'Heat press, wash-proof, 100% guarantee', bg:'rgba(0,168,107,0.07)'  },
          { icon:'💳', label:'Easy Payment',         desc:'UPI, Razorpay, COD — all accepted',       bg:'rgba(245,166,35,0.10)' },
        ].map((f,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, background:f.bg, borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:28, flexShrink:0 }}>{f.icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:11, color:'#888' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Steps */}
      <div style={{ background:'#f8f8f8', padding:'48px 20px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <span className="sec-label" style={{ textAlign:'center', display:'block' }}>How It Works</span>
          <h2 className="sec-title" style={{ textAlign:'center', marginBottom:36 }}>4 SIMPLE STEPS</h2>
          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
            {STEPS.map((s,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, padding:'24px 18px', borderTop:`3px solid ${s.color}`, textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:s.color, marginBottom:8 }}>{s.num}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* CTA Banner */}
      <div style={{ background:'#0a1f5d', padding:'48px 20px', textAlign:'center' }}>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(28px,6vw,52px)', color:'#fff', letterSpacing:'.03em', marginBottom:12 }}>READY TO CREATE YOUR CUSTOM GARMENT?</h2>
        <p style={{ color:'rgba(255,255,255,.65)', fontSize:15, marginBottom:24 }}>Sign in with Google — free, fast, and secure.</p>
        <button className="btn-primary" style={{ fontSize:14, padding:'14px 32px' }} onClick={onGoToLogin}>Start Now →</button>
      </div>
      {/* Footer mini */}
      <div style={{ background:'#0a0a0a', color:'#666', padding:'20px', textAlign:'center', fontSize:11 }}>
        © 2024 DRYNN · Tamil Nadu, India · UPI / Razorpay / COD Accepted
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE (separate from intro)
// ══════════════════════════════════════════════════════════════
function LoginPage({ onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (err) setError(err.message)
    } catch (e) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f8', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      {/* Top stripe */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:4, display:'flex', zIndex:10 }}>
        <div style={{ flex:1, background:'#c8102e' }} /><div style={{ flex:1, background:'#0a1f5d' }} /><div style={{ flex:1, background:'#c8102e' }} />
      </div>

      <div style={{ width:'100%', maxWidth:400 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:40, letterSpacing:'.18em', color:'#0a0a0a' }}>DRYNN</div>
          <div style={{ fontSize:11, color:'#aaa', letterSpacing:'.18em', textTransform:'uppercase' }}>Custom Print · Tamil Nadu</div>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 8px 40px rgba(0,0,0,0.10)', padding:'36px 28px', position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#c8102e,#0a1f5d)', borderRadius:'12px 12px 0 0' }} />
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4, textAlign:'center' }}>Welcome to DRYNN</h2>
          <p style={{ fontSize:13, color:'#888', textAlign:'center', marginBottom:28, lineHeight:1.6 }}>Sign in to place orders, track deliveries, and access your account.</p>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
              padding:'14px 16px', background: loading ? '#f8f8f8' : '#fff',
              border:'1.5px solid #e0e0e0', borderRadius:8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize:14, fontWeight:600, color:'#0a0a0a',
              transition:'all .2s', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.borderColor='#0a1f5d'; e.currentTarget.style.boxShadow='0 4px 16px rgba(10,31,93,.12)' }}}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='#e0e0e0'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.06)' }}
          >
            {loading ? (
              <div style={{ width:18, height:18, border:'2px solid #e0e0e0', borderTopColor:'#0a1f5d', borderRadius:'50%', animation:'drynn-spin .7s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && (
            <div style={{ marginTop:14, fontSize:12, color:'#c8102e', background:'rgba(200,16,46,.05)', border:'1px solid rgba(200,16,46,.2)', borderRadius:6, padding:'10px 14px', textAlign:'center' }}>
              {error}
            </div>
          )}

          <p style={{ fontSize:10, color:'#bbb', textAlign:'center', marginTop:20, lineHeight:1.6 }}>
            By continuing you agree to DRYNN's Terms &amp; Privacy Policy.
          </p>

          {/* Trust stats */}
          <div style={{ display:'flex', justifyContent:'space-around', marginTop:24, paddingTop:20, borderTop:'1px solid #f5f5f5' }}>
            {[['500+','Orders'],['5–7d','Delivery'],['100%','Quality']].map(([n,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:'.04em' }}>{n}</div>
                <div style={{ fontSize:9, color:'#bbb', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onBack} style={{ display:'block', margin:'20px auto 0', background:'none', border:'none', color:'#888', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>
          ← Back to home
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CANVAS MOCKUP STUDIO
// ══════════════════════════════════════════════════════════════
function MockupStudio() {
  const canvasRef   = useRef(null)
  const [type, setType]           = useState('tshirt')
  const [gColor, setGColor]       = useState('#ffffff')
  const [img, setImg]             = useState(null)
  const [pos, setPos]             = useState({ x:145, y:130, w:110, h:110 })
  const [dragging, setDragging]   = useState(false)
  const [ds, setDs]               = useState({ mx:0, my:0, ox:0, oy:0 })
  const [resizing, setResizing]   = useState(false)
  const [rs, setRs]               = useState({ mx:0, my:0, ow:0, oh:0 })

  const TYPES = [{ key:'tshirt',label:'T-Shirt' },{ key:'hoodie',label:'Hoodie' },{ key:'polo',label:'Polo' },{ key:'joggers',label:'Joggers' }]

  const drawPath = useCallback((ctx, t) => {
    ctx.beginPath()
    if (t === 'tshirt') {
      ctx.moveTo(115,80); ctx.lineTo(60,50); ctx.lineTo(10,120); ctx.lineTo(75,142)
      ctx.lineTo(75,400); ctx.lineTo(325,400); ctx.lineTo(325,142); ctx.lineTo(390,120)
      ctx.lineTo(340,50); ctx.lineTo(285,80)
      ctx.quadraticCurveTo(250,105,200,108); ctx.quadraticCurveTo(150,105,115,80)
      ctx.closePath()
    } else if (t === 'hoodie') {
      ctx.moveTo(115,90); ctx.lineTo(70,55); ctx.lineTo(10,125); ctx.lineTo(75,148)
      ctx.lineTo(75,415); ctx.lineTo(325,415); ctx.lineTo(325,148); ctx.lineTo(390,125)
      ctx.lineTo(330,55); ctx.lineTo(285,90)
      ctx.quadraticCurveTo(260,40,200,36); ctx.quadraticCurveTo(140,40,115,90)
      ctx.closePath()
    } else if (t === 'polo') {
      ctx.moveTo(118,85); ctx.lineTo(65,55); ctx.lineTo(15,125); ctx.lineTo(78,145)
      ctx.lineTo(78,400); ctx.lineTo(322,400); ctx.lineTo(322,145); ctx.lineTo(385,125)
      ctx.lineTo(335,55); ctx.lineTo(282,85)
      ctx.quadraticCurveTo(255,70,220,68); ctx.lineTo(220,115)
      ctx.lineTo(200,125); ctx.lineTo(180,115); ctx.lineTo(180,68)
      ctx.quadraticCurveTo(145,70,118,85); ctx.closePath()
    } else {
      ctx.moveTo(80,60); ctx.lineTo(80,110); ctx.lineTo(320,110); ctx.lineTo(320,60); ctx.closePath()
      ctx.moveTo(80,110); ctx.lineTo(75,440); ctx.lineTo(185,440)
      ctx.lineTo(200,240); ctx.lineTo(215,440); ctx.lineTo(325,440)
      ctx.lineTo(320,110); ctx.closePath()
    }
  }, [])

  const render = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.clearRect(0,0,400,480)
    ctx.fillStyle='#1a2744'; ctx.fillRect(0,0,400,480)
    drawPath(ctx, type)
    ctx.fillStyle = gColor; ctx.fill()
    ctx.strokeStyle = gColor==='#ffffff'?'#c8c8c8':'rgba(0,0,0,.15)'; ctx.lineWidth=1.5; ctx.stroke()
    if (img) {
      ctx.save(); drawPath(ctx,type); ctx.clip()
      ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h)
      ctx.restore()
      ctx.strokeStyle='#c8102e'; ctx.lineWidth=1.5; ctx.setLineDash([4,3])
      ctx.strokeRect(pos.x,pos.y,pos.w,pos.h); ctx.setLineDash([])
      [[pos.x,pos.y],[pos.x+pos.w,pos.y],[pos.x,pos.y+pos.h],[pos.x+pos.w,pos.y+pos.h]].forEach(([cx,cy])=>{
        ctx.fillStyle='#fff'; ctx.strokeStyle='#c8102e'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill(); ctx.stroke()
      })
      ctx.fillStyle='#c8102e'; ctx.beginPath(); ctx.arc(pos.x+pos.w,pos.y+pos.h,7,0,Math.PI*2); ctx.fill()
    } else {
      ctx.font='13px DM Sans,sans-serif'; ctx.fillStyle='rgba(255,255,255,.3)'; ctx.textAlign='center'
      ctx.fillText('Upload your design below',200,462)
    }
  }, [type, gColor, img, pos, drawPath])

  useEffect(() => { render() }, [render])

  const getXY = (e) => {
    const cv=canvasRef.current, r=cv.getBoundingClientRect()
    const sx=cv.width/r.width, sy=cv.height/r.height
    const src=e.touches?e.touches[0]:e
    return { x:(src.clientX-r.left)*sx, y:(src.clientY-r.top)*sy }
  }
  const onDown = (e) => {
    if (!img) return; const {x,y}=getXY(e)
    const rx=pos.x+pos.w, ry=pos.y+pos.h
    if (Math.hypot(x-rx,y-ry)<12) { setResizing(true); setRs({mx:x,my:y,ow:pos.w,oh:pos.h}) }
    else if (x>=pos.x&&x<=rx&&y>=pos.y&&y<=ry) { setDragging(true); setDs({mx:x,my:y,ox:pos.x,oy:pos.y}) }
  }
  const onMove = (e) => {
    if (!dragging&&!resizing) return; const {x,y}=getXY(e)
    if (dragging) setPos(p=>({...p, x:ds.ox+(x-ds.mx), y:ds.oy+(y-ds.my)}))
    else setPos(p=>({...p, w:Math.max(40,rs.ow+(x-rs.mx)), h:Math.max(40,rs.oh+(y-rs.my))}))
  }
  const onUp = () => { setDragging(false); setResizing(false) }

  const onUpload = (e) => {
    const f=e.target.files[0]; if(!f) return
    const u=URL.createObjectURL(f), i=new Image()
    i.onload = () => { setImg(i); setPos({x:145,y:130,w:110,h:110}) }
    i.src=u
  }

  const download = () => {
    const cv=document.createElement('canvas'); cv.width=400; cv.height=480
    const ctx=cv.getContext('2d')
    ctx.fillStyle='#1a2744'; ctx.fillRect(0,0,400,480)
    drawPath(ctx,type); ctx.fillStyle=gColor; ctx.fill()
    ctx.strokeStyle=gColor==='#ffffff'?'#c8c8c8':'rgba(0,0,0,.15)'; ctx.lineWidth=1.5; ctx.stroke()
    if (img) { ctx.save(); drawPath(ctx,type); ctx.clip(); ctx.drawImage(img,pos.x,pos.y,pos.w,pos.h); ctx.restore() }
    const a=document.createElement('a'); a.download='drynn-mockup.png'; a.href=cv.toDataURL(); a.click()
  }

  return (
    <div style={{ background:'#0d1b3e', padding:'64px 16px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'20%', left:'8%', width:240, height:240, background:'radial-gradient(circle,rgba(200,16,46,.12) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'8%', width:320, height:320, background:'radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ maxWidth:900, margin:'0 auto', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="sec-label" style={{ color:'#c8102e' }}>Design Studio</span>
          <h2 className="sec-title" style={{ color:'#fff' }}>PREVIEW YOUR MOCKUP</h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', marginTop:8, maxWidth:440, margin:'8px auto 0', lineHeight:1.7 }}>Upload design · pick garment · drag to position · download. 100% in your browser.</p>
        </div>
        <div style={{ display:'flex', gap:28, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>
          <canvas ref={canvasRef} width={400} height={480}
            style={{ borderRadius:14, display:'block', cursor:img?(dragging||resizing?'grabbing':'grab'):'default', maxWidth:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.5)', touchAction:'none' }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          />
          <div style={{ flex:'1 1 260px', maxWidth:300, display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.5)', marginBottom:10 }}>Garment</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {TYPES.map(t => (
                  <button key={t.key} onClick={()=>setType(t.key)}
                    style={{ padding:'8px 16px', borderRadius:50, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', background:type===t.key?'#c8102e':'rgba(255,255,255,.08)', color:'#fff', border:type===t.key?'1px solid #c8102e':'1px solid rgba(255,255,255,.15)', fontFamily:'DM Sans,sans-serif' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.5)', marginBottom:10 }}>Colour</p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {SWATCHES.map(c => (
                  <div key={c} onClick={()=>setGColor(c)}
                    style={{ width:32, height:32, borderRadius:'50%', background:c, cursor:'pointer', border:c==='#ffffff'?'2px solid rgba(255,255,255,.4)':'2px solid transparent', boxShadow:gColor===c?`0 0 0 3px #0d1b3e, 0 0 0 5px #c8102e`:'none', transition:'box-shadow .15s' }} />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.5)', marginBottom:10 }}>Design</p>
              <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px 16px', border:'1.5px dashed rgba(255,255,255,.2)', borderRadius:10, cursor:'pointer', background:'rgba(255,255,255,.04)' }}>
                <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display:'none' }} onChange={onUpload} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', textAlign:'center' }}>{img?'✓ Loaded — click to change':'Click to upload PNG/JPG/SVG'}</span>
              </label>
            </div>
            {img && <div style={{ background:'rgba(200,16,46,.1)', border:'1px solid rgba(200,16,46,.25)', borderRadius:8, padding:'10px 14px', fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.7 }}><strong style={{ color:'#fff' }}>Drag</strong> to move · <strong style={{ color:'#fff' }}>Red dot</strong> to resize</div>}
            <button onClick={download} className="btn-primary" style={{ width:'100%', padding:14, fontSize:13 }}>↓ Download Mockup</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ══════════════════════════════════════════════════════════════

function HomePage({ user, onNav, cart, onAddToCart }) {
  return (
    <div>
      {/* Hero Banner */}
      <div style={{ background:'linear-gradient(135deg,#0a1f5d 0%,#1a0a2e 100%)', padding:'48px 16px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 50%,rgba(200,16,46,.18) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,16,46,.18)', border:'1px solid rgba(200,16,46,.35)', borderRadius:100, padding:'5px 14px', marginBottom:16 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#c8102e' }} />
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.22em', textTransform:'uppercase', color:'#c8102e' }}>Tamil Nadu's #1 Custom Print</span>
          </div>
          <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(38px,8vw,70px)', color:'#fff', letterSpacing:'.02em', lineHeight:1.05, marginBottom:14 }}>
            YOUR DESIGN.<br/><span style={{ color:'#c8102e' }}>YOUR STYLE.</span> YOUR DRYNN.
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.65)', maxWidth:440, lineHeight:1.8, marginBottom:24 }}>
            Upload artwork, pick a garment, and we deliver premium custom clothing across India in 5–7 days.
          </p>
          <div className="hero-cta" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button className="btn-primary" style={{ padding:'13px 26px', fontSize:14 }} onClick={()=>onNav('studio')}>Design Now</button>
            <button onClick={()=>onNav('products')} style={{ padding:'13px 26px', fontSize:14, background:'rgba(255,255,255,.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,.3)', borderRadius:4, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>Shop Products</button>
          </div>
        </div>
      </div>

      {/* Feature bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'0 16px' }}>
          {[
            { icon:'🚚', label:'Free Delivery', sub:'Above ₹1,500' },
            { icon:'↩️', label:'Easy Returns',  sub:'Manufacturing defects' },
            { icon:'🔒', label:'Secure Pay',    sub:'UPI · Razorpay · COD' },
            { icon:'💬', label:'WhatsApp Support', sub:'2-hour response' },
          ].map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 8px', borderRight:i<3?'1px solid #f0f0f0':'none' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700 }}>{f.label}</div>
                <div style={{ fontSize:10, color:'#aaa' }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div style={{ padding:'40px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div><span className="sec-label">Our Collection</span><h2 className="sec-title">FEATURED PRODUCTS</h2></div>
            <button className="btn-secondary" style={{ padding:'9px 18px', fontSize:12 }} onClick={()=>onNav('products')}>View All →</button>
          </div>
          <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {PRODUCTS.slice(0,4).map(p => (
              <div key={p.id} className="product-card" onClick={()=>onNav('products')}>
                <div style={{ background:'#f8f8f8', height:200, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, position:'relative' }}>
                  {p.emoji}
                  <div style={{ position:'absolute', top:10, left:10, background:p.tagColor, color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2 }}>{p.tag}</div>
                  <div style={{ position:'absolute', top:10, right:10, background:'#e8f5e9', color:'#00a86b', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:2 }}>{disc(p.price,p.mrp)}% off</div>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <StarRating rating={p.rating} />
                    <span style={{ fontSize:11, color:'#aaa' }}>({p.reviews})</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:16, fontWeight:700 }}>₹{p.price.toLocaleString()}</span>
                    <span style={{ fontSize:12, color:'#aaa', textDecoration:'line-through' }}>₹{p.mrp.toLocaleString()}</span>
                  </div>
                  <button className="btn-primary" style={{ width:'100%', padding:'9px', fontSize:12 }}
                    onClick={e=>{ e.stopPropagation(); onAddToCart(p) }}>Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ background:'#f8f8f8', padding:'48px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ textAlign:'center', display:'block' }}>Process</span>
          <h2 className="sec-title" style={{ textAlign:'center', marginBottom:32 }}>HOW IT WORKS</h2>
          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {STEPS.map((s,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, padding:'24px 16px', borderTop:`3px solid ${s.color}`, textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:40, color:s.color, lineHeight:1, marginBottom:8 }}>{s.num}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div style={{ padding:'48px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ textAlign:'center', display:'block' }}>Customer Reviews</span>
          <h2 className="sec-title" style={{ textAlign:'center', marginBottom:32 }}>WHAT THEY SAY</h2>
          <div className="reviews-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {REVIEWS.slice(0,3).map((r,i) => (
              <div key={i} className="review-card">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:r.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16, flexShrink:0 }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{r.name}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{r.location}</div>
                  </div>
                  <StarRating rating={r.rating} />
                </div>
                <div style={{ width:32, height:3, background:r.color, marginBottom:12, borderRadius:2 }} />
                <p style={{ fontSize:13, lineHeight:1.75, color:'#555' }}>"{r.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div style={{ background:'linear-gradient(135deg,#c8102e,#0a1f5d)', padding:'56px 16px', textAlign:'center' }}>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(28px,6vw,52px)', color:'#fff', letterSpacing:'.03em', marginBottom:10 }}>READY TO PRINT YOUR DESIGN?</h2>
        <p style={{ color:'rgba(255,255,255,.7)', fontSize:14, marginBottom:24 }}>Free delivery above ₹1,500 · COD available · Delivered in 5–7 days</p>
        <button className="btn-primary" style={{ fontSize:14, padding:'14px 32px', background:'#fff', color:'#c8102e' }} onClick={()=>onNav('studio')}>Start Designing →</button>
      </div>
    </div>
  )
}

function ProductsPage({ onAddToCart }) {
  const [activeTab, setActiveTab] = useState('All')
  const [sort, setSort]           = useState('popular')
  const [wishlist, setWishlist]   = useState([])
  const categories = ['All','T-Shirts','Hoodies','Polos','Joggers']
  const filtered = PRODUCTS.filter(p => activeTab === 'All' || p.category === activeTab)
  const sorted = [...filtered].sort((a,b) => sort==='price-asc'?a.price-b.price : sort==='price-desc'?b.price-a.price : b.reviews-a.reviews)

  return (
    <div style={{ padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'32px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Our Collection</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>ALL PRODUCTS</h1>
        </div>
      </div>
      {/* Tabs + sort */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:10 }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', flexWrap:'wrap', gap:8 }}>
          <div className="tab-scroll" style={{ display:'flex' }}>
            {categories.map(t => <button key={t} className={`tab-btn${activeTab===t?' active':''}`} onClick={()=>setActiveTab(t)}>{t}</button>)}
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{ border:'1px solid #e0e0e0', borderRadius:6, padding:'8px 12px', fontSize:12, fontFamily:'DM Sans,sans-serif', cursor:'pointer', outline:'none' }}>
            <option value="popular">Most Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>
      {/* Grid */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>
        <p style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>{sorted.length} product{sorted.length!==1?'s':''}</p>
        <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {sorted.map(p => (
            <div key={p.id} className="product-card">
              <div style={{ background:'#f8f8f8', height:200, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, position:'relative' }}>
                {p.emoji}
                <div style={{ position:'absolute', top:10, left:10, background:p.tagColor, color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2 }}>{p.tag}</div>
                <button onClick={e=>{ e.stopPropagation(); setWishlist(w=>w.includes(p.id)?w.filter(x=>x!==p.id):[...w,p.id]) }}
                  style={{ position:'absolute', top:8, right:8, background:'#fff', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
                  {wishlist.includes(p.id)?'❤️':'🤍'}
                </button>
              </div>
              <div style={{ padding:'12px 14px' }}>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{p.name}</p>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <StarRating rating={p.rating} />
                  <span style={{ fontSize:11, color:'#aaa' }}>({p.reviews})</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:16, fontWeight:700 }}>₹{p.price.toLocaleString()}</span>
                  <span style={{ fontSize:12, color:'#aaa', textDecoration:'line-through' }}>₹{p.mrp.toLocaleString()}</span>
                </div>
                <div style={{ fontSize:11, color:'#00a86b', fontWeight:600, marginBottom:10 }}>{disc(p.price,p.mrp)}% off</div>
                <button className="btn-primary" style={{ width:'100%', padding:'9px', fontSize:12 }} onClick={()=>onAddToCart(p)}>Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StudioPage({ user }) {
  const [garment, setGarment]     = useState('T-Shirt')
  const [color, setColor]         = useState('#ffffff')
  const [size, setSize]           = useState('M')
  const [uploadedFile, setFile]   = useState(null)
  const [form, setForm]           = useState({ name: user?.user_metadata?.full_name||'', phone:'', qty:1, address:'' })
  const [status, setStatus]       = useState('')

  const handleFile = e => { const f=e.target.files[0]; if(f) setFile(f.name) }

  const handleSubmit = async () => {
    if (!form.name||!form.phone||!form.address||!uploadedFile) { alert('Please fill all fields and upload your design.'); return }
    setStatus('saving')
    const orderId=crypto.randomUUID(), placedAt=new Date().toISOString()
    try {
      const { error:dbErr } = await supabase.from('drynn_orders').insert({ id:orderId, user_id:user?.id||null, name:form.name, phone:form.phone, garment, color, size, qty:Number(form.qty), address:form.address, design_file:uploadedFile, placed_at:placedAt })
      if (dbErr) console.error(dbErr.message)
      if (GOOGLE_SHEET_WEBHOOK) fetch(GOOGLE_SHEET_WEBHOOK,{ method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sheet:'DRYNN_Orders', orderId, userId:user?.id||'', name:form.name, phone:form.phone, garment, color, size, qty:form.qty, address:form.address, placedAt }) }).catch(console.error)
      setStatus('done')
      setTimeout(()=>setStatus(''),5000)
      setForm({ name:user?.user_metadata?.full_name||'', phone:'', qty:1, address:'' }); setFile(null)
    } catch(e) { console.error(e); setStatus(''); alert('Something went wrong. Please try again.') }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'32px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Design Studio</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>CUSTOM PRINT ORDER</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.6)', marginTop:6 }}>Upload your design and we print it on your chosen garment.</p>
        </div>
      </div>

      {/* Order form */}
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 16px' }}>
        {status==='done' && (
          <div style={{ background:'rgba(0,168,107,.08)', border:'1px solid rgba(0,168,107,.25)', borderRadius:8, padding:'14px 18px', marginBottom:24, fontSize:13, color:'#00a86b', fontWeight:600 }}>
            ✓ Order placed! We'll contact you on WhatsApp within 2 hours.
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Name */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Full Name</label>
            <input className="input-field" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          {/* Phone */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Phone / WhatsApp</label>
            <input className="input-field" placeholder="+91 00000 00000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
          {/* Garment */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Garment Type</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {GARMENTS.map(g=><button key={g} className={`size-btn${garment===g?' active':''}`} onClick={()=>setGarment(g)}>{g}</button>)}
            </div></div>
          {/* Colour */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Garment Colour</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {SWATCHES.map(c=><div key={c} className={`swatch${c==color?' active':''}${c==='#ffffff'?' white':''}`} onClick={()=>setColor(c)} style={{ background:c }} />)}
            </div></div>
          {/* Size */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Size</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {SIZES.map(s=><button key={s} className={`size-btn${size===s?' active':''}`} onClick={()=>setSize(s)}>{s}</button>)}
            </div></div>
          {/* Qty */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Quantity</label>
            <input className="input-field" type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} style={{ maxWidth:120 }} /></div>
          {/* Upload */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Upload Your Design</label>
            <div className="upload-zone" onClick={()=>document.getElementById('studioFile').click()}>
              <input id="studioFile" type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display:'none' }} onChange={handleFile} />
              {uploadedFile
                ? <div><p style={{ fontSize:13, fontWeight:600, color:'#00a86b' }}>{uploadedFile}</p><p style={{ fontSize:11, color:'#888', marginTop:4 }}>Click to change</p></div>
                : <div><p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Click to upload design</p><p style={{ fontSize:11, color:'#888' }}>PNG, JPG, SVG — Min 300 DPI recommended</p></div>}
            </div></div>
          {/* Address */}
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Delivery Address</label>
            <textarea className="input-field" rows={3} placeholder="Full address with pincode" style={{ resize:'vertical' }} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          <button className="btn-primary" style={{ width:'100%', padding:15, fontSize:13, opacity:status==='saving'?.6:1 }} onClick={handleSubmit} disabled={status==='saving'}>
            {status==='saving'?'Placing Order…':'Place Custom Order'}
          </button>
          <p style={{ fontSize:12, color:'#aaa', textAlign:'center', lineHeight:1.6 }}>Our team will contact you on WhatsApp within 2 hours to confirm pricing and delivery.</p>
        </div>
      </div>

      {/* Canvas mockup tool */}
      <MockupStudio />
    </div>
  )
}

function AboutPage() {
  const [openFaq, setOpenFaq] = useState(null)
  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'48px 16px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 60%,rgba(200,16,46,.15) 0%,transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Our Story</span>
          <h1 className="sec-title" style={{ color:'#fff', marginBottom:12 }}>ABOUT DRYNN</h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.65)', maxWidth:480, margin:'0 auto', lineHeight:1.8 }}>Premium custom print clothing from the heart of Tamil Nadu.</p>
        </div>
      </div>

      {/* Story */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'48px 16px' }}>
        <div style={{ display:'grid', gap:32 }}>
          {[
            { title:'Who We Are', color:'#c8102e', text:'DRYNN is a custom garment printing service based in Tamil Nadu, India. We bring your designs to life on premium quality t-shirts, hoodies, polos, and joggers — delivered right to your door.' },
            { title:'Our Mission', color:'#0a1f5d', text:'We believe everyone deserves to wear exactly what they imagine. From individual pieces to bulk corporate orders, we treat every print with the same precision and care.' },
            { title:'Quality First', color:'#00a86b', text:'We use heat press printing technology on pre-shrunk, premium fabrics. Every order goes through quality checks before dispatch. If it's not right, we reprint it — simple as that.' },
            { title:'Delivery',    color:'#f5a623', text:'We deliver across India in 5–7 working days. Cash on delivery is available. For bulk orders of 10+ pieces, contact us on WhatsApp for custom pricing and express timelines.' },
          ].map((s,i) => (
            <div key={i} style={{ display:'flex', gap:16 }}>
              <div style={{ width:4, minHeight:60, background:s.color, borderRadius:2, flexShrink:0 }} />
              <div>
                <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{s.title}</h3>
                <p style={{ fontSize:14, color:'#555', lineHeight:1.8 }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, margin:'48px 0', textAlign:'center' }}>
          {[['500+','Orders Completed'],['5★','Average Rating'],['5–7d','Delivery']].map(([n,l])=>(
            <div key={l} style={{ background:'#f8f8f8', borderRadius:10, padding:'24px 16px' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:40, color:'#c8102e', lineHeight:1, marginBottom:6 }}>{n}</div>
              <div style={{ fontSize:12, color:'#888', fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <span className="sec-label">FAQ</span>
        <h2 className="sec-title" style={{ marginBottom:24 }}>FREQUENTLY ASKED</h2>
        <div style={{ border:'1px solid #f0f0f0', borderRadius:10, overflow:'hidden' }}>
          {FAQS.map((f,i)=>(
            <div key={i} className="faq-item">
              <button className="faq-q" style={{ padding:'18px 20px' }} onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                <span>{f.q}</span>
                <span style={{ fontSize:20, color:'#c8102e', flexShrink:0 }}>{openFaq===i?'−':'+'}</span>
              </button>
              {openFaq===i && <p className="faq-a" style={{ padding:'0 20px 18px' }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', email:'', message:'' })
  const handle = () => {
    if (!form.name||!form.phone) { alert('Please fill your name and phone.'); return }
    setSent(true)
  }
  return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'32px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Get In Touch</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>CONTACT US</h1>
        </div>
      </div>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'40px 16px' }}>
        {sent ? (
          <div style={{ textAlign:'center', padding:'48px 16px' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, marginBottom:8 }}>MESSAGE SENT!</h2>
            <p style={{ fontSize:14, color:'#555' }}>We'll WhatsApp you within 2 hours.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Contact cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
              {[
                { icon:'📱', label:'WhatsApp', value:'+91 99447 61306', color:'#00a86b' },
                { icon:'📍', label:'Location',  value:'Tamil Nadu, India', color:'#c8102e' },
                { icon:'⏰', label:'Hours',     value:'Mon–Sat 9am–7pm',   color:'#0a1f5d' },
                { icon:'📦', label:'Delivery',  value:'5–7 working days',  color:'#f5a623' },
              ].map((c,i)=>(
                <div key={i} style={{ background:'#f8f8f8', borderRadius:10, padding:'16px 14px', display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:38, height:38, background:c.color, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{c.icon}</div>
                  <div><div style={{ fontSize:11, color:'#aaa', marginBottom:2, fontWeight:600 }}>{c.label}</div><div style={{ fontSize:13, fontWeight:700 }}>{c.value}</div></div>
                </div>
              ))}
            </div>
            {/* Form */}
            <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Your Name *</label><input className="input-field" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Phone / WhatsApp *</label><input className="input-field" placeholder="+91 00000 00000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Email (optional)</label><input className="input-field" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Message</label><textarea className="input-field" rows={4} placeholder="Tell us about your order, bulk inquiry, or question…" style={{ resize:'vertical' }} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} /></div>
            <button className="btn-primary" style={{ padding:15, fontSize:13 }} onClick={handle}>Send Message</button>
            <p style={{ fontSize:12, color:'#aaa', textAlign:'center' }}>Or WhatsApp us directly at <strong>+91 99447 61306</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}

function CartPage({ cart, onRemove, onClear }) {
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0)
  return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'32px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>My Cart</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>SHOPPING CART</h1>
        </div>
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 16px' }}>
        {cart.length===0 ? (
          <div style={{ textAlign:'center', padding:'64px 16px' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🛒</div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, marginBottom:8 }}>YOUR CART IS EMPTY</h2>
            <p style={{ color:'#888', fontSize:14 }}>Add some products to get started!</p>
          </div>
        ) : (
          <div>
            {cart.map((item,i)=>(
              <div key={i} style={{ display:'flex', gap:16, alignItems:'center', padding:'16px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:72, height:72, background:'#f8f8f8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, flexShrink:0 }}>{item.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</p>
                  <p style={{ fontSize:12, color:'#aaa', marginBottom:6 }}>Qty: {item.qty}</p>
                  <p style={{ fontSize:16, fontWeight:700, color:'#c8102e' }}>₹{(item.price*item.qty).toLocaleString()}</p>
                </div>
                <button onClick={()=>onRemove(i)} style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'6px 12px', fontSize:12, color:'#888', cursor:'pointer' }}>Remove</button>
              </div>
            ))}
            <div style={{ padding:'24px 0', borderTop:'2px solid #f0f0f0', marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>Total</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#c8102e' }}>₹{total.toLocaleString()}</span>
              </div>
              <button className="btn-primary" style={{ width:'100%', padding:15, fontSize:14, marginBottom:10 }}>Proceed to Checkout</button>
              <button onClick={onClear} style={{ width:'100%', padding:12, fontSize:13, background:'none', border:'1px solid #e0e0e0', borderRadius:4, cursor:'pointer', color:'#888' }}>Clear Cart</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AccountPage({ user, onLogout }) {
  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'48px 16px', textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', margin:'0 auto 16px', border:'3px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
          {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : '👤'}
        </div>
        <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, color:'#fff', letterSpacing:'.1em', marginBottom:4 }}>{user?.user_metadata?.full_name||'My Account'}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>{user?.email}</p>
      </div>
      <div style={{ maxWidth:500, margin:'0 auto', padding:'32px 16px' }}>
        {[
          { icon:'📦', label:'My Orders',    sub:'Track and manage your orders' },
          { icon:'💳', label:'Payments',     sub:'UPI, Razorpay, COD' },
          { icon:'📍', label:'Addresses',    sub:'Manage delivery addresses' },
          { icon:'🔔', label:'Notifications', sub:'Order updates on WhatsApp' },
          { icon:'🛡️', label:'Privacy',      sub:'Data & privacy settings' },
        ].map((item,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor:'pointer' }}
            onMouseEnter={e=>e.currentTarget.style.paddingLeft='8px'} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor:'pointer', transition:'padding .15s' }}>
            <div style={{ width:44, height:44, background:'#f8f8f8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{item.sub}</div>
            </div>
            <span style={{ color:'#ccc', fontSize:18 }}>›</span>
          </div>
        ))}
        <button className="btn-secondary" style={{ width:'100%', padding:13, fontSize:13, marginTop:28 }} onClick={onLogout}>Sign Out</button>
        <p style={{ textAlign:'center', fontSize:11, color:'#ccc', marginTop:12 }}>DRYNN · Tamil Nadu, India</p>
      </div>
    </div>
  )
}

function PrivacyPage({ onBack }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f8' }}>
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'48px 16px 60px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 30% 50%,rgba(200,16,46,.15) 0%,transparent 60%)', pointerEvents:'none' }} />
        <button onClick={onBack} style={{ position:'absolute', top:16, left:16, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'8px 16px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600 }}>← Back</button>
        <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(36px,8vw,60px)', color:'#fff', letterSpacing:'.04em', marginBottom:8, position:'relative', zIndex:1 }}>PRIVACY POLICY</h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', position:'relative', zIndex:1 }}>Last updated: June 2025</p>
      </div>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 16px 80px' }}>
        {[
          { num:'01', title:'Information We Collect', content:'When you use DRYNN, we collect your name, email, phone number, delivery address, order details, and uploaded design files for the purpose of fulfilling your orders.' },
          { num:'02', title:'How We Use Your Data',   content:'We use your information to process orders, contact you via WhatsApp about order status, improve our service, and send occasional updates (opt-out anytime).' },
          { num:'03', title:'Data Sharing',           content:'We do not sell your personal data. We share only delivery address with courier partners and payment info with Razorpay/UPI. All parties are bound by confidentiality.' },
          { num:'04', title:'Data Security',          content:'Your data is stored securely via Supabase with encryption at rest and in transit. We follow industry-standard security practices.' },
          { num:'05', title:'Your Rights',            content:'You can request access, correction, or deletion of your data at any time. Contact us on WhatsApp or email.' },
          { num:'06', title:'Contact',                content:'For privacy concerns: WhatsApp +91 99447 61306 or through our contact form. We respond within 48 hours.' },
        ].map((s,i)=>(
          <div key={i} style={{ paddingBottom:28, marginBottom:28, borderBottom:i<5?'1px solid #eee':'none' }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', color:'#c8102e', textTransform:'uppercase', marginBottom:6 }}>SECTION {s.num}</p>
            <h3 style={{ fontSize:17, fontWeight:700, color:'#0a0a0a', marginBottom:10 }}>{s.title}</h3>
            <p style={{ fontSize:14, color:'#555', lineHeight:1.8 }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TermsPage({ onBack }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f8' }}>
      <div style={{ background:'linear-gradient(135deg,#1a0a2e,#0a1f5d)', padding:'48px 16px 60px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <button onClick={onBack} style={{ position:'absolute', top:16, left:16, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'8px 16px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600 }}>← Back</button>
        <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(36px,8vw,60px)', color:'#fff', letterSpacing:'.04em', marginBottom:8, position:'relative', zIndex:1 }}>TERMS OF SERVICE</h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', position:'relative', zIndex:1 }}>Effective: June 2025</p>
      </div>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 16px 80px' }}>
        {[
          { num:'01', title:'Acceptance of Terms',     content:'By using DRYNN, you agree to these Terms of Service. DRYNN is operated from Tamil Nadu, India.' },
          { num:'02', title:'Orders & Payments',       content:'All orders are subject to availability. Prices in INR. We accept UPI, Razorpay, and COD. Orders confirmed after payment.' },
          { num:'03', title:'Custom Print Policy',     content:'You confirm you own rights to uploaded designs. DRYNN is not liable for copyright infringement. We reserve the right to reject offensive or illegal content.' },
          { num:'04', title:'Delivery & Returns',      content:'Standard delivery 5–7 working days. Replacements only for manufacturing defects. Custom printed items are non-returnable due to change of mind.' },
          { num:'05', title:'Intellectual Property',   content:'The DRYNN brand, logo, and website content are our intellectual property. Unauthorised reproduction is prohibited.' },
          { num:'06', title:'Limitation of Liability', content:'DRYNN liability is limited to the value of your order. We are not responsible for delays caused by courier partners.' },
        ].map((s,i)=>(
          <div key={i} style={{ paddingBottom:28, marginBottom:28, borderBottom:i<5?'1px solid #eee':'none' }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', color:'#0a1f5d', textTransform:'uppercase', marginBottom:6 }}>SECTION {s.num}</p>
            <h3 style={{ fontSize:17, fontWeight:700, color:'#0a0a0a', marginBottom:10 }}>{s.title}</h3>
            <p style={{ fontSize:14, color:'#555', lineHeight:1.8 }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN SITE SHELL (navbar + bottom nav + router)
// ══════════════════════════════════════════════════════════════
function MainSite({ user }) {
  const [page, setPage]     = useState('home')
  const [cart, setCart]     = useState([])
  const [toast, setToast]   = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const addToCart = (product) => {
    setCart(c => {
      const idx = c.findIndex(x => x.id === product.id)
      if (idx >= 0) { const n=[...c]; n[idx]={...n[idx],qty:n[idx].qty+1}; return n }
      return [...c, { ...product, qty:1 }]
    })
    showToast(`${product.name} added to cart`)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload() }

  // Overlay pages
  if (page === 'privacy') return <PrivacyPage onBack={()=>setPage('home')} />
  if (page === 'terms')   return <TermsPage   onBack={()=>setPage('home')} />

  const NAV_ITEMS = [
    { key:'home',     label:'Home',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
    { key:'products', label:'Shop',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg> },
    { key:'studio',   label:'Studio',  special:true, icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> },
    { key:'cart',     label:'Cart',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg> },
    { key:'account',  label:'Account', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ]

  return (
    <div style={{ paddingBottom:64 }}>
      {/* ── TOP NAVBAR ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'#fff', borderBottom:'1px solid #f0f0f0', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
        {/* Top stripe */}
        <div style={{ height:3, display:'flex' }}>
          <div style={{ flex:1, background:'#c8102e' }} /><div style={{ flex:1, background:'#0a1f5d' }} /><div style={{ flex:1, background:'#c8102e' }} />
        </div>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
          {/* Logo */}
          <button onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Bebas Neue,sans-serif', fontSize:26, letterSpacing:'.15em', color:'#0a0a0a', padding:0 }}>DRYNN</button>
          {/* Desktop nav links */}
          <div className="hide-mobile" style={{ display:'flex', gap:4 }}>
            {['home','products','studio','about','contact'].map(k=>(
              <button key={k} onClick={()=>setPage(k)}
                style={{ background:'none', border:'none', padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer', color:page===k?'#c8102e':'#555', borderBottom:page===k?'2px solid #c8102e':'2px solid transparent', textTransform:'capitalize', transition:'color .15s' }}>
                {k==='studio'?'Custom Print':k.charAt(0).toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
          {/* Desktop right */}
          <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:10 }}>
            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #f0f0f0' }} />}
            <button onClick={()=>setPage('cart')} style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>
              {cart.length>0 && <div className="cart-badge">{cart.length}</div>}
            </button>
            <button onClick={handleLogout} style={{ background:'none', border:'1px solid #e0e0e0', padding:'6px 12px', fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', cursor:'pointer', color:'#888', borderRadius:4 }}>Logout</button>
          </div>
          {/* Mobile cart icon */}
          <button className="hide-desktop" onClick={()=>setPage('cart')} style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>
            {cart.length>0 && <div className="cart-badge">{cart.length}</div>}
          </button>
        </div>
      </nav>

      {/* ── MARQUEE ── */}
      <div style={{ background:'#0a0a0a', color:'#fff', padding:'10px 0', overflow:'hidden' }}>
        <div style={{ display:'flex', gap:0, whiteSpace:'nowrap', animation:'marquee 22s linear infinite' }}>
          {[...Array(2)].map((_,rep)=>(
            ['FREE DELIVERY ABOVE ₹1,500','PREMIUM HEAT PRESS PRINT','ALL COLORS AVAILABLE','5-7 DAY DELIVERY','100% QUALITY GUARANTEE','COD AVAILABLE'].map((t,i)=>(
              <span key={`${rep}-${i}`} style={{ fontSize:10, fontWeight:700, letterSpacing:'.16em', padding:'0 28px', borderRight:'1px solid #333' }}>{t}</span>
            ))
          ))}
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      {page==='home'     && <HomePage     user={user} onNav={setPage} cart={cart} onAddToCart={addToCart} />}
      {page==='products' && <ProductsPage onAddToCart={addToCart} />}
      {page==='studio'   && <StudioPage   user={user} />}
      {page==='about'    && <AboutPage />}
      {page==='contact'  && <ContactPage />}
      {page==='cart'     && <CartPage cart={cart} onRemove={i=>setCart(c=>c.filter((_,idx)=>idx!==i))} onClear={()=>setCart([])} />}
      {page==='account'  && <AccountPage user={user} onLogout={handleLogout} />}

      {/* ── FOOTER (only on home / about / contact) ── */}
      {['home','about','contact','products'].includes(page) && (
        <footer style={{ background:'#0a0a0a', color:'#fff', padding:'48px 16px 80px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div className="footer-cols" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>
              <div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:30, letterSpacing:'.15em', marginBottom:14 }}>DRYNN</div>
                <p style={{ fontSize:13, lineHeight:1.8, color:'#666', maxWidth:240 }}>Premium custom print clothing from Tamil Nadu. We bring your designs to life.</p>
              </div>
              {[
                { title:'Shop',    links:[['T-Shirts','products'],['Hoodies','products'],['Polos','products'],['Joggers','products']] },
                { title:'Support', links:[['Custom Order','studio'],['Contact Us','contact'],['Returns','about'],['FAQ','about']] },
                { title:'Company', links:[['About Us','about'],['Contact','contact'],['Terms','terms'],['Privacy','privacy']] },
              ].map(col=>(
                <div key={col.title}>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:16, color:'#fff' }}>{col.title}</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {col.links.map(([l,pg])=>(
                      <button key={l} onClick={()=>setPage(pg)} style={{ background:'none', border:'none', color:'#666', fontSize:13, cursor:'pointer', textAlign:'left', padding:0, transition:'color .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='#666'}>{l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid #1a1a1a', paddingTop:20, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <p style={{ fontSize:11, color:'#444' }}>© 2024 DRYNN. All rights reserved. Tamil Nadu, India.</p>
              <p style={{ fontSize:11, color:'#444' }}>UPI / Razorpay / COD Accepted</p>
            </div>
          </div>
        </footer>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav" style={{ display:'flex', position:'fixed', bottom:0, left:0, right:0, zIndex:200, background:'#fff', borderTop:'1px solid #ebebeb', height:60, alignItems:'center', justifyContent:'space-around', boxShadow:'0 -4px 16px rgba(0,0,0,.08)' }}>
        {NAV_ITEMS.map(item=>(
          <button key={item.key} onClick={()=>setPage(item.key)}
            className={`bnav-item${page===item.key?' active':''}`}
            style={{ position:'relative', ...(item.special ? { background:'#c8102e', width:48, height:48, borderRadius:'50%', transform:'translateY(-10px)', boxShadow:'0 4px 16px rgba(200,16,46,.45)', flexShrink:0 } : {}) }}>
            {React.cloneElement(item.icon, { stroke: item.special ? '#fff' : (page===item.key?'#c8102e':'#aaa') })}
            {!item.special && <span style={{ fontSize:9, fontWeight:700, color:page===item.key?'#c8102e':'#bbb', letterSpacing:'.04em', textTransform:'uppercase', marginTop:1 }}>{item.label}</span>}
            {item.key==='cart' && cart.length>0 && <div className="cart-badge" style={{ top:-4, right:-4 }}>{cart.length}</div>}
          </button>
        ))}
      </nav>

      {/* ── TOAST ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ROOT CONTROLLER
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const [screen,   setScreen]   = useState('splash')  // splash | intro | login | main
  const [user,     setUser]     = useState(null)
  const [checking, setChecking] = useState(true)

  const sendToSheet = (u) => {
    if (!GOOGLE_SHEET_WEBHOOK) return
    fetch(GOOGLE_SHEET_WEBHOOK, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sheet:'DRYNN_Users', userId:u.id, name:u.user_metadata?.full_name||'', email:u.email, registeredAt:new Date().toISOString() })
    }).catch(console.error)
  }

  useEffect(() => {
    // Clear ?error= or ?code= params Google puts in the URL after redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.has('error') || params.has('code')) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Check existing session — auto-login returning users immediately
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (session?.user) {
        setUser(session.user)
        setScreen('main')
        sendToSheet(session.user)
      }
      setChecking(false)
    })

    // Handle OAuth redirect, token refresh, and initial session
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
        session?.user
      ) {
        setUser(session.user)
        setScreen('main')
        sendToSheet(session.user)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setScreen('intro')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <style>{`@keyframes drynn-pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, letterSpacing:'.15em', color:'#0a0a0a', animation:'drynn-pulse 1.5s ease-in-out infinite' }}>DRYNN</div>
    </div>
  )

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {screen==='splash'  && <SplashScreen onDone={()=>setScreen('intro')} />}
      {screen==='intro'   && <IntroPage    onGoToLogin={()=>setScreen('login')} />}
      {screen==='login'   && <LoginPage    onBack={()=>setScreen('intro')} />}
      {screen==='main'    && <MainSite     user={user} />}
    </>
  )
}
