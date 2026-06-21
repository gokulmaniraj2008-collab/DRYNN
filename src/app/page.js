'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Script from 'next/script'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const GOOGLE_SHEET_WEBHOOK = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK
// process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID   — set in .env.local (rzp_live_xxxxxxxx)
// process.env.NEXT_PUBLIC_ADMIN_EMAIL        — set in .env.local
// process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    — set in .env.local
// process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — set in .env.local

// ── Data ─────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', price: 699,  mrp: 999,  tag: 'Best Seller', tagColor: '#c8102e', category: 'T-Shirts',  emoji: '.', rating: 4.5, reviews: 238 },
  { id: 2, name: 'Premium Hoodie',         price: 1299, mrp: 1799, tag: 'New',         tagColor: '#0a1f5d', category: 'Hoodies',   emoji: '.', rating: 4.7, reviews: 91  },
  { id: 3, name: 'Slim Fit Polo',          price: 849,  mrp: 1199, tag: 'Popular',     tagColor: '#00a86b', category: 'Polos',     emoji: '.', rating: 4.3, reviews: 174 },
  { id: 4, name: 'Cargo Joggers',          price: 999,  mrp: 1399, tag: 'New',         tagColor: '#0a0a0a', category: 'Joggers',   emoji: '.', rating: 4.4, reviews: 62  },
  { id: 5, name: 'Graphic Round Neck Tee', price: 599,  mrp: 849,  tag: 'Sale',        tagColor: '#c8102e', category: 'T-Shirts',  emoji: '.', rating: 4.2, reviews: 312 },
  { id: 6, name: 'Zip-Up Hoodie',          price: 1499, mrp: 1999, tag: 'Trending',    tagColor: '#9b59b6', category: 'Hoodies',   emoji: '.', rating: 4.6, reviews: 55  },
  { id: 7, name: 'Classic Polo',           price: 749,  mrp: 999,  tag: 'Popular',     tagColor: '#00a86b', category: 'Polos',     emoji: '.', rating: 4.1, reviews: 88  },
  { id: 8, name: 'Track Pants',            price: 899,  mrp: 1199, tag: 'New',         tagColor: '#0a0a0a', category: 'Joggers',   emoji: '.', rating: 4.3, reviews: 43  },
]
const DEFAULT_SWATCHES = ['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#00a86b','#f5a623','#9b59b6','#888888']

// Shared hook — loads admin-managed color list from drynn_settings, falls back to DEFAULT_SWATCHES
function useSwatches() {
  const [swatches, setSwatches] = React.useState(DEFAULT_SWATCHES)
  React.useEffect(() => {
    supabase.from('drynn_settings').select('value').eq('key','swatches').single()
      .then(({ data }) => {
        if (data?.value) {
          try { const parsed = JSON.parse(data.value); if (Array.isArray(parsed) && parsed.length) setSwatches(parsed) } catch {}
        }
      })
  }, [])
  return swatches
}
const SWATCHES = DEFAULT_SWATCHES // keep for any legacy inline references

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
            emoji:     p.emoji || '.',
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
// Note: studio_only and home_and_shop_only are mutually exclusive (enforced in UI)
function useStudioProducts() {
  return useProducts().filter(p => p.studio_only)
}


// Shared hook — loads admin-managed media (videos + song) from drynn_settings
const DEFAULT_MEDIA = {
  video_intro:  'https://res.cloudinary.com/dfhdyp4oq/video/upload/v1780972479/video_20260609_080102_edit_n46bhf.mp4',
  video_studio: 'https://res.cloudinary.com/dfhdyp4oq/video/upload/v1781006529/Cinthia_Duim_MP4_lpf7mx.mp4',
  video_home:   'https://res.cloudinary.com/dfhdyp4oq/video/upload/v1781005895/%E1%BA%A2nh_b%C3%ACa___%E1%BA%A2nh_%C4%91%E1%BB%99ng__H%C3%ACnh_gif__Ngh%E1%BB%87_thu%E1%BA%ADt_MP4_gm3r0e.mp4',
  audio_song:   '',
}
// Push a history entry when a full-screen overlay (e.g. product detail) opens,
// so the phone/browser back button closes the overlay instead of exiting the app.
function useOverlayHistory(active, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!active) return
    window.history.pushState({ overlay: true }, '')
    const handler = (e) => {
      if (!e.state?.overlay) onCloseRef.current()
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [active])
}

function useMediaSettings() {
  const [media, setMedia] = React.useState(DEFAULT_MEDIA)
  React.useEffect(() => {
    supabase.from('drynn_settings').select('key,value').in('key',['video_intro','video_studio','video_home','audio_song'])
      .then(({ data }) => {
        if (!data || !data.length) return
        const m = { ...DEFAULT_MEDIA }
        data.forEach(row => { if (row.value) m[row.key] = row.value })
        setMedia(m)
      })
  }, [])
  return media
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

  @keyframes phoenix-fly {
    /* PASS 1: LEFT → center → RIGHT */
    0%   { top:38vh;  left:-60vw;  opacity:0;  transform:rotate(-8deg); }
    2%   { top:38vh;  left:-60vw;  opacity:0;  transform:rotate(-8deg); }
    14%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    20%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    30%  { top:38vh;  left:115vw;  opacity:0;  transform:rotate(8deg); }
    33%  { top:38vh;  left:115vw;  opacity:0;  transform:rotate(8deg); }

    /* PASS 2: TOP → center → BOTTOM */
    34%  { top:-60vh; left:32vw;   opacity:0;  transform:rotate(-12deg); }
    46%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    52%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    62%  { top:115vh; left:32vw;   opacity:0;  transform:rotate(12deg); }
    65%  { top:115vh; left:32vw;   opacity:0;  transform:rotate(12deg); }

    /* PASS 3: RIGHT → center → LEFT */
    66%  { top:38vh;  left:115vw;  opacity:0;  transform:rotate(8deg); }
    78%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    84%  { top:32vh;  left:25vw;   opacity:1;  transform:rotate(0deg); }
    96%  { top:38vh;  left:-60vw;  opacity:0;  transform:rotate(-8deg); }
    100% { top:38vh;  left:-60vw;  opacity:0;  transform:rotate(-8deg); }
  }
  .phoenix-wrap {
    animation: phoenix-fly 36s ease-in-out infinite;
    position: absolute;
    width: 50vmin;
    height: 50vmin;
    top: 38vh;
    left: -60vw;
    z-index: 0;
    pointer-events: none;
  }
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
// SPLASH — bird screen with D R Y N N letters appearing one-by-one
//           in the centre, each letter stays visible (no hide)
// ══════════════════════════════════════════════════════════════

const DRYNN_LETTERS = ['D','R','Y','N','N']

function SplashScreen({ onDone }) {
  return <BirdScreen onDone={onDone} />
}

function BirdScreen({ onDone }) {
  const wrapRef     = useRef(null)
  const animRef     = useRef(null)
  const everTouched = useRef(false)
  const isDragging  = useRef(false)
  const targetRef   = useRef(null)

  // ── Letter-reveal state: how many letters are visible so far (0-5) ──
  const [visibleCount, setVisibleCount] = useState(0)
  const lettersComplete = visibleCount >= DRYNN_LETTERS.length

  useEffect(() => {
    if (visibleCount >= DRYNN_LETTERS.length) return
    // Each letter appears every 550ms
    const t = setTimeout(() => setVisibleCount(c => c + 1), 550)
    return () => clearTimeout(t)
  }, [visibleCount])

  // Bird lives in the TOP 55% of screen only
  const BIRD_ZONE_H = () => window.innerHeight * 0.46  // clamp bird so it touches the logo zone
  const BIRD_SIZE   = () => Math.min(window.innerWidth * 0.75, window.innerHeight * 0.45)

  const posRef = useRef({
    x: window.innerWidth  * 0.5,
    y: window.innerHeight * 0.26,
  })

  useEffect(() => {
    let angle = 0

    function tick() {
      const el = wrapRef.current
      if (!el) { animRef.current = requestAnimationFrame(tick); return }

      const size = BIRD_SIZE()
      const zoneH = BIRD_ZONE_H()

      if (targetRef.current) {
        const speed = isDragging.current ? 0.2 : 0.08
        posRef.current.x += (targetRef.current.x - posRef.current.x) * speed
        posRef.current.y += (targetRef.current.y - posRef.current.y) * speed
        // Clamp bird inside top zone
        posRef.current.y = Math.min(posRef.current.y, zoneH - size * 0.1)
      } else if (!everTouched.current) {
        // Smooth figure-8 inside top 50% of screen
        angle += 0.007
        posRef.current.x = window.innerWidth  * 0.5  + window.innerWidth  * 0.3  * Math.sin(angle)
        posRef.current.y = window.innerHeight * 0.26 + window.innerHeight * 0.12 * Math.sin(angle * 2)
      }

      el.style.width  = size + 'px'
      el.style.height = size + 'px'
      el.style.left   = (posRef.current.x - size / 2) + 'px'
      el.style.top    = (posRef.current.y - size / 2) + 'px'
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const getPos = (e) => e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY }

  const handleDown = (e) => { isDragging.current = true; everTouched.current = true; targetRef.current = getPos(e) }
  const handleMove = (e) => { if (!isDragging.current) return; e.preventDefault(); targetRef.current = getPos(e) }
  const handleUp   = ()  => { isDragging.current = false }
  const handleTap  = (e) => { everTouched.current = true; targetRef.current = getPos(e) }

  return (
    <div
      onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}
      onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
      onClick={handleTap}
      style={{ position:'fixed', inset:0, background:'#fff',
               overflow:'hidden', cursor:'crosshair', userSelect:'none' }}
    >
      <Script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" strategy="afterInteractive" />

      {/* ── BIRD zone: top 55% ── */}
      <div ref={wrapRef} style={{
        position:'absolute', zIndex:1, pointerEvents:'none',
        top:'0px', left:'0px',
        width: BIRD_SIZE() + 'px', height: BIRD_SIZE() + 'px',
      }}>
        <model-viewer
          src="/phoenix_bird.glb"
          autoplay auto-rotate rotation-per-second="30deg"
          camera-controls={false} disable-zoom interaction-prompt="none"
          style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }}
        ></model-viewer>
      </div>

      {/* ── CENTRE block: DRYNN + subtitle + button sit in true screen centre ── */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        zIndex:3, pointerEvents:'none',
      }}>
        {/* Touch hint just above the logo block */}
        <div style={{
          position:'absolute', top:'52%', left:0, right:0,
          textAlign:'center',
          fontSize:9, fontWeight:700, letterSpacing:'.18em',
          color:'#ccc', textTransform:'uppercase',
        }}>
          Touch to guide the bird
        </div>
        <div style={{ display:'flex', gap:4, marginBottom:14 }}>
          <div style={{ width:36, height:4, background:'#c8102e', borderRadius:2 }} />
          <div style={{ width:36, height:4, background:'#0a1f5d', borderRadius:2 }} />
        </div>

        {/* Letters appear one-by-one and STAY visible */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Bebas Neue,sans-serif',
          fontSize:'clamp(64px,18vw,120px)',
          letterSpacing:'.2em', lineHeight:1,
          minWidth: '5ch',   /* reserve space so layout does not jump */
        }}>
          {DRYNN_LETTERS.map((letter, i) => (
            <span
              key={i}
              style={{
                color:'#0a0a0a',
                opacity: i < visibleCount ? 1 : 0,
                transform: i < visibleCount ? 'translateY(0)' : 'translateY(18px)',
                transition:'opacity 220ms ease, transform 220ms ease',
                display:'inline-block',
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
          <div style={{ width:20, height:1.5, background:'#c8102e' }} />
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.28em', textTransform:'uppercase', color:'#aaa' }}>Custom Print · Tamil Nadu</span>
          <div style={{ width:20, height:1.5, background:'#0a1f5d' }} />
        </div>

        {/* START button only appears after all letters have shown */}
        <button onClick={onDone} className="btn-primary"
          style={{
            marginTop:28, padding:'14px 52px', fontSize:13, letterSpacing:'.1em',
            textTransform:'uppercase', pointerEvents:'all', cursor:'pointer',
            opacity: lettersComplete ? 1 : 0,
            transform: lettersComplete ? 'translateY(0)' : 'translateY(10px)',
            transition:'opacity 300ms ease 100ms, transform 300ms ease 100ms',
          }}>
          Start
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// INTRO PAGE (brand info  -  no login)
// ══════════════════════════════════════════════════════════════
function IntroPage({ onGoToLogin }) {
  const mediaSettings = useMediaSettings()
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

      {/* Hero — Cloudinary Background Video */}
      <div style={{ position:'relative', width:'100%', minHeight:480, overflow:'hidden', display:'flex', alignItems:'center' }}>
        <video
          key={mediaSettings.video_intro}
          ref={videoRef}
          autoPlay muted loop playsInline
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}
        >
          <source src={mediaSettings.video_intro} type="video/mp4" />
        </video>
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)', zIndex:1 }} />

        {/* Mute/Unmute button — bottom right */}
        <button onClick={toggleMute} style={{
          position:'absolute', bottom:12, right:12, zIndex:3,
          width:28, height:28, borderRadius:'50%',
          background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)',
          backdropFilter:'blur(8px)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'background .2s',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.28)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}
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

        <div style={{ position:'relative', zIndex:2, padding:'56px 20px 48px', maxWidth:680, margin:'0 auto', width:'100%' }} className="fade-in">
          <span className="sec-label" style={{ color:'#c8102e' }}>Tamil Nadu's #1 Custom Print</span>
          <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(42px,10vw,80px)', letterSpacing:'.02em', lineHeight:1, marginBottom:16, color:'#fff' }}>
            YOUR DESIGN.<br/><span style={{ color:'#c8102e' }}>YOUR STYLE.</span><br/>YOUR DRYNN.
          </h1>
          <p style={{ fontSize:15, lineHeight:1.85, color:'rgba(255,255,255,.75)', marginBottom:28, maxWidth:480 }}>
            Upload your artwork, pick your garment, and we deliver premium custom clothing straight to your door — anywhere in India.
          </p>
          <div className="hero-cta" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button className="btn-primary" style={{ fontSize:14, padding:'14px 28px' }} onClick={onGoToLogin}>Get Started Free</button>
            <button style={{ fontSize:14, padding:'14px 28px', background:'rgba(255,255,255,.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,.35)', borderRadius:4, fontWeight:700, cursor:'pointer' }} onClick={onGoToLogin}>View Products</button>
          </div>
        </div>
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
      {/* Feature strips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, padding:'32px 20px 48px', maxWidth:900, margin:'0 auto', width:'100%' }}>
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
          <img src={garmentImgSrc} alt="garment" style={{ width:'100%', display:'block', filter:colorToFilter(color) }} onError={e=>{e.target.src='https://placehold.co/400x400/f0f0f0/cccccc?text=No+Image'}} />
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
  const getDesign = key => {
    if (sideImgs) {
      const v = sideImgs[key]
      if (Array.isArray(v)) return v.filter(Boolean)
      return v ? [v] : []
    }
    return key === 'front' && designImgSrc ? [designImgSrc] : []
  }
  // getPos returns pos for design index di (default 0) — supports per-design positions
  const getPos = (key, di=0) => {
    if (sidePos) {
      const arr = sidePos[key]
      if (Array.isArray(arr)) return arr[di] || { posX:50, posY:38, scale:38, rotation:0 }
      return arr || { posX:50, posY:38, scale:38, rotation:0 }
    }
    return { posX, posY, scale, rotation }
  }
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
      const currentDesigns = getDesign(current.key)

      for (let di = 0; di < currentDesigns.length; di++) {
        const dSrc   = currentDesigns[di]
        const currentP = getPos(current.key, di)
        const dImg = await loadImg(dSrc)
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
              onError={e=>{ e.target.src='https://placehold.co/400x400/f0f0f0/cccccc?text=No+Image' }}
            />
            {/* Design overlay — per side, each at its own position */}
            {(() => {
              const ds = getDesign(f.key)
              if (!ds.length) return null
              return ds.map((src, di) => {
                const p = getPos(f.key, di)
                return (
                  <img key={di} src={src} alt={'design-'+di}
                    style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                      transform:`translate(-50%,-50%) rotate(${p.rotation}deg)`,
                      width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }} />
                )
              })
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
                onError={e=>{ e.target.src='https://placehold.co/400x400/f0f0f0/cccccc?text=No+Image' }} />
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

  // Near-white
  if (l > 0.92 && d < 0.08) return 'none'
  // Near-black
  if (l < 0.10) return `brightness(${Math.round(l * 700)}%) saturate(0.1)`
  // Near-grey (desaturated)
  if (d < 0.08) return `brightness(${Math.round(l * 100)}%) saturate(0.05)`

  // Compute HSL hue (0-360)
  let hue = 0
  if (max === rn)      hue = (((gn - bn) / d) % 6 + 6) % 6 * 60
  else if (max === gn) hue = ((bn - rn) / d + 2) * 60
  else                 hue = ((rn - gn) / d + 4) * 60

  // HSL saturation
  const sat = d / (1 - Math.abs(2 * l - 1))

  // sepia(1) produces roughly hue≈38°, sat≈0.74, lightness≈0.53
  // We rotate from that base to our target hue.
  // Use modulo to ensure shortest-path rotation is correct (handles red at 0/360).
  const SEPIA_HUE = 38
  const hueRotate = Math.round(((hue - SEPIA_HUE) % 360 + 360) % 360)

  // Scale saturation: sepia base is ~0.74, target is `sat`
  const satMult    = Math.min(25, Math.max(1, Math.round((sat / 0.74) * 10)))

  // Scale brightness relative to lightness; sepia base brightness is ~0.53
  const brightMult = Math.min(1.8, Math.max(0.25, (l / 0.53) * 0.95)).toFixed(2)

  return `sepia(1) hue-rotate(${hueRotate}deg) saturate(${satMult}) brightness(${brightMult})`
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// LIVE T-SHIRT PREVIEW  -  canvas-based, design on fabric
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// DRYNN UNIFIED STUDIO  — 6-step flow
// ══════════════════════════════════════════════════════════════
function StudioPage({ user, onNav, onAddToCart }) {
  // ── All admin products (excluding home & shop only products) ──────────────
  const mediaSettings = useMediaSettings()
  const allProducts = useProducts().filter(p => !p.home_and_shop_only)

  // ── Step tracking ─────────────────────────────────────────
  const STEPS_LIST = ['Product','Colour','Design','Customise','Preview','Order']
  const [step, setStep] = useState(1) // kept for compatibility but unused in one-page layout
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
  // sideFiles[side] = array of File/uploaded objects
  const [sideFiles,     setSideFiles]     = useState({ front:[], back:[], left:[], right:[] })
  // sideSamples[side] = sample object | null
  const [sideSamples,   setSideSamples]   = useState({ front:null, back:null, left:null, right:null })
  // sideImgs[side] = array of preview URLs
  const [sideImgs,      setSideImgs]      = useState({ front:[], back:[], left:[], right:[] })
  const [uploadErr,     setUploadErr]     = useState('')
  const [samples,       setSamples]       = useState([])
  const [samplesLoading,setSamplesLoading]= useState(false)
  const [sampleCat,     setSampleCat]     = useState('All')
  const [designTab,     setDesignTab]     = useState('upload')

  // Convenience: current side's values (arrays now)
  const designImgSrc   = sideImgs[activeSide]?.[0] || null   // first image for preview compat
  const uploadedFile   = sideFiles[activeSide]?.[0] || null
  const selectedSample = sideSamples[activeSide]

  const loadSamples = async () => {
    if (samples.length > 0) return
    setSamplesLoading(true)
    const { data } = await supabase.from('drynn_samples').select('*').order('created_at', { ascending: false })
    setSamples(data || [])
    setSamplesLoading(false)
  }

  const handleFile = e => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml']
    const valid = files.filter(f => {
      if (!allowed.includes(f.type)) { setUploadErr('Only PNG, JPG, SVG allowed.'); return false }
      if (f.size > 20*1024*1024) { setUploadErr('Max 20MB per file.'); return false }
      return true
    })
    if (!valid.length) return
    setUploadErr('')
    valid.forEach(f => {
      const blobUrl = URL.createObjectURL(f)
      setSideImgs(prev => ({ ...prev, [activeSide]: [...(prev[activeSide]||[]), blobUrl] }))
      setSideFiles(prev => ({ ...prev, [activeSide]: [...(prev[activeSide]||[]), { _uploading:true, name:f.name, _blob:blobUrl, _raw:f }] }))
      setStatus('uploading'); setUploadPct(0)
      uploadToCloudinary(f, pct => setUploadPct(pct))
        .then(url => {
          setSideImgs(prev => {
            const arr = [...(prev[activeSide]||[])]
            const idx = arr.indexOf(blobUrl); if (idx > -1) arr[idx] = url
            return { ...prev, [activeSide]: arr }
          })
          setSideFiles(prev => {
            const arr = [...(prev[activeSide]||[])]
            const idx = arr.findIndex(x => x._blob === blobUrl)
            if (idx > -1) arr[idx] = { _uploaded:true, _url:url, name:f.name }
            return { ...prev, [activeSide]: arr }
          })
          setStatus(''); setUploadPct(0)
        })
        .catch(err => {
          setUploadErr('Upload failed: ' + err.message)
          setSideImgs(prev => ({ ...prev, [activeSide]: (prev[activeSide]||[]).filter(u => u !== blobUrl) }))
          setSideFiles(prev => ({ ...prev, [activeSide]: (prev[activeSide]||[]).filter(x => x._blob !== blobUrl) }))
          setStatus('')
        })
    })
  }

  const pickSample = s => {
    // Toggle: if already selected, remove it; otherwise append to existing designs
    const alreadyIdx = (sideImgs[activeSide]||[]).indexOf(s.image_url)
    if (alreadyIdx > -1) {
      // Deselect — remove this sample's URL from the array
      setSideImgs(prev => ({ ...prev, [activeSide]: prev[activeSide].filter(u => u !== s.image_url) }))
      setSideSamples(prev => ({ ...prev, [activeSide]: null }))
    } else {
      // Append sample URL alongside any existing uploads
      setSideImgs(prev => ({ ...prev, [activeSide]: [...(prev[activeSide]||[]), s.image_url] }))
      setSideSamples(prev => ({ ...prev, [activeSide]: s }))
    }
  }

  // ── Step 4: Customise (per-side) ─────────────────────────
  const DEFAULT_POS = { posY:38, posX:50, scale:38, rotation:0 }
  // sidePos[side] = array of positions, one per design image
  const [sidePos,        setSidePos]        = useState({ front:[], back:[], left:[], right:[] })
  const [custSide,       setCustSide]       = useState('front')
  const [activeDesignIdx, setActiveDesignIdx] = useState(0)

  // Helper: get pos for a specific side+index
  const getPosFor = (side, idx) => (sidePos[side]?.[idx]) || { ...DEFAULT_POS }

  // Active design pos (for POSITION sliders)
  const custPos  = getPosFor(custSide, activeDesignIdx)
  const posY     = custPos.posY
  const posX     = custPos.posX
  const scale    = custPos.scale
  const rotation = custPos.rotation

  // Update a single field for the active design
  const updatePos = (field, val) => setSidePos(p => {
    const arr = [...(p[custSide] || [])]
    const cur = arr[activeDesignIdx] || { ...DEFAULT_POS }
    arr[activeDesignIdx] = { ...cur, [field]: val }
    return { ...p, [custSide]: arr }
  })
  const setPosY     = v => updatePos('posY', v)
  const setPosX     = v => updatePos('posX', v)
  const setScale    = v => updatePos('scale', v)
  const setRotation = v => updatePos('rotation', v)

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

        // Design overlay for this side — each design at its own position
        const designUrlRaw = resolvedDesignUrls[side]
        if (designUrlRaw) {
          const designUrlList = designUrlRaw.split(',').map(u => u.trim()).filter(Boolean)
          for (let di = 0; di < designUrlList.length; di++) {
            const dImg = await loadImg(designUrlList[di])
            if (dImg) {
              const posArr = sidePos[side]
              const pos    = (Array.isArray(posArr) ? posArr[di] : posArr) || { posX:50, posY:38, scale:38, rotation:0 }
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
        if (!(sideImgs[side]?.length)) {
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
        const files = sideFiles[side] || []
        const imgs  = sideImgs[side]  || []
        // Build a local resolved URL list — don't rely on async state updates
        const resolvedUrls = []

        for (const img of imgs) {
          if (img?.startsWith('https://')) {
            // Already a real URL (sample or previously uploaded)
            resolvedUrls.push(img)
          } else if (img?.startsWith('blob:')) {
            // Find matching file entry and upload it now
            const fileEntry = files.find(f => f._blob === img)
            const rawFile   = fileEntry?._raw || null
            if (rawFile) {
              try {
                const url = await uploadToCloudinary(rawFile, pct => setUploadPct(pct))
                resolvedUrls.push(url)
                // Also update state so thumbnails show real URL
                setSideImgs(prev => {
                  const arr = [...(prev[side]||[])]
                  const idx = arr.indexOf(img)
                  if (idx > -1) arr[idx] = url
                  return { ...prev, [side]: arr }
                })
              } catch(e) { setStatus(''); alert('Upload failed for '+side+': '+e.message); return }
            }
          }
        }
        if (resolvedUrls.length) designUrls[side] = resolvedUrls.join(',')
      }
      setStatus('saving')
      const garmentLabel = selectedProduct ? selectedProduct.name : 'Custom Garment'
      const sidesLabel   = SIDES.filter(s=>sideImgs[s]?.length > 0).map(s=>SIDE_LABELS[s]).join(', ')

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
        product_id: selectedProduct?.id || null,
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
  const SWATCHES = useSwatches()
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
    'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_white.png',
    'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_white.png',
  }
  const GARMENT_EMOJI = {'T-Shirt':'.','Hoodie':'.','Polo':'.','Joggers':'.'}
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
    const pImgs = sideImgs[ps] || []
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
          onError={e=>{ e.target.src='https://placehold.co/400x400/f0f0f0/cccccc?text=No+Image' }} />
        {/* Fallback emoji */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80, opacity:0.04, pointerEvents:'none' }}>
          {GARMENT_EMOJI[garmentType]}
        </div>
        {/* Design overlay - each image at its own position */}
        {pImgs.map((src, i) => {
          const ip = getPosFor(ps, i)
          return (
            <img key={i} src={src} alt={'design-'+i}
              style={{ position:'absolute', top:`${ip.posY}%`, left:`${ip.posX}%`,
                transform:`translate(-50%,-50%) rotate(${ip.rotation}deg)`,
                width:`${ip.scale}%`, objectFit:'contain', pointerEvents:'none' }} />
          )
        })}
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
        {pImgs.length === 0 && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'rgba(0,0,0,.55)', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:2 }}>⋆</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:600 }}>No design for this side</div>
            </div>
          </div>
        )}
      </div>

      {/* Side dots */}
      {SIDES.some(s=>sideImgs[s]?.length > 0) && (
        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
          {SIDES.map(s=>(
            <div key={s} style={{ width:8, height:8, borderRadius:'50%',
              background: (sideImgs[s]?.length > 0) ? '#00a86b' : 'rgba(255,255,255,.12)',
              transition:'background .2s' }} title={SIDE_LABELS[s]} />
          ))}
        </div>
      )}
    </div>
  )}

  // ── RENDER ────────────────────────────────────────────────
  // CapCut-style: preview fixed top, tool bar, bottom drawer panel
  const [activeTool, setActiveTool] = React.useState('garment')
  const drawerRef = React.useRef(null)

  const TOOLS = [
    { key:'garment',  icon:'👕', label:'Garment' },
    { key:'colour',   icon:'🎨', label:'Colour'  },
    { key:'design',   icon:'⬆',  label:'Design'  },
    { key:'position', icon:'↔',  label:'Position'},
    { key:'text',     icon:'T',  label:'Text'    },
    { key:'effects',  icon:'✦',  label:'Effects' },
    { key:'order',    icon:'🛒', label:'Order'   },
  ]

  // keep activeSide and custSide in sync when switching design/position
  const pickTool = (key) => {
    setActiveTool(key)
    if (key === 'design' || key === 'position' || key === 'text') {
      setCustSide(activeSide)
    }
  }

  const setActiveSideSync = (s) => { setActiveSide(s); setCustSide(s); setActiveDesignIdx(0) }

  return (
    <div style={{ background:'#111', minHeight:'100vh', display:'flex', flexDirection:'column', maxWidth:'100vw', overflow:'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{ background:'#0a0a0a', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'0 12px', display:'flex', alignItems:'center', justifyContent:'space-between', height:46, flexShrink:0, position:'sticky', top:0, zIndex:60 }}>
        <button onClick={()=>onNav('home')} style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', padding:'5px 11px', borderRadius:50, fontSize:11, cursor:'pointer', fontWeight:700 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:20, letterSpacing:'.14em', color:'#fff' }}>DRYNN <span style={{ color:'#c8102e' }}>STUDIO</span></span>
        {/* Progress dots */}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          {[
            { done: !!selectedProduct },
            { done: color !== '#ffffff' },
            { done: SIDES.some(s=>sideImgs[s]) },
            { done: false },
          ].map((dot,i) => (
            <React.Fragment key={i}>
              <div style={{ width:6, height:6, borderRadius:'50%', background: dot.done?'#00a86b':'rgba(255,255,255,.18)', transition:'background .3s' }} />
              {i < 3 && <div style={{ width:10, height:1, background:'rgba(255,255,255,.08)' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Live preview ── */}
      <div style={{ background:'#111', padding:'10px 16px 6px', flexShrink:0 }}>
        {/* Side tabs */}
        <div style={{ display:'flex', gap:5, marginBottom:8, justifyContent:'center' }}>
          {SIDES.map(s => (
            <button key={s} onClick={()=>setActiveSideSync(s)}
              style={{ flex:1, maxWidth:72, padding:'6px 4px', borderRadius:7,
                border:`1.5px solid ${activeSide===s?'#c8102e':(sideImgs[s]?.length>0)?'#00a86b':'rgba(255,255,255,.1)'}`,
                background: activeSide===s?'rgba(200,16,46,.18)':(sideImgs[s]?.length>0)?'rgba(0,168,107,.07)':'rgba(255,255,255,.03)',
                cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
              <span style={{ fontSize:11 }}>{s==='front'?'▲':s==='back'?'▼':s==='left'?'◀':'▶'}</span>
              <span style={{ fontSize:7, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase',
                color: activeSide===s?'#fff':(sideImgs[s]?.length>0)?'#00a86b':'rgba(255,255,255,.3)' }}>
                {SIDE_LABELS[s]}
              </span>
              {(sideImgs[s]?.length>0) && <span style={{ width:4, height:4, borderRadius:'50%', background:'#00a86b', display:'block' }} />}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:bgColor,
          boxShadow:'0 8px 40px rgba(0,0,0,.7)', maxWidth:300, margin:'0 auto', filter:canvasFilter }}>
          {(() => {
            const sideGarmentImg = selectedProduct
              ? (selectedProduct[`img_${activeSide}`] || selectedProduct.image_url || GARMENT_DEFAULTS[garmentType])
              : GARMENT_DEFAULTS[garmentType]
            return <img src={sideGarmentImg} alt={garmentType}
              style={{ width:'100%', display:'block', filter:colorToFilter(color), minHeight:200, objectFit:'contain' }}
              onError={e=>{ e.target.src='https://placehold.co/400x400/f0f0f0/cccccc?text=No+Image' }} />
          })()}
          {(sideImgs[activeSide]?.length > 0) && sideImgs[activeSide].map((src, i) => {
            const pp = getPosFor(activeSide, i)
            const isActive = activeTool==='position' && i===activeDesignIdx
            return (
              <img key={i} src={src} alt={'design-'+i}
                style={{ position:'absolute', top:`${pp.posY}%`, left:`${pp.posX}%`,
                  transform:`translate(-50%,-50%) rotate(${pp.rotation}deg)`,
                  width:`${pp.scale}%`, objectFit:'contain', pointerEvents:'none',
                  outline: isActive ? '2px dashed rgba(200,16,46,.7)' : 'none',
                  outlineOffset:'2px' }} />
            )
          })}
          {sideText[activeSide]?.on && sideText[activeSide]?.val && (() => {
            const st = sideText[activeSide]
            return <div style={{ position:'absolute', top:`${st.posY}%`, left:`${st.posX}%`,
              transform:`translate(-50%,-50%) rotate(${st.rot}deg)`,
              fontFamily:st.font, fontSize:st.size, color:st.color, fontWeight:700,
              textShadow:'0 1px 6px rgba(0,0,0,.6)', pointerEvents:'none', whiteSpace:'nowrap' }}>
              {st.val}
            </div>
          })()}
          {!(sideImgs[activeSide]?.length > 0) && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ background:'rgba(0,0,0,.45)', borderRadius:6, padding:'5px 10px' }}>
                <span style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' }}>No design</span>
              </div>
            </div>
          )}
          {/* Colour chip */}
          <div style={{ position:'absolute', top:6, right:6, display:'flex', alignItems:'center', gap:4,
            background:'rgba(10,10,10,.75)', borderRadius:20, padding:'2px 8px 2px 4px', backdropFilter:'blur(6px)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color, border: color==='#ffffff'?'1px solid rgba(255,255,255,.3)':'none', flexShrink:0 }} />
            <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.6)' }}>{color.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ── Tool bar ── */}
      <div style={{ background:'#0d0d0d', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', overflowX:'auto', flexShrink:0 }}>
        <div style={{ display:'flex', padding:'0 8px', minWidth:'max-content' }}>
          {TOOLS.map(t => (
            <button key={t.key} onClick={()=>pickTool(t.key)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${activeTool===t.key?'#c8102e':'transparent'}`, transition:'all .15s', flexShrink:0 }}>
              <span style={{ fontSize:16, lineHeight:1 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
                color: activeTool===t.key ? '#c8102e' : 'rgba(255,255,255,.35)' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom drawer panel ── */}
      <div ref={drawerRef} style={{ flex:1, overflowY:'auto', background:'#161616', padding:'14px 14px 80px' }}>

        {/* ══ GARMENT ══ */}
        {activeTool==='garment' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:8, padding:'8px 12px', marginBottom:12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search garments…"
                style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:13, color:'#fff', fontFamily:'DM Sans,sans-serif' }} />
            </div>
            {allProducts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 16px', color:'rgba(255,255,255,.3)', fontSize:13 }}>No products yet — you can still continue.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {filteredProducts.map(p => {
                  const isSel = selectedProduct?.id === p.id
                  return (
                    <div key={p.id} onClick={()=>setSelectedProduct(isSel?null:p)}
                      style={{ borderRadius:10, overflow:'hidden', cursor:'pointer', border:`1.5px solid ${isSel?'#c8102e':'rgba(255,255,255,.08)'}`,
                        background: isSel?'rgba(200,16,46,.1)':'rgba(255,255,255,.03)', transition:'all .12s', position:'relative' }}>
                      <div style={{ height:90, background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                          : <span style={{ fontSize:44 }}>{p.emoji||'.'}</span>}
                        {isSel && (
                          <div style={{ position:'absolute', inset:0, background:'rgba(200,16,46,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:26, height:26, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#fff', fontWeight:700 }}>✓</div>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:'6px 8px', background: isSel?'rgba(200,16,46,.08)':'#1e1e1e' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'#c8102e', fontWeight:700 }}>₹{Number(p.price).toLocaleString()}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ COLOUR ══ */}
        {activeTool==='colour' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Garment colour */}
            <div>
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:8 }}>Garment Colour</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                {SWATCHES.map(c => (
                  <div key={c} onClick={()=>setColor(c)}
                    style={{ width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0,
                      border: c==='#ffffff'?'2px solid rgba(255,255,255,.35)':'2px solid transparent',
                      boxShadow: color===c?`0 0 0 2px #161616, 0 0 0 3.5px #c8102e`:'0 1px 4px rgba(0,0,0,.5)', transition:'box-shadow .12s' }} />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.06)', borderRadius:8, padding:'8px 12px' }}>
                <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                  style={{ width:28, height:28, border:'none', borderRadius:4, cursor:'pointer', background:'none', padding:0 }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontFamily:'monospace', fontWeight:700 }}>{color.toUpperCase()}</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.25)', marginLeft:'auto' }}>Custom</span>
              </div>
            </div>
            {/* Preview background */}
            <div>
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:8 }}>Preview Background</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                {['#000000','#111111','#1a1a2e','#0a1f5d','#ffffff','#f5f5f0'].map(c => (
                  <div key={c} onClick={()=>setBgColor(c)}
                    style={{ width:28, height:28, borderRadius:5, background:c, cursor:'pointer',
                      border: c==='#ffffff'||c==='#f5f5f0'?'1.5px solid rgba(255,255,255,.3)':'1.5px solid transparent',
                      boxShadow: bgColor===c?`0 0 0 2px #161616, 0 0 0 3.5px #c8102e`:'0 1px 3px rgba(0,0,0,.5)', transition:'box-shadow .12s' }} />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.06)', borderRadius:8, padding:'8px 12px' }}>
                <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                  style={{ width:28, height:28, border:'none', borderRadius:4, cursor:'pointer', background:'none', padding:0 }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontFamily:'monospace', fontWeight:700 }}>{bgColor.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ DESIGN ══ */}
        {activeTool==='design' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', gap:6 }}>
                Side: <span style={{ color:'#c8102e' }}>{SIDE_LABELS[activeSide]}</span>
                {sideImgs[activeSide]?.length > 0 && (
                  <span style={{ background:'rgba(0,168,107,.2)', color:'#00a86b', fontSize:9, fontWeight:800, borderRadius:10, padding:'1px 7px', letterSpacing:'.04em' }}>
                    {sideImgs[activeSide].length} design{sideImgs[activeSide].length>1?'s':''}
                  </span>
                )}
              </span>
              {(sideImgs[activeSide]?.length > 0) && (
                <button onClick={()=>{ setSideImgs(p=>({...p,[activeSide]:[]})); setSideFiles(p=>({...p,[activeSide]:[]})); setSideSamples(p=>({...p,[activeSide]:null})) }}
                  style={{ fontSize:10, color:'rgba(255,255,255,.4)', background:'none', border:'1px solid rgba(255,255,255,.12)', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}>✕ Clear All</button>
              )}
            </div>
            {/* Upload / Samples toggle */}
            <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,.05)', borderRadius:7, padding:3, marginBottom:12 }}>
              {[['upload','⬆ Upload'],['samples','▶ Samples']].map(([k,l])=>(
                <button key={k} onClick={()=>{ setDesignTab(k); if(k==='samples') loadSamples() }}
                  style={{ flex:1, padding:'8px', borderRadius:5, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                    background:designTab===k?'#c8102e':'transparent', color:designTab===k?'#fff':'rgba(255,255,255,.4)', transition:'all .12s' }}>
                  {l}
                </button>
              ))}
            </div>
            {designTab==='upload' && (
              <div>
                {/* All designs grid — uploads + samples combined */}
                {sideImgs[activeSide]?.length > 0 && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                    {sideImgs[activeSide].map((src, i) => {
                      const fileEntry = sideFiles[activeSide]?.[i]
                      const isSample  = !fileEntry && src?.startsWith('https://')
                      const isUploading = fileEntry?._uploading
                      return (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={src} alt="" style={{ width:64, height:64, objectFit:'contain', borderRadius:7,
                            border: isSample ? '1.5px solid rgba(200,16,46,.5)' : '1.5px solid rgba(0,168,107,.5)',
                            background:'rgba(255,255,255,.05)' }} />
                          {isUploading && (
                            <div style={{ position:'absolute', inset:0, borderRadius:7, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'drynn-spin .7s linear infinite' }} />
                            </div>
                          )}
                          {isSample && (
                            <div style={{ position:'absolute', bottom:2, left:2, background:'rgba(200,16,46,.85)', borderRadius:3, padding:'1px 4px', fontSize:7, color:'#fff', fontWeight:800, letterSpacing:'.04em' }}>SAMPLE</div>
                          )}
                          <button onClick={()=>{
                            const url = src
                            setSideImgs(p=>({ ...p, [activeSide]: p[activeSide].filter(u => u !== url) }))
                            setSideFiles(p=>({ ...p, [activeSide]: (p[activeSide]||[]).filter(x => x._blob !== url && x._url !== url) }))
                            if (isSample) setSideSamples(p=>({ ...p, [activeSide]: null }))
                          }} style={{ position:'absolute', top:-5, right:-5, width:17, height:17, borderRadius:'50%',
                            background:'#c8102e', color:'#fff', border:'none', fontSize:10, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Add more / first upload tap zone */}
                <div onClick={()=>document.getElementById(`studioFile_${activeSide}`).click()}
                  style={{ border:`2px dashed rgba(255,255,255,.15)`, borderRadius:10, padding:'16px 12px', textAlign:'center', cursor:'pointer', background:'rgba(255,255,255,.02)' }}>
                  <input id={`studioFile_${activeSide}`} type="file" accept=".png,.jpg,.jpeg,.svg" multiple
                    style={{ display:'none' }}
                    onClick={e=>{ e.target.value = null }}
                    onChange={handleFile} />
                  <div style={{ fontSize:28, marginBottom:4 }}>＋</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', fontWeight:700, marginBottom:2 }}>
                    {sideImgs[activeSide]?.length > 0 ? 'Add more designs' : 'Tap to upload design(s)'}
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.25)' }}>PNG · JPG · SVG · Multi-select OK · Max 20MB</div>
                </div>
              </div>
            )}
            {designTab==='samples' && (
              <div>
                {samples.length > 0 && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                    {['All',...new Set(samples.map(s=>s.category).filter(Boolean))].map(cat=>(
                      <button key={cat} onClick={()=>setSampleCat(cat)}
                        style={{ padding:'3px 9px', borderRadius:100, fontSize:9, fontWeight:700, cursor:'pointer',
                          background:sampleCat===cat?'#c8102e':'transparent',
                          color:sampleCat===cat?'#fff':'rgba(255,255,255,.4)',
                          border:`1px solid ${sampleCat===cat?'#c8102e':'rgba(255,255,255,.12)'}` }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {samplesLoading
                  ? <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,.4)', fontSize:12 }}>Loading…</div>
                  : samples.length===0
                    ? <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,.3)', fontSize:12 }}>No samples yet.</div>
                    : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                        {samples.filter(s=>sampleCat==='All'||s.category===sampleCat).map(s=>{
                          const isSelected = (sideImgs[activeSide]||[]).includes(s.image_url)
                          return (
                            <div key={s.id} onClick={()=>pickSample(s)}
                              style={{ borderRadius:7, overflow:'hidden', cursor:'pointer', position:'relative',
                                border:`1.5px solid ${isSelected?'#c8102e':'rgba(255,255,255,.08)'}`,
                                opacity: isSelected ? 1 : 0.85, transition:'border .12s,opacity .12s' }}>
                              <img src={s.image_url} alt={s.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                              {isSelected && (
                                <div style={{ position:'absolute', top:2, right:2, width:16, height:16, borderRadius:'50%', background:'#c8102e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:700 }}>✓</div>
                              )}
                              {isSelected && (
                                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(200,16,46,.55)', fontSize:8, color:'#fff', fontWeight:700, textAlign:'center', padding:'2px 0', letterSpacing:'.04em' }}>TAP TO REMOVE</div>
                              )}
                            </div>
                          )
                        })}
                      </div>}
              </div>
            )}
            {uploadErr && <div style={{ fontSize:11, color:'#c8102e', padding:'6px 10px', background:'rgba(200,16,46,.07)', borderRadius:5, marginTop:8 }}>⚠ {uploadErr}</div>}
          </div>
        )}

        {/* ══ POSITION ══ */}
        {activeTool==='position' && (
          <div>
            <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:10 }}>
              Design Position — <span style={{ color:'#c8102e' }}>{SIDE_LABELS[activeSide]}</span>
            </p>

            {/* Design selector — pick which design to position */}
            {sideImgs[activeSide]?.length > 1 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>Select Design to Position</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {sideImgs[activeSide].map((src, i) => (
                    <div key={i} onClick={()=>setActiveDesignIdx(i)}
                      style={{ position:'relative', cursor:'pointer', borderRadius:6, overflow:'hidden',
                        border: i===activeDesignIdx ? '2px solid #c8102e' : '2px solid rgba(255,255,255,.1)',
                        opacity: i===activeDesignIdx ? 1 : 0.55, transition:'all .12s' }}>
                      <img src={src} alt={''} style={{ width:44, height:44, objectFit:'contain', background:'rgba(255,255,255,.06)', display:'block' }} />
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, textAlign:'center', fontSize:8, fontWeight:800,
                        background: i===activeDesignIdx ? 'rgba(200,16,46,.8)' : 'rgba(0,0,0,.5)', color:'#fff', padding:'1px 0' }}>
                        #{i+1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sideImgs[activeSide]?.length === 0 && (
              <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:14 }}>Upload a design first to adjust position.</p>
            )}

            {[
              ['Up / Down',    posY,     setPosY,     15, 75],
              ['Left / Right', posX,     setPosX,     15, 85],
              ['Size',         scale,    setScale,    10, 70],
              ['Rotation',     rotation, setRotation,-45, 45],
            ].map(([label,val,setter,min,max])=>(
              <div key={label} style={{ marginBottom:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(255,255,255,.4)' }}>{label}</span>
                  <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>{val}{label==='Rotation'?'°':'%'}</span>
                </div>
                <input type="range" min={min} max={max} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#c8102e', height:4 }} />
              </div>
            ))}
            <button onClick={()=>{setPosY(38);setPosX(50);setScale(38);setRotation(0)}}
              style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, color:'rgba(255,255,255,.35)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ↺ Reset Design #{activeDesignIdx+1}
            </button>
          </div>
        )}

        {/* ══ TEXT ══ */}
        {activeTool==='text' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)' }}>
                Text — <span style={{ color:'#c8102e' }}>{SIDE_LABELS[activeSide]}</span>
              </span>
              <button onClick={()=>setTextOn(v=>!v)}
                style={{ padding:'5px 16px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
                  background:textOn?'#c8102e':'rgba(255,255,255,.1)', color:'#fff', transition:'all .15s' }}>
                {textOn?'ON ✓':'OFF'}
              </button>
            </div>
            {textOn ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input value={textVal} onChange={e=>setTextVal(e.target.value)} placeholder="Your text here"
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', borderRadius:7, padding:'10px 12px', fontSize:14, fontWeight:700, outline:'none', fontFamily:'DM Sans,sans-serif' }} />
                <select value={textFont} onChange={e=>setTextFont(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'#fff', borderRadius:7, padding:'9px 12px', fontSize:12, outline:'none' }}>
                  {TEXT_FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                {[
                  ['Up/Down',   textPosY,setTextPosY, 5, 95],
                  ['Left/Right',textPosX,setTextPosX, 5, 95],
                  ['Size',      textSize,setTextSize, 12,60],
                  ['Rotation',  textRot, setTextRot, -45,45],
                ].map(([label,val,setter,min,max])=>(
                  <div key={label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'rgba(255,255,255,.35)' }}>{label}</span>
                      <span style={{ fontSize:11, color:'#fff', fontWeight:700 }}>{val}{label==='Rotation'?'°':label==='Size'?'px':'%'}</span>
                    </div>
                    <input type="range" min={min} max={max} value={val} onChange={e=>setter(Number(e.target.value))} style={{ width:'100%', accentColor:'#c8102e' }} />
                  </div>
                ))}
                {/* Text colour */}
                <div>
                  <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:7 }}>Text Colour</p>
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
                    {['#ffffff','#0a0a0a','#c8102e','#0a1f5d','#00a86b','#f5a623','#9b59b6'].map(c=>(
                      <div key={c} onClick={()=>setTextColor(c)}
                        style={{ width:24, height:24, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0,
                          border: c==='#ffffff'?'1.5px solid rgba(255,255,255,.4)':'1.5px solid transparent',
                          boxShadow: textColor===c?`0 0 0 2px #161616, 0 0 0 3.5px #c8102e`:'none', transition:'box-shadow .12s' }} />
                    ))}
                    <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}
                      style={{ width:24, height:24, border:'none', borderRadius:4, cursor:'pointer', background:'none', padding:0 }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'24px 16px', color:'rgba(255,255,255,.25)', fontSize:12 }}>
                Toggle ON to add text overlay to this side.
              </div>
            )}
          </div>
        )}

        {/* ══ EFFECTS ══ */}
        {activeTool==='effects' && (
          <div>
            <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:10 }}>Filter Presets</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
              {FILTERS.map(f=>(
                <button key={f.label} onClick={()=>setFilterFx(f.value)}
                  style={{ padding:'6px 12px', borderRadius:50, fontSize:10, fontWeight:700, cursor:'pointer',
                    background:filterFx===f.value?'#c8102e':'rgba(255,255,255,.07)',
                    color:filterFx===f.value?'#fff':'rgba(255,255,255,.5)',
                    border:`1px solid ${filterFx===f.value?'#c8102e':'rgba(255,255,255,.1)'}` }}>
                  {f.label}
                </button>
              ))}
            </div>
            {[['Brightness',brightness,setBrightness,50,160],['Contrast',contrast,setContrast,50,200],['Saturation',saturation,setSaturation,0,250]].map(([label,val,setter,min,max])=>(
              <div key={label} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.35)' }}>{label}</span>
                  <span style={{ fontSize:11, color:'#fff' }}>{val}%</span>
                </div>
                <input type="range" min={min} max={max} value={val} onChange={e=>setter(parseInt(e.target.value))} style={{ width:'100%', accentColor:'#c8102e' }} />
              </div>
            ))}
            <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setFilterFx('')}}
              style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, color:'rgba(255,255,255,.35)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ↺ Reset Effects
            </button>
          </div>
        )}

        {/* ══ ORDER ══ */}
        {activeTool==='order' && (
          <div>
            {status==='done' ? (
              <div style={{ textAlign:'center', padding:'32px 16px' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:26, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>ADDED TO CART!</div>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Taking you to cart…</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* Summary */}
                <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    ['Garment', selectedProduct?.name || garmentType],
                    ['Colour',  color],
                    ['Designs', SIDES.filter(s=>sideImgs[s]?.length > 0).map(s=>SIDE_LABELS[s]).join(', ') || '—'],
                    ['Size',    size],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.25)', marginBottom:1 }}>{k}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Size */}
                <div>
                  <p style={{ fontSize:9, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:8 }}>Size</p>
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                    {SIZES.map(s=>(
                      <button key={s} onClick={()=>setSize(s)}
                        style={{ padding:'8px 14px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'1.5px solid',
                          borderColor:size===s?'#c8102e':'rgba(255,255,255,.15)',
                          background:size===s?'#c8102e':'rgba(255,255,255,.04)', color:'#fff', transition:'all .12s' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload progress */}
                {status==='uploading' && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.5)', marginBottom:5 }}>
                      <span>Uploading design…</span><span>{uploadPct}%</span>
                    </div>
                    <div style={{ height:4, background:'rgba(255,255,255,.1)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${uploadPct}%`, background:'#c8102e', borderRadius:2, transition:'width .3s' }} />
                    </div>
                  </div>
                )}

                <button className="btn-primary"
                  style={{ width:'100%', padding:'14px', fontSize:14, letterSpacing:'.04em', opacity:(status==='saving'||status==='uploading'||status==='sheet')?.6:1 }}
                  onClick={handleSubmit}
                  disabled={status==='saving'||status==='uploading'||status==='sheet'}>
                  {status==='uploading'?`Uploading… ${uploadPct}%`
                    :status==='saving'?'Placing Order…'
                    :status==='sheet'?'Generating sheet…'
                    :'🛒 Place Custom Order'}
                </button>
                <p style={{ fontSize:10, color:'rgba(255,255,255,.2)', textAlign:'center', margin:0 }}>WhatsApp confirmation within 2 hours · Pay via UPI</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}


// ── Instagram-style square feed grid ─────────────────────────
function formatCount(n) {
  n = Number(n) || 0
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'M'
  if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,'') + 'K'
  return String(n)
}

function InstagramFeedSection({ products, onSelect }) {
  const [paused, setPaused] = useState(false)
  if (!products.length) return null
  const loop = [...products, ...products] // duplicated for seamless infinite loop
  const speed = Math.max(products.length * 8, 24) // seconds for one full pass
  return (
    <div style={{ padding:'32px 0' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px', marginBottom:20 }}>
        <span className="sec-label">Shop The Feed</span>
        <h2 className="sec-title">FROM OUR GALLERY</h2>
      </div>
      <div style={{ overflow:'hidden', width:'100%' }}
        onTouchStart={()=>setPaused(true)} onTouchEnd={()=>setPaused(false)}
        onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
        <div className="insta-scroll-track" style={{ display:'flex', gap:6, width:'max-content', animation:`insta-scroll ${speed}s linear infinite`, animationPlayState: paused ? 'paused' : 'running' }}>
          {loop.map((p,i) => {
            const img = p.img_front || p.image_url
            return (
              <div key={p.id+'-'+i} onClick={()=>onSelect(p)}
                style={{ position:'relative', width:140, height:140, flexShrink:0, overflow:'hidden', background:'#f0f0f0', cursor:'pointer', borderRadius:6 }}>
                {img
                  ? <img src={img} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, color:'#ccc' }}>{p.emoji||'.'}</div>
                }
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes insta-scroll {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}


function HomePage({ user, onNav, cart, onAddToCart }) {
  const mediaSettings = useMediaSettings()
  const products = usePublicProducts()
  const [selectedProduct, setSelectedProduct] = React.useState(null)
  useOverlayHistory(!!selectedProduct, () => setSelectedProduct(null))

  if (selectedProduct) return (
    <ProductDetailPage
      product={selectedProduct}
      onBack={()=>window.history.back()}
      onAddToCart={(p)=>{ onAddToCart(p); window.history.back() }}
    />
  )
  return (
    <div>
      {/* Hero Banner */}
      <div style={{ padding:'48px 20px 56px', position:'relative', overflow:'hidden', background:'#0a0a0a' }}>
        {/* Background video */}
        <video key={mediaSettings.video_home} autoPlay muted loop playsInline
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.85, pointerEvents:'none' }}>
          <source src={mediaSettings.video_home} type="video/mp4" />
        </video>
        {/* Subtle dark overlay just for text readability */}
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1, padding:'0 4px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,16,46,.18)', border:'1px solid rgba(200,16,46,.35)', borderRadius:100, padding:'5px 14px', marginBottom:16 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#c8102e' }} />
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.22em', textTransform:'uppercase', color:'#c8102e' }}>Tamil Nadu's #1 Custom Print</span>
          </div>
          <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(30px,8vw,70px)', color:'#fff', letterSpacing:'.02em', lineHeight:1.05, marginBottom:14 }}>
            YOUR DESIGN.<br/><span style={{ color:'#c8102e' }}>YOUR STYLE.</span><br/>YOUR DRYNN.
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

      <InstagramFeedSection products={products} onSelect={setSelectedProduct} />

      {/* Feature bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0' }}>
        <div className="feature-bar" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'0 16px' }}>
          {[
            { icon:'.', label:'Free Delivery', sub:'Above ₹1,500' },
            { icon:'.', label:'Easy Returns',  sub:'Manufacturing defects' },
            { icon:'.', label:'Secure Pay',    sub:'UPI · Razorpay · Secure' },
            { icon:'.', label:'WhatsApp Support', sub:'2-hour response' },
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
  const [color,    setColor]    = useState('#ffffff')
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
  const sharedSwatches = useSwatches()
  const products  = usePublicProducts()
  const [activeTab,    setActiveTab]    = useState('All')
  const [sort,         setSort]         = useState('popular')
  const [search,       setSearch]       = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  useOverlayHistory(!!selectedProduct, () => setSelectedProduct(null))

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

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
      onBack={()=>window.history.back()}
      onAddToCart={(p)=>{ onAddToCart(p); window.history.back() }}
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
    const mime = file.type || ''
    const resourceType = mime.startsWith('video/') || mime.startsWith('audio/') ? 'video' : 'image'
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`)

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
      setError(`Something went wrong. Please WhatsApp us at +91 99447 61306.`)
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

  const saveOrdersToDb = async (paymentId, paymentStatus) => {
    const placedAt = new Date().toISOString()
    const orderIds = []
    for (const item of cart) {
      const orderId = crypto.randomUUID()
      orderIds.push(orderId)
      const cd = item.customDetails
      const designUrls = cd?.designUrls || {}
      const { error: dbErr } = await supabase.from('drynn_orders').insert({
        id:               orderId,
        user_id:          user?.id || null,
        name:             cd?.name    || form.name,
        phone:            cd?.phone   || form.phone,
        address:          cd?.address || `${form.address}, ${form.pincode}`,
        garment:          item.isCustom ? (cd?.garment || item.name) : item.name,
        product_name:     item.name,
        product_category: item.category || null,
        color:            item.color || 'Various',
        size:             item.size  || 'Various',
        qty:              item.qty,
        order_type:       item.isCustom ? 'custom' : 'catalog',
        product_id:       item.isCustom ? (item.product_id || null) : (item.id || null),
        product_image:    item.isCustom ? null : (item.image_url || null),
        // design_file: full JSON blob (backward compat)
        design_file:      item.isCustom ? (cd?.designUrls ? JSON.stringify(cd.designUrls) : '') : 'catalog-order',
        // individual side URLs for easy admin querying
        design_back:      item.isCustom ? (designUrls.back  || null) : null,
        design_left:      item.isCustom ? (designUrls.left  || null) : null,
        design_right:     item.isCustom ? (designUrls.right || null) : null,
        // design_sides: comma-separated list of sides that have designs
        design_sides:     item.isCustom ? Object.keys(designUrls).filter(s => designUrls[s]).join(',') || null : null,
        // custom_text: combined text from all sides that have text enabled
        custom_text:      item.isCustom && cd?.sideText
          ? Object.entries(cd.sideText).filter(([,t]) => t?.on && t?.val).map(([s,t]) => `${s}: ${t.val}`).join(' | ') || null
          : null,
        print_sheet_url:  item.isCustom ? (cd?.printSheetUrl || null) : null,
        side_pos:         item.isCustom ? (cd?.sidePos  ? JSON.stringify(cd.sidePos)  : null) : null,
        text_on:          item.isCustom ? (cd?.textOn   ? true : false)                        : false,
        text_val:         item.isCustom ? (cd?.textVal  || null)                                : null,
        text_font:        item.isCustom ? (cd?.textFont || null)                                : null,
        text_size:        item.isCustom ? (cd?.textSize || null)                                : null,
        text_color:       item.isCustom ? (cd?.textColor|| null)                                : null,
        text_pos_x:       item.isCustom ? (cd?.textPosX || 50)                                  : null,
        text_pos_y:       item.isCustom ? (cd?.textPosY || 75)                                  : null,
        text_rot:         item.isCustom ? (cd?.textRot  || 0)                                   : null,
        side_text:        item.isCustom ? (cd?.sideText ? JSON.stringify(cd.sideText) : null)   : null,
        status:           'Received',
        payment_status:   paymentStatus,
        payment_id:       paymentId || null,
        total:            grandTotal,
        placed_at:        placedAt,
      })
      if (dbErr) {
        console.error('[Cart → Supabase] Order insert failed:', dbErr.message)
        alert(`[Order Save Failed]\n\n${dbErr.message}\n\nPlease WhatsApp us at +91 99447 61306.`)
      }
    }
    // Google Sheet — fire after successful DB save
    const itemsSummary = cart.map(i => `${i.name} x${i.qty}`).join(', ')
    if (GOOGLE_SHEET_WEBHOOK) fetch(GOOGLE_SHEET_WEBHOOK, {
      method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ sheet:'DRYNN_Orders', name:form.name, phone:form.phone, address:form.address, pincode:form.pincode, items:itemsSummary, total:grandTotal, payment:paymentStatus, paymentId, placedAt }),
    }).catch(e => console.error('[Cart → Google Sheets]:', e.message))
    return orderIds
  }

  const placeOrder = async () => {
    if (!form.name || !form.phone || !form.address || !form.pincode) {
      alert('Please fill all delivery details.'); return
    }

    const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    if (!RAZORPAY_KEY) {
      // Fallback: no Razorpay key configured — save as Unpaid (manual WhatsApp payment)
      setSaving(true)
      try {
        await saveOrdersToDb(null, 'Unpaid')
        onClear()
        setStep('done')
      } catch(e) {
        alert(`[Checkout Error]\n\n${e.message || 'Unknown error'}\n\nPlease WhatsApp us at +91 99447 61306.`)
      } finally { setSaving(false) }
      return
    }

    // ── Razorpay Checkout ─────────────────────────────────────────
    setSaving(true)
    try {
      // Dynamically load Razorpay script
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://checkout.razorpay.com/v1/checkout.js'
          s.onload = resolve
          s.onerror = () => reject(new Error('Failed to load Razorpay'))
          document.head.appendChild(s)
        })
      }

      const options = {
        key:         RAZORPAY_KEY,
        amount:      grandTotal * 100, // paise
        currency:    'INR',
        name:        'DRYNN',
        description: cart.map(i => `${i.name} x${i.qty}`).join(', '),
        image:       'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/drynn-logo.png',
        prefill: {
          name:    form.name,
          contact: form.phone,
        },
        notes: {
          address: `${form.address}, ${form.pincode}`,
          items:   cart.map(i => `${i.name} x${i.qty}`).join(', '),
        },
        theme: { color: '#c8102e' },
        handler: async (response) => {
          // Payment successful
          try {
            await saveOrdersToDb(response.razorpay_payment_id, 'Paid')
            onClear()
            setStep('done')
          } catch(e) {
            alert(`Payment received but order save failed. Payment ID: ${response.razorpay_payment_id}\nPlease WhatsApp us at +91 99447 61306.`)
          }
          setSaving(false)
        },
        modal: {
          ondismiss: () => {
            setSaving(false)
          },
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        setSaving(false)
        alert(`Payment failed: ${response.error.description}\nPlease try again or WhatsApp us at +91 99447 61306.`)
      })
      rzp.open()
    } catch(e) {
      setSaving(false)
      console.error('[Cart] Razorpay error:', e.message)
      alert(`[Payment Error]\n\n${e.message || 'Unknown error'}\n\nPlease WhatsApp us at +91 99447 61306.`)
    }
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
          {[['Payment','Paid via Razorpay/UPI'],['Delivery','5-7 working days'],['Support','WhatsApp: +91 99447 61306']].map(([k,v])=>(
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#c8102e' }}>UPI / Cards / Net Banking</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Secure checkout powered by Razorpay. Pay instantly online.</div>
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

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return
    const { error } = await supabase.from('drynn_orders').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', orderId).eq('user_id', user.id)
    if (error) { alert('Cancel failed: ' + error.message); return }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o))
    if (selected?.id === orderId) setSelected(prev => ({ ...prev, status: 'Cancelled' }))
  }

  const parseDesignUrls = (df) => {
    if (!df || df === 'catalog-order') return {}
    try { const p = JSON.parse(df); return typeof p === 'object' ? p : { front: df } } catch { return df?.startsWith('http') ? { front: df } : {} }
  }

  useEffect(() => {
    loadOrders()
    if (!user) return
    // Subscribe to real-time updates for this user's orders
    const channel = supabase
      .channel('user-orders-' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drynn_orders',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        if (selected?.id === payload.new.id) setSelected(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const STATUS_COLORS = {
    Received: { bg:'#fff8e1', color:'#f5a623', border:'#ffe082' },
    Approved: { bg:'#e8f0fe', color:'#0a1f5d', border:'#c5d3f6' },
    Printing: { bg:'#f3e5f5', color:'#9b59b6', border:'#e1bee7' },
    Packed:   { bg:'#e8f5e9', color:'#00a86b', border:'#c8e6c9' },
    Shipped:  { bg:'#fce4ec', color:'#c8102e', border:'#f8bbd0' },
    Delivered:{ bg:'#e8f5e9', color:'#00a86b', border:'#c8e6c9' },
    Cancelled:{ bg:'#fce4ec', color:'#c8102e', border:'#f8bbd0' },
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

          {/* Design / product preview */}
          {selected.order_type === 'custom' || (selected.design_file && selected.design_file !== 'catalog-order' && selected.design_file !== '{}')
            ? <div style={{ marginBottom:24 }}><AdminOrderPreview order={selected} /></div>
            : (selected.order_type === 'catalog' || selected.design_file === 'catalog-order')
              ? <div style={{ marginBottom:24 }}><CatalogOrderPreview order={selected} /></div>
              : null
          }

          {/* Order info card */}
          <div style={{ border:'1px solid #f0f0f0', borderRadius:12, padding:'18px', marginBottom:24 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#aaa', marginBottom:14 }}>Order Summary</p>
            {[
              ['Item(s)', selected.garment || '-'],
              ['Size',    selected.size    || '-'],
              ['Qty',     selected.qty     || '-'],
              ['Total',   selected.total   ? `₹${Number(selected.total).toLocaleString()}` : '-'],
              ['Payment', selected.payment_status || 'Pending'],
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

          {/* Cancel order button — only if order is Received/Approved */}
          {['Received','Approved'].includes(selected.status) && (
            <button
              onClick={() => cancelOrder(selected.id)}
              style={{ marginTop:16, width:'100%', padding:'12px', background:'none', border:'1.5px solid #c8102e', color:'#c8102e', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#c8102e';e.currentTarget.style.color='#fff'}}
              onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#c8102e'}}>
              Cancel Order
            </button>
          )}
          {selected.status === 'Cancelled' && (
            <div style={{ marginTop:16, padding:'12px', background:'rgba(200,16,46,.06)', border:'1px solid rgba(200,16,46,.2)', borderRadius:8, textAlign:'center', fontSize:13, color:'#c8102e', fontWeight:700 }}>
              This order has been cancelled.
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Filter logic ──────────────────────────────────────────
  const ACTIVE_S    = ['Received','Approved','Printing','Packed','Shipped']
  const COMPLETED_S = ['Delivered','Cancelled']

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
            { key:'active',    label:'Active',          count: activeCount    },
            { key:'completed', label:'History',          count: completedCount },
            { key:'all',       label:'All Orders',       count: orders.length  },
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
  const { isAdmin: isAdminHook } = useIsAdmin(user)
  const isAdmin = isAdminHook || user?.email === SUPER_ADMIN_EMAIL
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
          { icon:'•', label:'Payments',      sub:'UPI, Razorpay — managed at checkout', page:null, soon:true },
          { icon:'•', label:'Addresses',     sub:'Manage delivery addresses',           page:null, soon:true },
          { icon:'•', label:'Notifications', sub:'Order updates on WhatsApp',           page:null, soon:true },
          { icon:'•',  label:'About DRYNN',  sub:'Our story & how it works',           page:'about'   },
          { icon:'•', label:'Contact Us',    sub:'WhatsApp, email & support',          page:'contact' },
          { icon:'•', label:'Privacy',       sub:'Data & privacy settings',            page:'privacy'  },
        ].map((item,i)=>(
          <div key={i} onClick={()=>{ if(item.page) onNav(item.page) }}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor: item.page ? 'pointer' : 'default', transition:'padding .15s', opacity: item.soon ? 0.6 : 1 }}
            onMouseEnter={e=>{ if(item.page) e.currentTarget.style.paddingLeft='8px' }} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
            <div style={{ width:44, height:44, background:'#f8f8f8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{item.sub}</div>
            </div>
            {item.soon
              ? <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', color:'#aaa', background:'#f0f0f0', padding:'3px 8px', borderRadius:20, textTransform:'uppercase' }}>Soon</span>
              : <span style={{ color:'#ccc', fontSize:18 }}>›</span>}
          </div>
        ))}
        {isAdmin && (
          <div onClick={()=>onNav('admin')}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #f5f5f5', cursor:'pointer', transition:'padding .15s' }}
            onMouseEnter={e=>e.currentTarget.style.paddingLeft='8px'} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
            <div style={{ width:44, height:44, background:'rgba(200,16,46,.08)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>•</div>
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
// ══════════════════════════════════════════════════════════════
// CATALOG ORDER PREVIEW — shows product images for Home & Shop orders
// Swipeable 4-side viewer matching the Studio preview UX
// ══════════════════════════════════════════════════════════════
function CatalogOrderPreview({ order }) {
  const SIDE_LABELS = { front:'Front', back:'Back', left:'Left Side', right:'Right Side' }
  const SIDES = ['front','back','left','right']

  const [imgs, setImgs] = React.useState({
    front: order.product_image || null,
    back:  null,
    left:  null,
    right: null,
  })
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!order.product_id && !order.product_name) { setLoaded(true); return }
    const query = order.product_id
      ? supabase.from('drynn_products').select('img_front,img_back,img_left,img_right,image_url').eq('id', order.product_id).limit(1)
      : supabase.from('drynn_products').select('img_front,img_back,img_left,img_right,image_url').ilike('name', '%' + (order.product_name||'').split(' ').slice(0,3).join(' ') + '%').limit(1)
    query.then(({ data }) => {
      if (data && data[0]) {
        const p = data[0]
        setImgs({
          front: p.img_front || p.image_url || order.product_image || null,
          back:  p.img_back  || p.image_url || order.product_image || null,
          left:  p.img_left  || p.image_url || order.product_image || null,
          right: p.img_right || p.image_url || order.product_image || null,
        })
      }
      setLoaded(true)
    })
  }, [order.product_id, order.product_name])

  const [activeIdx, setActiveIdx] = React.useState(0)
  const dragX = React.useRef(null)
  const onDown = e => { dragX.current = e.touches ? e.touches[0].clientX : e.clientX }
  const onUp   = e => {
    if (dragX.current === null) return
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
    const dx = endX - dragX.current
    if (Math.abs(dx) > 40) setActiveIdx(i => ((i + (dx < 0 ? 1 : -1)) + 4) % 4)
    dragX.current = null
  }

  // Determine which sides have a unique image (not just fallback)
  const hasMultiSide = imgs.back && imgs.back !== imgs.front
  const visibleSides = hasMultiSide ? SIDES : ['front']

  if (!loaded) return (
    <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:13 }}>
      Loading product…
    </div>
  )

  if (!imgs.front) return null

  const activeSide = hasMultiSide ? SIDES[activeIdx] : 'front'

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#00a86b', marginBottom:8 }}>
        🛍️ Product Preview
      </div>

      {/* Main viewer */}
      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#f8f8f8',
        border:'1.5px solid #e8e8e8', maxWidth:320, userSelect:'none', touchAction:'none' }}
        onMouseDown={onDown} onMouseUp={onUp}
        onTouchStart={onDown} onTouchEnd={onUp}>

        {(hasMultiSide ? SIDES : ['front']).map((side, i) => (
          <div key={side} style={{ position: i===0?'relative':'absolute', inset:0,
            opacity: hasMultiSide ? (i===activeIdx ? 1 : 0) : 1,
            transition:'opacity .15s ease', pointerEvents:'none' }}>
            <img
              src={imgs[side] || imgs.front}
              alt={side}
              style={{ width:'100%', display:'block', minHeight:220, objectFit:'contain', background:'#f8f8f8' }}
              onError={e=>{ if(imgs.front) e.target.src = imgs.front }}
            />
          </div>
        ))}

        {/* Side label */}
        {hasMultiSide && (
          <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,.55)', borderRadius:20, padding:'3px 12px',
            fontSize:10, fontWeight:700, color:'#fff', pointerEvents:'none' }}>
            {SIDE_LABELS[activeSide]}
          </div>
        )}

        {/* Colour badge if available */}
        {order.color && order.color !== 'Various' && (
          <div style={{ position:'absolute', top:8, right:8, display:'flex', alignItems:'center', gap:4,
            background:'rgba(255,255,255,.95)', borderRadius:20, padding:'3px 8px', fontSize:9, fontWeight:700, border:'1px solid #e0e0e0' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:order.color, border:'1px solid #ccc' }} />
            {order.color}
          </div>
        )}

        {/* Arrow hints — only if multi-side */}
        {hasMultiSide && [['‹', -1, 8], ['›', 1, 'auto']].map(([arrow, dir, left]) => (
          <button key={arrow} onClick={()=>setActiveIdx(i=>((i+dir)+4)%4)}
            style={{ position:'absolute', top:'50%', left: typeof left==='number'?left:undefined,
              right: left==='auto'?8:undefined, transform:'translateY(-50%)',
              background:'rgba(0,0,0,.35)', border:'none', color:'#fff', fontSize:18,
              width:28, height:28, borderRadius:'50%', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center', fontWeight:700, padding:0 }}>
            {arrow}
          </button>
        ))}
      </div>

      {/* Thumbnail tabs — only if multi-side */}
      {hasMultiSide && (
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          {SIDES.map((side, i) => (
            <button key={side} onClick={()=>setActiveIdx(i)}
              style={{ position:'relative', flex:1, aspectRatio:'1', borderRadius:8, overflow:'hidden',
                border:'2px solid ' + (i===activeIdx ? '#00a86b' : '#e0e0e0'),
                background:'#f8f8f8', padding:0, cursor:'pointer' }}>
              <img src={imgs[side] || imgs.front} alt={side}
                style={{ width:'100%', height:'100%', objectFit:'contain' }}
                onError={e=>{ if(imgs.front) e.target.src=imgs.front }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, textAlign:'center',
                fontSize:8, fontWeight:700,
                color: i===activeIdx ? '#00a86b' : '#888',
                background:'rgba(255,255,255,.88)', padding:'2px 0' }}>
                {SIDE_LABELS[side]}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ORDER PREVIEW — replicates Studio view for both customer + admin
// Shows garment + design composited at exact saved position/scale/rotation/colour
// ══════════════════════════════════════════════════════════════
function AdminOrderPreview({ order, label }) {
  const o = order
  const GARMENT_DEFAULTS = {
    'T-Shirt': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_white.png',
    'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_white.png',
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
    if (!o.garment && !o.product_id) return
    // Prefer exact product_id lookup — avoids wrong image from fuzzy name match
    const query = o.product_id
      ? supabase.from('drynn_products').select('img_front,img_back,img_left,img_right,image_url').eq('id', o.product_id).limit(1)
      : supabase.from('drynn_products').select('img_front,img_back,img_left,img_right,image_url').ilike('name', '%' + (o.garment || '').replace('Custom ','').split(' ').slice(0,3).join(' ') + '%').limit(1)
    query.then(({ data }) => {
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
  }, [o.product_id, o.garment])

  // Parse design_file — JSON {front,back,left,right} with comma-joined multi-design URLs
  // designs[side] = array of URLs
  let designs = { front:[], back:[], left:[], right:[] }
  if (o.design_file) {
    try {
      const parsed = JSON.parse(o.design_file)
      if (typeof parsed === 'object') {
        for (const side of ['front','back','left','right']) {
          const raw = parsed[side]
          if (raw?.startsWith('http')) {
            designs[side] = raw.split(',').map(u=>u.trim()).filter(u=>u.startsWith('http'))
          }
        }
      }
    } catch(e) {
      if (o.design_file.startsWith('http')) {
        designs.front = o.design_file.split(',').map(u=>u.trim()).filter(u=>u.startsWith('http'))
      }
    }
  }

  // Parse saved position data — new format: {side:[{...},{...}]}, old: {side:{...}}
  const DEFAULT_POS = { posX:50, posY:38, scale:38, rotation:0 }
  let sidePos = { front:[DEFAULT_POS], back:[DEFAULT_POS], left:[DEFAULT_POS], right:[DEFAULT_POS] }
  if (o.side_pos) {
    try {
      const p = JSON.parse(o.side_pos)
      if (typeof p === 'object') {
        for (const side of ['front','back','left','right']) {
          if (Array.isArray(p[side])) sidePos[side] = p[side]
          else if (p[side] && typeof p[side]==='object') sidePos[side] = [p[side]]
        }
      }
    } catch(e) {}
  }

  // Text config from order — prefer side_text (all sides), fallback to legacy front-only fields
  const DEFAULT_SIDE_TEXT = { on:false, val:'', font:'Bebas Neue', size:24, color:'#ffffff', posX:50, posY:75, rot:0 }
  let sideText = { front:{...DEFAULT_SIDE_TEXT}, back:{...DEFAULT_SIDE_TEXT}, left:{...DEFAULT_SIDE_TEXT}, right:{...DEFAULT_SIDE_TEXT} }
  if (o.side_text) {
    try { const p = JSON.parse(o.side_text); if (typeof p === 'object') sideText = { ...sideText, ...p } } catch(e) {}
  } else if (o.text_on && o.text_val) {
    sideText.front = { on: o.text_on, val: o.text_val || '', font: o.text_font || 'Bebas Neue', size: o.text_size || 24,
      color: o.text_color || '#ffffff', posX: o.text_pos_x ?? 50, posY: o.text_pos_y ?? 75, rot: o.text_rot ?? 0 }
  }

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

  if (!designs.front?.length && !designs.back?.length && !designs.left?.length && !designs.right?.length) return null

  const activeSide = SIDES[activeIdx]
  const color = o.color || '#ffffff'

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#c8102e', marginBottom:8 }}>
        🎨 {label || 'Your Design Preview'}
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
            {designs[side]?.length > 0 && designs[side].map((dUrl, di) => {
              const p = sidePos[side]?.[di] || DEFAULT_POS
              return (
                <img key={di} src={dUrl} alt={'design-'+di}
                  style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                    transform:`translate(-50%,-50%) rotate(${p.rotation||0}deg)`,
                    width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }}
                  onError={e=>e.target.style.display='none'} />
              )
            })}
            {/* Text overlay — per side */}
            {sideText[side]?.on && sideText[side]?.val && (
              <div style={{ position:'absolute', top:`${sideText[side].posY}%`, left:`${sideText[side].posX}%`,
                transform:`translate(-50%,-50%) rotate(${sideText[side].rot}deg)`,
                fontFamily: sideText[side].font, fontSize: sideText[side].size, color: sideText[side].color, fontWeight:700,
                textShadow:'0 1px 6px rgba(0,0,0,.5)', pointerEvents:'none', whiteSpace:'nowrap' }}>
                {sideText[side].val}
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
            {designs[side]?.length > 0 && designs[side].map((dUrl, di) => {
              const p = sidePos[side]?.[di] || DEFAULT_POS
              return (
                <img key={di} src={dUrl} alt={'d'+di}
                  style={{ position:'absolute', top:`${p.posY}%`, left:`${p.posX}%`,
                    transform:`translate(-50%,-50%) rotate(${p.rotation||0}deg)`,
                    width:`${p.scale}%`, objectFit:'contain', pointerEvents:'none' }}
                  onError={e=>e.target.style.display='none'} />
              )
            })}
            {sideText[side]?.on && sideText[side]?.val && (
              <div style={{ position:'absolute', top:`${sideText[side].posY}%`, left:`${sideText[side].posX}%`,
                transform:`translate(-50%,-50%) rotate(${sideText[side].rot}deg)`,
                fontFamily:sideText[side].font, fontSize: Math.max(6, sideText[side].size * 0.25), color:sideText[side].color,
                fontWeight:700, pointerEvents:'none', whiteSpace:'nowrap' }}>
                {sideText[side].val}
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

    </div>
  )
}
// ══════════════════════════════════════════════════════════════
// ADMIN PANEL  -  restricted to ADMIN_EMAIL only
// ══════════════════════════════════════════════════════════════
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const SUPER_ADMIN_EMAIL = 'gokulmaniraj2008@gmail.com'

function useIsAdmin(user) {
  const isSuperAdminEmail = user?.email === SUPER_ADMIN_EMAIL
  const [isAdmin,      setIsAdmin]      = React.useState(isSuperAdminEmail)
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(isSuperAdminEmail)
  React.useEffect(() => {
    if (!user?.email) { setIsAdmin(false); setIsSuperAdmin(false); return }
    if (user.email === SUPER_ADMIN_EMAIL) { setIsAdmin(true); setIsSuperAdmin(true); return }
    supabase.from('drynn_admins').select('role').eq('email', user.email).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // RLS blocking — check via drynn_settings fallback
          supabase.from('drynn_settings').select('value').eq('key', 'admin_' + user.email).maybeSingle()
            .then(({ data: d2 }) => {
              if (d2?.value) { setIsAdmin(true); setIsSuperAdmin(d2.value === 'superadmin') }
            })
          return
        }
        setIsAdmin(!!data)
        setIsSuperAdmin(data?.role === 'superadmin')
      })
  }, [user?.email])
  return { isAdmin, isSuperAdmin }
}

// ══════════════════════════════════════════════════════════════
// MOCKUP UPLOADER — admin uploads garment views directly to Cloudinary
// ══════════════════════════════════════════════════════════════
const MOCKUP_SLOTS = {
  'T-Shirt':  ['front','back','left','right'],
  'Hoodie':   ['front','back','left','right'],
  'Polo':     ['front','back','left','right'],
}
const MOCKUP_KEY = (garment, view) => `mockup_${garment.toLowerCase().replace(' ','-')}_${view}`
const MOCKUP_LABELS = { front:'▲ Front', back:'▼ Back', left:'◀ Left', right:'▶ Right' }

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
      const { error: insertErr } = await supabase.from('drynn_settings').upsert({ key, value: url }, { onConflict: 'key' })
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
                        <span style={{ fontSize:11, color:'#888' }}>. Uploading…</span>
                      ) : done ? (
                        <span style={{ fontSize:11, color:'#00a86b', fontWeight:700 }}>. Saved!</span>
                      ) : (
                        <span style={{ fontSize:11, color:'#c8102e', fontWeight:700 }}>{url ? '. Replace' : '. Upload'}</span>
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

function StorageWidget({ supabase, showToast }) {
  const [tableData,       setTableData]       = React.useState([])
  const [loading,         setLoading]         = React.useState(false)
  const [cleaning,        setCleaning]        = React.useState(false)
  const [totalDbBytes,    setTotalDbBytes]    = React.useState(null)  // Supabase DB
  const [fileBytes,       setFileBytes]       = React.useState(null)  // Supabase Storage
  const [cloudinaryBytes, setCloudinaryBytes] = React.useState(null)  // Cloudinary storage
  const [cloudinaryBw,    setCloudinaryBw]    = React.useState(null)  // Cloudinary bandwidth this month
  const [cloudinaryCount, setCloudinaryCount] = React.useState(null)  // Cloudinary total assets

  // Free-tier limits
  const DB_LIMIT_BYTES        = 500  * 1024 * 1024        // 500 MB  — Supabase DB
  const FILE_LIMIT_BYTES      = 1024 * 1024 * 1024        // 1 GB    — Supabase Storage
  const CLOUDINARY_STORAGE_GB = 25                         // 25 GB   — Cloudinary free tier
  const CLOUDINARY_BW_GB      = 25                         // 25 GB/mo — Cloudinary bandwidth
  const CLOUDINARY_STORAGE_B  = CLOUDINARY_STORAGE_GB * 1024 * 1024 * 1024
  const CLOUDINARY_BW_B       = CLOUDINARY_BW_GB      * 1024 * 1024 * 1024

  const fmtBytes = (b) => {
    if (b == null) return '—'
    if (b >= 1024*1024*1024) return (b/(1024*1024*1024)).toFixed(2)+' GB'
    if (b >= 1024*1024)      return (b/(1024*1024)).toFixed(2)+' MB'
    if (b >= 1024)           return (b/1024).toFixed(1)+' KB'
    return b+' B'
  }
  const pct      = (used, limit) => Math.min(100, ((used||0)/limit)*100)
  const barColor = (p) => p > 85 ? '#c8102e' : p > 60 ? '#f5a623' : '#00a86b'

  // ── Load Supabase Storage bucket usage ──────────────────────
  // Fix: recurse into folders properly; item.id present = file, absent = folder
  const loadCloudinaryUsage = async () => {
    try {
      const res = await fetch('/api/cloudinary-usage')
      if (res.status === 404) return
      if (!res.ok) throw new Error('cloudinary-usage error')
      const data = await res.json()
      setCloudinaryBytes(data?.storage_bytes  ?? null)
      setCloudinaryBw(data?.bandwidth_bytes   ?? null)
      setCloudinaryCount(data?.resources      ?? null)
    } catch(e) {}
  }

  const loadStorage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supabase-storage')
      if (res.ok) {
        const data = await res.json()
        setTotalDbBytes(data.db_bytes   ?? 0)
        setFileBytes(data.file_bytes    ?? 0)
        setTableData(data.tables        ?? [])
      } else {
        setTotalDbBytes(0); setFileBytes(0); setTableData([])
      }
    } catch(e) {
      setTotalDbBytes(0); setFileBytes(0); setTableData([])
    }
    await loadCloudinaryUsage()
    setLoading(false)
  }

  const cleanSessions = async () => {
    if (!window.confirm('Delete duplicate sessions, keeping only the latest per user?')) return
    setCleaning(true)
    const { error } = await supabase.rpc('cleanup_duplicate_sessions').catch(() => ({ error: true }))
    if (error) {
      const { data: sessions } = await supabase.from('drynn_user_sessions').select('id, user_email, created_at').order('created_at', { ascending: false })
      if (sessions) {
        const seen = new Set(), toDelete = []
        sessions.forEach(s => { if (seen.has(s.user_email)) toDelete.push(s.id); else seen.add(s.user_email) })
        if (toDelete.length > 0) {
          await supabase.from('drynn_user_sessions').delete().in('id', toDelete)
          showToast('Cleaned ' + toDelete.length + ' duplicate sessions ✓')
        } else { showToast('No duplicates found') }
      }
    } else { showToast('Sessions cleaned ✓') }
    setCleaning(false)
    loadStorage()
  }

  const tableColors = ['#c8102e','#0a1f5d','#00a86b','#f5a623','#0a7abf','#9b59b6','#e67e22','#1abc9c']
  const hasLoaded   = totalDbBytes !== null || fileBytes !== null || cloudinaryBytes !== null

  // ── Combined total usage across all services ─────────────────
  const totalUsedBytes  = (totalDbBytes||0) + (fileBytes||0) + (cloudinaryBytes||0)
  const totalLimitBytes = DB_LIMIT_BYTES + FILE_LIMIT_BYTES + CLOUDINARY_STORAGE_B
  const totalPct        = pct(totalUsedBytes, totalLimitBytes)
  const totalColor      = barColor(totalPct)

  // ── Usage bar sub-component ──────────────────────────────────
  const UsageBar = ({ label, icon, usedBytes, limitBytes, limitLabel, note }) => {
    const p      = pct(usedBytes, limitBytes)
    const color  = barColor(p)
    const loaded = usedBytes != null
    return (
      <div style={{ background:'#f8f8f8', borderRadius:8, padding:'12px 14px', marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#555' }}>{icon} {label}</span>
          <span style={{ fontSize:12, fontWeight:800, color: loaded ? color : '#aaa', fontVariantNumeric:'tabular-nums' }}>
            {loaded ? fmtBytes(usedBytes) : '—'} <span style={{ color:'#bbb', fontWeight:400 }}>/</span> {limitLabel}
          </span>
        </div>
        <div style={{ height:10, background:'#e0e0e0', borderRadius:5, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:5, transition:'width .7s ease',
            width: loaded ? `${p}%` : '0%',
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            minWidth: loaded && p > 0 ? 4 : 0,
          }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontSize:9, color:'#aaa' }}>{loaded ? `${p.toFixed(2)}% used` : 'Click Load to refresh'}{note ? ` · ${note}` : ''}</span>
          <span style={{ fontSize:9, fontWeight:700, color: loaded ? color : '#aaa' }}>
            {loaded ? (p > 85 ? '⚠ Near limit' : p > 60 ? '• Moderate' : '✓ Safe') : ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'16px', marginTop:16 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888' }}>📊 App Storage & Usage</p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={loadStorage} disabled={loading}
            style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:4, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', opacity:loading?0.6:1 }}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Load button (shown before first load) ── */}
      {!hasLoaded && !loading && (
        <div style={{ textAlign:'center', padding:'14px 0 10px' }}>
          <button onClick={loadStorage}
            style={{ fontSize:12, padding:'10px 24px', background:'#0a1f5d', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700 }}>
            Load Storage Info
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:'18px 0 10px', color:'#aaa', fontSize:13 }}>
          <div style={{ width:24, height:24, border:'3px solid #f0f0f0', borderTopColor:'#c8102e', borderRadius:'50%', animation:'drynn-spin .7s linear infinite', margin:'0 auto 8px' }} />
          Loading…
        </div>
      )}

      {/* ── Usage bars (shown after first load) ── */}
      {hasLoaded && !loading && (
        <>
          {/* ── SECTION: Supabase ── */}
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'#aaa', marginBottom:8 }}>Supabase (Free Tier)</p>
          <UsageBar icon="🗄️" label="Database (PostgreSQL)" usedBytes={totalDbBytes} limitBytes={DB_LIMIT_BYTES}   limitLabel="500 MB" />
          <UsageBar icon="🪣" label="File Storage (Buckets)" usedBytes={fileBytes}    limitBytes={FILE_LIMIT_BYTES} limitLabel="1 GB"   />

          {/* ── SECTION: Cloudinary ── */}
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'#aaa', marginBottom:8, marginTop:14 }}>Cloudinary (Free Tier)</p>
          <UsageBar
            icon="🖼️" label="Media Storage"
            usedBytes={cloudinaryBytes} limitBytes={CLOUDINARY_STORAGE_B}
            limitLabel={`${CLOUDINARY_STORAGE_GB} GB`}
            note={cloudinaryCount != null ? `${cloudinaryCount} assets` : 'API secret required for live data'}
          />
          <UsageBar
            icon="📡" label="Bandwidth (this month)"
            usedBytes={cloudinaryBw} limitBytes={CLOUDINARY_BW_B}
            limitLabel={`${CLOUDINARY_BW_GB} GB/mo`}
          />

          {/* ── SECTION: Combined total ── */}
          <div style={{ marginTop:14, background: totalPct > 85 ? 'rgba(200,16,46,.05)' : totalPct > 60 ? 'rgba(245,166,35,.05)' : 'rgba(0,168,107,.05)',
            border:`1px solid ${totalColor}33`, borderRadius:8, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#555' }}>⚡ Total App Usage (All Services)</span>
              <span style={{ fontSize:12, fontWeight:800, color:totalColor, fontVariantNumeric:'tabular-nums' }}>
                {fmtBytes(totalUsedBytes)} <span style={{ color:'#bbb', fontWeight:400 }}>/</span> {fmtBytes(totalLimitBytes)}
              </span>
            </div>
            <div style={{ height:12, background:'#e0e0e0', borderRadius:6, overflow:'hidden' }}>
              {/* Stacked bar: DB + FileStorage + Cloudinary */}
              <div style={{ display:'flex', height:'100%', borderRadius:6, overflow:'hidden' }}>
                <div style={{ width:`${pct(totalDbBytes||0, totalLimitBytes)}%`, background:'#0a1f5d', transition:'width .7s ease', minWidth: (totalDbBytes||0) > 0 ? 3 : 0 }} />
                <div style={{ width:`${pct(fileBytes||0, totalLimitBytes)}%`, background:'#00a86b', transition:'width .7s ease', minWidth: (fileBytes||0) > 0 ? 3 : 0 }} />
                <div style={{ width:`${pct(cloudinaryBytes||0, totalLimitBytes)}%`, background:'#f5a623', transition:'width .7s ease', minWidth: (cloudinaryBytes||0) > 0 ? 3 : 0 }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
              {[['🗄️ DB','#0a1f5d',fmtBytes(totalDbBytes)],['🪣 Files','#00a86b',fmtBytes(fileBytes)],['🖼️ Cloudinary','#f5a623',fmtBytes(cloudinaryBytes)]].map(([l,c,v])=>(
                <span key={l} style={{ fontSize:9, color:'#888', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:c, flexShrink:0, display:'inline-block' }} />
                  {l}: <strong style={{ color:'#555' }}>{v}</strong>
                </span>
              ))}
              <span style={{ fontSize:9, fontWeight:700, color:totalColor, marginLeft:'auto' }}>
                {totalPct.toFixed(2)}% used
              </span>
            </div>
          </div>

          {/* ── Table breakdown ── */}
          {tableData.length > 0 && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#aaa', marginBottom:8 }}>DB Table Breakdown</p>
              {tableData.map((t, i) => (
                <div key={t.table_name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                  <span style={{ fontSize:10, fontWeight:700, minWidth:160, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.table_name.replace('drynn_','')}
                  </span>
                  <div style={{ flex:1, height:6, background:'#f0f0f0', borderRadius:3 }}>
                    <div style={{ height:'100%', borderRadius:3, minWidth:3,
                      width: t.size_bytes && totalDbBytes ? `${Math.min(100,(t.size_bytes/totalDbBytes)*100)}%` : '3%',
                      background: tableColors[i % tableColors.length] }} />
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, minWidth:44, textAlign:'right', color:'#888' }}>{t.size_pretty||'—'}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f0f0f0', fontSize:9, color:'#bbb', lineHeight:1.7 }}>
            Supabase Free: DB 500 MB · Storage 1 GB &nbsp;|&nbsp; Cloudinary Free: Storage 25 GB · BW 25 GB/mo
            {cloudinaryBytes === null && <span style={{ color:'#f5a623' }}> · Cloudinary: create <code style={{fontSize:9}}>/api/cloudinary-usage/route.js</code> to show live data</span>}
          </div>
        </>
      )}
    </div>
  )
}

function AdminPanel({ onBack }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [checking,    setChecking]    = useState(true)
  const [tab, setTab]                 = useState('orders')

  // Orders
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [editOrder, setEditOrder] = useState(null)

  // Products
  const [products,       setProducts]       = useState(PRODUCTS.map(p=>({...p})))
  const [editProd,       setEditProd]       = useState(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct,     setNewProduct]     = useState({ name:'', price:'', mrp:'', tag:'', category:'T-Shirts', emoji:'.', rating:'4.5', reviews:'0', studio_only:false, home_and_shop_only:false, image_url:'', img_front:'', img_back:'', img_left:'', img_right:'' })
  const [addingProduct,  setAddingProduct]  = useState(false)
  const [prodImgFile,    setProdImgFile]    = useState(null)
  const [prodImgUploading, setProdImgUploading] = useState(false)

  // Samples
  const [samples,        setSamples]        = useState([])
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [sampleForm,     setSampleForm]     = useState({ category:'' })
  const [sampleFiles,    setSampleFiles]    = useState([])   // multi-file array
  const [samplePct,      setSamplePct]      = useState(0)
  const [sampleSaving,   setSampleSaving]   = useState(false)
  const [sampleCategories, setSampleCategories] = useState([])
  const [newCatInput,    setNewCatInput]    = useState('')
  const [catSaving,      setCatSaving]      = useState(false)

  // Load saved sample categories
  React.useEffect(() => {
    supabase.from('drynn_settings').select('value').eq('key','sample_categories').single()
      .then(({ data }) => {
        if (data?.value) try { setSampleCategories(JSON.parse(data.value)) } catch {}
      })
  }, [])

  const persistCategories = async (cats) => {
    setCatSaving(true)
    await supabase.from('drynn_settings').upsert({ key:'sample_categories', value:JSON.stringify(cats) }, { onConflict:'key' })
    setCatSaving(false)
  }
  const addSampleCategory = () => {
    const v = newCatInput.trim()
    if (!v || sampleCategories.includes(v)) return
    const updated = [...sampleCategories, v]
    setSampleCategories(updated); setNewCatInput(''); persistCategories(updated); showToast('Category added ✓')
  }
  const removeSampleCategory = (cat) => {
    const updated = sampleCategories.filter(c => c !== cat)
    setSampleCategories(updated); persistCategories(updated)
  }

  // Group orders
  const [groupOrders,        setGroupOrders]        = useState([])
  const [groupOrdersLoading, setGroupOrdersLoading] = useState(false)
  const [expandedGroup,      setExpandedGroup]      = useState(null)
  const [groupMembers,       setGroupMembers]       = useState({})

  // Visitors
  const [visitors,        setVisitors]        = useState([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorSearch,   setVisitorSearch]   = useState('')

  // Users
  const [allUsers,     setAllUsers]     = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Media
  const [mediaUrls,   setMediaUrls]   = useState({ video_intro:'', video_studio:'', video_home:'', audio_song:'' })
  const [mediaSaving, setMediaSaving] = useState(false)

  // Colors
  const [adminColors,  setAdminColors]  = useState([...DEFAULT_SWATCHES])
  const [newColor,     setNewColor]     = useState('#000000')
  const [colorsSaving, setColorsSaving] = useState(false)

  // Admins
  const [adminsList,    setAdminsList]    = useState([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminSaving,   setAdminSaving]   = useState(false)

  const [toast, setToast] = useState('')
  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 2800) }

  // ── Auth check ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      setCurrentUser(session?.user || null)
      setChecking(false)
      if (session?.user) { loadOrders(); loadMediaUrls() }
    })
  }, [])

  const { isAdmin, isSuperAdmin } = useIsAdmin(currentUser)

  // ── Data loaders ────────────────────────────────────────
  const loadOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('drynn_orders').select('*').order('placed_at', { ascending:false }).limit(200)
    if (error) showToast('Orders load failed: ' + error.message)
    else setOrders(data || [])
    setLoading(false)
  }

  const loadProducts = async () => {
    const { data, error } = await supabase.from('drynn_products').select('*').order('id')
    if (!error && data && data.length > 0) setProducts(data)
    else if (error) showToast('Products load failed: ' + error.message)
  }

  const loadSamples = async () => {
    setSamplesLoading(true)
    const { data, error } = await supabase.from('drynn_samples').select('*').order('created_at', { ascending:false })
    if (error) showToast('Samples load failed: ' + error.message)
    else setSamples(data || [])
    setSamplesLoading(false)
  }

  const loadGroupOrders = async () => {
    setGroupOrdersLoading(true)
    const { data, error } = await supabase.from('drynn_group_orders').select('*').order('created_at', { ascending:false })
    if (error) showToast('Group orders load failed: ' + error.message)
    else setGroupOrders(data || [])
    setGroupOrdersLoading(false)
  }

  const loadVisitors = async () => {
    setVisitorsLoading(true)
    const { data, error } = await supabase.from('drynn_user_sessions').select('*').order('started_at', { ascending:false }).limit(300)
    if (error) showToast('Visitors load failed: ' + error.message)
    else setVisitors(data || [])
    setVisitorsLoading(false)
  }

  const loadAllUsers = async () => {
    setUsersLoading(true)
    const byUser = {}
    const { data: ordersData } = await supabase.from('drynn_orders').select('*').order('placed_at', { ascending:false })
    if (ordersData) {
      ordersData.forEach(o => {
        const key = o.user_id || o.phone || o.name || 'unknown'
        if (!byUser[key]) byUser[key] = { user_id:o.user_id, email:null, name:o.name, phone:o.phone, address:o.address, orders:[], uploads:[], sessions:[], source:'order' }
        byUser[key].orders.push(o)
        if (o.design_file && o.design_file !== 'catalog-order' && o.design_file !== '{}') {
          try {
            const parsed = JSON.parse(o.design_file)
            if (typeof parsed === 'object') Object.values(parsed).forEach(url => { if (url && url.startsWith('https://') && !byUser[key].uploads.includes(url)) byUser[key].uploads.push(url) })
            else if (typeof parsed === 'string' && parsed.startsWith('https://')) byUser[key].uploads.push(parsed)
          } catch { if (o.design_file.startsWith('https://')) byUser[key].uploads.push(o.design_file) }
        }
      })
    }
    const { data: sessData } = await supabase.from('drynn_user_sessions').select('*').order('started_at', { ascending:false }).limit(300)
    if (sessData) {
      sessData.forEach(s => {
        const key = s.user_id || s.user_email || s.session_id
        if (!key) return
        if (!byUser[key]) byUser[key] = { user_id:s.user_id, email:s.user_email, name:s.user_name||s.user_email||'Visitor', phone:null, address:null, orders:[], uploads:[], sessions:[], source:'visitor' }
        if (s.user_email && !byUser[key].email) byUser[key].email = s.user_email
        if (s.user_name  && !byUser[key].name)  byUser[key].name  = s.user_name
        byUser[key].sessions.push(s)
      })
    }
    setAllUsers(Object.values(byUser).sort((a,b) => b.orders.length - a.orders.length || b.sessions.length - a.sessions.length))
    setUsersLoading(false)
  }

  const loadMediaUrls = async () => {
    const { data, error } = await supabase.from('drynn_settings').select('key,value').in('key',['video_intro','video_studio','video_home','audio_song'])
    if (error) { showToast('Media load failed: ' + error.message); return }
    if (data && data.length > 0) {
      const m = { video_intro:'', video_studio:'', video_home:'', audio_song:'' }
      data.forEach(r => { if (r.value) m[r.key] = r.value })
      setMediaUrls(m)
    }
  }

  const loadAdminColors = async () => {
    const { data, error } = await supabase.from('drynn_settings').select('value').eq('key','swatches').single()
    if (error && error.code !== 'PGRST116') showToast('Colors load failed: ' + error.message)
    if (data?.value) { try { const p = JSON.parse(data.value); if (Array.isArray(p)) setAdminColors(p) } catch {} }
    else setAdminColors([...DEFAULT_SWATCHES])
  }

  const loadAdmins = async () => {
    setAdminsLoading(true)
    const { data, error } = await supabase.from('drynn_admins').select('*').order('created_at', { ascending:true })
    if (error) showToast('Admins load failed: ' + error.message)
    else setAdminsList(data || [])
    setAdminsLoading(false)
  }

  const loadGroupMembers = async (group_code) => {
    if (groupMembers[group_code]) { setExpandedGroup(expandedGroup===group_code?null:group_code); return }
    const { data, error } = await supabase.from('drynn_group_members').select('*').eq('group_code', group_code).order('joined_at', { ascending:true })
    if (!error && data) setGroupMembers(m => ({ ...m, [group_code]: data }))
    setExpandedGroup(expandedGroup===group_code ? null : group_code)
  }

  // ── Orders actions ───────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('drynn_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('Update failed: ' + error.message); return }
    setOrders(o => o.map(x => x.id===id ? {...x, status} : x))
    showToast('Status → ' + status)
    setEditOrder(null)
  }

  const togglePaymentStatus = async (id, current) => {
    const next = current === 'Paid' ? 'Unpaid' : 'Paid'
    const { error } = await supabase.from('drynn_orders').update({ payment_status:next, updated_at:new Date().toISOString() }).eq('id', id)
    if (error) { showToast('Update failed: ' + error.message); return }
    setOrders(o => o.map(x => x.id===id ? {...x, payment_status:next} : x))
    showToast('Marked as ' + next)
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order permanently?')) return
    const { error } = await supabase.from('drynn_orders').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    setOrders(o => o.filter(x => x.id !== id))
    showToast('Order deleted')
  }

  // ── Products actions ─────────────────────────────────────
  const saveProduct = async (p) => {
    const { error } = await supabase.from('drynn_products').upsert({
      id:p.id, name:p.name, price:Number(p.price), mrp:Number(p.mrp),
      tag:p.tag, tag_color:p.tagColor||p.tag_color, category:p.category,
      emoji:p.emoji, rating:Number(p.rating), reviews:Number(p.reviews),
      image_url:p.image_url||null, studio_only:p.studio_only||false,
      home_and_shop_only:p.home_and_shop_only||false,
      img_front:p.img_front||null, img_back:p.img_back||null,
      img_left:p.img_left||null, img_right:p.img_right||null,
    }, { onConflict:'id' })
    if (error) { showToast('Save failed: ' + error.message); return }
    setProducts(ps => ps.map(x => x.id===p.id ? p : x))
    setEditProd(null)
    showToast('Product saved ✓')
  }

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.mrp) { showToast('Name, Price and MRP required'); return }
    setAddingProduct(true)
    let imageUrl = newProduct.image_url || null
    if (prodImgFile) {
      try { imageUrl = await uploadToCloudinary(prodImgFile, ()=>{}) }
      catch(e) { showToast('Image upload failed: ' + e.message); setAddingProduct(false); return }
    }
    const newId = products.length > 0 ? Math.max(...products.map(p=>Number(p.id)||0)) + 1 : 1
    const product = {
      id:newId, name:newProduct.name, price:Number(newProduct.price), mrp:Number(newProduct.mrp),
      tag:newProduct.tag||'New', tag_color:'#0a1f5d', category:newProduct.category,
      emoji:newProduct.emoji, rating:Number(newProduct.rating)||4.5,
      reviews:Number(newProduct.reviews)||0, image_url:imageUrl,
      img_front:newProduct.img_front||imageUrl||null, img_back:newProduct.img_back||null,
      img_left:newProduct.img_left||null, img_right:newProduct.img_right||null,
      studio_only:newProduct.studio_only||false,
      home_and_shop_only:newProduct.home_and_shop_only||false,
    }
    const { error } = await supabase.from('drynn_products').insert(product)
    if (error) { showToast('Add failed: ' + error.message); setAddingProduct(false); return }
    setProducts(ps => [...ps, product])
    setNewProduct({ name:'', price:'', mrp:'', tag:'', category:'T-Shirts', emoji:'.', rating:'4.5', reviews:'0', studio_only:false, home_and_shop_only:false })
    setProdImgFile(null)
    setShowAddProduct(false)
    setAddingProduct(false)
    showToast('Product added ✓')
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('drynn_products').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    setProducts(ps => ps.filter(p => p.id !== id))
    showToast('Product deleted')
  }

  // ── Samples actions ──────────────────────────────────────
  const saveSample = async () => {
    if (!sampleFiles.length) { showToast('Please select at least one image'); return }
    setSampleSaving(true)
    let saved = 0
    for (let i = 0; i < sampleFiles.length; i++) {
      const f = sampleFiles[i]
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      try {
        setSamplePct(Math.round((i / sampleFiles.length) * 100))
        const imageUrl = await uploadToCloudinary(f, () => {})
        const { error } = await supabase.from('drynn_samples').insert({
          name,
          category: sampleForm.category || null,
          image_url: imageUrl,
        })
        if (error) { showToast('Save failed: ' + error.message) } else { saved++ }
      } catch(e) { showToast('Upload failed: ' + f.name) }
    }
    setSamplePct(100)
    showToast(`${saved} sample${saved !== 1 ? 's' : ''} added ✓`)
    setSampleForm({ category:'' }); setSampleFiles([]); setSamplePct(0)
    loadSamples()
    setSampleSaving(false)
  }

  const deleteSample = async (id) => {
    if (!confirm('Delete this sample?')) return
    const { error } = await supabase.from('drynn_samples').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    setSamples(s => s.filter(x => x.id !== id))
    showToast('Sample deleted')
  }

  // ── Media actions ────────────────────────────────────────
  const saveMediaUrl = async (key, value) => {
    setMediaSaving(true)
    let url = value?.trim() || ''
    const { error } = url
      ? await supabase.from('drynn_settings').upsert({ key, value:url }, { onConflict:'key' })
      : await supabase.from('drynn_settings').delete().eq('key', key)
    setMediaSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }
    showToast(key + ' saved!')
  }

  const handleMediaFileUpload = async (key, file) => {
    if (!file) return
    setMediaSaving(true)
    try {
      const url = await uploadToCloudinary(file, ()=>{})
      setMediaUrls(m => ({ ...m, [key]: url }))
      const { error } = await supabase.from('drynn_settings').upsert({ key, value:url }, { onConflict:'key' })
      if (error) { showToast('Save failed: ' + error.message) }
      else showToast(key + ' uploaded & saved!')
    } catch(e) { showToast('Upload failed: ' + e.message) }
    setMediaSaving(false)
  }

  // ── Colors actions ───────────────────────────────────────
  const saveAdminColors = async (colors) => {
    setColorsSaving(true)
    const { error } = await supabase.from('drynn_settings').upsert({ key:'swatches', value:JSON.stringify(colors) }, { onConflict:'key' })
    setColorsSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }
    setAdminColors(colors)
    showToast('Colors saved ✓')
  }

  // ── Admins actions ───────────────────────────────────────
  const addAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { showToast('Enter a valid email'); return }
    const canManage = isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL
    if (!canManage) { showToast('Only super admin can add admins'); return }
    setAdminSaving(true)
    const { error } = await supabase.from('drynn_admins').insert({ email, role:'admin', added_by:currentUser.email })
    if (error) showToast(error.message.includes('unique') ? 'Already an admin' : 'Failed: ' + error.message)
    else { showToast('Admin added ✓'); setNewAdminEmail(''); loadAdmins() }
    setAdminSaving(false)
  }

  const removeAdmin = async (email) => {
    if (email === SUPER_ADMIN_EMAIL) { showToast('Cannot remove super admin'); return }
    const canManage = isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL
    if (!canManage) { showToast('Only super admin can remove admins'); return }
    if (!confirm('Remove ' + email + ' as admin?')) return
    const { error } = await supabase.from('drynn_admins').delete().eq('email', email)
    if (error) showToast('Failed: ' + error.message)
    else { showToast('Admin removed'); loadAdmins() }
  }

  // ── Group orders actions ─────────────────────────────────
  const deleteGroupOrder = async (id, group_code) => {
    if (!confirm('Delete this group order and all members?')) return
    await supabase.from('drynn_group_members').delete().eq('group_code', group_code)
    const { error } = await supabase.from('drynn_group_orders').delete().eq('id', id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    setGroupOrders(g => g.filter(x => x.id !== id))
    showToast('Group order deleted')
  }

  const ORDER_STATUSES = ['Received','Approved','Printing','Packed','Shipped','Delivered','Cancelled']
  const STATUS_COLORS  = { Received:'#f5a623', Approved:'#0a1f5d', Printing:'#9b59b6', Packed:'#00a86b', Shipped:'#0a7abf', Delivered:'#00a86b', Cancelled:'#c8102e' }

  // ── Guard ────────────────────────────────────────────────
  if (checking) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'.18em', color:'#444' }}>DRYNN</div>
    </div>
  )

  if (!isAdmin && currentUser?.email !== SUPER_ADMIN_EMAIL) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:12, padding:'40px 32px', width:'100%', maxWidth:380, textAlign:'center' }}>
        <div style={{ marginBottom:16, color:'#555' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'.18em', color:'#fff', marginBottom:8 }}>ACCESS DENIED</div>
        <p style={{ fontSize:13, color:'#555', lineHeight:1.7, marginBottom:24 }}>
          Restricted to authorised accounts only.
          {currentUser && <><br/><span style={{ color:'#c8102e', marginTop:6, display:'block' }}>{currentUser.email}</span></>}
        </p>
        <button onClick={onBack} className="btn-primary" style={{ width:'100%', padding:13 }}>← Back to Site</button>
      </div>
    </div>
  )

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f4f4f4' }}>
      {/* Header */}
      <div style={{ background:'#0a0a0a', padding:'0 12px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, letterSpacing:'.18em', color:'#fff' }}>DRYNN ADMIN</span>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#00a86b', boxShadow:'0 0 6px #00a86b' }} />
            {(isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL) && <span style={{ fontSize:10, color:'#c8102e', fontWeight:700, border:'1px solid #c8102e', borderRadius:3, padding:'1px 5px' }}>SUPER</span>}
          </div>
          <button onClick={onBack} style={{ padding:'7px 18px', borderRadius:6, border:'1.5px solid #c8102e', cursor:'pointer', background:'#c8102e', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>Exit
          </button>
        </div>
        {/* Tab bar */}
        <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
          {[
            ['orders',     'Orders'],
            ['products',   '🎨 Products & Colors'],
            ['samples',    'Samples'],
            ['grouporders','👥 Groups'],
            ...((isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL) ? [
              ['analytics',  '📊 Analytics'],
              ['people',     '👥 People'],
              ['media',      '🎬 Media'],
              ['admins',     '🔑 Admins'],
            ] : [
              ['media',      '🎬 Media'],
            ]),
          ].map(([key, label]) => (
            <button key={key} onClick={()=>{
              setTab(key)
              if(key==='orders')      loadOrders()
              if(key==='products')    { loadProducts(); loadAdminColors() }
              if(key==='samples')     loadSamples()
              if(key==='grouporders') loadGroupOrders()
              if(key==='analytics')   loadOrders()
              if(key==='people')      { loadVisitors(); loadAllUsers() }
              if(key==='media')       loadMediaUrls()
              if(key==='admins')      loadAdmins()
            }} style={{ flexShrink:0, padding:'6px 14px', borderRadius:4, border:'none', cursor:'pointer',
              background:tab===key?'#c8102e':'#222', color:'#fff', fontSize:12, fontWeight:700 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 16px 80px' }}>

        {/* ══ ORDERS TAB ══ */}
        {tab==='orders' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Orders ({orders.length})</h2>
              <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={loadOrders}>↻ Refresh</button>
            </div>
            {loading ? <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading…</div>
            : orders.length === 0 ? <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>No orders yet.</div>
            : orders.map(o => {
              const isCustom = o.order_type === 'custom' || (o.design_file && o.design_file !== 'catalog-order' && o.design_file !== '{}')
              const parseDesigns = (df) => {
                if (!df || df === 'catalog-order' || df === '{}') return {}
                try {
                  const p = JSON.parse(df)
                  if (typeof p !== 'object') return df.startsWith('https://') ? { front:[df] } : {}
                  const cleaned = {}
                  Object.entries(p).forEach(([k,v]) => {
                    if (v && typeof v==='string' && v.startsWith('https://')) {
                      cleaned[k] = v.split(',').map(u=>u.trim()).filter(u=>u.startsWith('https://'))
                    }
                  })
                  return cleaned
                } catch { return df.startsWith('https://') ? { front:[df] } : {} }
              }
              const parsedDesigns = parseDesigns(o.design_file)
              const designSides   = ['front','back','left','right'].filter(s => parsedDesigns[s]?.length > 0)

              return (
                <div key={o.id} style={{ background:'#fff', borderRadius:10, border:'1px solid #e8e8e8', overflow:'hidden', marginBottom:12 }}>
                  {/* Type banner */}
                  <div style={{ padding:'5px 16px', background:isCustom?'rgba(200,16,46,.05)':'#f8f8f8', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:isCustom?'#c8102e':'#888' }}>
                      {isCustom ? '🎨 Custom Design' : '🛍 Catalog Order'}
                    </span>
                    <span style={{ fontSize:10, color:'#bbb' }}>{new Date(o.placed_at||o.created_at).toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ padding:'14px 16px' }}>
                    {/* Studio preview */}
                    {isCustom && <AdminOrderPreview order={o} label="Customer Design Preview" />}

                    {/* Design images — all URLs per side */}
                    {isCustom && designSides.length > 0 && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                        {designSides.flatMap(s =>
                          parsedDesigns[s].map((url, di) => (
                            <a key={s+'-'+di} href={url} target="_blank" rel="noreferrer" title={s+' #'+(di+1)}>
                              <img src={url} alt={s}
                                style={{ width:56, height:56, objectFit:'contain', borderRadius:6, border:'1px solid #e0e0e0', background:'#f8f8f8' }}
                                onError={e=>e.target.style.display='none'} />
                            </a>
                          ))
                        )}
                        {o.print_sheet_url && (
                          <a href={o.print_sheet_url} target="_blank" rel="noreferrer" title="Print Sheet">
                            <div style={{ width:56, height:56, borderRadius:6, border:'1.5px solid rgba(200,16,46,.3)', background:'rgba(200,16,46,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🖨</div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Catalog product image */}
                    {!isCustom && o.product_image && (
                      <div style={{ marginBottom:10 }}>
                        <a href={o.product_image} target="_blank" rel="noreferrer" title="Product Image">
                          <img src={o.product_image} alt={o.garment||'Product'}
                            style={{ width:56, height:56, objectFit:'contain', borderRadius:6, border:'1px solid #e0e0e0', background:'#f8f8f8' }}
                            onError={e=>e.target.style.display='none'} />
                        </a>
                      </div>
                    )}

                    <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-start' }}>
                      <div style={{ flex:1, minWidth:180 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{o.name}</div>
                        <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>
                          {o.garment} {o.color && `· ${o.color}`} {o.size && `· ${o.size}`} {o.qty && `· Qty: ${o.qty}`}
                        </div>
                        {o.phone && <div style={{ fontSize:12, color:'#777' }}>📞 {o.phone}</div>}
                        {o.address && <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{o.address}</div>}
                        {o.custom_text && <div style={{ fontSize:11, color:'#9b59b6', marginTop:3 }}>Text: {o.custom_text}</div>}
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, color:'#0a1f5d', lineHeight:1 }}>
                          ₹{Number(o.total||0).toLocaleString()}
                        </div>
                        {/* Status dropdown inline */}
                        <select value={o.status||'Received'}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          style={{ border:`1.5px solid ${STATUS_COLORS[o.status]||'#ccc'}`, borderRadius:6, padding:'6px 10px', fontSize:12, fontWeight:700, color:STATUS_COLORS[o.status]||'#888', outline:'none', cursor:'pointer', background:'#fff' }}>
                          {ORDER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        {/* Payment toggle */}
                        <button onClick={()=>togglePaymentStatus(o.id, o.payment_status)}
                          style={{ padding:'5px 12px', fontSize:11, fontWeight:700, borderRadius:20, border:'1.5px solid',
                            borderColor:o.payment_status==='Paid'?'#00a86b':'#f5a623',
                            color:o.payment_status==='Paid'?'#00a86b':'#f5a623', background:'#fff', cursor:'pointer' }}>
                          {o.payment_status==='Paid'?'✓ Paid':'⏳ Unpaid'}
                        </button>
                        <button onClick={()=>deleteOrder(o.id)}
                          style={{ padding:'5px 10px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ PRODUCTS TAB ══ */}
        {tab==='products' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Products ({products.length})</h2>
              <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12 }} onClick={()=>setShowAddProduct(v=>!v)}>
                {showAddProduct ? '✕ Cancel' : '+ Add Product'}
              </button>
            </div>

            {/* Add product form */}
            {showAddProduct && (
              <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'20px', marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888', marginBottom:16 }}>New Product</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                  {[['Name','name','text'],['Price (₹)','price','number'],['MRP (₹)','mrp','number'],['Tag','tag','text']].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:4 }}>{label}</label>
                      <input type={type} value={newProduct[key]} onChange={e=>setNewProduct(p=>({...p,[key]:e.target.value}))}
                        className="input-field" style={{ fontSize:13 }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:4 }}>Category</label>
                    <input value={newProduct.category} onChange={e=>setNewProduct(p=>({...p,category:e.target.value}))}
                      placeholder="e.g. T-Shirts" className="input-field" style={{ fontSize:13 }} />
                  </div>
                </div>
                <div style={{ marginTop:10 }}>
                  <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:4 }}>Product Image</label>
                  <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 14px', background:'#0a1f5d', color:'#fff', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', width:'100%' }}>
                    📁 {prodImgFile ? prodImgFile.name : 'Choose & Upload Image'}
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ setProdImgFile(e.target.files[0]); if(e.target.files[0]) setNewProduct(p=>({...p,image_url:'Uploading…'})) }} />
                  </label>
                  {prodImgFile && <div style={{ fontSize:11, color:'#00a86b', marginTop:4 }}>✓ {prodImgFile.name} — will upload on save</div>}
                </div>
                <div style={{ marginTop:10 }}>
                  <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:8 }}>Side Views (for Studio)</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[['Front','img_front'],['Back','img_back'],['Left Side','img_left'],['Right Side','img_right']].map(([label,key])=>(
                      <div key={key}>
                        <label style={{ fontSize:10, color:'#888', fontWeight:700, display:'block', marginBottom:3 }}>{label}</label>
                        <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 8px', background: newProduct[key] && newProduct[key]!=='Uploading…' ? '#00a86b' : '#0a1f5d', color:'#fff', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', width:'100%' }}>
                          {newProduct[key] && newProduct[key]!=='Uploading…' ? '✓ Uploaded' : '📁 Upload'}
                          <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e=>{ const f=e.target.files[0]; if(!f) return; try { const url=await uploadToCloudinary(f,()=>{}); setNewProduct(p=>({...p,[key]:url})); showToast(label+' uploaded ✓') } catch(err) { showToast('Upload failed') } }} />
                        </label>
                        {newProduct[key] && newProduct[key]!=='Uploading…' && <img src={newProduct[key]} style={{ width:'100%', height:60, objectFit:'contain', marginTop:4, borderRadius:4, background:'#f8f8f8' }} alt={label} />}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <input type="checkbox" id="studio_only_new" checked={newProduct.studio_only} onChange={e=>setNewProduct(p=>({...p,studio_only:e.target.checked,home_and_shop_only:false}))} />
                  <label htmlFor="studio_only_new" style={{ fontSize:12, color:'#555', cursor:'pointer' }}>Studio Only (not shown in public shop)</label>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                  <input type="checkbox" id="home_and_shop_only_new" checked={newProduct.home_and_shop_only} onChange={e=>setNewProduct(p=>({...p,home_and_shop_only:e.target.checked,studio_only:false}))} />
                  <label htmlFor="home_and_shop_only_new" style={{ fontSize:12, color:'#555', cursor:'pointer' }}>Home & Shop Only (not shown in Studio)</label>
                </div>
                <button className="btn-primary" style={{ marginTop:14, padding:'10px 24px', fontSize:13, opacity:addingProduct?.6:1 }}
                  onClick={addProduct} disabled={addingProduct}>
                  {addingProduct ? 'Saving…' : 'Add Product'}
                </button>
              </div>
            )}

            {/* Products grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
              {products.map(p => (
                <div key={p.id} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ height:140, background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                      : <span style={{ fontSize:64 }}>{p.emoji||'.'}</span>}
                    {p.studio_only && <div style={{ position:'absolute', top:6, right:6, background:'#0a1f5d', color:'#fff', fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:3 }}>STUDIO</div>}
                    {p.home_and_shop_only && <div style={{ position:'absolute', top:6, right:6, background:'#00a86b', color:'#fff', fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:3 }}>HOME & SHOP</div>}
                  </div>
                  {editProd===p.id ? (
                    <div style={{ padding:'12px' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0a1f5d', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #f0f0f0' }}>✏️ Edit: {p.name}</div>
                      {['name','price','mrp','tag'].map(field=>(
                        <input key={field} className="input-field" style={{ marginBottom:6, fontSize:12 }}
                          placeholder={field} value={p[field]||''}
                          onChange={e=>setProducts(ps=>ps.map(x=>x.id===p.id?{...x,[field]:e.target.value}:x))} />
                      ))}
                      <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 12px', background: p.image_url ? '#00a86b' : '#0a1f5d', color:'#fff', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', width:'100%', marginBottom:6 }}>
                        {p.image_url ? '✓ Main Image Uploaded' : '📁 Upload Main Image'}
                        <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e=>{ const f=e.target.files[0]; if(!f) return; try { const url=await uploadToCloudinary(f,()=>{}); setProducts(ps=>ps.map(x=>x.id===p.id?{...x,image_url:url}:x)); showToast('Main image uploaded ✓') } catch(err) { showToast('Upload failed') } }} />
                      </label>
                      <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'.08em', margin:'8px 0 6px' }}>Side Views</div>
                      {[['Front','img_front'],['Back','img_back'],['Left','img_left'],['Right','img_right']].map(([label,key])=>(
                        <div key={key} style={{ marginBottom:6 }}>
                          <div style={{ fontSize:10, color:'#aaa', marginBottom:2 }}>{label}</div>
                          <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 10px', background: p[key] ? '#00a86b' : '#0a1f5d', color:'#fff', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', width:'100%' }}>
                            {p[key] ? '✓ Uploaded' : '📁 Upload'}
                            <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e=>{ const f=e.target.files[0]; if(!f) return; try { const url=await uploadToCloudinary(f,()=>{}); setProducts(ps=>ps.map(x=>x.id===p.id?{...x,[key]:url}:x)); showToast(label+' uploaded ✓') } catch(err) { showToast('Upload failed') } }} />
                          </label>
                          {p[key] && <img src={p[key]} style={{ width:'100%', height:50, objectFit:'contain', marginTop:3, borderRadius:4, background:'#f8f8f8' }} alt={label} />}
                        </div>
                      ))}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, marginTop:4 }}>
                        <input type="checkbox" id={`so_${p.id}`} checked={!!p.studio_only}
                          onChange={e=>setProducts(ps=>ps.map(x=>x.id===p.id?{...x,studio_only:e.target.checked,home_and_shop_only:false}:x))} />
                        <label htmlFor={`so_${p.id}`} style={{ fontSize:11, color:'#555', cursor:'pointer' }}>Studio Only</label>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                        <input type="checkbox" id={`hso_${p.id}`} checked={!!p.home_and_shop_only}
                          onChange={e=>setProducts(ps=>ps.map(x=>x.id===p.id?{...x,home_and_shop_only:e.target.checked,studio_only:false}:x))} />
                        <label htmlFor={`hso_${p.id}`} style={{ fontSize:11, color:'#555', cursor:'pointer' }}>Home & Shop Only</label>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-primary" style={{ flex:1, padding:'8px', fontSize:12 }} onClick={()=>saveProduct(p)}>Save</button>
                        <button onClick={()=>setEditProd(null)} style={{ flex:1, padding:'8px', fontSize:12, background:'none', border:'1px solid #e0e0e0', borderRadius:4, cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:1 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>{p.category}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:700, color:'#c8102e', fontSize:14 }}>₹{Number(p.price).toLocaleString()}</span>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>setEditProd(p.id)} style={{ padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid #e0e0e0', background:'none', cursor:'pointer', fontWeight:600 }}>Edit</button>
                          <button onClick={()=>deleteProduct(p.id)} style={{ padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* ══ COLOR MANAGER (merged into Products tab) ══ */}
            <div style={{ marginTop:32 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <h2 style={{ fontSize:18, fontWeight:700 }}>🎨 Color Manager</h2>
                <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={loadAdminColors}>↻ Load</button>
              </div>
              <p style={{ fontSize:12, color:'#888', marginBottom:16 }}>These colours appear in Studio, Shop and Group Order pages.</p>
              <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'20px', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#aaa', marginBottom:12 }}>Current Colours ({adminColors.length})</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
                  {adminColors.map((c,i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:c, border:c==='#ffffff'?'2px solid #ccc':'none', boxShadow:'0 2px 8px rgba(0,0,0,.12)' }} />
                      <span style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>{c}</span>
                      <button onClick={()=>{ if(window.confirm('Remove colour '+c+'?')){ const nc=adminColors.filter((_,j)=>j!==i); saveAdminColors(nc) } }}
                        style={{ fontSize:9, color:'#c8102e', background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:700 }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
                    style={{ width:40, height:36, padding:0, border:'1.5px solid #e0e0e0', borderRadius:4, cursor:'pointer' }} />
                  <input className="input-field" style={{ maxWidth:120, fontSize:12, fontFamily:'monospace' }}
                    value={newColor} onChange={e=>setNewColor(e.target.value)} placeholder="#000000" />
                  <button className="btn-primary" style={{ padding:'10px 16px', fontSize:12 }}
                    onClick={()=>{ if(!adminColors.includes(newColor)) saveAdminColors([...adminColors, newColor]); else showToast('Colour already added') }}>
                    + Add
                  </button>
                </div>
                {colorsSaving && <div style={{ fontSize:11, color:'#0a7abf', marginTop:8 }}>Saving…</div>}
              </div>
              <button className="btn-secondary" style={{ fontSize:12 }} onClick={()=>{ if(window.confirm('Reset to defaults?')) saveAdminColors([...DEFAULT_SWATCHES]) }}>
                ↺ Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* ══ SAMPLES TAB ══ */}
        {tab==='samples' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Sample Designs ({samples.length})</h2>
              <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={loadSamples}>↻ Refresh</button>
            </div>
            {/* ── Category manager ── */}
            <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'20px', marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888', marginBottom:10 }}>Manage Categories</p>
              {/* Existing chips */}
              {sampleCategories.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {sampleCategories.map(cat => (
                    <span key={cat} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#f0f0f0', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
                      {cat}
                      <button onClick={()=>removeSampleCategory(cat)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#c8102e', fontSize:16, lineHeight:1, padding:0, marginLeft:2 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <input className="input-field" style={{ fontSize:13 }} placeholder="New category (e.g. Sports)"
                  value={newCatInput} onChange={e=>setNewCatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addSampleCategory()} />
                <button className="btn-primary" style={{ padding:'10px 16px', fontSize:12, whiteSpace:'nowrap', opacity:catSaving?.6:1 }}
                  onClick={addSampleCategory} disabled={catSaving}>+ Add</button>
              </div>
            </div>

            {/* ── Bulk upload form ── */}
            <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, padding:'20px', marginBottom:20 }}>
              <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888', marginBottom:12 }}>Bulk Upload Samples</p>

              {/* Category chip selector */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:'#888', fontWeight:700, display:'block', marginBottom:7 }}>Category (click to select)</label>
                {sampleCategories.length === 0 ? (
                  <p style={{ fontSize:12, color:'#bbb' }}>No categories yet — add one above first.</p>
                ) : (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {sampleCategories.map(cat => (
                      <button key={cat} onClick={()=>setSampleForm(f=>({...f, category: f.category===cat ? '' : cat}))}
                        style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
                          border:`1.5px solid ${sampleForm.category===cat?'#c8102e':'#e0e0e0'}`,
                          background: sampleForm.category===cat ? '#c8102e' : '#fff',
                          color:       sampleForm.category===cat ? '#fff'    : '#555',
                          transition:'all .12s' }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-file picker */}
              <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px',
                background: sampleFiles.length ? '#00a86b' : '#0a1f5d',
                color:'#fff', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', width:'100%', marginBottom: sampleFiles.length ? 10 : 0 }}>
                {sampleFiles.length ? `✓ ${sampleFiles.length} image${sampleFiles.length>1?'s':''} selected` : '📁 Choose Images (you can select many)'}
                <input type="file" accept="image/*" multiple style={{ display:'none' }}
                  onClick={e=>{ e.target.value = null }}
                  onChange={e=>setSampleFiles(Array.from(e.target.files))} />
              </label>

              {/* Thumbnail preview grid */}
              {sampleFiles.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {sampleFiles.map((f, i) => (
                    <div key={i} style={{ position:'relative' }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width:58, height:58, objectFit:'cover', borderRadius:7, border:'1px solid #e0e0e0', display:'block' }} />
                      <button onClick={()=>setSampleFiles(fs=>fs.filter((_,j)=>j!==i))}
                        style={{ position:'absolute', top:-5, right:-5, width:17, height:17, borderRadius:'50%',
                          background:'#c8102e', color:'#fff', border:'none', fontSize:10, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      <div style={{ fontSize:9, color:'#888', marginTop:2, maxWidth:58, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {f.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {samplePct > 0 && samplePct < 100 && (
                <div style={{ height:4, background:'#e0e0e0', borderRadius:2, marginBottom:10 }}>
                  <div style={{ height:'100%', width:`${samplePct}%`, background:'#c8102e', borderRadius:2, transition:'width .2s' }} />
                </div>
              )}

              <button className="btn-primary" style={{ marginTop:4, padding:'10px 24px', fontSize:13, opacity:sampleSaving?.6:1 }}
                onClick={saveSample} disabled={sampleSaving || !sampleFiles.length}>
                {sampleSaving ? `Uploading… ${samplePct}%` : `⬆ Upload ${sampleFiles.length > 0 ? sampleFiles.length+' ' : ''}Sample${sampleFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
            {/* Samples grid */}
            {samplesLoading ? <div style={{ textAlign:'center', padding:32, color:'#888' }}>Loading…</div>
            : samples.length===0 ? <div style={{ textAlign:'center', padding:32, color:'#aaa' }}>No samples yet.</div>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                {samples.map(s => (
                  <div key={s.id} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, overflow:'hidden' }}>
                    <img src={s.image_url} alt={s.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                    <div style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{s.name}</div>
                      {s.category && <div style={{ fontSize:10, color:'#888', marginBottom:6 }}>{s.category}</div>}
                      <button onClick={()=>deleteSample(s.id)}
                        style={{ width:'100%', padding:'6px', fontSize:11, borderRadius:4, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:600 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ UPLOADS TAB ══ */}
        {/* ══ GROUP ORDERS TAB ══ */}
        {tab==='grouporders' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>👥 Group Orders ({groupOrders.length})</h2>
              <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={loadGroupOrders}>↻ Refresh</button>
            </div>
            {groupOrdersLoading ? <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading…</div>
            : groupOrders.length===0 ? <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>No group orders yet.</div>
            : groupOrders.map(g => (
              <div key={g.id} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{g.title}</div>
                    <div style={{ fontSize:12, color:'#555' }}>Code: <strong>{g.group_code}</strong> · {g.garment_category||'—'}</div>
                    <div style={{ fontSize:11, color:'#888' }}>Organiser: {g.organizer} · {g.phone}</div>
                    <div style={{ fontSize:11, color:'#888' }}>Target: {g.target_qty} pcs · Deadline: {g.deadline||'—'}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>loadGroupMembers(g.group_code)}
                      style={{ padding:'7px 14px', fontSize:11, borderRadius:6, border:'1px solid #0a1f5d', color:'#0a1f5d', background:'none', cursor:'pointer', fontWeight:700 }}>
                      {expandedGroup===g.group_code ? '▲ Hide' : '▼ Members'}
                    </button>
                    <button onClick={()=>deleteGroupOrder(g.id, g.group_code)}
                      style={{ padding:'7px 14px', fontSize:11, borderRadius:6, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:700 }}>
                      Delete
                    </button>
                  </div>
                </div>
                {expandedGroup===g.group_code && (
                  <div style={{ borderTop:'1px solid #f0f0f0', padding:'12px 16px' }}>
                    {!groupMembers[g.group_code] ? <div style={{ color:'#aaa', fontSize:12 }}>Loading members…</div>
                    : groupMembers[g.group_code].length===0 ? <div style={{ color:'#aaa', fontSize:12 }}>No members joined yet.</div>
                    : (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {groupMembers[g.group_code].map((m,i) => (
                          <div key={m.id} style={{ display:'flex', gap:10, fontSize:12, padding:'6px 0', borderBottom:i<groupMembers[g.group_code].length-1?'1px solid #f8f8f8':'none' }}>
                            <span style={{ fontWeight:700, minWidth:24 }}>#{i+1}</span>
                            <span style={{ flex:1 }}>{m.name}</span>
                            <span style={{ color:'#888' }}>{m.phone}</span>
                            <span style={{ color:'#0a1f5d', fontWeight:600 }}>{m.size}</span>
                            <span style={{ color:'#c8102e', fontWeight:700 }}>×{m.qty}</span>
                          </div>
                        ))}
                        <div style={{ fontSize:12, fontWeight:700, color:'#0a1f5d', paddingTop:6 }}>
                          Total: {groupMembers[g.group_code].reduce((a,m)=>a+Number(m.qty||1),0)} pcs
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ ANALYTICS TAB ══ */}
        {tab==='analytics' && (isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL) && (() => {
          const totalOrders   = orders.length
          const paid          = orders.filter(o=>o.payment_status==='Paid').length
          const unpaid        = totalOrders - paid
          const revenue       = orders.filter(o=>o.payment_status==='Paid').reduce((a,o)=>a+Number(o.total||0),0)
          const customOrders  = orders.filter(o=>o.order_type==='custom').length
          const catalogOrders = totalOrders - customOrders
          const statusCounts  = {}
          orders.forEach(o=>{ statusCounts[o.status||'Received']=(statusCounts[o.status||'Received']||0)+1 })
          return (
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>📊 Analytics</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
                {[
                  { label:'Total Orders',   value:totalOrders,                         color:'#0a1f5d' },
                  { label:'Revenue (Paid)', value:'₹'+revenue.toLocaleString('en-IN'), color:'#00a86b' },
                  { label:'Paid',           value:paid,                                color:'#00a86b' },
                  { label:'Unpaid',         value:unpaid,                              color:'#f5a623' },
                  { label:'Custom Orders',  value:customOrders,                        color:'#c8102e' },
                  { label:'Catalog Orders', value:catalogOrders,                       color:'#0a7abf' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'16px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, color:s.color, lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'16px' }}>
                <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888', marginBottom:12 }}>Order Status Breakdown</p>
                {Object.entries(statusCounts).map(([s,n])=>(
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, minWidth:90, color:STATUS_COLORS[s]||'#888' }}>{s}</span>
                    <div style={{ flex:1, height:10, background:'#f0f0f0', borderRadius:5 }}>
                      <div style={{ height:'100%', width:`${(n/Math.max(totalOrders,1))*100}%`, background:STATUS_COLORS[s]||'#888', borderRadius:5 }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, minWidth:24, textAlign:'right' }}>{n}</span>
                  </div>
                ))}
              </div>
              <StorageWidget supabase={supabase} showToast={showToast} />
            </div>
          )
        })()}

        {/* ══ PEOPLE TAB (merged Visitors + Users) ══ */}
        {tab==='people' && (isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL) && (() => {
          const isLoading = visitorsLoading || usersLoading

          // Delete all session history for a user by email
          const deleteVisitorSessions = async (email) => {
            if (!window.confirm(`Delete all session history for ${email}?`)) return
            const { error, count } = await supabase.from('drynn_user_sessions').delete({ count:'exact' }).eq('user_email', email)
            if (error) { alert('Delete failed: ' + error.message + ' · ' + error.code); return }
            setVisitors(prev => prev.filter(v => v.user_email !== email))
            // Also remove sessions from allUsers entries
            setAllUsers(prev => prev.map(u => u.email === email ? { ...u, sessions: [] } : u))
            showToast(`Deleted ${count??''} session(s)`)
          }

          // Merge allUsers with raw session counts from visitors list
          // allUsers already includes session data; use it as the main list
          // For users with no allUsers entry (pure anonymous sessions), pull from visitors
          const knownEmails = new Set(allUsers.map(u => u.email).filter(Boolean))
          const anonSessions = visitors.filter(v => v.user_email && !knownEmails.has(v.user_email))
          // Group anon sessions by email to dedupe
          const anonByEmail = {}
          anonSessions.forEach(v => {
            if (!anonByEmail[v.user_email]) anonByEmail[v.user_email] = { user_id:null, email:v.user_email, name:v.user_name||v.user_email||'Anonymous', phone:null, address:null, orders:[], uploads:[], sessions:[], source:'visitor' }
            anonByEmail[v.user_email].sessions.push(v)
          })
          const combinedList = [
            ...allUsers,
            ...Object.values(anonByEmail),
          ]

          // Search filter
          const q = (visitorSearch||'').toLowerCase()
          const filtered = q
            ? combinedList.filter(u =>
                (u.name||'').toLowerCase().includes(q) ||
                (u.email||'').toLowerCase().includes(q) ||
                (u.phone||'').includes(q)
              )
            : combinedList

          const totalSessions = visitors.length

          return (
            <div>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                <div>
                  <h2 style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>👥 People</h2>
                  <p style={{ fontSize:12, color:'#888' }}>{combinedList.length} people · {totalSessions} sessions tracked</p>
                </div>
                <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={()=>{ loadVisitors(); loadAllUsers() }}>↻ Refresh</button>
              </div>

              {/* Stats row */}
              {!isLoading && combinedList.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                  {[
                    { label:'Total',     value:combinedList.length,                                     color:'#0a1f5d' },
                    { label:'Customers', value:combinedList.filter(u=>u.orders.length>0).length,        color:'#00a86b' },
                    { label:'Visitors',  value:combinedList.filter(u=>u.orders.length===0).length,      color:'#f5a623' },
                    { label:'Sessions',  value:totalSessions,                                            color:'#c8102e' },
                  ].map(s=>(
                    <div key={s.label} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:26, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:10, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <input className="input-field" style={{ marginBottom:14, fontSize:13 }} placeholder="Search by name, email, or phone…"
                value={visitorSearch} onChange={e=>setVisitorSearch(e.target.value)} />

              {/* List */}
              {isLoading ? <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading…</div>
              : filtered.length===0 ? <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>No people found.</div>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {filtered.map((u,i) => {
                    const hasOrders    = u.orders.length > 0
                    const customOrders = u.orders.filter(o=>o.order_type==='custom'||(o.design_file&&o.design_file!=='catalog-order'&&o.design_file!=='{}'))
                    return (
                      <div key={i} style={{ background:'#fff', border:'1.5px solid', borderColor:hasOrders?'#e8e8e8':'#f5f5f5', borderRadius:12, padding:'14px 16px' }}>
                        {/* Top row */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:6 }}>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
                              <span style={{ fontSize:14, fontWeight:700 }}>{u.name||'—'}</span>
                              {!hasOrders && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:50, background:'#fff8e1', color:'#f5a623', border:'1px solid #ffe082' }}>VISITOR</span>}
                              {customOrders.length>0 && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:50, background:'rgba(155,89,182,.1)', color:'#9b59b6', border:'1px solid rgba(155,89,182,.25)' }}>🎨 STUDIO</span>}
                            </div>
                            <div style={{ fontSize:11, color:'#888', display:'flex', gap:10, flexWrap:'wrap' }}>
                              {u.email && <span>✉ {u.email}</span>}
                              {u.phone && <span>📞 {u.phone}</span>}
                              {u.sessions.length>0 && (() => {
                                const totalSec = u.sessions.reduce((a,s)=>a+Number(s.duration_sec||0),0)
                                const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60),sc=totalSec%60
                                const durStr = totalSec>0 ? (h>0?`${h}h ${m}m`:m>0?`${m}m ${sc}s`:`${sc}s`) : null
                                return <span>👁 {u.sessions.length} session{u.sessions.length!==1?'s':''}{durStr ? ` · ⏱ ${durStr}` : ''}</span>
                              })()}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ background:'#f0f3ff', color:'#0a1f5d', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20 }}>{u.orders.length} order{u.orders.length!==1?'s':''}</span>
                            {u.phone && <a href={`https://wa.me/91${u.phone.replace(/\D/g,'').replace(/^91/,'')}`} target="_blank" rel="noreferrer" style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid #00a86b', color:'#00a86b', fontWeight:700, textDecoration:'none' }}>💬</a>}
                            {u.email && u.sessions.length>0 && (
                              <button onClick={()=>deleteVisitorSessions(u.email)}
                                style={{ padding:'4px 10px', fontSize:10, borderRadius:20, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer', fontWeight:700 }}>
                                🗑 Sessions
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Studio designs */}
                        {customOrders.length>0 && (
                          <div style={{ marginBottom:8 }}>
                            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#9b59b6', marginBottom:5 }}>🎨 Studio Designs</div>
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {customOrders.map(o => {
                                let designs = []
                                try { const p=JSON.parse(o.design_file); designs=Object.entries(p).filter(([,v])=>v&&v.startsWith('https://')) } catch {}
                                return designs.map(([side,url]) => (
                                  <a key={side+url} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt={side} style={{ width:48, height:48, objectFit:'contain', borderRadius:5, border:'1.5px solid rgba(155,89,182,.3)', background:'#f8f8f8' }} onError={e=>e.target.style.display='none'} />
                                  </a>
                                ))
                              })}
                            </div>
                          </div>
                        )}

                        {/* Orders summary */}
                        {hasOrders && (
                          <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom: u.sessions.length>0?6:0 }}>
                            {u.orders.slice(0,3).map(o=>(
                              <div key={o.id} style={{ fontSize:11, color:'#555', display:'flex', gap:8, flexWrap:'wrap' }}>
                                <span style={{ fontWeight:600, color:'#0a0a0a' }}>{o.garment||o.product_name}</span>
                                <span>·</span><span>₹{Number(o.total||0).toLocaleString()}</span>
                                <span>·</span><span style={{ color:STATUS_COLORS[o.status]||'#888', fontWeight:600 }}>{o.status}</span>
                              </div>
                            ))}
                            {u.orders.length>3 && <div style={{ fontSize:11, color:'#aaa' }}>+{u.orders.length-3} more</div>}
                          </div>
                        )}

                        {/* Session history (latest 3) */}
                        {u.sessions.length>0 && (() => {
                          const fmtDur = (sec) => {
                            if (!sec || sec<=0) return null
                            const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60
                            if (h>0) return `${h}h ${m}m`
                            if (m>0) return `${m}m ${s}s`
                            return `${s}s`
                          }
                          const totalSec = u.sessions.reduce((a,s)=>a+Number(s.duration_sec||0),0)
                          const totalFmt = fmtDur(totalSec)
                          return (
                            <div style={{ borderTop:'1px solid #f5f5f5', paddingTop:6, marginTop:4 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#bbb' }}>Recent Sessions</div>
                                {totalFmt && (
                                  <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(10,31,93,.07)', borderRadius:20, padding:'2px 8px' }}>
                                    <span style={{ fontSize:11 }}>⏱</span>
                                    <span style={{ fontSize:11, fontWeight:700, color:'#0a1f5d' }}>{totalFmt} total</span>
                                  </div>
                                )}
                              </div>
                              {u.sessions.slice(0,3).map((s,si)=>{
                                const dur = fmtDur(Number(s.duration_sec||0))
                                const pages = s.pages_visited?.length || s.page_views || null
                                return (
                                  <div key={si} style={{ fontSize:11, color:'#aaa', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', padding:'3px 0', borderBottom:si<Math.min(u.sessions.length,3)-1?'1px dashed #f5f5f5':'none' }}>
                                    {s.started_at && <span style={{ color:'#999' }}>{new Date(s.started_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}</span>}
                                    {dur && <span style={{ background:'#f0f3ff', color:'#0a1f5d', fontWeight:700, borderRadius:10, padding:'1px 7px', fontSize:10 }}>⏱ {dur}</span>}
                                    {pages && <span style={{ color:'#bbb' }}>· {pages} page{pages!==1?'s':''}</span>}
                                    {s.device_info?.mobile && <span style={{ color:'#ccc', fontSize:9 }}>📱</span>}
                                  </div>
                                )
                              })}
                              {u.sessions.length>3 && <div style={{ fontSize:10, color:'#ccc', marginTop:3 }}>+{u.sessions.length-3} more sessions</div>}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ══ MEDIA TAB ══ */}
        {tab==='media' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>🎬 Media Manager</h2>
              <button className="btn-secondary" style={{ padding:'7px 14px', fontSize:12 }} onClick={loadMediaUrls}>↻ Load</button>
            </div>
            <p style={{ fontSize:12, color:'#888', marginBottom:20 }}>Upload a file directly. Changes go live immediately for all users.</p>
            {[
              { key:'video_intro',  label:'🎬 Intro / Splash video',       accept:'video/*' },
              { key:'video_home',   label:'🎬 Home page hero video',       accept:'video/*' },
              { key:'audio_song',   label:'🎵 Background song (MP3/AAC)', accept:'audio/*' },
            ].map(item => (
              <div key={item.key} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'16px', marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', display:'block', marginBottom:8 }}>{item.label}</label>
                <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 16px', background: mediaSaving ? '#ccc' : '#0a1f5d', color:'#fff', borderRadius:6, fontSize:13, fontWeight:700, cursor: mediaSaving ? 'not-allowed' : 'pointer', width:'100%' }}>
                  {mediaSaving ? '⏳ Uploading…' : '📁 Choose & Upload File'}
                  <input type="file" accept={item.accept} style={{ display:'none' }} disabled={mediaSaving}
                    onChange={e=>{ if(e.target.files[0]) handleMediaFileUpload(item.key, e.target.files[0]) }} />
                </label>
                {mediaUrls[item.key] && (
                  <p style={{ fontSize:11, color:'#00a86b', marginTop:8 }}>✓ Uploaded successfully</p>
                )}
                {mediaUrls[item.key] && item.key.startsWith('video') && (
                  <video src={mediaUrls[item.key]} style={{ width:'100%', maxHeight:140, marginTop:10, borderRadius:6, objectFit:'cover' }} controls muted />
                )}
                {mediaUrls[item.key] && item.key==='audio_song' && (
                  <audio src={mediaUrls[item.key]} style={{ width:'100%', marginTop:10 }} controls />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ ADMINS TAB (super admin only) ══ */}
        {tab==='admins' && (isSuperAdmin || currentUser?.email === SUPER_ADMIN_EMAIL) && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>🔑 Admin Management</h2>
                <p style={{ fontSize:12, color:'#888' }}>Only super admin can add or remove admins.</p>
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'20px', marginBottom:20 }}>
              <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888', marginBottom:12 }}>Add New Admin</p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <input className="input-field" style={{ flex:1, minWidth:220, fontSize:13 }}
                  value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addAdmin()}
                  placeholder="Enter Google email address" />
                <button className="btn-primary" style={{ padding:'10px 20px', fontSize:13, opacity:adminSaving?.6:1 }}
                  onClick={addAdmin} disabled={adminSaving}>
                  {adminSaving?'Adding…':'+ Add Admin'}
                </button>
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'12px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#888' }}>Admins ({adminsList.length})</p>
                <button onClick={loadAdmins} style={{ fontSize:11, color:'#888', background:'none', border:'1px solid #e0e0e0', borderRadius:4, padding:'4px 10px', cursor:'pointer' }}>↻</button>
              </div>
              {adminsLoading ? <div style={{ textAlign:'center', padding:32, color:'#aaa' }}>Loading…</div>
              : adminsList.map((a,i) => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:i<adminsList.length-1?'1px solid #f8f8f8':'none', flexWrap:'wrap' }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:a.role==='superadmin'?'#c8102e':'#0a1f5d', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, flexShrink:0 }}>
                    {a.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{a.email}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:50,
                        background:a.role==='superadmin'?'rgba(200,16,46,.1)':'rgba(10,31,93,.08)',
                        color:a.role==='superadmin'?'#c8102e':'#0a1f5d',
                        border:`1px solid ${a.role==='superadmin'?'rgba(200,16,46,.25)':'rgba(10,31,93,.2)'}` }}>
                        {a.role==='superadmin'?'👑 Super Admin':'🔑 Admin'}
                      </span>
                      {a.added_by && <span style={{ fontSize:10, color:'#bbb' }}>by {a.added_by}</span>}
                      {a.created_at && <span style={{ fontSize:10, color:'#ccc' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>}
                    </div>
                  </div>
                  {a.role!=='superadmin' && (
                    <button onClick={()=>removeAdmin(a.email)}
                      style={{ padding:'7px 14px', fontSize:12, fontWeight:700, borderRadius:6, border:'1px solid #fdd', color:'#c8102e', background:'none', cursor:'pointer' }}>
                      Remove
                    </button>
                  )}
                  {a.role==='superadmin' && <span style={{ fontSize:11, color:'#ccc', fontStyle:'italic' }}>Owner</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {toast && <div className="toast" style={{ bottom:20 }}>{toast}</div>}
    </div>
  )
}


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
    const cleanId = orderId.trim().replace(/^#/,'')
    let query = supabase.from('drynn_orders').select('*')
    if (cleanId) query = query.ilike('id', `${cleanId}%`)
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
                          : <span style={{ fontSize:52 }}>{p.emoji||'.'}</span>}
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
  const sharedSwatches = useSwatches()
  const [form, setForm]         = useState({ title:'', color:'#ffffff', deadline:'', organizer: user?.user_metadata?.full_name||'', phone:'' })
  const [created, setCreated]   = useState(null)
  const [saving, setSaving]     = useState(false)
  // Design upload state — per side (connects to Studio logic)
  const SIDES = ['front','back','left','right']
  const SIDE_LABELS_MAP = { front:'Front', back:'Back', left:'Left', right:'Right' }
  const [activeSide,   setActiveSide]   = useState('front')
  const [sideFiles,    setSideFiles]    = useState({ front:[], back:[], left:[], right:[] })
  const [sideImgs,     setSideImgs]     = useState({ front:[], back:[], left:[], right:[] })
  const [uploadPct,    setUploadPct]    = useState(0)
  const [uploadErr,    setUploadErr]    = useState('')
  // Keep backward compat aliases for preview
  const designFile = sideFiles[activeSide]?.[0] || null
  const designImg  = sideImgs[activeSide]?.[0] || null

  const GARMENT_DEFAULTS = {
    'T-Shirts': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png',
    'Hoodies':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_white.png',
    'Polos':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
    'Joggers':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_white.png',
  }

  // Garment image to use in preview — prefer product's own image
  const previewGarmentImg = selectedProduct
    ? (selectedProduct.img_front || selectedProduct.image_url || GARMENT_DEFAULTS[selectedProduct.category] || GARMENT_DEFAULTS['T-Shirts'])
    : GARMENT_DEFAULTS['T-Shirts']

  const garmentLabel = selectedProduct ? selectedProduct.name : 'No product selected'

  const handleDesignFile = e => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml']
    const valid = files.filter(f => {
      if (!allowed.includes(f.type)) { setUploadErr('Only PNG, JPG, SVG allowed.'); return false }
      if (f.size > 20*1024*1024) { setUploadErr('Max 20MB.'); return false }
      return true
    })
    if (!valid.length) return
    setUploadErr('')
    valid.forEach(f => {
      const blobUrl = URL.createObjectURL(f)
      setSideFiles(prev => ({ ...prev, [activeSide]: [...(prev[activeSide]||[]), f] }))
      setSideImgs(prev => ({ ...prev, [activeSide]: [...(prev[activeSide]||[]), blobUrl] }))
    })
  }

  const create = async () => {
    if (!form.title||!form.organizer||!form.phone) { alert('Fill all required fields'); return }
    setSaving(true)
    // Upload all sides that have files
    const designUrls = {}
    for (const side of SIDES) {
      const files = sideFiles[side] || []
      if (files.length) {
        const urls = []
        for (const f of files) {
          try {
            const url = await uploadToCloudinary(f, pct => setUploadPct(pct))
            urls.push(url)
          } catch(e) {
            setSaving(false)
            alert('Design upload failed for ' + side + ': ' + e.message)
            return
          }
        }
        if (urls.length) designUrls[side] = urls.join(',')
      }
    }
    const designUrl = designUrls.front?.split(',')[0] || null
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
      design_urls:         JSON.stringify(designUrls),
      created_at:          new Date().toISOString(),
      status:              'open',
    }
    const { error } = await supabase.from('drynn_group_orders').insert(groupData)
    setSaving(false)
    if (error) { alert('Failed to create group order: ' + error.message); return }
    setCreated({ ...groupData, previewGarmentImg })
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
                  : <span style={{ fontSize:28 }}>{selectedProduct.emoji||'.'}</span>}
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
              {sharedSwatches.map(c=>(
                <div key={c} onClick={()=>setForm({...form,color:c})}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer',
                    border: c==='#ffffff' ? '2px solid #ccc' : '2px solid transparent',
                    boxShadow: form.color===c ? '0 0 0 3px #c8102e' : 'none', transition:'box-shadow .15s' }} />
              ))}
            </div>
          </div>

          {/* Design upload + live preview */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#555', display:'block', marginBottom:7 }}>Design / Logo (optional — per side)</label>
            {/* Side selector tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
              {SIDES.map(s => (
                <button key={s} onClick={()=>setActiveSide(s)}
                  style={{ padding:'5px 12px', fontSize:11, fontWeight:700, borderRadius:4, border:'1.5px solid', cursor:'pointer',
                    borderColor: activeSide===s ? '#c8102e' : '#e0e0e0',
                    background: activeSide===s ? '#c8102e' : '#fff',
                    color: activeSide===s ? '#fff' : '#555',
                    position:'relative' }}>
                  {SIDE_LABELS_MAP[s]}
                  {(sideImgs[s]?.length > 0) && <span style={{ position:'absolute', top:-4, right:-4, width:8, height:8, borderRadius:'50%', background:'#00a86b', border:'1px solid #fff' }} />}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Upload zone */}
              <div style={{ flex:'1 1 140px' }}>
                {/* Thumbnail grid */}
                {(sideImgs[activeSide]?.length > 0) && (
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                    {sideImgs[activeSide].map((src, i) => (
                      <div key={i} style={{ position:'relative' }}>
                        <img src={src} alt="" style={{ width:54, height:54, objectFit:'cover', borderRadius:6, border:'1px solid #e0e0e0' }} />
                        <button onClick={()=>{
                          setSideImgs(p=>({ ...p, [activeSide]: p[activeSide].filter((_,j)=>j!==i) }))
                          setSideFiles(p=>({ ...p, [activeSide]: p[activeSide].filter((_,j)=>j!==i) }))
                        }} style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%',
                          background:'#c8102e', color:'#fff', border:'none', fontSize:10, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ cursor:'pointer', display:'block' }}>
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" multiple style={{ display:'none' }}
                    onClick={e=>{ e.target.value = null }}
                    onChange={handleDesignFile} />
                  <div className="upload-zone" style={{ minHeight:60, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize:11, color:'#aaa' }}>{(sideImgs[activeSide]?.length > 0) ? '+ Add more' : 'Upload PNG / JPG / SVG'}</span>
                    <span style={{ fontSize:9, color:'#ccc' }}>Multi-select OK</span>
                  </div>
                </label>
                {uploadErr && <p style={{ fontSize:10, color:'#c8102e', marginTop:4 }}>{uploadErr}</p>}
              </div>
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
                  <button onClick={()=>{ setSideImgs(p=>({...p,[activeSide]:[]})); setSideFiles(p=>({...p,[activeSide]:[]})) }}
                    style={{ marginTop:4, fontSize:10, color:'#c8102e', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Remove designs</button>
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

  const [memberCount, setMemberCount] = useState(0)

  const getDiscount = (count) => count >= 3 ? 30 : count === 2 ? 15 : 0

  const findGroup = async () => {
    if (!code.trim()) { setError('Enter a group code'); return }
    setLoading(true); setError(''); setGroup(null)
    const { data, error: dbErr } = await supabase.from('drynn_group_orders').select('*').eq('group_code', code.trim().toUpperCase()).limit(1)
      .catch(()=>({ data:null, error:{message:'Group orders table not found'} }))
    setLoading(false)
    if (dbErr || !data || data.length===0) {
      setError(dbErr?.message === 'Group orders table not found'
        ? 'Group orders feature is not yet set up. Contact the organizer directly.'
        : 'Group not found. Check the code and try again.')
      return
    }
    setGroup(data[0])
    // Fetch current member count for discount display
    const { data: mData } = await supabase.from('drynn_group_members').select('id', { count: 'exact' }).eq('group_code', data[0].group_code)
    setMemberCount((mData || []).length)
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
    if (error) { alert('Failed to join: ' + error.message); return }
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
            {/* Multi-side design preview */}
            {group.design_urls && (() => {
              try {
                const du = JSON.parse(group.design_urls)
                const sides = ['front','back','left','right'].filter(s => du[s])
                if (sides.length > 1) return (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#888', marginBottom:8 }}>Design Sides</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {sides.map(s => (
                        <div key={s} style={{ textAlign:'center' }}>
                          <img src={du[s]} alt={s} style={{ width:64, height:64, objectFit:'contain', borderRadius:6, border:'1px solid #e0e0e0', background:'#f8f8f8' }}
                            onError={e=>e.target.style.display='none'} />
                          <div style={{ fontSize:9, color:'#888', marginTop:2, textTransform:'capitalize' }}>{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              } catch {}
              return null
            })()}
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
                      'Hoodie':  'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/hoodie_white.png',
                      'Polo':    'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/polo_white.png',
                      'Joggers': 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/joggers_white.png',
                    }[group.garment] || 'https://res.cloudinary.com/dfhdyp4oq/image/upload/drynn/products/tshirt_white.png'}
                    alt="garment" style={{ width:200, height:200, objectFit:'contain', display:'block' }}
                    onError={e=>e.target.style.opacity='0.1'} />
                  {group.design_url && (
                    <img src={group.design_url} alt="design"
                      style={{ position:'absolute', top:'44%', left:'50%', transform:'translate(-50%,-50%)', width:'38%', objectFit:'contain', pointerEvents:'none' }} />
                  )}
                </div>
                {group.product_price && (
                  <div style={{ marginTop:6 }}>
                    {getDiscount(memberCount) > 0 ? (
                      <>
                        <span style={{ fontSize:12, color:'#888', textDecoration:'line-through', marginRight:6 }}>₹{Number(group.product_price).toLocaleString()}</span>
                        <span style={{ fontSize:14, fontWeight:700, color:'#00a86b' }}>₹{Math.round(group.product_price * (1 - getDiscount(memberCount)/100)).toLocaleString()}</span>
                        <span style={{ marginLeft:6, fontSize:11, background:'#00a86b', color:'#fff', padding:'2px 8px', borderRadius:10, fontWeight:700 }}>{getDiscount(memberCount)}% OFF</span>
                      </>
                    ) : (
                      <span style={{ fontSize:13, fontWeight:700, color:'#c8102e' }}>₹{Number(group.product_price).toLocaleString()} per piece</span>
                    )}
                    <div style={{ fontSize:10, color:'#888', marginTop:4 }}>
                      {memberCount} member{memberCount!==1?'s':''} · {getDiscount(memberCount+1) > getDiscount(memberCount) ? `+1 more = ${getDiscount(memberCount+1)}% off!` : getDiscount(memberCount) < 30 ? `3+ members = 30% off` : '🎉 Max 30% discount unlocked!'}
                    </div>
                  </div>
                )}
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
  const mediaSettings = useMediaSettings()
  const [page, setPageRaw]     = useState('home')

  // Navigate to a page AND push a browser history entry, so the
  // hardware/gesture back button steps back through in-app pages
  // instead of closing the tab/app.
  const setPage = useCallback((newPage) => {
    setPageRaw(prev => {
      if (prev === newPage) return prev
      window.history.pushState({ page: newPage }, '', '#' + newPage)
      return newPage
    })
  }, [])

  // Set up initial history entry + listen for back/forward navigation
  useEffect(() => {
    window.history.replaceState({ page: 'home' }, '', window.location.pathname)
    const handlePopState = (e) => {
      setPageRaw(e.state?.page || 'home')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [cart, setCart]     = useState([])
  const [toast, setToast]   = useState('')
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fmtClockTime = (d) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
  const fmtClockDate = (d) => d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })
  const audioRef = useRef(null)
  // Update audio src when mediaSettings loads
  React.useEffect(() => {
    if (audioRef.current && mediaSettings.audio_song) {
      audioRef.current.src = mediaSettings.audio_song
    }
  }, [mediaSettings.audio_song])



  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  // ── SESSION TRACKING ──
  const sessionIdRef   = useRef(null)
  const sessionStartRef = useRef(null)
  const pagesVisitedRef = useRef([])

  useEffect(() => {
    if (!user?.email) return // only track logged-in users

    const sessionId   = crypto.randomUUID()
    sessionIdRef.current    = sessionId
    sessionStartRef.current = Date.now()
    pagesVisitedRef.current = ['home']

    const device = {
      userAgent: navigator.userAgent,
      platform:  navigator.platform || 'unknown',
      language:  navigator.language,
      screen:    `${window.screen.width}x${window.screen.height}`,
      mobile:    /Mobi|Android/i.test(navigator.userAgent),
    }

    // Insert session row on mount
    supabase.from('drynn_user_sessions').insert({
      id:           sessionId,
      user_email:   user.email,
      user_name:    user.user_metadata?.full_name || user.email,
      started_at:   new Date().toISOString(),
      ended_at:     null,
      duration_sec: 0,
      pages_visited: ['home'],
      device_info:  device,
    }).then(({ error }) => { if (error) console.warn('[Tracking] Insert failed:', error.message) })

    // On tab close / navigate away — update duration + ended_at
    const endSession = () => {
      const dur = Math.round((Date.now() - sessionStartRef.current) / 1000)
      const payload = JSON.stringify({
        ended_at:     new Date().toISOString(),
        duration_sec: dur,
        pages_visited: pagesVisitedRef.current,
      })
      // Use sendBeacon so it survives tab close
      navigator.sendBeacon &&
        navigator.sendBeacon(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/end-session?id=${sessionId}`, payload)
      // Also try supabase directly (works if tab stays open)
      supabase.from('drynn_user_sessions').update({
        ended_at:     new Date().toISOString(),
        duration_sec: dur,
        pages_visited: pagesVisitedRef.current,
      }).eq('id', sessionId).then(() => {})
    }

    window.addEventListener('beforeunload', endSession)
    return () => {
      window.removeEventListener('beforeunload', endSession)
      endSession()
    }
  }, [user?.email])

  // Track page changes
  useEffect(() => {
    if (!user?.email || !sessionIdRef.current) return
    if (!pagesVisitedRef.current.includes(page)) {
      pagesVisitedRef.current = [...pagesVisitedRef.current, page]
    }
    // Update pages_visited in DB on each page change
    supabase.from('drynn_user_sessions')
      .update({ pages_visited: pagesVisitedRef.current })
      .eq('id', sessionIdRef.current)
      .then(() => {})
  }, [page])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const addToCart = (product) => {
    const incomingQty = product.qty || 1
    setCart(c => {
      const idx = c.findIndex(x => x.id === product.id && x.size === product.size && x.color === product.color)
      if (idx >= 0) { const n=[...c]; n[idx]={...n[idx],qty:n[idx].qty+incomingQty}; return n }
      return [...c, { ...product, qty: incomingQty }]
    })
    showToast(`${product.name} added to cart`)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload() }

  // Overlay pages (full-screen replacements)
  if (page === 'privacy') return <PrivacyPage onBack={()=>setPage('home')} />
  if (page === 'terms')   return <TermsPage   onBack={()=>setPage('home')} />
  if (page === 'admin')   return <AdminPanel  onBack={()=>setPage('home')} />

  const NAV_ITEMS = [
    { key:'home',     label:'Home',    icon:'合' },
    { key:'products', label:'Shop',    icon:'⇄' },
    { key:'studio',   label:'Studio',  special:true, icon:'✦' },
    { key:'cart',     label:'Cart',    icon:'⌯⌲' },
    { key:'account',  label:'Account', icon:'⏣' },
  ]

  const isAdmin = user?.email === ADMIN_EMAIL || user?.email === SUPER_ADMIN_EMAIL

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

      {/* ── AUDIO ── */}
      <audio ref={audioRef} src="https://res.cloudinary.com/dfhdyp4oq/video/upload/v1780988236/Pavazha_Malli_ihrawx.mp3" loop preload="auto" />

      {/* ── ROW 1: Play + Song name + Clock ── */}
      <div style={{ background:'linear-gradient(135deg,#c8102e 0%,#6b0a3e 50%,#2d0a3e 100%)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 14px' }}>
        {/* Left: Play button + Song name */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={togglePlay}
            style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 }}
            title={playing ? 'Pause music' : 'Play music'}>
            {playing ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', color: playing ? '#fff' : 'rgba(255,255,255,.6)', transition:'color .3s', whiteSpace:'nowrap' }}>♪ MUSIC</span>
        </div>
        {/* Right: Clock */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:9, fontWeight:700, color:'#fff', letterSpacing:'.04em', fontVariantNumeric:'tabular-nums' }}>{fmtClockTime(now)}</span>
          <span style={{ width:1, height:8, background:'rgba(255,255,255,.25)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,.6)', letterSpacing:'.03em' }}>{fmtClockDate(now)}</span>
        </div>
      </div>

      {/* ── ROW 2: Scrolling marquee ── */}
      <div style={{ background:'#0a0a0a', color:'#fff', padding:'8px 0', overflow:'hidden' }}>
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
      {page==='orders'   && <OrdersPage  user={user} onBack={()=>setPage('account')} onNav={setPage} />}
      {page==='track'    && <OrderTrackingPage onNav={setPage} />}
      {page==='group'    && <GroupOrderPage user={user} onNav={setPage} />}

      {/* ── FOOTER (only on main pages) ── */}
      {['home','products','about','contact','track','group'].includes(page) && (
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

      {/* ── CHATBOT ── */}
      <ChatBot />

      {/* ── TOAST ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CHATBOT
// ══════════════════════════════════════════════════════════════
function ChatBot() {
  const [open,     setOpen]     = React.useState(false)
  const [messages, setMessages] = React.useState([
    { role: 'assistant', content: "Hi! 👋 I'm the DRYNN Assistant. Ask me anything about our products, custom orders, or delivery!", options: ['Show products', 'Custom order info', 'Delivery & tracking', 'Payment methods'] }
  ])
  const [input,   setInput]    = React.useState('')
  const [loading, setLoading]  = React.useState(false)
  const bottomRef              = React.useRef(null)

  React.useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    const userMsg = { role: 'user', content: msg }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Sorry, something went wrong. Please try again.',
        options: data.options || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        options: ['Try again', 'Contact us on WhatsApp'],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // last assistant message options (only show if it's the last message)
  const lastMsg = messages[messages.length - 1]
  const quickOptions = !loading && lastMsg?.role === 'assistant' && lastMsg?.options?.length > 0
    ? lastMsg.options : []

  return (
    <>
      {open && (
        <div style={{
          position:'fixed', bottom:72, right:12, zIndex:9000,
          width:'min(320px, calc(100vw - 24px))',
          background:'#fff', borderRadius:14,
          boxShadow:'0 8px 40px rgba(0,0,0,.18)',
          display:'flex', flexDirection:'column',
          overflow:'hidden', border:'1px solid #f0f0f0',
          height:420, maxHeight:'calc(100vh - 140px)',
        }}>

          {/* Header */}
          <div style={{
            background:'linear-gradient(135deg,#c8102e,#6b0a3e)',
            padding:'12px 16px', display:'flex',
            alignItems:'center', justifyContent:'space-between', flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 6px #4ade80' }} />
              <span style={{ color:'#fff', fontWeight:700, fontSize:13, letterSpacing:'.04em' }}>DRYNN Assistant</span>
            </div>
            <button onClick={()=>setOpen(false)} style={{
              background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%',
              width:26, height:26, cursor:'pointer', color:'#fff', fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex:1, overflowY:'auto', padding:'14px 12px',
            display:'flex', flexDirection:'column', gap:10, minHeight:0,
          }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: m.role==='user' ? 'flex-end' : 'flex-start', gap:6 }}>
                <div style={{
                  maxWidth:'82%', padding:'9px 12px',
                  borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role==='user' ? '#c8102e' : '#f5f5f5',
                  color: m.role==='user' ? '#fff' : '#0a0a0a',
                  fontSize:13, lineHeight:1.6,
                }}>{m.content}</div>
              </div>
            ))}

            {/* Quick-reply options — only on last assistant message */}
            {quickOptions.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingLeft:2 }}>
                {quickOptions.map((opt, i) => (
                  <button key={i} onClick={()=>send(opt)} style={{
                    background:'#fff', border:'1.5px solid #c8102e', borderRadius:20,
                    padding:'5px 12px', fontSize:12, color:'#c8102e', fontWeight:600,
                    cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#c8102e'; e.currentTarget.style.color='#fff' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#c8102e' }}
                  >{opt}</button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <div style={{ background:'#f5f5f5', borderRadius:'14px 14px 14px 4px', padding:'10px 14px', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#bbb', animation:'drynn-dot 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #f0f0f0', display:'flex', gap:8, flexShrink:0, background:'#fff' }}>
            <input
              value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about products, orders…" disabled={loading}
              style={{ flex:1, border:'1.5px solid #e8e8e8', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:loading?'#fafafa':'#fff' }}
            />
            <button onClick={()=>send()} disabled={!input.trim()||loading} style={{
              background:input.trim()&&!loading?'#c8102e':'#e8e8e8', border:'none', borderRadius:8,
              width:38, height:38, cursor:input.trim()&&!loading?'pointer':'default',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .15s',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={input.trim()&&!loading?'#fff':'#bbb'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      {!open && (
        <button onClick={()=>setOpen(true)} title="Chat with DRYNN Assistant" style={{
          position:'fixed', bottom:80, right:16, zIndex:9001,
          width:48, height:48, borderRadius:'50%',
          background:'linear-gradient(135deg,#c8102e,#6b0a3e)',
          border:'none', cursor:'pointer',
          boxShadow:'0 4px 20px rgba(200,16,46,.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}
    </>
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
