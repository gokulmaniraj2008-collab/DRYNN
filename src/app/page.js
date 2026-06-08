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
        if (error) { console.error('[Products] Supabase error:', error.message); return }
        if (data && data.length > 0) {
          // Normalize: Supabase uses tag_color, UI uses tagColor; prices may be strings
          const normalized = data.map(p => ({
            ...p,
            price:     Number(p.price)    || 0,
            mrp:       Number(p.mrp)      || 0,
            rating:    Number(p.rating)   || 4.5,
            reviews:   Number(p.reviews)  || 0,
            tagColor:  p.tagColor || p.tag_color || '#c8102e',
            tag_color: p.tag_color || p.tagColor || '#c8102e',
            emoji:     p.emoji || '👕',
            tag:       p.tag || 'New',
            img_front: p.img_front || null,
            img_back:  p.img_back  || null,
            img_left:  p.img_left  || null,
            img_right: p.img_right || null,
          }))
          setProducts(normalized)
        }
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
const disc = (price, mrp) => Math.round((1 - Number(price) / Number(mrp)) * 100)

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
          { icon:'•', label:'Custom Print',        desc:'Any design, any garment, any colour',    bg:'rgba(200,16,46,0.07)'  },
          { icon:'•', label:'Fast Delivery',        desc:'5-7 days across India, express available',   bg:'rgba(10,31,93,0.07)'   },
          { icon:'•', label:'Quality Guaranteed',   desc:'Heat press, wash-proof, 100% guarantee', bg:'rgba(0,168,107,0.07)'  },
          { icon:'•', label:'Easy Payment',         desc:'UPI & Razorpay  -  secure payment',       bg:'rgba(245,166,35,0.10)' },
        ].map((f,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, background:f.bg, borderRadius:12, padding:'16px 18px' }}>
            <div style={{ flexShrink:0, color:'#555' }}>{f.icon}</div>
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
// INTERACTIVE MOCKUP — pinch zoom, drag pan, save to photos
// ══════════════════════════════════════════════════════════════
function InteractiveMockup({ garmentImgSrc, designImgSrc, color, posX, posY, scale, textPosX=50, textPosY=75, textRot=0,
  rotation, textOn, textVal, textFont, textSize, textColor, colorToFilter, canvasFilter, garmentEmoji }) {

  const [zoom, setZoom]   = React.useState(1)
  const [panX, setPanX]   = React.useState(0)
  const [panY, setPanY]   = React.useState(0)
  const [saved, setSaved] = React.useState(false)
  const dragRef = React.useRef({ dragging:false, startX:0, startY:0, startPanX:0, startPanY:0, lastDist:0 })
  const containerRef = React.useRef(null)

  const resetView = () => { setZoom(1); setPanX(0); setPanY(0) }

  // Touch pinch-zoom
  const onTouchStart = e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      dragRef.current.lastDist = Math.sqrt(dx*dx + dy*dy)
    } else {
      dragRef.current = { ...dragRef.current, dragging:true, startX:e.touches[0].clientX - panX, startY:e.touches[0].clientY - panY }
    }
  }
  const onTouchMove = e => {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      const delta = dist / dragRef.current.lastDist
      setZoom(z => Math.max(1, Math.min(4, z * delta)))
      dragRef.current.lastDist = dist
    } else if (dragRef.current.dragging && zoom > 1) {
      setPanX(e.touches[0].clientX - dragRef.current.startX)
      setPanY(e.touches[0].clientY - dragRef.current.startY)
    }
  }
  const onTouchEnd = () => { dragRef.current.dragging = false }

  // Mouse drag
  const onMouseDown = e => { dragRef.current = { ...dragRef.current, dragging:true, startX:e.clientX - panX, startY:e.clientY - panY } }
  const onMouseMove = e => { if(!dragRef.current.dragging || zoom <= 1) return; setPanX(e.clientX - dragRef.current.startX); setPanY(e.clientY - dragRef.current.startY) }
  const onMouseUp   = () => { dragRef.current.dragging = false }

  // Wheel zoom
  const onWheel = e => { e.preventDefault(); setZoom(z => Math.max(1, Math.min(4, z - e.deltaY * 0.002))) }

  // Save preview as image
  const savePreview = async () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 800; canvas.height = 900
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,800,900)
      const loadImg = src => new Promise(res => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src })
      const gImg = await loadImg(garmentImgSrc)
      if (gImg) ctx.drawImage(gImg, 0, 50, 800, 800)
      if (designImgSrc) {
        const dImg = await loadImg(designImgSrc)
        if (dImg) {
          const dw = (scale/100) * 800
          const dx = (posX/100) * 800 - dw/2
          const dy = (posY/100) * 800 - dw/2 + 50
          ctx.save(); ctx.translate(dx+dw/2, dy+dw/2); ctx.rotate(rotation*Math.PI/180)
          ctx.drawImage(dImg, -dw/2, -dw/2, dw, dw); ctx.restore()
        }
      }
      if (textOn && textVal) {
        ctx.font = `bold ${textSize} ${textFont}`; ctx.fillStyle = textColor
        ctx.textAlign = 'center'; ctx.fillText(textVal, 400, 680)
      }
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href=url; a.download='drynn-preview.png'
        a.click(); URL.revokeObjectURL(url)
        setSaved(true); setTimeout(()=>setSaved(false), 2500)
      }, 'image/png')
    } catch(e) { console.error('Save failed:', e) }
  }

  return (
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      {/* Mockup container */}
      <div ref={containerRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        style={{ position:'relative', borderRadius:18, overflow:'hidden', background:'#fff', boxShadow:'0 12px 48px rgba(0,0,0,.5)', cursor:zoom>1?'grab':'default', touchAction:'none', userSelect:'none' }}>
        <div style={{ transform:`scale(${zoom}) translate(${panX/zoom}px,${panY/zoom}px)`, transformOrigin:'center center', transition:dragRef.current.dragging?'none':'transform 0.1s', filter:canvasFilter }}>
          <img src={garmentImgSrc} alt="garment" style={{ width:'100%', display:'block', filter:colorToFilter(color) }} onError={e=>{e.target.style.opacity='0.05'}} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:100, opacity:0.03, pointerEvents:'none' }}>{garmentEmoji}</div>
          {designImgSrc && (
            <img src={designImgSrc} alt="design" style={{ position:'absolute', top:`${posY}%`, left:`${posX}%`, transform:`translate(-50%,-50%) rotate(${rotation}deg)`, width:`${scale}%`, objectFit:'contain', pointerEvents:'none' }} />
          )}
          {textOn && textVal && (
            <div style={{ position:'absolute', top:`${textPosY}%`, left:`${textPosX}%`, transform:`translate(-50%,-50%) rotate(${textRot}deg)`, fontFamily:textFont, fontSize:textSize, color:textColor, fontWeight:700, textShadow:'0 1px 6px rgba(0,0,0,.4)', pointerEvents:'none', whiteSpace:'nowrap' }}>{textVal}</div>
          )}
        </div>
        {/* Zoom indicator */}
        {zoom > 1 && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.5)', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 8px', borderRadius:6, backdropFilter:'blur(4px)' }}>
            {Math.round(zoom*100)}%
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'center', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>Pinch to zoom · Drag to pan</span>
        {zoom > 1 && <button onClick={resetView} style={{ fontSize:11, fontWeight:700, color:'#c8102e', background:'none', border:'none', cursor:'pointer' }}>Reset</button>}
      </div>

      {/* Save button */}
      <button onClick={savePreview}
        style={{ display:'flex', alignItems:'center', gap:8, margin:'12px auto 0', padding:'11px 28px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.2)', background:saved?'rgba(0,168,107,.15)':'rgba(255,255,255,.07)', color:saved?'#00a86b':'#fff', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
        {saved ? '✓ Saved to device!' : '📥 Save Preview Image'}
      </button>
    </div>
  )
}
// ══════════════════════════════════════════════════════════════
// PRODUCT IMAGE VIEWER — Flipkart-style 360° drag viewer (Studio Step 5)
// ══════════════════════════════════════════════════════════════
function ProductImageViewer({ product, fallbackSrc, designImgSrc, sideImgs, sidePos, posX, posY, scale, rotation, textOn, textVal, textFont, textSize, textColor, textPosX=50, textPosY=75, textRot=0, sideText, colorToFilter, color, canvasFilter, garmentEmoji, bgColor='#111' }) {
  // sideImgs/sidePos take priority (Step 5 multi-side); fall back to single designImgSrc
  const getDesign = key => sideImgs ? sideImgs[key] : (key==='front' ? designImgSrc : null)
  const getPos    = key => sidePos  ? sidePos[key]  : { posX, posY, scale, rotation }
  const frames = React.useMemo(() => {
    if (product?.img_front || product?.img_back || product?.img_left || product?.img_right) {
      return [
        { key:'front', label:'Front',      src: product.img_front || fallbackSrc },
        { key:'right', label:'Right Side', src: product.img_right || fallbackSrc },
        { key:'back',  label:'Back',       src: product.img_back  || fallbackSrc },
        { key:'left',  label:'Left Side',  src: product.img_left  || fallbackSrc },
      ].filter(f => f.src)
    }
    return [{ key:'front', label:'Front', src: fallbackSrc }]
  }, [product, fallbackSrc])

  const TOTAL = frames.length
  const [idx, setIdx]         = React.useState(0)
  const [saved, setSaved]     = React.useState(false)
  const [hint, setHint]       = React.useState(true)
  const [dragging, setDragging] = React.useState(false)
  const dragX   = React.useRef(null)
  const accum   = React.useRef(0)
  const autoRef = React.useRef(null)
  const DRAG_PX = 52

  const current    = frames[idx] || frames[0]
  const showDesign = current?.key === 'front'
  const showBack   = current?.key === 'back'
  const deg        = Math.round((idx / TOTAL) * 360)

  const dismiss = React.useCallback(() => setHint(false), [])
  const getX    = e => e.touches ? e.touches[0].clientX : e.clientX

  // Auto-spin once on mount
  React.useEffect(() => {
    if (TOTAL < 2) return
    let i = 0
    autoRef.current = setInterval(() => {
      i++
      setIdx(f => (f + 1) % TOTAL)
      if (i >= TOTAL) clearInterval(autoRef.current)
    }, 220)
    return () => clearInterval(autoRef.current)
  }, [TOTAL])

  const onDown = React.useCallback(e => {
    if (TOTAL < 2) return
    clearInterval(autoRef.current)
    dismiss()
    dragX.current = getX(e)
    accum.current = 0
    setDragging(true)
  }, [TOTAL, dismiss])

  const onMove = React.useCallback(e => {
    if (!dragging || dragX.current === null) return
    const dx = getX(e) - dragX.current
    dragX.current = getX(e)
    accum.current += dx
    const steps = Math.trunc(accum.current / DRAG_PX)
    if (steps !== 0) {
      setIdx(f => ((f + steps) % TOTAL + TOTAL) % TOTAL)
      accum.current -= steps * DRAG_PX
    }
  }, [dragging, TOTAL])

  const onUp = React.useCallback(() => { setDragging(false); dragX.current = null }, [])

  // Save preview — uses the currently visible side + its design/position
  const savePreview = async () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 800; canvas.height = 900
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,800,900)
      const loadImg = src => new Promise(res => {
        const i = new Image(); i.crossOrigin='anonymous'
        i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src
      })

      // Draw garment for the CURRENT visible side
      const gImg = await loadImg(current.src)
      if (gImg) ctx.drawImage(gImg, 0, 50, 800, 800)

      // Get design and position for the CURRENT side (not always front)
      const currentDesign = getDesign(current.key)
      const currentP      = getPos(current.key)

      if (currentDesign) {
        const dImg = await loadImg(currentDesign)
        if (dImg) {
          const dw = (currentP.scale/100) * 800
          const dx = (currentP.posX/100) * 800 - dw/2
          const dy = (currentP.posY/100) * 800 - dw/2 + 50
          ctx.save()
          ctx.translate(dx + dw/2, dy + dw/2)
          ctx.rotate((currentP.rotation || 0) * Math.PI / 180)
          ctx.drawImage(dImg, -dw/2, -dw/2, dw, dw)
          ctx.restore()
        }
      }

      // Text overlay (per-side)
      const st = sideText ? sideText[current.key] : { on: textOn, val: textVal, font: textFont, size: textSize, color: textColor, posY: textPosY, posX: textPosX, rot: textRot }
      if (st?.on && st?.val) {
        ctx.font = 'bold ' + st.size + 'px ' + st.font
        ctx.fillStyle = st.color; ctx.textAlign = 'center'
        ctx.fillText(st.val, 400, (st.posY/100)*800 + 50)
      }

      canvas.toBlob(async blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'drynn-preview-' + current.key + '.png'
        a.click(); URL.revokeObjectURL(url)
        try {
          const file = new File([blob], 'drynn-preview-' + current.key + '.png', { type:'image/png' })
          await uploadToCloudinary(file, () => {})
        } catch(uploadErr) { console.error('Cloudinary upload failed:', uploadErr) }
        setSaved(true); setTimeout(()=>setSaved(false), 2500)
      }, 'image/png')
    } catch(e) { console.error('Save failed:', e) }
  }

  return (
    <div style={{ maxWidth:420, margin:'0 auto' }}>

      {/* ── 360° Stage ── */}
      <div
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        style={{
          position:'relative', borderRadius:18, overflow:'hidden',
          background: bgColor.startsWith('#') ? `radial-gradient(ellipse at 50% 40%, ${bgColor}cc, ${bgColor})` : bgColor,
          boxShadow:'0 12px 48px rgba(0,0,0,.6)',
          userSelect:'none', touchAction:'none', cursor: TOTAL>1 ? (dragging?'grabbing':'grab') : 'default',
          filter:canvasFilter,
        }}>

        {/* All frames stacked, only active one visible */}
        {frames.map((f, i) => (
          <div key={f.key} style={{ position: i===0?'relative':'absolute', inset:0, opacity: i===idx?1:0, transition:'opacity .07s ease', pointerEvents:'none' }}>
            <img
              src={f.src} alt={f.label}
              style={{ width:'100%', display:'block', filter:colorToFilter(color), minHeight:260, objectFit:'contain' }}
              onError={e=>{ e.target.style.opacity='0.05' }}
            />
            {/* Design overlay — per side */}
            {(() => {
              const d = getDesign(f.key)
              const p = getPos(f.key)
              if (!d) return null
              return (
                <img src={d} alt="design"
                  style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                    transform:`translate(-50%,-50%) rotate(${p.rotation}deg)`,
                    width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }} />
              )
            })()}
            {/* Text overlay — per side */}
            {(() => {
              const st = sideText ? sideText[f.key] : { on: textOn, val: textVal, font: textFont, size: textSize, color: textColor, posY: textPosY, posX: textPosX, rot: textRot }
              if (!st?.on || !st?.val) return null
              return (
                <div style={{ position:'absolute', top:`${st.posY}%`, left:`${st.posX}%`, transform:`translate(-50%,-50%) rotate(${st.rot}deg)`,
                  fontFamily:st.font, fontSize:st.size, color:st.color, fontWeight:700,
                  textShadow:'0 1px 6px rgba(0,0,0,.5)', pointerEvents:'none', whiteSpace:'nowrap' }}>{st.val}</div>
              )
            })()}
          </div>
        ))}

        {/* Fallback emoji watermark */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:100, opacity:0.025, pointerEvents:'none' }}>{garmentEmoji}</div>

        {/* 3D badge */}
        <div style={{ position:'absolute', top:12, left:12, background:'rgba(10,10,10,.85)',
          color:'#fff', fontFamily:'Bebas Neue,sans-serif', fontSize:13, letterSpacing:'.14em',
          padding:'4px 10px', borderRadius:6, backdropFilter:'blur(6px)' }}>3D</div>

        {/* Degree counter */}
        {TOTAL > 1 && (
          <div style={{ position:'absolute', top:12, right:12, background:'rgba(10,10,10,.65)',
            color:'rgba(255,255,255,.8)', fontSize:11, fontWeight:700, letterSpacing:'.06em',
            padding:'4px 10px', borderRadius:20, backdropFilter:'blur(6px)' }}>
            {deg}°
          </div>
        )}

        {/* Drag hint — auto-hides after first drag */}
        {TOTAL > 1 && (
          <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
            background:'rgba(10,10,10,.72)', backdropFilter:'blur(10px)',
            color:'#fff', fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:99,
            display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
            letterSpacing:'.02em', pointerEvents:'none',
            opacity: hint ? 1 : 0, transition:'opacity .4s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M18 11V6.5a2.5 2.5 0 0 0-5 0v.5M13 7a2.5 2.5 0 0 0-5 0V11M8 11V7.5a2.5 2.5 0 0 0-5 0V17a6 6 0 0 0 6 6h5a5 5 0 0 0 5-5v-2.5a2.5 2.5 0 0 0-5 0"/>
            </svg>
            Drag to see 360°
          </div>
        )}
      </div>

      {/* ── View label + progress bar ── */}
      {TOTAL > 1 && (
        <div style={{ marginTop:12, padding:'0 2px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.4)' }}>
              {current.label}
            </span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', letterSpacing:'.06em' }}>
              {idx+1} / {TOTAL}
            </span>
          </div>
          {/* Progress track */}
          <div style={{ height:2, background:'rgba(255,255,255,.1)', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${((idx)/(TOTAL-1))*100}%`, background:'#c8102e', borderRadius:2, transition:'width .12s ease' }} />
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      {TOTAL > 1 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
          <button onClick={()=>{ dismiss(); setIdx(i=>(i-1+TOTAL)%TOTAL) }}
            style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.07)', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}>‹</button>

          {/* Dot strip */}
          <div style={{ flex:1, display:'flex', justifyContent:'center', gap:7 }}>
            {frames.map((f,i)=>(
              <button key={f.key} onClick={()=>{ dismiss(); setIdx(i) }}
                style={{ width: i===idx?22:8, height:8, borderRadius:4, border:'none', cursor:'pointer', padding:0,
                  background: i===idx?'#c8102e':'rgba(255,255,255,.2)', transition:'all .2s' }} />
            ))}
          </div>

          <button onClick={()=>{ dismiss(); setIdx(i=>(i+1)%TOTAL) }}
            style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.07)', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}>›</button>
        </div>
      )}

      {/* ── Thumbnail strip ── */}
      {TOTAL > 1 && (
        <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'center' }}>
          {frames.map((f,i) => (
            <button key={f.key} onClick={()=>{ dismiss(); setIdx(i) }}
              style={{ width:64, height:64, borderRadius:10, overflow:'hidden', border:'2px solid',
                borderColor: i===idx ? '#c8102e' : 'rgba(255,255,255,.12)',
                background:'#fff', padding:0, cursor:'pointer', transition:'border-color .15s', flexShrink:0 }}>
              <img src={f.src} alt={f.label}
                style={{ width:'100%', height:'100%', objectFit:'contain', filter:colorToFilter(color) }}
                onError={e=>{ e.target.style.opacity='0.1' }} />
            </button>
          ))}
        </div>
      )}

      {/* ── Save button ── */}
      <button onClick={savePreview}
        style={{ display:'flex', alignItems:'center', gap:8, margin:'14px auto 0', padding:'11px 28px',
          borderRadius:8, border:'1.5px solid rgba(255,255,255,.2)',
          background: saved ? 'rgba(0,168,107,.15)' : 'rgba(255,255,255,.07)',
          color: saved ? '#00a86b' : '#fff', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
        {saved ? '✓ Saved!' : '📥 Save Preview Image'}
      </button>
    </div>
  )
}

// ── Shared colour-to-CSS-filter converter (used by Studio + Admin) ──────────
function colorToFilter(hex) {
  if (!hex) return 'none'
  const h = hex.replace('#','').toLowerCase()
  if (h === 'ffffff') return 'none'
  if (h === '000000' || h === '0a0a0a') return 'brightness(0) saturate(1)'
  let r, g, b
  if (h.length === 3) {
    r = parseInt(h[0]+h[0],16); g = parseInt(h[1]+h[1],16); b = parseInt(h[2]+h[2],16)
  } else {
    r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); b = parseInt(h.slice(4,6),16)
  }
  const rn = r/255, gn = g/255, bn = b/255
  const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn)
  const l = (max + min) / 2
  const d = max - min
  let h2 = 0, s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2*l - 1))
    if      (max === rn) h2 = ((gn - bn) / d + 6) % 6
    else if (max === gn) h2 = (bn - rn) / d + 2
    else                 h2 = (rn - gn) / d + 4
    h2 = h2 * 60
  }
  if (l < 0.12) return `brightness(${Math.round(l * 6 * 100)}%) saturate(1)`
  if (l > 0.92 && s < 0.15) return 'none'
  if (s < 0.12) return `brightness(${Math.round(l * 100)}%) saturate(0.05)`
  const hueRotate  = Math.round(h2 - 35)
  const satMult    = Math.min(20, Math.round(s * 18 + 2))
  const brightMult = Math.min(1.4, Math.max(0.35, l * 1.3 + 0.15)).toFixed(2)
  return `sepia(1) saturate(${satMult}) hue-rotate(${hueRotate}deg) brightness(${brightMult})`
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// LIVE T-SHIRT PREVIEW  -  canvas-based, design on fabric
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// DRYNN UNIFIED STUDIO  — 6-step flow
// ══════════════════════════════════════════════════════════════
function StudioPage({ user, onNav, onAddToCart }) {
  // ── All admin products ────────────────────────────────────
  const allProducts = useProducts()

  // ── Step tracking ─────────────────────────────────────────
  const STEPS_LIST = ['Product','Colour','Design','Customise','Preview','Order']
  const [step, setStep] = useState(1)
  const [previewView, setPreviewView] = useState('front')

  // ── Step 1: Product ───────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch,   setProductSearch]   = useState('')

  // ── Step 2: Colour ────────────────────────────────────────
  const [color, setColor] = useState('#ffffff')

  // ── Step 3: Design (per-side) ────────────────────────────
  const SIDES = ['front','back','left','right']
  const SIDE_LABELS = { front:'Front', back:'Back', left:'Left Side', right:'Right Side' }
  const [activeSide,    setActiveSide]    = useState('front')
  // sideFiles[side] = File object | null
  const [sideFiles,     setSideFiles]     = useState({ front:null, back:null, left:null, right:null })
  // sideSamples[side] = sample object | null
  const [sideSamples,   setSideSamples]   = useState({ front:null, back:null, left:null, right:null })
  // sideImgs[side] = preview URL | null
  const [sideImgs,      setSideImgs]      = useState({ front:null, back:null, left:null, right:null })
  const [uploadErr,     setUploadErr]     = useState('')
  const [samples,       setSamples]       = useState([])
  const [samplesLoading,setSamplesLoading]= useState(false)
  const [sampleCat,     setSampleCat]     = useState('All')
  const [designTab,     setDesignTab]     = useState('upload')

  // Convenience: current side's values
  const designImgSrc  = sideImgs[activeSide]
  const uploadedFile  = sideFiles[activeSide]
  const selectedSample = sideSamples[activeSide]

  const loadSamples = async () => {
    if (samples.length > 0) return
    setSamplesLoading(true)
    const { data } = await supabase.from('drynn_samples').select('*').order('created_at', { ascending: false })
    setSamples(data || [])
    setSamplesLoading(false)
  }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml']
    if (!allowed.includes(f.type)) { setUploadErr('Only PNG, JPG, SVG allowed.'); return }
    if (f.size > 20*1024*1024) { setUploadErr('Max 20MB.'); return }
    setUploadErr('')
    setSideFiles(prev => ({ ...prev, [activeSide]: f }))
    setSideSamples(prev => ({ ...prev, [activeSide]: null }))
    setSideImgs(prev => ({ ...prev, [activeSide]: URL.createObjectURL(f) }))
  }

  const pickSample = s => {
    setSideSamples(prev => ({ ...prev, [activeSide]: s }))
    setSideFiles(prev => ({ ...prev, [activeSide]: null }))
    setSideImgs(prev => ({ ...prev, [activeSide]: s.image_url }))
  }

  // ── Step 4: Customise (per-side) ─────────────────────────
  const DEFAULT_POS = { posY:38, posX:50, scale:38, rotation:0 }
  const [sidePos,    setSidePos]    = useState({ front:{...DEFAULT_POS}, back:{...DEFAULT_POS}, left:{...DEFAULT_POS}, right:{...DEFAULT_POS} })
  const [custSide,   setCustSide]   = useState('front')
  const custPos = sidePos[custSide]
  const posY = custPos.posY, posX = custPos.posX, scale = custPos.scale, rotation = custPos.rotation
  const setPosY     = v => setSidePos(p => ({ ...p, [custSide]: { ...p[custSide], posY: v } }))
  const setPosX     = v => setSidePos(p => ({ ...p, [custSide]: { ...p[custSide], posX: v } }))
  const setScale    = v => setSidePos(p => ({ ...p, [custSide]: { ...p[custSide], scale: v } }))
  const setRotation = v => setSidePos(p => ({ ...p, [custSide]: { ...p[custSide], rotation: v } }))

  const DEFAULT_TEXT = { on:false, val:'YOUR TEXT', font:'Bebas Neue', color:'#ffffff', size:24, posY:75, posX:50, rot:0 }
  const [sideText, setSideText] = useState({ front:{...DEFAULT_TEXT}, back:{...DEFAULT_TEXT}, left:{...DEFAULT_TEXT}, right:{...DEFAULT_TEXT} })
  const custText = sideText[custSide]
  const textOn    = custText.on
  const textVal   = custText.val
  const textFont  = custText.font
  const textColor = custText.color
  const textSize  = custText.size
  const textPosY  = custText.posY
  const textPosX  = custText.posX
  const textRot   = custText.rot
  const setTextOn    = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], on:    typeof v === 'function' ? v(p[custSide].on)  : v } }))
  const setTextVal   = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], val:   v } }))
  const setTextFont  = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], font:  v } }))
  const setTextColor = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], color: v } }))
  const setTextSize  = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], size:  v } }))
  const setTextPosY  = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], posY:  v } }))
  const setTextPosX  = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], posX:  v } }))
  const setTextRot   = v => setSideText(p => ({ ...p, [custSide]: { ...p[custSide], rot:   v } }))
  const [brightness, setBrightness] = useState(100)
  const [contrast,   setContrast]   = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [filterFx,   setFilterFx]   = useState('')
  const [bgOn,       setBgOn]       = useState(false)
  const [bgColor,    setBgColor]    = useState('#000000')
  const [custTab,    setCustTab]     = useState('position')

  // ── Step 5 (Preview): 3D ─────────────────────────────────
  // Step 5 preview handled by InteractiveMockup component
  // printSheetUrl is generated on-demand in handleSubmit and passed directly

  // ── generatePrintSheet ────────────────────────────────────
  // Composites all 4 sides into a single 4-panel PNG, uploads to
  // Cloudinary, and returns the URL.
  // resolvedDesignUrls: { front, back, left, right } — must be real HTTPS
  // URLs (never blob: URLs), so always pass the Cloudinary URLs from
  // handleSubmit after upload is complete.
  const generatePrintSheet = async (resolvedDesignUrls = {}) => {
    try {
      const SIDE_KEYS = ['front','back','left','right']
      const SIDE_LABELS_PRINT = { front:'FRONT', back:'BACK', left:'LEFT', right:'RIGHT' }

      // Panel: 500 × 560 each. Sheet: 2000 × 1120 (2×2 grid) + 40px bottom label strip
      const PANEL_W = 500
      const PANEL_H = 560
      const COLS    = 2
      const ROWS    = 2
      const LABEL_H = 40
      const SHEET_W = PANEL_W * COLS   // 1000
      const SHEET_H = PANEL_H * ROWS + LABEL_H  // 1160

      const canvas = document.createElement('canvas')
      canvas.width  = SHEET_W
      canvas.height = SHEET_H
      const ctx = canvas.getContext('2d')

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, SHEET_W, SHEET_H)

      const loadImg = src => new Promise(res => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => res(img)
        img.onerror = () => res(null)
        img.src = src
      })

      // Draw each panel
      for (let i = 0; i < SIDE_KEYS.length; i++) {
        const side  = SIDE_KEYS[i]
        const col   = i % COLS
        const row   = Math.floor(i / COLS)
        const baseX = col * PANEL_W
        const baseY = row * PANEL_H

        // Thin grid divider
        ctx.fillStyle = '#e8e8e8'
        if (col > 0) ctx.fillRect(baseX, baseY, 1, PANEL_H)
        if (row > 0) ctx.fillRect(baseX, baseY, PANEL_W, 1)

        // Garment image for this side
        const garmentUrl = selectedProduct
          ? (selectedProduct[`img_${side}`] || selectedProduct.image_url || null)
          : null
        const fallbackUrl = GARMENT_DEFAULTS[garmentType]

        if (garmentUrl || fallbackUrl) {
          const gImg = await loadImg(garmentUrl || fallbackUrl)
          if (gImg) ctx.drawImage(gImg, baseX + 40, baseY + 40, PANEL_W - 80, PANEL_H - 80)
        }

        // Design overlay for this side — use resolved HTTPS URLs only
        const designUrl = resolvedDesignUrls[side]
        if (designUrl) {
          const dImg = await loadImg(designUrl)
          if (dImg) {
            const pos   = sidePos[side]
            const dw    = (pos.scale / 100) * (PANEL_W - 80)
            const dx    = baseX + 40 + (pos.posX / 100) * (PANEL_W - 80) - dw / 2
            const dy    = baseY + 40 + (pos.posY / 100) * (PANEL_H - 80) - dw / 2
            ctx.save()
            ctx.translate(dx + dw / 2, dy + dw / 2)
            ctx.rotate((pos.rotation || 0) * Math.PI / 180)
            ctx.drawImage(dImg, -dw / 2, -dw / 2, dw, dw)
            ctx.restore()
          }
        }

        // Text overlay (per-side)
        const st = sideText[side]
        if (st?.on && st?.val) {
          ctx.font      = `bold ${Math.round(st.size * (PANEL_W / 420))}px ${st.font}`
          ctx.fillStyle = st.color
          ctx.textAlign = 'center'
          ctx.fillText(st.val, baseX + PANEL_W / 2, baseY + (st.posY / 100) * PANEL_H + 40)
        }

        // Side label inside each panel (top-left corner)
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(baseX + 8, baseY + 8, 68, 22)
        ctx.fillStyle = '#ffffff'
        ctx.font      = 'bold 11px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(SIDE_LABELS_PRINT[side], baseX + 14, baseY + 23)

        // Shade panels with no design
        if (!sideImgs[side]) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)'
          ctx.fillRect(baseX + 1, baseY + 1, PANEL_W - 2, PANEL_H - 2)
        }
      }

      // Bottom label strip
      const garmentLabel = selectedProduct ? selectedProduct.name : garmentType
      const customerName  = form.name || 'Customer'
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, PANEL_H * ROWS, SHEET_W, LABEL_H)
      ctx.fillStyle = '#ffffff'
      ctx.font      = 'bold 13px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(
        `DRYNN PRINT SHEET — ${customerName} — ${garmentLabel} — ${color}`,
        SHEET_W / 2,
        PANEL_H * ROWS + 26
      )

      // Convert to blob and upload to Cloudinary
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const file = new File([blob], `drynn-printsheet-${Date.now()}.png`, { type: 'image/png' })
      const url  = await uploadToCloudinary(file, () => {})
      return url
    } catch (e) {
      console.error('[PrintSheet] Generation failed:', e)
      return null
    }
  }

  // ── Step 6: Order ─────────────────────────────────────────
  const [size,       setSize]     = useState('M')
  const [form,       setForm]     = useState({ name:user?.user_metadata?.full_name||user?.email||'', phone:'', qty:1, address:'' })
  const [status,     setStatus]   = useState('')
  const [uploadPct,  setUploadPct]= useState(0)

  const handleSubmit = async () => {

    setStatus('uploading')
    try {
      const designUrls = {}
      for (const side of SIDES) {
        if (sideFiles[side]) {
          try { designUrls[side] = await uploadToCloudinary(sideFiles[side], pct=>setUploadPct(pct)) }
          catch(e) { setStatus(''); alert('Upload failed for '+side+': '+e.message); return }
        } else if (sideSamples[side]) {
          designUrls[side] = sideSamples[side].image_url
        }
      }
      setStatus('saving')
      const garmentLabel = selectedProduct ? selectedProduct.name : 'Custom Garment'
      const sidesLabel   = SIDES.filter(s=>sideImgs[s]).map(s=>SIDE_LABELS[s]).join(', ')

      // Generate print sheet using the just-uploaded Cloudinary URLs (never blob: URLs)
      setStatus('sheet')
      const sheetUrl = await generatePrintSheet(designUrls)

      // Build a cart item representing this custom order
      const customItem = {
        id:        `custom_${Date.now()}`,
        name:      `Custom ${garmentLabel}`,
        price:     selectedProduct?.price || 0,
        mrp:       selectedProduct?.mrp   || 0,
        qty:       Number(form.qty) || 1,
        size,
        color,
        image_url: designUrls.front || selectedProduct?.image_url || null,
        isCustom:  true,
        customDetails: {
          garment:       garmentLabel,
          sides:         sidesLabel,
          designUrls,
          sidePos,
          name:          form.name,
          phone:         form.phone,
          address:       form.address,
          textOn, textVal, textFont, textColor, textSize, textPosX, textPosY, textRot,
          sideText,
          printSheetUrl: sheetUrl || null,
        },
      }
      onAddToCart(customItem)
      setStatus('done')
      setTimeout(() => onNav('cart'), 1200)
    } catch(e) { setStatus(''); alert('Error: '+e.message) }
  }

  // ── Derived ───────────────────────────────────────────────
  const SWATCHES = ['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#00a86b','#f5a623','#9b59b6','#888888','#e8d5b7','#2c3e50']
  const SIZES    = ['XS','S','M','L','XL','XXL','3XL']
  const TEXT_FONTS = ['Bebas Neue','DM Sans','Georgia','Courier New','Impact','Arial Black']
  const FILTERS  = [
    {label:'None',value:''},{label:'Vintage',value:'sepia(0.6) contrast(1.1)'},
    {label:'B&W',value:'grayscale(1)'},{label:'Vivid',value:'saturate(2) contrast(1.1)'},
    {label:'Cool',value:'hue-rotate(180deg) saturate(0.8)'},{label:'Warm',value:'sepia(0.3) saturate(1.4)'},
  ]
  // colorToFilter is defined at module scope — shared with admin panel
  const canvasFilter = [filterFx, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`].filter(Boolean).join(' ')

  // Mockup URLs come from selected product's img_front/back/left/right columns — no drynn_settings needed
  const getMockupUrl = (garment, view) => {
    if (selectedProduct) return selectedProduct[`img_${view}`] || null
    return null
  }

  // Garment image — use admin product image if available, fallback to mockup, fallback to default
  const GARMENT_DEFAULTS = {
    'T-Shirt': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
    'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
  }
  const GARMENT_EMOJI = {'T-Shirt':'👕','Hoodie':'🧥','Polo':'👔','Joggers':'👖'}
  const garmentType = selectedProduct
    ? (selectedProduct.category==='Hoodies'?'Hoodie':selectedProduct.category==='Polos'?'Polo':selectedProduct.category==='Joggers'?'Joggers':'T-Shirt')
    : 'T-Shirt'
  const garmentImgSrc = selectedProduct?.image_url || getMockupUrl(garmentType,'front') || GARMENT_DEFAULTS[garmentType]

  const canGoNext = () => {
    if (step===1) return true  // product optional
    if (step===2) return !!color
    if (step===3) return true
    if (step===4) return true
    if (step===5) return true
    return false
  }

  const filteredProducts = allProducts.filter(p =>
    !productSearch.trim() ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  )

  // ── shared styles ─────────────────────────────────────────
  const lblStyle  = { fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.5)', display:'block', marginBottom:8 }
  const inputStyle = { width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none' }
  const rowStyle  = { display:'flex', justifyContent:'space-between', marginBottom:6 }

  // ── Live preview panel (shown on steps 3-6) ───────────────
  const LivePreview = ({ previewSide }) => {
    const ps = previewSide || custSide || 'front'
    const pImg = sideImgs[ps]
    const pp   = sidePos[ps]
    // Resolve the correct garment image for the active side
    const sideGarmentImg = selectedProduct
      ? (selectedProduct[`img_${ps}`] || selectedProduct.image_url || GARMENT_DEFAULTS[garmentType])
      : GARMENT_DEFAULTS[garmentType]
    return (
    <div style={{ position:'sticky', top:72, flex:'0 0 280px', maxWidth:280, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', textAlign:'center', marginBottom:4 }}>Live Preview — {SIDE_LABELS[ps]}</div>
      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', background:bgColor, boxShadow:'0 8px 32px rgba(0,0,0,.5)', filter:canvasFilter }}>
        {/* Garment base — switches per selected side tab */}
        <img src={sideGarmentImg} alt={`${garmentType} ${ps}`} style={{ width:'100%', display:'block', filter:colorToFilter(color), minHeight:220, objectFit:'contain' }}
          onError={e=>{ e.target.style.opacity='0.05' }} />
        {/* Fallback emoji */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, opacity:0.04, pointerEvents:'none' }}>
          {GARMENT_EMOJI[garmentType]}
        </div>
        {/* Design overlay */}
        {pImg && (
          <img src={pImg} alt="design"
            style={{ position:'absolute', top:`${pp.posY}%`, left:`${pp.posX}%`,
              transform:`translate(-50%,-50%) rotate(${pp.rotation}deg)`,
              width:`${pp.scale}%`, objectFit:'contain', pointerEvents:'none' }} />
        )}
        {/* Text overlay */}
        {sideText[ps]?.on && sideText[ps]?.val && (
          <div style={{ position:'absolute', top:`${sideText[ps].posY}%`, left:`${sideText[ps].posX}%`,
            transform:`translate(-50%,-50%) rotate(${sideText[ps].rot}deg)`,
            fontFamily:sideText[ps].font, fontSize:sideText[ps].size, color:sideText[ps].color, fontWeight:700,
            textShadow:'0 1px 6px rgba(0,0,0,.6)', pointerEvents:'none', whiteSpace:'nowrap' }}>
            {sideText[ps].val}
          </div>
        )}
        {/* No design hint */}
        {!pImg && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'rgba(0,0,0,.55)', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:2 }}>🎨</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:600 }}>No design for this side</div>
            </div>
          </div>
        )}
      </div>

      {/* Side dots */}
      {SIDES.some(s=>sideImgs[s]) && (
        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
          {SIDES.map(s=>(
            <div key={s} style={{ width:8, height:8, borderRadius:'50%',
              background: sideImgs[s] ? '#00a86b' : 'rgba(255,255,255,.12)',
              transition:'background .2s' }} title={SIDE_LABELS[s]} />
          ))}
        </div>
      )}
      {/* Quick info */}
      <div style={{ background:'rgba(255,255,255,.05)', borderRadius:8, padding:'10px 12px', fontSize:11, color:'rgba(255,255,255,.5)', lineHeight:1.7 }}>
        <div><span style={{ color:'rgba(255,255,255,.3)' }}>Garment: </span><strong style={{ color:'#fff' }}>{selectedProduct?.name || garmentType}</strong></div>
        <div><span style={{ color:'rgba(255,255,255,.3)' }}>Colour: </span><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:color, border:'1px solid rgba(255,255,255,.3)', verticalAlign:'middle', marginRight:3 }} /><strong style={{ color:'#fff' }}>{color}</strong></div>
        <div><span style={{ color:'rgba(255,255,255,.3)' }}>Design: </span><strong style={{ color: sideImgs.front?'#00a86b':'rgba(255,255,255,.4)' }}>{sideImgs.front ? '✓ Front' : '—'}</strong></div>
        {SIDES.filter(s=>s!=='front'&&sideImgs[s]).length>0 && <div><span style={{ color:'rgba(255,255,255,.3)' }}>Extra sides: </span><strong style={{ color:'#00a86b' }}>{SIDES.filter(s=>s!=='front'&&sideImgs[s]).map(s=>SIDE_LABELS[s]).join(', ')}</strong></div>}
      </div>
    </div>
  )}

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ background:'#0d1b3e', minHeight:'100vh' }}>

      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(135deg,#0a1f5d,#1a0a2e)', padding:'32px 16px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 70%,rgba(200,16,46,.15) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:960, margin:'0 auto', position:'relative', zIndex:1 }}>
          <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.8)', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div style={{ textAlign:'center' }}>
            <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>Custom Design Studio</span>
            <h1 className="sec-title" style={{ color:'#fff' }}>DRYNN STUDIO</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:6 }}>Pick product · Colour · Design · Customise · Preview · Order</p>
          </div>
        </div>
      </div>

      {/* ── Step progress bar ── */}
      <div style={{ background:'#111827', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'0 16px', overflowX:'auto' }}>
        <div style={{ display:'flex', maxWidth:960, margin:'0 auto', minWidth:'max-content' }}>
          {STEPS_LIST.map((label, i) => {
            const n = i+1
            const done   = n < step
            const active = n === step
            return (
              <button key={n} onClick={()=>{ if(n<step || (n===step+1 && canGoNext())) setStep(n) }}
                style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', position:'relative',
                  borderBottom: active ? '2.5px solid #c8102e' : '2.5px solid transparent' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
                  background: done?'#00a86b':active?'#c8102e':'rgba(255,255,255,.1)',
                  color:'#fff', transition:'background .2s' }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:active?'#fff':'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Step content ── */}
      <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px 80px' }}>

        {/* ══ STEP 1: PICK PRODUCT ══ */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>STEP 1 — CHOOSE YOUR GARMENT</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>Pick a product from our collection. This becomes the base of your custom design.</p>
            </div>

            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.07)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search garments…"
                style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:13, color:'#fff', fontFamily:'DM Sans,sans-serif' }} />
            </div>

            {allProducts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 20px', background:'rgba(255,255,255,.04)', borderRadius:14 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>👕</div>
                <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:6 }}>No products yet</div>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.7 }}>Admin hasn't added any products.<br/>You can still continue with a standard garment.</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                {filteredProducts.map(p => {
                  const isSelected = selectedProduct?.id === p.id
                  return (
                    <div key={p.id} onClick={()=>setSelectedProduct(isSelected ? null : p)}
                      style={{ background: isSelected?'rgba(200,16,46,.12)':'rgba(255,255,255,.05)', border:`2px solid ${isSelected?'#c8102e':'rgba(255,255,255,.1)'}`, borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'all .15s', position:'relative' }}
                      onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor='rgba(255,255,255,.3)' }}
                      onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor='rgba(255,255,255,.1)' }}>
                      {/* Product image */}
                      <div style={{ height:160, background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                          : <span style={{ fontSize:72 }}>{p.emoji||'👕'}</span>}
                        {/* Tag */}
                        <div style={{ position:'absolute', top:8, left:8, background:p.tag_color||p.tagColor||'#c8102e', color:'#fff', fontSize:8, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'2px 8px', borderRadius:3 }}>{p.tag||'New'}</div>
                        {/* Studio exclusive */}
                        {p.studio_only && <div style={{ position:'absolute', top:8, right:8, background:'#0a1f5d', color:'#fff', fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:3 }}>Studio</div>}
                        {/* Selected tick */}
                        {isSelected && (
                          <div style={{ position:'absolute', inset:0, background:'rgba(200,16,46,.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:44, height:44, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', fontWeight:700, boxShadow:'0 4px 16px rgba(200,16,46,.5)' }}>✓</div>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:'10px 12px', background: isSelected?'rgba(200,16,46,.08)':'#1a2744' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{p.category}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#c8102e', marginTop:4 }}>₹{Number(p.price).toLocaleString()}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop:20, display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
              {selectedProduct && (
                <button onClick={()=>setSelectedProduct(null)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Deselect
                </button>
              )}
              <button onClick={()=>setStep(2)} className="btn-primary" style={{ padding:'13px 32px', fontSize:14 }}>
                {selectedProduct ? `Continue with ${selectedProduct.name} →` : 'Continue without product →'}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: COLOUR ══ */}
        {step === 2 && (
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 280px' }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>STEP 2 — CHOOSE COLOUR</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:24 }}>Select the garment colour. The live preview updates instantly.</p>

              <div style={{ marginBottom:20 }}>
                <span style={lblStyle}>Preset Colours</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {SWATCHES.map(c => (
                    <div key={c} onClick={()=>setColor(c)}
                      style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer',
                        border: c==='#ffffff' ? '2px solid rgba(255,255,255,.4)' : '2px solid transparent',
                        boxShadow: color===c ? `0 0 0 2px #0d1b3e, 0 0 0 4px #c8102e` : '0 1px 4px rgba(0,0,0,.4)',
                        transition:'box-shadow .15s', flexShrink:0 }} />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:24 }}>
                <span style={lblStyle}>Custom Colour</span>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ width:40, height:32, border:'none', borderRadius:6, cursor:'pointer', background:'none' }} />
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontFamily:'monospace' }}>{color.toUpperCase()}</span>
                </div>
              </div>

              {/* Background colour */}
              <div style={{ marginBottom:24 }}>
                <span style={lblStyle}>Preview Background</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                  {['#000000','#111111','#1a1a2e','#0a1f5d','#1a0a2e','#ffffff','#f5f5f0','#e8e8e8'].map(c => (
                    <div key={c} onClick={()=>setBgColor(c)}
                      style={{ width:28, height:28, borderRadius:6, background:c, cursor:'pointer',
                        border: c==='#ffffff'||c==='#f5f5f0'||c==='#e8e8e8' ? '2px solid rgba(255,255,255,.3)' : '2px solid transparent',
                        boxShadow: bgColor===c ? `0 0 0 2px #0d1b3e, 0 0 0 4px #c8102e` : '0 1px 4px rgba(0,0,0,.5)',
                        transition:'box-shadow .15s', flexShrink:0 }} />
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:40, height:32, border:'none', borderRadius:6, cursor:'pointer', background:'none' }} />
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontFamily:'monospace' }}>{bgColor.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setStep(1)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Back</button>
                <button onClick={()=>setStep(3)} className="btn-primary" style={{ flex:1, padding:'13px', fontSize:14 }}>Continue →</button>
              </div>
              <div style={{ marginTop:24 }}>
                <LivePreview />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 3: DESIGN ══ */}
        {step === 3 && (
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 280px' }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>STEP 3 — ADD YOUR DESIGN</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>Upload for Front (main) or add designs for other sides too — optional.</p>

              {/* Side tabs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:18 }}>
                {SIDES.map(s=>(
                  <button key={s} onClick={()=>setActiveSide(s)}
                    style={{ padding:'8px 4px', borderRadius:8, border:`2px solid ${activeSide===s?'#c8102e':sideImgs[s]?'#00a86b':'rgba(255,255,255,.12)'}`,
                      background:activeSide===s?'rgba(200,16,46,.15)':sideImgs[s]?'rgba(0,168,107,.08)':'rgba(255,255,255,.04)',
                      cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .15s', position:'relative' }}>
                    <span style={{ fontSize:18 }}>{s==='front'?'👕':s==='back'?'🔙':s==='left'?'👈':'👉'}</span>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
                      color:activeSide===s?'#fff':sideImgs[s]?'#00a86b':'rgba(255,255,255,.4)' }}>
                      {SIDE_LABELS[s]}
                    </span>
                    {sideImgs[s] && <span style={{ fontSize:8, color:'#00a86b', fontWeight:700 }}>✓</span>}
                  </button>
                ))}
              </div>

              {/* Design source tabs (upload / samples) */}
              <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,.05)', borderRadius:8, padding:3, marginBottom:16 }}>
                {[['upload','📁 Upload'],['samples','🖼 Samples']].map(([k,l])=>(
                  <button key={k} onClick={()=>{ setDesignTab(k); if(k==='samples') loadSamples() }}
                    style={{ flex:1, padding:'10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
                      background:designTab===k?'#c8102e':'transparent', color:designTab===k?'#fff':'rgba(255,255,255,.5)', transition:'all .15s' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Clear design button */}
              {sideImgs[activeSide] && (
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                  <button onClick={()=>{ setSideImgs(p=>({...p,[activeSide]:null})); setSideFiles(p=>({...p,[activeSide]:null})); setSideSamples(p=>({...p,[activeSide]:null})) }} style={{ fontSize:11, color:'rgba(255,255,255,.4)', background:'none', border:'1px solid rgba(255,255,255,.15)', borderRadius:4, padding:'4px 10px', cursor:'pointer' }}>✕ Clear design</button>
                </div>
              )}

              {/* Upload tab */}
              {designTab==='upload' && (
                <div>
                  <div onClick={()=>document.getElementById(`studioFile_${activeSide}`).click()}
                    style={{ border:`2px dashed ${uploadedFile?'rgba(0,168,107,.5)':'rgba(255,255,255,.18)'}`, borderRadius:12, padding:'28px 16px', textAlign:'center', cursor:'pointer', background:'rgba(255,255,255,.03)', marginBottom:12, transition:'all .2s' }}>
                    <input id={`studioFile_${activeSide}`} type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display:'none' }} onChange={handleFile} />
                    {uploadedFile ? (
                      <div>
                        <img src={designImgSrc} alt="" style={{ maxHeight:110, maxWidth:'100%', borderRadius:8, marginBottom:8, objectFit:'contain' }} />
                        <div style={{ fontSize:13, color:'#00a86b', fontWeight:700, marginBottom:3 }}>✓ {uploadedFile.name}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{(uploadedFile.size/1024/1024).toFixed(1)} MB · Tap to change</div>
                      </div>
                    ) : designImgSrc ? (
                      <div>
                        <img src={designImgSrc} alt="" style={{ maxHeight:110, maxWidth:'100%', borderRadius:8, marginBottom:8, objectFit:'contain' }} />
                        <div style={{ fontSize:12, color:'#00a86b', fontWeight:700, marginBottom:3 }}>✓ Sample selected · Tap to upload instead</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:48, marginBottom:10 }}>📁</div>
                        <div style={{ fontSize:14, color:'rgba(255,255,255,.8)', fontWeight:700, marginBottom:4 }}>Tap to upload {SIDE_LABELS[activeSide]} design</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>PNG · JPG · SVG · Max 20MB · Min 300 DPI</div>
                      </div>
                    )}
                  </div>
                  {uploadErr && <div style={{ fontSize:12, color:'#c8102e', padding:'8px 12px', background:'rgba(200,16,46,.08)', borderRadius:6, marginBottom:12 }}>⚠ {uploadErr}</div>}
                </div>
              )}

              {/* Samples tab */}
              {designTab==='samples' && (
                <div>
                  {samples.length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                      {['All',...new Set(samples.map(s=>s.category).filter(Boolean))].map(cat=>(
                        <button key={cat} onClick={()=>setSampleCat(cat)}
                          style={{ padding:'5px 12px', borderRadius:100, fontSize:10, fontWeight:700, cursor:'pointer',
                            background:sampleCat===cat?'#c8102e':'transparent',
                            color:sampleCat===cat?'#fff':'rgba(255,255,255,.5)',
                            border:`1.5px solid ${sampleCat===cat?'#c8102e':'rgba(255,255,255,.15)'}` }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  {samplesLoading
                    ? <div style={{ textAlign:'center', padding:32, color:'rgba(255,255,255,.4)', fontSize:13 }}>Loading samples…</div>
                    : samples.length===0
                      ? <div style={{ textAlign:'center', padding:32, background:'rgba(255,255,255,.04)', borderRadius:10, color:'rgba(255,255,255,.35)', fontSize:13 }}>No samples added yet.</div>
                      : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                          {samples.filter(s=>sampleCat==='All'||s.category===sampleCat).map(s=>(
                            <div key={s.id} onClick={()=>pickSample(s)}
                              style={{ borderRadius:8, overflow:'hidden', cursor:'pointer', position:'relative',
                                border:`2px solid ${selectedSample?.id===s.id?'#c8102e':'rgba(255,255,255,.1)'}`, transition:'all .15s' }}>
                              <img src={s.image_url} alt={s.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                              {selectedSample?.id===s.id && (
                                <div style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700 }}>✓</div>
                              )}
                              <div style={{ padding:'4px 6px', background:'rgba(0,0,0,.65)' }}>
                                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>}
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={()=>setStep(2)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Back</button>
                <button onClick={()=>setStep(4)} className="btn-primary" style={{ flex:1, padding:'13px', fontSize:14 }}>
                  {SIDES.filter(s=>sideImgs[s]).length > 0 ? `Continue (${SIDES.filter(s=>sideImgs[s]).length} side${SIDES.filter(s=>sideImgs[s]).length>1?'s':''}) →` : 'Continue →'}
                </button>
              </div>
              <div style={{ marginTop:24 }}>
                <LivePreview previewSide={activeSide} />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 4: CUSTOMISE ══ */}
        {step === 4 && (
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 280px' }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>STEP 4 — CUSTOMISE</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>Select a side to customise its position. Add text and effects below.</p>

              {/* Side selector — only sides with designs */}
              {SIDES.filter(s=>sideImgs[s]).length > 1 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, marginBottom:18 }}>
                  {SIDES.filter(s=>sideImgs[s]).map(s=>(
                    <button key={s} onClick={()=>setCustSide(s)}
                      style={{ padding:'8px 4px', borderRadius:8, border:`2px solid ${custSide===s?'#c8102e':'rgba(255,255,255,.15)'}`,
                        background:custSide===s?'rgba(200,16,46,.18)':'rgba(255,255,255,.04)',
                        cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .15s' }}>
                      <img src={sideImgs[s]} alt={s} style={{ width:32, height:32, objectFit:'contain', borderRadius:4, background:'rgba(255,255,255,.1)' }} />
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:custSide===s?'#fff':'rgba(255,255,255,.4)' }}>{SIDE_LABELS[s]}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-tabs */}
              <div style={{ display:'flex', overflowX:'auto', gap:0, background:'rgba(255,255,255,.05)', borderRadius:8, padding:3, marginBottom:20, scrollbarWidth:'none' }}>
                {[['position','↔ Position'],['text','T Text'],['effects','✨ Effects']].map(([k,l])=>(
                  <button key={k} onClick={()=>setCustTab(k)}
                    style={{ flex:'0 0 auto', padding:'9px 16px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap',
                      background:custTab===k?'#0a1f5d':'transparent', color:custTab===k?'#fff':'rgba(255,255,255,.45)', transition:'all .15s' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Position */}
              {custTab==='position' && (
                <div>
                  {[
                    ['Up / Down',    posY,      setPosY,      15, 75],
                    ['Left / Right', posX,      setPosX,      15, 85],
                    ['Size',         scale,     setScale,     10, 70],
                    ['Rotation',     rotation,  setRotation, -45, 45],
                  ].map(([label, val, setter, min, max])=>(
                    <div key={label} style={{ marginBottom:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.45)' }}>{label}</span>
                        <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>{val}{label==='Rotation'?'°':'%'}</span>
                      </div>
                      <input type="range" min={min} max={max} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#c8102e' }} />
                    </div>
                  ))}
                  <button onClick={()=>{setPosY(38);setPosX(50);setScale(38);setRotation(0)}}
                    style={{ width:'100%', padding:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:6, color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ↺ Reset Position
                  </button>
                </div>
              )}

              {/* Text */}
              {custTab==='text' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.45)' }}>Text — {SIDE_LABELS[custSide]}</span>
                    <button onClick={()=>setTextOn(v=>!v)}
                      style={{ padding:'6px 16px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
                        background:textOn?'#c8102e':'rgba(255,255,255,.1)', color:'#fff' }}>
                      {textOn?'ON ✓':'OFF'}
                    </button>
                  </div>
                  {textOn ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <input value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder="Your text here"
                        style={{ ...inputStyle, fontSize:15, fontWeight:700 }} />
                      <div>
                        <span style={lblStyle}>Font</span>
                        <select value={textFont} onChange={e=>setTextFont(e.target.value)} style={{ ...inputStyle }}>
                          {TEXT_FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      {[
                        ['Up / Down',    textPosY,  setTextPosY,  5,  95],
                        ['Left / Right', textPosX,  setTextPosX,  5,  95],
                        ['Size',         textSize,  setTextSize,  12, 60],
                        ['Rotation',     textRot,   setTextRot,  -45, 45],
                      ].map(([label, val, setter, min, max])=>(
                        <div key={label}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.45)' }}>{label}</span>
                            <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>{val}{label==='Rotation'?'°':label==='Size'?'px':'%'}</span>
                          </div>
                          <input type="range" min={min} max={max} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#c8102e' }} />
                        </div>
                      ))}
                      <div>
                        <span style={lblStyle}>Text Colour</span>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                          {['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#00a86b','#f5a623','#9b59b6','#f0e68c'].map(c => (
                            <div key={c} onClick={()=>setTextColor(c)}
                              style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer',
                                border: c==='#ffffff' ? '2px solid rgba(255,255,255,.4)' : '2px solid transparent',
                                boxShadow: textColor===c ? `0 0 0 2px #0d1b3e, 0 0 0 4px #c8102e` : '0 1px 4px rgba(0,0,0,.4)',
                                transition:'box-shadow .15s', flexShrink:0 }} />
                          ))}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} style={{ width:40, height:32, border:'none', borderRadius:6, cursor:'pointer', background:'none' }} />
                          <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontFamily:'monospace' }}>{textColor.toUpperCase()}</span>
                        </div>
                      </div>
                      <button onClick={()=>{setTextPosY(75);setTextPosX(50);setTextSize(24);setTextRot(0)}}
                        style={{ width:'100%', padding:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:6, color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        ↺ Reset Text Position
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', lineHeight:1.7 }}>Toggle ON to add your custom text — brand name, slogan, or anything you want.</p>
                  )}
                </div>
              )}

              {/* Effects */}
              {custTab==='effects' && (
                <div>
                  <span style={lblStyle}>Filter Presets</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:18 }}>
                    {FILTERS.map(f=>(
                      <button key={f.label} onClick={()=>setFilterFx(f.value)}
                        style={{ padding:'6px 12px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer',
                          background:filterFx===f.value?'#c8102e':'rgba(255,255,255,.07)',
                          color:filterFx===f.value?'#fff':'rgba(255,255,255,.55)',
                          border:`1px solid ${filterFx===f.value?'#c8102e':'rgba(255,255,255,.1)'}` }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {[['Brightness',brightness,setBrightness,50,160],['Contrast',contrast,setContrast,50,200],['Saturation',saturation,setSaturation,0,250]].map(([label,val,setter,min,max])=>(
                    <div key={label} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.45)' }}>{label}</span>
                        <span style={{ fontSize:12, color:'#fff' }}>{val}%</span>
                      </div>
                      <input type="range" min={min} max={max} value={val} onChange={e=>setter(parseInt(e.target.value))} style={{ width:'100%', accentColor:'#c8102e' }} />
                    </div>
                  ))}
                  <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setFilterFx('')}}
                    style={{ width:'100%', padding:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:6, color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ↺ Reset Effects
                  </button>
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                <button onClick={()=>setStep(3)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Back</button>
                <button onClick={()=>setStep(5)} className="btn-primary" style={{ flex:1, padding:'13px', fontSize:14 }}>Preview →</button>
              </div>
              <div style={{ marginTop:24 }}>
                <LivePreview previewSide={custSide} />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 5: PREVIEW ══ */}
        {step === 5 && (
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 280px' }}>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:4 }}>STEP 5 — PREVIEW YOUR DESIGN</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:20 }}>Swipe or tap thumbnails to see all angles. Your design appears on each uploaded side.</p>

            {/* 4-image swipe viewer */}
            <ProductImageViewer
              product={selectedProduct}
              fallbackSrc={garmentImgSrc}
              sideImgs={sideImgs}
              sidePos={sidePos}
              posX={posX} posY={posY} scale={scale} rotation={rotation}
              textOn={textOn} textVal={textVal} textFont={textFont}
              textSize={textSize} textColor={textColor}
              textPosX={textPosX} textPosY={textPosY} textRot={textRot}
              sideText={sideText}
              colorToFilter={colorToFilter}
              color={color}
              canvasFilter={canvasFilter}
              garmentEmoji={GARMENT_EMOJI[garmentType]}
              bgColor={bgColor}
            />

            {/* Summary strip */}
            <div style={{ maxWidth:420, margin:'16px auto 0', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'14px 18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Garment', selectedProduct?.name || garmentType],
                ['Colour',  color],
                ['Designs', SIDES.filter(s=>sideImgs[s]).map(s=>SIDE_LABELS[s]).join(', ') || '—'],
                ['Text', Object.values(sideText).filter(t=>t.on&&t.val).length > 0 ? Object.entries(sideText).filter(([,t])=>t.on&&t.val).map(([s])=>SIDE_LABELS[s]).join(', ') : 'None'],
              ].map(([k,v])=>(
                <div key={k}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'center' }}>
              <button onClick={()=>setStep(4)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Edit</button>
              <button onClick={()=>setStep(6)} className="btn-primary" style={{ padding:'13px 36px', fontSize:14 }}>Place Order →</button>
            </div>
            </div>
          </div>
        )}

        {/* ══ STEP 6: ORDER ══ */}
        {step === 6 && (
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 280px' }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>STEP 6 — PLACE YOUR ORDER</h2>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:24 }}>Fill your details. We'll WhatsApp you within 2 hours to confirm.</p>

              {status==='done' ? (
                <div style={{ textAlign:'center', padding:'48px 16px', background:'rgba(0,168,107,.07)', border:'1px solid rgba(0,168,107,.2)', borderRadius:16 }}>
                  <div style={{ fontSize:64, marginBottom:16 }}>🛒</div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'#fff', letterSpacing:'.06em', marginBottom:8 }}>ADDED TO CART!</div>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.8 }}>Taking you to cart to review your bill…</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  {/* Size */}
                  <div>
                    <span style={lblStyle}>Size</span>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {SIZES.map(s=>(
                        <button key={s} onClick={()=>setSize(s)}
                          style={{ padding:'9px 16px', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer', border:'1.5px solid',
                            borderColor:size===s?'#c8102e':'rgba(255,255,255,.15)',
                            background:size===s?'#c8102e':'rgba(255,255,255,.04)', color:'#fff', transition:'all .15s' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* Upload progress */}
                  {status==='uploading' && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,.6)', marginBottom:6 }}>
                        <span>Uploading design…</span><span>{uploadPct}%</span>
                      </div>
                      <div style={{ height:5, background:'rgba(255,255,255,.1)', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${uploadPct}%`, background:'#c8102e', borderRadius:3, transition:'width .3s' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>setStep(5)} style={{ padding:'12px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Preview</button>
                    <button className="btn-primary" style={{ flex:1, padding:'14px', fontSize:14, letterSpacing:'.04em', opacity:(status==='saving'||status==='uploading'||status==='sheet')?.6:1 }}
                      onClick={handleSubmit} disabled={status==='saving'||status==='uploading'||status==='sheet'}>
                      {status==='uploading'?`Uploading… ${uploadPct}%`:status==='saving'?'Placing Order…':status==='sheet'?'Generating print sheet…':'🛒 Place Custom Order'}
                    </button>
                  </div>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', textAlign:'center' }}>Our team will WhatsApp you within 2 hours · Pay via UPI link</p>
                </div>
              )}
              <div style={{ marginTop:24 }}>
                <LivePreview />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function HomePage({ user, onNav, cart, onAddToCart }) {
  const products = usePublicProducts()
  const [selectedProduct, setSelectedProduct] = React.useState(null)

  if (selectedProduct) return (
    <ProductDetailPage
      product={selectedProduct}
      onBack={()=>setSelectedProduct(null)}
      onAddToCart={(p)=>{ onAddToCart(p); setSelectedProduct(null) }}
    />
  )
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
            { icon:'•', label:'Free Delivery', sub:'Above ₹1,500' },
            { icon:'↩️', label:'Easy Returns',  sub:'Manufacturing defects' },
            { icon:'•', label:'Secure Pay',    sub:'UPI · Razorpay · Secure' },
            { icon:'•', label:'WhatsApp Support', sub:'2-hour response' },
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
              <ProductCard key={p.id} p={p}
                onSelect={setSelectedProduct}
                onAddToCart={onAddToCart} />
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
  const [activeView, setActiveView] = useState(0)

  // Build view list from available images
  const views = React.useMemo(() => {
    const all = [
      { label:'Front',      src: product.img_front || product.image_url },
      { label:'Back',       src: product.img_back },
      { label:'Left Side',  src: product.img_left },
      { label:'Right Side', src: product.img_right },
    ].filter(v => v.src)
    return all.length ? all : [{ label:'Front', src: product.image_url }]
  }, [product])

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
          {/* Image gallery */}
          <div style={{ flex:'0 0 auto', width:'100%', maxWidth:340 }}>
            {/* Main view */}
            <div style={{ background:'#f8f8f8', borderRadius:12, height:320, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', marginBottom:10 }}>
              {views[activeView]?.src
                ? <img src={views[activeView].src} alt={views[activeView].label} style={{ width:'100%', height:'100%', objectFit:'contain', transition:'opacity .2s' }} />
                : <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>}
              <div style={{ position:'absolute', top:14, left:14, background:product.tagColor||product.tag_color||"#c8102e", color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'4px 10px', borderRadius:3 }}>{product.tag}</div>
              {views.length > 1 && (
                <div style={{ position:'absolute', bottom:10, right:12, background:'rgba(0,0,0,.45)', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20 }}>{views[activeView].label}</div>
              )}
            </div>
            {/* Thumbnails */}
            {views.length > 1 && (
              <div style={{ display:'flex', gap:8 }}>
                {views.map((v, i) => (
                  <button key={i} onClick={()=>setActiveView(i)}
                    style={{ flex:1, background:'#f8f8f8', border:`2px solid ${activeView===i?'#c8102e':'#e8e8e8'}`, borderRadius:8, padding:4, cursor:'pointer', overflow:'hidden', transition:'border-color .15s' }}>
                    <img src={v.src} alt={v.label} style={{ width:'100%', aspectRatio:'1', objectFit:'contain', display:'block' }} />
                    <div style={{ fontSize:8, fontWeight:700, textAlign:'center', color:activeView===i?'#c8102e':'#aaa', marginTop:2, letterSpacing:'.04em', textTransform:'uppercase' }}>{v.label}</div>
                  </button>
                ))}
              </div>
            )}
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
              <span style={{ fontSize:28, fontWeight:700, color:'#0a0a0a' }}>₹{Number(product.price).toLocaleString()}</span>
              <span style={{ fontSize:15, color:'#aaa', textDecoration:'line-through' }}>₹{Number(product.mrp).toLocaleString()}</span>
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
function ProductCard({ p, onSelect, onAddToCart }) {
  const pViews = [p.img_front||p.image_url, p.img_back, p.img_left, p.img_right].filter(Boolean)
  const [vi, setVi] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  return (
    <div className="product-card" onClick={()=>onSelect(p)}
      onMouseEnter={()=>{ if(pViews.length>1) setVi(1) }}
      onMouseLeave={()=>setVi(0)}>
      <div style={{ background:'#f8f8f8', height:200, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {pViews[vi]
          ? <img src={pViews[vi]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain', transition:'opacity .2s' }} />
          : <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
        }
        <div style={{ position:'absolute', top:10, left:10, background:p.tagColor||p.tag_color||'#c8102e', color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2 }}>{p.tag}</div>
        <button onClick={e=>{ e.stopPropagation(); setWishlisted(w=>!w) }}
          style={{ position:'absolute', top:8, right:8, background:'#fff', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
          {wishlisted ? '♥' : '♡'}
        </button>
        {pViews.length > 1 && (
          <div style={{ position:'absolute', bottom:6, left:0, right:0, display:'flex', justifyContent:'center', gap:4 }}>
            {pViews.map((_,i)=>(
              <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:vi===i?'#c8102e':'rgba(0,0,0,.25)', transition:'background .2s' }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ padding:'12px 14px' }}>
        <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <StarRating rating={p.rating} />
          <span style={{ fontSize:11, color:'#aaa' }}>({p.reviews})</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:16, fontWeight:700 }}>₹{Number(p.price).toLocaleString()}</span>
          <span style={{ fontSize:12, color:'#aaa', textDecoration:'line-through' }}>₹{Number(p.mrp).toLocaleString()}</span>
        </div>
        <div style={{ fontSize:11, color:'#00a86b', fontWeight:600, marginBottom:10 }}>{disc(p.price,p.mrp)}% off</div>
        <button className="btn-primary" style={{ width:'100%', padding:'9px', fontSize:12 }}
          onClick={e=>{ e.stopPropagation(); onAddToCart(p) }}>Add to Cart</button>
      </div>
    </div>
  )
}

function ProductsPage({ onAddToCart, onNav }) {
  const products  = usePublicProducts()
  const [activeTab,    setActiveTab]    = useState('All')
  const [sort,         setSort]         = useState('popular')
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

      {/* Group Order Banner */}
      <div style={{ background:'linear-gradient(90deg,#00a86b,#0a7a4a)', padding:'0 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', cursor:'pointer' }} onClick={()=>onNav('group')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#fff', letterSpacing:'.02em' }}>GROUP ORDER? </span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.8)' }}>Bulk discount for 10+ pieces · Teams, colleges, events</span>
            </div>
            <span style={{ color:'rgba(255,255,255,.7)', fontSize:18, flexShrink:0 }}>›</span>
          </div>
        </div>
      </div>

      {/* Search + Tabs + Sort */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:56, zIndex:10 }}>
        {/* Search bar */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'10px 20px 0' }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
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
            <div style={{ marginBottom:12, color:'#ddd' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <p style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>No products found</p>
            <p style={{ fontSize:13, color:'#aaa' }}>Try a different search or category</p>
          </div>
        ) : (
          <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {sorted.map(p => (
              <ProductCard key={p.id} p={p}
                onSelect={setSelectedProduct}
                onAddToCart={onAddToCart} />
            ))}
          </div>
        )}
      </div>


    </div>
  )
}

const CLOUDINARY_CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   || 'dfhdyp4oq'
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'drynn_uploads'

async function uploadToCloudinary(file, onProgress) {
  onProgress && onProgress(10)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  formData.append('folder', 'drynn')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 90))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        onProgress && onProgress(100)
        resolve(res.secure_url)
      } else {
        let msg = 'Cloudinary upload failed'
        try { msg = JSON.parse(xhr.responseText)?.error?.message || msg } catch {}
        reject(new Error(msg))
      }
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
            <div style={{ marginBottom:16, color:'#00a86b' }}><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, marginBottom:8 }}>MESSAGE SENT!</h2>
            <p style={{ fontSize:14, color:'#555' }}>We'll WhatsApp you within 2 hours.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Contact cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
              {[
                { icon:'•', label:'WhatsApp', value:'+91 99447 61306', color:'#00a86b' },
                { icon:'•', label:'Location',  value:'Tamil Nadu, India', color:'#c8102e' },
                { icon:'⏰', label:'Hours',     value:'Mon-Sat 9am-7pm',   color:'#0a1f5d' },
                { icon:'•', label:'Delivery',  value:'5-7 working days',  color:'#f5a623' },
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
      const placedAt = new Date().toISOString()
      for (const item of cart) {
        const orderId = crypto.randomUUID()
        const cd = item.customDetails
        const { error: dbErr } = await supabase.from('drynn_orders').insert({
          id: orderId,
          user_id: user?.id || null,
          name: cd?.name || form.name,
          phone: cd?.phone || form.phone,
          address: cd?.address || `${form.address}, ${form.pincode}`,
          garment: item.isCustom ? (cd?.garment || item.name) : item.name,
          color: item.color || 'Various',
          size: item.size || form.size || 'Various',
          qty: item.qty,
          design_file: item.isCustom ? (cd?.designUrls ? JSON.stringify(cd.designUrls) : '') : 'catalog-order',
          side_pos:    item.isCustom ? (cd?.sidePos    ? JSON.stringify(cd.sidePos)    : null) : null,
          text_on:     item.isCustom ? (cd?.textOn     ? true : false)                         : false,
          text_val:    item.isCustom ? (cd?.textVal    || null)                                 : null,
          text_font:   item.isCustom ? (cd?.textFont   || null)                                 : null,
          text_size:   item.isCustom ? (cd?.textSize   || null)                                 : null,
          text_color:  item.isCustom ? (cd?.textColor  || null)                                 : null,
          text_pos_x:  item.isCustom ? (cd?.textPosX   || 50)                                   : null,
          text_pos_y:  item.isCustom ? (cd?.textPosY   || 75)                                   : null,
          text_rot:    item.isCustom ? (cd?.textRot    || 0)                                    : null,
          status: 'Received',
          payment_status: 'Unpaid',
          total: grandTotal,
          placed_at: placedAt,
        })
        if (dbErr) {
          console.error('[Cart → Supabase] Order insert failed:', dbErr.message)
          alert(`[Order Save Failed]\n\n${dbErr.message}\n\nPlease WhatsApp us at +91 99447 61306.`)
        }
      }
      const itemsSummary = cart.map(i => `${i.name} x${i.qty}`).join(', ')
      if (GOOGLE_SHEET_WEBHOOK) fetch(GOOGLE_SHEET_WEBHOOK, {
        method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sheet:'DRYNN_Orders', name:form.name, phone:form.phone, address:form.address, pincode:form.pincode, items:itemsSummary, total:grandTotal, payment:form.payment, placedAt }),
      }).catch(e => console.error('[Cart → Google Sheets]:', e.message))
      onClear()
      setStep('done')
    } catch(e) {
      console.error('[Cart] Checkout error:', e.message)
      alert(`[Checkout Error]\n\n${e.message || 'Unknown error'}\n\nPlease WhatsApp us at +91 99447 61306.`)
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
        <div style={{ marginBottom:16, color:'#00a86b' }}><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, marginBottom:12 }}>ORDER CONFIRMED!</h2>
        <p style={{ fontSize:14, color:'#555', lineHeight:1.8, marginBottom:28 }}>We received your order and will WhatsApp you within 2 hours to confirm printing and delivery.</p>
        <div style={{ background:'#f8f8f8', borderRadius:12, padding:'20px', marginBottom:24, textAlign:'left' }}>
          {[['Payment','UPI / Razorpay (link sent on WhatsApp)'],['Delivery','5-7 working days'],['Support','WhatsApp: +91 99447 61306']].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #eee', fontSize:13 }}>
              <span style={{ color:'#888' }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ width:'100%', padding:14, fontSize:14 }} onClick={()=>onNav('orders')}>
          📦 View My Orders
        </button>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Shop
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>My Cart</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>SHOPPING CART</h1>
        </div>
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'28px 20px' }}>
        {cart.length===0 ? (
          <div style={{ textAlign:'center', padding:'64px 16px' }}>
            <div style={{ marginBottom:16, color:'#ddd' }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg></div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, marginBottom:8 }}>YOUR CART IS EMPTY</h2>
            <p style={{ color:'#888', fontSize:14, marginBottom:24 }}>Add some products to get started!</p>
            <button className="btn-primary" style={{ padding:'13px 28px', fontSize:14 }} onClick={()=>onNav('products')}>Go to Shop →</button>
          </div>
        ) : (
          <div>
            {cart.map((item,i)=>(
              <div key={i} style={{ display:'flex', gap:16, alignItems:'center', padding:'16px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:72, height:72, background:'#f8f8f8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                    : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</p>
                  {item.isCustom && item.customDetails && (
                    <p style={{ fontSize:11, color:'#00a86b', marginBottom:2 }}>🎨 Custom · Sides: {item.customDetails.sides}</p>
                  )}
                  <p style={{ fontSize:12, color:'#aaa', marginBottom:4 }}>Size: {item.size || '—'} · Qty: {item.qty}</p>
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
                <span style={{ color:shipping===0?'#00a86b':'#0a0a0a', fontWeight:600 }}>{shipping===0?'FREE':`₹${shipping}`}</span>
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
              <div style={{ flexShrink:0, color:'#00a86b' }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
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
            WhatsApp updates sent at every stage. Need help? <strong>+91 99447 61306</strong>
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
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
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
            <div style={{ marginBottom:14, color:'#ddd' }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, marginBottom:8 }}>NO ORDERS YET</h2>
            <p style={{ color:'#aaa', fontSize:13, lineHeight:1.7, marginBottom:24 }}>
              You have not placed any orders yet.<br/>Start shopping to see your order history here!
            </p>
            <button className="btn-primary" style={{ padding:'12px 28px', fontSize:13 }}
              onClick={() => onNav && onNav('products')}>Shop Now →</button>
          </div>

        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px' }}>
            <div style={{ marginBottom:12, color:'#ddd' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
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
                        {isDelivered ? 'View History →' : 'View Details →'}
                      </span>
                      {isDelivered && (
                        <button
                          onClick={e => { e.stopPropagation(); onNav && onNav('studio') }}
                          style={{ fontSize:11, fontWeight:700, color:'#0a1f5d', background:'#f0f4ff', border:'1px solid #c5d3f6', borderRadius:50, padding:'5px 14px', cursor:'pointer' }}>
                          Reorder
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
          {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
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
          { icon:'•', label:'My Orders',     sub:'Track and manage your orders',      page:'orders'  },
          { icon:'•', label:'Track Order',   sub:'Check live delivery status',         page:'track'   },
          { icon:'•', label:'Group Order',   sub:'Bulk orders for teams & events',     page:'group'   },
          { icon:'•', label:'Payments',      sub:'UPI, Razorpay',                      page:null       },
          { icon:'•', label:'Addresses',     sub:'Manage delivery addresses',          page:null       },
          { icon:'•', label:'Notifications', sub:'Order updates on WhatsApp',          page:null       },
          { icon:'ℹ️',  label:'About DRYNN',  sub:'Our story & how it works',           page:'about'   },
          { icon:'•', label:'Contact Us',    sub:'WhatsApp, email & support',          page:'contact' },
          { icon:'•', label:'Privacy',       sub:'Data & privacy settings',            page:'privacy'  },
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
// ADMIN ORDER PREVIEW — replicates Studio Step 5 view for admin
// Shows garment + design composited at exact saved position/scale/rotation/colour
// ══════════════════════════════════════════════════════════════
function AdminOrderPreview({ order }) {
  const o = order
  const GARMENT_DEFAULTS = {
    'T-Shirt': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
    'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
  }
  const SIDE_LABELS = { front:'Front', back:'Back', left:'Left', right:'Right' }
  const SIDES = ['front','back','left','right']

  const garmentKey = o.garment?.toLowerCase().includes('hoodie') ? 'Hoodie'
    : o.garment?.toLowerCase().includes('polo') ? 'Polo'
    : o.garment?.toLowerCase().includes('jogger') ? 'Joggers'
    : 'T-Shirt'

  const [garmentImgs, setGarmentImgs] = React.useState({
    front: GARMENT_DEFAULTS[garmentKey], back: GARMENT_DEFAULTS[garmentKey],
    left:  GARMENT_DEFAULTS[garmentKey], right: GARMENT_DEFAULTS[garmentKey],
  })

  React.useEffect(() => {
    if (!o.garment) return
    const keyword = o.garment.replace('Custom ','').split(' ').slice(0,3).join(' ')
    supabase.from('drynn_products')
      .select('img_front,img_back,img_left,img_right,image_url')
      .ilike('name', '%' + keyword + '%').limit(1)
      .then(({ data }) => {
        if (data && data[0]) {
          const p = data[0]
          setGarmentImgs({
            front: p.img_front || p.image_url || GARMENT_DEFAULTS[garmentKey],
            back:  p.img_back  || p.image_url || GARMENT_DEFAULTS[garmentKey],
            left:  p.img_left  || p.image_url || GARMENT_DEFAULTS[garmentKey],
            right: p.img_right || p.image_url || GARMENT_DEFAULTS[garmentKey],
          })
        }
      })
  }, [o.garment])

  // Parse design_file — JSON {front,back,left,right} or plain URL
  let designs = { front:null, back:null, left:null, right:null }
  if (o.design_file) {
    try {
      const parsed = JSON.parse(o.design_file)
      if (typeof parsed === 'object') {
        designs = {
          front: parsed.front?.startsWith('http') ? parsed.front : null,
          back:  parsed.back?.startsWith('http')  ? parsed.back  : null,
          left:  parsed.left?.startsWith('http')  ? parsed.left  : null,
          right: parsed.right?.startsWith('http') ? parsed.right : null,
        }
      }
    } catch(e) {
      if (o.design_file.startsWith('http')) designs.front = o.design_file
    }
  }

  // Parse saved position data — exact customer positions or default
  const DEFAULT_POS = { posX:50, posY:38, scale:38, rotation:0 }
  let sidePos = { front:DEFAULT_POS, back:DEFAULT_POS, left:DEFAULT_POS, right:DEFAULT_POS }
  if (o.side_pos) {
    try { const p = JSON.parse(o.side_pos); if (typeof p === 'object') sidePos = { ...sidePos, ...p } } catch(e) {}
  }

  // Text config from order
  const textOn    = o.text_on  || false
  const textVal   = o.text_val || ''
  const textFont  = o.text_font  || 'Bebas Neue'
  const textSize  = o.text_size  || 24
  const textColor = o.text_color || '#ffffff'
  const textPosX  = o.text_pos_x != null ? o.text_pos_x : 50
  const textPosY  = o.text_pos_y != null ? o.text_pos_y : 75
  const textRot   = o.text_rot   != null ? o.text_rot   : 0

  const [activeIdx, setActiveIdx] = React.useState(0)
  // Swipe support
  const dragX = React.useRef(null)
  const onDown = e => { dragX.current = e.touches ? e.touches[0].clientX : e.clientX }
  const onUp   = e => {
    if (dragX.current === null) return
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
    const dx = endX - dragX.current
    if (Math.abs(dx) > 40) setActiveIdx(i => ((i + (dx < 0 ? 1 : -1)) + 4) % 4)
    dragX.current = null
  }

  if (!designs.front && !designs.back && !designs.left && !designs.right) return null

  const activeSide = SIDES[activeIdx]
  const color = o.color || '#ffffff'

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#c8102e', marginBottom:8 }}>
        🎨 Customer Design Preview
      </div>

      {/* ── Main viewer ── */}
      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#1a1a1a',
        border:'1.5px solid #333', maxWidth:320, userSelect:'none', touchAction:'none' }}
        onMouseDown={onDown} onMouseUp={onUp}
        onTouchStart={onDown} onTouchEnd={onUp}>

        {/* All 4 sides stacked */}
        {SIDES.map((side, i) => (
          <div key={side} style={{ position: i===0?'relative':'absolute', inset:0,
            opacity: i===activeIdx ? 1 : 0, transition:'opacity .1s ease', pointerEvents:'none' }}>
            <img src={garmentImgs[side]} alt={side}
              style={{ width:'100%', display:'block', filter:colorToFilter(color), minHeight:200, objectFit:'contain' }}
              onError={e=>{ e.target.src = GARMENT_DEFAULTS[garmentKey] }} />
            {designs[side] && (() => {
              const p = sidePos[side] || DEFAULT_POS
              return (
                <img src={designs[side]} alt="design"
                  style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                    transform:`translate(-50%,-50%) rotate(${p.rotation||0}deg)`,
                    width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }}
                  onError={e=>e.target.style.display='none'} />
              )
            })()}
            {/* Text overlay — all sides */}
            {textOn && textVal && (
              <div style={{ position:'absolute', top:`${textPosY}%`, left:`${textPosX}%`,
                transform:`translate(-50%,-50%) rotate(${textRot}deg)`,
                fontFamily: textFont, fontSize: textSize, color: textColor, fontWeight:700,
                textShadow:'0 1px 6px rgba(0,0,0,.5)', pointerEvents:'none', whiteSpace:'nowrap' }}>
                {textVal}
              </div>
            )}
          </div>
        ))}

        {/* Side label + counter */}
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,0,0,.65)', borderRadius:20, padding:'3px 12px',
          fontSize:10, fontWeight:700, color:'#fff', pointerEvents:'none' }}>
          {SIDE_LABELS[activeSide]}
        </div>

        {/* Colour badge */}
        <div style={{ position:'absolute', top:8, right:8, display:'flex', alignItems:'center', gap:4,
          background:'rgba(255,255,255,.92)', borderRadius:20, padding:'3px 8px', fontSize:9, fontWeight:700 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:color, border:'1px solid #ccc' }} />
          {color}
        </div>

        {/* Arrow hints */}
        {[['‹', -1, 8], ['›', 1, 'auto']].map(([arrow, dir, left]) => (
          <button key={arrow} onClick={()=>setActiveIdx(i=>((i+dir)+4)%4)}
            style={{ position:'absolute', top:'50%', left: typeof left==='number'?left:undefined,
              right: left==='auto'?8:undefined, transform:'translateY(-50%)',
              background:'rgba(0,0,0,.45)', border:'none', color:'#fff', fontSize:18,
              width:28, height:28, borderRadius:'50%', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', fontWeight:700, padding:0 }}>
            {arrow}
          </button>
        ))}
      </div>

      {/* ── 4 thumbnail tabs ── */}
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        {SIDES.map((side, i) => (
          <button key={side} onClick={()=>setActiveIdx(i)}
            style={{ position:'relative', flex:1, aspectRatio:'1', borderRadius:8, overflow:'hidden',
              border:'2px solid ' + (i===activeIdx ? '#c8102e' : designs[side] ? '#00a86b' : '#e0e0e0'),
              background:'#f8f8f8', padding:0, cursor:'pointer' }}>
            <img src={garmentImgs[side]} alt={side}
              style={{ width:'100%', height:'100%', objectFit:'contain', filter:colorToFilter(color) }}
              onError={e=>e.target.src=GARMENT_DEFAULTS[garmentKey]} />
            {designs[side] && (() => {
              const p = sidePos[side] || DEFAULT_POS
              return (
                <img src={designs[side]} alt="d"
                  style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                    transform:`translate(-50%,-50%) rotate(${p.rotation||0}deg)`,
                    width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }}
                  onError={e=>e.target.style.display='none'} />
              )
            })()}
            {textOn && textVal && (
              <div style={{ position:'absolute', top:`${textPosY}%`, left:`${textPosX}%`,
                transform:`translate(-50%,-50%) rotate(${textRot}deg)`,
                fontFamily:textFont, fontSize: Math.max(6, textSize * 0.25), color:textColor,
                fontWeight:700, pointerEvents:'none', whiteSpace:'nowrap' }}>
                {textVal}
              </div>
            )}
            {designs[side] && (
              <div style={{ position:'absolute', top:2, right:2, background:'#00a86b',
                borderRadius:'50%', width:10, height:10, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:7, color:'#fff', fontWeight:700 }}>✓</div>
            )}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, textAlign:'center',
              fontSize:8, fontWeight:700,
              color: i===activeIdx ? '#c8102e' : designs[side] ? '#00a86b' : '#888',
              background:'rgba(255,255,255,.88)', padding:'2px 0' }}>
              {SIDE_LABELS[side]}
            </div>
          </button>
        ))}
      </div>

      {/* Open design link */}
      {designs[activeSide] && (
        <div style={{ marginTop:6 }}>
          <a href={designs[activeSide]} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:11, color:'#c8102e', fontWeight:700, textDecoration:'underline' }}>
            Open full design ↗
          </a>
        </div>
      )}
    </div>
  )
}
// ══════════════════════════════════════════════════════════════
// ADMIN PANEL  -  restricted to ADMIN_EMAIL only
// ══════════════════════════════════════════════════════════════
const ADMIN_EMAIL = 'gokulmaniraj2008@gmail.com'

// ══════════════════════════════════════════════════════════════
// MOCKUP UPLOADER — admin uploads garment views directly to Cloudinary
// ══════════════════════════════════════════════════════════════
const MOCKUP_SLOTS = {
  'T-Shirt':  ['front','back','left','right'],
  'Hoodie':   ['front','back','left','right'],
  'Polo':     ['front','back','left','right'],
}
const MOCKUP_KEY = (garment, view) => `mockup_${garment.toLowerCase().replace(' ','-')}_${view}`
const MOCKUP_LABELS = { front:'👕 Front', back:'🔙 Back', left:'💪 Left', right:'💪 Right' }

function MockupUploader() {
  const [urls, setUrls]       = React.useState({})
  const [uploading, setUploading] = React.useState({})
  const [saved, setSaved]     = React.useState({})

  // Load existing URLs from Supabase settings table
  React.useEffect(() => {
    supabase.from('drynn_settings').select('key,value')
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        setUrls(map)
      })
  }, [])

  const handleFile = async (garment, view, file) => {
    if (!file) return
    const key = MOCKUP_KEY(garment, view)
    setUploading(u => ({ ...u, [key]: true }))
    try {
      const url = await uploadToCloudinary(file, () => {})
      await supabase.from('drynn_settings').delete().eq('key', key)
      const { error: insertErr } = await supabase.from('drynn_settings').insert({ key, value: url })
      if (insertErr) { alert('Save failed: ' + insertErr.message); return }
      setUrls(u => ({ ...u, [key]: url }))
      setSaved(s => ({ ...s, [key]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2500)
    } catch(e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(u => ({ ...u, [key]: false }))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
      {Object.entries(MOCKUP_SLOTS).map(([garment, views]) => (
        <div key={garment} style={{ background:'#fff', borderRadius:12, border:'1px solid #e8e8e8', overflow:'hidden' }}>
          <div style={{ background:'#0a0a0a', padding:'12px 16px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'.06em' }}>{garment.toUpperCase()}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:1, background:'#f0f0f0' }}>
            {views.map(view => {
              const key = MOCKUP_KEY(garment, view)
              const url = urls[key]
              const busy = uploading[key]
              const done = saved[key]
              return (
                <div key={view} style={{ background:'#fff', padding:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#555', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>
                    {MOCKUP_LABELS[view]}
                  </div>
                  {/* Current image preview */}
                  {url && (
                    <div style={{ marginBottom:8, borderRadius:8, overflow:'hidden', background:'#f8f8f8', border:'1px solid #eee' }}>
                      <img src={url} alt={view} style={{ width:'100%', height:100, objectFit:'contain', display:'block' }} />
                    </div>
                  )}
                  {/* Upload button */}
                  <label style={{ display:'block', cursor:'pointer' }}>
                    <input type="file" accept=".png,.jpg,.jpeg" style={{ display:'none' }}
                      onChange={e => handleFile(garment, view, e.target.files[0])} />
                    <div style={{ padding:'8px 12px', borderRadius:6, border:'1.5px dashed #d0d0d0', textAlign:'center', background: done?'rgba(0,168,107,.06)':busy?'#f8f8f8':'#fafafa', cursor:'pointer', transition:'all .2s' }}>
                      {busy ? (
                        <span style={{ fontSize:11, color:'#888' }}>⏳ Uploading…</span>
                      ) : done ? (
                        <span style={{ fontSize:11, color:'#00a86b', fontWeight:700 }}>✅ Saved!</span>
                      ) : (
                        <span style={{ fontSize:11, color:'#c8102e', fontWeight:700 }}>{url ? '🔄 Replace' : '📤 Upload'}</span>
                      )}
                    </div>
                  </label>
                  {url && (
                    <div style={{ marginTop:6, fontSize:9, color:'#aaa', wordBreak:'break-all', lineHeight:1.4 }}>
                      {url.split('/').pop()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

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
  // Group orders state
  const [groupOrders, setGroupOrders]         = useState([])
  const [groupOrdersLoading, setGroupOrdersLoading] = useState(false)
  const [expandedGroup, setExpandedGroup]     = useState(null)
  const [groupMembers, setGroupMembers]       = useState({}) // { group_code: [...members] }

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

  const loadGroupOrders = async () => {
    setGroupOrdersLoading(true)
    const { data, error } = await supabase.from('drynn_group_orders').select('*').order('created_at', { ascending: false })
    if (!error && data) setGroupOrders(data)
    else if (error) console.error('[Admin] Group orders load error:', error.message)
    setGroupOrdersLoading(false)
  }

  const loadGroupMembers = async (group_code) => {
    if (groupMembers[group_code]) { setExpandedGroup(expandedGroup===group_code?null:group_code); return }
    const { data, error } = await supabase.from('drynn_group_members').select('*').eq('group_code', group_code).order('joined_at', { ascending: true })
    if (!error && data) setGroupMembers(m => ({ ...m, [group_code]: data }))
    setExpandedGroup(expandedGroup===group_code ? null : group_code)
  }

  const deleteGroupOrder = async (id, group_code) => {
    if (!confirm('Delete this group order and all its members?')) return
    await supabase.from('drynn_group_members').delete().eq('group_code', group_code)
    const { error } = await supabase.from('drynn_group_orders').delete().eq('id', id)
    if (!error) { setGroupOrders(g => g.filter(x => x.id !== id)); showToast('Group order deleted') }
    else alert('Delete failed: ' + error.message)
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

  const togglePaymentStatus = async (id, current) => {
    const next = current === 'Paid' ? 'Unpaid' : 'Paid'
    const { error } = await supabase.from('drynn_orders').update({ payment_status: next }).eq('id', id)
    if (!error) { setOrders(o => o.map(x => x.id===id ? {...x, payment_status: next} : x)); showToast(`Marked as ${next}`) }
    else alert('Update failed: ' + error.message)
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
        <div style={{ marginBottom:16, color:'#555' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
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
      <div style={{ background:'#0a0a0a', padding:'0 12px' }}>
        {/* Top row: logo + exit */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:'.18em', color:'#fff' }}>DRYNN ADMIN</span>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#00a86b', boxShadow:'0 0 6px #00a86b' }} />
          </div>
          <button onClick={onBack} style={{ padding:'7px 18px', borderRadius:6, border:'1.5px solid #c8102e', cursor:'pointer', background:'#c8102e', color:'#fff', fontSize:12, fontWeight:700, letterSpacing:'.04em', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Exit
          </button>
        </div>
        {/* Bottom row: tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
          <button onClick={()=>{setTab('orders');loadOrders()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='orders'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Orders</button>
          <button onClick={()=>{setTab('products');loadProducts()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='products'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Products</button>
          <button onClick={()=>{setTab('samples');loadSamples()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='samples'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Samples</button>
          <button onClick={()=>{setTab('uploads');loadOrders()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='uploads'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>Uploads</button>
          <button onClick={()=>{setTab('analytics');loadOrders()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='analytics'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>📊 Analytics</button>
          <button onClick={()=>{setTab('grouporders');loadGroupOrders()}} style={{ flexShrink:0, padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', background:tab==='grouporders'?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>👥 Group Orders</button>
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
                {orders.map(o => {
                  const isCustom = o.order_type === 'custom' || (o.design_file && o.design_file !== 'catalog-order')
                  const parseDesigns = (df) => {
                    if (!df || df === 'catalog-order') return {}
                    try { const p = JSON.parse(df); return typeof p==='object' ? p : { front: df } } catch { return { front: df } }
                  }
                  const parsedDesigns = parseDesigns(o.design_file)
                  const designSides = ['front','back','left','right']
                    .map(s => ({ label: s.charAt(0).toUpperCase()+s.slice(1), url: parsedDesigns[s]?.startsWith('http') ? parsedDesigns[s] : null }))
                    .filter(s => s.url)

                  return (
                  <div key={o.id} style={{ background:'#fff', borderRadius:10, border:'1px solid #e8e8e8', boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
                    {editOrder===o.id ? (
                      <div style={{ padding:'16px 20px' }}>
                        <OrderEditRow order={o} onSave={async(status)=>{await updateOrderStatus(o.id,status);setEditOrder(null)}} onCancel={()=>setEditOrder(null)} statuses={ORDER_STATUSES} colors={STATUS_COLORS} />
                      </div>
                    ) : (
                      <>
                        {/* Order type banner */}
                        <div style={{ padding:'6px 16px', background: isCustom ? 'rgba(200,16,46,.06)' : '#f8f8f8', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color: isCustom ? '#c8102e' : '#888' }}>
                            {isCustom ? '🎨 Custom Design Order' : '🛍️ Catalog Order'}
                          </span>
                          <span style={{ fontSize:10, color:'#bbb' }}>{new Date(o.placed_at||o.created_at).toLocaleString('en-IN')}</span>
                        </div>

                        <div style={{ padding:'14px 16px' }}>
                          {/* Studio Step 5 style preview — garment + design composited */}
                          {isCustom && <AdminOrderPreview order={o} />}

                          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>

                            {/* Product image for catalog orders */}
                            {!isCustom && (
                              o.product_image ? (
                                <div style={{ flexShrink:0, textAlign:'center' }}>
                                  <img src={o.product_image} alt={o.product_name}
                                    style={{ width:72, height:72, objectFit:'contain', borderRadius:8, border:'1.5px solid #e0e0e0', background:'#f8f8f8', display:'block' }}
                                    onError={e=>e.target.style.display='none'} />
                                  <div style={{ fontSize:9, color:'#888', marginTop:3, fontWeight:600 }}>{o.product_category||'Product'}</div>
                                </div>
                              ) : (
                                <div style={{ width:72, height:72, borderRadius:8, border:'1.5px dashed #e0e0e0', background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#bbb', flexShrink:0, textAlign:'center' }}>
                                  Catalog
                                </div>
                              )
                            )}

                            {/* Order details */}
                            <div style={{ flex:1, minWidth:160 }}>
                              <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{o.name}</div>
                              <div style={{ fontSize:11, color:'#555', marginBottom:2 }}>📞 {o.phone}</div>
                              <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>👕 {o.garment} · 🎨 {o.color} · 📏 {o.size} · Qty {o.qty}</div>
                              {o.design_sides && <div style={{ fontSize:11, color:'#c8102e', marginBottom:2 }}>🖨️ Print sides: {o.design_sides}</div>}
                              {o.custom_text  && <div style={{ fontSize:11, color:'#0a1f5d', marginBottom:2 }}>✍️ Text: "{o.custom_text}"</div>}
                              {/* ── PRINT SHEET (most important for printer) ── */}
                              {o.print_sheet && (
                                <div style={{ margin:'8px 0 6px', background:'#0a0a0a', borderRadius:8, overflow:'hidden', border:'2px solid #c8102e' }}>
                                  <div style={{ background:'#c8102e', padding:'4px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#fff' }}>🖨️ Print-Ready Sheet</span>
                                    <a href={o.print_sheet} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize:10, fontWeight:700, color:'#fff', textDecoration:'underline', cursor:'pointer' }}>Open Full Size ↗</a>
                                  </div>
                                  <a href={o.print_sheet} target="_blank" rel="noopener noreferrer">
                                    <img src={o.print_sheet} alt="Print Sheet"
                                      style={{ width:'100%', display:'block', maxHeight:200, objectFit:'contain', background:'#fff' }}
                                      onError={e=>e.target.style.display='none'} />
                                  </a>
                                </div>
                              )}
                              <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>📍 {o.address}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:'#0a1f5d' }}>₹{Number(o.total||0).toLocaleString()}</div>
                            </div>

                            {/* Actions */}
                            <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                              <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:50, background:STATUS_COLORS[o.status||'Received']+'22', color:STATUS_COLORS[o.status||'Received'] }}>
                                {o.status||'Received'}
                              </span>
                              <button onClick={()=>togglePaymentStatus(o.id, o.payment_status||'Unpaid')}
                                style={{ padding:'4px 10px', fontSize:11, fontWeight:700, borderRadius:50, border:'none', cursor:'pointer',
                                  background: o.payment_status==='Paid' ? '#e6f9f0' : '#fff3f3',
                                  color: o.payment_status==='Paid' ? '#00a86b' : '#c8102e' }}>
                                {o.payment_status==='Paid' ? '✓ Paid' : '✗ Unpaid'}
                              </button>
                              {o.phone && (
                                <a href={`https://wa.me/91${o.phone.replace(/\D/g,'').replace(/^91/,'')}`} target="_blank" rel="noopener noreferrer"
                                  style={{ padding:'5px 10px', fontSize:11, borderRadius:4, border:'1px solid #00a86b', color:'#00a86b', background:'none', cursor:'pointer', fontWeight:700, textDecoration:'none' }}>
                                  💬 WhatsApp
                                </a>
                              )}
                              <button onClick={()=>setEditOrder(o.id)} style={{ padding:'5px 12px', fontSize:11, borderRadius:4, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', fontWeight:600 }}>Edit Status</button>
                              <button onClick={()=>deleteOrder(o.id)} style={{ padding:'5px 10px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )})}

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
                {showAddProduct ? 'Cancel' : 'Add Product'}
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
                      {[['T-Shirt','T-Shirt'],['Hoodie','Hoodie'],['Polo','Polo'],['Joggers','Joggers']].map(([e,l])=><option key={e} value={e}>{l}</option>)}
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
                        <div style={{ fontSize:13, fontWeight:700, color: newProduct.studio_only ? '#c8102e' : '#0a0a0a' }}>Studio Only</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Hide from Products page - visible only in Design Studio</div>
                      </div>
                    </label>
                  </div>
                </div>
                <button className="btn-primary" style={{ padding:'10px 24px', fontSize:13, opacity:addingProduct?.6:1 }} onClick={addProduct} disabled={addingProduct}>
                  {addingProduct ? 'Adding…' : 'Add Product'}
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

        {tab==='uploads' && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Customer Design Uploads</h2>
            {loading ? (
              <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading…</div>
            ) : (() => {
              const parseDF = (df) => { if (!df || df==='catalog-order') return {}; try { const p=JSON.parse(df); return typeof p==='object'?p:{front:df} } catch { return {front:df} } }
              const customOrders = orders.filter(o => o.design_file && o.design_file !== 'catalog-order')
              const GD = {
                'T-Shirt': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
                'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
                'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
                'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
              }
              if (customOrders.length === 0) return (
                <div style={{ textAlign:'center', padding:60, color:'#888', background:'#fff', borderRadius:12, fontSize:13 }}>
                  No design uploads yet.
                </div>
              )
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
                  {customOrders.map(o => {
                    const gk = o.garment?.toLowerCase().includes('hoodie') ? 'Hoodie'
                      : o.garment?.toLowerCase().includes('polo') ? 'Polo'
                      : o.garment?.toLowerCase().includes('jogger') ? 'Joggers' : 'T-Shirt'
                    const gi = GD[gk]
                    const pd = parseDF(o.design_file)
                    const sides = ['front','back','left','right']
                      .map(s => ({ label:s.charAt(0).toUpperCase()+s.slice(1), url: pd[s]?.startsWith('http')?pd[s]:null }))
                      .filter(s => s.url)
                    return (
                      <div key={o.id} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1px solid #e8e8e8', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                        <div style={{ position:'relative', background:'#f5f5f5', padding:8 }}>
                          <div style={{ position:'relative', borderRadius:8, overflow:'hidden' }}>
                            <img src={gi} alt={gk} style={{ width:'100%', display:'block' }} onError={e=>e.target.style.opacity='0.1'} />
                            <img src={pd.front || Object.values(pd)[0] || ''} alt="design"
                              style={{ position:'absolute', top:'44%', left:'50%', transform:'translate(-50%,-50%)', width:'38%', objectFit:'contain', pointerEvents:'none' }}
                              onError={e=>e.target.style.display='none'} />
                          </div>
                          {sides.length > 1 && (
                            <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                              {sides.map(s => (
                                <a key={s.label} href={s.url} target="_blank" rel="noreferrer"
                                  style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20, background:'#0a1f5d', color:'#fff', textDecoration:'none' }}>
                                  {s.label} ↗
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ padding:'10px 12px' }}>
                          <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{o.name}</div>
                          <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>{o.garment} · {o.size} · Qty {o.qty}</div>
                          <div style={{ fontSize:10, color:'#aaa', marginBottom:8 }}>{new Date(o.placed_at||o.created_at).toLocaleDateString('en-IN')}</div>
                          <a href={pd.front || Object.values(pd)[0] || ''} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#c8102e', fontWeight:700, textDecoration:'underline' }}>Open Full Design ↗</a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {tab==='samples' && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Sample Designs</h2>

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
                    <span>Uploading…</span><span>{sampleUploadPct}%</span>
                  </div>
                  <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${sampleUploadPct}%`, background:'#c8102e', borderRadius:2, transition:'width .3s' }} />
                  </div>
                </div>
              )}
              <button className="btn-primary" style={{ padding:'10px 24px', fontSize:13, opacity:sampleSaving?.6:1 }} onClick={saveSample} disabled={sampleSaving}>
                {sampleSaving ? 'Saving…' : 'Add Sample Design'}
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
                      <button onClick={()=>deleteSample(s.id)} style={{ fontSize:11, color:'#c8102e', background:'none', border:'1px solid #fdd', borderRadius:4, padding:'4px 10px', cursor:'pointer', width:'100%' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GROUP ORDERS TAB */}
        {tab==='grouporders' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>👥 Group Orders</h2>
              <button className="btn-secondary" style={{ padding:'8px 16px', fontSize:12 }} onClick={loadGroupOrders}>↻ Refresh</button>
            </div>
            {groupOrdersLoading ? (
              <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading…</div>
            ) : groupOrders.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, background:'#fff', borderRadius:12, color:'#888', fontSize:13 }}>No group orders yet.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {groupOrders.map(g => {
                  const members = groupMembers[g.group_code] || []
                  const isOpen = expandedGroup === g.group_code
                  return (
                    <div key={g.id} style={{ background:'#fff', borderRadius:10, border:'1px solid #e8e8e8', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                      {/* Group header row */}
                      <div style={{ padding:'16px 20px', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ flex:1, minWidth:180 }}>
                          <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{g.title}</div>
                          <div style={{ fontSize:11, color:'#888' }}>{g.garment} · Organizer: {g.organizer_name} · {g.organizer_phone}</div>
                          <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>
                            Code: <strong style={{ color:'#0a1f5d', letterSpacing:'.08em' }}>{g.group_code}</strong>
                            {g.deadline && ` · Deadline: ${new Date(g.deadline).toLocaleDateString('en-IN')}`}
                            {g.created_at && ` · Created: ${new Date(g.created_at).toLocaleDateString('en-IN')}`}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:50,
                            background: g.status==='open'?'#e6f9f0':'#f4f4f4',
                            color: g.status==='open'?'#00a86b':'#888' }}>
                            {g.status==='open'?'● Open':'○ Closed'}
                          </span>
                          {/* WhatsApp organizer */}
                          {g.organizer_phone && (
                            <a href={`https://wa.me/91${g.organizer_phone.replace(/\D/g,'').replace(/^91/,'')}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid #00a86b', color:'#00a86b', background:'none', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                              💬 WhatsApp
                            </a>
                          )}
                          <button onClick={()=>loadGroupMembers(g.group_code)}
                            style={{ padding:'6px 14px', fontSize:11, borderRadius:4, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', fontWeight:600 }}>
                            {isOpen ? '▲ Hide Members' : `▼ View Members${members.length?` (${members.length})`:''}`}
                          </button>
                          <button onClick={()=>deleteGroupOrder(g.id, g.group_code)}
                            style={{ padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>Delete</button>
                        </div>
                      </div>

                      {/* Members list */}
                      {isOpen && (
                        <div style={{ borderTop:'1px solid #f0f0f0', background:'#fafafa', padding:'14px 20px' }}>
                          {members.length === 0 ? (
                            <p style={{ fontSize:13, color:'#aaa', textAlign:'center', padding:'12px 0' }}>No members have joined yet.</p>
                          ) : (
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:'#888', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>
                                {members.length} Member{members.length!==1?'s':''}
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                {members.map((m,i) => (
                                  <div key={m.id||i} style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', borderRadius:8, padding:'10px 14px', border:'1px solid #eee', flexWrap:'wrap' }}>
                                    <div style={{ width:28, height:28, borderRadius:'50%', background:'#0a1f5d', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                                      {i+1}
                                    </div>
                                    <div style={{ flex:1, minWidth:140 }}>
                                      <div style={{ fontSize:13, fontWeight:700 }}>{m.member_name}</div>
                                      <div style={{ fontSize:11, color:'#888' }}>{m.member_phone} · Size: <strong>{m.size}</strong></div>
                                      {m.address && <div style={{ fontSize:10, color:'#aaa', marginTop:1 }}>{m.address}</div>}
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:50,
                                        background: m.payment_status==='paid'?'#e6f9f0':'#fff3f3',
                                        color: m.payment_status==='paid'?'#00a86b':'#c8102e' }}>
                                        {m.payment_status==='paid'?'✓ Paid':'✗ Unpaid'}
                                      </span>
                                      {m.member_phone && (
                                        <a href={`https://wa.me/91${m.member_phone.replace(/\D/g,'').replace(/^91/,'')}`}
                                          target="_blank" rel="noopener noreferrer"
                                          style={{ fontSize:11, padding:'3px 9px', borderRadius:4, border:'1px solid #00a86b', color:'#00a86b', fontWeight:700, textDecoration:'none' }}>
                                          💬
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab==='analytics' && (() => {
          const totalOrders    = orders.length
          const paid           = orders.filter(o=>o.payment_status==='Paid').length
          const unpaid         = totalOrders - paid
          const revenue        = orders.filter(o=>o.payment_status==='Paid').reduce((s,o)=>s+Number(o.total||0),0)
          const pending        = orders.filter(o=>o.payment_status!=='Paid').reduce((s,o)=>s+Number(o.total||0),0)
          const delivered      = orders.filter(o=>o.status==='Delivered').length
          const statusCounts   = ORDER_STATUSES.map(s=>({ s, count: orders.filter(o=>(o.status||'Received')===s).length }))

          const dayMap = {}
          for (let i=6;i>=0;i--) {
            const d = new Date(); d.setDate(d.getDate()-i)
            dayMap[d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})] = 0
          }
          orders.forEach(o => {
            const d = new Date(o.placed_at||o.created_at)
            const key = d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
            if (key in dayMap) dayMap[key]++
          })
          const days = Object.entries(dayMap)
          const maxDay = Math.max(...days.map(([,v])=>v), 1)

          return (
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>📊 Analytics & Revenue</h2>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
                {[
                  { label:'Total Orders',      value:totalOrders,                               color:'#0a1f5d', bg:'#f0f3ff' },
                  { label:'Revenue Collected', value:`₹${revenue.toLocaleString('en-IN')}`,     color:'#00a86b', bg:'#e6f9f0' },
                  { label:'Pending Payment',   value:`₹${pending.toLocaleString('en-IN')}`,     color:'#c8102e', bg:'#fff3f3' },
                  { label:'Paid Orders',       value:paid,                                      color:'#00a86b', bg:'#e6f9f0' },
                  { label:'Unpaid Orders',     value:unpaid,                                    color:'#c8102e', bg:'#fff3f3' },
                  { label:'Delivered',         value:delivered,                                 color:'#9b59b6', bg:'#f5eeff' },
                ].map(c => (
                  <div key={c.label} style={{ background:c.bg, borderRadius:10, padding:'16px 18px' }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#888', marginBottom:6 }}>{c.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#fff', borderRadius:12, padding:'20px', marginBottom:16, border:'1px solid #e8e8e8' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Orders by Status</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {statusCounts.map(({s,count}) => (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:80, fontSize:12, fontWeight:600, color:STATUS_COLORS[s] }}>{s}</div>
                      <div style={{ flex:1, background:'#f4f4f4', borderRadius:4, height:18, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${totalOrders?(count/totalOrders)*100:0}%`, background:STATUS_COLORS[s], borderRadius:4, transition:'width .4s' }} />
                      </div>
                      <div style={{ width:28, fontSize:12, fontWeight:700, textAlign:'right' }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:'#fff', borderRadius:12, padding:'20px', border:'1px solid #e8e8e8' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Orders — Last 7 Days</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
                  {days.map(([day, count]) => (
                    <div key={day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#0a1f5d' }}>{count||''}</div>
                      <div style={{ width:'100%', background:'#c8102e', borderRadius:'4px 4px 0 0', height:`${(count/maxDay)*72}px`, minHeight:count?4:0, transition:'height .4s' }} />
                      <div style={{ fontSize:9, color:'#aaa', textAlign:'center', lineHeight:1.2 }}>{day}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

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

  // Mockup view uploads — saved directly to drynn_products columns (no drynn_settings)
  const garmentType = p.category==='Hoodies'?'Hoodie':p.category==='Polos'?'Polo':p.category==='Joggers'?'Joggers':'T-Shirt'
  const VIEWS = ['front','back','left','right']
  const VIEW_LABELS = { front:'👕 Front', back:'🔙 Back', left:'💪 Left', right:'💪 Right' }
  const [mockupUploading, setMockupUploading] = useState({})
  const [mockupSaved, setMockupSaved]         = useState({})

  const handleMockupFile = async (view, file) => {
    if (!file) return
    setMockupUploading(u => ({ ...u, [view]: true }))
    try {
      const url = await uploadToCloudinary(file, () => {})
      const colName = `img_${view}` // img_front | img_back | img_left | img_right
      const { error: prodErr } = await supabase
        .from('drynn_products')
        .update({ [colName]: url })
        .eq('id', product.id)
      if (prodErr) { alert('Save failed: ' + prodErr.message); return }
      setP(prev => ({ ...prev, [colName]: url }))
      setMockupSaved(s => ({ ...s, [view]: true }))
      setTimeout(() => setMockupSaved(s => ({ ...s, [view]: false })), 2500)
    } catch(e) {
      alert('Mockup upload failed: ' + e.message)
    }
    setMockupUploading(u => ({ ...u, [view]: false }))
  }

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
              {imgFile ? `✓ ${imgFile.name}` : 'Upload new image'}
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

      {/* Mockup Views (front / back / left / right) */}
      <div>
        <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'#888', textTransform:'uppercase', display:'block', marginBottom:8 }}>
          Garment Views — {garmentType}
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {VIEWS.map(view => {
            const url = p[`img_${view}`] || null  // read from product state directly
            const busy = mockupUploading[view]
            const done = mockupSaved[view]
            return (
              <div key={view} style={{ background:'#f8f8f8', borderRadius:8, padding:10, border:'1px solid #eee' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#555', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>{VIEW_LABELS[view]}</div>
                {url && <img src={url} alt={view} style={{ width:'100%', height:70, objectFit:'contain', borderRadius:6, marginBottom:6, background:'#fff', border:'1px solid #eee' }} />}
                <label style={{ display:'block', cursor:'pointer' }}>
                  <input type="file" accept=".png,.jpg,.jpeg" style={{ display:'none' }} onChange={e => handleMockupFile(view, e.target.files[0])} />
                  <div style={{ padding:'6px 10px', borderRadius:6, border:'1.5px dashed #d0d0d0', textAlign:'center', background: done?'rgba(0,168,107,.06)':busy?'#f0f0f0':'#fff', cursor:'pointer' }}>
                    {busy ? <span style={{ fontSize:11, color:'#888' }}>⏳ Uploading…</span>
                          : done ? <span style={{ fontSize:11, color:'#00a86b', fontWeight:700 }}>✅ Saved!</span>
                          : <span style={{ fontSize:11, color:'#c8102e', fontWeight:700 }}>{url ? '🔄 Replace' : '📤 Upload'}</span>}
                  </div>
                </label>
              </div>
            )
          })}
        </div>
      </div>

      {/* Studio Only toggle */}
      <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', background: p.studio_only ? 'rgba(200,16,46,.06)' : '#f8f8f8', border: `1.5px solid ${p.studio_only ? '#c8102e' : '#e8e8e8'}`, borderRadius:8, padding:'11px 14px' }}>
        <input type="checkbox" checked={!!p.studio_only} onChange={e=>setP({...p,studio_only:e.target.checked})}
          style={{ width:18, height:18, accentColor:'#c8102e', cursor:'pointer', flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: p.studio_only ? '#c8102e' : '#0a0a0a' }}>Studio Only</div>
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
    Received:  { icon:'↓', desc:'We received your order and are reviewing it.' },
    Approved:  { icon:'✓', desc:'Design approved! Moving to print queue.' },
    Printing:  { icon:'⊡', desc:'Your design is being printed right now.' },
    Packed:    { icon:'▣', desc:'Printed and packed, ready to ship.' },
    Shipped:   { icon:'→', desc:'On its way! Track your courier via WhatsApp.' },
    Delivered: { icon:'★', desc:'Delivered! We hope you love it.' },
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
              {loading ? 'Searching…' : 'Track Order'}
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
                        {done ? (current ? <span style={{fontSize:12}}>{typeof info.icon==='string'?info.icon:'✓'}</span> : '✓') : <span style={{ color:'#ccc', fontSize:12, fontWeight:700 }}>{i+1}</span>}
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
              Questions? WhatsApp us at <strong style={{ color:'#0a0a0a' }}>+91 99447 61306</strong>
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
  const allProducts = usePublicProducts()
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [step, setStep] = useState('pick') // pick | create

  const filteredProducts = allProducts.filter(p =>
    !productSearch.trim() ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category||'').toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#00a86b,#0a1f5d)', padding:'48px 20px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 30% 60%,rgba(200,16,46,.12) 0%,transparent 55%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1, padding:'0 4px' }}>
          <button onClick={()=>{ if(step==='create'&&tab==='create'){setStep('pick')}else{onNav('home')} }} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'6px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600, marginBottom:12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span className="sec-label" style={{ color:'rgba(255,255,255,.6)' }}>For Teams & Events</span>
          <h1 className="sec-title" style={{ color:'#fff' }}>GROUP ORDERS</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.65)', marginTop:6, maxWidth:480, lineHeight:1.7 }}>
            Create a group order. Share the link. Friends pick their size and pay separately. No more collecting money manually!
          </p>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:28, border:'1px solid #e0e0e0', borderRadius:8, overflow:'hidden' }}>
          {[['create','Create Group Order'],['join','Join a Group Order']].map(([t,l])=>(
            <button key={t} onClick={()=>{setTab(t);setStep('pick');setSelectedProduct(null)}}
              style={{ flex:1, padding:'13px', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background:tab===t?'#c8102e':'#fff', color:tab===t?'#fff':'#888', transition:'all .15s' }}>{l}</button>
          ))}
        </div>

        {tab==='create' ? (
          step==='pick' ? (
            <div className="fade-in">
              <div style={{ marginBottom:20 }}>
                <span className="sec-label">Step 1 of 2</span>
                <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:24, letterSpacing:'.04em', marginBottom:6 }}>PICK A PRODUCT</h2>
                <p style={{ fontSize:13, color:'#888' }}>Choose the garment your group will be ordering.</p>
              </div>
              {/* Search */}
              <div style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px solid #e8e8e8', borderRadius:8, padding:'10px 14px', marginBottom:16, background:'#fafafa' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products…"
                  style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#0a0a0a', fontFamily:'DM Sans,sans-serif', background:'none' }} />
              </div>
              {/* Product grid */}
              <div className="products-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                {filteredProducts.map(p => {
                  const isSelected = selectedProduct?.id === p.id
                  return (
                    <div key={p.id} onClick={()=>setSelectedProduct(isSelected?null:p)}
                      className="product-card"
                      style={{ border:`2px solid ${isSelected?'#c8102e':'#f0f0f0'}`, background: isSelected?'rgba(200,16,46,.03)':'#fff', cursor:'pointer', position:'relative', borderRadius:10, overflow:'hidden', transition:'all .15s' }}>
                      <div style={{ background:'#f8f8f8', height:160, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                        {(p.img_front||p.image_url)
                          ? <img src={p.img_front||p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                          : <span style={{ fontSize:52 }}>{p.emoji||'👕'}</span>}
                        <div style={{ position:'absolute', top:8, left:8, background:p.tagColor||p.tag_color||'#c8102e', color:'#fff', fontSize:8, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2 }}>{p.tag}</div>
                        {isSelected && (
                          <div style={{ position:'absolute', inset:0, background:'rgba(200,16,46,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:700 }}>✓</div>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:'10px 12px' }}>
                        <p style={{ fontSize:12, fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{p.category}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#c8102e' }}>₹{Number(p.price).toLocaleString()}</span>
                          <span style={{ fontSize:11, color:'#bbb', textDecoration:'line-through' }}>₹{Number(p.mrp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="btn-primary" style={{ width:'100%', padding:14, fontSize:14, opacity:selectedProduct?1:.5 }}
                onClick={()=>{ if(selectedProduct) setStep('create') }} disabled={!selectedProduct}>
                {selectedProduct ? `Continue with ${selectedProduct.name} →` : 'Select a product to continue'}
              </button>
            </div>
          ) : (
            <CreateGroupOrder user={user} selectedProduct={selectedProduct} onChangeProduct={()=>setStep('pick')} />
          )
        ) : (
          <JoinGroupOrder user={user} />
        )}
      </div>
    </div>
  )
}

function CreateGroupOrder({ user, selectedProduct, onChangeProduct }) {
  const [form, setForm]         = useState({ title:'', color:'#ffffff', deadline:'', organizer: user?.user_metadata?.full_name||'', phone:'' })
  const [created, setCreated]   = useState(null)
  const [saving, setSaving]     = useState(false)
  // Design upload state
  const [designFile, setDesignFile] = useState(null)
  const [designImg,  setDesignImg]  = useState(null)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [uploadErr,  setUploadErr]  = useState('')

  const GARMENT_DEFAULTS = {
    'T-Shirts': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    'Hoodies':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
    'Polos':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
  }

  // Garment image to use in preview — prefer product's own image
  const previewGarmentImg = selectedProduct
    ? (selectedProduct.img_front || selectedProduct.image_url || GARMENT_DEFAULTS[selectedProduct.category] || GARMENT_DEFAULTS['T-Shirts'])
    : GARMENT_DEFAULTS['T-Shirts']

  const garmentLabel = selectedProduct ? selectedProduct.name : 'No product selected'

  const handleDesignFile = e => {
    const f = e.target.files[0]; if (!f) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml']
    if (!allowed.includes(f.type)) { setUploadErr('Only PNG, JPG, SVG allowed.'); return }
    if (f.size > 20*1024*1024) { setUploadErr('Max 20MB.'); return }
    setUploadErr('')
    setDesignFile(f)
    setDesignImg(URL.createObjectURL(f))
  }

  const create = async () => {
    if (!form.title||!form.organizer||!form.phone) { alert('Fill all required fields'); return }
    setSaving(true)
    let designUrl = null
    if (designFile) {
      try {
        designUrl = await uploadToCloudinary(designFile, pct => setUploadPct(pct))
      } catch(e) {
        setSaving(false)
        alert('Design upload failed: ' + e.message)
        return
      }
    }
    const id   = crypto.randomUUID()
    const code = Math.random().toString(36).slice(2,8).toUpperCase()
    const groupData = {
      id,
      group_code:          code,
      title:               form.title,
      garment:             selectedProduct ? selectedProduct.name : 'Custom Garment',
      garment_category:    selectedProduct?.category || null,
      product_id:          selectedProduct?.id || null,
      product_image:       selectedProduct?.img_front || selectedProduct?.image_url || null,
      product_price:       selectedProduct?.price || null,
      color:               form.color,
      deadline:            form.deadline || null,
      organizer_name:      form.organizer,
      organizer_phone:     form.phone,
      organizer_user_id:   user?.id || null,
      design_url:          designUrl,
      created_at:          new Date().toISOString(),
      status:              'open',
    }
    const { error } = await supabase.from('drynn_group_orders').insert(groupData).catch(()=>({ error:{message:'Table may not exist'} }))
    setSaving(false)
    setCreated({ ...groupData, previewGarmentImg, error: error?.message })
  }

  const shareUrl = created ? `${typeof window!=='undefined'?window.location.origin:''}/group/${created.group_code}` : ''
  const copyLink = () => { navigator.clipboard.writeText(shareUrl).catch(()=>{}); alert('Link copied!') }

  // ── Success screen ────────────────────────────────────────
  if (created) return (
    <div className="fade-in">
      <div style={{ background:'rgba(0,168,107,.08)', border:'1px solid rgba(0,168,107,.25)', borderRadius:12, padding:'24px', marginBottom:24, textAlign:'center' }}>
        <div style={{ marginBottom:12, color:'#00a86b' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        </div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, marginBottom:8 }}>GROUP ORDER CREATED!</h2>
        <p style={{ fontSize:14, color:'#555', marginBottom:16 }}>Share this code or link with your team. They can join and select their size independently.</p>

        {/* Product + design preview */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#888', marginBottom:8 }}>
            {created.design_url ? 'Design Preview' : 'Selected Product'}
          </div>
          <div style={{ position:'relative', display:'inline-block', width:220, height:220 }}>
            <img src={created.previewGarmentImg} alt="garment"
              style={{ width:220, height:220, objectFit:'contain', display:'block' }} />
            {created.design_url && (
              <img src={created.design_url} alt="design"
                style={{ position:'absolute', top:'44%', left:'50%', transform:'translate(-50%,-50%)', width:'38%', objectFit:'contain', pointerEvents:'none' }} />
            )}
          </div>
          <div style={{ fontSize:12, color:'#555', marginTop:6, fontWeight:600 }}>{created.garment}</div>
        </div>

        <div style={{ background:'#fff', border:'2px solid #00a86b', borderRadius:8, padding:'16px 20px', marginBottom:16, display:'inline-block', minWidth:200 }}>
          <div style={{ fontSize:10, color:'#888', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:6 }}>Group Code</div>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:44, letterSpacing:'.12em', color:'#0a0a0a' }}>{created.group_code}</div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn-primary" style={{ padding:'12px 24px' }} onClick={copyLink}>Copy Join Link</button>
          <a href={`https://wa.me/?text=Join%20our%20group%20order%20on%20DRYNN!%20Code:%20${created.group_code}%20Link:%20${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'#25D366', color:'#fff', borderRadius:4, fontSize:13, fontWeight:700, textDecoration:'none' }}>
            Share on WhatsApp
          </a>
        </div>
        {created.error && <p style={{ fontSize:11, color:'#f5a623', marginTop:12 }}>Note: DB save failed ({created.error}).</p>}
      </div>
      <button onClick={()=>setCreated(null)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>← Create another</button>
    </div>
  )

  // ── Create form ───────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="fade-in">
      <div style={{ marginBottom:4 }}>
        <span className="sec-label">Step 2 of 2</span>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:24, letterSpacing:'.04em', marginBottom:4 }}>ORDER DETAILS</h2>
        <p style={{ fontSize:13, color:'#888' }}>Fill in your group order info and upload your design.</p>
      </div>
      <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.05)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Event name */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Event / Order Name *</label>
            <input className="input-field" placeholder="e.g. CSE Batch 2025 Farewell Tees" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          </div>

          {/* ── Selected product summary ── */}
          {selectedProduct && (
            <div style={{ display:'flex', alignItems:'center', gap:14, background:'rgba(0,168,107,.06)', border:'1.5px solid rgba(0,168,107,.25)', borderRadius:10, padding:'12px 16px' }}>
              <div style={{ width:56, height:56, background:'#fff', borderRadius:8, overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {(selectedProduct.img_front||selectedProduct.image_url)
                  ? <img src={selectedProduct.img_front||selectedProduct.image_url} alt={selectedProduct.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                  : <span style={{ fontSize:28 }}>{selectedProduct.emoji||'👕'}</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedProduct.name}</div>
                <div style={{ fontSize:11, color:'#888' }}>{selectedProduct.category} · ₹{Number(selectedProduct.price).toLocaleString()}</div>
              </div>
              <button onClick={onChangeProduct} style={{ fontSize:11, fontWeight:700, color:'#c8102e', background:'none', border:'1px solid rgba(200,16,46,.3)', borderRadius:50, padding:'5px 12px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Change ↩</button>
            </div>
          )}

          {/* Colour */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Colour</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {SWATCHES.slice(0,8).map(c=>(
                <div key={c} onClick={()=>setForm({...form,color:c})}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer',
                    border: c==='#ffffff' ? '2px solid #ccc' : '2px solid transparent',
                    boxShadow: form.color===c ? '0 0 0 3px #c8102e' : 'none', transition:'box-shadow .15s' }} />
              ))}
            </div>
          </div>

          {/* Design upload + live preview */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Design / Logo (optional)</label>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Upload zone */}
              <label style={{ flex:'1 1 140px', cursor:'pointer' }}>
                <input type="file" accept=".png,.jpg,.jpeg,.svg" style={{ display:'none' }} onChange={handleDesignFile} />
                <div className="upload-zone" style={{ minHeight:80, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                  {designImg
                    ? <img src={designImg} alt="design" style={{ maxHeight:60, maxWidth:'100%', objectFit:'contain', borderRadius:4 }} />
                    : <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span style={{ fontSize:11, color:'#aaa' }}>Upload PNG / JPG / SVG</span></>}
                </div>
              </label>
              {/* Live garment + design preview */}
              <div style={{ flex:'0 0 150px', textAlign:'center' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#aaa', marginBottom:4 }}>Preview</div>
                <div style={{ position:'relative', width:140, height:140, margin:'0 auto' }}>
                  <img src={previewGarmentImg} alt="garment" style={{ width:140, height:140, objectFit:'contain', display:'block' }}
                    onError={e=>e.target.style.opacity='0.1'} />
                  {designImg && (
                    <img src={designImg} alt="design overlay"
                      style={{ position:'absolute', top:'44%', left:'50%', transform:'translate(-50%,-50%)', width:'38%', objectFit:'contain', pointerEvents:'none' }} />
                  )}
                  {!designImg && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#ccc', pointerEvents:'none' }}>design here</div>
                  )}
                </div>
                {selectedProduct && <div style={{ fontSize:10, color:'#888', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedProduct.name}</div>}
                {designImg && (
                  <button onClick={()=>{setDesignFile(null);setDesignImg(null)}}
                    style={{ marginTop:4, fontSize:10, color:'#c8102e', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Remove design</button>
                )}
              </div>
            </div>
            {uploadErr && <p style={{ fontSize:11, color:'#c8102e', marginTop:6 }}>{uploadErr}</p>}
            {saving && designFile && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:4 }}><span>Uploading design…</span><span>{uploadPct}%</span></div>
                <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}><div style={{ height:'100%', width:`${uploadPct}%`, background:'#c8102e', borderRadius:2, transition:'width .3s' }} /></div>
              </div>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Order Deadline (optional)</label>
            <input className="input-field" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={{ maxWidth:200 }} />
          </div>

          {/* Organizer details */}
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

          <button className="btn-primary" style={{ padding:14, fontSize:13, opacity:saving?.6:1 }}
            onClick={create} disabled={saving}>
            {saving ? (designFile ? `Uploading… ${uploadPct}%` : 'Creating…') : 'Create Group Order →'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background:'linear-gradient(135deg,rgba(0,168,107,.06),rgba(10,31,93,.06))', border:'1px solid rgba(0,168,107,.2)', borderRadius:12, padding:'20px 24px' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>How Group Orders Work</div>
        {[['1.','Pick a product from the shop and create a group order.'],['2.','Share the unique link/code with your group.'],['3.','Everyone sees the product preview, selects their size, and pays individually.'],['4.','DRYNN prints and delivers all pieces together.']].map(([e,t])=>(
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
      <div style={{ marginBottom:16, color:'#00a86b' }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
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
            {/* Design / product preview for members */}
            {(group.design_url || group.product_image) && (
              <div style={{ marginTop:14, textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#888', marginBottom:6 }}>
                  {group.design_url ? 'Your Design Preview' : 'Product'}
                </div>
                <div style={{ position:'relative', display:'inline-block', width:200, height:200 }}>
                  <img
                    src={group.product_image || {
                      'T-Shirt': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
                      'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_navy.png',
                      'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
                      'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_black.png',
                    }[group.garment] || 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png'}
                    alt="garment" style={{ width:200, height:200, objectFit:'contain', display:'block' }}
                    onError={e=>e.target.style.opacity='0.1'} />
                  {group.design_url && (
                    <img src={group.design_url} alt="design"
                      style={{ position:'absolute', top:'44%', left:'50%', transform:'translate(-50%,-50%)', width:'38%', objectFit:'contain', pointerEvents:'none' }} />
                  )}
                </div>
                {group.product_price && <div style={{ fontSize:13, fontWeight:700, color:'#c8102e', marginTop:4 }}>₹{Number(group.product_price).toLocaleString()} per piece</div>}
                <div style={{ fontSize:11, color:'#00a86b', marginTop:4, fontWeight:600 }}>
                  {group.design_url ? `This is what will be printed on your ${group.garment}` : group.garment}
                </div>
              </div>
            )}
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
              {saving?'Joining…':'Confirm My Order'}
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
    { key:'home',     label:'Home',    icon:'🏠' },
    { key:'products', label:'Shop',    icon:'🛒' },
    { key:'studio',   label:'Studio',  special:true, icon:'🎨' },
    { key:'cart',     label:'Cart',    icon:'🛒' },
    { key:'account',  label:'Account', icon:'👤' },
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
            {isAdmin && <button onClick={()=>setPage('admin')} style={{ background:'none', border:'1px solid rgba(200,16,46,.3)', padding:'5px 10px', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', cursor:'pointer', color:'#c8102e', borderRadius:4 }}>Admin</button>}
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
      {page==='studio'   && <StudioPage   user={user} onNav={setPage} onAddToCart={addToCart} />}
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
