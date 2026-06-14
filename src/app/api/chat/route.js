// FILE: app/api/chat/route.js
// Groq chat endpoint — key is server-only (GROQ_API_KEY, no NEXT_PUBLIC_)
// In Vercel: add GROQ_API_KEY as a server env var (NOT public)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Fetch admin context from drynn_settings + drynn_products
async function fetchStoreContext() {
  try {
    const [settingsRes, productsRes] = await Promise.all([
      supabase.from('drynn_settings').select('key,value'),
      supabase.from('drynn_products').select('name,price,mrp,category,tag,rating,reviews,studio_only'),
    ])

    const settings = {}
    if (settingsRes.data) {
      settingsRes.data.forEach(row => {
        settings[row.key] = row.value
      })
    }

    const products = productsRes.data || []

    return { settings, products }
  } catch (e) {
    console.error('[ChatBot] Context fetch error:', e)
    return { settings: {}, products: [] }
  }
}

export async function POST(req) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const { settings, products } = await fetchStoreContext()

    // Build a product summary for the AI
    const productList = products.length
      ? products
          .filter(p => !p.studio_only)
          .map(p => `- ${p.name} (${p.category}): ₹${p.price} (MRP ₹${p.mrp}), Rating: ${p.rating}★, Reviews: ${p.reviews}`)
          .join('\n')
      : `- Classic Oversized Tee (T-Shirts): ₹699
- Premium Hoodie (Hoodies): ₹1299
- Slim Fit Polo (Polos): ₹849
- Cargo Joggers (Joggers): ₹999
- Graphic Round Neck Tee (T-Shirts): ₹599
- Zip-Up Hoodie (Hoodies): ₹1499
- Classic Polo (Polos): ₹749
- Track Pants (Joggers): ₹899`

    // Pull any extra admin info from drynn_settings
    const adminNotes = settings.chatbot_notes || settings.store_notes || ''
    const deliveryInfo = settings.delivery_info || '5-7 working days across India. Express 2-3 days for select pincodes.'
    const whatsapp = settings.whatsapp || settings.contact_whatsapp || ''

    const systemPrompt = `You are DRYNN Assistant — a friendly, helpful chatbot for DRYNN, a premium custom print clothing brand from Tamil Nadu, India.

== STORE INFO ==
Brand: DRYNN
Location: Tamil Nadu, India
Tagline: Premium custom print clothing. We bring your designs to life.
Payment: UPI and Razorpay only
Delivery: ${deliveryInfo}
Tracking: Customers receive a WhatsApp message with tracking link after shipping.
Free delivery: Above ₹1,500
${whatsapp ? `WhatsApp: ${whatsapp}` : ''}

== PRODUCTS ==
${productList}

== CUSTOM / STUDIO ORDERS ==
- Customers can upload their own design (PNG, JPG, SVG, min 300 DPI)
- Garments: T-Shirt, Hoodie, Polo, Joggers
- Sizes: S, M, L, XL, XXL
- Bulk discounts: 10+ pieces — recommend WhatsApp for custom quote
- Delivery: 5-7 working days after order confirmation

== FAQS ==
- Returns: Replacement only for manufacturing defects or wrong items. Custom printed items cannot be returned.
- Min order: Single piece accepted.
- File formats: PNG, JPG, JPEG, SVG (300 DPI recommended)
- Tracking: WhatsApp notification after shipment

${adminNotes ? `== ADMIN NOTES ==\n${adminNotes}` : ''}

== RULES ==
- Answer only questions related to DRYNN, its products, orders, delivery, custom printing, and payments.
- Be concise — replies should be short and helpful (2-4 sentences max unless listing products).
- Use ₹ for prices. Be friendly and professional.
- If asked something you don't know, say "Please contact us on WhatsApp for more details."
- Do NOT make up order statuses or tracking numbers. Tell customers to check their WhatsApp for tracking info.
- Do NOT discuss competitors or unrelated topics.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',        // fast, free-tier friendly
        max_tokens: 300,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),       // last 10 messages to stay within context
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[Groq] Error:', err)
      return Response.json({ error: 'Groq API error' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response. Please try again."

    return Response.json({ reply })
  } catch (err) {
    console.error('[ChatBot] Unexpected error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
