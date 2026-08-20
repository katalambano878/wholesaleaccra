import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

/**
 * Browser/server supabase-js client.
 * In plain-PG mode, NEXT_PUBLIC_SUPABASE_URL must be the app origin
 * so calls hit /rest/v1, /auth/v1, /storage/v1 shims.
 *
 * Lazy proxy so Next.js build-time page collection does not crash when
 * env is only injected at runtime (Coolify).
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase() as any;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return Reflect.get(client, prop, receiver);
  },
});
