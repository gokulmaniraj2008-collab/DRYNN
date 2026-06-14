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

// ── Language Detection (English / Tamil / Tanglish) ───────────
const detectLanguage = (text) => {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil'
  const tanglish = ['naan','enna','epdi','enga','avan','aval','inga','unga','romba','konjam','paaru','sollu','vanakam','seri','ennoda','order','price','delivery']
  if (tanglish.some(w => text.toLowerCase().includes(w))) return 'tanglish'
  return 'english'
}

const getLanguageInstruction = (lang) => {
  switch (lang) {
    case 'tamil':    return 'The user is writing in Tamil. Reply in Tamil (Unicode Tamil script). Keep it friendly and clear.'
    case 'tanglish': return 'The user is writing in Tanglish (Tamil words in English letters). Reply in Tanglish naturally mixed with English.'
    default:         return 'Reply in clear, simple English.'
  }
}

// ── Fetch store context from Supabase ─────────────────────────
async function fetchStoreContext() {
  try {
    const [settingsRes, productsRes] = await Promise.all([
      supabase.from('drynn_settings').select('key,value'),
      supabase.from('drynn_products').select('name,price,mrp,category,tag,rating,reviews,studio_only'),
    ])
    const settings = {}
    if (settingsRes.data) settingsRes.data.forEach(r => { settings[r.key] = r.value })
    return { settings, products: productsRes.data || [] }
  } catch (e) {
    console.error('[DRYNN Chat] Supabase error:', e.message)
    return { settings: {}, products: [] }
  }
}

// ── Build system prompt ───────────────────────────────────────
const buildSystemPrompt = (language, settings, products) => {
  const productList = products.filter(p => !p.studio_only).length
    ? products.filter(p => !p.studio_only)
        .map(p => `- ${p.name} (${p.category}): ₹${p.price} (MRP ₹${p.mrp}), Rating: ${p.rating}★`)
        .join('\n')
    : `- Classic Oversized Tee (T-Shirts): ₹699\n- Premium Hoodie (Hoodies): ₹1299\n- Slim Fit Polo (Polos): ₹849\n- Cargo Joggers (Joggers): ₹999\n- Graphic Round Neck Tee (T-Shirts): ₹599\n- Zip-Up Hoodie (Hoodies): ₹1499\n- Classic Polo (Polos): ₹749\n- Track Pants (Joggers): ₹899`

  const deliveryInfo  = settings.delivery_info     || '5-7 working days across India. Express 2-3 days for select pincodes.'
  const whatsapp      = settings.whatsapp           || settings.contact_whatsapp || ''
  const adminNotes    = settings.chatbot_notes      || settings.store_notes      || ''

  return `You are DRYNN Assistant — a friendly, helpful chatbot for DRYNN, a premium custom print clothing brand from Tamil Nadu, India.

LANGUAGE: ${getLanguageInstruction(language)}

== STORE INFO ==
Brand: DRYNN | Location: Tamil Nadu, India
Payment: UPI and Razorpay only | Free delivery: Above ₹1,500
Delivery: ${deliveryInfo}
Tracking: Customers receive a WhatsApp message with tracking link after shipping.
${whatsapp ? `WhatsApp: ${whatsapp}` : ''}

== PRODUCTS ==
${productList}

== CUSTOM / STUDIO ORDERS ==
- Customers upload their own design (PNG, JPG, SVG, min 300 DPI)
- Garments: T-Shirt, Hoodie, Polo, Joggers | Sizes: S, M, L, XL, XXL
- Bulk discounts for 10+ pieces — direct to WhatsApp for quote
- Delivery: 5-7 working days after confirmation

== RETURNS & FAQS ==
- Returns: Replacement only for manufacturing defects or wrong items. No returns for custom prints.
- Min order: Single piece accepted.
- File formats: PNG, JPG, JPEG, SVG (300 DPI recommended)
${adminNotes ? `\n== ADMIN NOTES ==\n${adminNotes}` : ''}

== RULES ==
1. Answer only DRYNN-related questions (products, orders, delivery, payments, custom printing).
2. Be concise — 2-4 sentences max unless listing products.
3. Use ₹ for all prices.
4. If you don't know something, say "Please contact us on WhatsApp for more details."
5. Never invent order statuses or tracking numbers.
6. At the end of EVERY response, give exactly 4 short follow-up options the user can tap, like this:
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

// ── Groq API call with key rotation ─────────────────────────
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
      max_tokens: 512,
      temperature: 0.5,
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

    const { settings, products } = await fetchStoreContext()
    const systemPrompt = buildSystemPrompt(language, settings, products)

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
      options: ['Try again', 'Check our products', 'Custom order info', 'Contact on WhatsApp'],
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
