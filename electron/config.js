// Values the app needs to reach Supabase.
//
// In development these come from .env (loaded by dotenv in main.js). A
// packaged build has no .env file, so it falls back to the baked-in
// production values below.
//
// Safe to commit and to ship inside the app: the publishable key is
// designed to be public — Postgres Row Level Security is what actually
// keeps each user's library private, not secrecy of this key. The Twitch
// client secret is deliberately NOT here — it lives only in the `igdb`
// Supabase Edge Function, server-side.

const PRODUCTION = {
  SUPABASE_URL: 'https://xqlvducitbenqphuvjch.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_DfDOCFkBI-3E4xNWwjG17Q_zDtAsBIF',
};

module.exports = {
  SUPABASE_URL: process.env.SUPABASE_URL || PRODUCTION.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || PRODUCTION.SUPABASE_ANON_KEY,
};
