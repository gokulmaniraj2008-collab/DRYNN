'use client'
import { useState } from 'react'

const PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', price: '699', tag: 'Best Seller', tagColor: '#c8102e' },
  { id: 2, name: 'Premium Hoodie', price: '1,299', tag: 'New', tagColor: '#1a1aff' },
  { id: 3, name: 'Slim Fit Polo', price: '849', tag: 'Popular', tagColor: '#00a86b' },
  { id: 4, name: 'Cargo Joggers', price: '999', tag: 'New', tagColor: '#0a0a0a' },
]

const STEPS = [
  { num: '01', color: '#c8102e', title: 'Choose Garment', desc: 'Pick from t-shirts, hoodies, polos, or joggers in your preferred color.' },
  { num: '02', color: '#1a1aff', title: 'Upload Design', desc: 'Upload your artwork in PNG, JPG, or SVG. Minimum 300 DPI recommended.' },
  { num: '03', color: '#00a86b', title: 'Preview & Order', desc: 'Confirm your design placement, size, and place your order securely.' },
  { num: '04', color: '#0a0a0a', title: 'Delivered to You', desc: 'We print and deliver your custom piece within 5-7 working days across India.' },
]

const REVIEWS = [
  { name: 'Arjun R.', location: 'Chennai', color: '#c8102e', text: 'The print quality is outstanding. Ordered 10 jerseys for our college team and every piece was perfect.' },
  { name: 'Priya S.', location: 'Bangalore', color: '#1a1aff', text: 'Upload was easy, delivery was fast, and the hoodie feels premium. Will definitely order again.' },
  { name: 'Karthik M.', location: 'Coimbatore', color: '#00a86b', text: 'Best custom print service in Tamil Nadu. Price is fair and quality is top level.' },
]

const GARMENTS = ['T-Shirt', 'Hoodie', 'Polo', 'Joggers']
const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const TABS = ['All', 'T-Shirts', 'Hoodies', 'Polos', 'Joggers']
const SWATCHES = ['#ffffff', '#0a0a0a', '#c8102e', '#1a1aff', '#00a86b', '#f5a623', '#9b59b6', '#888888']
const NAV = ['Home', 'Products', 'Custom Print', 'About', 'Contact']

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [garment, setGarment] = useState('T-Shirt')
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState('M')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', qty: 1, address: '' })

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) setUploadedFile(file.name)
  }

  const handleSubmit = () => {
    if (!form.name || !form.phone || !uploadedFile) {
      alert('Please fill name, phone and upload your design.')
      return
    }
    alert('Order received! We will contact you on WhatsApp shortly.')
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 10 }}>Order Now</button>
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', flexDirection: 'column', gap: 5, padding: 4 }}
              aria-label="Menu"
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
          <div className="hero-visual" style={{ flex: 1, minHeight: 480, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 180, height: 220, background: '#fff', borderRadius: 4, margin: '0 auto', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 80, height: 90, background: '#f0f0f0', borderRadius: 2 }} />
                <div style={{ width: 100, height: 8, background: '#f0f0f0', borderRadius: 2 }} />
                <div style={{ width: 70, height: 8, background: '#f0f0f0', borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['#c8102e', '#1a1aff', '#00a86b', '#0a0a0a'].map(c => (
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

      {/* ── CUSTOM PRINT ORDER ── */}
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

            {/* ORDER FORM */}
            <div style={{ flex: 1, background: '#fff', padding: 32, border: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>Order Details</p>
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

                <button className="btn-primary" style={{ width: '100%', padding: 16, fontSize: 12, marginTop: 4 }} onClick={handleSubmit}>
                  Place Custom Order
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
                <button className="btn-white" style={{ fontSize: 10 }}>WhatsApp Us</button>
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
                {['#c8102e', '#1a1aff', '#00a86b'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
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
