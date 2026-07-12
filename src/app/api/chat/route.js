import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Supabase ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── Groq Key Rotation ─────────────────────────────────────────
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
].filter(Boolean)

if (GROQ_KEYS.length === 0) {
  console.error('No Groq API keys found. Add GROQ_API_KEY to Vercel env vars.')
}

let activeKeyIndex = 0
const getKey    = () => GROQ_KEYS[activeKeyIndex % GROQ_KEYS.length]
const rotateKey = () => {
  activeKeyIndex = (activeKeyIndex + 1) % GROQ_KEYS.length
  console.warn(`Groq key rotated → using key ${activeKeyIndex + 1}`)
}

// ── Language Detection ────────────────────────────────────────
const detectLanguage = (text) => {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil'
  const tanglish = ['naan','enna','epdi','enga','avan','aval','inga','unga','romba','konjam','paaru','sollu','vanakam','seri','ennoda','order','price','delivery','sollunga','paarunga']
  if (tanglish.some(w => text.toLowerCase().includes(w))) return 'tanglish'
  return 'english'
}

const getLanguageInstruction = (lang) => {
  switch (lang) {
    case 'tamil':    return 'The user is writing in Tamil. Reply in Tamil (Unicode Tamil script). Keep it friendly and clear.'
    case 'tanglish': return 'The user is writing in Tanglish (Tamil words written in English letters). Reply in Tanglish naturally mixed with English.'
    default:         return 'Reply in clear, simple English.'
  }
}

// ── Fetch ALL store context from Supabase ─────────────────────
async function fetchStoreContext() {
  try {
    const [settingsRes, productsRes, ordersRes] = await Promise.all([
      // Read ALL rows from drynn_settings — every key admin sets is passed to AI
      supabase.from('drynn_settings').select('key,value'),
      // select('*') on purpose — a named-column select fails ENTIRELY if even one
      // column doesn't exist yet (e.g. 'description'), silently emptying the list.
      // '*' only returns whatever columns actually exist, so it can't break this way.
      supabase.from('drynn_products').select('*'),
      // Read recent orders summary (last 50, just status counts — no personal data)
      supabase.from('drynn_orders').select('status,total,placed_at').order('placed_at', { ascending: false }).limit(50),
    ])

    // Supabase does NOT throw on query errors — it returns { data: null, error }.
    // Log each one explicitly so a broken query is visible in Vercel logs,
    // instead of silently falling back to demo data with no trace.
    if (settingsRes.error) console.error('[DRYNN Chat] drynn_settings query failed:', settingsRes.error.message)
    if (productsRes.error) console.error('[DRYNN Chat] drynn_products query failed:', productsRes.error.message)
    if (ordersRes.error)   console.error('[DRYNN Chat] drynn_orders query failed:', ordersRes.error.message)

    // Build settings object from ALL keys admin has saved
    const settings = {}
    if (settingsRes.data) settingsRes.data.forEach(r => { settings[r.key] = r.value })

    const products = productsRes.data || []

    // Summarise orders for AI context (no personal customer data)
    const orders = ordersRes.data || []
    const orderStats = {
      total: orders.length,
      pending:    orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped:    orders.filter(o => o.status === 'shipped').length,
      delivered:  orders.filter(o => o.status === 'delivered').length,
      cancelled:  orders.filter(o => o.status === 'cancelled').length,
    }

    return { settings, products, orderStats }
  } catch (e) {
    console.error('[DRYNN Chat] Unexpected error fetching store context:', e.message)
    return { settings: {}, products: [], orderStats: {} }
  }
}

// ── Build system prompt ───────────────────────────────────────
const buildSystemPrompt = (language, settings, products, orderStats) => {

  // Public products (ready-made)
  const publicProducts = products.filter(p => !p.studio_only)
  const studioProducts = products.filter(p => p.studio_only)

  const productList = publicProducts.length
    ? publicProducts.map(p =>
        `- ${p.name} (${p.category}): ₹${p.price} (MRP ₹${p.mrp}), Rating: ${p.rating}★, Reviews: ${p.reviews}${p.description ? ` — ${p.description}` : ''}`
      ).join('\n')
    : `- Classic Oversized Tee (T-Shirts): ₹699 (MRP ₹999)
- Premium Hoodie (Hoodies): ₹1299 (MRP ₹1799)
- Slim Fit Polo (Polos): ₹849 (MRP ₹1199)
- Cargo Joggers (Joggers): ₹999 (MRP ₹1399)
- Graphic Round Neck Tee (T-Shirts): ₹599 (MRP ₹849)
- Zip-Up Hoodie (Hoodies): ₹1499 (MRP ₹1999)
- Classic Polo (Polos): ₹749 (MRP ₹999)
- Track Pants (Joggers): ₹899 (MRP ₹1199)`

  const studioList = studioProducts.length
    ? studioProducts.map(p =>
        `- ${p.name} (${p.category}): ₹${p.price}${p.description ? ` — ${p.description}` : ''}`
      ).join('\n')
    : ''

  // Pull known settings keys + dump ALL remaining unknown keys as extra admin info
  const knownKeys = ['delivery_info','whatsapp','contact_whatsapp','chatbot_notes','store_notes',
    'swatches','video_intro','video_studio','video_home','audio_song']
  const deliveryInfo = settings.delivery_info || '5-7 working days across India. Express 2-3 days for select pincodes.'
  const whatsapp     = settings.whatsapp || settings.contact_whatsapp || ''
  const adminNotes   = settings.chatbot_notes || settings.store_notes || ''

  // All other keys from admin panel — pass them all to AI
  const extraAdminData = Object.entries(settings)
    .filter(([k]) => !knownKeys.includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  // Order stats line
  const orderSummary = orderStats.total
    ? `Recent orders (last 50): ${orderStats.total} total | Pending: ${orderStats.pending} | Processing: ${orderStats.processing} | Shipped: ${orderStats.shipped} | Delivered: ${orderStats.delivered} | Cancelled: ${orderStats.cancelled}`
    : ''

  return `You are DRYNN Assistant — a friendly, knowledgeable chatbot for DRYNN, a premium custom print clothing brand from Tamil Nadu, India.

LANGUAGE: ${getLanguageInstruction(language)}

== STORE INFO ==
Brand: DRYNN | Location: Tamil Nadu, India
Payment: UPI and Razorpay only | Free delivery: Above ₹1,500
Delivery: ${deliveryInfo}
Tracking: Customers receive a WhatsApp message with tracking link after shipping.
${whatsapp ? `WhatsApp / Contact: ${whatsapp}` : ''}
${orderSummary}

== READY-MADE PRODUCTS ==
${productList}
${studioList ? `\n== STUDIO / SAMPLE PRODUCTS ==\n${studioList}` : ''}

== HOW TO USE THE STUDIO (Custom Print) ==
When a customer asks about custom orders or how to use the studio, explain these steps clearly:

STEP 1 — Go to Studio
  Tell them to tap "Studio" in the bottom navigation bar (the star icon in the middle).

STEP 2 — Choose a Garment
  They pick the type of clothing: T-Shirt, Hoodie, Polo, or Joggers.
  Then pick a colour from the available swatches.
  Then pick their size: S, M, L, XL, or XXL.

STEP 3 — Upload Their Design
  Tap the upload area to upload their artwork.
  Accepted formats: PNG, JPG, JPEG, SVG.
  Minimum 300 DPI recommended for best print quality.
  They can preview how the design looks on the garment before ordering.

STEP 4 — Place the Order
  Review the design placement and confirm the order.
  Pay securely via UPI or Razorpay.

STEP 5 — Delivery
  Custom orders are printed and delivered within 5-7 working days across India.
  After shipping, they get a WhatsApp message with tracking link.

IMPORTANT STUDIO NOTES:
- Minimum order: 1 piece (single piece accepted)
- Bulk orders (10+ pieces): Direct them to WhatsApp for a custom quote
- No returns on custom printed items (only replacement for manufacturing defects)
- Higher DPI = sharper print. Always recommend 300 DPI or above.

== RETURNS & FAQS ==
- Returns: Replacement only for manufacturing defects or wrong items sent. No returns for custom prints due to change of mind.
- File formats: PNG, JPG, JPEG, SVG (300 DPI recommended)
- Min order: Single piece accepted for both ready-made and custom.
- Bulk discount: 10+ pieces — contact WhatsApp for quote.
${adminNotes ? `\n== ADMIN NOTES ==\n${adminNotes}` : ''}
${extraAdminData ? `\n== ADDITIONAL STORE INFO (from admin) ==\n${extraAdminData}` : ''}

== RULES ==
1. Answer only DRYNN-related questions.
2. For studio/custom order questions, always walk the customer through the 5 steps above clearly.
3. Be concise — 2-4 sentences for simple questions. Use numbered steps for studio guidance.
4. Use ₹ for all prices.
5. If you don't know something specific (like a customer's personal order status), say "Please contact us on WhatsApp for more details."
6. Never invent specific order statuses or tracking numbers for individual customers.
7. At the end of EVERY response, give exactly 4 short follow-up options the user can tap, like this:
   OPTIONS:
   1. [option one]
   2. [option two]
   3. [option three]
   4. [option four]
   Make options relevant to what was just discussed.`.trim()
}

// ── Parse options out of AI reply ────────────────────────────
const parseOptions = (text) => {
  const lines = text.split('\n')
  const options = []
  let cleanText = text
  const idx = lines.findIndex(l => l.trim().toUpperCase().startsWith('OPTIONS:'))
  if (idx !== -1) {
    cleanText = lines.slice(0, idx).join('\n').trim()
    for (let i = idx + 1; i < lines.length; i++) {
      const match = lines[i].match(/^\d+\.\s+(.+)/)
      if (match) options.push(match[1].trim())
    }
  }
  return { cleanText, options: options.slice(0, 4) }
}

// ── Groq API call with key rotation ──────────────────────────
const callGroq = async (messages, systemPrompt, retries = 0) => {
  if (GROQ_KEYS.length === 0) throw new Error('No Groq API keys configured')
  if (retries >= GROQ_KEYS.length) throw new Error('All Groq keys exhausted')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })

  if (response.status === 429 || response.status === 401) {
    rotateKey()
    return callGroq(messages, systemPrompt, retries + 1)
  }
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq error ${response.status}: ${err}`)
  }
  return response.json()
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    const language    = detectLanguage(lastMessage)

    const { settings, products, orderStats } = await fetchStoreContext()
    const systemPrompt = buildSystemPrompt(language, settings, products, orderStats)

    const data = await callGroq(messages.slice(-10), systemPrompt)
    const raw  = data.choices?.[0]?.message?.content || ''
    const { cleanText, options } = parseOptions(raw)

    return NextResponse.json({ reply: cleanText, options, language })

  } catch (err) {
    console.error('[DRYNN Chat] Error:', err.message)

    const replyMsg = err.message.includes('No Groq API keys')
      ? 'AI is not configured. Please contact the admin.'
      : err.message.includes('exhausted')
      ? 'AI daily limit reached. Please try again later or contact us on WhatsApp.'
      : 'Could not process your request. Please try again in a moment.'

    return NextResponse.json({
      reply: replyMsg,
      options: ['Try again', 'Check our products', 'How to use Studio', 'Contact on WhatsApp'],
    }, { status: 200 })
  }
}

// ── GET — health check ────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: GROQ_KEYS.length > 0 ? 'ok' : 'error — no API keys found',
    keys_configured: GROQ_KEYS.length,
    model: 'llama-3.3-70b-versatile',
  })
      }
