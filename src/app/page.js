'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
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

// Shared hook to load products from Supabase, fallback to hardcoded PRODUCTS
// Returns all products. Use usePublicProducts() for store/home pages.
function useProducts() {
  const [products, setProducts] = React.useState(PRODUCTS)
  React.useEffect(() => {
    supabase.from('drynn_products').select('*').order('id')
      .then(({ data, error }) => {
        if (error) {
          console.error('[Products] Failed to load from Supabase:', error.message, '- using hardcoded fallback.')
          return
        }
        if (data && data.length > 0) setProducts(data)
      })
  }, [])
  return products
}

// Only public (non-studio-only) products - used in ProductsPage and HomePage
function usePublicProducts() {
  return useProducts().filter(p => !p.studio_only)
}

// Only studio-only products - used in StudioPage
function useStudioProducts() {
  return useProducts().filter(p => p.studio_only)
}
const SIZES = ['S','M','L','XL','XXL']
const GARMENTS = ['T-Shirt','Hoodie','Polo','Joggers']
const STEPS = [
  { num:'01', color:'#c8102e', title:'Choose Garment',   desc:'Pick from t-shirts, hoodies, polos, or joggers in your preferred color.' },
  { num:'02', color:'#0a1f5d', title:'Upload Design',    desc:'Upload your artwork in PNG, JPG, or SVG. Minimum 300 DPI recommended.' },
  { num:'03', color:'#00a86b', title:'Preview & Order',  desc:'Confirm your design placement, size, and place your order securely.' },
  { num:'04', color:'#0a0a0a', title:'Delivered to You', desc:'We print and deliver your custom piece within 5-7 working days across India.' },
]
const REVIEWS = [
  { name:'Arjun R.',   location:'Chennai',    color:'#c8102e', rating:5, text:'The print quality is outstanding. Ordered 10 jerseys for our college team and every piece was perfect.' },
  { name:'Priya S.',   location:'Bangalore',  color:'#0a1f5d', rating:5, text:'Upload was easy, delivery was fast, and the hoodie feels premium. Will definitely order again.' },
  { name:'Karthik M.', location:'Coimbatore', color:'#00a86b', rating:4, text:'Best custom print service in Tamil Nadu. Price is fair and quality is top level.' },
  { name:'Divya K.',   location:'Madurai',    color:'#9b59b6', rating:5, text:'Got my custom polo for a corporate event. Everyone loved it. Fast delivery too!' },
  { name:'Ravi T.',    location:'Trichy',     color:'#f5a623', rating:4, text:'Ordered joggers with our logo. Delivered in 5 days and the print is very clean and durable.' },
]
const FAQS = [
  { q:'How long does delivery take?',         a:'We deliver within 5-7 working days across India. Express delivery (2-3 days) is available for select pincodes.' },
  { q:'What file formats do you accept?',     a:'We accept PNG, JPG, JPEG, and SVG files. Minimum 300 DPI is recommended for best print quality.' },
  { q:'What payment methods do you accept?',     a:'We accept UPI and Razorpay for all orders across India. Pay securely online at checkout.' },
  { q:'Can I return or exchange my order?',   a:'We offer replacements only for manufacturing defects or incorrect items. Custom printed items cannot be returned due to change of mind.' },
  { q:'What is the minimum order quantity?',  a:'We accept single piece orders. Bulk discounts apply for orders of 10+ pieces  -  contact us on WhatsApp for a custom quote.' },
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
  html { -webkit-tap-highlight-color: transparent; overflow-x:hidden; max-width:100vw; }
  body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #0a0a0a; overflow-x:hidden; }
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
  .sec-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(24px,5vw,48px); letter-spacing:.03em; line-height:1.05; }

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
    .feature-bar { grid-template-columns:repeat(2,1fr) !important; }
    .products-grid { grid-template-columns:repeat(2,1fr) !important; gap:12px !important; }
    .footer-cols { grid-template-columns:1fr 1fr !important; gap:28px !important; }
    .steps-grid { grid-template-columns:1fr 1fr !important; }
    .reviews-grid { grid-template-columns:1fr !important; }
    .hero-cta { flex-direction:column !important; }
    .hero-cta button, .hero-cta a { width:100% !important; text-align:center; }
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
// INTRO PAGE (brand info  -  no login)
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
          Upload your artwork, pick your garment, and we deliver premium custom clothing straight to your door  -  anywhere in India.
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
          { icon:'🚚', label:'Fast Delivery',        desc:'5-7 days across India, express available',   bg:'rgba(10,31,93,0.07)'   },
          { icon:'💎', label:'Quality Guaranteed',   desc:'Heat press, wash-proof, 100% guarantee', bg:'rgba(0,168,107,0.07)'  },
          { icon:'💳', label:'Easy Payment',         desc:'UPI & Razorpay  -  secure payment',       bg:'rgba(245,166,35,0.10)' },
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
        <p style={{ color:'rgba(255,255,255,.65)', fontSize:15, marginBottom:24 }}>Sign in with Google  -  free, fast, and secure.</p>
        <button className="btn-primary" style={{ fontSize:14, padding:'14px 32px' }} onClick={onGoToLogin}>Start Now →</button>
      </div>
      {/* Footer mini */}
      <div style={{ background:'#0a0a0a', color:'#666', padding:'20px', textAlign:'center', fontSize:11 }}>
        © 2025 DRYNN · Tamil Nadu, India · UPI / Razorpay Accepted
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
      if (err) setError(err.message || 'Google login failed. Check your internet connection and try again.')
    } catch (e) {
      setError(`[Login] Unexpected error: ${e.message || 'Unknown error'}. Please refresh and try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f8', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 20px' }}>
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
            {[['500+','Orders'],['5-7d','Delivery'],['100%','Quality']].map(([n,l]) => (
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
// ══════════════════════════════════════════════════════════════
// LIVE T-SHIRT PREVIEW  -  canvas-based, design on fabric
// ══════════════════════════════════════════════════════════════
function LiveTshirtPreview({ designImg, garmentType, garmentColor }) {
  const canvasRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  // Garment SVG paths (flat silhouette per type)
  const GARMENT_PATHS = {
    tshirt: {
      body:   'M 140,60 L 100,50 Q 80,48 60,80 L 30,130 L 80,145 L 80,320 L 320,320 L 320,145 L 370,130 L 340,80 Q 320,48 300,50 L 260,60 Q 240,90 200,90 Q 160,90 140,60 Z',
      lsleeve:'M 60,80 L 30,130 L 80,145 L 100,95 Z',
      rsleeve:'M 340,80 L 370,130 L 320,145 L 300,95 Z',
      printX: 140, printY: 130, printW: 120, printH: 120,
    },
    hoodie: {
      body:   'M 130,75 L 95,55 Q 70,50 50,90 L 20,150 L 75,168 L 75,340 L 325,340 L 325,168 L 380,150 L 350,90 Q 330,50 305,55 L 270,75 Q 250,50 230,48 Q 200,46 200,46 Q 200,46 170,48 Q 150,50 130,75 Z',
      hood:   'M 130,75 Q 150,50 170,48 Q 200,46 200,46 Q 200,46 230,48 Q 250,50 270,75 Q 240,40 200,38 Q 160,40 130,75 Z',
      lsleeve:'M 50,90 L 20,150 L 75,168 L 100,100 Z',
      rsleeve:'M 350,90 L 380,150 L 325,168 L 300,100 Z',
      pocket: 'M 155,240 Q 155,270 165,280 L 235,280 Q 245,270 245,240 Z',
      printX: 145, printY: 140, printW: 110, printH: 100,
    },
    polo: {
      body:   'M 145,55 L 110,50 Q 88,48 68,78 L 38,125 L 85,140 L 85,310 L 315,310 L 315,140 L 362,125 L 332,78 Q 312,48 290,50 L 255,55 Q 240,75 220,78 L 200,80 L 180,78 Q 160,75 145,55 Z',
      lsleeve:'M 68,78 L 38,125 L 85,140 L 105,88 Z',
      rsleeve:'M 332,78 L 362,125 L 315,140 L 295,88 Z',
      collar: 'M 145,55 Q 160,75 180,78 L 200,80 L 220,78 Q 240,75 255,55 L 235,50 L 220,65 L 200,68 L 180,65 L 165,50 Z',
      printX: 148, printY: 125, printW: 105, printH: 105,
    },
    joggers: {
      body:   'M 130,40 L 270,40 L 285,55 L 280,180 L 240,185 L 220,360 L 180,360 L 200,185 L 160,185 L 180,360 L 140,360 L 120,185 L 115,180 L 120,55 Z',
      waist:  'M 130,40 L 270,40 L 285,55 L 115,55 Z',
      printX: 155, printY: 70, printW: 90, printH: 90,
    },
  }

  const COLOR_FILTER = {
    '#ffffff': null,
    '#0a0a0a': 'brightness(0.08)',
    '#000000': 'brightness(0.08)',
    '#c8102e': 'sepia(1) saturate(8) hue-rotate(320deg) brightness(0.9)',
    '#0a1f5d': 'sepia(1) saturate(5) hue-rotate(195deg) brightness(0.55)',
    '#00a86b': 'sepia(1) saturate(6) hue-rotate(110deg) brightness(0.75)',
    '#f5a623': 'sepia(1) saturate(5) hue-rotate(10deg) brightness(1.1)',
    '#9b59b6': 'sepia(1) saturate(4) hue-rotate(255deg) brightness(0.85)',
    '#888888': 'brightness(0.55)',
    '#1a1a2e': 'sepia(1) saturate(3) hue-rotate(220deg) brightness(0.3)',
    '#2d6a4f': 'sepia(1) saturate(4) hue-rotate(125deg) brightness(0.6)',
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 400, H = 420
    canvas.width = W; canvas.height = H

    const gKey = (garmentType||'tshirt').toLowerCase().replace('-','').replace(' ','')
    const paths = GARMENT_PATHS[gKey] || GARMENT_PATHS.tshirt
    const col   = garmentColor || '#ffffff'
    const filt  = COLOR_FILTER[col]

    const draw = (designImgEl) => {
      ctx.clearRect(0, 0, W, H)

      // Shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.22)'
      ctx.shadowBlur  = 28
      ctx.shadowOffsetY = 12

      // Fill garment body
      const drawPath = (d, fillCol, alpha=1) => {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = fillCol
        const p = new Path2D(d)
        ctx.fill(p)
        ctx.restore()
      }

      // Apply colour tint via off-screen canvas with filter
      const offC = document.createElement('canvas')
      offC.width = W; offC.height = H
      const offCtx = offC.getContext('2d')

      // Draw garment on offscreen in base colour
      offCtx.fillStyle = col === '#ffffff' ? '#f5f5f5' : col
      const bodyPath = new Path2D(paths.body)
      offCtx.fill(bodyPath)
      if (paths.lsleeve) { const p = new Path2D(paths.lsleeve); offCtx.fill(p) }
      if (paths.rsleeve) { const p = new Path2D(paths.rsleeve); offCtx.fill(p) }

      // Darker shade for sleeves/details
      const darkShade = col === '#ffffff' ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.18)'
      if (paths.lsleeve) { offCtx.fillStyle = darkShade; const p = new Path2D(paths.lsleeve); offCtx.fill(p) }
      if (paths.rsleeve) { offCtx.fillStyle = darkShade; const p = new Path2D(paths.rsleeve); offCtx.fill(p) }
      if (paths.hood)    { offCtx.fillStyle = darkShade; const p = new Path2D(paths.hood); offCtx.fill(p) }
      if (paths.pocket)  { offCtx.fillStyle = 'rgba(0,0,0,0.12)'; const p = new Path2D(paths.pocket); offCtx.fill(p) }
      if (paths.waist)   { offCtx.fillStyle = 'rgba(0,0,0,0.15)'; const p = new Path2D(paths.waist); offCtx.fill(p) }
      if (paths.collar)  { offCtx.fillStyle = col === '#ffffff' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'; const p = new Path2D(paths.collar); offCtx.fill(p) }

      // Fabric highlight
      offCtx.fillStyle = 'rgba(255,255,255,0.06)'
      offCtx.fillRect(160, 80, 80, 200)

      ctx.restore()
      ctx.drawImage(offC, 0, 0)

      // Garment stroke
      ctx.save()
      ctx.strokeStyle = col === '#ffffff' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1.5
      const bodyP = new Path2D(paths.body)
      ctx.stroke(bodyP)
      ctx.restore()

      // ── Clip design to print area ──
      if (designImgEl) {
        const px = paths.printX, py = paths.printY
        const pw = paths.printW, ph = paths.printH

        ctx.save()
        // Clip to body shape so design stays inside garment
        const clipPath = new Path2D(paths.body)
        ctx.clip(clipPath)

        // Slight perspective warp feel via transform
        ctx.transform(1, 0.01, -0.01, 1, 0, 0)

        // Draw design with multiply blend for fabric feel
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = 0.92
        ctx.drawImage(designImgEl, px, py, pw, ph)

        // Subtle fabric texture overlay on design
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.04
        for (let i = 0; i < ph; i += 3) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`
          ctx.fillRect(px, py + i, pw, 1)
        }

        ctx.restore()
      }

      // Edge shading for depth
      const grad = ctx.createLinearGradient(0, 0, W, 0)
      grad.addColorStop(0,   'rgba(0,0,0,0.10)')
      grad.addColorStop(0.15,'rgba(0,0,0,0.00)')
      grad.addColorStop(0.85,'rgba(0,0,0,0.00)')
      grad.addColorStop(1,   'rgba(0,0,0,0.10)')
      ctx.save()
      ctx.fillStyle = grad
      const edgePath = new Path2D(paths.body)
      ctx.clip(edgePath)
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      setLoaded(true)
    }

    if (designImg) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload  = () => draw(img)
      img.onerror = () => draw(null)
      img.src = designImg
    } else {
      draw(null)
    }
  }, [designImg, garmentType, garmentColor])

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <canvas ref={canvasRef} style={{ borderRadius:12, display:'block', maxWidth:'100%' }} />
      {!loaded && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.6)', borderRadius:12 }}>
          <div style={{ width:28, height:28, border:'3px solid #f0f0f0', borderTopColor:'#c8102e', borderRadius:'50%', animation:'drynn-spin .7s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 3D IMAGE/SVG VIEWER  -  any image extruded to 3D with Three.js
// Animations: None, Spin, Float, Pulse, Wobble, Swing, Spin+Float
// Settings: Background colour, Material, Texture, Lighting
// ══════════════════════════════════════════════════════════════
function ThreeDImageViewer() {
  const mountRef   = useRef(null)
  const threeRef   = useRef({})
  const animRef    = useRef(null)
  const frameRef   = useRef(0)
  const isDragRef  = useRef(false)
  const prevRef    = useRef({x:0,y:0})
  const rotRef     = useRef({x:0.15, y:0})

  const [imgFile,    setImgFile]    = useState(null)
  const [imgUrl,     setImgUrl]     = useState(null)
  const [animation,  setAnimation]  = useState('Float')
  const [bgColor,    setBgColor]    = useState('#1a1a2e')
  const [material,   setMaterial]   = useState('Standard')
  const [texture,    setTexture]    = useState('Smooth')
  const [depth,      setDepth]      = useState(0.18)
  const [lightInt,   setLightInt]   = useState(1.2)
  const [loaded,     setLoaded]     = useState(false)
  const [error,      setError]      = useState('')
  const [settingsOpen, setSettings] = useState(false)
  const [settingsTab,  setSetTab]   = useState('Animation')
  const [speed,      setSpeed]      = useState(1)

  const ANIMATIONS = ['None','Spin','Float','Pulse','Wobble','Swing','Spin+Float']
  const MATERIALS  = ['Standard','Metallic','Glass','Matte','Holographic']
  const TEXTURES   = ['Smooth','Wood','Metal','Gradient','Dotted','Striped','Checkered','Noise']
  const BG_COLORS  = ['#1a1a2e','#0d0d0d','#ffffff','#f0f0f0','#6c3483','#1a3a5c','#1a3a2a','#3d0000']
  const SETTINGS_TABS = ['Animation','Background','Material','Texture','Lighting']

  // Init Three.js
  useEffect(() => {
    let cancelled = false
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => {
      if (cancelled) return
      initScene()
      setLoaded(true)
    }
    script.onerror = () => setError('[3D Viewer] Failed to load Three.js from CDN.')
    document.head.appendChild(script)

    return () => {
      cancelled = true
      cancelAnimationFrame(animRef.current)
      if (threeRef.current.renderer) {
        threeRef.current.renderer.dispose()
        try { mountRef.current?.removeChild(threeRef.current.renderer.domElement) } catch(_) {}
      }
    }
  }, [])

  const initScene = () => {
    const THREE = window.THREE
    const W = mountRef.current?.clientWidth || 380
    const H = 380

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, W/H, 0.01, 100)
    camera.position.set(0, 0, 3.5)

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    mountRef.current?.appendChild(renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(3, 4, 3); dir.castShadow = true
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3)
    fill.position.set(-3, 2, -2); scene.add(fill)
    const back = new THREE.PointLight(0xff4444, 0.2, 12)
    back.position.set(0, -2, -3); scene.add(back)

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color:0x111111, roughness:1 })
    )
    floor.rotation.x = -Math.PI/2; floor.position.y = -1.8; floor.receiveShadow = true
    scene.add(floor)

    threeRef.current = { THREE, scene, camera, renderer, ambient, dir, fill, back, floor, mesh:null }

    // Animate loop
    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      frameRef.current++
      const f  = frameRef.current
      const sp = threeRef.current.speedVal || 1
      const m  = threeRef.current.mesh
      const anim = threeRef.current.animVal || 'Float'

      if (m) {
        if (anim === 'Spin') {
          m.rotation.y += 0.018 * sp
        } else if (anim === 'Float') {
          m.rotation.y += (rotRef.current.y - m.rotation.y) * 0.05
          m.rotation.x += (rotRef.current.x - m.rotation.x) * 0.05
          m.position.y  = Math.sin(f * 0.025 * sp) * 0.15
        } else if (anim === 'Pulse') {
          const s = 1 + Math.sin(f * 0.04 * sp) * 0.08
          m.scale.set(s, s, s)
          m.position.y = Math.sin(f * 0.04 * sp) * 0.05
        } else if (anim === 'Wobble') {
          m.rotation.z = Math.sin(f * 0.03 * sp) * 0.15
          m.rotation.y = Math.sin(f * 0.02 * sp) * 0.1
          m.position.y = Math.sin(f * 0.05 * sp) * 0.1
        } else if (anim === 'Swing') {
          m.rotation.z = Math.sin(f * 0.025 * sp) * 0.25
          m.position.y = -Math.abs(Math.sin(f * 0.025 * sp)) * 0.1
        } else if (anim === 'Spin+Float') {
          m.rotation.y += 0.015 * sp
          m.position.y  = Math.sin(f * 0.025 * sp) * 0.18
        } else {
          // None - still drag
          m.rotation.y += (rotRef.current.y - m.rotation.y) * 0.05
          m.rotation.x += (rotRef.current.x - m.rotation.x) * 0.05
        }
      }

      if (threeRef.current.scene) renderer.render(threeRef.current.scene, threeRef.current.camera)
    }
    animate()
  }

  // Build/rebuild 3D mesh from image
  const buildMesh = (imgSrc) => {
    const { THREE, scene, mesh } = threeRef.current
    if (!THREE || !scene) return
    if (mesh) scene.remove(mesh)

    const texLoader = new THREE.TextureLoader()
    texLoader.crossOrigin = 'anonymous'
    texLoader.load(imgSrc, (tex) => {
      tex.needsUpdate = true
      const iW = tex.image.width  || 256
      const iH = tex.image.height || 256
      const aspect = iW / iH
      const W = 1.6, H = W / aspect
      const d = threeRef.current.depthVal || 0.18

      const mat = threeRef.current.matVal || 'Standard'
      const makemat = (side) => {
        if (mat === 'Metallic')     return new THREE.MeshStandardMaterial({ color:0xcccccc, metalness:0.95, roughness:0.1, side })
        if (mat === 'Glass')        return new THREE.MeshPhysicalMaterial({ color:0xffffff, transmission:0.9, transparent:true, roughness:0.05, metalness:0, side })
        if (mat === 'Matte')        return new THREE.MeshLambertMaterial({ color:0xdddddd, side })
        if (mat === 'Holographic')  return new THREE.MeshPhongMaterial({ color:0x88ffff, specular:0xffffff, shininess:150, side })
        return new THREE.MeshStandardMaterial({ roughness:0.35, metalness:0.05, side }) // Standard
      }

      const frontMat = new THREE.MeshStandardMaterial({ map:tex, transparent:true, alphaTest:0.1, roughness:0.3, metalness:0.1, side:THREE.FrontSide })
      const sideMat  = makemat(THREE.DoubleSide)
      sideMat.color  = new THREE.Color(0x333333)

      const geo  = new THREE.BoxGeometry(W, H, d)
      const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, makemat(THREE.BackSide)]
      const newMesh = new THREE.Mesh(geo, mats)
      newMesh.castShadow = true
      newMesh.position.set(0, 0, 0)
      scene.add(newMesh)
      threeRef.current.mesh = newMesh
      rotRef.current = { x: 0.15, y: 0 }
    }, undefined, (e) => {
      console.error('[3D Viewer] Texture load failed:', e.message)
    })
  }

  // Sync state refs (avoid stale closures in animate loop)
  useEffect(() => { threeRef.current.animVal  = animation }, [animation])
  useEffect(() => { threeRef.current.speedVal = speed     }, [speed])
  useEffect(() => { threeRef.current.depthVal = depth     }, [depth])
  useEffect(() => { threeRef.current.matVal   = material  }, [material])

  // Rebuild mesh when image/depth/material changes
  useEffect(() => {
    if (!loaded || !imgUrl) return
    buildMesh(imgUrl)
  }, [loaded, imgUrl, depth, material])

  // Update background
  useEffect(() => {
    if (!threeRef.current.renderer) return
    threeRef.current.renderer.setClearColor(parseInt(bgColor.replace('#',''), 16), 1)
  }, [bgColor])

  // Update lights
  useEffect(() => {
    if (threeRef.current.dir) threeRef.current.dir.intensity = lightInt
  }, [lightInt])

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp','image/gif']
    if (!allowed.includes(f.type)) { setError('Only PNG, JPG, SVG, WEBP images allowed.'); return }
    setError('')
    const url = URL.createObjectURL(f)
    setImgFile(f); setImgUrl(url)
  }

  const onPointerDown = (e) => { isDragRef.current = true; prevRef.current = { x: e.clientX||e.touches?.[0]?.clientX, y: e.clientY||e.touches?.[0]?.clientY } }
  const onPointerMove = (e) => {
    if (!isDragRef.current) return
    const cx = e.clientX||e.touches?.[0]?.clientX||0
    const cy = e.clientY||e.touches?.[0]?.clientY||0
    rotRef.current.y += (cx - prevRef.current.x) * 0.008
    rotRef.current.x += (cy - prevRef.current.y) * 0.006
    rotRef.current.x = Math.max(-0.8, Math.min(0.8, rotRef.current.x))
    prevRef.current = { x:cx, y:cy }
  }
  const onPointerUp = () => { isDragRef.current = false }

  const exportImg = () => {
    if (!threeRef.current.renderer) return
    threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera)
    const link = document.createElement('a')
    link.download = 'drynn-3d-preview.png'
    link.href = threeRef.current.renderer.domElement.toDataURL('image/png')
    link.click()
  }

  return (
    <div style={{ background:'#0a0a0a', padding:'48px 16px', position:'relative', overflow:'hidden' }}>
      {/* BG glow */}
      <div style={{ position:'absolute', top:'20%', left:'10%', width:300, height:300, background:'radial-gradient(circle,rgba(200,16,46,.08) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'5%', width:280, height:280, background:'radial-gradient(circle,rgba(59,130,246,.06) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:960, margin:'0 auto', position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <span className="sec-label" style={{ color:'#c8102e' }}>3D Preview</span>
          <h2 className="sec-title" style={{ color:'#fff' }}>3D IMAGE VIEWER</h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:4 }}>Upload any image · PNG, JPG, SVG, WEBP · Drag to orbit</p>
        </div>

        <div style={{ display:'flex', gap:24, flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>

          {/* Canvas area */}
          <div style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            {/* Upload if no image */}
            {!imgUrl && (
              <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
                width:Math.min(380, typeof window!=='undefined'?window.innerWidth-80:380), height:380,
                border:'2px dashed rgba(255,255,255,.15)', borderRadius:16, cursor:'pointer',
                background:'rgba(255,255,255,.03)', transition:'border-color .2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(200,16,46,.5)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.15)'}>
                <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp,.gif" style={{ display:'none' }} onChange={onFileChange} />
                <div style={{ fontSize:48 }}>🖼️</div>
                <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', textAlign:'center', lineHeight:1.6 }}>
                  Upload any image<br/>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.25)' }}>PNG · JPG · SVG · WEBP</span>
                </p>
                <div style={{ padding:'10px 20px', background:'rgba(200,16,46,.15)', border:'1px solid rgba(200,16,46,.4)', borderRadius:6, fontSize:12, color:'#c8102e', fontWeight:700 }}>
                  Choose File
                </div>
              </label>
            )}

            {/* 3D canvas */}
            <div style={{ position:'relative', borderRadius:16, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.8)', display: imgUrl ? 'block' : 'none' }}>
              <div ref={mountRef}
                style={{ width:Math.min(380, typeof window!=='undefined'?window.innerWidth-80:380), height:380, cursor:'grab' }}
                onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp} />
              {!loaded && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(10,10,10,.9)', flexDirection:'column', gap:10 }}>
                  <div style={{ width:28, height:28, border:'3px solid rgba(255,255,255,.1)', borderTopColor:'#c8102e', borderRadius:'50%', animation:'drynn-spin .7s linear infinite' }} />
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Loading 3D engine…</span>
                </div>
              )}
              {error && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(10,10,10,.9)', padding:20 }}>
                  <p style={{ fontSize:12, color:'#f5a623', textAlign:'center' }}>{error}</p>
                </div>
              )}
              <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:10, color:'rgba(255,255,255,.25)', pointerEvents:'none', letterSpacing:'.1em' }}>
                DRAG TO ROTATE
              </div>
            </div>

            {/* Action buttons */}
            {imgUrl && (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, color:'rgba(255,255,255,.7)' }}>
                  <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp,.gif" style={{ display:'none' }} onChange={onFileChange} />
                  🔄 Change Image
                </label>
                <button onClick={exportImg} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'rgba(200,16,46,.15)', border:'1px solid rgba(200,16,46,.4)', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, color:'#c8102e' }}>
                  ⬇️ Export PNG
                </button>
              </div>
            )}
          </div>

          {/* Controls panel */}
          <div style={{ flex:'1 1 260px', maxWidth:320 }}>

            {/* Quick animation pills */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:10 }}>Animation</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ANIMATIONS.map(a => (
                  <button key={a} onClick={()=>setAnimation(a)}
                    style={{ padding:'7px 14px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer',
                      background: animation===a ? '#c8102e' : 'rgba(255,255,255,.07)',
                      color: animation===a ? '#fff' : 'rgba(255,255,255,.5)',
                      border: animation===a ? '1px solid #c8102e' : '1px solid rgba(255,255,255,.1)',
                      transition:'all .15s' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)' }}>Speed</p>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:700 }}>{speed.toFixed(1)}×</span>
              </div>
              <input type="range" min="0.2" max="3" step="0.1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}
                style={{ width:'100%', accentColor:'#c8102e' }} />
            </div>

            {/* Background colours */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:10 }}>Background</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                {BG_COLORS.map(c => (
                  <div key={c} onClick={()=>setBgColor(c)}
                    style={{ width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer',
                      border: c==='#ffffff'||c==='#f0f0f0' ? '2px solid rgba(255,255,255,.3)' : '2px solid transparent',
                      boxShadow: bgColor===c ? '0 0 0 3px #0a0a0a, 0 0 0 5px #c8102e' : 'none',
                      transition:'box-shadow .15s' }} />
                ))}
                <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                  style={{ width:30, height:30, borderRadius:'50%', border:'2px dashed rgba(255,255,255,.2)', cursor:'pointer', background:'none', padding:0 }} title="Custom colour" />
              </div>
            </div>

            {/* Material */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:10 }}>Material</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {MATERIALS.map(m => (
                  <button key={m} onClick={()=>setMaterial(m)}
                    style={{ padding:'7px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer',
                      background: material===m ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.05)',
                      color: material===m ? '#fff' : 'rgba(255,255,255,.4)',
                      border: material===m ? '1.5px solid rgba(255,255,255,.4)' : '1.5px solid rgba(255,255,255,.1)',
                      transition:'all .15s' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Depth */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)' }}>Extrusion Depth</p>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:700 }}>{depth.toFixed(2)}</span>
              </div>
              <input type="range" min="0.02" max="0.8" step="0.02" value={depth} onChange={e=>setDepth(Number(e.target.value))}
                style={{ width:'100%', accentColor:'#c8102e' }} />
            </div>

            {/* Light intensity */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)' }}>Lighting</p>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:700 }}>{lightInt.toFixed(1)}</span>
              </div>
              <input type="range" min="0.2" max="3" step="0.1" value={lightInt} onChange={e=>setLightInt(Number(e.target.value))}
                style={{ width:'100%', accentColor:'#c8102e' }} />
            </div>

            <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'12px 14px', fontSize:11, color:'rgba(255,255,255,.3)', lineHeight:1.7 }}>
              Upload any PNG, JPG, SVG, or WEBP. The image is extruded into a 3D object. Drag to rotate. Use Extrusion Depth to control thickness.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// STUDIO PAGE  -  Unified Live Mockup + Order Form
// ══════════════════════════════════════════════════════════════
function StudioPage({ user, onNav }) {
  const GARMENT_IMGS = {
    tshirt:  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    hoodie:  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
    polo:    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    joggers: 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
  }
  const GARMENT_KEY = { 'T-Shirt':'tshirt', 'Hoodie':'hoodie', 'Polo':'polo', 'Joggers':'joggers' }

  // ── Design overlay (shared: mockup canvas reads these, order form writes designImg) ──
  const [designImg,   setDesignImg]   = useState(null)  // object URL or sample URL
  const [designPosY,  setDesignPosY]  = useState(38)
  const [designPosX,  setDesignPosX]  = useState(50)
  const [designScale, setDesignScale] = useState(38)
  const [designRot,   setDesignRot]   = useState(0)

  // Text overlay
  const [textOn,      setTextOn]      = useState(false)
  const [textVal,     setTextVal]     = useState('YOUR TEXT')
  const [textFont,    setTextFont]    = useState('Bebas Neue')
  const [textColor,   setTextColor]   = useState('#000000')
  const [textSize,    setTextSize]    = useState(24)

  // Effects
  const [brightness,  setBrightness]  = useState(100)
  const [contrast,    setContrast]    = useState(100)
  const [saturation,  setSaturation]  = useState(100)

  // Samples (for mockup Samples tab)
  const [studioSamples,     setStudioSamples]     = useState([])
  const [studioSamplesLoad, setStudioSamplesLoad] = useState(false)
  const [studioSampleCat,   setStudioSampleCat]   = useState('All')

  const loadStudioSamples = async () => {
    if (studioSamples.length > 0) return
    setStudioSamplesLoad(true)
    const { data, error } = await supabase.from('drynn_samples').select('*').order('created_at', { ascending: false })
    if (!error) setStudioSamples(data || [])
    setStudioSamplesLoad(false)
  }

  // Studio picks (admin-curated)
  const [studioPicks,       setStudioPicks]       = useState([])
  const [studioPicksLoad,   setStudioPicksLoad]   = useState(false)
  const [studioPicksLoaded, setStudioPicksLoaded] = useState(false)

  const loadStudioPicks = async () => {
    if (studioPicksLoaded) return
    setStudioPicksLoad(true)
    const { data, error } = await supabase.from('drynn_products').select('*').eq('studio_only', true).order('id')
    if (!error) setStudioPicks(data || [])
    setStudioPicksLoad(false)
    setStudioPicksLoaded(true)
  }

  // ── Order form state ──
  const [size,        setSize]        = useState('M')
  const [uploadedFile,setFile]        = useState(null)
  const [uploadPct,   setUploadPct]   = useState(0)
  const [selectedSample, setSample]   = useState(null)
  const [form, setForm]   = useState({ name: user?.user_metadata?.full_name||'', phone:'', qty:1, address:'' })
  const [status, setStatus] = useState('')
  const [uploadErr, setUploadErr] = useState('')

  const GARMENT_TYPES = [
    { key:'tshirt', label:'T-Shirt', emoji:'👕' },
    { key:'hoodie', label:'Hoodie',  emoji:'🧥' },
    { key:'polo',   label:'Polo',    emoji:'👔' },
    { key:'joggers',label:'Joggers', emoji:'👖' },
  ]

  const canvasFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`

  // When customer uploads a file → instantly show in mockup
  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml']
    if (!allowed.includes(f.type)) { setUploadErr('Only PNG, JPG, or SVG files allowed.'); return }
    if (f.size > 20 * 1024 * 1024) { setUploadErr('File too large. Max 20MB.'); return }
    setUploadErr(''); setFile(f); setUploadPct(0); setSample(null)
    setDesignImg(URL.createObjectURL(f))  // ← drives the live mockup instantly
  }

  // When customer picks a sample → instantly show in mockup
  const handleSamplePick = s => {
    setSample(s); setFile(null)
    setDesignImg(s.image_url)             // ← drives the live mockup instantly
  }

  const handleDownload = () => alert('Tip: Take a screenshot of the mockup above to save your design preview.')

  const hasDesign = !!uploadedFile || !!selectedSample

  const handleSubmit = async () => {
    if (!form.name||!form.phone||!form.address||!hasDesign) { alert('Please fill all fields and choose a design.'); return }
    setStatus('saving')
    const orderId = crypto.randomUUID(), placedAt = new Date().toISOString()
    try {
      let designUrl = ''
      if (uploadedFile) {
        setStatus('uploading')
        try { designUrl = await uploadToCloudinary(uploadedFile, pct => setUploadPct(pct)) }
        catch(e) {
          setStatus('')
          alert(`[Design Upload Failed]\nReason: ${e.message || 'Network error'}\n\nCheck your internet and try again.`)
          return
        }
      } else {
        designUrl = selectedSample.image_url
      }
      setStatus('saving')
      const { error:dbErr } = await supabase.from('drynn_orders').insert({
        id:orderId, user_id:user?.id||null, name:form.name, phone:form.phone,
        garment, color, size, qty:Number(form.qty), address:form.address,
        design_file: designUrl, status:'pending', placed_at:placedAt
      })
      if (dbErr) alert(`[Order Save Failed]\nReason: ${dbErr.message}\n\nPlease WhatsApp us at +91 99447 61306.`)
      if (GOOGLE_SHEET_WEBHOOK) fetch(GOOGLE_SHEET_WEBHOOK,{ method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sheet:'DRYNN_Orders', orderId, userId:user?.id||'', name:form.name, phone:form.phone, garment, color, size, qty:form.qty, address:form.address, designUrl, placedAt }) }).catch(console.error)
      setStatus('done')
      setTimeout(()=>setStatus(''),5000)
      setForm({ name:user?.user_metadata?.full_name||'', phone:'', qty:1, address:'' })
      setFile(null); setSample(null); setUploadPct(0); setDesignImg(null)
    } catch(e) {
      setStatus('')
      alert(`[Unexpected Error]\nReason: ${e.message || 'Unknown'}\n\nPlease WhatsApp us at +91 99447 61306.`)
    }
  }

  const sliderStyle = { width:'100%', accentColor:'#c8102e' }
  const rowStyle    = { display:'flex', justifyContent:'space-between', marginBottom:6 }
  const lblStyle    = { fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.4)' }

  const colorToFilter = (hex) => {
    if (hex === '#ffffff') return 'none'
    if (hex === '#0a0a0a' || hex === '#000000') return 'brightness(0)'
    if (hex === '#c8102e') return 'sepia(1) saturate(5) hue-rotate(320deg)'
    if (hex === '#0a1f5d') return 'sepia(1) saturate(3) hue-rotate(195deg) brightness(0.6)'
    if (hex === '#00a86b') return 'sepia(1) saturate(4) hue-rotate(110deg) brightness(0.8)'
    if (hex === '#f5a623') return 'sepia(1) saturate(4) hue-rotate(10deg) brightness(1)'
    if (hex === '#9b59b6') return 'sepia(1) saturate(3) hue-rotate(260deg)'
    if (hex === '#888888') return 'brightness(0.55)'
    return 'none'
  }

  const TABS = [
    { key:'order',   icon:'📋', label:'Order'    },
    { key:'colour',  icon:'🖌️', label:'Colour'   },
    { key:'text',    icon:'✍️', label:'Text'     },
    { key:'motion',  icon:'↔️', label:'Position' },
    { key:'effects', icon:'✨', label:'Effects'  },
    { key:'samples', icon:'🖼️', label:'Samples'  },
    { key:'picks',   icon:'⭐', label:'Picks'    },
  ]

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'20px 20px 16px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div>
            <span className="sec-label" style={{ color:'rgba(255,255,255,.6)', marginBottom:2 }}>Design Studio</span>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(22px,5vw,36px)', color:'#fff', letterSpacing:'.05em', lineHeight:1 }}>LIVE MOCKUP + ORDER</h1>
          </div>
        </div>
      </div>

      {/* ── UNIFIED STUDIO BLOCK ── */}
      <div style={{ background:'#0d1b3e', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'5%', left:'5%', width:200, height:200, background:'radial-gradient(circle,rgba(200,16,46,.14) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'5%', width:280, height:280, background:'radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%)', pointerEvents:'none' }} />

      {/* Title */}
      <div style={{ textAlign:'center', padding:'40px 16px 12px' }}>
        <span className="sec-label" style={{ color:'#c8102e' }}>Design Studio</span>
        <h2 className="sec-title" style={{ color:'#fff' }}>LIVE MOCKUP</h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:6 }}>Upload design · Pick colour · See it live</p>
      </div>

      {/* Garment switcher */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', maxWidth:900, margin:'0 auto', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {GARMENT_TYPES.map(g=>(
            <button key={g.key} onClick={()=>setGarment(g.label)}
              style={{ padding:'8px 13px', borderRadius:50, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', background:GARMENT_KEY[garment]===g.key?'#c8102e':'rgba(255,255,255,.08)', color:'#fff', border:GARMENT_KEY[garment]===g.key?'1px solid #c8102e':'1px solid rgba(255,255,255,.15)' }}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
        <button onClick={handleDownload}
          style={{ padding:'9px 16px', borderRadius:50, background:'linear-gradient(135deg,#c8102e,#0a1f5d)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          📸 Save Preview
        </button>
      </div>

      {/* LIVE MOCKUP CANVAS */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'0 16px 8px' }}>
        <div style={{ position:'relative', width:'100%', maxWidth:420, margin:'0 auto', borderRadius:16, overflow:'hidden', background:'#f8f8f8', filter:canvasFilter, userSelect:'none' }}>
          <img
            src={GARMENT_IMGS[GARMENT_KEY[garment]]}
            alt={garment}
            style={{ width:'100%', display:'block', filter: colorToFilter(color) }}
            onError={e => { e.target.style.display='none' }}
          />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:120, opacity:0.08, pointerEvents:'none' }}>
            {GARMENT_TYPES.find(g=>g.key===GARMENT_KEY[garment])?.emoji}
          </div>
          {designImg && (
            <img
              src={designImg}
              alt="design"
              style={{
                position:'absolute',
                top: `${designPosY}%`,
                left: `${designPosX}%`,
                transform: `translate(-50%, -50%) rotate(${designRot}deg)`,
                width: `${designScale}%`,
                pointerEvents:'none',
                objectFit:'contain',
              }}
            />
          )}
          {textOn && textVal && (
            <div style={{
              position:'absolute', top:'60%', left:'50%',
              transform:'translateX(-50%)',
              fontFamily:textFont, fontSize:textSize,
              color:textColor, fontWeight:700,
              textShadow:'0 1px 4px rgba(0,0,0,.3)',
              pointerEvents:'none', whiteSpace:'nowrap',
            }}>{textVal}</div>
          )}
          {/* Live indicator */}
          <div style={{ position:'absolute', top:10, right:10, display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,.5)', borderRadius:50, padding:'4px 10px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: designImg ? '#00a86b' : '#f5a623', boxShadow: designImg ? '0 0 6px #00a86b' : '0 0 6px #f5a623' }} />
            <span style={{ fontSize:9, fontWeight:700, color:'#fff', letterSpacing:'.08em' }}>{designImg ? 'LIVE' : 'READY'}</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ maxWidth:900, margin:'0 auto', borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', background:'rgba(0,0,0,.3)', overflowX:'auto', WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}
          ref={el=>{ if(el) el.style.cssText += '; scrollbar-width:none; -ms-overflow-style:none;' }}>
          <style>{`.studio-tabs::-webkit-scrollbar{display:none}`}</style>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{ setTab(t.key); if(t.key==='samples') loadStudioSamples(); if(t.key==='picks') loadStudioPicks() }}
              style={{ flexShrink:0, minWidth:64, padding:'11px 8px', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, borderBottom:tab===t.key?'2px solid #c8102e':'2px solid transparent', transition:'all .15s', whiteSpace:'nowrap' }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:tab===t.key?'#c8102e':'rgba(255,255,255,.4)' }}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ padding:'18px 16px 32px' }}>

          {/* ORDER TAB - combined order form */}
          {tab==='order' && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {status==='done' && (
                <div style={{ background:'rgba(0,168,107,.12)', border:'1px solid rgba(0,168,107,.3)', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#00a86b', fontWeight:600 }}>
                  ✓ Order placed! We'll contact you on WhatsApp within 2 hours.
                </div>
              )}
              {/* Name */}
              <div>
                <p style={{ ...lblStyle, marginBottom:7 }}>Full Name</p>
                <input type="text" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
              {/* Phone */}
              <div>
                <p style={{ ...lblStyle, marginBottom:7 }}>Phone / WhatsApp</p>
                <input type="text" placeholder="+91 00000 00000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
              {/* Size */}
              <div>
                <p style={{ ...lblStyle, marginBottom:8 }}>Size</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {SIZES.map(s=>(
                    <button key={s} onClick={()=>setSize(s)}
                      style={{ padding:'7px 14px', border:`1.5px solid ${size===s?'#c8102e':'rgba(255,255,255,.2)'}`, background:size===s?'#c8102e':'rgba(255,255,255,.06)', borderRadius:4, fontSize:13, fontWeight:600, cursor:'pointer', color:'#fff' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Qty */}
              <div>
                <p style={{ ...lblStyle, marginBottom:7 }}>Quantity</p>
                <input type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}
                  style={{ width:100, background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
              {/* Design upload */}
              <div>
                <p style={{ ...lblStyle, marginBottom:8 }}>Your Design</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginBottom:10, lineHeight:1.6 }}>
                  Upload your design - it appears on the mockup above instantly. Or pick from Samples tab.
                </p>
                <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'20px 16px', border:'1.5px dashed rgba(255,255,255,.18)', borderRadius:10, cursor:'pointer', background:'rgba(255,255,255,.03)' }}>
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display:'none' }} onChange={handleFile} />
                  <span style={{ fontSize:28 }}>🎨</span>
                  <span style={{ fontSize:13, color:uploadedFile?'#00a86b':'rgba(255,255,255,.55)', fontWeight:600 }}>
                    {uploadedFile ? `✓ ${uploadedFile.name}` : 'Tap to upload your design'}
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.28)' }}>PNG · JPG · SVG · Max 20MB</span>
                </label>
                {selectedSample && (
                  <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(0,168,107,.1)', border:'1px solid rgba(0,168,107,.25)', borderRadius:8 }}>
                    <img src={selectedSample.image_url} alt="" style={{ width:32, height:32, borderRadius:4, objectFit:'cover' }} />
                    <span style={{ fontSize:12, color:'#00a86b', fontWeight:600 }}>✓ Sample: {selectedSample.name}</span>
                    <button onClick={()=>{ setSample(null); setDesignImg(null) }} style={{ marginLeft:'auto', background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:16 }}>×</button>
                  </div>
                )}
                {uploadErr && <div style={{ marginTop:8, fontSize:12, color:'#c8102e', background:'rgba(200,16,46,.1)', border:'1px solid rgba(200,16,46,.3)', borderRadius:8, padding:'8px 12px' }}>⚠ {uploadErr}</div>}
              </div>
              {/* Address */}
              <div>
                <p style={{ ...lblStyle, marginBottom:7 }}>Delivery Address</p>
                <textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows={3} placeholder="Full address with pincode"
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical' }} />
              </div>
              {status==='uploading' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'rgba(255,255,255,.6)', marginBottom:6 }}>
                    <span>Uploading design…</span><span>{uploadPct}%</span>
                  </div>
                  <div style={{ height:5, background:'rgba(255,255,255,.1)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${uploadPct}%`, background:'linear-gradient(90deg,#0a1f5d,#c8102e)', borderRadius:3, transition:'width .3s' }} />
                  </div>
                </div>
              )}
              <button onClick={handleSubmit} disabled={status==='saving'||status==='uploading'}
                style={{ width:'100%', padding:15, background:'#c8102e', border:'none', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(status==='saving'||status==='uploading')?.6:1 }}>
                {status==='uploading'?`Uploading… ${uploadPct}%`:status==='saving'?'Saving Order…':'Place Custom Order'}
              </button>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.25)', textAlign:'center', lineHeight:1.6 }}>Our team will contact you on WhatsApp within 2 hours to confirm pricing and delivery.</p>
            </div>
          )}

          {/* COLOUR TAB */}
          {tab==='colour' && (
            <div>
              <p style={lblStyle}>Cloth Colour</p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:18 }}>
                {SWATCHES.map(c=>(
                  <div key={c} onClick={()=>setColor(c)}
                    style={{ width:38, height:38, borderRadius:'50%', background:c, cursor:'pointer', border:c==='#ffffff'?'2px solid rgba(255,255,255,.35)':'2px solid transparent', boxShadow:color===c?'0 0 0 3px #0d1b3e, 0 0 0 5px #c8102e':'none', transition:'box-shadow .15s' }} />
                ))}
              </div>
              <p style={lblStyle}>Custom Colour</p>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ width:52, height:52, border:'none', borderRadius:8, cursor:'pointer', background:'none' }} />
            </div>
          )}

          {/* TEXT TAB */}
          {tab==='text' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <p style={lblStyle}>Text Overlay</p>
                <button onClick={()=>setTextOn(v=>!v)}
                  style={{ padding:'6px 14px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer', background:textOn?'#c8102e':'rgba(255,255,255,.08)', color:'#fff', border:'none' }}>
                  {textOn?'ON':'OFF'}
                </button>
              </div>
              {textOn && (<>
                <input type="text" value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder="Your custom text"
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'9px 12px', fontSize:14, color:'#fff', outline:'none', marginBottom:12, fontFamily:'inherit' }} />
                <p style={{ ...lblStyle, marginBottom:8 }}>Font</p>
                <select value={textFont} onChange={e=>setTextFont(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'#fff', outline:'none', marginBottom:14 }}>
                  {TEXT_FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                <p style={{ ...lblStyle, marginBottom:8 }}>Text Colour</p>
                <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  {['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#f5a623','#00a86b'].map(c=>(
                    <div key={c} onClick={()=>setTextColor(c)}
                      style={{ width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer', border:c==='#ffffff'?'2px solid rgba(255,255,255,.4)':'2px solid transparent', boxShadow:textColor===c?'0 0 0 3px #0d1b3e,0 0 0 5px #c8102e':'none' }} />
                  ))}
                  <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} style={{ width:30, height:30, border:'none', borderRadius:'50%', cursor:'pointer', background:'none' }} />
                </div>
                <div style={rowStyle}><p style={lblStyle}>Font Size</p><span style={{ fontSize:11, color:'#fff' }}>{textSize}px</span></div>
                <input type="range" min="14" max="72" step="2" value={textSize} onChange={e=>setTextSize(parseInt(e.target.value))} style={sliderStyle} />
              </>)}
              {!textOn && <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:8, lineHeight:1.65 }}>Enable to add custom text labels on the mockup preview.</p>}
            </div>
          )}

          {/* MOTION TAB - Design Position */}
          {tab==='motion' && (
            <div>
              <p style={{ ...lblStyle, marginBottom:14 }}>Adjust Design Position</p>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={rowStyle}><span style={lblStyle}>Move Up / Down</span><span style={{ fontSize:11, color:'#fff' }}>{designPosY}%</span></div>
                  <input type="range" min="15" max="75" value={designPosY} onChange={e=>setDesignPosY(Number(e.target.value))} style={sliderStyle} />
                </div>
                <div>
                  <div style={rowStyle}><span style={lblStyle}>Move Left / Right</span><span style={{ fontSize:11, color:'#fff' }}>{designPosX}%</span></div>
                  <input type="range" min="20" max="80" value={designPosX} onChange={e=>setDesignPosX(Number(e.target.value))} style={sliderStyle} />
                </div>
                <div>
                  <div style={rowStyle}><span style={lblStyle}>Design Size</span><span style={{ fontSize:11, color:'#fff' }}>{designScale}%</span></div>
                  <input type="range" min="10" max="65" value={designScale} onChange={e=>setDesignScale(Number(e.target.value))} style={sliderStyle} />
                </div>
                <div>
                  <div style={rowStyle}><span style={lblStyle}>Rotation</span><span style={{ fontSize:11, color:'#fff' }}>{designRot}°</span></div>
                  <input type="range" min="-45" max="45" value={designRot} onChange={e=>setDesignRot(Number(e.target.value))} style={sliderStyle} />
                </div>
                <button onClick={()=>{setDesignPosY(38);setDesignPosX(50);setDesignScale(38);setDesignRot(0)}}
                  style={{ padding:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  ↺ Reset Position
                </button>
              </div>
            </div>
          )}

          {/* EFFECTS TAB */}
          {tab==='effects' && (
            <div>
              <p style={{ ...lblStyle, marginBottom:10 }}>Filter Presets</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:18 }}>
                {FILTERS.map(f=>(
                  <button key={f.label} onClick={()=>setFilter(f.value)}
                    style={{ padding:'6px 11px', borderRadius:50, fontSize:11, fontWeight:600, cursor:'pointer', background:filter===f.value?'#0a1f5d':'rgba(255,255,255,.07)', color:filter===f.value?'#fff':'rgba(255,255,255,.55)', border:filter===f.value?'1px solid #c8102e':'1px solid rgba(255,255,255,.12)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={rowStyle}><p style={lblStyle}>Brightness</p><span style={{ fontSize:11, color:'#fff' }}>{brightness}%</span></div>
                  <input type="range" min="50" max="160" step="1" value={brightness} onChange={e=>setBrightness(parseInt(e.target.value))} style={sliderStyle} />
                </div>
                <div>
                  <div style={rowStyle}><p style={lblStyle}>Contrast</p><span style={{ fontSize:11, color:'#fff' }}>{contrast}%</span></div>
                  <input type="range" min="50" max="200" step="1" value={contrast} onChange={e=>setContrast(parseInt(e.target.value))} style={sliderStyle} />
                </div>
                <div>
                  <div style={rowStyle}><p style={lblStyle}>Saturation</p><span style={{ fontSize:11, color:'#fff' }}>{saturation}%</span></div>
                  <input type="range" min="0" max="250" step="1" value={saturation} onChange={e=>setSaturation(parseInt(e.target.value))} style={sliderStyle} />
                </div>
              </div>
              <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setFilter('')}}
                style={{ marginTop:14, width:'100%', padding:'9px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                ↺ Reset Effects
              </button>
            </div>
          )}

          {/* 360° TAB - Garment angle views */}
          {tab==='camera' && (
            <div>
              <p style={{ ...lblStyle, marginBottom:12 }}>View Angle</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[['⬜ Front','front'],['🔄 Back','back'],['◀ Left','left'],['▶ Right','right']].map(([label,val])=>(
                  <button key={val}
                    style={{ padding:'14px 8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.65)', border:'1px solid rgba(255,255,255,.1)', textAlign:'center' }}>
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', textAlign:'center', marginTop:16, lineHeight:1.6 }}>
                360° view coming soon. For now use the front view to preview your design.
              </p>
            </div>
          )}

          {/* SAMPLES TAB */}
          {tab==='samples' && (
            <div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:14, lineHeight:1.65 }}>
                Choose a ready-made design. It will appear on your T-shirt instantly.
              </p>
              {/* Category filter */}
              {studioSamples.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                  {['All', ...new Set(studioSamples.map(s=>s.category).filter(Boolean))].map(cat=>(
                    <button key={cat} onClick={()=>setStudioSampleCat(cat)}
                      style={{ padding:'4px 12px', borderRadius:100, fontSize:11, fontWeight:600, border:'1.5px solid', cursor:'pointer', transition:'all .15s',
                        borderColor: studioSampleCat===cat ? '#c8102e' : 'rgba(255,255,255,.2)',
                        background:  studioSampleCat===cat ? '#c8102e' : 'transparent',
                        color:       studioSampleCat===cat ? '#fff' : 'rgba(255,255,255,.5)' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {studioSamplesLoad ? (
                <div style={{ textAlign:'center', padding:32, color:'rgba(255,255,255,.4)', fontSize:13 }}>Loading designs…</div>
              ) : studioSamples.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, background:'rgba(255,255,255,.04)', borderRadius:10, color:'rgba(255,255,255,.35)', fontSize:13 }}>
                  No sample designs yet. Admin will add designs soon!
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {studioSamples
                    .filter(s => studioSampleCat==='All' || s.category===studioSampleCat)
                    .map(s => (
                      <div key={s.id}
                        onClick={()=>{ handleSamplePick(s); setTab('order') }}
                        style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${selectedSample?.id===s.id?'#c8102e':'rgba(255,255,255,.12)'}`, cursor:'pointer', background:'rgba(255,255,255,.05)', transition:'all .15s', position:'relative' }}>
                        <img src={s.image_url} alt={s.name}
                          style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                        {selectedSample?.id===s.id && (
                          <div style={{ position:'absolute', top:5, right:5, width:20, height:20, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:700 }}>✓</div>
                        )}
                        <div style={{ padding:'6px 8px' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.8)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                          {s.category && <div style={{ fontSize:9, color:'rgba(255,255,255,.4)' }}>{s.category}</div>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* STUDIO PICKS TAB - admin-curated products, shown only here */}
          {tab==='picks' && (
            <div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:14, lineHeight:1.65 }}>
                Admin-curated garments exclusively for the Studio. Click one to select it as your base garment.
              </p>
              {studioPicksLoad ? (
                <div style={{ textAlign:'center', padding:32, color:'rgba(255,255,255,.4)', fontSize:13 }}>Loading…</div>
              ) : studioPicks.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, background:'rgba(255,255,255,.04)', borderRadius:10, color:'rgba(255,255,255,.35)', fontSize:13 }}>
                  No Studio Picks yet. Admin will add exclusive products soon!
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                  {studioPicks.map(p => (
                    <div key={p.id}
                      onClick={()=>{ setGarment(p.category==='Hoodies'?'Hoodie':p.category==='Polos'?'Polo':p.category==='Joggers'?'Joggers':'T-Shirt'); setTab('order') }}
                      style={{ borderRadius:10, overflow:'hidden', border:'1.5px solid rgba(255,255,255,.12)', cursor:'pointer', background:'rgba(255,255,255,.05)', transition:'all .15s', position:'relative' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#c8102e'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.12)'}>
                      <div style={{ background:'#f8f8f8', height:120, display:'flex', alignItems:'center', justifyContent:'center', fontSize:60, position:'relative' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                          : p.emoji}
                        <span style={{ position:'absolute', top:6, left:6, background:'#c8102e', color:'#fff', fontSize:8, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'2px 7px', borderRadius:2 }}>
                          {p.tag || 'Studio'}
                        </span>
                      </div>
                      <div style={{ padding:'8px 10px' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.9)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', marginBottom:4 }}>{p.category} · ₹{Number(p.price).toLocaleString()}</div>
                        <div style={{ fontSize:9, fontWeight:700, color:'#c8102e', textTransform:'uppercase', letterSpacing:'.08em' }}>⭐ Studio Exclusive</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── LIVE T-SHIRT CANVAS PREVIEW SECTION ── */}
      <div style={{ background:'#fff', padding:'48px 16px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <span className="sec-label" style={{ color:'#c8102e' }}>Live Preview</span>
            <h2 className="sec-title">DESIGN ON FABRIC</h2>
            <p style={{ fontSize:13, color:'#888', marginTop:6 }}>Upload your design and see it printed on the garment in real-time.</p>
          </div>
          <div style={{ display:'flex', gap:32, flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>
            {/* Live canvas preview - reads from StudioPage state */}
            <LiveTshirtPreview designImg={designImg} garmentType={garment} garmentColor={color} />
            {/* Mini controls */}
            <div style={{ flex:'1 1 220px', maxWidth:280 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#333', marginBottom:10, letterSpacing:'.08em', textTransform:'uppercase' }}>How it works</p>
              {[['1️⃣','Go to Studio → choose a garment and colour above'],['2️⃣','Upload your design or pick a sample'],['3️⃣','See it appear on the fabric here instantly'],['4️⃣','Adjust position and scale in Position tab']].map(([e,t])=>(
                <div key={e} style={{ display:'flex', gap:10, marginBottom:12, fontSize:13, color:'#555', lineHeight:1.6 }}>
                  <span style={{ flexShrink:0 }}>{e}</span><span>{t}</span>
                </div>
              ))}
              <div style={{ background:'rgba(200,16,46,.04)', border:'1px solid rgba(200,16,46,.12)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#888', lineHeight:1.7, marginTop:8 }}>
                The design is composited directly onto the garment shape using canvas - same technique used by Blinkstore and Qikink for their previews.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3D IMAGE VIEWER SECTION ── */}
      <ThreeDImageViewer />

    </div>
  )
}

function HomePage({ user, onNav, cart, onAddToCart }) {
  const products = usePublicProducts()
  return (
    <div>
      {/* Hero Banner */}
      <div style={{ background:'linear-gradient(135deg,#0a1f5d 0%,#1a0a2e 100%)', padding:'48px 20px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 50%,rgba(200,16,46,.18) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1, padding:'0 4px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,16,46,.18)', border:'1px solid rgba(200,16,46,.35)', borderRadius:100, padding:'5px 14px', marginBottom:16 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#c8102e' }} />
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.22em', textTransform:'uppercase', color:'#c8102e' }}>Tamil Nadu's #1 Custom Print</span>
          </div>
          <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(30px,8vw,70px)', color:'#fff', letterSpacing:'.02em', lineHeight:1.05, marginBottom:14 }}>
            YOUR DESIGN.<br/><span style={{ color:'#c8102e' }}>YOUR STYLE.</span> YOUR DRYNN.
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.65)', maxWidth:440, lineHeight:1.8, marginBottom:24 }}>
            Upload artwork, pick a garment, and we deliver premium custom clothing across India in 5-7 days.
          </p>
          <div className="hero-cta" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button className="btn-primary" style={{ padding:'13px 26px', fontSize:14 }} onClick={()=>onNav('studio')}>Design Now</button>
            <button onClick={()=>onNav('products')} style={{ padding:'13px 26px', fontSize:14, background:'rgba(255,255,255,.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,.3)', borderRadius:4, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>Shop Products</button>
          </div>
        </div>
      </div>

      {/* Feature bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0' }}>
        <div className="feature-bar" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'0 16px' }}>
          {[
            { icon:'🚚', label:'Free Delivery', sub:'Above ₹1,500' },
            { icon:'↩️', label:'Easy Returns',  sub:'Manufacturing defects' },
            { icon:'🔒', label:'Secure Pay',    sub:'UPI · Razorpay · Secure' },
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
      <div style={{ padding:'32px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div><span className="sec-label">Our Collection</span><h2 className="sec-title">FEATURED PRODUCTS</h2></div>
            <button className="btn-secondary" style={{ padding:'9px 18px', fontSize:12 }} onClick={()=>onNav('products')}>View All →</button>
          </div>
          <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {products.slice(0,4).map(p => (
              <div key={p.id} className="product-card" onClick={()=>onNav('products')}>
                <div style={{ background:'#f8f8f8', height:200, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, position:'relative', overflow:'hidden' }}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : p.emoji}
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
      <div style={{ background:'#f8f8f8', padding:'40px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ textAlign:'center', display:'block' }}>Process</span>
          <h2 className="sec-title" style={{ textAlign:'center', marginBottom:32 }}>HOW IT WORKS</h2>
          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {STEPS.map((s,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, padding:'20px 20px', borderTop:`3px solid ${s.color}`, textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:40, color:s.color, lineHeight:1, marginBottom:8 }}>{s.num}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div style={{ padding:'40px 20px' }}>
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
        <p style={{ color:'rgba(255,255,255,.7)', fontSize:14, marginBottom:24 }}>Free delivery above ₹1,500 · UPI & Razorpay · Delivered in 5-7 days</p>
        <button className="btn-primary" style={{ fontSize:14, padding:'14px 32px', background:'#fff', color:'#c8102e' }} onClick={()=>onNav('studio')}>Start Designing →</button>
      </div>
    </div>
  )
}

// ── Product Detail Page ──────────────────────────────────────
function ProductDetailPage({ product, onBack, onAddToCart }) {
  const [size,     setSize]     = useState('M')
  const [color,    setColor]    = useState(product.color || '#ffffff')
  const [qty,      setQty]      = useState(1)
  const [added,    setAdded]    = useState(false)

  const handleAdd = () => {
    onAddToCart({ ...product, size, color, qty })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Back bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'12px 20px', display:'flex', alignItems:'center', gap:10, position:'sticky', top:56, zIndex:10 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#555' }}>←</button>
        <span style={{ fontSize:13, fontWeight:600, color:'#555' }}>Products</span>
        <span style={{ color:'#ccc' }}>›</span>
        <span style={{ fontSize:13, fontWeight:600, color:'#0a0a0a', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{product.name}</span>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
          {/* Image */}
          <div style={{ flex:'0 0 auto', width:'100%', maxWidth:340 }}>
            <div style={{ background:'#f8f8f8', borderRadius:12, height:320, display:'flex', alignItems:'center', justifyContent:'center', fontSize:140, position:'relative', overflow:'hidden' }}>
              {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : product.emoji}
              <div style={{ position:'absolute', top:14, left:14, background:product.tagColor, color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'4px 10px', borderRadius:3 }}>{product.tag}</div>
            </div>
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:260 }}>
            <p style={{ fontSize:11, color:'#aaa', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>{product.category}</p>
            <h1 style={{ fontSize:22, fontWeight:700, marginBottom:10, lineHeight:1.2 }}>{product.name}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <StarRating rating={product.rating} />
              <span style={{ fontSize:12, color:'#aaa' }}>({product.reviews} reviews)</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:28, fontWeight:700, color:'#0a0a0a' }}>₹{product.price.toLocaleString()}</span>
              <span style={{ fontSize:15, color:'#aaa', textDecoration:'line-through' }}>₹{product.mrp.toLocaleString()}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#00a86b' }}>{disc(product.price,product.mrp)}% off</span>
            </div>
            <div style={{ fontSize:12, color:'#00a86b', fontWeight:600, marginBottom:20 }}>In stock · Free delivery above ₹1,500</div>

            {/* Size */}
            <div style={{ marginBottom:18 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', marginBottom:10 }}>Size</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {SIZES.map(s => (
                  <button key={s} className={`size-btn${size===s?' active':''}`} onClick={()=>setSize(s)}>{s}</button>
                ))}
              </div>
            </div>

            {/* Colour */}
            <div style={{ marginBottom:18 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', marginBottom:10 }}>Colour</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {SWATCHES.map(c => (
                  <div key={c} className={`swatch${c===color?' active':''}${c==='#ffffff'?' white':''}`} onClick={()=>setColor(c)} style={{ background:c }} />
                ))}
              </div>
            </div>

            {/* Qty */}
            <div style={{ marginBottom:24 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', marginBottom:10 }}>Quantity</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:34, height:34, borderRadius:'50%', border:'1.5px solid #e0e0e0', background:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>-</button>
                <span style={{ fontSize:16, fontWeight:700, minWidth:24, textAlign:'center' }}>{qty}</span>
                <button onClick={()=>setQty(q=>q+1)} style={{ width:34, height:34, borderRadius:'50%', border:'1.5px solid #e0e0e0', background:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            </div>

            <button className="btn-primary" style={{ width:'100%', padding:15, fontSize:14, marginBottom:10 }} onClick={handleAdd}>
              {added ? '✓ Added to Cart!' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Details */}
        <div style={{ marginTop:36, padding:'24px', background:'#f8f8f8', borderRadius:12 }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Product Details</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
            {[
              ['Material',  '100% Pre-shrunk Cotton'],
              ['Print',     'Heat Press Technology'],
              ['Delivery',  '5-7 Working Days'],
              ['Payment',   'UPI & Razorpay'],
              ['Returns',   'Manufacturing defects only'],
              ['Support',   'WhatsApp: +91 99447 61306'],
            ].map(([k,v]) => (
              <div key={k} style={{ background:'#fff', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Products Listing Page ─────────────────────────────────────
function ProductsPage({ onAddToCart, onNav }) {
  const products  = usePublicProducts()
  const [activeTab,    setActiveTab]    = useState('All')
  const [sort,         setSort]         = useState('popular')
  const [wishlist,     setWishlist]     = useState([])
  const [search,       setSearch]       = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const categories = ['All','T-Shirts','Hoodies','Polos','Joggers']

  const filtered = products
    .filter(p => activeTab === 'All' || p.category === activeTab)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))

  const sorted = [...filtered].sort((a,b) =>
    sort==='price-asc' ? a.price-b.price :
    sort==='price-desc' ? b.price-a.price :
    b.reviews-a.reviews
  )

  if (selectedProduct) return (
    <ProductDetailPage
      product={selectedProduct}
      onBack={()=>setSelectedProduct(null)}
      onAddToCart={(p)=>{ onAddToCart(p); setSelectedProduct(null) }}
    />
  )

  return (
    <div style={{ padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Our Collection</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>ALL PRODUCTS</h1>
        </div>
      </div>

      {/* Search + Tabs + Sort */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:10 }}>
        {/* Search bar */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'10px 20px 0' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#aaa' }}>🔍</span>
            <input
              className="input-field"
              placeholder="Search products..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:38, borderRadius:50, fontSize:13 }}
            />
            {search && (
              <button onClick={()=>setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#aaa' }}>×</button>
            )}
          </div>
        </div>
        {/* Tabs + sort */}
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
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 20px' }}>
        <p style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>{sorted.length} product{sorted.length!==1?'s':''}{search?` for "${search}"`:''}</p>
        {sorted.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <p style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>No products found</p>
            <p style={{ fontSize:13, color:'#aaa' }}>Try a different search or category</p>
          </div>
        ) : (
          <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {sorted.map(p => (
              <div key={p.id} className="product-card" onClick={()=>setSelectedProduct(p)}>
                <div style={{ background:'#f8f8f8', height:200, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, position:'relative', overflow:'hidden' }}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : p.emoji}
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
                  <button className="btn-primary" style={{ width:'100%', padding:'9px', fontSize:12 }} onClick={e=>{ e.stopPropagation(); onAddToCart(p) }}>Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Order CTA */}
      {onNav && (
        <div style={{ margin:'0 20px 32px', background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', borderRadius:12, padding:'20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer' }} onClick={()=>onNav('group')}>
          <span style={{ fontSize:36, flexShrink:0 }}>👥</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:20, color:'#fff', letterSpacing:'.05em', marginBottom:2 }}>GROUP ORDER?</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', lineHeight:1.5 }}>Bulk discount for 10+ pieces · Teams, colleges, events</div>
          </div>
          <span style={{ color:'#c8102e', fontSize:20, flexShrink:0 }}>›</span>
        </div>
      )}
    </div>
  )
}

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfhdyp4oq'
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'drynn_uploads'

async function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    formData.append('folder', 'drynn/designs')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded/e.total)*100)) }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url)
      else reject(new Error('Cloudinary upload failed: ' + xhr.responseText))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

function AboutPage({ onNav }) {
  const [openFaq, setOpenFaq] = useState(null)
  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'48px 16px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 60%,rgba(200,16,46,.15) 0%,transparent 60%)', pointerEvents:'none' }} />
        <button onClick={()=>onNav('home')} style={{ position:'absolute', top:16, left:16, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, zIndex:2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <div style={{ position:'relative', zIndex:1 }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Our Story</span>
          <h1 className="sec-title" style={{ color:'#fff', marginBottom:12 }}>ABOUT DRYNN</h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.65)', maxWidth:480, margin:'0 auto', lineHeight:1.8 }}>Premium custom print clothing from the heart of Tamil Nadu.</p>
        </div>
      </div>

      {/* Story */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 20px' }}>
        <div style={{ display:'grid', gap:32 }}>
          {[
            { title:'Who We Are', color:'#c8102e', text:'DRYNN is a custom garment printing service based in Tamil Nadu, India. We bring your designs to life on premium quality t-shirts, hoodies, polos, and joggers  -  delivered right to your door.' },
            { title:'Our Mission', color:'#0a1f5d', text:"We believe everyone deserves to wear exactly what they imagine. From individual pieces to bulk corporate orders, we treat every print with the same precision and care." },
            { title:"Quality First", color:"#00a86b", text:"We use heat press printing technology on pre-shrunk, premium fabrics. Every order goes through quality checks before dispatch. If it's not right, we reprint it - simple as that." },
            { title:'Delivery',    color:'#f5a623', text:'We deliver across India in 5-7 working days. For bulk orders of 10+ pieces, contact us on WhatsApp for custom pricing and express timelines.' },
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
          {[['500+','Orders Completed'],['5★','Average Rating'],['5-7d','Delivery']].map(([n,l])=>(
            <div key={l} style={{ background:'#f8f8f8', borderRadius:10, padding:'20px 20px' }}>
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

function ContactPage({ onNav }) {
  const [sent, setSent]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ name:'', phone:'', email:'', message:'' })

  const handle = async () => {
    if (!form.name || !form.phone) { alert('Please fill your name and phone.'); return }
    setSaving(true); setError('')
    try {
      const submittedAt = new Date().toISOString()

      // Save to Supabase
      const { error: dbErr } = await supabase.from('drynn_contacts').insert({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        message: form.message || null,
        submitted_at: submittedAt,
      })
      if (dbErr) {
        console.error('[Contact] Supabase drynn_contacts insert failed:', dbErr.message)
        // Non-fatal - still send to Google Sheet
      }

      // Send to Google Sheet webhook
      if (GOOGLE_SHEET_WEBHOOK) {
        fetch(GOOGLE_SHEET_WEBHOOK, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet: 'DRYNN_Contacts', ...form, submittedAt }),
        }).catch(e => console.error('[Contact] Google Sheets webhook failed:', e.message))
      }

      setSent(true)
      setForm({ name:'', phone:'', email:'', message:'' })
    } catch (e) {
      console.error('[Contact] Unexpected error during form submission:', e.message)
      setError(`[Contact Form Error] Area: Contact submission · Reason: ${e.message || 'Unknown'}. Please WhatsApp us at +91 99447 61306.`)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Get In Touch</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>CONTACT US</h1>
        </div>
      </div>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>
        {sent ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
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
                { icon:'⏰', label:'Hours',     value:'Mon-Sat 9am-7pm',   color:'#0a1f5d' },
                { icon:'📦', label:'Delivery',  value:'5-7 working days',  color:'#f5a623' },
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
            <button className="btn-primary" style={{ padding:15, fontSize:13, opacity:saving?.6:1 }} onClick={handle} disabled={saving}>{saving ? 'Sending…' : 'Send Message'}</button>
            <p style={{ fontSize:12, color:'#aaa', textAlign:'center' }}>Or WhatsApp us directly at <strong>+91 99447 61306</strong></p>
            {error && <div style={{ fontSize:13, color:'#c8102e', background:'rgba(200,16,46,.05)', border:'1px solid rgba(200,16,46,.2)', borderRadius:6, padding:'10px 14px', textAlign:'center', marginTop:-8 }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function CartPage({ cart, onRemove, onClear, user, onNav }) {
  const total      = cart.reduce((s,i) => s + i.price * i.qty, 0)
  const shipping   = total >= 1500 ? 0 : 99
  const grandTotal = total + shipping

  const [step,   setStep]   = React.useState('cart')
  const [saving, setSaving] = React.useState(false)
  const [form,   setForm]   = React.useState({
    name: '', phone: '', address: '', pincode: '', payment: 'upi',
  })

  const placeOrder = async () => {
    if (!form.name || !form.phone || !form.address || !form.pincode) {
      alert('Please fill all delivery details.'); return
    }
    setSaving(true)
    try {
      const orderId  = crypto.randomUUID()
      const placedAt = new Date().toISOString()
      const itemsSummary = cart.map(i => `${i.name} x${i.qty}`).join(', ')
      const { error: dbErr } = await supabase.from('drynn_orders').insert({
        id: orderId, user_id: user?.id || null, name: form.name, phone: form.phone,
        address: `${form.address}, ${form.pincode}`, garment: itemsSummary,
        color: 'Various', size: 'Various', qty: cart.reduce((s,i) => s + i.qty, 0),
        design_file: 'catalog-order', status: 'pending', placed_at: placedAt,
      })
      if (dbErr) {
        console.error('[Cart → Supabase] Order insert failed:', dbErr.message)
        alert(`[Order Save Failed]\n\nArea: Supabase drynn_orders (cart checkout)\nReason: ${dbErr.message}\n\nPlease WhatsApp us at +91 99447 61306 with your order details.`)
      }
      if (GOOGLE_SHEET_WEBHOOK) fetch(GOOGLE_SHEET_WEBHOOK, {
        method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sheet:'DRYNN_Orders', orderId, name:form.name, phone:form.phone, address:form.address, pincode:form.pincode, items:itemsSummary, total:grandTotal, payment:form.payment, placedAt }),
      }).catch(e => console.error('[Cart → Google Sheets] Webhook failed:', e.message))
      onClear(); setStep('done')
    } catch(e) {
      console.error('[Cart] Unexpected error during checkout:', e.message)
      alert(`[Checkout Error]\n\nArea: Cart checkout\nReason: ${e.message || 'Unknown error'}\n\nPlease try again or WhatsApp us at +91 99447 61306.`)
    }
    finally { setSaving(false) }
  }

  if (step === 'done') return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Order Placed</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>THANK YOU!</h1>
        </div>
      </div>
      <div style={{ textAlign:'center', padding:'64px 16px', maxWidth:480, margin:'0 auto' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, marginBottom:12 }}>ORDER CONFIRMED!</h2>
        <p style={{ fontSize:14, color:'#555', lineHeight:1.8, marginBottom:28 }}>We received your order and will WhatsApp you within 2 hours to confirm printing and delivery.</p>
        <div style={{ background:'#f8f8f8', borderRadius:12, padding:'20px', marginBottom:24, textAlign:'left' }}>
          {[['Payment','UPI / Razorpay (link sent on WhatsApp)'],['Delivery','5-7 working days'],['Support','WhatsApp: +91 99447 61306']].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #eee', fontSize:13 }}>
              <span style={{ color:'#888' }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'checkout') return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Step 2 of 2</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>DELIVERY DETAILS</h1>
        </div>
      </div>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ background:'#f8f8f8', borderRadius:10, padding:'16px 20px', marginBottom:28 }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#888', marginBottom:10 }}>Order Summary</p>
          {cart.map((item,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
              <span>{item.name} × {item.qty}</span>
              <span style={{ fontWeight:600 }}>₹{(item.price*item.qty).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid #e0e0e0', marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'#888' }}>Shipping</span>
            <span style={{ color:shipping===0?'#00a86b':'#0a0a0a', fontWeight:600 }}>{shipping===0?'FREE':`₹${shipping}`}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:700, marginTop:6 }}>
            <span>Total</span><span style={{ color:'#c8102e' }}>₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Full Name *</label>
            <input className="input-field" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>WhatsApp Number *</label>
            <input className="input-field" placeholder="+91 00000 00000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Delivery Address *</label>
            <textarea className="input-field" rows={3} placeholder="House/Flat no, Street, Area, City" style={{ resize:'vertical' }} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          <div><label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Pincode *</label>
            <input className="input-field" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value})} style={{ maxWidth:160 }} /></div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:10 }}>Payment Method</label>
            <div style={{ padding:'14px 16px', border:'2px solid #c8102e', borderRadius:8, background:'rgba(200,16,46,.04)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>📱</span>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#c8102e' }}>UPI / Razorpay</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>We'll send a payment link on WhatsApp within 30 minutes.</div>
              </div>
            </div>
          </div>
          <button className="btn-primary" style={{ padding:15, fontSize:14, opacity:saving?.6:1 }} onClick={placeOrder} disabled={saving}>
            {saving?'Placing Order…':`Place Order · ₹${grandTotal.toLocaleString()}`}
          </button>
          <button onClick={()=>setStep('cart')} style={{ padding:12, fontSize:13, background:'none', border:'none', cursor:'pointer', color:'#888', textDecoration:'underline' }}>← Back to Cart</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <button onClick={()=>onNav('products')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>My Cart</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>SHOPPING CART</h1>
        </div>
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'28px 20px' }}>
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
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#888', marginBottom:8 }}>
                <span>Subtotal</span><span>₹{total.toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:12 }}>
                <span style={{ color:'#888' }}>Shipping</span>
                <span style={{ color:shipping===0?'#00a86b':'#0a0a0a', fontWeight:600 }}>{shipping===0?'🎉 FREE':`₹${shipping}`}</span>
              </div>
              {shipping>0 && <p style={{ fontSize:11, color:'#00a86b', marginBottom:12 }}>Add ₹{(1500-total).toLocaleString()} more for free shipping!</p>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>Total</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#c8102e' }}>₹{grandTotal.toLocaleString()}</span>
              </div>
              <button className="btn-primary" style={{ width:'100%', padding:15, fontSize:14, marginBottom:10 }} onClick={()=>setStep('checkout')}>Proceed to Checkout →</button>
              <button onClick={onClear} style={{ width:'100%', padding:12, fontSize:13, background:'none', border:'1px solid #e0e0e0', borderRadius:4, cursor:'pointer', color:'#888' }}>Clear Cart</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MY ORDERS PAGE
// ══════════════════════════════════════════════════════════════
function OrdersPage({ user, onBack, onNav }) {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState('')
  const [selected, setSelected] = useState(null)
  const [histTab,  setHistTab]  = useState('active')  // active | history | all
  const [search,   setSearch]   = useState('')

  const loadOrders = async () => {
    if (!user) { setLoading(false); setLoadErr('You must be logged in to view orders.'); return }
    setLoading(true); setLoadErr('')
    const { data, error } = await supabase
      .from('drynn_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
    setLoading(false)
    if (error) {
      setLoadErr(`Failed to load orders from database. (Supabase: ${error.message})`)
      return
    }
    setOrders(data || [])
  }

  useEffect(() => { loadOrders() }, [user])

  // History = Delivered. Active = everything else.
  const HISTORY_STATUSES = ['Delivered']
  const ACTIVE_STATUSES  = ['Received','Approved','Printing','Packed','Shipped']

  const filteredOrders = orders.filter(o => {
    const s = o.status || 'Received'
    const matchTab =
      histTab === 'all'     ? true :
      histTab === 'history' ? HISTORY_STATUSES.includes(s) :
                              ACTIVE_STATUSES.includes(s)   // 'active'
    const matchSearch = !search.trim() ||
      o.garment?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.name?.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = {
    active:  orders.filter(o => ACTIVE_STATUSES.includes(o.status  || 'Received')).length,
    history: orders.filter(o => HISTORY_STATUSES.includes(o.status || 'Received')).length,
    all:     orders.length,
  }

  const STATUS_COLORS = {
    Received: { bg:'#fff8e1', color:'#f5a623', border:'#ffe082' },
    Approved: { bg:'#e8f0fe', color:'#0a1f5d', border:'#c5d3f6' },
    Printing: { bg:'#f3e5f5', color:'#9b59b6', border:'#e1bee7' },
    Packed:   { bg:'#e8f5e9', color:'#00a86b', border:'#c8e6c9' },
    Shipped:  { bg:'#fce4ec', color:'#c8102e', border:'#f8bbd0' },
    Delivered:{ bg:'#e8f5e9', color:'#00a86b', border:'#c8e6c9' },
  }
  const STATUS_STEPS = ['Received','Approved','Printing','Packed','Shipped','Delivered']

  // Order detail view
  if (selected) {
    const sc = STATUS_COLORS[selected.status] || STATUS_COLORS['Received']
    const stepIdx = STATUS_STEPS.indexOf(selected.status)
    const isConfirmed = ['Packed','Shipped','Delivered'].includes(selected.status)
    return (
      <div>
        <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'20px 20px' }}>
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>← My Orders</button>
            <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Order Details</span>
            <h1 className="sec-title" style={{ color:'#fff', fontSize:'clamp(22px,5vw,36px)' }}>#{selected.id?.slice(0,8).toUpperCase()}</h1>
          </div>
        </div>
        <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 20px' }}>

          {/* ORDER CONFIRMED banner */}
          {isConfirmed && (
            <div style={{ background:'linear-gradient(135deg,#00a86b,#00c47a)', borderRadius:14, padding:'20px 20px', marginBottom:24, display:'flex', alignItems:'center', gap:14, boxShadow:'0 4px 20px rgba(0,168,107,.25)' }}>
              <div style={{ fontSize:44, flexShrink:0 }}>✅</div>
              <div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:24, color:'#fff', letterSpacing:'.06em' }}>ORDER CONFIRMED!</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.85)', marginTop:2 }}>Your order is on its way. Thank you for shopping with DRYNN!</div>
              </div>
            </div>
          )}

          {/* Status badge */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <span style={{ fontSize:12, color:'#888' }}>{selected.placed_at ? new Date(selected.placed_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '-'}</span>
            <span style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{selected.status || 'Received'}</span>
          </div>

          {/* Order info card */}
          <div style={{ border:'1px solid #f0f0f0', borderRadius:12, padding:'18px', marginBottom:24 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#aaa', marginBottom:14 }}>Order Summary</p>
            {[
              ['Item(s)', selected.garment || '-'],
              ['Size',    selected.size    || '-'],
              ['Qty',     selected.qty     || '-'],
              ['Payment', 'UPI / Razorpay'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8f8f8', fontSize:13 }}>
                <span style={{ color:'#888' }}>{k}</span>
                <span style={{ fontWeight:600, maxWidth:'60%', textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Progress stepper */}
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#c8102e', marginBottom:18 }}>Order Progress</p>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {STATUS_STEPS.map((step, i) => {
              const done   = i < stepIdx
              const active = i === stepIdx
              const pend   = i > stepIdx
              const isLast = i === STATUS_STEPS.length - 1
              return (
                <div key={step} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:done?'#00a86b':active?'#c8102e':'#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, boxShadow:active?'0 0 0 4px rgba(200,16,46,.15)':'none', transition:'all .3s' }}>
                      {done  && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                      {active && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                    </div>
                    {!isLast && <div style={{ width:2, height:34, background:done?'#00a86b':'#eeeeee', marginTop:2, transition:'background .3s' }} />}
                  </div>
                  <div style={{ paddingBottom: isLast?0:28 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:pend?'#ccc':active?'#c8102e':'#0a0a0a' }}>{step}</div>
                    <div style={{ fontSize:11, color:done?'#00a86b':active?'#c8102e':'#ccc', fontWeight:600, marginTop:1 }}>
                      {done?'✓ Completed':active?'● In Progress':'Pending'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background:'#f8f8f8', borderRadius:10, padding:'14px 16px', marginTop:24, fontSize:13, color:'#555', lineHeight:1.7 }}>
            📲 WhatsApp updates sent at every stage. Need help? <strong>+91 99447 61306</strong>
          </div>
        </div>
      </div>
    )
  }

  // ── Filter logic ──────────────────────────────────────────
  const ACTIVE_S    = ['Received','Approved','Printing','Packed','Shipped']
  const COMPLETED_S = ['Delivered']

  const filteredOrders = orders
    .filter(o => {
      const s = o.status || 'Received'
      if (histTab === 'active')    return ACTIVE_S.includes(s)
      if (histTab === 'completed') return COMPLETED_S.includes(s)
      return true
    })
    .filter(o =>
      !search ||
      (o.garment||'').toLowerCase().includes(search.toLowerCase()) ||
      (o.id||'').toLowerCase().includes(search.toLowerCase())
    )

  const activeCount    = orders.filter(o => ACTIVE_S.includes(o.status || 'Received')).length
  const completedCount = orders.filter(o => COMPLETED_S.includes(o.status)).length

  return (
    <div>
      {/* Header */}
      <div style={{ background:'linear-gradient(90deg,#0a1f5d,#1a0a2e)', padding:'28px 20px' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>← Account</button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>My Account</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>MY ORDERS</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginTop:4 }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* History Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:10 }}>
        <div style={{ maxWidth:600, margin:'0 auto', display:'flex' }}>
          {[
            { key:'active',    label:'Active',     count: activeCount    },
            { key:'completed', label:'History',    count: completedCount },
            { key:'all',       label:'All Orders', count: orders.length  },
          ].map(t => (
            <button key={t.key} onClick={() => setHistTab(t.key)}
              style={{ flex:1, padding:'13px 8px', background:'none', border:'none', borderBottom: histTab===t.key ? '2px solid #c8102e' : '2px solid transparent', cursor:'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <span style={{ fontSize:13, fontWeight:700, color: histTab===t.key ? '#c8102e' : '#888' }}>{t.label}</span>
              <span style={{ fontSize:10, fontWeight:700, background: histTab===t.key ? 'rgba(200,16,46,.1)' : '#f5f5f5', color: histTab===t.key ? '#c8102e' : '#bbb', borderRadius:50, padding:'1px 8px', minWidth:20, textAlign:'center' }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'16px 20px' }}>

        {/* Stats summary */}
        {!loading && orders.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
            {[
              { label:'Total',     value: orders.length,    color:'#0a1f5d' },
              { label:'Active',    value: activeCount,      color:'#f5a623' },
              { label:'Delivered', value: completedCount,   color:'#00a86b' },
            ].map(s => (
              <div key={s.label} style={{ background:'#f8f8f8', borderRadius:10, padding:'14px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:30, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!loading && orders.length > 2 && (
          <div style={{ position:'relative', marginBottom:16 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#aaa' }}>🔍</span>
            <input className="input-field" placeholder="Search by garment or order ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:38, borderRadius:50, fontSize:13 }} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#aaa' }}>×</button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:'56px 0' }}>
            <div style={{ width:36, height:36, border:'3px solid #f0f0f0', borderTopColor:'#c8102e', borderRadius:'50%', animation:'drynn-spin .7s linear infinite', margin:'0 auto 14px' }} />
            <p style={{ fontSize:13, color:'#aaa' }}>Loading your orders...</p>
          </div>

        ) : loadErr ? (
          <div style={{ textAlign:'center', padding:'48px 16px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
            <p style={{ fontSize:14, color:'#c8102e', fontWeight:600, marginBottom:8 }}>{loadErr}</p>
            <button className="btn-primary" style={{ padding:'10px 24px', fontSize:13 }} onClick={loadOrders}>Retry</button>
          </div>

        ) : orders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'64px 16px' }}>
            <div style={{ fontSize:64, marginBottom:14 }}>📦</div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, marginBottom:8 }}>NO ORDERS YET</h2>
            <p style={{ color:'#aaa', fontSize:13, lineHeight:1.7, marginBottom:24 }}>
              You have not placed any orders yet.<br/>Start shopping to see your order history here!
            </p>
            <button className="btn-primary" style={{ padding:'12px 28px', fontSize:13 }}
              onClick={() => onNav && onNav('products')}>Shop Now →</button>
          </div>

        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No orders found</p>
            <p style={{ fontSize:13, color:'#aaa' }}>
              {search ? `No results for "${search}"` : `No ${histTab} orders`}
            </p>
          </div>

        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {filteredOrders.map((order, idx) => {
              const sc          = STATUS_COLORS[order.status] || STATUS_COLORS['Received']
              const isConfirmed = ['Packed','Shipped','Delivered'].includes(order.status)
              const isDelivered = order.status === 'Delivered'
              const placedDate  = order.placed_at ? new Date(order.placed_at) : null
              const daysSince   = placedDate ? Math.floor((Date.now() - placedDate.getTime()) / 86400000) : null
              const stepIdx     = STATUS_STEPS.indexOf(order.status || 'Received')

              // Month separator for history grouping
              const showSeparator = idx === 0 || (
                placedDate &&
                filteredOrders[idx-1].placed_at &&
                new Date(filteredOrders[idx-1].placed_at).getMonth() !== placedDate.getMonth()
              )

              return (
                <div key={order.id}>
                  {/* Month/year separator */}
                  {showSeparator && placedDate && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, margin: idx===0 ? '0 0 14px' : '20px 0 14px' }}>
                      <div style={{ flex:1, height:1, background:'#f0f0f0' }} />
                      <span style={{ fontSize:10, fontWeight:700, color:'#bbb', letterSpacing:'.14em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                        {placedDate.toLocaleDateString('en-IN',{ month:'long', year:'numeric' })}
                      </span>
                      <div style={{ flex:1, height:1, background:'#f0f0f0' }} />
                    </div>
                  )}

                  {/* Order card */}
                  <div onClick={() => setSelected(order)}
                    style={{ border:`1.5px solid ${isDelivered ? 'rgba(0,168,107,.2)' : '#f0f0f0'}`, borderRadius:12, padding:'16px', cursor:'pointer', transition:'box-shadow .2s, transform .15s', position:'relative', overflow:'hidden', background: isDelivered ? 'rgba(0,168,107,.02)' : '#fff', marginBottom:14 }}
                    onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,.10)'; e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>

                    {/* Status ribbon */}
                    {isConfirmed && (
                      <div style={{ position:'absolute', top:0, right:0, background: isDelivered ? '#00a86b' : '#0a7abf', color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', padding:'4px 12px', borderBottomLeftRadius:8 }}>
                        {isDelivered ? '✓ DELIVERED' : '✓ CONFIRMED'}
                      </div>
                    )}

                    {/* Top row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, paddingRight: isConfirmed ? 90 : 0 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(order.garment||'Custom Order').length > 32 ? (order.garment||'Custom Order').slice(0,32)+'...' : (order.garment||'Custom Order')}
                        </p>
                        <p style={{ fontSize:11, color:'#aaa' }}>
                          {placedDate ? placedDate.toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' }) : '-'}
                          {daysSince !== null && (
                            <span style={{ marginLeft:8, color:'#ccc' }}>
                              {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}
                            </span>
                          )}
                        </p>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
                        {order.status || 'Received'}
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', gap:3 }}>
                        {STATUS_STEPS.map((step, si) => (
                          <div key={step}
                            title={step}
                            style={{ flex:1, height:4, borderRadius:2, transition:'background .3s',
                              background: si < stepIdx ? '#00a86b' : si === stepIdx ? '#c8102e' : '#f0f0f0'
                            }} />
                        ))}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                        <span style={{ fontSize:9, color:'#ccc' }}>Ordered</span>
                        <span style={{ fontSize:9, color: isDelivered ? '#00a86b' : '#ccc', fontWeight: isDelivered ? 700 : 400 }}>Delivered</span>
                      </div>
                    </div>

                    {/* Details row */}
                    <div style={{ display:'flex', gap:14, fontSize:12, color:'#888', marginBottom:10, flexWrap:'wrap' }}>
                      <span>Qty: <strong style={{ color:'#0a0a0a' }}>{order.qty || '-'}</strong></span>
                      <span>Size: <strong style={{ color:'#0a0a0a' }}>{order.size || '-'}</strong></span>
                      <span style={{ color:'#ddd' }}>#{(order.id||'').slice(0,8).toUpperCase()}</span>
                    </div>

                    {/* Footer row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid #f8f8f8' }}>
                      <span style={{ fontSize:11, color: isDelivered ? '#00a86b' : '#c8102e', fontWeight:600 }}>
                        {isDelivered ? '📋 View History →' : 'View Details →'}
                      </span>
                      {isDelivered && (
                        <button
                          onClick={e => { e.stopPropagation(); onNav && onNav('studio') }}
                          style={{ fontSize:11, fontWeight:700, color:'#0a1f5d', background:'#f0f4ff', border:'1px solid #c5d3f6', borderRadius:50, padding:'5px 14px', cursor:'pointer' }}>
                          🔄 Reorder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Refresh */}
        {!loading && orders.length > 0 && (
          <button onClick={loadOrders}
            style={{ display:'block', margin:'8px auto 32px', background:'none', border:'1px solid #e0e0e0', borderRadius:50, padding:'9px 22px', fontSize:12, color:'#888', cursor:'pointer', fontWeight:600 }}>
            ↻ Refresh Orders
          </button>
        )}

      </div>
    </div>
  )
}

function AccountPage({ user, onLogout, onNav }) {
  const isAdmin = user?.email === 'gokulmaniraj2008@gmail.com'
  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'40px 20px', textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', margin:'0 auto 16px', border:'3px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
          {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : '👤'}
        </div>
        <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, color:'#fff', letterSpacing:'.1em', marginBottom:4 }}>{user?.user_metadata?.full_name||'My Account'}</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>{user?.email}</p>
        {isAdmin && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, background:'rgba(200,16,46,.25)', border:'1px solid rgba(200,16,46,.5)', borderRadius:50, padding:'4px 14px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#c8102e' }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', color:'#c8102e', textTransform:'uppercase' }}>Admin Account</span>
          </div>
        )}
      </div>
      <div style={{ maxWidth:500, margin:'0 auto', padding:'28px 20px' }}>
        {[
          { icon:'📦', label:'My Orders',     sub:'Track and manage your orders',      page:'orders'  },
          { icon:'🚚', label:'Track Order',   sub:'Check live delivery status',         page:'track'   },
          { icon:'👥', label:'Group Order',   sub:'Bulk orders for teams & events',     page:'group'   },
          { icon:'💳', label:'Payments',      sub:'UPI, Razorpay',                      page:null       },
          { icon:'📍', label:'Addresses',     sub:'Manage delivery addresses',          page:null       },
          { icon:'🔔', label:'Notifications', sub:'Order updates on WhatsApp',          page:null       },
          { icon:'ℹ️',  label:'About DRYNN',  sub:'Our story & how it works',           page:'about'   },
          { icon:'💬', label:'Contact Us',    sub:'WhatsApp, email & support',          page:'contact' },
          { icon:'🛡️', label:'Privacy',       sub:'Data & privacy settings',            page:'privacy'  },
        ].map((item,i)=>(
          <div key={i} onClick={()=>{ if(item.page) onNav(item.page) }}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor:'pointer', transition:'padding .15s' }}
            onMouseEnter={e=>e.currentTarget.style.paddingLeft='8px'} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
            <div style={{ width:44, height:44, background:'#f8f8f8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{item.sub}</div>
            </div>
            <span style={{ color:'#ccc', fontSize:18 }}>›</span>
          </div>
        ))}
        {isAdmin && (
          <div onClick={()=>onNav('admin')}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor:'pointer', transition:'padding .15s' }}
            onMouseEnter={e=>e.currentTarget.style.paddingLeft='8px'} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
            <div style={{ width:44, height:44, background:'rgba(200,16,46,.08)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>⚙️</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#c8102e' }}>Admin Panel</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>Manage orders, products & users</div>
            </div>
            <span style={{ color:'#c8102e', fontSize:18 }}>›</span>
          </div>
        )}
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
          { num:'02', title:'Orders & Payments',       content:'All orders are subject to availability. Prices in INR. We accept UPI and Razorpay. Orders confirmed after payment.' },
          { num:'03', title:'Custom Print Policy',     content:'You confirm you own rights to uploaded designs. DRYNN is not liable for copyright infringement. We reserve the right to reject offensive or illegal content.' },
          { num:'04', title:'Delivery & Returns',      content:'Standard delivery 5-7 working days. Replacements only for manufacturing defects. Custom printed items are non-returnable due to change of mind.' },
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
// ADMIN PANEL  -  restricted to ADMIN_EMAIL only
// ══════════════════════════════════════════════════════════════
const ADMIN_EMAIL = 'gokulmaniraj2008@gmail.com'

function AdminPanel({ onBack }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [checking, setChecking]       = useState(true)
  const [tab, setTab]           = useState('orders')
  const [orders, setOrders]     = useState([])
  const [products, setProducts] = useState(PRODUCTS.map(p=>({...p})))
  const [loading, setLoading]   = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [editProd, setEditProd]   = useState(null)
  const [toast, setToast]         = useState('')
  // New product form state
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name:'', price:'', mrp:'', tag:'', category:'T-Shirts', emoji:'👕', rating:'4.5', reviews:'0', studio_only: false })
  const [addingProduct, setAddingProduct] = useState(false)
  // Samples state
  const [samples, setSamples]         = useState([])
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [sampleForm, setSampleForm]   = useState({ name:'', category:'', image_url:'' })
  const [sampleFile, setSampleFile]   = useState(null)
  const [sampleUploadPct, setSamplePct] = useState(0)
  const [sampleSaving, setSampleSaving] = useState(false)

  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''),2500) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      setCurrentUser(session?.user || null)
      setChecking(false)
      if (session?.user?.email === ADMIN_EMAIL) loadOrders()
    })
  }, [])

  const isAdmin = currentUser?.email === ADMIN_EMAIL

  const loadOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('drynn_orders').select('*').order('placed_at', { ascending: false }).limit(100)
    if (!error && data) setOrders(data)
    setLoading(false)
  }

  const loadSamples = async () => {
    setSamplesLoading(true)
    const { data, error } = await supabase.from('drynn_samples').select('*').order('created_at', { ascending: false })
    if (!error) setSamples(data || [])
    setSamplesLoading(false)
  }

  const handleSampleFile = e => {
    const f = e.target.files[0]
    if (f) setSampleFile(f)
  }

  const saveSample = async () => {
    if (!sampleFile && !sampleForm.image_url) { alert('Please upload an image or enter an image URL.'); return }
    if (!sampleForm.name) { alert('Please enter a design name.'); return }
    setSampleSaving(true)
    try {
      let imageUrl = sampleForm.image_url

      // Step 1: Upload to Cloudinary
      if (sampleFile) {
        setSamplePct(0)
        try {
          imageUrl = await uploadToCloudinary(sampleFile, pct => setSamplePct(pct))
        } catch(uploadErr) {
          alert('Image upload to Cloudinary failed: ' + uploadErr.message)
          return
        }
      }

      // Step 2: Save to Supabase
      const { data, error } = await supabase.from('drynn_samples').insert({
        name: sampleForm.name, category: sampleForm.category || null, image_url: imageUrl
      }).select()

      if (error) {
        alert('Supabase error: ' + error.message + ' | Code: ' + error.code)
        return
      }

      showToast('Sample design added!')
      setSampleForm({ name:'', category:'', image_url:'' }); setSampleFile(null); setSamplePct(0)
      loadSamples()
    } catch(e) {
      console.error(e)
      alert('Unexpected error: ' + (e.message || JSON.stringify(e)))
    }
    finally { setSampleSaving(false) }
  }

  const deleteSample = async (id) => {
    if (!confirm('Delete this sample design?')) return
    const { error } = await supabase.from('drynn_samples').delete().eq('id', id)
    if (!error) { setSamples(s => s.filter(x => x.id !== id)); showToast('Sample deleted') }
  }

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('drynn_orders').update({ status }).eq('id', id)
    if (!error) { setOrders(o => o.map(x => x.id===id ? {...x, status} : x)); showToast('Status updated') }
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order?')) return
    const { error } = await supabase.from('drynn_orders').delete().eq('id', id)
    if (!error) { setOrders(o => o.filter(x => x.id !== id)); showToast('Order deleted') }
  }

  const loadProducts = async () => {
    const { data, error } = await supabase.from('drynn_products').select('*').order('id')
    if (!error && data && data.length > 0) setProducts(data)
  }

  const saveProduct = async (p) => {
    const { error } = await supabase.from('drynn_products').upsert({
      id: p.id, name: p.name, price: Number(p.price), mrp: Number(p.mrp),
      tag: p.tag, tag_color: p.tagColor || p.tag_color,
      category: p.category, emoji: p.emoji,
      rating: Number(p.rating), reviews: Number(p.reviews),
      image_url: p.image_url || null,
      studio_only: p.studio_only || false,
    }, { onConflict: 'id' })
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    setProducts(ps => ps.map(x => x.id===p.id ? p : x))
    setEditProd(null)
    showToast('Product updated ✓')
  }

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.mrp) { alert('Name, Price and MRP are required.'); return }
    setAddingProduct(true)
    const newId = products.length > 0 ? Math.max(...products.map(p=>Number(p.id))) + 1 : 1
    const product = {
      id: newId,
      name: newProduct.name,
      price: Number(newProduct.price),
      mrp: Number(newProduct.mrp),
      tag: newProduct.tag || 'New',
      tag_color: '#0a1f5d',
      category: newProduct.category,
      emoji: newProduct.emoji,
      rating: Number(newProduct.rating) || 4.5,
      reviews: Number(newProduct.reviews) || 0,
      studio_only: newProduct.studio_only || false,
    }
    const { error } = await supabase.from('drynn_products').insert(product)
    if (error) { alert('Failed to add product: ' + error.message); setAddingProduct(false); return }
    setProducts(ps => [...ps, product])
    setNewProduct({ name:'', price:'', mrp:'', tag:'', category:'T-Shirts', emoji:'👕', rating:'4.5', reviews:'0', studio_only: false })
    setShowAddProduct(false)
    setAddingProduct(false)
    showToast('Product added ✓')
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('drynn_products').delete().eq('id', id)
    if (!error) { setProducts(ps => ps.filter(p => p.id !== id)); showToast('Product deleted') }
    else alert('Delete failed: ' + error.message)
  }

  const ORDER_STATUSES = ['Received','Approved','Printing','Packed','Shipped','Delivered']
  const STATUS_COLORS  = { Received:'#f5a623', Approved:'#0a1f5d', Printing:'#9b59b6', Packed:'#00a86b', Shipped:'#0a7abf', Delivered:'#00a86b' }

  if (checking) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'.18em', color:'#444', animation:'drynn-pulse 1.5s ease-in-out infinite' }}>DRYNN</div>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:12, padding:'40px 32px', width:'100%', maxWidth:380, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'.18em', color:'#fff', marginBottom:8 }}>ACCESS DENIED</div>
        <p style={{ fontSize:13, color:'#555', lineHeight:1.7, marginBottom:24 }}>
          This admin panel is restricted to authorised accounts only.
          {currentUser && <><br/><span style={{ color:'#333', marginTop:6, display:'block' }}>Logged in as: <strong style={{ color:'#c8102e' }}>{currentUser.email}</strong></span></>}
          {!currentUser && <><br/><span style={{ color:'#555' }}>You are not logged in.</span></>}
        </p>
        <button onClick={onBack} className="btn-primary" style={{ width:'100%', padding:13 }}>← Back to Site</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f4f4f4' }}>
      {/* Header */}
      <div style={{ background:'#0a0a0a', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:'.18em', color:'#fff' }}>DRYNN ADMIN</span>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#00a86b', boxShadow:'0 0 6px #00a86b' }} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{setTab('orders');loadOrders()}} style={{ padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='orders'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Orders</button>
          <button onClick={()=>{setTab('products');loadProducts()}} style={{ padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='products'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Products</button>
          <button onClick={()=>{setTab('samples');loadSamples()}} style={{ padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='samples'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>🎨 Samples</button>
          <button onClick={onBack} style={{ padding:'6px 16px', borderRadius:4, border:'1px solid #333', cursor:'pointer', background:'none', color:'#888', fontSize:12 }}>Exit</button>
        </div>
      </div>

      {/* Stats bar */}
      {tab==='orders' && (
        <div style={{ background:'#fff', borderBottom:'1px solid #e0e0e0', padding:'12px 20px' }}>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {ORDER_STATUSES.map(s => {
              const count = orders.filter(o=>o.status===s||(!o.status&&s==='Received')).length
              return <div key={s} style={{ display:'flex', gap:6, alignItems:'center', fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLORS[s] }} />
                <span style={{ fontWeight:600 }}>{s}:</span><span style={{ color:'#888' }}>{count}</span>
              </div>
            })}
            <div style={{ marginLeft:'auto', fontSize:12, color:'#888' }}>Total: <strong>{orders.length}</strong></div>
          </div>
        </div>
      )}

      <div style={{ padding:'20px', maxWidth:1200, margin:'0 auto' }}>

        {/* ORDERS TAB */}
        {tab==='orders' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>All Orders</h2>
              <button className="btn-secondary" style={{ padding:'8px 16px', fontSize:12 }} onClick={loadOrders}>↻ Refresh</button>
            </div>
            {loading ? <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading orders…</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {orders.length===0 && <div style={{ textAlign:'center', padding:60, color:'#888', background:'#fff', borderRadius:10 }}>No orders yet.</div>}
                {orders.map(o => (
                  <div key={o.id} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                    {editOrder===o.id ? (
                      <OrderEditRow order={o} onSave={async(status)=>{await updateOrderStatus(o.id,status);setEditOrder(null)}} onCancel={()=>setEditOrder(null)} statuses={ORDER_STATUSES} colors={STATUS_COLORS} />
                    ) : (
                      <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                        {/* Design thumbnail */}
                        {o.design_file && o.design_file.startsWith('http') ? (
                          <a href={o.design_file} target="_blank" rel="noopener noreferrer" title="View full design" style={{ flexShrink:0 }}>
                            <img src={o.design_file} alt="Customer Design"
                              style={{ width:64, height:64, objectFit:'contain', borderRadius:8, border:'1.5px solid #e0e0e0', background:'#f8f8f8', cursor:'pointer' }}
                              onError={e=>{ e.target.style.display='none' }}
                            />
                          </a>
                        ) : (
                          <div style={{ width:64, height:64, borderRadius:8, border:'1.5px dashed #e0e0e0', background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#bbb', flexShrink:0, textAlign:'center' }}>
                            {o.design_file==='catalog-order'?'Catalog':'No design'}
                          </div>
                        )}
                        <div style={{ flex:1, minWidth:160 }}>
                          <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{o.name}</div>
                          <div style={{ fontSize:11, color:'#888' }}>{o.phone} · {o.garment} · {o.size} · Qty {o.qty}</div>
                          <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{o.address}</div>
                          <div style={{ fontSize:10, color:'#aaa' }}>{new Date(o.placed_at||o.created_at).toLocaleString('en-IN')}</div>
                          {o.design_file && o.design_file.startsWith('http') && (
                            <a href={o.design_file} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:10, color:'#0a1f5d', textDecoration:'underline', display:'inline-block', marginTop:3 }}>
                              🔗 View Design File
                            </a>
                          )}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:50, background:STATUS_COLORS[o.status||'Received']+'22', color:STATUS_COLORS[o.status||'Received'] }}>
                            {o.status||'Received'}
                          </span>
                          <button onClick={()=>setEditOrder(o.id)} style={{ padding:'6px 14px', fontSize:11, borderRadius:4, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', fontWeight:600 }}>Edit Status</button>
                          <button onClick={()=>deleteOrder(o.id)} style={{ padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>✕ Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab==='products' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Products ({products.length})</h2>
              <button className="btn-primary" style={{ padding:'8px 18px', fontSize:12 }} onClick={()=>setShowAddProduct(v=>!v)}>
                {showAddProduct ? '✕ Cancel' : '+ Add Product'}
              </button>
            </div>

            {/* Add New Product Form */}
            {showAddProduct && (
              <div style={{ background:'#fff', borderRadius:12, padding:'20px', border:'1.5px solid #c8102e', marginBottom:20 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:'#c8102e' }}>+ Add New Product</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Product Name *</label>
                    <input className="input-field" placeholder="e.g. Premium Cotton Tee" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Price (₹) *</label>
                    <input className="input-field" type="number" placeholder="699" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>MRP (₹) *</label>
                    <input className="input-field" type="number" placeholder="999" value={newProduct.mrp} onChange={e=>setNewProduct({...newProduct,mrp:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Category</label>
                    <select className="input-field" value={newProduct.category} onChange={e=>setNewProduct({...newProduct,category:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }}>
                      {['T-Shirts','Hoodies','Polos','Joggers'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Tag</label>
                    <input className="input-field" placeholder="New / Best Seller / Sale" value={newProduct.tag} onChange={e=>setNewProduct({...newProduct,tag:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Emoji Icon</label>
                    <select className="input-field" value={newProduct.emoji} onChange={e=>setNewProduct({...newProduct,emoji:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }}>
                      {[['👕','T-Shirt'],['🧥','Hoodie'],['👔','Polo'],['👖','Joggers/Pants']].map(([e,l])=><option key={e} value={e}>{e} {l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Rating</label>
                    <input className="input-field" type="number" min="1" max="5" step="0.1" placeholder="4.5" value={newProduct.rating} onChange={e=>setNewProduct({...newProduct,rating:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Reviews Count</label>
                    <input className="input-field" type="number" placeholder="0" value={newProduct.reviews} onChange={e=>setNewProduct({...newProduct,reviews:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', background: newProduct.studio_only ? 'rgba(200,16,46,.07)' : '#f8f8f8', border: `1.5px solid ${newProduct.studio_only ? '#c8102e' : '#e8e8e8'}`, borderRadius:8, padding:'12px 14px' }}>
                      <input type="checkbox" checked={newProduct.studio_only} onChange={e=>setNewProduct({...newProduct,studio_only:e.target.checked})}
                        style={{ width:18, height:18, accentColor:'#c8102e', cursor:'pointer', flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color: newProduct.studio_only ? '#c8102e' : '#0a0a0a' }}>🎨 Studio Only</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Hide from Products page - visible only in Design Studio</div>
                      </div>
                    </label>
                  </div>
                </div>
                <button className="btn-primary" style={{ padding:'10px 24px', fontSize:13, opacity:addingProduct?.6:1 }} onClick={addProduct} disabled={addingProduct}>
                  {addingProduct ? 'Adding…' : '+ Add Product'}
                </button>
              </div>
            )}

            {/* Products List */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {products.map(p => (
                <div key={p.id} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', border:'1px solid #e8e8e8' }}>
                  {editProd===p.id ? (
                    <ProductEditRow product={p} onSave={saveProduct} onCancel={()=>setEditProd(null)} />
                  ) : (
                    <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                      <div style={{ width:60, height:60, borderRadius:8, overflow:'hidden', background:'#f8f8f8', border:'1px solid #e8e8e8', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                          : <span style={{ fontSize:30 }}>{p.emoji}</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                          {p.name}
                          {p.studio_only && <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', background:'rgba(200,16,46,.1)', color:'#c8102e', border:'1px solid rgba(200,16,46,.25)', borderRadius:3, padding:'2px 7px' }}>🎨 Studio Only</span>}
                        </div>
                        <div style={{ fontSize:12, color:'#888' }}>{p.category} · ₹{Number(p.price).toLocaleString()} (MRP ₹{Number(p.mrp).toLocaleString()})</div>
                        <div style={{ fontSize:11, color:'#aaa' }}>⭐ {p.rating} · {p.reviews} reviews · Tag: {p.tag}</div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>setEditProd(p.id)} style={{ padding:'8px 16px', fontSize:12, borderRadius:4, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', fontWeight:600 }}>Edit</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{ padding:'8px 12px', fontSize:12, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAMPLES TAB */}
        {tab==='samples' && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>🎨 Sample Designs</h2>

            {/* Upload new sample */}
            <div style={{ background:'#fff', borderRadius:12, padding:'20px', border:'1px solid #e8e8e8', marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Add New Sample Design</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Design Name *</label>
                  <input className="input-field" placeholder="e.g. Cricket Team" value={sampleForm.name} onChange={e=>setSampleForm({...sampleForm,name:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Category</label>
                  <input className="input-field" placeholder="e.g. College, Farewell, Sports" value={sampleForm.category} onChange={e=>setSampleForm({...sampleForm,category:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
                </div>
              </div>
              {/* File upload */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>Upload Image</label>
                <div onClick={()=>document.getElementById('sampleFileInput').click()}
                  style={{ border:'2px dashed #d0d0d0', borderRadius:8, padding:'16px', cursor:'pointer', background:'#fafafa', textAlign:'center' }}>
                  <input id="sampleFileInput" type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display:'none' }} onChange={handleSampleFile} />
                  {sampleFile
                    ? <div>
                        <img src={URL.createObjectURL(sampleFile)} alt="" style={{ maxHeight:80, maxWidth:'100%', borderRadius:4, marginBottom:6 }} />
                        <p style={{ fontSize:11, color:'#00a86b', fontWeight:600 }}>✓ {sampleFile.name}</p>
                      </div>
                    : <p style={{ fontSize:12, color:'#888' }}>Click to upload design image (PNG, JPG, SVG)</p>}
                </div>
              </div>
              {sampleUploadPct > 0 && sampleUploadPct < 100 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#555', marginBottom:4 }}>
                    <span>Uploading to Cloudinary…</span><span>{sampleUploadPct}%</span>
                  </div>
                  <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${sampleUploadPct}%`, background:'#c8102e', borderRadius:2, transition:'width .3s' }} />
                  </div>
                </div>
              )}
              <button className="btn-primary" style={{ padding:'10px 24px', fontSize:13, opacity:sampleSaving?.6:1 }} onClick={saveSample} disabled={sampleSaving}>
                {sampleSaving ? 'Saving…' : '+ Add Sample Design'}
              </button>
            </div>

            {/* Existing samples grid */}
            {samplesLoading ? (
              <div style={{ textAlign:'center', padding:32, color:'#888' }}>Loading…</div>
            ) : samples.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, background:'#fff', borderRadius:12, color:'#888', fontSize:13 }}>No sample designs yet. Add your first one above!</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                {samples.map(s => (
                  <div key={s.id} style={{ background:'#fff', borderRadius:10, overflow:'hidden', border:'1px solid #e8e8e8' }}>
                    <img src={s.image_url} alt={s.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{s.name}</div>
                      {s.category && <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>{s.category}</div>}
                      <button onClick={()=>deleteSample(s.id)} style={{ fontSize:11, color:'#c8102e', background:'none', border:'1px solid #fdd', borderRadius:4, padding:'4px 10px', cursor:'pointer', width:'100%' }}>✕ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast" style={{ bottom:20 }}>{toast}</div>}
    </div>
  )
}

function OrderEditRow({ order, onSave, onCancel, statuses, colors }) {
  const [status, setStatus] = useState(order.status||'Received')
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
      <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{order.name} - {order.garment}</div>
      <select value={status} onChange={e=>setStatus(e.target.value)}
        style={{ border:'1.5px solid #0a1f5d', borderRadius:6, padding:'8px 12px', fontSize:12, fontWeight:600, color:colors[status], outline:'none', cursor:'pointer' }}>
        {statuses.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12 }} onClick={()=>onSave(status)}>Save</button>
      <button onClick={onCancel} style={{ padding:'8px 14px', fontSize:12, background:'none', border:'1px solid #e0e0e0', borderRadius:4, cursor:'pointer', color:'#888' }}>Cancel</button>
    </div>
  )
}

function ProductEditRow({ product, onSave, onCancel }) {
  const [p, setP]           = useState({...product, studio_only: product.studio_only || false})
  const [imgFile, setImgFile] = useState(null)
  const [imgPct, setImgPct]   = useState(0)
  const [imgSaving, setImgSaving] = useState(false)

  const handleImgUpload = async () => {
    if (!imgFile) { onSave(p); return }
    setImgSaving(true)
    try {
      const url = await uploadToCloudinary(imgFile, pct => setImgPct(pct))
      onSave({ ...p, image_url: url })
    } catch(e) {
      alert('Image upload failed: ' + e.message)
    } finally { setImgSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
        {[['name','Name',p.name],['price','Price (₹)',p.price],['mrp','MRP (₹)',p.mrp],['tag','Tag',p.tag],['rating','Rating',p.rating]].map(([k,label,val])=>(
          <div key={k}>
            <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:4 }}>{label}</label>
            <input className="input-field" value={val||''} onChange={e=>setP({...p,[k]:e.target.value})} style={{ padding:'8px 12px', fontSize:13 }} />
          </div>
        ))}
      </div>

      {/* Image upload */}
      <div>
        <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:6 }}>Product Image</label>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          {(p.image_url) && (
            <img src={p.image_url} alt="" style={{ width:64, height:64, objectFit:'contain', borderRadius:8, border:'1px solid #e0e0e0', background:'#f8f8f8' }} />
          )}
          <div onClick={()=>document.getElementById(`imgUpload_${product.id}`).click()}
            style={{ flex:1, minWidth:160, padding:'12px', border:'1.5px dashed #d0d0d0', borderRadius:8, background:'#fafafa', cursor:'pointer', textAlign:'center' }}>
            <input id={`imgUpload_${product.id}`} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display:'none' }}
              onChange={e=>{ const f=e.target.files[0]; if(f) setImgFile(f) }} />
            <div style={{ fontSize:11, color: imgFile ? '#00a86b' : '#888', fontWeight:600 }}>
              {imgFile ? `✓ ${imgFile.name}` : '📷 Upload new image'}
            </div>
            <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>PNG, JPG · replaces current</div>
          </div>
        </div>
        {imgPct > 0 && imgPct < 100 && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${imgPct}%`, background:'#c8102e', borderRadius:2, transition:'width .3s' }} />
            </div>
            <div style={{ fontSize:10, color:'#888', marginTop:2 }}>Uploading… {imgPct}%</div>
          </div>
        )}
      </div>

      {/* Studio Only toggle */}
      <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', background: p.studio_only ? 'rgba(200,16,46,.06)' : '#f8f8f8', border: `1.5px solid ${p.studio_only ? '#c8102e' : '#e8e8e8'}`, borderRadius:8, padding:'11px 14px' }}>
        <input type="checkbox" checked={!!p.studio_only} onChange={e=>setP({...p,studio_only:e.target.checked})}
          style={{ width:18, height:18, accentColor:'#c8102e', cursor:'pointer', flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: p.studio_only ? '#c8102e' : '#0a0a0a' }}>🎨 Studio Only</div>
          <div style={{ fontSize:11, color:'#888', marginTop:1 }}>Hide from Products page - show only in Design Studio</div>
        </div>
      </label>

      <div style={{ display:'flex', gap:10 }}>
        <button className="btn-primary" style={{ padding:'8px 20px', fontSize:12, opacity:imgSaving?.6:1 }} onClick={handleImgUpload} disabled={imgSaving}>
          {imgSaving ? 'Uploading…' : 'Save Product'}
        </button>
        <button onClick={onCancel} style={{ padding:'8px 16px', fontSize:12, background:'none', border:'1px solid #e0e0e0', borderRadius:4, cursor:'pointer', color:'#888' }}>Cancel</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ORDER TRACKING PAGE
// ══════════════════════════════════════════════════════════════
function OrderTrackingPage({ onNav }) {
  const [orderId, setOrderId]   = useState('')
  const [phone, setPhone]       = useState('')
  const [order, setOrder]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const STATUSES = ['Received','Approved','Printing','Packed','Shipped','Delivered']
  const STATUS_INFO = {
    Received:  { icon:'📥', desc:'We received your order and are reviewing it.' },
    Approved:  { icon:'✅', desc:'Design approved! Moving to print queue.' },
    Printing:  { icon:'🖨️', desc:'Your design is being printed right now.' },
    Packed:    { icon:'📦', desc:'Printed and packed, ready to ship.' },
    Shipped:   { icon:'🚚', desc:'On its way! Track your courier via WhatsApp.' },
    Delivered: { icon:'🎉', desc:'Delivered! We hope you love it.' },
  }

  const track = async () => {
    if (!orderId.trim() && !phone.trim()) { setError('Enter Order ID or phone number'); return }
    setLoading(true); setError(''); setOrder(null)
    let query = supabase.from('drynn_orders').select('*')
    if (orderId.trim()) query = query.eq('id', orderId.trim())
    else query = query.eq('phone', phone.trim()).order('placed_at',{ascending:false}).limit(1)
    const { data, error: dbErr } = await query
    setLoading(false)
    if (dbErr || !data || data.length===0) { setError('No order found. Check your Order ID or phone number.'); return }
    setOrder(data[0])
  }

  const currentStep = order ? (STATUSES.indexOf(order.status||'Received')) : -1

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'48px 20px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 60% 40%,rgba(200,16,46,.18) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1, padding:'0 4px' }}>
          <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Real-Time Tracking</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>TRACK YOUR ORDER</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.6)', marginTop:6 }}>Enter your Order ID or WhatsApp number to see your order status.</p>
        </div>
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'32px 20px' }}>
        {/* Search */}
        <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'24px', marginBottom:28, boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Order ID</label>
              <input className="input-field" placeholder="Paste your order ID (UUID)" value={orderId} onChange={e=>{setOrderId(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&track()} />
            </div>
            <div style={{ textAlign:'center', color:'#ccc', fontSize:12, fontWeight:600 }}>- OR -</div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>WhatsApp Number</label>
              <input className="input-field" placeholder="+91 99999 99999" value={phone} onChange={e=>{setPhone(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&track()} />
            </div>
            {error && <p style={{ fontSize:13, color:'#c8102e', background:'rgba(200,16,46,.06)', border:'1px solid rgba(200,16,46,.2)', borderRadius:6, padding:'10px 14px', margin:0 }}>{error}</p>}
            <button className="btn-primary" style={{ padding:14, fontSize:13, opacity:loading?.6:1 }} onClick={track} disabled={loading}>
              {loading ? 'Searching…' : '🔍 Track Order'}
            </button>
          </div>
        </div>

        {/* Result */}
        {order && (
          <div className="fade-in" style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'28px 24px', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:12, color:'#aaa', marginBottom:2 }}>Order for</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{order.name}</div>
                <div style={{ fontSize:12, color:'#888' }}>{order.garment} · {order.size} · Qty {order.qty}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:'#aaa', marginBottom:2 }}>Placed on</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{new Date(order.placed_at||order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ position:'relative' }}>
              {STATUSES.map((s, i) => {
                const done    = i <= currentStep
                const current = i === currentStep
                const info    = STATUS_INFO[s]
                return (
                  <div key={s} style={{ display:'flex', gap:16, marginBottom: i < STATUSES.length-1 ? 0 : 0 }}>
                    {/* Line + dot */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                        background: done ? (current ? '#c8102e' : '#00a86b') : '#f0f0f0',
                        border: current ? '3px solid rgba(200,16,46,.3)' : 'none',
                        transition:'all .3s',
                        boxShadow: current ? '0 0 0 4px rgba(200,16,46,.12)' : 'none'
                      }}>
                        {done ? (current ? info.icon : '✓') : <span style={{ color:'#ccc', fontSize:12, fontWeight:700 }}>{i+1}</span>}
                      </div>
                      {i < STATUSES.length-1 && <div style={{ width:2, flex:1, minHeight:28, background:i < currentStep ? '#00a86b' : '#f0f0f0', margin:'4px 0', transition:'background .3s' }} />}
                    </div>
                    {/* Content */}
                    <div style={{ paddingBottom:24, paddingTop:6 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: done ? '#0a0a0a' : '#bbb' }}>{s}</div>
                      {current && <div style={{ fontSize:12, color:'#555', marginTop:2, lineHeight:1.6 }}>{info.desc}</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop:8, padding:'12px 16px', background:'#f8f8f8', borderRadius:8, fontSize:12, color:'#888' }}>
              📞 Questions? WhatsApp us at <strong style={{ color:'#0a0a0a' }}>+91 99447 61306</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// GROUP ORDER PAGE
// ══════════════════════════════════════════════════════════════
function GroupOrderPage({ user, onNav }) {
  const [tab, setTab] = useState('create') // create | join
  const [groupId, setGroupId] = useState('')

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#00a86b,#0a1f5d)', padding:'48px 20px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 30% 60%,rgba(200,16,46,.12) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1, padding:'0 4px' }}>
          <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>For Teams & Events</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>GROUP ORDERS</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.65)', marginTop:6, maxWidth:480, lineHeight:1.7 }}>
            Create a group order. Share the link. Friends pick their size and pay separately. No more collecting money manually!
          </p>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 20px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:28, border:'1px solid #e0e0e0', borderRadius:8, overflow:'hidden' }}>
          {[['create','🆕 Create Group Order'],['join','🔗 Join a Group Order']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ flex:1, padding:'13px', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background:tab===t?'#c8102e':'#fff', color:tab===t?'#fff':'#888', transition:'all .15s' }}>{l}</button>
          ))}
        </div>

        {tab==='create' ? <CreateGroupOrder user={user} /> : <JoinGroupOrder user={user} />}
      </div>
    </div>
  )
}

function CreateGroupOrder({ user }) {
  const [form, setForm]     = useState({ title:'', garment:'T-Shirt', color:'#ffffff', deadline:'', organizer: user?.user_metadata?.full_name||'', phone:'' })
  const [created, setCreated] = useState(null)
  const [saving, setSaving]   = useState(false)

  const GARMENTS_LIST = ['T-Shirt','Hoodie','Polo','Joggers']

  const create = async () => {
    if (!form.title||!form.organizer||!form.phone) { alert('Fill all required fields'); return }
    setSaving(true)
    const id = crypto.randomUUID()
    const code = Math.random().toString(36).slice(2,8).toUpperCase()
    const groupData = {
      id,
      group_code: code,
      title: form.title,
      garment: form.garment,
      color: form.color,
      deadline: form.deadline || null,
      organizer_name: form.organizer,
      organizer_phone: form.phone,
      organizer_user_id: user?.id || null,
      created_at: new Date().toISOString(),
      status: 'open',
    }
    const { error } = await supabase.from('drynn_group_orders').insert(groupData).catch(()=>({ error:{message:'Table may not exist'} }))
    setSaving(false)
    // Even if DB fails (table doesn't exist yet), show success UI for demo
    setCreated({ ...groupData, error: error?.message })
  }

  const shareUrl = created ? `${typeof window!=='undefined'?window.location.origin:''}/group/${created.group_code}` : ''
  const copyLink = () => { navigator.clipboard.writeText(shareUrl).catch(()=>{}); alert('Link copied!') }

  if (created) return (
    <div className="fade-in">
      <div style={{ background:'rgba(0,168,107,.08)', border:'1px solid rgba(0,168,107,.25)', borderRadius:12, padding:'24px', marginBottom:24, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, marginBottom:8 }}>GROUP ORDER CREATED!</h2>
        <p style={{ fontSize:14, color:'#555', marginBottom:16 }}>Share this code or link with your team. They can join and select their size independently.</p>
        <div style={{ background:'#fff', border:'2px solid #00a86b', borderRadius:8, padding:'16px 20px', marginBottom:16, display:'inline-block', minWidth:200 }}>
          <div style={{ fontSize:10, color:'#888', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:6 }}>Group Code</div>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:44, letterSpacing:'.12em', color:'#0a0a0a' }}>{created.group_code}</div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn-primary" style={{ padding:'12px 24px' }} onClick={copyLink}>📋 Copy Join Link</button>
          <a href={`https://wa.me/?text=Join%20our%20group%20T-shirt%20order%20on%20DRYNN!%20Code:%20${created.group_code}%20Link:%20${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'#25D366', color:'#fff', borderRadius:4, fontSize:13, fontWeight:700, textDecoration:'none' }}>
            📲 Share on WhatsApp
          </a>
        </div>
        {created.error && <p style={{ fontSize:11, color:'#f5a623', marginTop:12 }}>Note: DB save failed ({created.error}). Set up drynn_group_orders table in Supabase.</p>}
      </div>
      <button onClick={()=>setCreated(null)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>← Create another</button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.05)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Event / Order Name *</label>
            <input className="input-field" placeholder="e.g. CSE Batch 2025 Farewell Tees" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Garment Type</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {GARMENTS_LIST.map(g=><button key={g} className={`size-btn${form.garment===g?' active':''}`} onClick={()=>setForm({...form,garment:g})} style={{ fontSize:11 }}>{g}</button>)}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Colour</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {SWATCHES.slice(0,6).map(c=><div key={c} onClick={()=>setForm({...form,color:c})}
                  style={{ width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer', border:c==='#ffffff'?'2px solid #ccc':'2px solid transparent', boxShadow:form.color===c?'0 0 0 3px #c8102e':'none' }} />)}
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Order Deadline (optional)</label>
            <input className="input-field" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={{ maxWidth:200 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Organizer Name *</label>
              <input className="input-field" placeholder="Your name" value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>WhatsApp *</label>
              <input className="input-field" placeholder="+91 00000 00000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
            </div>
          </div>
          <button className="btn-primary" style={{ padding:14, fontSize:13, opacity:saving?.6:1 }} onClick={create} disabled={saving}>
            {saving ? 'Creating…' : '🚀 Create Group Order'}
          </button>
        </div>
      </div>
      <div style={{ background:'linear-gradient(135deg,rgba(0,168,107,.06),rgba(10,31,93,.06))', border:'1px solid rgba(0,168,107,.2)', borderRadius:12, padding:'20px 24px' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>How Group Orders Work</div>
        {[['1️⃣','Create a group order with your event name and garment.'],['2️⃣','Share the unique link/code with your group.'],['3️⃣','Everyone selects their size and pays individually.'],['4️⃣','DRYNN prints and delivers all pieces together.']].map(([e,t])=>(
          <div key={e} style={{ display:'flex', gap:10, marginBottom:8, fontSize:13, color:'#555' }}><span>{e}</span><span>{t}</span></div>
        ))}
      </div>
    </div>
  )
}

function JoinGroupOrder({ user }) {
  const [code, setCode]         = useState('')
  const [group, setGroup]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ name: user?.user_metadata?.full_name||'', phone:'', size:'M', address:'' })
  const [joined, setJoined]     = useState(false)
  const [saving, setSaving]     = useState(false)

  const findGroup = async () => {
    if (!code.trim()) { setError('Enter a group code'); return }
    setLoading(true); setError(''); setGroup(null)
    const { data, error: dbErr } = await supabase.from('drynn_group_orders').select('*').eq('group_code', code.trim().toUpperCase()).limit(1)
      .catch(()=>({ data:null, error:{message:'Group orders table not found'} }))
    setLoading(false)
    if (dbErr || !data || data.length===0) {
      // Demo mode: show a fake group for testing
      setGroup({ group_code: code.trim().toUpperCase(), title:'Demo Group Order', garment:'T-Shirt', color:'#ffffff', organizer_name:'Demo Organizer', status:'open', deadline: null })
      return
    }
    setGroup(data[0])
  }

  const joinGroup = async () => {
    if (!form.name||!form.phone||!form.address) { alert('Fill all fields'); return }
    setSaving(true)
    const { error } = await supabase.from('drynn_group_members').insert({
      id: crypto.randomUUID(),
      group_code: group.group_code,
      member_name: form.name, member_phone: form.phone,
      size: form.size, address: form.address,
      user_id: user?.id||null, joined_at: new Date().toISOString(),
      payment_status: 'pending',
    }).catch(()=>({ error:{message:'Table may not exist'} }))
    setSaving(false)
    setJoined(true)
  }

  if (joined) return (
    <div className="fade-in" style={{ textAlign:'center', padding:'40px 0' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, marginBottom:8 }}>YOU'RE IN!</h2>
      <p style={{ fontSize:14, color:'#555', lineHeight:1.8 }}>Joined <strong>{group.title}</strong>. The organizer will coordinate payment and delivery. You'll receive updates on WhatsApp.</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.05)' }}>
        <div style={{ display:'flex', gap:10 }}>
          <input className="input-field" placeholder="Enter group code (e.g. AB12CD)" value={code}
            onChange={e=>{setCode(e.target.value.toUpperCase());setError('')}}
            onKeyDown={e=>e.key==='Enter'&&findGroup()}
            style={{ letterSpacing:'.1em', fontWeight:700, fontSize:16 }} />
          <button className="btn-primary" style={{ whiteSpace:'nowrap', padding:'0 20px', opacity:loading?.6:1 }} onClick={findGroup} disabled={loading}>
            {loading?'…':'Find'}
          </button>
        </div>
        {error && <p style={{ fontSize:12, color:'#c8102e', marginTop:8 }}>{error}</p>}
      </div>

      {group && (
        <div className="fade-in" style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.05)' }}>
          <div style={{ background:'linear-gradient(90deg,rgba(0,168,107,.08),rgba(10,31,93,.06))', borderRadius:8, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:700 }}>{group.title}</div>
            <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{group.garment} · Organizer: {group.organizer_name} {group.deadline&&`· Deadline: ${new Date(group.deadline).toLocaleDateString('en-IN')}`}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Your Name *</label>
                <input className="input-field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>WhatsApp *</label>
                <input className="input-field" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Select Your Size</label>
              <div style={{ display:'flex', gap:8 }}>{SIZES.map(s=><button key={s} className={`size-btn${form.size===s?' active':''}`} onClick={()=>setForm({...form,size:s})}>{s}</button>)}</div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Delivery Address *</label>
              <textarea className="input-field" rows={2} placeholder="Full address with pincode" style={{ resize:'vertical' }} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} />
            </div>
            <button className="btn-primary" style={{ padding:14, fontSize:13, opacity:saving?.6:1 }} onClick={joinGroup} disabled={saving}>
              {saving?'Joining…':'✅ Confirm My Order'}
            </button>
          </div>
        </div>
      )}
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

  // Overlay pages (full-screen replacements)
  if (page === 'privacy') return <PrivacyPage onBack={()=>setPage('home')} />
  if (page === 'terms')   return <TermsPage   onBack={()=>setPage('home')} />
  if (page === 'admin')   return <AdminPanel  onBack={()=>setPage('home')} />

  const NAV_ITEMS = [
    { key:'home',     label:'Home',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
    { key:'products', label:'Shop',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg> },
    { key:'studio',   label:'Studio',  special:true, icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> },
    { key:'cart',     label:'Cart',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg> },
    { key:'account',  label:'Account', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ]

  const isAdmin = user?.email === ADMIN_EMAIL

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
            {['home','products','studio','group','track','about','contact'].map(k=>(
              <button key={k} onClick={()=>setPage(k)}
                style={{ background:'none', border:'none', padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', color:page===k?'#c8102e':'#555', borderBottom:page===k?'2px solid #c8102e':'2px solid transparent', textTransform:'capitalize', transition:'color .15s' }}>
                {k==='studio'?'Custom Print':k==='group'?'Group Order':k==='track'?'Track Order':k.charAt(0).toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
          {/* Desktop right */}
          <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:8 }}>
            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #f0f0f0' }} />}
            <button onClick={()=>setPage('cart')} style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>
              {cart.length>0 && <div className="cart-badge">{cart.length}</div>}
            </button>
            <button onClick={()=>setPage('admin')} style={{ background:'none', border:'1px solid #e0e0e0', padding:'5px 10px', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', cursor:'pointer', color:'#888', borderRadius:4 }}>Admin</button>
            <button onClick={handleLogout} style={{ background:'none', border:'1px solid #e0e0e0', padding:'5px 10px', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', cursor:'pointer', color:'#888', borderRadius:4 }}>Logout</button>
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
            ['FREE DELIVERY ABOVE ₹1,500','PREMIUM HEAT PRESS PRINT','GROUP ORDERS AVAILABLE','5-7 DAY DELIVERY','REAL-TIME ORDER TRACKING','UPI & RAZORPAY ACCEPTED'].map((t,i)=>(
              <span key={`${rep}-${i}`} style={{ fontSize:10, fontWeight:700, letterSpacing:'.16em', padding:'0 28px', borderRight:'1px solid #333' }}>{t}</span>
            ))
          ))}
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      {page==='home'     && <HomePage     user={user} onNav={setPage} cart={cart} onAddToCart={addToCart} />}
      {page==='products' && <ProductsPage onAddToCart={addToCart} onNav={setPage} />}
      {page==='studio'   && <StudioPage   user={user} onNav={setPage} />}
      {page==='about'    && <AboutPage    onNav={setPage} />}
      {page==='contact'  && <ContactPage  onNav={setPage} />}
      {page==='cart'     && <CartPage cart={cart} onRemove={i=>setCart(c=>c.filter((_,idx)=>idx!==i))} onClear={()=>setCart([])} user={user} onNav={setPage} />}
      {page==='account'  && <AccountPage user={user} onLogout={handleLogout} onNav={setPage} />}
      {page==='orders'   && <OrdersPage  user={user} onBack={()=>setPage('account')} />}
      {page==='track'    && <OrderTrackingPage onNav={setPage} />}
      {page==='group'    && <GroupOrderPage user={user} onNav={setPage} />}

      {/* ── FOOTER (only on main pages) ── */}
      {['home','about','contact','track','group'].includes(page) && page !== 'products' && (
        <footer style={{ background:'#0a0a0a', color:'#fff', padding:'48px 16px 80px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div className="footer-cols" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>
              <div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:30, letterSpacing:'.15em', marginBottom:14 }}>DRYNN</div>
                <p style={{ fontSize:13, lineHeight:1.8, color:'#666', maxWidth:240 }}>Premium custom print clothing from Tamil Nadu. We bring your designs to life.</p>
              </div>
              {[
                { title:'Shop',    links:[['T-Shirts','products'],['Hoodies','products'],['Polos','products'],['Joggers','products']] },
                { title:'Support', links:[['Custom Order','studio'],['Track Order','track'],['Group Order','group'],['FAQ','about']] },
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
              <p style={{ fontSize:11, color:'#444' }}>© 2025 DRYNN. All rights reserved. Tamil Nadu, India.</p>
              <p style={{ fontSize:11, color:'#444' }}>UPI / Razorpay Accepted</p>
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
            <span style={{ color: item.special ? '#fff' : (page===item.key ? '#c8102e' : '#aaa'), display:'flex', alignItems:'center', justifyContent:'center' }}>{item.icon}</span>
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

    // Check existing session  -  auto-login returning users immediately
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
