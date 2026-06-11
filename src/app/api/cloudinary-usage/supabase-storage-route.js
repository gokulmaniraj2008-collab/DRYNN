// src/app/api/supabase-storage/route.js
// Uses service role key server-side — bypasses anon/RLS completely
// Add to Vercel env vars: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !svcKey) {
    return Response.json({ error: 'Supabase env vars not set' }, { status: 500 })
  }

  const supabase = createClient(url, svcKey)

  try {
    // ── DB table sizes ───────────────────────────────────────────
    const { data: tableData, error: rpcErr } = await supabase.rpc('get_table_sizes')

    let db_bytes = 0
    let tables   = []
    if (!rpcErr && tableData) {
      tables   = tableData
      db_bytes = tableData.reduce((s, t) => s + (t.size_bytes || 0), 0)
    }

    // ── Supabase Storage bucket sizes ────────────────────────────
    let file_bytes = 0
    const { data: buckets } = await supabase.storage.listBuckets()
    if (buckets && buckets.length > 0) {
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

    return Response.json({ db_bytes, file_bytes, tables })

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
