const { createClient } = require('@supabase/supabase-js');
const secureStore = require('./secureStore');

// Main process only — this is the trusted boundary (same pattern already
// used for the IGDB client secret in main.js). The anon key is safe to embed
// even though it lives here; Postgres Row Level Security is what actually
// keeps users out of each other's data, not secrecy of this key.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    // Persist the session via our own encrypted file instead of the default
    // localStorage (which doesn't exist in the main process), so logging in
    // survives an app restart.
    storage: secureStore,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

module.exports = supabase;
