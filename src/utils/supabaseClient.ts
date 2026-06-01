import { createClient } from '@supabase/supabase-js';

// 1. Attempt to load from compile-time environment variables
let url = import.meta.env.VITE_SUPABASE_URL;
let key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Gracefully fall back to client-side localStorage overrides ONLY if compile-time variables are missing
const hasCompileTimeEnv = !!(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url_here' && 
  import.meta.env.VITE_SUPABASE_URL.trim() !== ''
);

if (!hasCompileTimeEnv && typeof window !== 'undefined') {
  const localUrl = localStorage.getItem('trademaster_supabase_url');
  const localKey = localStorage.getItem('trademaster_supabase_anon_key');
  
  if (localUrl && localKey && localUrl !== 'your_supabase_url_here' && localUrl.trim() !== '') {
    url = localUrl;
    key = localKey;
  }
}

export const isSupabaseConfigured = !!(
  url && 
  key && 
  url !== 'your_supabase_url_here' && 
  url.trim() !== ''
);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;
