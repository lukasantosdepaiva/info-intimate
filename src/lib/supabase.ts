import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tfppcbjphnfjbbbkotlm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9UD92JS-lJOQ5Blvaksexg_fAn_pOw7";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}
