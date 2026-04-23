/**
 * Supabase client - single shared instance.
 * --------------------------------------------------
 * Uses the SERVICE_ROLE key so the server can read/write any row,
 * bypassing Row Level Security. The service_role key must NEVER
 * be exposed to the browser.
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !key) {
  console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE not set - DB calls will fail. Check .env.');
}

const supabase = createClient(url || 'http://missing', key || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
