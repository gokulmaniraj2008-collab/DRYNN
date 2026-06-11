// app/api/cloudinary-usage/route.js
// Place this at: app/api/cloudinary-usage/route.js
// Requires in .env.local:
//   CLOUDINARY_API_KEY=your_api_key
//   CLOUDINARY_API_SECRET=your_api_secret
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

export async function GET() {
  const cloud  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const key    = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET

  if (!cloud || !key || !secret) {
    return Response.json({ error: 'Cloudinary env vars not set' }, { status: 500 })
  }

  try {
    const credentials = Buffer.from(`${key}:${secret}`).toString('base64')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    })

    if (!res.ok) {
      return Response.json({ error: 'Cloudinary API error', status: res.status }, { status: res.status })
    }

    const data = await res.json()

    return Response.json({
      storage_bytes:   data?.storage?.usage   ?? 0,   // total bytes stored
      bandwidth_bytes: data?.bandwidth?.usage ?? 0,   // bytes delivered this month
      resources:       data?.resources        ?? 0,   // total number of assets
      transformations: data?.transformations?.usage ?? 0,
      credits_used:    data?.credits?.usage   ?? null,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
