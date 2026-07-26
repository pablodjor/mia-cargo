import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const STORE_NAME = 'miacargo-demo'
const RECORD_KEY = 'database'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const store = getStore(STORE_NAME)

  if (req.method === 'GET') {
    const record = await store.get(RECORD_KEY, { type: 'json' })
    return Response.json(record ?? null, { headers: corsHeaders })
  }

  if (req.method === 'PUT') {
    const body = await req.json()
    const updatedAt = new Date().toISOString()
    const record = {
      updatedAt,
      snapshot: body?.snapshot ?? body,
    }
    await store.setJSON(RECORD_KEY, record)
    return Response.json({ ok: true, updatedAt }, { headers: corsHeaders })
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
}

export const config: Config = {
  path: '/api/db',
}
