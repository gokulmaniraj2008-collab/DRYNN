// src/app/api/supabase-storage/route.js
// Uses service role key server-side — bypasses anon/RLS completely
// Add to Vercel env vars: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url && !svcKey) {
    return Response.json({
      error: 'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set in Vercel.',
      db_bytes: 0, file_bytes: 0, tables: []
    }, { status: 500 })
  }
  if (!url) {
    return Response.json({
      error: 'Missing env var: NEXT_PUBLIC_SUPABASE_URL is not set in Vercel.',
      db_bytes: 0, file_bytes: 0, tables: []
    }, { status: 500 })
  }
  if (!svcKey) {
    return Response.json({
      error: 'Missing env var: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel. Go to Vercel → Settings → Environment Variables and add it. Get the value from Supabase → Project Settings → API → service_role.',
      db_bytes: 0, file_bytes: 0, tables: []
    }, { status: 500 })
  }

  const supabase = createClient(url, svcKey)

  try {
    // ── DB table sizes ───────────────────────────────────────────
    const { data: tableData, error: rpcErr } = await supabase.rpc('get_table_sizes')

    let db_bytes = 0
    let tables   = []
    let rpc_error = null

    if (rpcErr) {
      rpc_error = `get_table_sizes() RPC failed: ${rpcErr.message}. Make sure you created the function in Supabase SQL Editor.`
      console.error('[supabase-storage]', rpc_error)
    } else if (tableData) {
      tables   = tableData
      db_bytes = tableData.reduce((s, t) => s + (t.size_bytes || 0), 0)
    }

    // ── Supabase Storage bucket sizes ────────────────────────────
    let file_bytes  = 0
    let bucket_error = null
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets()

    if (bucketsErr) {
      bucket_error = `listBuckets() failed: ${bucketsErr.message}. Check your SUPABASE_SERVICE_ROLE_KEY is correct.`
      console.error('[supabase-storage]', bucket_error)
    } else if (buckets && buckets.length > 0) {
      for (const bucket of buckets) {
        const { data: rootFiles } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 })
        if (rootFiles) {
          for (const item of rootFiles) {
            if (item.id) {
              file_bytes += item.metadata?.size ?? 0
            } else {
              const { data: subFiles } = await supabase.storage
                .from(bucket.name)
                .list(item.name, { limit: 1000 })
              if (subFiles) subFiles.forEach(f => { file_bytes += f.metadata?.size ?? 0 })
            }
          }
        }
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
