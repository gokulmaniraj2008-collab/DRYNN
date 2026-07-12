import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'

// Server-side only — RAZORPAY_KEY_SECRET never reaches the browser
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(req) {
  try {
    const { amount } = await req.json() // amount in ₹ (rupees), from cart grandTotal

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `drynn_${Date.now()}`,
    })

    return NextResponse.json({ order_id: order.id, amount: order.amount })
  } catch (e) {
    console.error('[Razorpay Order] Error:', e.message)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }
}
