import crypto from 'crypto'
import { NextResponse } from 'next/server'

// Verifies the payment signature Razorpay sends back after checkout.
// This is the step that proves the payment is genuine — never skip it.
export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment fields' }, { status: 400 })
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      // Signature mismatch — treat as fraudulent, do not fulfil the order
      console.error('[Razorpay Verify] Signature mismatch for order', razorpay_order_id)
      return NextResponse.json({ success: false, error: 'Signature verification failed' }, { status: 400 })
    }

    return NextResponse.json({ success: true, payment_id: razorpay_payment_id })
  } catch (e) {
    console.error('[Razorpay Verify] Error:', e.message)
    return NextResponse.json({ success: false, error: 'Verification error' }, { status: 500 })
  }
}
