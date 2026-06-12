// src/app/api/supabase-storage/route.js
// Uses service role key server-side — bypasses anon/RLS completely
// Add to Vercel env vars: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

import { createClient } from '@supabase/supabase-js'

// Recursively sums file sizes in a bucket path (handles nested folders)
async function sumBucketBytes(supabase, bucketName, path = '') {
  let total = 0
  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(path, { limit: 1000 })

  if (error || !items) return total

  for (const item of items) {
    if (item.id) {
      // It's a file — item.id is only present on files, not folders
      total += item.metadata?.size ?? 0
    } else {
      // It's a folder — recurse
      const subPath = path ? `${path}/${item.name}` : item.name
      total += await sumBucketBytes(supabase, bucketName, subPath)
    }
  }

  return total
}

export async function GET() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // ❌ Bug fix: was `&&` — only caught when BOTH missing. Should be `||`
  if (!url || !svcKey) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !svcKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean).join(' and ')
    return Response.json({
      error: `Missing env var(s): ${missing}. Set them in Vercel → Settings → Environment Variables. Get SUPABASE_SERVICE_ROLE_KEY from Supabase → Project Settings → API → service_role.`,
      db_bytes: 0, file_bytes: 0, tables: []
    }, { status: 500 })
  }

  const supabase = createClient(url, svcKey)

  try {
    // ── DB table sizes ───────────────────────────────────────────
    const { data: tableData, error: rpcErr } = await supabase.rpc('get_table_sizes')

    let db_bytes  = 0
    let tables    = []
    let rpc_error = null

    if (rpcErr) {
      rpc_error = `get_table_sizes() RPC failed: ${rpcErr.message}. Make sure you created the function in Supabase SQL Editor.`
      console.error('[supabase-storage]', rpc_error)
    } else if (tableData) {
      tables   = tableData
      db_bytes = tableData.reduce((s, t) => s + (t.size_bytes || 0), 0)
    }

    // ── Supabase Storage bucket sizes ────────────────────────────
    let file_bytes   = 0
    let bucket_error = null
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets()

    if (bucketsErr) {
      bucket_error = `listBuckets() failed: ${bucketsErr.message}. Check your SUPABASE_SERVICE_ROLE_KEY is correct.`
      console.error('[supabase-storage]', bucket_error)
    } else if (buckets && buckets.length > 0) {
      // Recurse into all buckets and all nested folders
      for (const bucket of buckets) {
        file_bytes += await sumBucketBytes(supabase, bucket.name)
      }
    }

    return Response.json({
      db_bytes,
      file_bytes,
      tables,
      ...(rpc_error    && { rpc_error }),
      ...(bucket_error && { bucket_error }),
    })

  } catch (e) {
    console.error('[supabase-storage] Unexpected error:', e)
    return Response.json({
      error: `Unexpected error: ${e.message}`,
      db_bytes: 0, file_bytes: 0, tables: []
    }, { status: 500 })
  }
}
